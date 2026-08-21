# MINIMEE Remaining 11 Pets Batch Status

Canonical spec: `MINIMEE_12_PETS_SPRITE_EMOTION_CANONICAL_SPEC_v2.0.md`  
Approved pilot: `MM_PET_05 海浪企鵝 pilot_v001`  
Batch version: `v001`  
Last update: `2026-08-20 07:23 UTC`

## Rules for every pet

- Four independently drawn directions: front, back, left_side, right_side.
- Two walk frames per direction.
- Production sheet 1084×552 with exact #FF00FF, 20px outer border and 20px gutter.
- Runtime frames 512×512 RGBA; binary alpha; bottom safe margin 20px.
- Two 4×3 emotion boards: Core 12 and Extended 12.
- Never mirror right_side where identity details are asymmetric.
- Do not duplicate a completed asset after a quota reset.

## Current status

| Pet | front | back | left | right | Board A | Board B | Runtime QA | Status |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|---|
| MM_PET_01 大太陽羊 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | COMPLETE |
| MM_PET_02 包子倉鼠 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | COMPLETE |
| MM_PET_03 牛奶貓 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | COMPLETE |
| MM_PET_04 西瓜柴犬 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | COMPLETE |
| MM_PET_06 飛行小雞 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | COMPLETE |
| MM_PET_07 毛線鼠婆婆 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | COMPLETE |
| MM_PET_08 愛心可愛兔 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | COMPLETE |
| MM_PET_09 牛仔小狗 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | COMPLETE |
| MM_PET_10 愛心超級豬 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | COMPLETE |
| MM_PET_11 旋轉刺蝟 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | COMPLETE |
| MM_PET_12 和服三花貓 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | COMPLETE |

MM_PET_05 海浪企鵝已在 approved pilot package 完成，不屬本 remaining-11 batch。

## Quota checkpoint

The previous `usage_limit_reached` pause reset successfully. Generation resumed without regenerating any completed asset. MM_PET_02, MM_PET_03, MM_PET_04, MM_PET_06, MM_PET_07, MM_PET_08 and MM_PET_09 are now complete and passed numeric plus visual QA.

## Completed raw source mapping

### MM_PET_01 大太陽羊

- front: `generated_images/exec-c0394757-7e83-4932-bb5d-abf261918fe8.png`
- back: `generated_images/exec-c6d73c6f-88fc-4c0f-8f2b-5b32c8abcd02.png`
- left_side: `generated_images/exec-887f411c-4c2a-4607-a4d6-718f5e9bfbf5.png`
- right_side: `generated_images/exec-07abae87-5d5e-4a64-ad18-c662ac55578f.png`
- Board A: `generated_images/exec-7c7b7743-0cd3-4351-9015-63242e91f52a.png`
- Board B: `generated_images/exec-784d8ba0-20f3-46fb-b180-fe5887a60ee2.png`

### MM_PET_02 包子倉鼠

- front: `generated_images/exec-24b42f0d-c06a-4188-a27f-fdd6efac00ab.png`
- back: `generated_images/exec-6dacde65-2bf6-43ce-8b42-264b46f40ba2.png`
- left_side: `generated_images/exec-6c4779dc-a4d3-4146-a014-b4f8547082e8.png`
- right_side: `generated_images/exec-d142f2ae-26ca-40a8-8fc0-dee6e50273bf.png`
- Board A: `generated_images/exec-44e62c65-d738-4cbe-a9a0-9bee8fd607db.png`
- Board B: `generated_images/exec-21fd8241-e646-4456-8e0f-7d4be7abc184.png`

QA at 2026-08-17 11:09 UTC:

- All four sheets are exactly 1084×552.
- All 20px outer borders and the 20px centre gutter are byte-exact `#FF00FF`.
- All eight runtime frames are 512×512 RGBA with binary alpha only (`0` or `255`).
- Every frame shares baseline y=492 and preserves a 20px bottom safe margin.
- Visual direction check passed: back has no face/front emblem; left noses point left; independently drawn right noses point right.
- Visual identity check passed: bao hood/knot, chestnut head patch, puffed cheeks, cream scarf, red poncho, round body and palette remain consistent.
- Core-12 and Extended-12 boards each contain the required 4×3 set with distinct readable expressions and no text/grid.

### MM_PET_03 牛奶貓

- front: `generated_images/exec-dc000490-8f7e-4c7e-a03e-25b075a8098f.png`
- back: `generated_images/exec-ebd227c2-ed5d-4066-a187-062c32b486d0.png`
- left_side: `generated_images/exec-eaf736bc-10a1-48e5-ada3-5a33b3812c68.png`
- right_side: `generated_images/exec-c28ae277-e174-408e-b56a-843148624df2.png`
- Board A: `generated_images/exec-d6aa6d9f-2618-416b-943f-8ba622c84cdf.png`
- Board B: `generated_images/exec-5fc3e3aa-3be9-4460-a6f4-94e3a701c784.png`

