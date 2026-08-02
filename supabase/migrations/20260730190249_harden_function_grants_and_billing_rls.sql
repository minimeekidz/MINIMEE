-- Reconciliation migration: this exact SQL is already recorded as version
-- 20260730190249 in the remote project's migration history. Adding the file
-- here only brings the repository's history in line with what production
-- already ran; do not edit the statements below without also being aware
-- this version id is already applied remotely.

-- 1. 收回 trigger / event-trigger 函數對外部角色的 EXECUTE
--    (trigger 函數執行時唔需要 invoker 有 EXECUTE 權限，收回係安全的)
revoke execute on function public.handle_new_user()        from public, anon, authenticated;
revoke execute on function public.enforce_three_children() from public, anon, authenticated;
revoke execute on function public.rls_auto_enable()        from public, anon, authenticated;
revoke execute on function public.set_updated_at()         from public, anon, authenticated;

-- 2. is_admin() 被 RLS policy 引用，authenticated 必須保留 EXECUTE；只收回 anon
revoke execute on function public.is_admin() from anon;

-- 3. billing_orders：家長可讀自己訂單，admin 可讀全部。
--    刻意不開 INSERT/UPDATE/DELETE — 寫入只准經 service_role (Edge Function)。
create policy billing_orders_select_own_or_admin
  on public.billing_orders for select to authenticated
  using (parent_id = (select auth.uid()) or public.is_admin());

-- 4. stripe_events：純伺服器表，只開 admin 讀取以便後台查帳。
create policy stripe_events_select_admin
  on public.stripe_events for select to authenticated
  using (public.is_admin());
