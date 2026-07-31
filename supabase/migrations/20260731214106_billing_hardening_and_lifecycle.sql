begin;

-- Security fix: children/profiles/user_roles/notifications/subscriptions/
-- theme_entitlements currently grant `authenticated` every table privilege,
-- including TRUNCATE and REFERENCES. RLS policies do not constrain TRUNCATE
-- (it is a whole-table operation), so this grant currently lets any
-- authenticated parent wipe those tables outright if any code path ever
-- executes raw SQL/RPC on their behalf. Replace the blanket grant with the
-- specific privileges each table's RLS policies actually rely on.
revoke all on public.children, public.profiles, public.user_roles, public.notifications, public.subscriptions, public.theme_entitlements
  from authenticated;

grant select, insert, update, delete on public.children to authenticated;
grant select, update on public.profiles to authenticated;
grant select on public.user_roles to authenticated;
grant select, update on public.notifications to authenticated;
grant select on public.subscriptions to authenticated;
grant select on public.theme_entitlements to authenticated;

-- Bug fix: billing_orders has a select policy for `authenticated`
-- (billing_orders_select_own_or_admin) but was never granted table-level
-- SELECT, so parents could not read their own order/payment status at all.
grant select on public.billing_orders to authenticated;

-- Subscription lifecycle: the product has four states (ops doc section on
-- subscription states) — active, past_due, cancelled, and a 180-day
-- read-only tail after cancellation/expiry ends. The original status check
-- only modeled active/expired/cancelled; extend it and add the read-only
-- deadline the Stripe webhook will set.
alter table public.subscriptions drop constraint if exists subscriptions_status_check;
alter table public.subscriptions add constraint subscriptions_status_check
  check (status in ('active', 'past_due', 'expired', 'cancelled', 'read_only'));

alter table public.subscriptions add column if not exists read_only_until timestamptz;
alter table public.subscriptions add column if not exists stripe_subscription_id text;
create unique index if not exists subscriptions_stripe_subscription_id_key
  on public.subscriptions(stripe_subscription_id)
  where stripe_subscription_id is not null;

-- Operator-facing alert log: AI production failures (ops doc section 4) and
-- billing anomalies (e.g. a renewal invoice that fails) must reach the
-- operator for manual handling without ever exposing provider internals to
-- the parent. Admin-read only; written by the service role.
create table if not exists public.admin_alerts (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('billing', 'ai_production')),
  message text not null,
  context jsonb not null default '{}'::jsonb,
  acknowledged_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists admin_alerts_created_idx on public.admin_alerts(created_at desc);

alter table public.admin_alerts enable row level security;

drop policy if exists "admin_alerts_select_admin" on public.admin_alerts;
create policy "admin_alerts_select_admin"
on public.admin_alerts for select to authenticated
using (public.is_admin());

grant select on public.admin_alerts to authenticated;
revoke all on public.admin_alerts from anon;

commit;
