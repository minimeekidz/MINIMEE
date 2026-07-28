# MINIMEE frontend security boundary

This repository contains a frontend shell and synthetic demo data only.

- Never commit child photos, recordings, videos, identifiers, consent records, or signed URLs.
- The browser may use a Supabase publishable key only.
- Supabase service-role keys, Stripe secrets, webhook secrets, and AI provider keys must remain in controlled server-side environments.
- Payment, entitlement, card rarity, card number, sharing, retention, and privileged admin actions must be decided by verified backend services.
- Child media must use private storage and short-lived signed access.

The current demo does not claim that authentication, payment, storage, AI generation, or data retention is connected.
