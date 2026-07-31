begin;

-- source_order_id/source_event_id were NOT NULL + UNIQUE, which only ever
-- allows a single notification to exist for a given order or event. That
-- makes it impossible to notify about a second renewal on the same
-- subscription (source_order_id would repeat) or about an AI production
-- failure (which has no billing order or Stripe event at all). Keep the
-- uniqueness (Postgres allows multiple NULLs under a UNIQUE constraint) but
-- drop the NOT NULL so both can be left unset when there is no natural
-- Stripe order/event backing the notification.
alter table public.notifications alter column source_order_id drop not null;
alter table public.notifications alter column source_event_id drop not null;

commit;
