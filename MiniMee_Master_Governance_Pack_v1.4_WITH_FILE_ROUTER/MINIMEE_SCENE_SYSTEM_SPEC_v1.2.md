# MiniMee 場景、座標、UI 與真實世界系統規範 v1.2

> **Status:** CANONICAL / TEAM USE  
> **Project:** MiniMee  
> **Primary platforms:** Mobile / iPad first, Desktop compatible  
> **Gameplay camera:** fixed old-GTA-style high-angle top-down  
> **Gameplay orientation:** 9:16 primary  
> **Entrance / Loading:** 9:16 primary; 16:9 optional desktop/promo extension  
> **Brand spelling:** `MiniMee`

## 0. 本文件的效力

本文件為 MiniMee 遊戲場景、座標、UI、日夜、天氣、入口畫面及互動物件的**唯一正式基準**。

任何 AI agent、設計師、工程師或外判人員開始製作前，必須先讀本文件。

若後續需求與本文件衝突：
1. 不得自行猜測；
2. 先記錄差異；
3. 經專案負責人確認後才更新版本；
4. 已鎖定的 Geometry / Object ID / canonical naming 不得私自修改。

# 1. 品牌與正式場景名稱

## 1.1 品牌
全專案品牌名稱統一：**MiniMee**

## 1.2 Canonical Gameplay Map Names
1. **Mee主城鎮**
2. **河畔公園**
3. **港口市場**
4. **小屋區**
5. **Mee工作學習總部**
6. **Mee電影院**
7. **Buddy Cafe⨯Gether**
8. **Mee珍藏館**

英文可作圖像副名，例如 `MiniMee Cinema`，但程式、文件、資料庫及正式導航仍須保存上述 canonical 中文主名。

# 2. 四層場景架構

## 2.1 Gameplay Map
真正承載玩家行走、collision、NPC pathfinding、weather state、portals、interactions、shelter zones、object coordinates。

## 2.2 Zone / POI
Gameplay Map 內的一個功能區，例如廣場、攤檔區、電影院大堂區、卡冊區、碎片研究區。Zone 不等於另一張 heavy map。

## 2.3 Interaction UI / Zoom UI
例如公告板放大、小朋友名片、FAQ、問卷、電影選擇、訂閱、卡冊、世界地圖、建立小朋友檔案。這些是 overlay / modal / panel，不應被當成 Gameplay Map。

## 2.4 Entrance / Loading Scene
用途：場景進場、location reveal、door transition、loading、teleport / 快捷入口、cinematic establishing shot。

特性：
- 角色不需要自由行走
- 不需要 collision
- 不需要 mapping
- 不需要 weather gameplay logic
- 只需 Day / Night 版本
- 可有 loading bar 與少量 loop animation

# 3. Gameplay Camera 與 Geometry Master

## 3.1 Camera
正式鎖定：**old-GTA-style high-angle top-down**

室內與室外必須使用同一 camera projection，使同一套 sprite 可全遊戲共用。

## 3.2 Geometry Master 是最高權限資料
每張 Gameplay Map 必須只有一份 canonical geometry。

以下項目在任何 Day / Night / Rain / Thunderstorm / Festival Light 狀態下不得改位：
- 建築
- 道路
- 橋
- 樓梯
- 門
- 入口
- 出口
- 攤檔
- 大型固定 props
- NPC anchor
- Interaction anchor
- Shelter zone
- Collision geometry
- Main walk route
- Secondary route

**最高規則：World State 不得修改 Geometry Master。**

# 4. 正確的座標制度

## 4.1 絕對禁止只用 screenshot pixel 作 canonical coordinate

錯誤做法：
```text
日記本 = x 642px, y 1031px
```

原因：Mobile / iPad / Desktop viewport、解析度、safe area、camera zoom、UI scaling 都不同，這樣一定會走位。

## 4.2 MiniMee 必須使用三種座標空間

### A. World Space — 世界物件
用於日記本、門、椅、公告板、NPC、攤檔、Portal、寶箱、可點擊場景物件。

Canonical coordinate 必須儲存在世界座標 / tile 座標，而不是螢幕 pixel。

範例：
```yaml
id: house.my_home.desk.diary
type: interactable
world:
  x: 18.25
  y: 9.75
  z: 0
interaction_radius: 0.85
action: open_namecard_editor
```

