# MiniMee Agent Entry Rules

For every MiniMee task:

1. FIRST read `MINIMEE_FILE_ROUTER.md`.
2. Then follow the Router's cache-first rules. Do not automatically reread unchanged source files on every generation or revision.
3. Read `docs/minimee/governance/CONTEXT_CACHE_POLICY.md` when starting a new task/session or when cache validity is uncertain.
4. Then read `docs/minimee/governance/SKILL_v1.3.md` only when it is not already represented by a valid Project/Task Context Snapshot.
5. Use the Router to load every mandatory source-of-truth file for the requested change, but load only missing/stale sources when a valid snapshot exists.
6. For a new feature/event/item/theme, run `docs/minimee/governance/FEATURE_EVENT_GOVERNANCE.md` intake before implementation.
7. Ask only missing critical questions; do not silently invent game logic.
8. Do not implement from chat memory, screenshots, or prototype images when a canonical registry, scene manifest, UI registry, character Bible, learning/content source, or visual-direction source exists.
9. An idea is not an approved requirement until recorded as `APPROVED` in the Feature Registry.
10. Geometry, Object IDs, World Coordinates and Global UI Anchors are stable contracts and must not drift between agents.
11. For image-generation, scene-art, UI-art, entrance-art, or visual-restyle tasks, use the compact active Task Context Snapshot whenever valid. If bootstrap/rebuild is required, load the visual sources routed by `MINIMEE_FILE_ROUTER.md`.
12. Reference images are visual/style anchors only unless a canonical manifest explicitly marks them as geometry authority.
13. World objects use one canonical world/tile coordinate system across Mobile/iPad/Desktop. Screen-fixed UI uses normalized coordinates + anchors + safe areas.
14. A repeated render, retry, variation, or small same-task revision is NOT a reason to reread the full source pack.
15. Persist/refresh source hashes so a changed canonical file invalidates only the affected context.

Canonical brand: `MiniMee`.
