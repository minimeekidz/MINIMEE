# MINIMEE 場景繪圖指引 + 每張圖嘅 prompt

> 每次出新場景圖之前睇呢份。下面每一張都寫咗：要幾多個出入口、擺喺邊、
> 同埋一段可以直接複製去 AI 出圖嘅 prompt。
>
> 出入口座標係由 `src/lib/world.ts` 同 `src/lib/interiors.ts` 抄出嚟嘅，
> 即係程式真係會喺嗰個位擺個掣。圖唔使畫到分毫不差，
> **但嗰個位一定要有嘢可以撳**（一度門、一個路口、一個攤檔）。

---

## 第一部分：所有場景都要跟嘅規矩

### 技術規格

| | 戶外地圖 | 室內 |
|---|---|---|
| 尺寸 | **941 × 1672**（直度 9:16） | 941 × 1672 |
| 格式 | `.webp` | `.webp` |
| 大細 | 150–250 KB | 150–250 KB |
| 檔名 | `小鎮中心_日.webp` | `戲院大堂.webp` |

### 五條唔可以破嘅規矩

**1. 一個角色都唔好畫。**

唔好畫人、唔好畫寵物、唔好畫動物 —— 一隻都唔好。

點解：主角同寵物係程式擺上去嘅 sprite，佢哋有固定大細。背景畫死咗一隻
大熊，主角企埋去就會變咗一隻螞蟻，而且**永遠改唔到** —— 你鬥唔過一張圖。
背景係舞台，演員全部由我擺。

（想有人氣？見第三部分 NPC —— 我會擺企定嘅 NPC 上去，仲撳到傾偈。）

**2. 平俯視角，天空唔好多過頂部 1/5。**

主角行上行落**唔會縮細**（佢係固定 scale）。如果張圖係「風景畫透視」——
底部好闊、頂部收成一條線 —— 主角行到中段就會大過棟屋。

要嘅係接近**斜俯視 45°**，成張圖由頭到尾比例差唔多。

**3. 走道要好清楚，同兩邊有強對比。**

我要靠顏色切出邊度行得到。淺色石板路 vs 深綠樹叢 = 好切。
一片灰濛濛乜都似 = 切唔到，我要人手畫返條路。

走道要夠闊（至少佔畫面闊度 1/5），唔好斷開。

**4. 每個出入口都要「望落去就知撳得」。**

一度有顏色嘅門、一個牌坊、一條明顯路口。唔好用暗角落嘅細窿當出口。

**5. 建築物比例要企得穩。**

主角高度大約係成張圖高度嘅 **1/16**。即係一度門大概要 **1/10 圖高**，
一棟屋 **1/4 到 1/3**。太細嘅門主角企埋去會似巨人。

### 日／夜版

同一張圖出兩個版本：同一個構圖、同一個角度、**同一個位置嘅嘢一模一樣**，
淨係光線唔同。

- **日**：藍天、陽光、影子短
- **夜**：深藍紫天、街燈亮、窗有暖光、影子長

⚠️ 兩張圖嘅**建築位置唔可以郁**，郁咗個門就會對唔上個掣。

---

## 第二部分：逐張圖

座標寫成 `(x, y)`，`(0,0)` 係左上角，`(1,1)` 係右下角。

---

### 1. 小鎮中心 ✅ 已定案（Em 2026-08-16）

**最重要嗰張。** 一個中央廣場（羅盤圖案），五度門圍住，兩個出口。

| # | 建築／出口 | 標誌 | 座標 |
|---|---|---|---|
| 1 | **Hero Studio** | ⭐ 星 | **(0.50, 0.285)** 上中 —— 最搶眼 |
| 2 | 戲院大堂 | 空白招牌 + 兩個空白海報框 | (0.20, 0.300) 上左 |
| 3 | MEE 圖書館 | 📖 書 | (0.79, 0.310) 上右 |
| 4 | Buddy Café | ☕ 咖啡杯 | (0.21, 0.580) 下左 |
| 5 | MEE 珍藏館 | 🃏 卡 | (0.76, 0.600) 下右 |
| 6 | → 碼頭市集 | 沿海小路 | (0.93, 0.105) 右上 |
| 7 | → 小鎮廣場 | 主路 | (0.47, 0.980) 底部中央 |

戲院嗰個**空白招牌同兩個空白海報框**係特登留白俾程式疊當期主題上去。

戲院大堂同圖書館喺 Hero Studio 入面**都有門**；小鎮中心呢兩度係捷徑，
唔係取代 —— Em：「只係小鎮中心都有多一個捷徑入口比佢地入去」。

**四個檔案**（同一個構圖，建築位置一模一樣）：

```
小鎮中心_日.webp           941 × 1672
小鎮中心_夜.webp           941 × 1672
小鎮中心_日_wide.webp     1672 × 941   ← 電腦用
小鎮中心_夜_wide.webp     1672 × 941
```

**Prompt：**

