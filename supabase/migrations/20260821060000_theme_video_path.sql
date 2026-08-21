-- The film belongs to the theme.
--
-- It used to hang off room_lessons, from back when a theme was spread across
-- nine rooms. That model is gone — the month is three themes, and the poster,
-- the game, the studio board and the fragment wall all key off theme_id — but
-- the video did not move with it. The result was a cinema that could never
-- find a film: all nine lessons have theme_id null, so the hall always said
-- 「呢條片仲未上載」 and 2 號廳 was permanently empty, no matter what anybody
-- uploaded.
--
-- Putting the path on the theme makes uploading a film the same one-row job as
-- everything else about that theme.

alter table public.themes add column if not exists video_path text;

update public.themes t
   set video_path = l.video_path
  from public.room_lessons l
 where l.video_path is not null
   and t.video_path is null
   and (l.theme_id = t.id or l.theme = t.name_zh);

revoke all on public.themes from anon;

drop function if exists public.active_trays(uuid);

create function public.active_trays(p_kid_card_id uuid)
returns table (
  tray_slot integer, theme_id text, theme_name text, words jsonb, status text,
  display_order integer, target_code text, book_no integer, slot_no integer,
  earned integer, owned boolean,
  game_mode text, vo text, question text, answer_pattern text, video_path text
)
language sql
security definer
set search_path to 'public'
as $$
  select
    r.tray_slot, t.id, t.name_zh, t.words, r.status, r.display_order,
    r.target_card_code, c.book_no, c.slot_no,
    least(4, (
      (select count(*) from theme_fragments f
        where f.kid_card_id = p_kid_card_id and f.theme_id = t.id)
      + (select count(*) from lesson_fragments l2
           join room_lessons l on l.id = l2.lesson_id
          where l2.kid_card_id = p_kid_card_id and not l2.spent and l.theme_id = t.id)
    ))::integer,
    exists (select 1 from mee_cards m
             where m.kid_card_id = p_kid_card_id and m.code = r.target_card_code),
    r.game_mode, t.vo, t.question, t.answer_pattern, t.video_path
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

drop function if exists public.theme_history();

create function public.theme_history()
returns table (
  theme_id text, theme_name text, words jsonb, video_path text, retired_on date
)
language sql
security definer
set search_path to 'public'
as $$
  select t.id, t.name_zh, t.words, t.video_path, r.active_to
    from theme_releases r
    join themes t on t.id = r.theme_id
   where r.status = 'retired'
   order by r.active_to desc nulls last, r.display_order;
$$;

revoke all on function public.theme_history() from public;
grant execute on function public.theme_history() to authenticated;
