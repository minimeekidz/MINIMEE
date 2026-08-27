# MINIMEE_FILE_ROUTER.md

> MiniMee AI 文件路由器。任何 MiniMee 任務先讀本檔案，再按任務類型載入對應 source-of-truth files。禁止只靠聊天記憶直接實作。

## 固定入口
1. 讀 `MINIMEE_FILE_ROUTER.md`
2. 讀 `SKILL_v1.3.md`
3. 按任務補讀 mandatory files
4. 現有場景：讀 `scene.manifest.yaml`
5. 全局 UI：讀 `global_ui.registry.yaml`
6. 已存在功能／活動：讀正式 `feature_registry.yaml`
7. 小寵物：讀 canonical pet Bible / pet skill
8. 學習：讀正式腳本／題庫
9. 缺少架構關鍵資料時先問，不得自行假設

## 任務路由
### 新增主題／學習主題
- 讀 `FEATURE_EVENT_GOVERNANCE.md`
- 讀 `NEW_FEATURE_INTAKE_TEMPLATE.md`
- 讀 `INVENTORY_CONSUMABLE_MODEL.md`
- 讀 `FEATURE_REGISTRY_SCHEMA.md`
- 讀對應學習腳本／題庫／年齡層資料
- 確認年齡層、學習節點、碎片、item class、完成條件、Mee收藏卡、消耗／歸檔、owner scene、是否影響小寵物好感度

### 新增節日／限時活動
- 讀 Feature Governance、New Feature Intake、Feature Registry、Inventory Model
- 如改場景，再讀 Scene Spec + scene manifest
- 如改 Dock/UI，再讀 Adaptive Dock
- 確認 start/end、event-end behaviour、item expiry、geometry impact、Festival Light、NPC/Pet、天氣／安全

### 新增道具／碎片／票／材料
- 讀 Inventory Model、Feature Governance、Feature Registry Schema
- 定義 item_id、class、stackable、expiry、grant source、consume trigger、post-consume state、Backpack/Mee珍藏館、double-grant/double-consume protection

### 新增／修改背包
- 讀 Inventory Model、Adaptive Dock、Feature Governance

### 新增／修改 Dock
- 讀 Adaptive Dock、Feature Governance、global UI registry
- 先做 Dock Test：任何場景都合理？高頻？隨身？可否改為 Interaction UI / World Interaction / More？

### 新增彈出視窗／Zoom UI／Interaction UI
- 讀 Scene System Spec、Adaptive Dock；如屬新功能再讀 Feature Governance

### 新增／修改 Gameplay 場景
- 讀 Scene System Spec、對應 scene manifest、global UI registry
- 鎖 canonical name、camera、Geometry Master、routes、doors、entrances/exits、collision、NPC anchors、shelter、Object IDs、UI safe areas

### 搬建築／門／橋／道路／日記本／NPC／互動物件
- 讀該 scene manifest、Scene System Spec
- 保留 Object ID，更新 world coordinate / hitbox / collision；不能只改圖片

### 新增場景互動物件
- 讀 scene manifest、Scene Spec；如功能新再讀 Feature Governance
- 建立 permanent Object ID、world/tile coordinate、hitbox、action、interaction radius、prompt anchor

### Day → Night
- 讀 scene manifest、Scene Spec；Geometry 不得搬，只改 lighting / sky / lamps / windows / natural FX

### 雨／雷暴／颱風／暴雨／香港天氣
- 讀 Scene Spec；如新增玩法再讀 Feature Governance
- 香港全世界同步；HKO 為 source；Weather 不得修改 Geometry

### Entrance / Loading Scene
- 讀 Scene Spec、場景 identity/reference；9:16 mobile-first；Day+Night；不需要 collision/mapping/weather variants

### 小寵物／小寵物手冊／好感度
- 讀 canonical pet Bible、pet skill、affinity source、Adaptive Dock；如增加獎勵／活動再讀 Feature Governance

### 新增小寵物 Bubble 對話
- 純對話：讀 pet Bible + 場景／時間／天氣 context
- 如加好感度、派 item、解鎖資料、觸發任務，再讀 Feature Governance；如有 item 再讀 Inventory Model

### 好友冊／好友功能
- 讀 Feature Governance、Adaptive Dock、現有好友/QR canonical requirement

### 家長模式
- 讀 Feature Governance、Adaptive Dock/UI、現有 parent/privacy requirement

### 遺失模式／QR
- 讀 Feature Governance、Lost Mode / QR canonical requirement；做 privacy/safety review、parent gate、public data boundary、state transitions

### 新增／修改 Mee收藏卡
- 讀 Feature Governance、Inventory Model、正式 Mee卡資料；如由學習解鎖再讀學習主題資料

### 新增固定 HUD／活動／任務／通知圖標
- 讀 global UI registry、Scene Spec；如新功能再讀 Feature Governance；使用 normalized coordinates + anchor + safe-area

### 換 AI Agent／新團隊接手
- 讀 Router、AI Agent Handoff Checklist、SKILL_v1.3、受影響 manifests/registries/content files

## AI 自動判斷
例如只說「我要新增一個主題」，AI 應自動判定 NEW FEATURE + LEARNING + POSSIBLE INVENTORY + POSSIBLE MEE CARD，讀對應文件，然後只問真正缺少且影響架構的問題。

## Source-of-Truth 優先級
1. 最新已批准 Feature Registry
2. Scene Manifest / Global UI Registry
3. Canonical role/content Bible
4. Feature/Event Governance
5. Inventory/Consumable Model
6. Scene System Spec
7. SKILL
8. 舊圖片／prototype
9. Chat memory

## 最簡單用法
如果 root `AGENTS.md` 已要求先讀 Router，使用者甚至只要講：「我要新增一個主題。」AI 就應自己 routing。

## 建議 root AGENTS.md
```text
For every MiniMee task, first read /MINIMEE_FILE_ROUTER.md.
Use it to determine all mandatory source-of-truth files before planning or implementation.
For new features/events/items/themes, complete the Feature Governance intake and ask only missing critical questions.
Do not implement from chat memory, screenshots, or assumptions when a canonical registry/manifest/bible exists.
```

## 核心原則
使用者只需要講想改乜；AI 有責任知道先讀乜、要問乜、要記錄乜。
