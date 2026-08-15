-- Em's final card rules, 2026-08-15.
-- Spec: docs/design-reference/card-rarity-plan.md
--
--   4 碎片 = 完成主題 = Normal 必得
--   年繳    = 同時保證 Flash
--   月繳    = Flash 可透過稀有機會／活動／升級獲得
--   Special = 特別時刻額外收藏，不影響 72 張主卡完成率
--
-- The structural change: flash is no longer a property of the normal card,
-- it is a second card with its own pocket. The binder is 12 books of six —
-- three themes a book, each theme sitting as a 普/閃 pair — which is also
-- one book a month at three themes a month.

alter table public.card_catalog add column if not exists kind text not null default 'theme';
alter table public.card_catalog add column if not exists rarity text not null default 'normal';
alter table public.card_catalog add column if not exists theme_id text;
alter table public.card_catalog add column if not exists art text not null default '';

alter table public.card_catalog drop constraint if exists card_catalog_kind_check;
alter table public.card_catalog add constraint card_catalog_kind_check
  check (kind in ('theme', 'special'));
alter table public.card_catalog drop constraint if exists card_catalog_rarity_check;
alter table public.card_catalog add constraint card_catalog_rarity_check
  check (rarity in ('normal', 'flash', 'special'));

-- Book 1 slot 1 now exists twice: once in the theme binder and once on the
-- first special page. They are different binders, so uniqueness is per kind.
alter table public.card_catalog drop constraint if exists card_catalog_book_no_slot_no_key;
alter table public.card_catalog drop constraint if exists card_catalog_kind_book_slot_key;
alter table public.card_catalog add constraint card_catalog_kind_book_slot_key
  unique (kind, book_no, slot_no);

-- The old rows have to survive until theme_releases stops pointing at them,
-- so the order is insert -> repoint -> delete. Deleting first is what the
-- first attempt did, and the foreign key stopped it.
update public.card_catalog set card_number = card_number + 9000, book_no = book_no + 90;

-- 36 themes -> 72 cards. Book = ceil(themeNo / 3); within a book the three
-- themes sit in order, each as normal-then-flash, so a spread reads
-- 普 閃 普 閃 普 閃 exactly as the binder is drawn.
insert into public.card_catalog
  (code, card_number, kind, rarity, theme_id, book_no, slot_no, position_zh, art, normal_asset, flash_asset, art_note)
select
  format('T%s-%s', lpad(t.theme_no::text, 2, '0'), r.suffix),
  100 + (t.theme_no - 1) * 2 + r.ord,
  'theme', r.rarity, t.id,
  ceil(t.theme_no / 3.0)::int,
  ((t.theme_no - 1) % 3) * 2 + r.ord,
  format('第 %s 本・第 %s 格', ceil(t.theme_no / 3.0)::int, ((t.theme_no - 1) % 3) * 2 + r.ord),
  format('/assets/uploads/MEE卡-%s/%s_%s.webp',
         case when r.rarity = 'flash' then '閃耀' else '普通' end,
         t.theme_no, case when r.rarity = 'flash' then 'flash' else 'normal' end),
  format('/assets/uploads/MEE卡-普通/%s_normal.webp', t.theme_no),
  format('/assets/uploads/MEE卡-閃耀/%s_flash.webp', t.theme_no),
  t.name_zh
from public.themes t
cross join (values ('normal', 'N', 1), ('flash', 'F', 2)) as r(rarity, suffix, ord);

-- The starter special set. Pages of four, and the page count is deliberately
-- open — 「日後會不停新增限定卡」, so nothing here may become a denominator.
insert into public.card_catalog
  (code, card_number, kind, rarity, theme_id, book_no, slot_no, position_zh, art, normal_asset, flash_asset, art_note)
values
  ('SP-001', 1001, 'special', 'special', null, 1, 1, '特別回憶・第 1 頁第 1 格', '/assets/uploads/卡套冊-特別版/book-s1_book-1.webp', '', null, '砌齊三本主題冊'),
  ('SP-002', 1002, 'special', 'special', null, 1, 2, '特別回憶・第 1 頁第 2 格', '/assets/uploads/卡套冊-特別版/book-s1_book-2.webp', '', null, '砌齊六本主題冊'),
  ('SP-003', 1003, 'special', 'special', null, 1, 3, '特別回憶・第 1 頁第 3 格', '/assets/uploads/卡套冊-特別版/book-s1_book-3.webp', '', null, '砌齊九本主題冊'),
  ('SP-004', 1004, 'special', 'special', null, 1, 4, '特別回憶・第 1 頁第 4 格', '/assets/uploads/卡套冊-特別版/book-s1_book-4.webp', '', null, '砌齊十二本主題冊'),
  ('SP-005', 1005, 'special', 'special', null, 2, 1, '特別回憶・第 2 頁第 1 格', '/assets/uploads/卡套冊-特別版/book-s2_festival-cny.webp', '', null, '農曆新年'),
  ('SP-006', 1006, 'special', 'special', null, 2, 2, '特別回憶・第 2 頁第 2 格', '/assets/uploads/卡套冊-特別版/book-s2_festival-dragon.webp', '', null, '端午'),
  ('SP-007', 1007, 'special', 'special', null, 2, 3, '特別回憶・第 2 頁第 3 格', '/assets/uploads/卡套冊-特別版/book-s2_festival-midautumn.webp', '', null, '中秋'),
  ('SP-008', 1008, 'special', 'special', null, 2, 4, '特別回憶・第 2 頁第 4 格', '/assets/uploads/卡套冊-特別版/book-s2_birthday.webp', '', null, '生日');

-- A release now pays the theme's own normal card. The column stays because
-- the back office reads it, but it is no longer a free choice: theme and
-- card are one-to-one by construction, so there is nothing left to mis-map.
update public.theme_releases r
   set target_card_code = format('T%s-N', lpad(t.theme_no::text, 2, '0'))
  from public.themes t
 where t.id = r.theme_id;

delete from public.card_catalog where card_number > 9000;

drop index if exists card_catalog_theme_rarity;
create unique index card_catalog_theme_rarity
  on public.card_catalog (theme_id, rarity) where kind = 'theme';

alter table public.mee_cards drop constraint if exists mee_cards_rarity_check;
alter table public.mee_cards add constraint mee_cards_rarity_check
  check (rarity in ('normal', 'flash', 'special'));
