# MINIMEE frontend security boundary

This repository contains a connected Supabase parent account and family-profile
foundation. Payment, child media, AI generation, friendship, entitlement and
notification modules still use synthetic demo states.

- Never commit child photos, recordings, videos, identifiers, consent records, or signed URLs.
- The browser may use a Supabase publishable key only.
- Supabase service-role keys, Stripe secrets, webhook secrets, and AI provider keys must remain in controlled server-side environments.
- Payment, entitlement, card rarity, card number, sharing, retention, and privileged admin actions must be decided by verified backend services.
- Child media must use private storage and short-lived signed access.

Authentication, parent/admin roles, and the `children` table are connected.
Child rows are protected by Supabase Row Level Security, and a database trigger
enforces no more than three children per parent. Payment, media storage, AI
generation, consent history, friendship and notification delivery are not yet
connected.
