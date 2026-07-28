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

## Integration handoff

The UI currently uses typed synthetic demo data. Replace the service methods in
`src/lib/service.ts` with Supabase / Edge Function calls while keeping the page
contracts unchanged. See `.env.example` and `SECURITY.md` before connecting any
external service.

Do not accept live payment or real child media until RLS, private storage,
verified webhooks, consent, export, and 180-day retention tests pass.
