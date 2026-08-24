# 人聲 mp3 批次處理（去風聲 / 剪空白 / 變聲小女孩）

把一批人聲 mp3 處理成小女孩聲，同時保留原本嘅語氣、節奏同音調起伏。

```bash
pip install numpy scipy soundfile      # 另需 ffmpeg（要有 librubberband）
python3 scripts/audio/process.py <輸入資料夾> <輸出資料夾>
PITCH=1.30 python3 scripts/audio/process.py raw out    # 想再細聲啲/大聲啲就改 PITCH
```

## 處理流程

1. **去風聲** — 三級 110Hz 高通（36 dB/oct）。實測噪音能量集中喺 20–250Hz，係典型風噪／低頻隆隆聲。
2. **降噪** — `denoise.py` 嘅頻譜門控：用檔案自己頭尾嗰段（本來就要剪走嘅無人聲位）抽真實噪音指紋，做過減，再喺時間同頻率兩個方向平滑增益，避免 musical noise。
3. **剪走前後空白** — 以每個檔自身底噪為基準定門檻，只剪頭尾，句子中間嘅停頓保留（唔會改到語氣）。頭尾各留少少氣口 + 淡入淡出防爆音。
4. **變聲** — `rubberband` 只升音高 1.25 倍（約 +3.9 半音），`formant=shifted` 令共振峰跟住升 → 細細個小朋友嘅聲道感；**速度完全冇改**，所以語速、停頓、抑揚頓挫全部原封不動。
5. **修飾** — 補返降噪蝕咗嘅高頻、de-esser 壓齒音、輕微壓縮、EBU R128 響度標準化到 −16 LUFS。

## 已知伏位

- 呢個 ffmpeg build 嘅 `afftdn` / `anlmdn` 對呢批素材會**加噪**（實測 SNR 反而跌 1–2 dB），所以改為自己寫頻譜減法。
- `aresample=...:resampler=soxr` 接喺 `loudnorm` 後面會**死鎖**（loudnorm 內部升到 192kHz）。用預設重採樣引擎。
