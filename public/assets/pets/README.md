# 寵物圖放呢度

檔名用細楷英文＋連字號，例如 `shiba.png`、`penguin.png`。
唔好用空格、中文或者大楷 —— 網址會出事。

放好之後，網址就係 `/assets/pets/檔名`。

## 兩種格式都收

### 1. Sprite sheet（有真正行走動畫，最好）

一張透明背景 PNG，入面排晒所有動作幀：

- 每格同樣大細（建議 32×32 或 48×48）
- **4 行**，由上到下：向下行、向左行、向右行、向上行
- **每行 3 或 4 格**（幀）
- 背景一定要透明，唔可以有白底

上載完話低：每格幾多 px、每行幾多幀。

### 2. 單張去背圖（冇腳部動畫）

一張透明背景 PNG 就得。會用彈跳效果扮行路，睇得出係郁緊，
但唔會有真正嘅腳步。

## 而家有嘅圖

12 隻寵物（`front / standing` 一個角度），已轉成 webp、400×400、透明背景：

| 檔名 | 中文名 | English |
| --- | --- | --- |
| `sunshine-sheep.webp` | 大太陽羊 | Sunshine Sheep |
| `bao-hamster.webp` | 包子倉鼠 | Bao Hamster |
| `milk-cat.webp` | 牛奶貓 | Milk Carton Cat |
| `watermelon-shiba.webp` | 西瓜柴犬 | Watermelon Shiba |
| `wave-penguin.webp` | 海浪企鵝 | Wave Penguin |
| `aviator-chick.webp` | 飛行小雞 | Aviator Chick |
| `yarn-granny-mouse.webp` | 毛線鼠婆婆 | Yarn Granny Mouse |
| `heart-bunny.webp` | 愛心可愛兔 | Lovely Heart Bunny |
| `cowboy-pup.webp` | 牛仔小狗 | Cowboy Pup |
| `super-pig.webp` | 愛心超級豬 | Super Heart Pig |
| `spin-hedgehog.webp` | 旋轉刺蝟 | Spin Hedgehog |
| `kimono-calico.webp` | 和服三花貓 | Kimono Calico Cat |

主角圖：`hero-pair-a`、`hero-pair-b`、`hero-boy-c`、`hero-girl-c`。

## ⚠️ 兩個已知問題

**1. 12 隻寵物頭頂被切平咗。**
每張圖入面，最頂三行嘅闊度完全一樣（例如 42px、42px、42px），
自然嘅耳仔尖應該由幼慢慢變闊。即係生成嗰陣就切咗，唔係畫成咁。
缺失嘅像素救唔返，要重新生成。

重生成時：內容四邊各留至少 **40px 空白**，唔好貼住畫布邊。

**2. 主角圖係白底，唔係透明。**
做角色揀選畫面 OK，但入到遊戲會見到白色方塊。
要做遊戲角色就要透明背景版本。

## 重新生成時嘅規格

- 畫布 **720×720**，內容四邊留 ≥40px
- **透明背景 PNG**（RGBA）
- 每隻寵物最少要三個角度：`front`（向下行）、`back`（向上行）、
  `left_side`（向左行，向右我會鏡像）
- 有得揀嘅話，每個角度出 **2 幀**（站立 + 邁步），咁隻腳先真係郁

原始 PNG 唔會 commit 入 repo（太大）。轉換用 `sharp`，
場景 webp q82、寵物 webp q90 400×400。
