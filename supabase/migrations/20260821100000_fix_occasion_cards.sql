-- Two occasion cards were handing out each other's art, and 「第一次成功加好
-- 友」 was paying for a pet.
--
-- 1. The special cards were renumbered when Em's real art landed
--    (20260816010000): SP-006 became 中秋 and SP-007 became 寵物好感 Lv12.
--    `claim_occasion_cards` was written against the old numbering and never
--    followed, so on 中秋 a child got the pet-affinity card and at Lv12 they
--    got the mid-autumn one. Nobody has hit either yet — there are no
--    friendships at Lv12 and the last 中秋 predates the feature — so this is
--    a straight swap with nothing to migrate.
--
-- 2. SP-004 reads 「第一次成功加好友」 and was granted for a pet friendship
--    existing. Pets become friends by being fed, which is not what that
--    sentence means, and there was no other kind of friend in the product at
--    the time. There is now: Buddy Café's QR exchange, both sides consenting.
--    So the card pays for that, which is what it says.

create or replace function public.claim_occasion_cards(
  p_kid_card_id uuid, p_festival text default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_child children;
  v_joined date;
  v_given integer := 0;
begin
  select ch.* into v_child
    from kid_cards k join children ch on ch.id = k.child_id
   where k.id = p_kid_card_id and ch.parent_id = auth.uid();
  if not found then return 0; end if;

  if v_child.dob is not null
     and to_char(v_child.dob, 'MM-DD') = to_char(current_date, 'MM-DD')
     and grant_card(p_kid_card_id, 'SP-008', '生日快樂') then
    v_given := v_given + 1;
  end if;

  -- Whitelisted, so a made-up festival code grants nothing. 端午 is missing
  -- on purpose: Em's eight special cards are 18 主題, 36 主題, 一周年, 加好友,
  -- 新年, 中秋, 寵物 Lv12 and 生日, and there is no dragon-boat card to give.
  -- The stage still runs a 端午 performance and says outright that there is
  -- no card, which is better than a claim button that quietly grants nothing.
  if p_festival = 'cny' and grant_card(p_kid_card_id, 'SP-005', '農曆新年') then
    v_given := v_given + 1;
  elsif p_festival = 'midautumn' and grant_card(p_kid_card_id, 'SP-006', '中秋') then
    v_given := v_given + 1;
  end if;

  v_joined := v_child.created_at::date;
  if v_joined is not null and current_date >= v_joined + interval '1 year'
     and grant_card(p_kid_card_id, 'SP-003', '加入 MINIMEE 一周年') then
    v_given := v_given + 1;
  end if;

  -- A friendship both children agreed to. `confirmed_at` is the whole point:
  -- a request nobody answered is not a friend, and should not pay a card.
  if exists (
    select 1 from friendships f
     where f.confirmed_at is not null
       and p_kid_card_id in (f.low_card, f.high_card)
  ) and grant_card(p_kid_card_id, 'SP-004', '第一次成功加好友') then
    v_given := v_given + 1;
  end if;

  -- Levels are 30 points apart, so Lv12 is 330 and up.
  if exists (
    select 1 from pet_friendships f
     where f.kid_card_id = p_kid_card_id and f.points >= 330
  ) and grant_card(p_kid_card_id, 'SP-007', '寵物好感 Lv12') then
    v_given := v_given + 1;
  end if;

  v_given := v_given + check_theme_milestones(p_kid_card_id);
  return v_given;
end;
$$;

revoke all on function public.claim_occasion_cards(uuid, text) from public, anon;
grant execute on function public.claim_occasion_cards(uuid, text) to authenticated;
