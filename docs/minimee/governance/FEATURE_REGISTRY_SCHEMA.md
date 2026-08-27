# MiniMee Feature Registry Schema

Ideas are not formal requirements until `status: APPROVED`.

## Status lifecycle
IDEA -> DRAFT -> REVIEW -> APPROVED -> IMPLEMENTED -> RETIRED

## Required structure
```yaml
feature_id: unique.canonical.id
name: Human-readable name
status: APPROVED
lifecycle:
  type: permanent|seasonal|temporary|recurring
  start: null
  end: null
entry:
  type: dock|more|world_interaction|interaction_ui|hud|entrance
  owner_scene: null
  dock_entry: false
geometry:
  changes_geometry: false
  event_layer_only: false
items: []
progression:
  affects_mee_card: false
  affects_learning: false
  affects_pet_affinity: false
  affects_friendship: false
ui:
  interaction_ui: false
  persistent_hud: false
  notification_badge: false
  parent_gate: false
world:
  time_sensitive: false
  weather_sensitive: false
  festival_light: false
technical:
  source_of_truth: null
  idempotency_key: null
  fallback: null
  migration_required: false
```
