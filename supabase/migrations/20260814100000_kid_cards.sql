begin;

-- MINIMEE v2: a child's self-introduction card, the kid equivalent of an
-- adult's commercial e-name card.
--
-- This is the first table in the product that is deliberately readable by
-- `anon`, because the whole point is a link a grandparent, a teacher or
-- someone who found a lost water bottle can open without an account. Three
-- things keep that safe:
--
--   1. Nothing is public until the parent flips `published`. A card starts
--      unpublished and stays invisible to anon until then.
--   2. `anon` gets a column-level grant, not a table-level one, so the
--      public read cannot reach parent_id, child_id or lost_mode_token even
--      though the row itself is visible.
--   3. Display name and age group are denormalised onto the card, so
--      publishing a card never requires exposing `children` — that table
--      stays parent-only, with the child's real birth year, interests and
--      private photo path.

create table if not exists public.kid_cards (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null unique references public.children(id) on delete cascade,
  parent_id uuid not null references auth.users(id) on delete cascade,

  -- URL segment: /kid/:slug. Lowercase letters, digits and hyphens only, so
  -- a card link can never be confused with another route.
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$'),

  -- Denormalised from `children` so the public card never needs to read it.
  display_name text not null check (char_length(display_name) between 1 and 40),
  age_group text check (age_group in ('3-5', '6-8', '9-12', '13+')),

  tagline text check (char_length(tagline) <= 120),
  about text check (char_length(about) <= 1000),
  likes text[] not null default '{}',
  dream_job text check (char_length(dream_job) <= 60),

  -- Illustrated scene key from the bundled asset set, plus an avatar that
  -- the parent has explicitly chosen to publish.
  scene text,
  avatar_url text,

  intro_video_url text,
  intro_video_poster text,

  -- The parent approval gate. Nothing reaches anon until this is true.
  published boolean not null default false,
  published_at timestamptz,

  lost_mode_enabled boolean not null default false,
  lost_mode_token text unique,
  lost_mode_message text check (char_length(lost_mode_message) <= 300),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Lost mode is meaningless without a token to route the finder through.
  constraint lost_mode_needs_token check (not lost_mode_enabled or lost_mode_token is not null)
);

create index if not exists kid_cards_parent_idx on public.kid_cards(parent_id);
create index if not exists kid_cards_published_idx on public.kid_cards(published) where published;

drop trigger if exists kid_cards_set_updated_at on public.kid_cards;
create trigger kid_cards_set_updated_at
before update on public.kid_cards
for each row execute function public.set_updated_at();

-- MEE cards the child has collected. Earned by completing tasks; the code
-- and rarity are locked at award time (ops doc: cards cannot be re-rolled).
create table if not exists public.mee_cards (
  id uuid primary key default gen_random_uuid(),
  kid_card_id uuid not null references public.kid_cards(id) on delete cascade,
  code text not null,
  name text not null,
  rarity text not null default 'normal' check (rarity in ('normal', 'flash')),
  art text not null,
  earned_for text,
  earned_at timestamptz not null default now(),
  unique (kid_card_id, code)
);

create index if not exists mee_cards_card_idx on public.mee_cards(kid_card_id);

create table if not exists public.kid_tasks (
  id uuid primary key default gen_random_uuid(),
  kid_card_id uuid not null references public.kid_cards(id) on delete cascade,
  title text not null,
  detail text,
  reward_card_code text,
  done boolean not null default false,
  done_at timestamptz,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists kid_tasks_card_idx on public.kid_tasks(kid_card_id, sort_order);

alter table public.kid_cards enable row level security;
alter table public.mee_cards enable row level security;
alter table public.kid_tasks enable row level security;

-- Parents get full control of their own children's cards.
drop policy if exists "kid_cards_parent_all" on public.kid_cards;
create policy "kid_cards_parent_all"
on public.kid_cards for all to authenticated
using (parent_id = auth.uid() or public.is_admin())
with check (parent_id = auth.uid());

-- The public read. Published only — an unpublished card is invisible.
drop policy if exists "kid_cards_public_read_published" on public.kid_cards;
create policy "kid_cards_public_read_published"
on public.kid_cards for select to anon
using (published);

drop policy if exists "mee_cards_parent_all" on public.mee_cards;
create policy "mee_cards_parent_all"
on public.mee_cards for all to authenticated
using (exists (select 1 from public.kid_cards c where c.id = mee_cards.kid_card_id and (c.parent_id = auth.uid() or public.is_admin())))
with check (exists (select 1 from public.kid_cards c where c.id = mee_cards.kid_card_id and c.parent_id = auth.uid()));

drop policy if exists "mee_cards_public_read_published" on public.mee_cards;
create policy "mee_cards_public_read_published"
on public.mee_cards for select to anon
using (exists (select 1 from public.kid_cards c where c.id = mee_cards.kid_card_id and c.published));

drop policy if exists "kid_tasks_parent_all" on public.kid_tasks;
create policy "kid_tasks_parent_all"
on public.kid_tasks for all to authenticated
using (exists (select 1 from public.kid_cards c where c.id = kid_tasks.kid_card_id and (c.parent_id = auth.uid() or public.is_admin())))
with check (exists (select 1 from public.kid_cards c where c.id = kid_tasks.kid_card_id and c.parent_id = auth.uid()));

drop policy if exists "kid_tasks_public_read_published" on public.kid_tasks;
create policy "kid_tasks_public_read_published"
on public.kid_tasks for select to anon
using (exists (select 1 from public.kid_cards c where c.id = kid_tasks.kid_card_id and c.published));

-- Grants. `authenticated` gets the whole table (RLS scopes it to their own
-- children); `anon` gets a COLUMN-level grant so the public card cannot leak
-- parent_id, child_id or the lost-mode token even on a published row. RLS
-- filters rows, not columns — this is what filters the columns.
grant select, insert, update, delete on public.kid_cards to authenticated;
grant select, insert, update, delete on public.mee_cards to authenticated;
grant select, insert, update, delete on public.kid_tasks to authenticated;

revoke all on public.kid_cards from anon;
revoke all on public.mee_cards from anon;
revoke all on public.kid_tasks from anon;

grant select (
  id, slug, display_name, age_group, tagline, about, likes, dream_job,
  scene, avatar_url, intro_video_url, intro_video_poster,
  published, lost_mode_enabled, lost_mode_message, created_at
) on public.kid_cards to anon;

grant select (id, kid_card_id, code, name, rarity, art, earned_for, earned_at)
  on public.mee_cards to anon;

grant select (id, kid_card_id, title, detail, done, sort_order)
  on public.kid_tasks to anon;

-- Resolves a lost-mode token to the card that owns it, without ever
-- exposing the token column to a reader. Returns nothing for a card whose
-- lost mode is switched off, so revoking lost mode takes effect instantly.
create or replace function public.kid_card_for_lost_token(p_token text)
returns table (slug text, display_name text, lost_mode_message text)
language sql
stable
security definer
set search_path = ''
as $function$
  select c.slug, c.display_name, c.lost_mode_message
  from public.kid_cards c
  where c.lost_mode_token = p_token
    and c.lost_mode_enabled
    and c.published;
$function$;

revoke all on function public.kid_card_for_lost_token(text) from public;
grant execute on function public.kid_card_for_lost_token(text) to anon, authenticated;

commit;