```
Top-down 45-degree pixel art game map, vertical 9:16 portrait, cosy European
seaside town square. FOUR clearly visible shopfront doors: a large cinema
entrance with a marquee sign and poster frames as the visual centrepiece
(upper middle), a small cafe with a cup sign (upper left), a photo studio
with a star sign (right), a museum-like hall with tall bright doors (lower
right). A wide pale cobblestone road runs from the bottom edge up through the
middle and branches to the lower right toward a harbour with a railing and a
dock signpost. Flat consistent scale from foreground to background, sky no
more than the top fifth of the image. Warm daylight, blue sky, flower boxes,
lanterns, cobblestones, terracotta roofs. Detailed pixel art, clean readable
shapes, high contrast between the pale road and the green planting.
ABSOLUTELY NO people, NO animals, NO characters of any kind.
```

夜版：同一段，`Warm daylight, blue sky` 改成
`Night, deep blue-purple sky, glowing street lamps, warm light in every window`。

---

### 2. 小鎮廣場（`小鎮廣場_日.webp` / `_夜.webp`）

寵物聚腳、公告板。

| # | 要有咩 | 擺喺 |
|---|---|---|
| 1 | **公告板**（木牌／告示板） | (0.46, 0.47) |
| 2 | → 小鎮中心 路口 | (0.45, 0.98) 底部 |
| 3 | → 散步公園 路口 | (0.07, 0.68) 左邊 |
| 4 | → 小屋區入口 路口 | (0.86, 0.42) 右邊 |

**要有空地**，因為呢度係寵物行來行去嘅地方 —— 中間留一大片行得到嘅廣場。

**Prompt：**

```
Top-down 45-degree pixel art game map, vertical 9:16 portrait, an open town
plaza paved with pale stone. A wooden notice board with a small roof stands
in the middle of the plaza. Three road openings lead off: one at the bottom
edge, one on the left side, one on the upper right. Large open walkable
paving in the centre. Flat consistent scale, sky no more than the top fifth.
Fountain, benches, flower planters, bunting, market awnings around the edges.
Warm daylight. Detailed pixel art, high contrast between pale paving and
surrounding greenery. ABSOLUTELY NO people, NO animals, NO characters.
```

---

### 3. 散步公園（`散步公園_日.webp` / `_夜.webp`）

穿過型 —— 兩個出口，冇門。**你啱啱嗰張海邊小鎮好啱做呢張。**

| # | 要有咩 | 擺喺 |
|---|---|---|
| 1 | → 小鎮廣場 路口 | (0.42, 0.98) 底部 |
| 2 | → 小屋區入口 路口 | (0.78, 0.28) 右上 |

**Prompt：**

```
Top-down 45-degree pixel art game map, vertical 9:16 portrait, a seaside
walking park. A pale winding path enters at the bottom edge and leaves at the
upper right. Trees, flower beds, benches, lamp posts, a low stone wall along
the sea on one side. Flat consistent scale, sky no more than the top fifth.
Warm daylight, blue sea. Detailed pixel art, the path clearly lighter than
the grass. ABSOLUTELY NO people, NO animals, NO characters.
```

---

### 4. 小屋區入口（`小屋區入口_日` / `_夜` / `_清晨`）

**三個版本**（多咗清晨，5–7 點限定）。

| # | 要有咩 | 擺喺 |
|---|---|---|
| 1 | **我的小屋** 門 | (0.18, 0.63) 左邊，一間得意細屋 |
| 2 | → 小鎮廣場 路口 | (0.44, 0.98) 底部 |
| 3 | → 散步公園 路口 | (0.845, 0.355) 右上 |

**Prompt：**

```
Top-down 45-degree pixel art game map, vertical 9:16 portrait, entrance to a
village of small cottages. One cute cottage with a clearly visible painted
front door on the left side. A pale path enters at the bottom edge and leaves
at the upper right. A wooden village gate or arch. Flat consistent scale, sky
no more than the top fifth. Warm daylight. Detailed pixel art, clear path.
ABSOLUTELY NO people, NO animals, NO characters.
```

清晨版：`Warm daylight` → `Early dawn, soft pink and gold light, low mist, long soft shadows`。

---

### 5. 碼頭市集（`碼頭市集_日.webp` / `_夜.webp`）

**家長專區。** 五個攤檔，每個都係一個功能。

| # | 攤檔 | 擺喺 | 賣咩 |
|---|---|---|---|
| 1 | 管理自我介紹卡 | (0.26, 0.60) | 卡片攤 |
| 2 | 新增孩子檔案 | (0.47, 0.50) | 登記處 |
| 3 | 付款訂閱 | (0.68, 0.60) | 收銀／票務 |
| 4 | 認領失物區 | (0.72, 0.63) | 失物招領 |
| 5 | 保安 | (0.47, 0.72) | 保安亭 |
| 6 | → 小鎮中心 路口 | (0.47, 0.98) | 底部 |

