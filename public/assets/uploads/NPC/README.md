# NPC 角色圖

**26 隻全部已經收齊，遊戲已經接住呢個資料夾行緊。**

一隻一個資料夾，資料夾名就係索引 —— 加隻新嘅／重畫舊嘅，
照住下面個樣放入嚟 push 上 GitHub 就得。

## 資料夾結構（每隻都一樣）

```
NPC_01_usher-day/
└── runtime/
    ├── turnaround/     ← 四面 + 呢個崗位嘅道具動作
    │   ├── front.webp       ← 遊戲入面出嘅就係佢
    │   ├── back.webp
    │   ├── left_side.webp
    │   ├── right_side.webp
    │   └── check_ticket.webp …（每隻唔同，睇佢做咩工）
    └── emotions/       ← 十二個表情，26 隻全部一樣
        ├── neutral.webp    joyful.webp     excited.webp
        ├── playful_wink.webp  shy.webp     surprised.webp
        ├── thinking.webp   determined.webp apologetic.webp
        └── sad.webp        worried.webp    sleepy.webp
```

`front.webp` 係一定要有嘅 —— 櫃枱同廣場出嘅就係佢。
其他缺咗會靜靜哋唔出，唔會爛圖。

## 規格

| | |
|---|---|
| 格式 | `.webp`，**透明底** |
| 高度 | **512 px** 左右，闊度隨佢 |
| ⚠️ 位置 | **腳底貼住圖片最底邊**，下面留白會令佢浮喺半空 |
| ⚠️ 逐隻出 | 一隻一個資料夾，唔好交藍圖 |

## 26 隻

### 崗位（10 個 × 早更／晚更）

| 資料夾 | 崗位 | 角色 |
|---|---|---|
| `NPC_01_usher-day` | 戲院大堂接待處 | 紅熊貓 |
| `NPC_02_usher-night` | 同上（晚更） | 黑貓 |
| `NPC_03_librarian-day` | 圖書館重溫枱 | 白兔 |
| `NPC_04_librarian-night` | 同上（晚更） | 貓頭鷹 |
| `NPC_05_studio-day` | Studio 小遊戲枱 | 邊境牧羊犬 |
| `NPC_06_studio-night` | 同上（晚更） | 水獺 |
| `NPC_07_stall-card-day` | 市集 · 自我介紹卡 | 松鼠 |
| `NPC_08_stall-card-night` | 同上（晚更） | 耳廓狐 |
| `NPC_09_stall-child-day` | 市集 · 新增孩子檔案 | 海狸 |
| `NPC_10_stall-child-night` | 同上（晚更） | 企鵝 |
| `NPC_11_stall-pay-day` | 市集 · 付款訂閱 | 柴犬 |
| `NPC_12_stall-pay-night` | 同上（晚更） | 水豚 |
| `NPC_13_stall-lost-day` | 市集 · 失物認領 | 小象 |
| `NPC_14_stall-lost-night` | 同上（晚更） | 浣熊 |
| `NPC_15_stall-security-day` | 市集 · 保安亭 | 德國牧羊犬 |
| `NPC_16_stall-security-night` | 同上（晚更） | 獾 |
| `NPC_17_cafe-day` | Buddy Café 甜品櫃 | 羊駝 |
| `NPC_18_cafe-night` | 同上（晚更） | 刺蝟 |
| `NPC_19_studio-extra-day` | Studio 教學板（詞彙） | 六角恐龍 |
| `NPC_20_studio-extra-night` | 同上（晚更） | 玄鳳鸚鵡 |

⚠️ **`studio` 同 `studio-extra` 唔好調亂：**
`NPC_05/06`（攞搖桿嗰對）係**小遊戲枱**，程式入面叫 `studio-game`；
`NPC_19/20`（攞「Aa」字卡嗰對）係**教學板**，程式入面叫 `studio-words`。
兩邊對照表喺 `src/lib/babble.ts` 嘅 `NPC_FOLDERS`。

### 閒人（6 隻，冇早晚更）

| 資料夾 | 角色 | 企喺 |
|---|---|---|
| `NPC_21_neighbour-hamster` | 倉鼠 | 小屋區入口 |
| `NPC_22_neighbour-guineapig` | 天竺鼠 | 小屋區入口 |
| `NPC_23_plaza-deer` | 梅花鹿 | 小鎮廣場 |
| `NPC_24_plaza-koala` | 樹熊 | 小鎮廣場 |
| `NPC_25_plaza-frog` | 青蛙 | 小鎮廣場 |
| `NPC_26_plaza-ferret` | 雪貂 | 小鎮廣場 |

閒人冇崗位冇任務，企喺度、撳得、會講句閒話。

## 改完之後要行一次

```
node scripts/index-npc-art.mjs
```

佢會由呢個資料夾本身寫返 `src/data/npcArtIndex.json`，
測試就係攞嗰份對 —— 有隻角色冇 push 上嚟會即刻 fail，
唔會等到開個空櫃枱先發現。
