begin;

-- Companion to finalize_verified_checkout for recurring plans: a paid
-- renewal invoice (Stripe event invoice.paid with billing_reason =
-- subscription_cycle) tops up the next batch of theme entitlements for the
-- same subscription and extends its period, without re-running the
-- first-checkout bookkeeping (which stays owned by finalize_verified_checkout).
create or replace function public.finalize_subscription_renewal(
  p_event_id text,
  p_event_type text,
  p_stripe_subscription_id text,
  p_period_end timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_subscription public.subscriptions%rowtype;
  v_order public.billing_orders%rowtype;
  v_max_sequence integer;
  v_notification public.notifications%rowtype;
  v_plan_label text;
begin
  select * into v_subscription
  from public.subscriptions
  where stripe_subscription_id = p_stripe_subscription_id
  for update;

  if not found then raise exception 'Unknown subscription for renewal'; end if;

  select * into v_order from public.billing_orders where id = v_subscription.source_order_id;

  insert into public.stripe_events(event_id, event_type, stripe_object_id)
  values (p_event_id, p_event_type, p_stripe_subscription_id)
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

  select coalesce(max(sequence_number), 0) into v_max_sequence
  from public.theme_entitlements
  where source_order_id = v_subscription.source_order_id;

  insert into public.theme_entitlements(
    parent_id, child_id, subscription_id, source_order_id, sequence_number
  )
  select v_subscription.parent_id, v_subscription.child_id, v_subscription.id, v_subscription.source_order_id, v_max_sequence + n
  from generate_series(1, v_subscription.theme_allowance) as n;

  update public.subscriptions
  set status = 'active',
      current_period_end = p_period_end,
      read_only_until = null
  where id = v_subscription.id;

  v_plan_label := case v_subscription.plan_type
    when 'monthly_3m' then '3個月預繳方案'
    when 'yearly' then '全年預繳方案'
    else v_subscription.plan_type
  end;

  insert into public.notifications(
    parent_id, source_order_id, source_event_id, notification_type, title, body
  ) values (
    v_subscription.parent_id,
    null,
    p_event_id,
    'renewal_verified',
    '續期已確認',
    format('Stripe 已核實續期付款，%s新一期 %s 個主題權益已啟用。', v_plan_label, v_subscription.theme_allowance)
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

revoke all on function public.finalize_subscription_renewal(text, text, text, timestamptz) from public, anon, authenticated;
grant execute on function public.finalize_subscription_renewal(text, text, text, timestamptz) to service_role;

commit;
