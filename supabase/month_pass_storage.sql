-- 月票素材保存在私有 Storage bucket；只有泳堂管家管理員可讀取。
-- 在已建立 swim_app_admin 和私有 bucket 後執行。

update storage.buckets
set public = false
where id = 'swim-month-pass-private';

drop policy if exists swim_month_pass_admin_read on storage.objects;
create policy swim_month_pass_admin_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'swim-month-pass-private'
    and exists (
      select 1 from public.swim_app_admin
      where user_id = (select auth.uid())
    )
  );
