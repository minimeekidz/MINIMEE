# 主角圖（6 隻）

**6 隻全部已經收齊，遊戲已經接住呢個資料夾行緊。**

一隻一個資料夾，資料夾名就係索引 —— 重畫邊隻，照住下面個樣放返入嚟就得。

## 資料夾結構（每隻都一樣）

```
A_GIRL/
└── runtime/
    ├── motion/          ← 16 個動作
    │   ├── A_GIRL_front_idle.webp   ← 遊戲入面出嘅就係佢
    │   ├── A_GIRL_back_idle.webp     A_GIRL_left_idle.webp
    │   ├── A_GIRL_right_idle.webp    A_GIRL_front_left_3q.webp
    │   ├── A_GIRL_front_right_3q.webp
    │   ├── A_GIRL_walk_front.webp    A_GIRL_walk_back.webp
    │   ├── A_GIRL_walk_left_a.webp   A_GIRL_walk_left_b.webp
    │   ├── A_GIRL_walk_right_a.webp  A_GIRL_walk_right_b.webp
    │   └── A_GIRL_run.webp  A_GIRL_wave.webp
    │       A_GIRL_sit_front.webp  A_GIRL_sit_side.webp
    └── expressions/     ← 12 個表情
        ├── A_GIRL_neutral.webp   A_GIRL_laugh.webp     A_GIRL_cheer.webp
        ├── A_GIRL_proud.webp     A_GIRL_shy.webp       A_GIRL_surprised.webp
        ├── A_GIRL_curious.webp   A_GIRL_determined.webp A_GIRL_angry.webp
        └── A_GIRL_sad.webp       A_GIRL_worried.webp   A_GIRL_sleepy.webp
```

**檔名要有資料夾名做前綴**（`A_GIRL_front_idle.webp`），跟返上面。
`front_idle` 係一定要有嘅 —— 小鎮行緊嗰個、個人檔案、卡上面出嘅都係佢。

## 6 隻

| 資料夾 | 程式 id | 角色 |
|---|---|---|
| `A_GIRL` | `girl-a` | 粉紅英雄 |
| `A_BOY` | `boy-a` | 藍披風英雄 |
| `B_GIRL` | `girl-b` | 金髮公主 |
| `B_BOY` | `boy-b` | 飛行探險家 |
| `C_GIRL` | `girl-c` | 森林守護者 |
| `C_BOY` | `boy-c` | 星章英雄 |

對照表喺 `src/lib/characters.ts` 嘅 `HERO_FOLDERS`。

## ⚠️ 交圖要透明底

2026-08-26 嗰批係**白底**交過嚟（3 channel，冇 alpha）。
白底喺小鎮地圖上面 = 一個白色方格喺度行，所以要去底先用得。

已經有腳本幫你去咗：

```
node scripts/cut-hero-sprites.mjs      # 白底 → 透明，順便裁走四周空白
node scripts/index-hero-art.mjs        # 寫返 src/data/heroArtIndex.json
```

`cut-hero-sprites.mjs` 有兩點值得知：

- **只清「由邊界連過去」嗰笪白**，唔係見白就殺 —— 白靴、眼白、披風內襯留得住。
- **同一組共用一個裁切框**（motion 一個、expressions 一個），
  唔係逐張裁 —— 逐張裁會令行路時個人一格格咁跳。
- 行第二次唔會蝕圖：已經有 alpha 嘅檔會跳過。

下次直接出**透明底**就唔使行第一句。

| | |
|---|---|
| 格式 | `.webp`，**透明底** |
| 尺寸 | 512 px 見方左右（裁完會細啲，正常） |
| 姿勢 | 全身，腳底貼近底邊 |
| ⚠️ | 同一組每格要對得正 —— 行路嗰 4 格尤其緊要 |
