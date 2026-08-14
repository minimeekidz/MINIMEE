# MINIMEE — Project Operations & Continuity Handbook

> This file is the durable source of truth for MINIMEE. Read it before changing product rules, pricing, data access, deployment, DNS, Supabase, or production content.
>
> Last updated: 2026-08-02

## 1. Brand and operator

- Brand: **MINIMEE**
- Legal operator: **COZY KIDZ WORLD**
- Customer service email: **minimee.kidz@gmail.com**
- Service: a parent-managed child learning and childhood-memory product combining personalized AI learning videos, child AI videos, learning games, MEE collectible cards, friend memories, pet progression, QR sharing and lost-item functions.
- Primary language: Hong Kong Traditional Chinese / Cantonese; English may appear as secondary support text.
- Brand direction: warm, collectible, story-world experience with rich illustrated environments. Avoid generic SaaS styling and Lovable branding.

## 2. Non-negotiable account rules

- Children never have an independent login.
- A parent account is the only account entry point.
- One parent account may manage up to **3 children**.
- Each child requires an **independent subscription** and has independent entitlements, media, learning records and sharing permissions.
- Parent access must be scoped to children that the parent owns or is explicitly authorized to manage.
- Child photos, voice, identity, learning records and AI media are sensitive child data.

## 3. Official plans and prices

### 單次主題 — One-time · 單次試試的MiniMEE~

- Price: **HK$128**
- Price note: 單次付款｜永久保留
- Includes:
  - 揀 1 個主題
  - 1x學習影片＋1x小朋友AI影片＋學習小遊戲
  - 普通版MEE收藏卡PDF下載
- Default pace: monthly

### 月費（3個月預繳）— 訂閱3個月的MiniMEE~

- Price: **HK$324**
- Price note: 約HK$108／每月 · 隨時取消
- Monthly release: 每月派發2個主題（2星期1主題）
- Includes:
  - 每月2個主題
  - 每月2x學習影片＋2x小朋友AI影片＋學習小遊戲＋小寵物養成計劃
  - 朋友紀念冊【10位名額】｜永久保留
  - 普通版MEE收藏卡PDF下載
  - 可加購章節 **HK$46／1章**
  - 可開啟遺失模式
- Default pace: weekly
- Highlighted plan: yes

### 訂閱1年的精明MiniMEE~

- Price: **HK$1,188**
- Price note: 約HK$99／每月 · 隨時取消
- Monthly release: 每月派發2個主題（2星期1主題）
- Includes:
  - 每月2個主題
  - 每月2x學習影片＋2x小朋友AI影片＋學習小遊戲＋小寵物養成計劃
  - 朋友紀念冊【無限名額】｜永久保留
  - 炫彩版MEE收藏卡PDF下載
  - 可開啟遺失模式
  - 多語言配音（普通話＋粵語＋英語）
  - 可加購章節 **HK$46／1章**
- Default pace: weekly

Do not change prices or plan entitlements without Em's explicit approval.

## 4. AI production failure handling

When an AI video production job fails:

1. Automatically send a polite customer-facing response.
2. Deliver the notification through both:
   - in-site message; and
   - anonymous/service email.
3. Notify the operator for manual handling.
4. Preserve the job, inputs, consent record and error details for the operator.
5. Do not silently consume or remove the customer's entitlement.
6. Do not expose internal provider errors, API keys or technical logs to the customer.

## 5. Friends, QR and deletion rules

- There is no general “end friendship” workflow.
- A friend is added by scanning a QR code and receiving the required authorization.
- Before deleting a friend, ask whether it was accidental or the parent truly confirms deletion.
- Confirmed deletion immediately disconnects access to that child's information and videos.
- After deletion:
  - keep the friend's name and icon as a one-line historical record;
  - remove the friend from the active album;
  - do not consume an active friend album quota;
  - do not retain viewing access.
- To restore access, the user must scan the QR code again and the other parent must grant authorization again.

## 6. Notification channels

Customer and operational notifications use both:

- in-site notification; and
- anonymous/service email.

Email sender implementation must not expose a child's private information in subject lines or unsecured email content.

## 7. Architecture

Current source repository:

- GitHub: `minimeekidz/MINIMEE`
- Default/production branch: `main`
- Framework: React + TypeScript + Vite
- Backend target: Supabase
- Current temporary production host: Vercel
- Planned low-cost production host: **Cloudflare Workers** (static assets +
  a small Worker, not Cloudflare Pages — Cloudflare's current recommended
  path; see `wrangler.jsonc` and `worker/index.ts`)
- Production domain: `https://minimee.me`

Target responsibility split:

