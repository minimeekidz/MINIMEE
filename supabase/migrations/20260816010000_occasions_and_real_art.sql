-- Point the cards at the art Em actually uploaded, and wire the occasions.
-- Applied against the project 2026-08-16; this file is the record.
-- See docs/design-reference/card-rarity-plan.md for the rules.

-- Normals landed as `1.webp` rather than `1_normal.webp`; the eight
-- 特別版MEE卡_A款–H款 map one-to-one onto the eight special pockets.
update public.card_catalog
   set art = format('/assets/uploads/MEE卡-普通/%s.webp',
                    (select t.theme_no from public.themes t where t.id = card_catalog.theme_id)),
       normal_asset = format('/assets/uploads/MEE卡-普通/%s.webp',
                    (select t.theme_no from public.themes t where t.id = card_catalog.theme_id))
 where kind = 'theme' and rarity = 'normal';

update public.card_catalog
   set art = format('/assets/uploads/MEE卡-閃耀/%s_flash.webp',
                    (select t.theme_no from public.themes t where t.id = card_catalog.theme_id)),
       flash_asset = format('/assets/uploads/MEE卡-閃耀/%s_flash.webp',
                    (select t.theme_no from public.themes t where t.id = card_catalog.theme_id))
 where kind = 'theme' and rarity = 'flash';

update public.card_catalog c
   set art = format('/assets/uploads/MEE卡-特別版/特別版MEE卡_%s款.webp', v.letter),
       art_note = v.note
  from (values
    ('SP-001', 'A', '一共完成 18 個主題'),
    ('SP-002', 'B', '一共完成 36 個主題'),
    ('SP-003', 'C', '加入 MINIMEE 一周年'),
    ('SP-004', 'D', '第一次成功加好友'),
    ('SP-005', 'E', '農曆新年'),
    ('SP-006', 'F', '中秋'),
    ('SP-007', 'G', '寵物好感 Lv12'),
    ('SP-008', 'H', '生日')
  ) as v(code, letter, note)
 where c.code = v.code;

-- 「一共完成18個主題」/「一共完成36個主題」 — a total, not a streak. Em
-- replaced 「連續完成主題」 with these, and a total is the right shape: a
-- streak is broken by a holiday or a cold, which punishes a family for
-- living rather than rewarding a child for learning.
create or replace function public.check_theme_milestones(p_kid_card_id uuid)
returns integer
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_done integer;
  v_given integer := 0;
begin
  -- Counted by normal cards held: the normal is what every member gets for
  -- finishing, so it is the honest measure of how much learning happened.
  -- Counting flash too would double every annual member.
  select count(*) into v_done
    from mee_cards m
    join card_catalog c on c.code = m.code
   where m.kid_card_id = p_kid_card_id and c.kind = 'theme' and c.rarity = 'normal';

  if v_done >= 18 and grant_card(p_kid_card_id, 'SP-001', '一共完成 18 個主題') then
    v_given := v_given + 1;
  end if;
  if v_done >= 36 and grant_card(p_kid_card_id, 'SP-002', '一共完成 36 個主題') then
    v_given := v_given + 1;
  end if;
  return v_given;
end;
$$;

-- The occasions that hand out a 特別回憶.
--
-- One function, called on every load, that works out from the database what
-- today deserves. The client passes the festival because only it has talked
-- to the 天文台; everything else is read here, so a browser cannot claim a
-- card by asking nicely. Every grant is idempotent, which is what makes
-- calling it on every load the right shape rather than a leak.
create or replace function public.claim_occasion_cards(
  p_kid_card_id uuid, p_festival text default null
)
returns integer
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_child children%rowtype;
  v_given integer := 0;
  v_joined date;
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

  -- Whitelisted, so a made-up festival code grants nothing.
  if p_festival = 'cny' and grant_card(p_kid_card_id, 'SP-005', '農曆新年') then
    v_given := v_given + 1;
  elsif p_festival = 'midautumn' and grant_card(p_kid_card_id, 'SP-007', '中秋') then
    v_given := v_given + 1;
  end if;

  v_joined := v_child.created_at::date;
  if v_joined is not null and current_date >= v_joined + interval '1 year'
     and grant_card(p_kid_card_id, 'SP-003', '加入 MINIMEE 一周年') then
    v_given := v_given + 1;
  end if;

  if exists (select 1 from pet_friendships f where f.kid_card_id = p_kid_card_id)
     and grant_card(p_kid_card_id, 'SP-004', '第一個好朋友') then
    v_given := v_given + 1;
  end if;

  -- Levels are 30 points apart, so Lv12 is 330 and up.
  if exists (
    select 1 from pet_friendships f
     where f.kid_card_id = p_kid_card_id and f.points >= 330
  ) and grant_card(p_kid_card_id, 'SP-006', '寵物好感 Lv12') then
    v_given := v_given + 1;
  end if;

  v_given := v_given + check_theme_milestones(p_kid_card_id);
  return v_given;
end;
$$;

-- Forging also checks the totals, so the 18th theme pays its achievement in
-- the same breath rather than on the next page load.
create or replace function public.forge_theme_card(p_kid_card_id uuid, p_theme_id text)
returns table (code text, name text, rarity text, art text)
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_normal text;
  v_flash text;
begin
  if not exists (
    select 1 from kid_cards k join children ch on ch.id = k.child_id
     where k.id = p_kid_card_id and ch.parent_id = auth.uid()
  ) then
    raise exception 'not your card';
  end if;

  select c.code into v_normal from card_catalog c
   where c.theme_id = p_theme_id and c.kind = 'theme' and c.rarity = 'normal';
  if v_normal is null then return; end if;

  perform grant_card(p_kid_card_id, v_normal, '完成主題');

  if is_annual(p_kid_card_id) then
    select c.code into v_flash from card_catalog c
     where c.theme_id = p_theme_id and c.kind = 'theme' and c.rarity = 'flash';
    if v_flash is not null then
      perform grant_card(p_kid_card_id, v_flash, '年繳・雙版本');
    end if;
  end if;

  perform check_theme_milestones(p_kid_card_id);

  return query
    select m.code, m.name, m.rarity, m.art
      from mee_cards m
     where m.kid_card_id = p_kid_card_id
       and m.code in (v_normal, coalesce(v_flash, v_normal))
     order by m.rarity;
end;
$$;

grant execute on function public.check_theme_milestones(uuid) to authenticated;
grant execute on function public.claim_occasion_cards(uuid, text) to authenticated;
grant execute on function public.forge_theme_card(uuid, text) to authenticated;
