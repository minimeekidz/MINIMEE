# MINIMEE_FILE_ROUTER.md

> MiniMee AI 文件路由器 / FIRST-READ ROUTER
>
> 任何 AI Agent、Codex、Lovable、工程師或設計 AI 接手 MiniMee 工作時，先讀本檔案。禁止只靠聊天記憶直接實作。

## 0. 固定入口規則
1. 讀 `MINIMEE_FILE_ROUTER.md`
2. 讀 `docs/minimee/governance/SKILL_v1.3.md`
3. 根據任務類型補讀 mandatory source-of-truth files
4. 涉及現有場景：讀該場景 `scene.manifest.yaml`
5. 涉及全局 UI：讀 `global_ui.registry.yaml`
6. 涉及已存在功能／活動：讀正式 `feature_registry.yaml`
7. 涉及小寵物：讀 canonical pet Bible / pet skill
8. 涉及學習：讀對應正式腳本／題庫
9. 涉及生圖／場景美術／UI美術：讀 `docs/minimee/art/` 下的 Visual Direction / Art Lock / Prompt Lock / Reference Index
10. 缺少會影響架構的資料時必須先問，不得自行假設

## 1. 新增主題／學習主題
必讀：
- `docs/minimee/governance/FEATURE_EVENT_GOVERNANCE.md`
- `docs/minimee/governance/NEW_FEATURE_INTAKE_TEMPLATE.md`
- `docs/minimee/governance/INVENTORY_CONSUMABLE_MODEL.md`
- `docs/minimee/governance/FEATURE_REGISTRY_SCHEMA.md`
- 對應正式學習腳本／題庫／年齡層資料

必須確認：年齡層、學習節點、碎片類型、完成條件、Mee收藏卡、消耗/歸檔、owner scene、Pet affinity、永久紀錄。

## 2. 新增節日／限時活動
必讀：Feature Governance、New Feature Intake、Feature Registry Schema、Inventory Model；如改場景再讀 Scene System + scene manifest；如改 Dock/UI 再讀 Adaptive Dock。

## 3. 新增任何道具／碎片／票／材料
必讀：Inventory Model + Feature Governance + Feature Registry Schema。定義 canonical item_id、class、stackable、expiry、grant source、consume trigger、post-consume state、Backpack/Mee珍藏館、double-grant/double-consume protection、transaction log。

## 4. 新增／修改背包
必讀：Inventory Model + Adaptive Dock + Feature Governance。

## 5. 新增／修改 Dock
必讀：Adaptive Dock + Feature Governance + global UI registry。先做 Dock Test：是否任何場景都合理使用、是否高頻、是否隨身功能、能否改為 Interaction UI / World / More。

## 6. Interaction UI / Zoom UI
必讀：Scene System Spec + Adaptive Dock；如新功能再讀 Feature Governance。

## 7. Gameplay 場景／Geometry／門／路／橋／NPC／互動物件
必讀：Scene System Spec + 對應 scene manifest + global UI registry。任何移位必須更新 world coordinate / hitbox / collision；不能只改圖片。

## 8. Day / Night / Weather / Festival
必讀：Scene System Spec + scene manifest + `docs/minimee/art/MINIMEE_GAMEPLAY_ART_LOCK.md`。Day/Night/Weather 不得移動 canonical geometry。

## 9. Entrance / Loading Scene
必讀：Scene System Spec + Visual Direction Bible + Prompt Lock + 對應 scene identity reference。Entrance 可 cinematic，但不是 geometry authority。

## 10. 小寵物／好感度／Bubble
必讀：canonical pet Bible + pet skill + affinity source + Adaptive Dock；如增加獎勵/任務/物品再讀 Feature Governance / Inventory Model。

## 11. 家長模式／遺失模式／QR／好友分享
必讀：Feature Governance + 對應 canonical privacy/safety requirement + Adaptive Dock（如 UI）。

## 12. Mee收藏卡
必讀：Feature Governance + Inventory Model + 正式 Mee卡資料／模板；如由學習解鎖，再讀學習主題 source。

## 13. 任何生圖／場景美術／UI美術
必讀：
- `docs/minimee/art/MINIMEE_VISUAL_DIRECTION_BIBLE.md`
- `docs/minimee/art/MINIMEE_GAMEPLAY_ART_LOCK.md`
- `docs/minimee/art/MINIMEE_SCENE_PROMPT_LOCK.md`
- `docs/minimee/art/MINIMEE_STYLE_REFERENCE_INDEX.md`
- `docs/minimee/art/MINIMEE_REFERENCE_SELECTION_POLICY.md`
- 如涉及 gameplay scene：Scene System Spec + scene manifest
- 如涉及 UI：Adaptive Dock / global UI registry

參考圖只可控制畫風、光影、密度、材質、角色/UI語言；不得覆蓋 scene manifest 的路線、門、入口、collision、座標。

## 14. 座標／Responsive
必讀：`docs/minimee/art/MINIMEE_COORDINATE_POLICY.md` + scene manifest / global UI registry。
- 世界物件：一套 canonical world/tile coordinates，共用於 Mobile/iPad/Desktop
- 固定 UI：normalized coordinates + anchor + safe area
- 不維護三套互相獨立的世界座標

## 15. 換 Agent／新團隊接手
必讀：本 Router + `docs/minimee/governance/AI_AGENT_HANDOFF_CHECKLIST.md` + Skill + 受影響 manifests/registries/canonical content files。

## Source-of-Truth 優先級
1. 最新 APPROVED Feature Registry
2. Scene Manifest / Global UI Registry
3. Canonical character/content Bible
4. Visual Direction / Gameplay Art Lock（視覺任務）
5. Feature/Event Governance
6. Inventory Model
7. Scene System Spec
8. Skill
9. 舊圖片/prototype
10. Chat memory

## 核心原則
使用者只需要講「想改乜」；AI 有責任知道「先讀乜、要問乜、要記錄乜」。
