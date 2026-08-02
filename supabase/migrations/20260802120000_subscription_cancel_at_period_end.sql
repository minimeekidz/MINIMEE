begin;

-- "隨時取消" in the plan copy means stopping the next renewal, not ending
-- the period the parent already paid for. Stripe models that as
-- `cancel_at_period_end`, during which the subscription is still `active`.
-- Without a local mirror of that flag the parent-facing subscription page
-- cannot tell "renewing" apart from "already scheduled to stop", so it is
-- stored here and kept in sync by stripe-webhook's
-- customer.subscription.updated handler.
alter table public.subscriptions
  add column if not exists cancel_at_period_end boolean not null default false;

comment on column public.subscriptions.cancel_at_period_end is
  'True once the parent has stopped the next renewal. The subscription stays active (and entitlements stay usable) until Stripe reports the period ended, which is what flips status to cancelled and starts the 180-day read-only tail.';

commit;
