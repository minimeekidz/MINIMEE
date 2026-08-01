# MINIMEE — Project Operations & Continuity Handbook

> This file is the durable source of truth for MINIMEE. Read it before changing product rules, pricing, data access, deployment, DNS, Supabase, or production content.
>
> Last updated: 2026-07-29

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

### 7b. AI video workflow (Make.com orchestrates HeyGen + Higgsfield)

Each released `theme_entitlements` row drives two jobs in `ai_video_jobs`:
`learning_video` (HeyGen HyperFrames) and `child_ai_video` (Higgsfield,
from the child's photo). Themes release progressively — sequence 1
immediately, then one every 14 days — computed in
`supabase/functions/_shared/release.ts`, matching the 每兩星期一個主題
cadence in section 3.

Orchestration runs through Make.com rather than Supabase calling HeyGen/
Higgsfield directly:

1. `create-ai-video-jobs` (parent-triggered dispatch; idempotent per
   entitlement/video_type; only re-dispatches a job that previously
   failed) POSTs `{ job_id, video_type, callback_url, input }` to the
   **"MINIMEE AI Video Workflow"** Make webhook
   (`https://hook.us2.make.com/2hltixdy85on9pbyr85ruywspk8cio79`, team
   "My Team" under Emily's Make org, Free plan — 2 scenarios / 1000
   ops per month).
2. The Make scenario (not yet built) must branch on `video_type`: call
   Make's native **heygen** app (module "Create a Video from a Template"
   or "Create an Avatar Video") for `learning_video`; call Higgsfield via
   an HTTP module for `child_ai_video` (no native Higgsfield app in Make
   as of this writing — `Authorization: Key <api_key>:<api_secret>` against
   `https://platform.higgsfield.ai/<application_slug>`).
3. When each provider finishes, the scenario must POST the result back to
   the `callback_url` it received (this **is** `ai-video-webhook`'s full
   URL with `job_id` already in the query string — just forward to it) with
   a body `parseProviderCallback` can read: a `status` field
   (`completed`/`failed`/one of the recognized synonyms) and a `video_url`
   for the finished asset.

`ai-video-webhook` marks the entitlement `consumed` only once both jobs for
it succeed, and never consumes the entitlement on failure.

Failure handling matches section 4 exactly: a failed job gets a polite
parent-facing message, an in-site + anonymous-email `notifications` row,
and an `admin_alerts` row for manual operator handling; the entitlement
stays usable so the parent can retry.

Required Supabase secret: `MAKE_AI_VIDEO_WEBHOOK_URL` (the webhook URL
above). Not set yet, so `create-ai-video-jobs` currently fails closed
(marks the job failed with an operator alert) rather than silently doing
nothing.

**Outstanding before this can run for real:**
- Build the Make scenario described above (step 2/3) — only the webhook
  trigger exists today, nothing consumes it yet.
- Add `MAKE_AI_VIDEO_WEBHOOK_URL` as a Supabase Edge Function secret.
- HeyGen/Higgsfield API keys live inside the Make scenario's own
  connections, not as Supabase secrets.
- `supabase/functions/_shared/providers.ts` (`parseProviderCallback`)
  parses common field-name guesses defensively since the scenario's
  outgoing payload shape doesn't exist yet — once built, either match the
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
  (section 7b) are now implemented against Supabase and deployed as Edge
  Functions, in Stripe test mode. Neither is wired into the frontend yet —
  `CommercePages.tsx` still renders the demo state on purpose, consistent
  with children/themes still being `src/data/mock.ts`. `src/lib/service.ts`
  exposes `createBillingOrder`/`createAiVideoJobs` for whoever wires the
  real parent/child pages next.

## 15. Restart instructions for any future assistant/developer

1. Read this entire file.
2. Inspect the latest `main` branch and deployment status.
3. Confirm the requested change does not conflict with Sections 2–6.
4. Never infer missing prices, privacy rules or child permissions.
5. Use preview deployments for design and functional changes.
6. Update this file whenever architecture, DNS, pricing or core product rules change.
