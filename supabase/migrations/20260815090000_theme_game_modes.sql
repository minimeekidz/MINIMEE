-- The game a theme is played with, chosen per release rather than per theme.
--
-- Em's rule: 「每個月轉換更新嘅時候，就順便換埋個遊戲玩法，咁先唔會咁悶」.
-- Putting the mode on the release and not on the theme is what makes that
-- possible — 軌道交通 can come back next year as a different game without
-- rewriting the theme, and the card it already paid out stays attached to
-- the old release.
--
-- The second rule is 「如果三個主題嘅學習影片都係同一個遊戲玩法，咁就好沉悶」:
-- the cinema screens three themes at once, so no two themes on the wall may
-- share a mode. That is enforced by the partial unique index below rather
-- than by the back-office UI, because a UI check is advisory and this is not.

alter table public.theme_releases
  add column if not exists game_mode text not null default 'sentence';

-- Assign before the uniqueness rule exists. The default above puts every row
-- on 'sentence', so creating the index first fails on the default itself —
-- which is exactly how this migration failed the first time it was run.
update public.theme_releases set game_mode = 'number'   where id = 'release-v1-01'; -- 軌道交通
update public.theme_releases set game_mode = 'sentence' where id = 'release-v1-02'; -- 金錢與商店
update public.theme_releases set game_mode = 'spot'     where id = 'release-v1-03'; -- 綠色公園
update public.theme_releases set game_mode = 'predict'  where id = 'release-v1-04'; -- 藍天與海洋
update public.theme_releases set game_mode = 'make'     where id = 'release-v1-05'; -- 神秘深海
update public.theme_releases set game_mode = 'move'     where id = 'release-v1-06'; -- 沙灘探索

alter table public.theme_releases
  drop constraint if exists theme_releases_game_mode_check;
alter table public.theme_releases
  add constraint theme_releases_game_mode_check
  check (game_mode in ('sentence','number','spot','predict','choice','move','make'));

-- Distinct across everything on the wall, not just across 'current'. A
-- carryover theme is still screened and still played, so it counts.
drop index if exists theme_releases_distinct_game;
create unique index theme_releases_distinct_game
  on public.theme_releases (game_mode)
  where status <> 'retired' and tray_slot is not null;

-- The tray now carries everything a round of the game is built from.
--
-- The alternative was a second query per theme from the client, which would
-- have meant the words and the game that uses them could disagree for a
-- render. One row, one source: whatever the wall says a theme is, that is
-- what gets played.

drop function if exists public.active_trays(uuid);

create function public.active_trays(p_kid_card_id uuid)
returns table (
  tray_slot integer, theme_id text, theme_name text, words jsonb, status text,
  display_order integer, target_code text, book_no integer, slot_no integer,
  earned integer, owned boolean,
  game_mode text, vo text, question text, answer_pattern text
)
language sql
security definer
set search_path to 'public'
as $$
  select
    r.tray_slot, t.id, t.name_zh, t.words, r.status, r.display_order,
    r.target_card_code, c.book_no, c.slot_no,
    (select count(*)::integer from lesson_fragments f
       join room_lessons l on l.id = f.lesson_id
      where f.kid_card_id = p_kid_card_id and not f.spent
        and (l.theme_id = t.id or (l.theme_id is null and l.theme = t.name_zh))),
    exists (select 1 from mee_cards m
             where m.kid_card_id = p_kid_card_id and m.code = r.target_card_code),
    r.game_mode, t.vo, t.question, t.answer_pattern
  from theme_releases r
  join themes t on t.id = r.theme_id
  join card_catalog c on c.code = r.target_card_code
  where r.status <> 'retired'
    and r.tray_slot is not null
    and (r.active_from is null or r.active_from <= current_date)
    and (r.active_to is null or r.active_to >= current_date)
    and exists (select 1 from kid_cards k join children ch on ch.id = k.child_id
                 where k.id = p_kid_card_id and ch.parent_id = auth.uid())
  order by r.display_order;
$$;

revoke all on function public.active_trays(uuid) from public;
grant execute on function public.active_trays(uuid) to authenticated;
