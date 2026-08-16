-- Fragments belong to a theme, not to a room.
--
-- Em's route is now 戲院大堂接待處 → 揀片 → 1 號廳 → Studio 答題, so the four
-- fragments are four rounds of one theme rather than four different
-- buildings. The old rule ("one per room per lesson") is what forced a theme
-- to be spread across nine rooms; the games were always shaped as one theme
-- played four times, so this makes the data match what they already were.
--
-- Round number is the count already held, and the primary key is
-- (card, theme, round), so a replayed round cannot mint a second fragment
-- and a double-tapped button cannot either.

create table if not exists public.theme_fragments (
  kid_card_id uuid not null references public.kid_cards(id) on delete cascade,
  theme_id text not null references public.themes(id),
  round integer not null check (round between 1 and 4),
  earned_at timestamptz not null default now(),
  primary key (kid_card_id, theme_id, round)
);

alter table public.theme_fragments enable row level security;

drop policy if exists theme_fragments_own on public.theme_fragments;
create policy theme_fragments_own on public.theme_fragments
  for select using (exists (
    select 1 from kid_cards k join children ch on ch.id = k.child_id
     where k.id = theme_fragments.kid_card_id and ch.parent_id = auth.uid()));

-- Awarding is a function rather than an insert policy so the round number is
-- the server's decision. A browser that asks for round 4 first still gets the
-- round it has actually reached.
create or replace function public.award_theme_fragment(
  p_kid_card_id uuid, p_theme_id text
)
returns integer
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_have integer;
begin
  if not exists (
    select 1 from kid_cards k join children ch on ch.id = k.child_id
     where k.id = p_kid_card_id and ch.parent_id = auth.uid()
  ) then
    raise exception 'not your card';
  end if;

  select count(*) into v_have from theme_fragments
   where kid_card_id = p_kid_card_id and theme_id = p_theme_id;
  if v_have >= 4 then return v_have; end if;

  insert into theme_fragments (kid_card_id, theme_id, round)
  values (p_kid_card_id, p_theme_id, v_have + 1)
  on conflict do nothing;

  return v_have + 1;
end;
$$;

grant execute on function public.award_theme_fragment(uuid, text) to authenticated;
grant select on public.theme_fragments to authenticated;

-- The tray counts theme fragments now. The old lesson-fragment count stays in
-- the sum so nobody loses progress they earned under the room rule.
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
    least(4, (
      (select count(*) from theme_fragments f
        where f.kid_card_id = p_kid_card_id and f.theme_id = t.id)
      + (select count(*) from lesson_fragments l2
           join room_lessons l on l.id = l2.lesson_id
          where l2.kid_card_id = p_kid_card_id and not l2.spent and l.theme_id = t.id)
    ))::integer,
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

-- 「36 個主題卡名，常規同閃耀共用一個名」 — the theme's own name, on both.
update public.card_catalog c
   set art_note = t.name_zh
  from public.themes t
 where t.id = c.theme_id and c.kind = 'theme';
