# MiniMee Agent Entry Rules

For every MiniMee task:

1. FIRST read `MINIMEE_FILE_ROUTER.md`.
2. Then read `docs/minimee/governance/SKILL_v1.3.md`.
3. Use the Router to load every mandatory source-of-truth file for the requested change.
4. For a new feature/event/item/theme, run `docs/minimee/governance/FEATURE_EVENT_GOVERNANCE.md` intake before implementation.
5. Ask only missing critical questions; do not silently invent game logic.
6. Do not implement from chat memory, screenshots, or prototype images when a canonical registry, scene manifest, UI registry, character Bible, learning/content source, or visual-direction source exists.
7. An idea is not an approved requirement until recorded as `APPROVED` in the Feature Registry.
8. Geometry, Object IDs, World Coordinates and Global UI Anchors are stable contracts and must not drift between agents.
9. For any image-generation, scene-art, UI-art, entrance-art, or visual-restyle task, also read:
   - `docs/minimee/art/MINIMEE_VISUAL_DIRECTION_BIBLE.md`
   - `docs/minimee/art/MINIMEE_GAMEPLAY_ART_LOCK.md`
   - `docs/minimee/art/MINIMEE_SCENE_PROMPT_LOCK.md`
   - `docs/minimee/art/MINIMEE_STYLE_REFERENCE_INDEX.md`
   - `docs/minimee/art/MINIMEE_REFERENCE_SELECTION_POLICY.md`
10. Reference images are visual/style anchors only unless a canonical manifest explicitly marks them as geometry authority.
11. World objects use one canonical world/tile coordinate system across Mobile/iPad/Desktop. Screen-fixed UI uses normalized coordinates + anchors + safe areas.

Canonical brand: `MiniMee`.