⚠️ **五個攤檔要分得開、望落去唔同款**。3 同 4 好近（0.68 / 0.72），
畫嗰陣要拉開少少，唔好兩個攤黐埋一齊。

**呢張最需要 NPC** —— 五個攤主。你畫空攤，我擺人。

**Prompt：**

```
Top-down 45-degree pixel art game map, vertical 9:16 portrait, a harbour
market on a wooden pier. FIVE clearly separated market stalls with different
awning colours and different goods on the counters, spread across the middle
of the image with walking space between them, plus a small security booth. A
pale plank walkway runs from the bottom edge up between the stalls. Boats and
sea in the background. Flat consistent scale, sky no more than the top fifth.
Warm daylight. Detailed pixel art. The stalls are EMPTY — no stallholders.
ABSOLUTELY NO people, NO animals, NO characters.
```

---

### 室內（8 張）

室內簡單好多：**一個房間、一個正面視角、要撳嘅嘢擺喺中間**。
唔使走路，所以唔使諗走道。

| 檔名 | 要有咩 | 擺喺 |
|---|---|---|
| `戲院大堂.webp` | **接待處櫃檯**（要企到個職員 NPC） | (0.36, 0.58) |
| | 入場門（通去 1 號廳） | (0.64, 0.52) |
| `戲院1號廳.webp` | 大銀幕 | (0.50, 0.28) |
| `Hero Studio.webp` | 中間：答題枱／黑板 | (0.50, 0.62) |
| | 左邊門：戲院大堂 | (0.16, 0.36) |
| | 右邊門：圖書館 | (0.85, 0.36) |
| `MEE圖書館.webp` | 書架／閱讀枱 | (0.50, 0.55) |
| `MEE 珍藏館.webp` | 中間展示牆 | (0.50, 0.45) |
| | 左門：碎片拼合室 | (0.16, 0.52) |
| | 右門：卡冊珍藏館 | (0.84, 0.52) |
| `MEE珍藏卡冊.webp` | 卡冊枱 | (0.50, 0.42) |
| `MEE碎片收集.webp` | 碎片牆（**六格**，唔好畫九格） | (0.50, 0.40) |
| `Buddy Cafe.webp` | 掃 QR 嘅枱 | (0.45, 0.50) |
| `我的小屋.webp` | 關於我 (0.30, 0.55)、更新卡 (0.80, 0.62)、好友冊 (0.16, 0.76) |

**室內 prompt 範本：**

```
Pixel art interior of a [房間描述], vertical 9:16 portrait, viewed from the
front at a slight downward angle. [要撳嘅嘢] is clearly visible in the
middle of the room. Warm lamp light, wooden floor, cosy detailed props.
Detailed pixel art, clean readable shapes.
ABSOLUTELY NO people, NO animals, NO characters.
```

⚠️ **碎片收集室畫六格，唔好畫九格。** 產品規則係同一時間六個主題，
畫咗九格就會有三格永遠係空 —— 之前已經因為呢個爭拗過一次。

---

## 第三部分：NPC（角色）

背景唔畫角色，角色全部係獨立檔案擺上去。

| | |
|---|---|
| 格式 | `.webp` 或 `.png`，**透明底** |
| 高度 | 512 px 左右（闊度隨佢） |
| 姿勢 | 企定、面向鏡頭或者略側、**全身** |
| ⚠️ 位置 | **腳底要貼近圖片底邊** —— 下面留白會令佢浮喺半空 |
| 放邊 | `public/assets/uploads/NPC/` |

**先做呢幾隻：**

1. `usher.webp` —— 戲院職員（**最急**，接待處而家空咗個位）
2. `stall-card.webp` / `stall-child.webp` / `stall-pay.webp` /
   `stall-lost.webp` / `stall-security.webp` —— 碼頭五個攤主
3. 廣場閒人一兩隻做氣氛

**NPC prompt 範本：**

```
Pixel art character sprite, full body, standing, facing the viewer,
[角色描述 e.g. a friendly cinema usher in a red uniform with a small cap,
holding a stack of tickets]. Transparent background. Feet at the very bottom
edge of the image. Same art style as a cosy European pixel art town game.
Single character only, no background, no scenery.
```

---

## 第四部分：交圖前自己 check 一次

- [ ] 941 × 1672？
- [ ] **一個角色／動物都冇？**
- [ ] 天空唔多過頂部 1/5？
- [ ] 由底到頂比例差唔多（唔係風景畫透視）？
- [ ] 每個要求嘅出入口都望到、都撳得落手？
- [ ] 走道同兩邊顏色對比夠大？
- [ ] 日夜兩版建築位置一模一樣？
- [ ] 門大概 1/10 圖高（主角係 1/16）？

---

## 附：出咗圖之後我要做啲乜

你上載 → 我要重畫嗰張圖嘅 **walk mask**（邊度行得到）。
呢個係我手做嘅，一張圖大約十分鐘，所以：

**一次過交一張，我試完 scale 啱先做下一張** —— 好過十二張一齊出完
先發現角度唔啱要全部重畫。