### B. Screen Space — 固定 HUD / Buttons
用於活動、當期任務、最新消息、設定、Mail、開始遊戲、場景地圖、遊戲玩法、footer navigation、currency / energy HUD。

Canonical coordinate 使用 Normalized Coordinate：
```text
x = 0.0–1.0
y = 0.0–1.0
```

範例：
```yaml
id: global.settings
anchor: top_right
normalized:
  x: 0.945
  y: 0.055
```

### C. Local UI Space — Panel 內部
例如 FAQ 每個問題、名片選項、卡冊 slot。位置只相對於該 panel / component，不直接依 viewport 定位。

# 5. World Object Registry

每一張 Gameplay Map 完成後，**必須同時交付 Scene Manifest**。圖片本身不算完成。

每個 Scene Manifest 至少列出：
- Scene ID
- canonical name
- map bounds
- walkable zones
- collision polygons
- entrances
- exits
- portals
- interaction objects
- NPC anchors
- shelter zones
- camera bounds
- main route
- secondary routes
- scene-specific FX anchors

## 5.1 Interactable 必須有永久 Object ID

範例：
```yaml
id: house.my_home.desk.diary
display_name: 日記本
scene: 小屋區
zone: my_home
type: interactable
action: open_namecard_editor
world:
  x: 18.25
  y: 9.75
hitbox:
  shape: rect
  width: 1.20
  height: 0.90
prompt_anchor:
  offset_x: 0
  offset_y: -0.75
locked: true
```

後續即使換 Day / Night、換天氣、換 UI、換 viewport，都只能沿用同一 Object ID，不得重新估位置。

# 6. Responsive 不走位原則

## 6.1 World object
同一物件在 Mobile / iPad / Desktop：
- world coordinate 完全相同
- collision 完全相同
- action 完全相同

不同的只應是：
- camera viewport
- visible world area
- render scale
- UI scale

## 6.2 UI
UI 不使用固定 pixel 座標；使用：
- anchor
- normalized position
- safe-area inset
- min/max scale
- aspect-ratio rules

## 6.3 建議 Logical Resolution
Mobile-first 建議建立一個邏輯畫布：
```text
Logical portrait canvas = 1080 × 1920
```
這不是實際輸出解像度，只作 UI layout reference。所有 UI 最終仍須轉成 normalized position + anchor + responsive constraint。

# 7. Safe Area 系統

## 7.1 所有 Gameplay 圖生成前必須預留 HUD Safe Zones
不可先畫滿整張圖再硬塞 UI。

Portrait Gameplay 建議預留：
```text
TOP HUD SAFE AREA: 約畫面高度 0–12%
LEFT UTILITY RAIL: 約畫面寬度 0–12%，主要使用中上至中段
RIGHT UTILITY RAIL: 約畫面寬度 88–100%，視功能使用
PRIMARY CTA SAFE AREA: 約畫面高度 68–80%
BOTTOM GLOBAL NAV: 約畫面高度 86–100%
```

重要 gameplay door / NPC / interaction object 不應放在固定 HUD 下方。

## 7.2 Safe Area 必須考慮
- iPhone notch / Dynamic Island
- Android cutout
- iPad aspect ratio
- browser safe area
- desktop window resizing

程式需使用 device safe-area inset 再加 MiniMee 自己的 UI safe zone。

# 8. Global HUD / Footer 必須真正全局統一

如果某項是 Global UI，就不得每張場景自行設計位置。

## 8.1 Global Top HUD
可包括：
- 玩家頭像 / Level
- Energy
- Coins
- Gems
- 最新消息 / Mail
- Settings

## 8.2 Global Utility
可包括：
- 活動
- 當期任務
- 新手禮包 / seasonal badge

## 8.3 Global Primary Actions
可包括：
- 開始冒險 / contextual action
- 場景地圖
- 遊戲玩法 / help

## 8.4 Global Footer Navigation
可包括：
- 商店
- 寵物
- 背包
- 好友
- 排行榜

**若決定 Global Footer 存在，所有正常 Gameplay Map 都必須保留同一 footer slot。**

允許例外：
- full-screen movie playback
- cinematic
- modal
- special onboarding
- loading scene

例外必須在 scene manifest 明確標記。

# 9. Pixel-Art UI 的正確工程方法

## 9.1 不建議把所有 button 烘焙進背景圖
原因：
- 無法 responsive
- localization 困難
- pressed / disabled / notification state 困難
- hitbox 容易與視覺錯位
- 後續功能增加成本高