QA at 2026-08-17 12:05 UTC:

- All four sheets are exactly 1084×552 with byte-exact `#FF00FF` 20px borders/gutter.
- All eight runtime frames are 512×512 RGBA, binary-alpha only, baseline y=492 and 20px bottom safe margin.
- Direction check passed: back has no face/front wording; left profile points left; independently constructed right profile points right.
- Identity check passed: square carton silhouette, fixed folded ridge, ivory/milk-blue/cocoa palette, serious facial anchors, scarf/cape and side depth remain consistent.
- Front frames and both 4×3 boards preserve the exact `MILK` front graphic plus milk-carton icon; side views use icon-only panels, avoiding mirrored text.
- Core-12 and Extended-12 boards contain 12 distinct, readable, child-safe expressions with no captions/grid.

### MM_PET_04 西瓜柴犬

- front: `generated_images/exec-4c7e49ab-a343-4a4a-9521-d903e8cf1f7a.png`
- back: `generated_images/exec-39bdaa99-e65f-4a47-823c-866c42e900c6.png`
- left_side: `generated_images/exec-2041662e-ecac-4e86-8e49-83b72f300470.png`
- right_side: `generated_images/exec-0164b7b4-7ae5-4f04-9670-87bd8a70b8cb.png`
- Board A: `generated_images/exec-3bb46d75-954b-4a35-97be-83bccbd4d6a1.png`
- Board B: `generated_images/exec-408c871f-604c-41bd-9c40-32127f976b54.png`

QA at 2026-08-17 13:10 UTC:

- All four sheets are exactly 1084×552 with byte-exact `#FF00FF` 20px borders and centre gutter.
- All eight runtime frames are 512×512 RGBA with binary alpha only (`0` or `255`). Their opaque pixels end at y=491, so the shared baseline is y=492 and the final 20 rows remain transparent.
- Direction check passed: back has no face or front emblem; left profiles point left; independently generated right profiles point right with upper-left lighting retained.
- Identity check passed: orange-brown/cream Shiba markings, two white eyebrow dots in front views, grey-green scarf/cape, red-and-green watermelon outfit, central slice emblem and compact lively proportions are consistent.
- Every sprite and emotion pose preserves exactly one single-loop curled Shiba tail; no straight, missing or doubled tail was accepted.
- Core-12 and Extended-12 boards each contain the required 4×3 set with distinct child-safe expressions and no captions/grid.

### MM_PET_06 飛行小雞

- front: `generated_images/exec-d04a42db-77e9-4e1b-a9df-131c61ea806c.png`
- back: `generated_images/exec-2268681c-3048-41f2-86ab-b2b148c11431.png`
- left_side: `generated_images/exec-780f103d-749e-4bbe-bac7-8d5d14619e53.png`
- right_side: `generated_images/exec-788f84f3-2906-4270-8cbe-8aba4889599b.png`
- Board A: `generated_images/exec-ef7ef2b2-e735-466d-857b-c906cd21464c.png`
- Board B: `generated_images/exec-4bdd47fd-bdf5-4c47-aed4-364dc482b5b8.png`

QA at 2026-08-17 14:13 UTC:

- All four sheets are exactly 1084×552 with byte-exact `#FF00FF` 20px borders and centre gutter.
- All eight runtime frames are 512×512 RGBA with binary alpha only; opaque pixels end at y=491, establishing baseline y=492 with 20 transparent bottom rows.
- Direction check passed: back contains no face or chest propeller; true left profiles point left; independently generated true right profiles point right with consistent upper-left lighting.
- Identity check passed: compact pale chick proportions, exactly three crown feather tufts, brown aviator cap, bronze goggles with pale-blue lenses, aqua scarf/cape, beige suit and three-blade propeller emblem remain consistent.
- Walk motion remains grounded and child-friendly; no accepted frame changes into a flying pose or loses an outfit component.
- Core-12 and Extended-12 boards each contain the required 4×3 set with distinct readable expressions, no captions/grid and consistent character landmarks.
- File-integrity verification passed for all 18 PNG deliverables after deterministic repair of one interrupted sheet write.

### MM_PET_07 毛線鼠婆婆

- front: `generated_images/exec-6003518c-91f4-4f13-956e-3205a910eb4d.png`
- back: `generated_images/exec-dea251b5-5c32-48b2-8f25-30428569e630.png`
- left_side: `generated_images/exec-d2942642-da63-424e-ae0e-8d4a164f962a.png`
- right_side: `generated_images/exec-96c82cf7-e3ff-4464-8336-605e43be09fc.png`
- Board A: `generated_images/exec-840400b0-9e5d-428f-b4d9-739501e3024c.png`
- Board B: `generated_images/exec-5b00fd31-8ae3-4c23-9569-59d2a0be748a.png`

