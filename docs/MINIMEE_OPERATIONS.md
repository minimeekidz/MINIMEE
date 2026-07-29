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
- Planned low-cost production host: Cloudflare Pages
- Production domain: `https://minimee.me`

Target responsibility split:

- GitHub: source code, version history, handoff documentation.
- Cloudflare Pages: static frontend build, CDN, TLS/HTTPS, custom domain and deployment previews.
- Supabase: Auth, Postgres database, Storage, Edge Functions and RLS.
- External services: payment, transactional/anonymous email, AI video generation and automation webhooks.

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
- Next target: create and test a Cloudflare Pages preview.
- Do not switch `minimee.me` DNS until the Cloudflare preview passes testing.

## 15. Restart instructions for any future assistant/developer

1. Read this entire file.
2. Inspect the latest `main` branch and deployment status.
3. Confirm the requested change does not conflict with Sections 2–6.
4. Never infer missing prices, privacy rules or child permissions.
5. Use preview deployments for design and functional changes.
6. Update this file whenever architecture, DNS, pricing or core product rules change.
