# MiniMee Feature & Event Governance v1.0

## Rule 0 — No feature ships without classification
Every new event, feature, collectible, item, reward, UI entry, scene interaction, quest mechanic, NPC/pet behaviour or parent function must complete the intake below before implementation.

## A. Feature identity
1. Name?
2. Permanent / temporary / seasonal / recurring?
3. Child-facing / parent-facing / both?
4. New mechanic or reuse existing mechanics?

## B. World placement
5. Access via Dock / More / World / Contextual Interaction / Interaction UI / Entrance?
6. If world-owned, which canonical scene owns it?
7. New Zone/POI required?
8. Any new Geometry, collision, entrance, portal, NPC anchor or shelter?
9. If geometry changes, permanent or event-layer only?

## C. Item & inventory
10. Does it create items?
11. Classify each: PERMANENT / QUEST / CONSUMABLE / CURRENCY / KEY_ITEM / COSMETIC.
12. Stackable?
13. Expiry?
14. Tradable/shareable?
15. Consumable?
16. Exact consume trigger?
17. After consume: CONSUMED / ARCHIVED / CONVERTED / PROGRESS?
18. Double-grant protection?
19. Double-consume protection?
20. Backpack / Mee珍藏館 / neither?

## D. Progression
21. Affects MEE card / learning / pet affinity / friendship / profile / parent controls / lost mode?
22. Reversible?
23. Event ends before completion: what happens?
24. Player returns after event ends: what happens?
25. Permanent record or temporary reward?

## E. UI hierarchy
26. Frequent enough for Dock?
27. Better as world contextual interaction?
28. Persistent HUD needed?
29. Notification badge?
30. More menu?
31. Parent PIN?
32. Dedicated Interaction UI?
33. Reusable MiniMee UI component or new component?

## F. NPC / Pet
34. Which NPC/pet participates?
35. Dialogue bubbles?
36. Spawn/schedule/affinity changes?
37. Any `???` information gated by affinity/discovery?
38. Time/weather dependencies?

## G. Time / Weather / Festival
39. Real Hong Kong date/time?
40. HKO weather/warnings?
41. Festival Light layer?
42. Must survive day/night?
43. Must survive rain/thunderstorm without geometry change?

## H. Safety / parental
44. Personal information involved?
45. Sharing/QR/lost mode/parent mode involved?
46. Parental approval?
47. Real-world safety issue?
48. Severe-weather contextual safety tip needed?

## I. Technical state
49. canonical feature_id?
50. source-of-truth state/table?
51. mutation events?
52. idempotency rule?
53. network/API failure fallback?
54. audit/analytics events?
55. migration/versioning required?

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