QA at 2026-08-17 15:05 UTC:

- All four sheets are exactly 1084×552 with byte-exact `#FF00FF` 20px borders and centre gutter.
- All eight runtime frames are 512×512 RGBA with binary alpha only; opaque pixels end at y=491, establishing baseline y=492 with 20 transparent bottom rows.
- Direction check passed: back contains no face or yarn emblem; true left profiles point left; independently generated true right profiles point right with stable upper-left lighting.
- Identity check passed: warm-grey elderly mouse, round wire spectacles, parted crown fur/age lines, lavender shawl with lace trim, deep-purple cape and centred purple yarn-ball emblem remain consistent.
- Exactly one thin pink mouse tail is preserved in every walk frame; no thick, missing or doubled tail was accepted.
- Core-12 and Extended-12 boards each contain the required 4×3 child-safe expression set with clear spectacles, consistent emblem and no captions/grid.
- File-integrity verification passed for all 18 PNG deliverables.

### MM_PET_08 愛心可愛兔

- front: `generated_images/exec-8a5a12e0-a911-4c4e-abf0-ad3acb9da4d0.png`
- back: `generated_images/exec-e835cfb0-e3b0-4ce7-a4af-bad8b549e7c2.png`
- left_side: `generated_images/exec-a2315164-2536-48ec-afb0-b7dc1bb61a64.png`
- right_side: `generated_images/exec-e5e51827-d81e-439b-ae42-defad2049fd6.png`
- Board A: `generated_images/exec-621c4288-93c0-4d54-99b9-8b35c49f8213.png`
- Board B: `generated_images/exec-4600572b-d33f-4631-b550-1df8214b304b.png`

QA at 2026-08-17 16:15 UTC:

- All four sheets are exactly 1084×552 with byte-exact `#FF00FF` 20px borders and centre gutter.
- All eight runtime frames are 512×512 RGBA with binary alpha only; opaque pixels end at y=491, establishing baseline y=492 with 20 transparent bottom rows.
- Direction check passed: back contains no face/front heart; true left profiles point left; independently generated right profiles point right with upper-left lighting retained.
- Identity check passed: pure-white rabbit fur, long upright pink-inner ears, fixed berry-pink ear bow, cherry/blossom-pink cape, scalloped layered dress, large heart emblem and white pom tail remain consistent.
- Walk frames remain grounded at identical scale and clearly distinguish contact from one-foot-forward motion; no floppy ears, duplicated bow or identity drift was accepted.
- Core-12 and Extended-12 boards each contain the required 4×3 child-safe expression set with distinct readable poses and no captions/grid.
- File-integrity verification passed for all 18 PNG deliverables after deterministic repair of one interrupted raw-sheet write.

### MM_PET_09 牛仔小狗

- front: `generated_images/exec-299dce34-8a28-4e9f-8a4a-73494b30172a.png`
- back: `generated_images/exec-4a7ac61e-48d5-43b0-8196-9155753c7409.png`
- left_side: `generated_images/exec-b51fa8da-0807-41c3-a844-d5e81d81cbdc.png`
- right_side: `generated_images/exec-8bd29218-9b59-4e38-b8d5-96b78d900ec8.png`
- Board A: `generated_images/exec-b78b9c82-c0e1-4e39-b9f2-c1088547d8cb.png`
- Board B: `generated_images/exec-c7ccef37-5d46-477e-ad5b-de73934b78b7.png`

QA at 2026-08-20 05:03 UTC:

- All four production sheets are exactly 1084×552 with byte-exact `#FF00FF` 20px outer borders and centre gutter.
- All eight runtime frames are 512×512 RGBA with binary alpha only; every opaque silhouette ends at y=491, establishing baseline y=492 and preserving 20 transparent bottom rows.
- Direction check passed: rear views contain no face, chest badge or hat-front star; true left profiles point left; independently generated right profiles point right with upper-left lighting retained.
- Identity check passed: compact caramel puppy proportions, cowboy hat and gold hat star, red neckerchief, dark-brown cape, cream muzzle/belly, gold sheriff badge and single tail remain consistent.
- Walk frames have distinct grounded contact and one-foot-forward motion without crop, scale drift or costume loss.
- Core-12 and Extended-12 boards each contain exactly 12 distinct child-safe poses in a clean 4×3 arrangement with no captions or grid; all locked costume landmarks remain readable.
- File-integrity verification passed for all 18 PNG deliverables.

### MM_PET_10 愛心超級豬

