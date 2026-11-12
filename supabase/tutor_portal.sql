-- Separate coach view: assigned class names and student names only.
-- Contact, payment and full application records stay outside this table.
create table if not exists public.swim_tutor_portal (
  email text primary key check (email = lower(btrim(email)) and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  user_id uuid unique references auth.users(id) on delete set null,
  active boolean not null default true,
  snapshot jsonb not null default '{}'::jsonb check (jsonb_typeof(snapshot) = 'object'),
  updated_at timestamptz not null default now()
);

create table if not exists public.swim_tutor_leave (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete restrict,
  tutor_email text not null references public.swim_tutor_portal(email) on delete restrict,
  start_date date not null,
  end_date date not null check (end_date >= start_date),
  reason text not null check (char_length(btrim(reason)) between 1 and 500),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);

create table if not exists public.swim_tutor_attendance (
  id uuid primary key default gen_random_uuid(),
  lesson_id text not null,
  student_id text not null,
  tutor_email text not null references public.swim_tutor_portal(email) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  status text not null check (status in ('present', 'absent')),
  decision text check (decision in ('makeup', 'no_makeup')),
  absence_reason text check (char_length(absence_reason) <= 500),
  makeup_date date,
  applied_at timestamptz,
  applied_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (lesson_id, student_id),
  check (status = 'absent' or (decision is null and makeup_date is null)),
  check ((decision = 'makeup') = (makeup_date is not null))
);

alter table public.swim_tutor_portal enable row level security;
alter table public.swim_tutor_leave enable row level security;
alter table public.swim_tutor_attendance enable row level security;
revoke all on public.swim_tutor_portal from anon, authenticated;
revoke all on public.swim_tutor_leave from anon, authenticated;
revoke all on public.swim_tutor_attendance from anon, authenticated;
grant select on public.swim_tutor_portal to authenticated;
grant select, insert on public.swim_tutor_leave to authenticated;
grant update (status) on public.swim_tutor_leave to authenticated;
grant select, insert on public.swim_tutor_attendance to authenticated;
grant update (status, decision, absence_reason, makeup_date, applied_at, applied_by) on public.swim_tutor_attendance to authenticated;

create policy swim_tutor_portal_admin_read on public.swim_tutor_portal
  for select to authenticated using (exists (
    select 1 from public.swim_app_admin where user_id = (select auth.uid())
  ));
create policy swim_tutor_portal_self_read on public.swim_tutor_portal
  for select to authenticated using (active and user_id = (select auth.uid()));
create policy swim_tutor_leave_admin_read on public.swim_tutor_leave
  for select to authenticated using (exists (
    select 1 from public.swim_app_admin where user_id = (select auth.uid())
  ));
create policy swim_tutor_leave_self_read on public.swim_tutor_leave
  for select to authenticated using (user_id = (select auth.uid()) and exists (
    select 1 from public.swim_tutor_portal
    where user_id = (select auth.uid()) and email = tutor_email and active
  ));
create policy swim_tutor_leave_self_insert on public.swim_tutor_leave
  for insert to authenticated with check (status = 'pending' and user_id = (select auth.uid()) and exists (
    select 1 from public.swim_tutor_portal
    where user_id = (select auth.uid()) and email = tutor_email and active
  ));
create policy swim_tutor_leave_admin_update on public.swim_tutor_leave
  for update to authenticated using (exists (
    select 1 from public.swim_app_admin where user_id = (select auth.uid())
  )) with check (exists (
    select 1 from public.swim_app_admin where user_id = (select auth.uid())
  ));

create policy swim_tutor_attendance_admin_read on public.swim_tutor_attendance
  for select to authenticated using (exists (
    select 1 from public.swim_app_admin where user_id = (select auth.uid())
  ));
create policy swim_tutor_attendance_self_read on public.swim_tutor_attendance
  for select to authenticated using (user_id = (select auth.uid()) and exists (
    select 1 from public.swim_tutor_portal where email = tutor_email and user_id = (select auth.uid()) and active
  ));
create policy swim_tutor_attendance_self_insert on public.swim_tutor_attendance
  for insert to authenticated with check (
    user_id = (select auth.uid()) and decision is null and absence_reason is null and makeup_date is null and applied_at is null and applied_by is null and
    exists (select 1 from public.swim_tutor_portal p,
      lateral jsonb_array_elements(coalesce(p.snapshot->'assignments', '[]'::jsonb)) as lesson(value),
      lateral jsonb_array_elements(coalesce(lesson.value->'students', '[]'::jsonb)) as student(value)
      where p.user_id = (select auth.uid()) and p.email = tutor_email and p.active
        and lesson.value->>'id' = lesson_id and student.value->>'id' = student_id)
  );
create policy swim_tutor_attendance_self_update on public.swim_tutor_attendance
  for update to authenticated using (user_id = (select auth.uid()) and decision is null and applied_at is null and exists (
    select 1 from public.swim_tutor_portal where email = tutor_email and user_id = (select auth.uid()) and active
  )) with check (user_id = (select auth.uid()) and decision is null and absence_reason is null and makeup_date is null and applied_at is null and applied_by is null);
create policy swim_tutor_attendance_admin_update on public.swim_tutor_attendance
  for update to authenticated using (exists (
    select 1 from public.swim_app_admin where user_id = (select auth.uid())
  )) with check (exists (
    select 1 from public.swim_app_admin where user_id = (select auth.uid())
  ));

-- Only an allowlisted administrator can replace the coach-only snapshots.
-- The function also disables rows removed from the latest local directory.
create or replace function public.swim_sync_tutor_portals(items jsonb)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  item jsonb;
  mail text;
  seen text[] := array[]::text[];
begin
  if not exists (select 1 from public.swim_app_admin where user_id = auth.uid()) then
    raise exception 'administrator required';
  end if;
  if jsonb_typeof(items) <> 'array' or jsonb_array_length(items) > 200 then
    raise exception 'invalid snapshots';
  end if;
  for item in select value from jsonb_array_elements(items) loop
    mail := lower(btrim(item->>'email'));
    if mail is null or char_length(mail) > 254 or mail !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
      or jsonb_typeof(item->'snapshot') <> 'object' or mail = any(seen) then
      raise exception 'invalid tutor account';
    end if;
    seen := array_append(seen, mail);
    insert into public.swim_tutor_portal (email, user_id, active, snapshot, updated_at)
    values (mail, (select id from auth.users where lower(email) = mail and email_confirmed_at is not null limit 1), true, item->'snapshot', now())
    on conflict (email) do update set
      user_id = excluded.user_id, active = true, snapshot = excluded.snapshot, updated_at = now();
  end loop;
  update public.swim_tutor_portal set active = false, updated_at = now()
    where active and not (email = any(seen));
  return cardinality(seen);
end;
$$;
revoke all on function public.swim_sync_tutor_portals(jsonb) from public, anon;
grant execute on function public.swim_sync_tutor_portals(jsonb) to authenticated;

-- Bind a confirmed Auth user when an invited coach confirms the email later.
create or replace function public.swim_link_tutor_auth_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and old.email is distinct from new.email then
    update public.swim_tutor_portal set user_id = null where user_id = old.id;
  end if;
  if new.email_confirmed_at is not null then
    update public.swim_tutor_portal set user_id = new.id
      where email = lower(new.email) and active;
  end if;
  return new;
end;
$$;
drop trigger if exists swim_link_tutor_auth_user on auth.users;
create trigger swim_link_tutor_auth_user after insert or update of email, email_confirmed_at on auth.users
  for each row execute function public.swim_link_tutor_auth_user();
