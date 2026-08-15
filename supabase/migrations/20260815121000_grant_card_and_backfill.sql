-- Granting a card, under Em's rules.
--
-- Everything goes through `grant_card`, which is idempotent by way of the
-- existing unique (kid_card_id, code). An event that fires twice — a
-- festival job re-run, a milestone re-evaluated, a double-tapped button —
-- cannot produce two copies. That matters more than usual here because the
-- monthly path to a flash card is a scattering of occasional events rather
-- than one rule, so re-fires are the normal case, not the exception.

create or replace function public.is_annual(p_kid_card_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select exists (
    select 1
      from kid_cards k
      join children ch on ch.id = k.child_id
      join subscriptions s on s.child_id = ch.id
     where k.id = p_kid_card_id
       and s.plan_type = 'yearly'
       and s.status = 'active'
  );
$$;

create or replace function public.grant_card(
  p_kid_card_id uuid, p_code text, p_reason text default ''
)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_catalog card_catalog%rowtype;
  v_new integer;
begin
  select * into v_catalog from card_catalog where code = p_code;
  if not found then return false; end if;

  insert into mee_cards (kid_card_id, code, name, rarity, art, earned_for, theme, book_no, slot_no)
  values (
    p_kid_card_id, v_catalog.code, v_catalog.art_note, v_catalog.rarity, v_catalog.art,
    coalesce(nullif(p_reason, ''), v_catalog.art_note),
    v_catalog.theme_id,
    -- A special card carries no album position. Em: 「唔影響 72 張完成率」,
    -- and the cleanest way to guarantee that is for it to have no slot in
    -- the theme binder to be counted against at all.
    case when v_catalog.kind = 'theme' then v_catalog.book_no end,
    case when v_catalog.kind = 'theme' then v_catalog.slot_no end
  )
  on conflict (kid_card_id, code) do nothing;

  get diagnostics v_new = row_count;
  return v_new > 0;
end;
$$;

-- Completing a theme. Normal always; flash as well when the child is on the
-- annual plan — 「年繳會員：每個完成主題，保證獲得 Normal + Flash 雙版本」.
drop function if exists public.forge_theme_card(uuid, text);

create function public.forge_theme_card(p_kid_card_id uuid, p_theme_id text)
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

  -- Both rows come back, so the celebration can light two pockets at once
  -- rather than one and then a surprise.
  return query
    select m.code, m.name, m.rarity, m.art
      from mee_cards m
     where m.kid_card_id = p_kid_card_id
       and m.code in (v_normal, coalesce(v_flash, v_normal))
     order by m.rarity;
end;
$$;

-- 「升級年費，即時點亮你已完成主題嘅閃耀收藏」. Every theme the child has
-- already finished gets its flash, in one go. Returns how many lit up so the
-- upgrade screen can say a number rather than a vague well done.
create or replace function public.backfill_flash(p_kid_card_id uuid)
returns integer
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_code text;
  v_lit integer := 0;
begin
  if not is_annual(p_kid_card_id) then return 0; end if;

  for v_code in
    select f.code
      from mee_cards m
      join card_catalog n on n.code = m.code and n.kind = 'theme' and n.rarity = 'normal'
      join card_catalog f on f.theme_id = n.theme_id and f.kind = 'theme' and f.rarity = 'flash'
     where m.kid_card_id = p_kid_card_id
  loop
    if grant_card(p_kid_card_id, v_code, '升級年繳・補發') then
      v_lit := v_lit + 1;
    end if;
  end loop;
  return v_lit;
end;
$$;

revoke all on function public.grant_card(uuid, text, text) from public, anon, authenticated;
revoke all on function public.is_annual(uuid) from public, anon;
grant execute on function public.is_annual(uuid) to authenticated;
grant execute on function public.forge_theme_card(uuid, text) to authenticated;
grant execute on function public.backfill_flash(uuid) to authenticated;
