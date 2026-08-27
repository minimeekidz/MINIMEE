# MiniMee Feature & Event Governance

## Rule 0 — No feature ships without classification
Every new event, feature, collectible, item, reward, UI entry, scene interaction, quest mechanic, NPC/pet behaviour or parent function must complete intake before implementation.

## Required intake domains
### Feature identity
Name; permanent/temporary/seasonal/recurring; child/parent/both; new mechanic or reuse.

### World placement
Dock / More / World / Contextual Interaction / Interaction UI / Entrance; owner scene; new Zone/POI; geometry/collision/door/portal/NPC-anchor/shelter impact; permanent geometry or event layer.

### Item & inventory
Does it create items? Classify each as PERMANENT / QUEST / CONSUMABLE / CURRENCY / KEY_ITEM / COSMETIC. Define stackability, expiry, sharing/trading, consume trigger, post-consume state, double-grant/double-consume prevention, and whether it belongs in Backpack, Mee珍藏館 or neither.

### Progression
Effects on Mee cards, learning, pet affinity, friendship, profile/name card, parent controls or lost mode; reversibility; unfinished-event behaviour; post-event return behaviour; permanent record vs temporary reward.

### UI hierarchy
Dock frequency test; contextual world interaction; persistent HUD; badge; More; Parent PIN; Interaction UI; reusable component vs new component.

### NPC / Pet
Participants; Bubble/dialogue; spawn/schedule/affinity effects; `???` affinity/discovery gates; time/weather dependencies.

### Time / Weather / Festival
Hong Kong real date/time; HKO weather/warnings; Festival Light; Day/Night survival; Rain/Thunderstorm compatibility without geometry change.

### Safety / parental
Personal information; sharing/QR/lost/parent mode; parental approval; real-world safety; severe-weather safety tip.

### Technical state
canonical feature_id; source-of-truth table/state; mutation events; idempotency; network/API fallback; audit/analytics; migration/versioning.

## Release Gate — NOT READY if unresolved
- item classification
- owner scene
- Dock vs World vs Interaction UI
- consumable lifecycle
- expiry lifecycle
- duplicate grant/consume protection
- geometry impact
- parental/safety implication
- canonical ID
- persistence model

## AI behaviour
If critical information is missing, stop implementation and ask only the missing critical questions. Never silently invent classifications.
