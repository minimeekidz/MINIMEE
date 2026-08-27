# MiniMee AI Agent Handoff Checklist

Before touching MiniMee:
1. Read MINIMEE_SCENE_SYSTEM_SPEC_v1.2.md
2. Read MINIMEE_SCENE_SYSTEM_v1.3_ADDENDUM.md
3. Read FEATURE_EVENT_GOVERNANCE.md
4. Read INVENTORY_CONSUMABLE_MODEL.md
5. Read ADAPTIVE_DOCK_INTERACTION_UI.md
6. Read FEATURE_REGISTRY_SCHEMA.md
7. Load relevant scene.manifest.yaml
8. Load global_ui.registry.yaml
9. Check feature_registry.yaml for APPROVED status

Do not implement from chat memory alone.

For new features:
- run the intake
- ask missing critical questions
- create canonical feature_id
- classify placement
- classify items
- define lifecycle
- define idempotency
- record APPROVED decision before coding

For scene/image work:
- preserve canonical names
- preserve Geometry Master
- preserve Object IDs
- preserve routes/doors/portals
- preserve HUD safe areas
- update manifest after approved movement