## 9.2 亦不建議使用普通 Web/App UI button
原因：容易出現 SaaS / dashboard 感，與 16-bit 世界割裂。

## 9.3 正式採用：Pixel UI Skin + Engine Layout
**程式負責位置與互動；美術資產負責外觀。**

Button 由像素素材組成，而不是普通 CSS button。

每個 component 建議有：
```text
normal
hover / focus
pressed
disabled
notification
selected
```

## 9.4 使用 9-slice / sprite-based frame
例如木製 button：
```text
corner TL | top edge | corner TR
left edge | fill     | right edge
corner BL | bot edge | corner BR
```

程式只拉伸中間與邊，角位保持像素不變。

優點：
- Desktop / iPad / Mobile 同一視覺語言
- 不會因文字長短而重畫整個 button
- 保持真正 game UI 感
- 不需要每個解析度重新出一粒 button

## 9.5 Pixel-perfect scaling
- 優先 integer scaling
- nearest-neighbour filtering
- 禁止 blur interpolation
- icon / border pixel thickness 要有最小值

# 10. UI Component Library

全遊戲不得逐頁臨時畫 button。

至少建立：
```text
MiniMeeButtonPrimary
MiniMeeButtonSecondary
MiniMeeButtonWood
MiniMeeIconButton
MiniMeeFooterTab
MiniMeeTopResourceChip
MiniMeeNotificationBadge
MiniMeeQuestButton
MiniMeeSpeechBubble
MiniMeeWeatherBadge
MiniMeePanel
MiniMeeModalFrame
MiniMeeLoadingBar
MiniMeeMapLabel
```

每個 component 都要有 sprite / 9-slice skin、typography、icon slot、text safe area、pressed、disabled、selected、notification state。

# 11. UI Coordinate Registry

Global UI 的位置必須集中在一份 registry，而不是散落在每頁 CSS / code。

範例：
```yaml
global_ui:
  player_profile:
    anchor: top_left
    x: 0.055
    y: 0.045

  settings:
    anchor: top_right
    x: 0.945
    y: 0.050

  activity:
    anchor: left
    x: 0.060
    y: 0.270

  quest:
    anchor: left
    x: 0.060
    y: 0.345

  primary_action:
    anchor: bottom_center
    x: 0.500
    y: 0.760

  footer:
    anchor: bottom_center
    x: 0.500
    y: 0.945
```

這些值正式落實前必須由第一張 approved UI master 校準。

# 12. Scene-specific UI

例如「閱讀日記」「播放電影」「研究碎片」「掃描好友」不應長期固定在 HUD。

正確流程：
```text
World Object
→ 玩家進入 interaction radius
→ 顯示 contextual prompt
→ 玩家按下
→ 打開 Interaction UI
```

# 13. Day / Night

每張 Gameplay Map：
- Day Master
- Night Master

兩者使用完全相同 geometry。

允許改：
- sky
- ambient light
- shadows
- windows
- lamps
- water reflections
- stars / moon
- minor natural FX

禁止搬：
- 建築
- 門
- 道路
- furniture anchor
- props
- NPC station
- portal

# 14. 真實香港時間

世界 canonical timezone：`Asia/Hong_Kong`

Day / Night 由真實香港時間驅動。日出 / 日落可按香港天文台資料逐步開發。

小寵物 contextual bubble 可提示：
> 「今日香港天文台話日落時間係 18:42，喺河畔公園睇應該會好靚！」

# 15. 真實香港天氣

全世界同步香港天氣。

Canonical weather：
- CLEAR
- CLOUDY
- RAIN
- THUNDERSTORM

另有 FESTIVAL_LIGHT event layer。

Weather 改變不得修改 geometry。

## 15.1 Rain
採中量版：
- rain particles
- wet ground
- puddle decals
- ripple
- moderate reflections
- rain audio

## 15.2 Umbrella
```text
if raining
and outdoor
and not inside shelter
=> umbrella ON
```

固定 outdoor NPC：
- 優先安排 canopy / awning / shelter
- 不需要長期撐傘工作

## 15.3 Severe Weather
颱風、暴雨、雷暴：
- 顯示警告圖標
- contextual safety tips
- 以香港全域官方狀態為準
- 不按玩家 IP 分區
- 不封鎖 V1 gameplay
- 不把惡劣天氣變成 rare reward event

# 16. Weather Update 頻率

