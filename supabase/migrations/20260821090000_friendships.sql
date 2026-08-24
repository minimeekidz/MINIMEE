-- 好友冊 —— 兩邊都撳「同意」先加得成。
--
-- Em: 「讓小朋友與小朋友之間互掃 qrcode 加好友及同意加入好友的」. The consent
-- half is the part that has to be built properly rather than added later: a
-- code that adds a friend the moment somebody points a camera at it is a code
-- any adult in a playground can collect. So a friendship is two booleans, and
-- it is not a friendship until both are true.
--
-- Everything goes through functions and nothing is granted on the table. That
-- is stricter than the usual RLS pattern here, and it is deliberate — the row
-- names two children who belong to two different parents, so "can this person
-- read this row" has two answers, and a policy that gets it slightly wrong
-- leaks one family's card to another. The functions answer it once.

create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),

  -- Ordered so a pair can only exist once, whichever child scanned first.
  low_card uuid not null references public.kid_cards(id) on delete cascade,
  high_card uuid not null references public.kid_cards(id) on delete cascade,

  low_ok boolean not null default false,
  high_ok boolean not null default false,

  created_at timestamptz not null default now(),
  confirmed_at timestamptz,

  constraint friendship_is_ordered check (low_card < high_card),
  constraint friendship_is_unique unique (low_card, high_card),
  -- A row exists because somebody asked. A row where neither side has agreed
  -- is a row nobody created, and would only ever be a bug.
  constraint friendship_has_a_asker check (low_ok or high_ok)
);

create index if not exists friendships_low_idx on public.friendships(low_card);
create index if not exists friendships_high_idx on public.friendships(high_card);

alter table public.friendships enable row level security;
revoke all on public.friendships from anon, authenticated;

-- --------------------------------------------------------------------------

/** True when the signed-in parent owns this card. */
create or replace function public.owns_card(p_card uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.kid_cards
    where id = p_card and parent_id = auth.uid()
  );
$$;

/**
 * Scanned somebody's code. Records this child's consent and, if the other
 * side has already agreed, confirms the friendship.
 *
 * Returns the friendship id. Raises if the slug is unknown, unpublished, or
 * is this child's own card.
 */
create or replace function public.request_friend(p_my_card uuid, p_their_slug text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_their uuid;
  v_low uuid;
  v_high uuid;
  v_id uuid;
begin
  if not public.owns_card(p_my_card) then
    raise exception 'not your card';
  end if;

  -- Unpublished cards are invisible everywhere else, and this is no
  -- exception: a card the parent has not released cannot be befriended.
  select id into v_their from public.kid_cards
   where slug = lower(p_their_slug) and published;
  if v_their is null then
    raise exception 'no such card';
  end if;
  if v_their = p_my_card then
    raise exception 'that is your own card';
  end if;

  v_low := least(p_my_card, v_their);
  v_high := greatest(p_my_card, v_their);

  insert into public.friendships (low_card, high_card, low_ok, high_ok)
  values (v_low, v_high, p_my_card = v_low, p_my_card = v_high)
  on conflict (low_card, high_card) do update
    set low_ok = friendships.low_ok or (p_my_card = v_low),
        high_ok = friendships.high_ok or (p_my_card = v_high)
  returning id into v_id;

  update public.friendships
     set confirmed_at = now()
   where id = v_id and low_ok and high_ok and confirmed_at is null;

  return v_id;
end;
$$;

/**
 * The other half: 同意 or 唔要. Declining deletes the row rather than
 * remembering the refusal — a child who says no should not leave a record in
 * somebody else's account, and asking again later is allowed.
 */
create or replace function public.respond_friend(
  p_my_card uuid, p_friendship uuid, p_accept boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.friendships;
begin
  if not public.owns_card(p_my_card) then
    raise exception 'not your card';
  end if;

  select * into v_row from public.friendships where id = p_friendship;
  if v_row.id is null or p_my_card not in (v_row.low_card, v_row.high_card) then
    raise exception 'no such request';
  end if;

  if not p_accept then
    delete from public.friendships where id = p_friendship;
    return;
  end if;

  update public.friendships
     set low_ok = low_ok or (p_my_card = low_card),
         high_ok = high_ok or (p_my_card = high_card)
   where id = p_friendship;

  update public.friendships
     set confirmed_at = now()
   where id = p_friendship and low_ok and high_ok and confirmed_at is null;
end;
$$;

/**
 * 好友冊. One row per friend, with only what the book actually shows: their
 * name, their picture, their link, and whose turn it is.
 *
 * The columns are chosen rather than `select *` on purpose — the other
 * family's card carries an about, a video and a lost-mode token, and none of
 * those belong in a friend list.
 */
create or replace function public.my_friends(p_my_card uuid)
returns table (
  friendship_id uuid,
  slug text,
  display_name text,
  avatar_url text,
  status text,
  since timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select f.id,
         other.slug,
         other.display_name,
         other.avatar_url,
         case
           when f.confirmed_at is not null then 'friends'
           when (p_my_card = f.low_card and f.low_ok)
             or (p_my_card = f.high_card and f.high_ok) then 'waiting-them'
           else 'waiting-me'
         end,
         coalesce(f.confirmed_at, f.created_at)
    from public.friendships f
    join public.kid_cards other
      on other.id = case when f.low_card = p_my_card then f.high_card else f.low_card end
   where public.owns_card(p_my_card)
     and p_my_card in (f.low_card, f.high_card)
   order by f.confirmed_at desc nulls first, f.created_at desc;
$$;

-- Supabase grants execute to anon, authenticated and service_role by default,
-- and `revoke from public` does not touch an explicit grant — so each role is
-- named here. `owns_card` is an internal helper and nobody calls it directly;
-- the other three are for a signed-in parent only. An anon caller would fail
-- the ownership check anyway, but a function anon cannot call is one fewer
-- thing to reason about.
revoke all on function public.owns_card(uuid) from public, anon, authenticated;
revoke all on function public.request_friend(uuid, text) from public, anon;
revoke all on function public.respond_friend(uuid, uuid, boolean) from public, anon;
revoke all on function public.my_friends(uuid) from public, anon;

grant execute on function public.request_friend(uuid, text) to authenticated;
grant execute on function public.respond_friend(uuid, uuid, boolean) to authenticated;
grant execute on function public.my_friends(uuid) to authenticated;
