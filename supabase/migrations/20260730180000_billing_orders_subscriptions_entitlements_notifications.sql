-- Reconciliation migration.
--
-- This schema was already applied directly to the remote database in an
-- earlier session (via ad hoc SQL execution rather than a tracked
-- migration), so it predates this file. This migration reconstructs that
-- already-live schema so the repository accurately documents production
-- and so a fresh environment can be bootstrapped to the same state.
-- Every statement is written defensively (IF NOT EXISTS / OR REPLACE) so it
-- is also safe to run against a database that does not have it yet.

begin;

create table if not exists public.billing_orders (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references auth.users(id) on delete cascade,
  child_id uuid not null references public.children(id) on delete restrict,
  plan_type text not null check (plan_type in ('one_time_theme', 'monthly_3m', 'yearly')),
  expected_amount_hkd integer not null check (expected_amount_hkd > 0),
  currency text not null default 'hkd' check (currency = 'hkd'),
  notification_email text not null,
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed')),
  stripe_session_id text unique,
  stripe_payment_intent_id text,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists billing_orders_parent_idx on public.billing_orders(parent_id, created_at desc);

drop trigger if exists billing_orders_set_updated_at on public.billing_orders;
create trigger billing_orders_set_updated_at
before update on public.billing_orders
for each row execute function public.set_updated_at();

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references auth.users(id) on delete cascade,
  child_id uuid not null references public.children(id) on delete restrict,
  source_order_id uuid not null unique references public.billing_orders(id) on delete restrict,
  plan_type text not null check (plan_type in ('one_time_theme', 'monthly_3m', 'yearly')),
  status text not null default 'active' check (status in ('active', 'expired', 'cancelled')),
  theme_allowance integer not null check (theme_allowance in (1, 6, 24)),
  started_at timestamptz not null default now(),
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists subscriptions_parent_child_idx on public.subscriptions(parent_id, child_id, created_at desc);

drop trigger if exists subscriptions_set_updated_at on public.subscriptions;
create trigger subscriptions_set_updated_at
before update on public.subscriptions
for each row execute function public.set_updated_at();

create table if not exists public.theme_entitlements (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references auth.users(id) on delete cascade,
  child_id uuid not null references public.children(id) on delete cascade,
  subscription_id uuid not null references public.subscriptions(id) on delete cascade,
  source_order_id uuid not null references public.billing_orders(id) on delete restrict,
  sequence_number integer not null check (sequence_number > 0),
  status text not null default 'available' check (status in ('available', 'reserved', 'consumed', 'refunded')),
  reserved_at timestamptz,
  consumed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (source_order_id, sequence_number)
);

create index if not exists entitlements_parent_child_idx on public.theme_entitlements(parent_id, child_id, status);

create table if not exists public.stripe_events (
  event_id text primary key,
  event_type text not null,
  stripe_object_id text,
  processed_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references auth.users(id) on delete cascade,
  source_order_id uuid unique references public.billing_orders(id) on delete restrict,
  source_event_id text unique references public.stripe_events(event_id) on delete restrict,
  notification_type text not null,
  title text not null,
  body text not null,
  channels text[] not null default array['in_app', 'anonymous_email'],
  email_status text not null default 'pending' check (email_status in ('pending', 'sent', 'failed')),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_parent_idx on public.notifications(parent_id, created_at desc);

-- Verifies a Stripe-confirmed checkout against the order it was created for,
-- then atomically activates the subscription, mints the theme entitlements
-- owed for the plan, and records the parent-facing notification. Designed
-- to be called once per verified Stripe event; safe to call again for the
-- same event or the same already-paid order (returns the prior result
-- instead of double-granting entitlements).
create or replace function public.finalize_verified_checkout(
  p_event_id text,
  p_event_type text,
  p_stripe_session_id text,
  p_payment_intent_id text,
  p_order_id uuid,
  p_parent_id uuid,
  p_child_id uuid,
  p_plan_type text,
  p_amount_total integer,
  p_currency text,
  p_payment_status text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_order public.billing_orders%rowtype;
  v_subscription_id uuid;
  v_notification public.notifications%rowtype;
  v_allowance integer;
  v_period_end timestamptz;
  v_plan_label text;
begin
  if p_payment_status <> 'paid' then
    raise exception 'Stripe Checkout Session is not paid';
  end if;

  select * into v_order
  from public.billing_orders
  where id = p_order_id
  for update;

  if not found then raise exception 'Unknown billing order'; end if;
  if v_order.parent_id <> p_parent_id or v_order.child_id <> p_child_id then
    raise exception 'Billing ownership mismatch';
  end if;
  if v_order.plan_type <> p_plan_type then raise exception 'Billing plan mismatch'; end if;
  if v_order.expected_amount_hkd <> p_amount_total or v_order.currency <> lower(p_currency) then
    raise exception 'Billing amount or currency mismatch';
  end if;
  if v_order.stripe_session_id is not null and v_order.stripe_session_id <> p_stripe_session_id then
    raise exception 'Stripe Session mismatch';
  end if;

  insert into public.stripe_events(event_id, event_type, stripe_object_id)
  values (p_event_id, p_event_type, p_stripe_session_id)
  on conflict (event_id) do nothing;

  if not found then
    select * into v_notification from public.notifications where source_event_id = p_event_id;
    return jsonb_build_object(
      'already_processed', true,
      'notification_id', v_notification.id,
      'recipient_email', v_order.notification_email,
      'title', v_notification.title,
      'body', v_notification.body
    );
  end if;

  if v_order.status = 'paid' then
    select * into v_notification from public.notifications where source_order_id = p_order_id;
    return jsonb_build_object(
      'already_processed', true,
      'notification_id', v_notification.id,
      'recipient_email', v_order.notification_email,
      'title', v_notification.title,
      'body', v_notification.body
    );
  end if;

  v_allowance := case p_plan_type when 'one_time_theme' then 1 when 'monthly_3m' then 6 when 'yearly' then 24 end;
  v_period_end := case p_plan_type
    when 'monthly_3m' then now() + interval '3 months'
    when 'yearly' then now() + interval '1 year'
    else null
  end;
  v_plan_label := case p_plan_type
    when 'one_time_theme' then '單次主題'
    when 'monthly_3m' then '3個月預繳方案'
    when 'yearly' then '全年預繳方案'
  end;

  update public.billing_orders
  set status = 'paid',
      stripe_session_id = p_stripe_session_id,
      stripe_payment_intent_id = nullif(p_payment_intent_id, ''),
      paid_at = now()
  where id = p_order_id;

  insert into public.subscriptions(
    parent_id, child_id, source_order_id, plan_type, theme_allowance, current_period_end
  ) values (
    p_parent_id, p_child_id, p_order_id, p_plan_type, v_allowance, v_period_end
  )
  returning id into v_subscription_id;

  insert into public.theme_entitlements(
    parent_id, child_id, subscription_id, source_order_id, sequence_number
  )
  select p_parent_id, p_child_id, v_subscription_id, p_order_id, n
  from generate_series(1, v_allowance) as n;

  insert into public.notifications(
    parent_id, source_order_id, source_event_id, notification_type, title, body
  ) values (
    p_parent_id,
    p_order_id,
    p_event_id,
    'payment_verified',
    '付款已確認',
    format('Stripe 已核實付款，%s及 %s 個主題權益已啟用。', v_plan_label, v_allowance)
  )
  returning * into v_notification;

  return jsonb_build_object(
    'already_processed', false,
    'notification_id', v_notification.id,
    'recipient_email', v_order.notification_email,
    'title', v_notification.title,
    'body', v_notification.body
  );
end;
$function$;

revoke all on function public.finalize_verified_checkout(text, text, text, text, uuid, uuid, uuid, text, integer, text, text) from public, anon, authenticated;
grant execute on function public.finalize_verified_checkout(text, text, text, text, uuid, uuid, uuid, text, integer, text, text) to service_role;

-- DDL event trigger: any new table created in the public schema gets RLS
-- switched on immediately, so a forgotten `enable row level security`
-- statement can never leave a table openly readable.
create or replace function public.rls_auto_enable()
returns event_trigger
language plpgsql
security definer
set search_path = 'pg_catalog'
as $function$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$function$;

drop event trigger if exists ensure_rls;
create event trigger ensure_rls
on ddl_command_end
when tag in ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
execute function public.rls_auto_enable();

alter table public.billing_orders enable row level security;
alter table public.subscriptions enable row level security;
alter table public.theme_entitlements enable row level security;
alter table public.stripe_events enable row level security;
alter table public.notifications enable row level security;

-- billing_orders_select_own_or_admin and stripe_events_select_admin are
-- created by the 20260730190249 migration that follows this one.

drop policy if exists "subscriptions_select_own_or_admin" on public.subscriptions;
create policy "subscriptions_select_own_or_admin"
on public.subscriptions for select to authenticated
using (parent_id = auth.uid() or public.is_admin());

drop policy if exists "entitlements_select_own_or_admin" on public.theme_entitlements;
create policy "entitlements_select_own_or_admin"
on public.theme_entitlements for select to authenticated
using (parent_id = auth.uid() or public.is_admin());

drop policy if exists "notifications_select_own_or_admin" on public.notifications;
create policy "notifications_select_own_or_admin"
on public.notifications for select to authenticated
using (parent_id = auth.uid() or public.is_admin());

drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own"
on public.notifications for update to authenticated
using (parent_id = auth.uid())
with check (parent_id = auth.uid());

grant select, update on public.notifications to authenticated;
grant select on public.subscriptions to authenticated;
grant select on public.theme_entitlements to authenticated;

revoke all on public.billing_orders from anon;
revoke all on public.subscriptions from anon;
revoke all on public.theme_entitlements from anon;
revoke all on public.stripe_events from anon, authenticated;
revoke all on public.notifications from anon;

commit;
