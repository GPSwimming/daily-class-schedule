-- 泳堂管家：單一網站管理員的資料權限。
-- 只在已建立 Supabase Auth 管理員帳戶後，於該專案的 SQL Editor 執行。
-- 本檔只建立空表及權限，不會匯入、刪除或修改現有學生資料。

create table if not exists public.swim_app_admin (
  singleton boolean primary key default true check (singleton),
  user_id uuid not null unique references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table if not exists public.swim_app_data (
  singleton boolean primary key default true check (singleton),
  students jsonb not null default '[]'::jsonb check (jsonb_typeof(students) = 'array'),
  suite jsonb not null default '{}'::jsonb check (jsonb_typeof(suite) = 'object'),
  revision bigint not null default 0 check (revision >= 0),
  updated_at timestamptz not null default now()
);

alter table public.swim_app_admin enable row level security;
alter table public.swim_app_data enable row level security;

revoke all on public.swim_app_admin from anon, authenticated;
revoke all on public.swim_app_data from anon, authenticated;
grant select on public.swim_app_admin to authenticated;
grant select, insert, update on public.swim_app_data to authenticated;

drop policy if exists swim_admin_read_self on public.swim_app_admin;
create policy swim_admin_read_self on public.swim_app_admin
  for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists swim_data_read_admin on public.swim_app_data;
create policy swim_data_read_admin on public.swim_app_data
  for select to authenticated
  using (exists (
    select 1 from public.swim_app_admin
    where user_id = (select auth.uid())
  ));

drop policy if exists swim_data_insert_admin on public.swim_app_data;
create policy swim_data_insert_admin on public.swim_app_data
  for insert to authenticated
  with check (exists (
    select 1 from public.swim_app_admin
    where user_id = (select auth.uid())
  ));

drop policy if exists swim_data_update_admin on public.swim_app_data;
create policy swim_data_update_admin on public.swim_app_data
  for update to authenticated
  using (exists (
    select 1 from public.swim_app_admin
    where user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.swim_app_admin
    where user_id = (select auth.uid())
  ));

-- 管理員白名單由專案持有人在 SQL Editor 另行填寫，切勿把電郵或 UUID
-- 寫入 Git 儲存庫。示例：
-- insert into public.swim_app_admin (user_id)
-- select id from auth.users where email = '<管理員電郵>';
