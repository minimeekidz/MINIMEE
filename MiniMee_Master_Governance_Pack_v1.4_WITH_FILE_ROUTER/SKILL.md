---
name: minimee-scene-system
description: MiniMee 遊戲的正式場景、座標、UI、日夜、香港真實天氣與圖像生成規範。任何 AI agent 在設計或修改 MiniMee Gameplay Map、Entrance Scene、Interaction UI、HUD、NPC、互動物件或 Day/Night/Weather variant 時必須使用。
---

# MiniMee Scene System Skill

## Mandatory source of truth
開始任何 MiniMee 工作前，先讀同目錄：
`MINIMEE_SCENE_SYSTEM_SPEC_v1.2.md`

如有 `scene.manifest.yaml`，其 Geometry、Object ID、World Coordinate 優先級高於圖片推斷。

## Brand lock
品牌只可寫：`MiniMee`

## Canonical gameplay map names
1. Mee主城鎮
2. 河畔公園
3. 港口市場
4. 小屋區
5. Mee工作學習總部
6. Mee電影院
7. Buddy Cafe⨯Gether
8. Mee珍藏館

不得自行更名。

## Gameplay camera lock
所有可行走 Gameplay Map：
- 9:16 primary
- old-GTA-style high-angle top-down
- indoor/outdoor same projection
- same sprite set must remain usable

## Geometry lock
Day / Night / Rain / Thunderstorm / Festival Light：
- 建築不可搬
- 門不可搬
- 路不可搬
- 橋／樓梯不可搬
- interactable 不可搬
- NPC anchor 不可搬
- collision 不可漂移

Weather State 不得修改 Geometry Master。

## Coordinate rule
### World objects
不可用 screen pixel 作 canonical coordinate。
必須使用 world/tile coordinate + permanent Object ID。

### Global HUD
必須使用 normalized screen coordinate + anchor + safe-area constraint。

### Panel controls
使用 local component coordinates。

## Scene deliverables
每完成一張 Gameplay Map，必須同時輸出：
- Main Walk Route
- Secondary Route
- entrances
- exits
- doors
- portals
- interactables
- NPC anchors
- shelter zones
- camera bounds
- Scene Manifest

沒有 Scene Manifest 的 gameplay image 不算完成。

## Global UI rule
如某 UI 被定義為 Global：
- 所有正常 Gameplay Map 使用同一 component
- 同一 anchor slot
- 同一 pixel-art skin
- 同一 footer / HUD safe area

禁止每個場景各畫一套位置不同的 footer。

## Pixel UI implementation
禁止用普通 SaaS/Web button 視覺代替 MiniMee UI。

使用：
- pixel-art sprite
- 9-slice frame
- reusable engine component
- normal / pressed / disabled / selected / notification states
- nearest-neighbour / pixel-preserving scale

程式控制 layout；美術 sprite 控制外觀。

## Weather
香港全域同步。
主要 state：
CLEAR / CLOUDY / RAIN / THUNDERSTORM
另加 FESTIVAL_LIGHT layer。

普通天氣不能過密切換。
Severe warning 可優先更新。

雨天：
- 玩家戶外且不在 shelter -> umbrella
- walking NPC 同上
- stationary outdoor NPC 應配 canopy / shelter

## Entrance Scene
- 不行走
- 不需要 collision
- 9:16 mobile-first
- Day + Night 即可
- loading bar + small loop animation 可用
- 不需要完整 weather variants

## Generation checklist
生成前：
1. 讀 spec
2. 確認 scene canonical name
3. 讀 manifest
4. 確認 output 是 Gameplay / Entrance / UI 哪一類
5. 確認 safe area
6. 確認 route / door / entrance
7. 確認 geometry lock

生成後：
1. 檢查建築有否漂移
2. 檢查路有否被遮
3. 檢查門／出口仍存在
4. 檢查 HUD/footer safe area
5. 檢查 interactable Object ID 與座標
6. 更新 manifest
