-- Close the doors on the SECURITY DEFINER functions.
--
-- Supabase grants EXECUTE on every new function to anon, authenticated and
-- service_role by default. `revoke ... from public` does not touch an explicit
-- grant, so every function written here has been callable by anon since the
-- day it was created, and the definer bit means each one runs as its owner
-- with RLS out of the way. Most of them check `auth.uid()` inside and simply
-- raise for an anonymous caller, but three did not, and one of those is a
-- leak rather than a nuisance:
--
--   theme_history()  returns themes.video_path. `themes` was revoked from
--                    anon exactly so a video path could never reach an
--                    unauthenticated reader, and this function handed the
--                    retired half of that table to anybody with the publishable
--                    key. That is the rule this product cares most about —
--                    a video is a child, and a path is most of a URL.
--
--   backfill_flash(uuid)          no ownership check, writes cards
--   check_theme_milestones(uuid)  no ownership check, writes cards
--
-- Neither of the last two can grant a card the child has not earned — both
-- only re-issue what the entitlement already says — so nothing is being
-- cleaned up after. They are still unauthenticated write paths into another
-- family's collection, which is not something to leave open because today's
-- blast radius happens to be small.

-- 1. Nobody reaches these without signing in.
revoke all on function public.active_trays(uuid) from anon;
revoke all on function public.theme_history() from anon;
revoke all on function public.rotate_themes(text[]) from anon;
revoke all on function public.award_theme_fragment(uuid, text) from anon;
revoke all on function public.forge_theme_card(uuid, text) from anon;
revoke all on function public.backfill_flash(uuid) from anon;

-- Not touched, and deliberately: kid_card_public, kid_card_public_stickers and
-- kid_card_for_lost_token are the product's three intentionally anonymous
-- surfaces — a shared card link and a found-item tag are read by strangers by
-- design, and each one already filters to what the parent published.

-- 2. An internal helper, called by forge_theme_card and claim_occasion_cards.
--    No caller outside the database, so no caller outside the database.
revoke all on function public.check_theme_milestones(uuid) from anon, authenticated;

-- 3. backfill_flash is called from the client, so it checks the caller owns
--    the card — the same check every other card-writing function makes.
create or replace function public.backfill_flash(p_kid_card_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
  v_lit integer := 0;
begin
  if not exists (
    select 1 from kid_cards k join children ch on ch.id = k.child_id
     where k.id = p_kid_card_id and ch.parent_id = auth.uid()
  ) then
    raise exception 'not your card';
  end if;

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

revoke all on function public.backfill_flash(uuid) from public, anon;
grant execute on function public.backfill_flash(uuid) to authenticated;