- GitHub: source code, version history, handoff documentation.
- Cloudflare Workers: static frontend build, CDN, TLS/HTTPS, custom domain.
  Deploys automatically on push to `main` via
  `.github/workflows/deploy.yml`, which needs these GitHub repository
  secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`,
  `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`. No DNS cutover has
  happened yet — do not point `minimee.me` at Cloudflare until a preview
  deploy passes the full section 9 checklist.
- Supabase: Auth, Postgres database, Storage, Edge Functions and RLS.
- External services: Stripe (payment), Resend (transactional/anonymous
  email), HeyGen HyperFrames + Higgsfield AI (AI video generation),
  Stripe/provider webhooks.

### 7a. Stripe billing (test mode wired, not yet live)

Schema: `billing_orders` → `subscriptions` → `theme_entitlements`, plus
`stripe_events` (webhook dedup) and `notifications` (parent-facing in-site +
anonymous-email). `finalize_verified_checkout` and
`finalize_subscription_renewal` are `SECURITY DEFINER` Postgres functions
that atomically verify a webhook-confirmed order/invoice, activate/extend
the subscription, mint theme entitlements, and record the notification —
callable only by `service_role`.

Edge Functions (`supabase/functions/`):

- `create-billing-order` — parent-facing, creates a `billing_orders` row and
  a Stripe Checkout Session (test mode Stripe Prices already created,
  lookup keys `minimee_one_time` / `minimee_quarterly` / `minimee_annual`).
- `stripe-webhook` — verifies the Stripe signature, then calls
  `finalize_verified_checkout` / `finalize_subscription_renewal` and
  relays the resulting notification through the email channel. A Stripe
  test-mode webhook endpoint already points at this function.

Required Supabase Edge Function secrets (`supabase secrets set …
--project-ref cjsfpsbtohwgqwgtcjef`): `STRIPE_SECRET_KEY`,
`STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY`, `SERVICE_EMAIL_FROM` (optional,
defaults to `MINIMEE <notifications@minimee.me>`). `SUPABASE_URL` /
`SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` are auto-provided by
Supabase.

Before switching to live Stripe keys: recreate the Products/Prices and the
webhook endpoint in live mode (test-mode objects do not carry over), update
the secrets above with live values, and re-run the full section 9/10
acceptance checklist. Do not do this until real families are actually
being onboarded.

### 7b. AI video workflow (Make.com orchestrates a storyboard step + HeyGen + Higgsfield)

Each released `theme_entitlements` row drives two jobs in `ai_video_jobs`:
`learning_video` (HeyGen HyperFrames) and `child_ai_video` (Higgsfield,
from the child's photo). Themes release progressively — sequence 1
immediately, then one every 14 days — computed in
`supabase/functions/_shared/release.ts`, matching the 每兩星期一個主題
cadence in section 3.

`child_ai_video` needs a photo of the child, the theme's VO (voice-over)
script template, and the parent's personalization answers before it can
render: `children.photo_url` (a private `child-photos` storage path,
never a public URL), `theme_entitlements.vo_template` and
`theme_entitlements.answers` (jsonb) hold those inputs. A
`video_storyboards` row (one per entitlement) tracks the intermediate
step — Make.com generates multi-angle character reference images and
scene images from those inputs *before* the Higgsfield render call, so the
render has consistent character art to work from instead of only the raw
photo.

Orchestration runs through Make.com rather than Supabase calling HeyGen/
Higgsfield directly:

1. `create-ai-video-jobs` (parent-triggered dispatch; idempotent per
   entitlement/video_type; only re-dispatches a job that previously
   failed) creates a signed URL for the child's photo (1h TTL), upserts a
   `queued` `video_storyboards` row, and POSTs
   `{ job_id, video_type, callback_url, input }` — `input` includes
   `photo_url` (the signed URL), `vo_template`, `answers`, and
   `storyboard_callback_url` — to the **"MINIMEE AI Video Workflow"** Make
   webhook (`https://hook.us2.make.com/2hltixdy85on9pbyr85ruywspk8cio79`,
   scenario ID `5826215`, team "My Team" under Emily's Make org, Free plan
   — 2 scenarios / 1000 ops per month).
2. The Make scenario branches on `video_type`:
   - `learning_video`: an HTTP module calls HeyGen HyperFrames
     (`https://api.heygen.com/v3/hyperframes/renders`).
   - `child_ai_video`: an HTTP module first calls an image-generation
     endpoint to produce the character/scene storyboard, then POSTs the
     result to `storyboard_callback_url` (**this is `storyboard-webhook`**,
     scoped to the entitlement, not a job), then calls Higgsfield
     (`https://platform.higgsfield.ai/<application_slug>`, no native
     Higgsfield app in Make as of this writing —
     `Authorization: Key <api_key>:<api_secret>`) with the entitlement
     input plus the generated `character_images`/`scene_images`.
   - Each of these three HTTP calls has an `onerror` branch that posts a
     `status: "failed"` payload back to the relevant callback
     (`callback_url` for HeyGen/Higgsfield dispatch failures,
     `storyboard_callback_url` for a storyboard generation failure) so the
     Supabase side is never left waiting silently.
