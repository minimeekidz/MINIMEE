# MiniMee AI Agent Handoff Checklist

Before touching MiniMee:
1. Read `/MINIMEE_FILE_ROUTER.md`.
2. Read `SKILL_v1.3.md`.
3. Read Feature Governance, Inventory Model, Adaptive Dock and Feature Registry Schema as routed.
4. For image/scene/UI art, read the complete `docs/minimee/art/` art-direction set.
5. Load the relevant scene manifest, global UI registry and APPROVED feature registry records.
6. Load canonical pet/character/content files for affected systems.
7. Do not implement from chat memory alone.

For new features:
- run the intake
- ask missing critical questions only
- create canonical feature_id
- classify placement/items/lifecycle
- define idempotency
- record APPROVED decision before production coding

For scene/image work:
- preserve canonical names
- preserve Geometry Master
- preserve Object IDs and world coordinates
- preserve routes/doors/portals
- preserve adaptive HUD safe areas
- update manifest only after approved geometry movement