- front: `generated_images/exec-9ee5668e-10be-4f97-8003-1d18cd3e2a4d.png`
- back: `generated_images/exec-52c61f2c-309b-457f-be36-0f28bf5f19b7.png`
- left_side: `generated_images/exec-2527569d-dc46-4035-9e1d-e528bf6fbf87.png`
- right_side: `generated_images/exec-fd11ac6b-ef1b-49b0-898f-395acdd38763.png`
- Board A: `generated_images/exec-a2ca04d7-b4fd-47a9-a45f-722c35b33803.png`
- Board B: `generated_images/exec-bd6328cb-ecc3-44ae-805b-fa9c2ba188f5.png`

QA at 2026-08-20 06:02 UTC:

- Four sheets are exactly 1084×552 with byte-exact `#FF00FF` 20px borders/gutter; eight runtime frames are 512×512 RGBA, binary-alpha, baseline y=492 and 20px bottom safe margin.
- Back has no face or chest shield; left and independently drawn right profiles point correctly with non-mirrored lighting.
- Peach-pink round pig proportions, folded ears, surprised face, red cape/clasp, gold-rimmed heart shield and single curled tail remain consistent.
- Both 4×3 boards contain exactly 12 distinct child-safe poses with no captions/grid. The rejected black-background back attempt was not included.

### MM_PET_11 旋轉刺蝟

- front: `generated_images/exec-3fa6cf4e-eefa-499a-9b9a-53401379dd4c.png`
- back: `generated_images/exec-dea1e0ac-8dc4-45ec-a21e-2f3bff2e6600.png`
- left_side: `generated_images/exec-f2cb0f9e-81cf-487d-affc-5d633f0a83f1.png`
- right_side: `generated_images/exec-03cf4859-487c-4a39-b811-6a4f91964435.png`
- Board A: `generated_images/exec-ea977f74-ac71-44e4-bf4c-5f380026d95c.png`
- Board B: `generated_images/exec-b8eac403-b96d-4db8-8883-3fe89c91cca6.png`

QA at 2026-08-20 07:10 UTC:

- Four production sheets are exactly 1084×552 with byte-exact `#FF00FF` 20px outer borders and centre gutter.
- All eight runtime frames are 512×512 RGBA with binary alpha only; every opaque silhouette ends at y=491, establishing baseline y=492 and preserving 20 transparent bottom rows.
- Direction check passed: back views contain no face or spinning-top chest armor; true left profiles point left; independently generated right profiles point right with upper-left lighting retained.
- Identity check passed: compact round hedgehog proportions, semicircular chestnut spines, cream heart-shaped face, red tied cape, and the red/blue/gold spinning-top chest armor remain consistent.
- Walk frames preserve grounded contact and one-foot-forward motion without rolling, crop, scale drift, costume loss or extra limbs.
- Core-12 and Extended-12 boards each contain exactly 12 distinct child-safe poses in a clean 4×3 arrangement with no captions or grid; locked identity landmarks remain readable.
- File-integrity and numeric QA passed for all 18 PNG deliverables.

### MM_PET_12 和服三花貓

- front: `generated_images/exec-40071bcf-7543-479a-8f25-89bea87a08c2.png`
- back: `generated_images/exec-ca526d52-3e2f-44da-ae8d-b884dc0a2e55.png`
- left_side: `generated_images/exec-76c700a4-d6ae-4cce-b22d-0e43d2b922a4.png`
- right_side: `generated_images/exec-dc6c6f3f-d848-46c3-bb27-2580e99484e4.png`
- Board A: `generated_images/exec-09093ecf-f4ce-463e-8c76-25321e973db3.png`
- Board B: `generated_images/exec-38d4d503-64fb-4522-b900-e43d4e453ce9.png`

QA at 2026-08-20 07:23 UTC:

- Four production sheets are exactly 1084×552 with byte-exact `#FF00FF` 20px outer borders and centre gutter.
- All eight runtime frames are 512×512 RGBA with binary alpha only; every opaque silhouette ends at y=491, establishing baseline y=492 and preserving 20 transparent bottom rows.
- Direction check passed: back views contain no face or front-held fan; true left profiles point left; independently generated right profiles point right with upper-left lighting retained.
- Identity check passed: fixed calico/taupe facial markings, cream face, pink blossom ornament, blue floral kimono, purple obi and shawl, gold folding fan and single calico tail remain consistent.
- Walk frames preserve compact dignified proportions and grounded contact/one-foot-forward motion without crop, scale drift, accessory loss or extra limbs.
- Core-12 and Extended-12 boards each contain exactly 12 distinct child-safe poses in a clean 4×3 arrangement with no captions or grid; all locked identity landmarks remain readable.
- File-integrity and numeric QA passed for all 18 PNG deliverables.

## Next exact action

All remaining 11 pets are complete. Package the final batch with the approved MM_PET_05 pilot and canonical v2.0 specification; verify archive integrity, then disable the recurring automation.
