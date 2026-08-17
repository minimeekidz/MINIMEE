-- Turning the month over in one call.
--
-- Em: 「當我轉主題，電影海報、戲院當期精選、小遊戲、studio 當期詞彙學習、
-- 碎片收集室同步上映。舊的三個主題則會放到歷史記錄中」.
--
-- Everything she listed already reads from one row per theme in
-- theme_releases — the cinema posters, the box office, the game the tray is
-- played with, the studio's teaching board and the three fragment stations
-- all take `status = 'current'` from here. So "same time" is not something to
-- coordinate; it is a property of there being one source. This function is
-- that source's switch.
--
-- Retiring rather than deleting is what makes the history real: a retired
-- release keeps its words, its game and its card mapping, so 2 號廳 can still
-- play the film and the library can still show the vocabulary. What it stops
-- doing is paying out — 「主題一過就無得草返轉頭」.

create or replace function public.rotate_themes(p_theme_ids text[])
returns table (tray_slot integer, theme_id text, target_card_code text)
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_id text;
  v_slot integer := 0;
  v_code text;
begin
  if not exists (
    select 1 from user_roles where user_id = auth.uid() and role = 'admin'
  ) then
    raise exception 'admin only';
  end if;

  if array_length(p_theme_ids, 1) is distinct from 3 then
    raise exception 'a month is exactly three themes, got %',
      coalesce(array_length(p_theme_ids, 1), 0);
  end if;

  -- Every id has to be a real theme with a configured card before anything
  -- moves, or a typo would retire the current month and put nothing up.
  foreach v_id in array p_theme_ids loop
    if not exists (select 1 from themes where id = v_id) then
      raise exception 'no such theme: %', v_id;
    end if;
    if not exists (
      select 1 from card_catalog where theme_id = v_id and kind = 'theme'
    ) then
      raise exception 'theme % has no card in the catalogue', v_id;
    end if;
  end loop;

  -- The outgoing three become history. Their tray slot is cleared so nothing
  -- can draw them on a wall that is only three wide.
  update theme_releases
     set status = 'retired', tray_slot = null, active_to = current_date
   where status <> 'retired';

  foreach v_id in array p_theme_ids loop
    v_slot := v_slot + 1;
    select code into v_code
      from card_catalog
     where card_catalog.theme_id = v_id and kind = 'theme'
       and rarity = 'normal'
     order by card_number
     limit 1;

    insert into theme_releases (
      theme_id, tray_slot, status, display_order, target_card_code,
      active_from, active_to, game_mode
    )
    values (
      v_id, v_slot, 'current', v_slot, v_code, current_date, null,
      -- Three concurrent themes must never share a game, or the month is
      -- the same puzzle three times. Rotating through the seven families by
      -- slot keeps them different without anybody choosing each month.
      (array['sentence','number','spot','predict','choice','move','make'])[
        1 + ((extract(month from current_date)::integer * 3 + v_slot) % 7)]
    );

    tray_slot := v_slot;
    theme_id := v_id;
    target_card_code := v_code;
    return next;
  end loop;
end;
$$;

revoke all on function public.rotate_themes(text[]) from public;
grant execute on function public.rotate_themes(text[]) to authenticated;

-- The history side of the same table: themes that have rolled off, with what
-- they still carry. 2 號廳 plays these and the library reads them; neither
-- pays a fragment.
create or replace function public.theme_history()
returns table (theme_id text, theme_name text, words jsonb, retired_on date)
language sql
security definer
set search_path to 'public'
as $$
  select t.id, t.name_zh, t.words, r.active_to
    from theme_releases r
    join themes t on t.id = r.theme_id
   where r.status = 'retired'
   order by r.active_to desc nulls last, r.display_order;
$$;

revoke all on function public.theme_history() from public;
grant execute on function public.theme_history() to authenticated;
