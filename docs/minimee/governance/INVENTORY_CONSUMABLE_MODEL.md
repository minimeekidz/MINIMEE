# MiniMee Inventory & Consumable Model

## Canonical item classes
- PERMANENT — long-term ownership; never consumed
- QUEST — temporary progression item; usually auto-consumed/archived
- CONSUMABLE — explicitly decremented by use
- CURRENCY — numeric balance
- KEY_ITEM — unlock/state token; usually not manually consumed
- COSMETIC — persistent visual unlock

## States
ACTIVE / CONSUMED / EXPIRED / ARCHIVED

## Hard rules
1. Never hard-delete consumed history.
2. Every grant and consume creates a transaction record.
3. Every item has a canonical `item_id`.
4. Every mutation is idempotent.
5. QUEST items may auto-consume/convert when completion conditions are met.
6. Backpack shows only currently relevant portable ACTIVE items.
7. Permanent collections belong in Mee珍藏館.
8. Every new event must declare item lifecycle before implementation.

## Example
```yaml
inventory_entry:
  item_id: item.topic_forest.fragment_01
  quantity: 1
  state: ACTIVE
  source: quest.topic_forest.step_01
  acquired_at: 2026-08-27T00:00:00Z
  consumed_at: null
  consumed_for: null
```

## Four-fragment completion
A/B/C/D granted → completion rule sees 4/4 → write idempotent completion transaction → fragments become CONSUMED/ARCHIVED → Mee card unlock created → retries cannot duplicate reward.
