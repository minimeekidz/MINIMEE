# MINIMEE Web App

Mobile-first React + TypeScript frontend shell for:

- Public site and authentication routes
- Parent Portal
- 9:16 child Pixel World
- Admin / production route shells

## Run

```bash
npm install
npm run dev
```

## Validate

```bash
npm test
npm run build
```

## Stripe, Supabase and Make payment flow

The production payment path is:

1. The authenticated parent selects a child and plan.
2. `/api/create-checkout` verifies the Supabase access token and child
   ownership, then creates a server-priced Stripe Checkout Session.
3. Stripe posts to `/api/stripe-webhook`.
4. The function verifies the signature against the exact raw body, retrieves
   the Checkout Session from Stripe, and validates `paid`, `hkd`, metadata and
   the fixed plan amount.
5. `finalize_verified_checkout` atomically deduplicates the Stripe event,
   marks the order paid, creates the prepaid subscription, grants 1/6/24 theme
   entitlements, and creates the in-app notification.
6. Only notification ID, recipient email, title, body, event type and channels
   are sent to Make. Make must deduplicate on `notification_id`.

Apply every SQL file in `supabase/migrations` in timestamp order. Configure the
Cloudflare Production and Preview environments with:

- Text: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SITE_URL`
- Secret: `SUPABASE_SECRET_KEY`, `STRIPE_SECRET_KEY`,
  `STRIPE_WEBHOOK_SECRET`, `MAKE_WEBHOOK_URL`, `MAKE_SHARED_SECRET`

Never expose `SUPABASE_SECRET_KEY`, `STRIPE_SECRET_KEY`,
`STRIPE_WEBHOOK_SECRET`, or `MAKE_SHARED_SECRET` through a `VITE_` variable.

The Make custom webhook must require:

```text
Authorization: Bearer <MAKE_SHARED_SECRET>
```

It should reject duplicate `notification_id` values, then send the anonymous
email to `recipient_email`. The in-app notification is already inserted in
Supabase before Make is called.

## Integration status

Supabase parent authentication now supports build-time Vite variables and a
Cloudflare Pages runtime configuration fallback at `/api/supabase-config`.
Apply the migration in `supabase/migrations` before testing parent roles or
child records.

Parent authentication, roles, and child profile creation now use Supabase with
Row Level Security. A parent can read and create only their own child profiles,
and the database enforces the maximum of three children per parent.

The remaining non-payment product modules still use typed synthetic demo data.
See `.env.example` and `SECURITY.md` before connecting any additional external
service.

Do not accept live payment or real child media until RLS, private storage,
verified webhooks, consent, export, and 180-day retention tests pass.

Production deploys automatically from `main` to Cloudflare Pages.