3. When HeyGen/Higgsfield finishes, the scenario POSTs the result back to
   the `callback_url` it received (this **is** `ai-video-webhook`'s full
   URL with `job_id` already in the query string — just forward to it) with
   a body `parseProviderCallback` can read: a `status` field
   (`completed`/`failed`/one of the recognized synonyms), a `video_url`
   for the finished asset, and (for `child_ai_video`) a `storyboard` object
   with `character_images`/`scene_images` that gets copied onto
   `ai_video_jobs.storyboard_urls`.

`ai-video-webhook` marks the entitlement `consumed` only once both jobs for
it succeed, and never consumes the entitlement on failure.

Failure handling matches section 4: a failed job gets a polite
parent-facing message via `notifyParent`
(`supabase/functions/_shared/notify.ts`) — an in-site `notifications` row
plus the same anonymous-email delivery Stripe notifications use, looked up
through the entitlement's subscription → `billing_orders.notification_email`
— and an `admin_alerts` row for manual operator handling; the entitlement
stays usable so the parent can retry. A completed job also notifies the
parent (`ai_job_completed`) once both jobs for the entitlement succeed. A
storyboard failure (reported via `storyboard-webhook`) marks the
`video_storyboards` row `failed` and raises an `admin_alerts` row, but does
not by itself notify the parent — the Higgsfield dispatch still runs and,
if it also fails, that failure is what reaches the parent.

Required Supabase secret: `MAKE_AI_VIDEO_WEBHOOK_URL` (the webhook URL
above). Not set yet, so `create-ai-video-jobs` currently fails closed
(marks the job failed with an operator alert) rather than silently doing
nothing.

**Outstanding before this can run for real:**
- The Make scenario (`5826215`) exists and is schema-valid but still has
  placeholder values for every provider credential/endpoint/slug
  (`REPLACE_WITH_YOUR_*`: HeyGen API key + HyperFrames asset ID,
  Higgsfield API key/secret + application slug, and the image-generation
  endpoint/key for the storyboard step) and is **inactive** — plug in real
  values and call `scenarios_activate` before it can run.
- Add `MAKE_AI_VIDEO_WEBHOOK_URL` as a Supabase Edge Function secret.
- HeyGen/Higgsfield/image-gen API keys live inside the Make scenario's own
  HTTP module headers, not as Supabase secrets.
- `supabase/functions/_shared/providers.ts` (`parseProviderCallback`)
  parses common field-name guesses defensively — once the scenario's real
  outgoing payload shape is confirmed against a live run, either match the
  callback body to what's already parsed, or adjust the parser to match.

## 8. Build and routing

- Install command: `npm install`
- Build command: `npm run build`
- Output directory: `dist`
- SPA fallback is defined in `public/_redirects`.
- Never expose Supabase secret/service-role keys in Vite client variables.
- Only publishable/anon credentials may be present in browser-delivered code, protected by correct RLS policies.

## 9. Deployment safety

1. Never point `minimee.me` at a new host before testing its preview URL.
2. Keep the previous production deployment available until the new host passes acceptance tests.
3. Test desktop and mobile.
4. Test direct navigation and refresh on every important React route.
5. Test login, parent-only access, child isolation and Storage access.
6. Test pricing, legal pages, contact email and all primary CTA links.
7. Record every DNS change in this document.
8. Roll back by restoring the previous DNS target and previous known-good Git commit.

## 10. Supabase privacy gates

Before accepting real families:

- Enable RLS on every exposed table.
- Test `anon` and `authenticated` policies.
- Parent A must never read Parent B or Child B records.
- Child records are isolated per subscription.
- Admin access uses a server-side secret only.
- No permanent public URLs for child photos, voice or AI videos.
- Use signed, time-limited Storage URLs.
- Maintain consent and audit records.
- Database backup alone does not back up Storage objects; maintain a separate Storage backup process.

## 11. SEO baseline

Required public SEO files and metadata:

- `public/robots.txt`
- `public/sitemap.xml`
- canonical URL for `https://minimee.me/`
- Open Graph metadata
- MINIMEE favicon
- `zh-HK` language
- public pages indexable
- parent, child, admin, invite and token routes must be `noindex`
- meaningful image alt text
- compressed responsive images
- Organization, Product/Service and FAQ structured data before launch

## 12. Content editing map

Until a dedicated CMS is justified, keep frequently changed content centralized in code/data modules:

- plans and pricing
- FAQ
- legal documents
- homepage/service copy
- SEO configuration
- image/scene asset mapping

A future lightweight CMS should only manage these fields first. It must not expose child data or direct database administration.

## 13. Visual assets

The product includes these illustrated environments:

