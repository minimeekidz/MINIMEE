# MINIMEE Web App — Phase 1 Frontend

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

## Integration status

Supabase parent authentication now supports build-time Vite variables and a
Cloudflare Pages runtime configuration fallback at `/api/supabase-config`.
Apply the migration in `supabase/migrations` before testing parent roles or
child records.

Parent authentication, roles, and child profile creation now use Supabase with
Row Level Security. A parent can read and create only their own child profiles,
and the database enforces the maximum of three children per parent.

The remaining product modules still use typed synthetic demo data. Replace the
service methods in `src/lib/service.ts` with Supabase / Edge Function calls while
keeping the page contracts unchanged. See `.env.example` and `SECURITY.md`
before connecting any additional external service.

Do not accept live payment or real child media until RLS, private storage,
verified webhooks, consent, export, and 180-day retention tests pass.

Production deploys automatically from `main` to Cloudflare Pages.
