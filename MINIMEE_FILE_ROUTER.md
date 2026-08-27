# MINIMEE_FILE_ROUTER.md

> MiniMee AI 文件路由器 / FIRST-READ ROUTER
>
> 任何 AI Agent、Codex、Lovable、工程師或設計 AI 接手 MiniMee 工作時，先讀本檔案。禁止只靠聊天記憶直接實作。

## 0. Cache-first 固定入口規則
1. 先判斷是否已有有效的 Project Context Snapshot / Task Context Snapshot。
2. 如有有效 snapshot：先檢查所引用 source files 的 SHA/hash/fingerprint；未變更即 CACHE HIT，直接沿用，不重讀全文。
3. 如 snapshot 不存在、失效或 scope 已改：讀 `docs/minimee/governance/CONTEXT_CACHE_POLICY.md`，再按本 Router 只載入今次任務 mandatory sources，compile 新 snapshot。
4. `docs/minimee/governance/SKILL_v1.3.md`、governance/art/source files 只有在 snapshot 未涵蓋、已 stale、或今次任務需要時才重新載入。
5. 涉及現有場景：讀該場景 `scene.manifest.yaml`，但如其 fingerprint 與 snapshot 一致，不重讀全文。
6. 涉及全局 UI：讀 `global_ui.registry.yaml`，但如未變更則沿用 snapshot。
7. 涉及已存在功能／活動：讀正式 `feature_registry.yaml`，但只刷新相關 section/source。
8. 涉及小寵物：讀 canonical pet Bible / pet skill；如 snapshot 已有效涵蓋則沿用。
9. 涉及學習：讀對應正式腳本／題庫；只載入與今次主題/年齡層相關資料。
10. 涉及生圖／場景美術／UI美術：使用 active visual task snapshot；只在需要 bootstrap/rebuild 時讀 `docs/minimee/art/` 的 Visual Direction / Art Lock / Prompt Lock / Reference Index。
11. 缺少會影響架構的資料時必須先問，不得自行假設。
12. 新一張 render、retry、variation、同場景小改，本身不構成「重新讀晒全部 files」的理由。

## 0A. Snapshot lifecycle
- FIRST USE / NEW TASK: Router -> mandatory sources -> compile snapshot -> record source hashes -> execute.
- SAME TASK, SECOND+ USE: check hashes -> CACHE HIT -> apply delta -> execute.
- SMALL CHANGE: reuse same task snapshot; refresh only affected/stale sources.
- MAJOR REVISION: re-route affected domain, invalidate only affected snapshot sections, preserve unrelated cached context.
- NEW CONVERSATION / NEW AGENT: load persisted compact snapshot if available, validate hashes, then load only missing/stale canonical sources.

Canonical files always outrank snapshots. Snapshots are acceleration artifacts, not source-of-truth.

## 1. 新增主題／學習主題
必讀（cache miss / stale 時）：
- `docs/minimee/governance/FEATURE_EVENT_GOVERNANCE.md`
- `docs/minimee/governance/NEW_FEATURE_INTAKE_TEMPLATE.md`
- `docs/minimee/governance/INVENTORY_CONSUMABLE_MODEL.md`
- `docs/minimee/governance/FEATURE_REGISTRY_SCHEMA.md`
- 對應正式學習腳本／題庫／年齡層資料

必須確認：年齡層、學習節點、碎片類型、完成條件、Mee收藏卡、消耗/歸檔、owner scene、Pet affinity、永久紀錄。

## 2. 新增節日／限時活動
必讀：Feature Governance、New Feature Intake、Feature Registry Schema、Inventory Model；如改場景再讀 Scene System + scene manifest；如改 Dock/UI 再讀 Adaptive Dock。所有 read 均先做 cache/hash check。

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
必讀：Scene System Spec + scene manifest + `docs/minimee/art/MINIMEE_GAMEPLAY_ART_LOCK.md`。Day/Night/Weather 不得移動 canonical geometry。若同一 scene/task snapshot 有效，直接沿用 geometry/art rules，只刷新有變更 source。

## 9. Entrance / Loading Scene
必讀：Scene System Spec + Visual Direction Bible + Prompt Lock + 對應 scene identity reference。Entrance 可 cinematic，但不是 geometry authority。

## 10. 小寵物／好感度／Bubble
必讀：canonical pet Bible + pet skill + affinity source + Adaptive Dock；如增加獎勵/任務/物品再讀 Feature Governance / Inventory Model。

## 11. 家長模式／遺失模式／QR／好友分享
必讀：Feature Governance + 對應 canonical privacy/safety requirement + Adaptive Dock（如 UI）。

## 12. Mee收藏卡
必讀：Feature Governance + Inventory Model + 正式 Mee卡資料／模板；如由學習解鎖，再讀學習主題 source。

## 13. 任何生圖／場景美術／UI美術
Bootstrap / cache rebuild 時必讀：
- `docs/minimee/art/MINIMEE_VISUAL_DIRECTION_BIBLE.md`
- `docs/minimee/art/MINIMEE_GAMEPLAY_ART_LOCK.md`
- `docs/minimee/art/MINIMEE_SCENE_PROMPT_LOCK.md`
- `docs/minimee/art/MINIMEE_STYLE_REFERENCE_INDEX.md`
- `docs/minimee/art/MINIMEE_REFERENCE_SELECTION_POLICY.md`
- 如涉及 gameplay scene：Scene System Spec + scene manifest
- 如涉及 UI：Adaptive Dock / global UI registry

同一 active image task 第二張起：優先使用 Task Context Snapshot + 今次 delta instruction。只有 source fingerprint 改變、scope 大改、snapshot 缺資料時才重新讀相關 source。

參考圖只可控制畫風、光影、密度、材質、角色/UI語言；不得覆蓋 scene manifest 的路線、門、入口、collision、座標。

## 14. 座標／Responsive
必讀：`docs/minimee/art/MINIMEE_COORDINATE_POLICY.md` + scene manifest / global UI registry。
- 世界物件：一套 canonical world/tile coordinates，共用於 Mobile/iPad/Desktop
- 固定 UI：normalized coordinates + anchor + safe area
- 不維護三套互相獨立的世界座標

## 15. 換 Agent／新團隊接手
必讀：本 Router + `docs/minimee/governance/AI_AGENT_HANDOFF_CHECKLIST.md` + active persisted snapshot + 受影響 manifests/registries/canonical content files。不要因換 Agent 就無條件重讀整個 project brain。

## 16. Context Cache / Token / Latency
必讀政策：`docs/minimee/governance/CONTEXT_CACHE_POLICY.md`

Hard rules:
- Read once, compile once, reuse aggressively, refresh by delta.
- Never reread unchanged canonical sources merely because another generation was requested.
- Track source SHA/hash/fingerprint in snapshots.
- Cache hit/miss/stale reason應記錄到執行 audit（如由 WonderMEE 執行）。

## Source-of-Truth 優先級
1. 最新 APPROVED Feature Registry
2. Scene Manifest / Global UI Registry
3. Canonical character/content Bible
4. Visual Direction / Gameplay Art Lock（視覺任務）
5. Feature/Event Governance
6. Inventory Model
7. Scene System Spec
8. Skill
9. Persisted Context Snapshot（只作加速；衝突時 canonical source 勝）
10. 舊圖片/prototype
11. Chat memory

## 核心原則
使用者只需要講「想改乜」；AI 有責任知道「先讀乜、邊啲唔需要再讀、要問乜、要記錄乜」。
