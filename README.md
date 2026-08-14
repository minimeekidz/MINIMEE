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

## Deploy

```bash
npm run deploy:dry-run   # validate wrangler.jsonc without deploying
npm run deploy           # build + wrangler deploy (needs `wrangler login` or CLOUDFLARE_API_TOKEN)
```

`.github/workflows/deploy.yml` runs the same thing on every push to `main`,
given `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`,
`VITE_SUPABASE_URL`, and `VITE_SUPABASE_PUBLISHABLE_KEY` as GitHub
repository secrets. See `docs/MINIMEE_OPERATIONS.md` section 7 before
pointing `minimee.me` at the result.

## Integration status

Supabase parent authentication now supports build-time Vite variables and a
Cloudflare Workers runtime configuration fallback at `/api/supabase-config`
(`worker/index.ts`). Apply the migrations in `supabase/migrations` before
testing parent roles or child records.

Stripe billing (`supabase/functions/create-billing-order`,
`stripe-webhook`) and the AI video job pipeline
(`supabase/functions/create-ai-video-jobs`, `ai-video-webhook`) are built
and deployed against Supabase in Stripe test mode — see
`docs/MINIMEE_OPERATIONS.md` sections 7a/7b for the secrets each needs and
what is still outstanding before either can run for real.

Parent authentication, roles, and child profile creation now use Supabase with
Row Level Security. A parent can read and create only their own child profiles,
and the database enforces the maximum of three children per parent.

The remaining product modules still use typed synthetic demo data. Replace the
service methods in `src/lib/service.ts` with Supabase / Edge Function calls while
keeping the page contracts unchanged. See `.env.example` and `SECURITY.md`
before connecting any additional external service.

Do not accept live payment or real child media until RLS, private storage,
verified webhooks, consent, export, and 180-day retention tests pass.

Vercel is still the live production host. `.github/workflows/deploy.yml` will
deploy `main` to Cloudflare Workers automatically once
`CLOUDFLARE_API_TOKEN`/`CLOUDFLARE_ACCOUNT_ID` are added as GitHub secrets —
until then it has never run. Do not point `minimee.me` at Cloudflare before
testing the resulting preview URL (see `docs/MINIMEE_OPERATIONS.md` section 9).

## 小寵物系統

改動小寵物、好感度、答題或事件之前，先讀 **[`docs/MINIMEE_PET_BIBLE.md`](docs/MINIMEE_PET_BIBLE.md)**。

規格嘅唯一權威係 `docs/source/MINIMEE_寵物設定與VO規格_v1.xlsx`；
`src/data/petBible.json` 由 `scripts/build_pet_bible.py` 生成，唔好手改。

素材上載：掉圖入 [`public/assets/uploads/`](public/assets/uploads/) 對應資料夾就得。