建議：
- app start fetch
- 約 10–15 分鐘 refresh
- background → foreground 時按 cache age 更新
- Clear / Cloudy / Rain 使用 debounce / hysteresis
- 過雲雨不應令世界短時間不停切換
- severe warning 可優先更新

普通戶外 weather transition 約 10 秒 gradual transition。

室內出室外直接讀取當前 global state，不需重新播放完整 10 秒變天。

# 17. Entrance / Loading Scene

## 17.1 Mobile-first
正式主版本：
- 9:16 Day
- 9:16 Night

角色不自由行走。

## 17.2 Loading
可使用：
- MiniMeeLoadingBar
- 1–2 個簡單 loop
- light particles
- subtle environmental animation

避免重型動畫。

## 17.3 Weather
Entrance Scene 不需要製作 Rain / Cloudy / Thunderstorm 完整版本。Gameplay 才需要完整 weather state。

# 18. 每張場景完成的 Definition of Done

一張 Gameplay Map 只有在以下全部完成後才算 DONE：
- [ ] canonical name 正確
- [ ] 9:16 Gameplay master
- [ ] high-angle top-down camera
- [ ] geometry locked
- [ ] Main Walk Route 清晰
- [ ] entrances / exits 清晰
- [ ] doors 有實際位置
- [ ] collision plan
- [ ] interaction objects 有 Object ID
- [ ] NPC anchors 已列
- [ ] shelter zones 已列
- [ ] global HUD safe area 未被遮擋
- [ ] footer safe area 未被遮擋
- [ ] camera bounds 已列
- [ ] scene manifest 已輸出
- [ ] Day/Night 可共用同一 geometry
- [ ] weather 不會破壞 mapping

# 19. Scene Manifest 建議結構

每個場景建立：
```text
/scenes/<scene_id>/
├── scene.md
├── scene.manifest.yaml
├── geometry/
├── collision/
├── interactions/
├── npc/
├── ui/
├── day/
├── night/
└── entrance/
```

`scene.manifest.yaml` 是座標及 interaction 的唯一真相來源。

# 20. 嚴格禁止事項

- 不得用 screenshot pixel 作 world-object canonical coordinate
- 不得為 Desktop / iPad / Mobile 各自手動估一套物件位置
- 不得將 gameplay button 烘焙後就沒有 registry / hitbox
- 不得每個場景自行決定 footer 位置
- 不得因夜景或雨天重新設計道路
- 不得讓 AI 自行增加／刪除 canonical entrance
- 不得在未更新 Scene Manifest 的情況下搬 interactable
- 不得使用 generic SaaS UI 取代 MiniMee pixel-art UI skin
- 不得修改品牌名 `MiniMee`
- 不得私自修改八個 canonical 場景主名稱

# 21. 正式圖像製作順序

## Phase 1 — Gameplay Geometry
先完成八張 Day Geometry Master：
1. Mee主城鎮
2. 河畔公園
3. 港口市場
4. 小屋區
5. Mee工作學習總部
6. Mee電影院
7. Buddy Cafe⨯Gether
8. Mee珍藏館

## Phase 2 — Coordinate Lock
每完成一張圖，立即：
1. 標 Main Route
2. 標 entrances / exits
3. 標 doors
4. 標 interactables
5. 標 NPC anchors
6. 標 shelter
7. 產生 Scene Manifest
8. 鎖 Object IDs

**未完成 Coordinate Lock，不得開始該場景 Night Master。**

## Phase 3 — Night
沿用同一 geometry 生成 Night。

## Phase 4 — Entrance
每場景：
- 9:16 Day Entrance
- 9:16 Night Entrance

## Phase 5 — Weather / FX
最後再加入 runtime weather。

# 22. AI Agent 工作規則

任何 AI agent 接手 MiniMee 前：
1. 先讀本文件；
2. 不得從舊圖自行推斷最新場景名稱；
3. 先取得該 Scene Manifest；
4. 生成 Night / Weather variant 時必須鎖 geometry；
5. 生成 UI 時必須使用 Global UI Registry；
6. 若新增 interactable，先建立 Object ID；
7. 若移動既有物件，必須更新 manifest 並標記 migration；
8. 不得只交圖片而沒有座標／用途資料；
9. 每次生成後須檢查路線、入口、安全區及 footer/HUD 空間。

# 23. 一句話技術原則

> **MiniMee 的美術可以豐富，但 Geometry、Object ID、World Coordinates、Global UI Anchors 必須像程式 API 一樣穩定。**