- 碼頭市集（家長）
- Hero Studio entrance/interior
- My Home／我的小屋
- 親子天地
- MEE Library
- Town — morning
- Town — night
- MEE Album House
- MEE Cinema
- Buddy／Paw Café

Preserve a coherent illustrated/pixel-story-world feeling across scenes, without unwanted logos or text overlays.

## 14. Current migration status

- Vercel production is working and remains the rollback host.
- Lovable DNS verification/delegation records were identified for removal after Lovable was no longer used for production.
- A MINIMEE favicon and explicit MINIMEE metadata were added to the GitHub repository.
- The deploy target changed from Cloudflare Pages to **Cloudflare Workers**
  (Cloudflare's current recommendation); `wrangler.jsonc` +
  `.github/workflows/deploy.yml` are in the repo but have never run — they
  need `CLOUDFLARE_API_TOKEN`/`CLOUDFLARE_ACCOUNT_ID` added as GitHub
  repository secrets before the first deploy fires.
- Next target: let the GitHub Action run once secrets are added, test the
  resulting `workers.dev` preview URL, then follow section 9 before any DNS
  change.
- Do not switch `minimee.me` DNS until the Cloudflare preview passes testing.
- Stripe billing backend (section 7a) and the AI video job backend
  (section 7b) are implemented against Supabase, deployed as Edge
  Functions, and now **wired into the parent-facing pages**.
  `CommercePages.tsx` reads the real subscription, theme entitlements and
  AI video jobs through RLS, starts Stripe Checkout through
  `create-billing-order`, dispatches video jobs through
  `create-ai-video-jobs`, and stops renewals through `cancel-subscription`.
  Stripe itself is still in **test mode**.

## 15. Go-live runbook

Everything below still needs Em's own credentials or account access — none
of it can be done from the repository. Work top to bottom; steps 1–3 are
independent, step 4 depends on 3, and step 5 depends on 4.

### 1. Supabase Edge Function secrets

```sh
supabase secrets set --project-ref cjsfpsbtohwgqwgtcjef \
  RESEND_API_KEY='<from resend.com dashboard>' \
  MAKE_AI_VIDEO_WEBHOOK_URL='https://hook.us2.make.com/2hltixdy85on9pbyr85ruywspk8cio79'
```

`RESEND_API_KEY` is what turns on the anonymous-email half of section 6 —
without it every notification stays in-app only and records
`email_status = 'failed'` plus an `admin_alerts` row. Also verify the
`minimee.me` sending domain in Resend, otherwise mail from
`notifications@minimee.me` will not deliver. `MAKE_AI_VIDEO_WEBHOOK_URL`
is what stops `create-ai-video-jobs` from failing closed.

### 2. Make.com scenario credentials

Scenario **`5826215`** ("MINIMEE AI Video Workflow") is built and
schema-valid but every provider value is still a `REPLACE_WITH_YOUR_*`
placeholder, and the scenario is **inactive**. Replace, then activate:

| Module | Placeholder | Where the real value comes from |
| --- | --- | --- |
| HeyGen HTTP | `REPLACE_WITH_YOUR_HEYGEN_API_KEY` | HeyGen dashboard → API key |
| HeyGen HTTP | `REPLACE_WITH_YOUR_HYPERFRAMES_ASSET_ID` | The HyperFrames template to render |
| Storyboard HTTP | `REPLACE_WITH_YOUR_IMAGE_GEN_ENDPOINT` / `_API_KEY` | Whichever image model generates the character/scene sheets |
| Higgsfield HTTP | `REPLACE_WITH_YOUR_HIGGSFIELD_API_KEY` / `_API_SECRET` | Higgsfield account → API credentials |
| Higgsfield HTTP | `REPLACE_WITH_YOUR_APPLICATION_SLUG` | The Higgsfield application to invoke |

These live in the Make scenario's own HTTP module headers, never as
Supabase secrets. After a first real run, confirm the callback body
matches what `parseProviderCallback` reads (section 7b step 3) and adjust
whichever side is wrong.

### 3. Stripe live mode

Test-mode objects do not carry over. In live mode, recreate the three
Products/Prices with the **same lookup keys** the Edge Function resolves —
`minimee_one_time`, `minimee_quarterly`, `minimee_annual` (and
`minimee_extra_chapter` for the HK$46 add-on) — at HK$128 / HK$324 /
HK$1,188, then create a live webhook endpoint pointing at
`https://cjsfpsbtohwgqwgtcjef.supabase.co/functions/v1/stripe-webhook`
subscribed to `checkout.session.completed`, `invoice.paid`,
`customer.subscription.updated` and `customer.subscription.deleted`.
Then update the secrets:

```sh
supabase secrets set --project-ref cjsfpsbtohwgqwgtcjef \
  STRIPE_SECRET_KEY='sk_live_…' \
  STRIPE_WEBHOOK_SECRET='whsec_…'
```

Do not do this until real families are actually being onboarded — and
re-run the section 9/10 checklist afterwards, because a live-mode
misconfiguration charges real cards.

### 4. First Cloudflare deploy

Add these as **GitHub repository secrets** (Settings → Secrets and
variables → Actions):

- `CLOUDFLARE_API_TOKEN` — a token with the *Edit Cloudflare Workers*
  template scoped to the MINIMEE account
- `CLOUDFLARE_ACCOUNT_ID`
- `VITE_SUPABASE_URL` — `https://cjsfpsbtohwgqwgtcjef.supabase.co`
- `VITE_SUPABASE_PUBLISHABLE_KEY` — the publishable/anon key only, never
  the service-role key

`.github/workflows/deploy.yml` then fires on the next push to `main` (or
via *Run workflow*) and publishes to `minimee.<subdomain>.workers.dev`.
`npx wrangler deploy --dry-run` already passes locally, so a failure here
is a credentials problem, not a config one.

### 5. DNS cutover

Only after the `workers.dev` preview passes the full section 9 checklist
on desktop and mobile. Keep Vercel live as the rollback target until the
Cloudflare deploy has been stable, add `minimee.me` as a custom domain on
the Worker, then move DNS. **Record the change in this document**, per
section 9 item 7.

### Verified before handover

- `npm run build` and all 24 tests pass; `wrangler deploy --dry-run`
  bundles the Worker and reads all 27 asset files.
- RLS is enabled on all 11 public tables, each has at least one policy,
  and `anon` holds no `SELECT`/`INSERT` anywhere.
- `child-photos` is a private bucket; the parent-scoped storage policy
  keys on the `{parent_id}/…` folder prefix, and the Edge Function serves
  photos to Make through 1-hour signed URLs.

### Rotate the leaked Cloudflare API token first

Commit `1306666` ("Modify Cloudflare API token and account ID", 2026-08-01)
pasted a **real Cloudflare API token, account ID and Supabase publishable
key directly into `.github/workflows/deploy.yml` in plaintext**, in place
of the `${{ secrets.* }}` references. The next commit reverted the file,
and the squash merge kept it out of `main`'s linear history — but the
commit object is still retrievable from the repository (GitHub keeps
`refs/pull/8/head`), so the token must be treated as compromised.

Before doing step 4 above: delete that token in the Cloudflare dashboard
(My Profile → API Tokens) and issue a **new** one. Do not reuse the leaked
value as `CLOUDFLARE_API_TOKEN`. The Supabase publishable key is designed
to be public and is safe in browser-delivered code, so it needs no
rotation; the account ID is not a credential on its own.

Never inline a secret into a workflow file — `${{ secrets.NAME }}` is the
only correct form, and a literal value there is also invalid expression
syntax, which is why that run failed before any job started.

### 7c. The kid card (v2) and its deliberate public read

`kid_cards`, `mee_cards` and `kid_tasks` back `/kid/:slug`. This is the only
part of the schema `anon` can read, because the product *is* a link that a
grandparent, a teacher, or whoever found a lost water bottle can open
without an account. Three deliberate choices make that safe, and none of
them should be undone without replacing them with something equivalent:

1. **Publishing is the gate.** A card starts `published = false` and is
   invisible to `anon`. The "card not found" page reads identically for an
   unpublished card and a nonexistent one, so slugs cannot be probed to
   confirm a card exists.
2. **`anon` holds a column-level grant, not a table-level one.** Even on a
   published row it cannot reach `parent_id`, `child_id`, `lost_mode_token`,
   `published_at` or `updated_at`. RLS filters rows; the column grant is
   what filters columns. Adding a sensitive column later means deciding
   explicitly whether to grant it — the default is that it stays private.
3. **Name and age group are denormalised onto the card.** Publishing never
   requires exposing `children`, so the real birth year, interests and
   private photo path stay parent-only.

**Two Supabase advisor warnings on this design are intentional. Do not
"fix" them by revoking EXECUTE:**

- `kid_card_for_lost_token(text)` is a `SECURITY DEFINER` function callable
  by `anon`. That is the point — a finder has no account. It is strictly
  safer than the alternative of granting `anon` SELECT on a token column:
  it takes a token and returns only slug, display name and the parent's
  message, never the token itself or any row it does not match. It also
  returns nothing the moment the parent switches lost mode off, so a token
  already printed on a sticker dies immediately rather than waiting for a
  cache to expire.
- `is_admin()` is callable by `authenticated`. It only reports whether the
  *caller* is an admin, so it discloses nothing about anyone else.

**Lost-mode tokens must stay long and cryptographically random.** The
function is the one anonymous surface in the product, so the only real
attack on it is guessing tokens. Anything sequential, short, or derived
from the child's name would make enumeration practical.

RLS was verified against the live database with six checks in a rolled-back
transaction: unpublished cards and their tokens invisible to `anon`,
published ones resolving, a wrong token returning nothing, and lost mode
switched off instantly killing a previously working token.

### 7d. MEE 世界 — a town you walk around

The world is **four full-screen maps joined by gates**, and the map is drawn
**much larger than the window with the camera following the child**. That
last part is the whole design. An earlier version fitted each zone into one
viewport, and Em's verdict was exact: 行兩步就撞埋撞吓，根本就冇體驗. Walking
only feels like walking if it covers ground.

```
蘑菇村 ←→ MEE 小鎮 ←→ 碼頭
             │
           嘉年華

小鎮：圖書館・戲院・Paw Café・Hero Studio・寵物房
碼頭：碼頭市集          嘉年華：劇院・遊樂場
蘑菇村：MEE 收藏館
```

The 嘉年華 zone is deliberately not called 遊樂場: 遊樂場 is one of the rooms
inside it, and a zone sharing a room's name reads as a loop on the signs.

Walking to a **gate** fades across to the next map; walking to a **door**
opens the room behind it, where the lesson video and its word game live.

Four things follow from how the art is built:

- **Buildings are painted into the background.** Nothing is composited on
  top of them — a door is a marker on the ground, not a picture of a door.
  An earlier version pasted framed building images over the art and looked
  like a collage.
- **Where you can walk is derived from the art**, not from a rectangle.
  `scripts/build-walkmask.mjs` classifies the pale warm stone of the paths
  out of each background and writes `src/lib/walkmask.ts` — one bit per
  cell on a 96-wide grid, a few hundred bytes a map. The child follows the
  real roads and cannot stand on a roof or in the sea, which is most of
  what sells a top-down world. **Rerun it after changing any background.**
- **Positions are normalised 0-1** over the map, so replacing the art at a
  different resolution changes nothing in code.
- **The zoom is keyed to how big the child is on screen**, anchored to the
  geometric mean of the window's width and height. Keying it to height
  alone made a phone — tall and narrow — show nothing but the paving slab
  underfoot.

**Movement is tap-to-walk first**, with a d-pad and arrow keys alongside.
Tapping is what a child reaches for on a phone. Tapping an unreachable spot
walks to the nearest reachable one rather than doing nothing, and a held key
cancels a tapped destination so the child never fights the game for control.

**Day and night** follow the child's own clock (06:00–18:00 is day). The
night maps are **graded from the day art** by `scripts/make-night.mjs`, not
separate pictures. The night art that shipped with the set is drawn from
street level while these maps are top-down, so using it would have moved the
ground under the child every evening and forced every door, path and mask to
exist twice and agree.

Tests assert the graph is sound: every gate points at a zone that exists,
every door at a room that has art, every room with art has a door leading to
it, every zone is reachable from another one, and **every hotspot stands on
a cell the walk mask actually allows**. That last one immediately caught a
real off-by-one — the placement pass rounded where `isWalkable` floors.

### 7d-i. How cards are earned

Two surfaces run the same `PixelWorldGame` component:

- **`/play`** is the public demo on the marketing site. Local state only, no
  account, nothing persists. It exists so a parent can understand "做任務儲
  MEE 卡" in thirty seconds without signing up.
- **`/parent/children/:id/play`** is the real town for one child. It lives
  behind the parent's session because children never have their own login
  (section 2) — the parent opens it and hands over the phone.

Walking into a pickup writes to `mee_cards` immediately. The award is an
upsert on the `(kid_card_id, code)` unique constraint with
`ignoreDuplicates`, so walking back over a pickup, a replayed overlap, or a
double-fire from the game loop can never mint a duplicate or overwrite the
rarity a card was first earned at. Previously earned codes are loaded on
mount and render as already taken.

**A collectible's number and NORMAL/FLASH status are fixed in the
`COLLECTIBLES` catalogue, never rolled at award time.** Section 5's rule is
that a card cannot be re-rolled; making rarity a property of the code rather
than of the awarding moment is what enforces it, and a test asserts it.

Creating a card seeds `STARTER_TASKS` so the child opens the town to
something to do rather than an empty list. A seeding failure does not block
card creation — the card is the deliverable.

### 7d-ii. 小寵物 — the town's neighbours and 好感度

Twelve pets live in the world. Which zone a pet lives in is derived from its
own id, not shuffled: the child should be able to learn where a friend lives
and go back for them, and a pet that moved every night would make its
friendship level feel like it belonged to nobody.

They **walk** — pick a spot within roaming distance, amble to it on the same
walk mask the child uses, pick another. An earlier version nudged them a few
pixels every half second and read as drift rather than life. Each carries a
**wish bubble** (`PET_WISHES`), which is pure decoration and the cheapest
thing on the screen that makes the town look inhabited.

They **stop and turn when the child comes close**. That reads the way an
animal behaves, and it is also the practical half: a small child cannot
reliably tap a target that never stops moving.

They are placed **relative to the zone's arrival point**, not at fixed map
coordinates. Spread evenly across the map they all landed most of a screen
above the entrance, so a child's first view was an empty street.

**好感度 (`src/lib/petFriends.ts`)** — eight levels, and three rules hold the
design up:

- **Friendship is per pet.** Making friends with the penguin says nothing
  about the hamster; twelve separate relationships is the point. The panel is
  **keyed by pet id** for this reason — unkeyed, React reused one component
  instance and its running total followed the child from animal to animal,
  which is invisible whenever two pets sit on the same stored score and so is
  true of every pair at the start.
- **One point at a time, once a day per action.** The child may keep chatting
  as much as they like and the replies keep changing — a friend does not stop
  talking to you because you have run out of points — but the number moves
  once. The cap is the unique index on
  `(kid_card_id, pet_id, action, day, seq)`, not UI state: left to the client
  the fastest route to best friends is tapping 打招呼 two hundred times.
- **Levels are evenly spaced** (`LEVEL_STEP`). An escalating curve was tried
  and removed: more actions unlock as the friendship grows, so a day already
  earns more at level 5 than at level 1, and stretching the steps on top of
  that turned the back half into a grind. A test asserts the spacing, and
  asserts that even a perfect day at max level is a fraction of one level.

Actions unlock in tiers: greetings at level 1, hugging and sharing feelings
in the middle, and at the top the pet gives the child a card — normal at 6,
flash at 8.

**The daily word question is the point of the whole system.** A pet asks
about a word from a lesson the child actually holds a fragment for, and the
prompt is **the word's sticker, not its text** — a five-year-old who cannot
yet read four Chinese words still has a real question to answer. It is worth
more than any other single action (a test asserts that ordering), so 好感度
tracks what the child has learnt rather than how often they tapped. A wrong
answer shows the right word and still pays: a child who loses everything for
one guess stops guessing.

`award_pet_points` records the interaction and adds the points in **one**
step. Split in two, a failure between them either burns the child's daily go
for nothing or pays them twice, and a child who has been counting notices.

**Pet-gifted cards are a separate table (`kid_pet_cards`) on purpose.**
Ordinary MEE cards cannot be re-earned — section 5's no-re-roll rule is
enforced by a unique constraint. Em's rule for pet gifts is the opposite: a
duplicate may be passed on to a friend, which is only possible if duplicates
can exist. Art lives in `src/assets/pet-cards/{normal,flash}/`.

### 7e. Rooms, lessons and fragments (the v2 learning loop)

Rooms are **permanent places with fixed identities** — the library is always
about reading words, the café always about everyday talk. A **theme** swaps
the video and word list inside a room; it never rearranges what the rooms
are for.

That split is the whole design, and two things follow from it:

- A child walks into any room in any order. Nothing is a prerequisite for
  anything else, so the free-roam town is not a course wearing a disguise.
- **One room can be updated without producing a whole set.** The business
  can open with three rooms filled and add the rest later. The rejected
  alternative — one theme spread across rooms, where room 1 is words and
  room 2 is sentences — would have required producing every room for every
  theme, and would have made the rooms ordered again by the back door.

`rooms` → `room_lessons` (one `current` per room, enforced by a partial
unique index) → `lesson_fragments`.

**Fragments:** finishing a room's word game earns one; `FRAGMENTS_PER_CARD`
(4) of them become a MEE card. Four reads as "visit four places" and is one
sitting's work. The unique constraint on `(kid_card_id, room_id, lesson_id)`
makes awarding idempotent, so replaying a lesson never mints a second
fragment — the child has to visit a different room, or wait for new content.

Cards come with the subscription. There is deliberately no per-card
purchase: a paid card draw is the thing parents most object to.

**One game type, not one per room.** A room's identity comes from its
subject and its art, not from a novel interaction the child has to relearn.
One game can be made good where five would each be mediocre.

**`room_lessons.video_path` is not readable by `anon`.** Note that a
column-level `REVOKE` does nothing while a table-level `GRANT` stands —
Postgres treats the table grant as covering every column — so the table
grant is revoked and the safe columns granted individually. Videos live in
the private `room-videos` bucket and are played through a signed URL minted
at play time, so ending a subscription actually takes the video away.

**Publishing new content: `/admin/lessons`** (admin only, in the admin nav as
「房間內容」). Pick a room, type a title, paste the word list one per line as
`詞語 | 讀音 | 意思`, optionally give the path of a file already uploaded to
the private `room-videos` bucket, and publish.

Publishing is **insert-then-flip `current`, never an edit in place.** The
previous lesson stays in the table, so a bad swap is undone by pressing
「設為現行」 on the old row rather than by retyping the content. The page
clears the old `current` first because the partial unique index allows only
one per room.

A lesson with no `video_path` is legitimate — the word game still works, so
rooms can open with content before the video is shot. Two words is the
minimum, since the game needs something to choose between.

### 7e-i. 貼紙包 Sticker packs

`src/assets/stickers/<interest|activity|job|mood>/`, read off the folder at
build time by `src/lib/stickers.ts`. **The filename is the label** —
`畫畫.webp` is the sticker for 畫畫.

That one decision is what makes the packs work without maintenance. A
sticker and the word it illustrates are matched **by name**, so there is no
lookup table for anyone to keep in step, no second step after uploading, and
no way to end up with a sticker nothing points at. Everything that shows a
word falls back to plain text when no sticker exists, so an incomplete pack
degrades instead of breaking.

Two places consume them: the self-introduction card (興趣 / 職業 chosen by
picture rather than typed) and the pets' daily question, where the sticker
*is* the question. **Every learning word wants a same-named sticker** — a
word without one can only be asked as text.

### 7g. Running as a full-screen web app

The world is meant to read as a game, not a page with a game on it.

- `public/manifest.webmanifest` with `display: standalone` and a
  `fullscreen` override, so an installed MINIMEE opens with no browser
  chrome at all. That is the only route to a chrome-free game on iPhone
  Safari, which has no Fullscreen API.
- `viewport-fit=cover` so the map reaches under a notch, and
  `user-scalable=no` — a child dragging to walk must never pinch-zoom the
  page out from under themselves.
- A full-screen toggle in the world's HUD (`src/lib/fullscreen.ts`) for the
  ordinary-tab case. It is **hidden** where the browser has no Fullscreen
  API rather than shown and doing nothing, and it only ever fires from the
  button press — the API rejects anything else.

### 7f. Art pipeline and the brand book

The brand book (`MINIMEE 品牌標準建立表`, sheet `02_視覺系統`) fixes the look:
**精緻復古像素藝術, 深色清晰外輪廓, 內部柔和陰影, 低像素**, and explicitly
bans **塑膠皮膚、平滑3D、角色比例漂移**.

That ban decided a real question. The twelve pets arrived twice — once as
3D plush renders, once as pixel art. **The pixel version is the one in
use**; the 3D one is exactly what the book forbids.

Provisional palette from the same sheet, all marked 待確認 there because
they were sampled from art rather than taken from an Approved master:
`--brand-blue #176B9C`, `--brand-pink #E987A5`, `--brand-gold #D9A441`,
`--brand-night #14213D`.

**Two extractors live in `scripts/`:**

- `extract-pets.mjs` — single-row magenta sheets. Keys the colour out, ramps
  alpha at the edges and pulls the magenta spill so the rim goes neutral
  rather than pink, splits on empty columns, pads each frame inside a square.
- `extract-grid.mjs` — 2D grids on any key colour. The pet sheet came on
  green, the hamster sheets on magenta.
- `extract-heroes.mjs` — white backgrounds. **A colour key is wrong here**:
  the heroes contain white in their boots, trim and eyes, so keying every
  white pixel punches holes through the art. It floods from the border
  instead, which only removes background actually connected to the edge.

All three pad the art inside its canvas. The first pet batch shipped with
**every head sliced flat** — the top three opaque rows identical in width —
and that is not recoverable, so nothing touches an edge by construction now.

**Frames are single front poses.** Movement animates with a bob and a
horizontal flip rather than per-direction art. When multi-angle sheets
arrive, `extract-grid.mjs` produces them and only the lookup in
`src/lib/characters.ts` changes.

Original PNGs are never committed — git keeps every version of a binary
forever, and the uploads ran 25-27 MB a batch against ~3 MB converted.

### Known open items

- Supabase advisor: **leaked-password protection is disabled**. Turn it on
  under Authentication → Policies; it costs nothing and blocks known
  breached passwords.
- Supabase advisor: `public.is_admin()` is a `SECURITY DEFINER` function
  executable by `authenticated`. It only reports whether the *caller* is an
  admin, so this is intended, but leave a note here if that ever changes.
- A leftover `swift-api` Edge Function from the Supabase starter is still
  deployed and unused — delete it to keep the surface small.
- `dist/assets/index-*.js` is ~514 kB (≈151 kB gzipped), over Vite's
  500 kB warning. Not a blocker; worth code-splitting the admin routes if
  first paint on mobile disappoints.

## 16. Restart instructions for any future assistant/developer

1. Read this entire file.
2. Inspect the latest `main` branch and deployment status.
3. Confirm the requested change does not conflict with Sections 2–6.
4. Never infer missing prices, privacy rules or child permissions.
5. Use preview deployments for design and functional changes.
6. Update this file whenever architecture, DNS, pricing or core product rules change.
