---
name: minimee-game-governance
description: Canonical MiniMee skill for scene architecture, geometry locks, responsive coordinates, adaptive pixel-art UI, inventory/consumables, feature/event governance, Hong Kong time/weather integration and AI implementation gates.
---

# Mandatory reading order
1. MINIMEE_SCENE_SYSTEM_SPEC_v1.2.md
2. MINIMEE_SCENE_SYSTEM_v1.3_ADDENDUM.md
3. FEATURE_EVENT_GOVERNANCE.md
4. INVENTORY_CONSUMABLE_MODEL.md
5. ADAPTIVE_DOCK_INTERACTION_UI.md
6. FEATURE_REGISTRY_SCHEMA.md
7. scene manifest / global UI registry / feature registry

# Hard rules
- Brand: MiniMee
- Canonical maps: Mee主城鎮、河畔公園、港口市場、小屋區、Mee工作學習總部、Mee電影院、Buddy Cafe⨯Gether、Mee珍藏館
- Gameplay: 9:16 old-GTA-style high-angle top-down
- Day/Night/Weather never move Geometry Master
- World objects use world/tile coordinates + permanent Object IDs
- Global HUD uses normalized coordinates + anchors + safe areas
- Generic SaaS UI is prohibited; use MiniMee pixel-art skins / 9-slice components
- Dock is collapsible and portable-function only
- New features are NOT READY until governance intake is complete
- Items require canonical class + lifecycle + idempotent grant/consume rules
- Approved decisions must be recorded in feature_registry.yaml
- AI must ask missing critical questions instead of inventing them
