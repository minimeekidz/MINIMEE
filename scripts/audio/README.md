# 人聲 mp3 批次處理（去風聲 / 剪空白 / 變聲小女孩）

把一批人聲 mp3 處理成小女孩聲，同時保留原本嘅語氣、節奏同音調起伏。

```bash
pip install numpy scipy soundfile      # 另需 ffmpeg（要有 librubberband）
python3 scripts/audio/process.py <輸入夾> <輸出夾>
PRESET=soft python3 scripts/audio/process.py raw out    # soft / balanced（預設）/ bright
```

## 處理流程

1. **去風聲** — 100Hz 二級高通 ×2。實測噪音能量集中喺 20–250Hz，係典型低頻風噪。
2. **降噪** — `denoise.py`：log-MMSE（Ephraim-Malah）配 decision-directed 先驗 SNR
   估計，用檔案自己頭尾嗰段（本來就要剪走嘅無人聲位）抽真實噪音指紋。
3. **剪走前後空白** — 以每個檔自身底噪定門檻，只剪頭尾；句子中間嘅停頓保留。
4. **變聲** — 音高同共振峰**分開控制**（見下）。速度完全冇改，所以語速、停頓、
   抑揚頓挫全部原封不動。
5. **修飾** — 2.6kHz 清澈度、6.5kHz 削刺耳、11kHz 空氣感、de-esser、輕壓縮、
   響度標準化到 −16 LUFS。

## 兩個關鍵設計決定

**音高同共振峰要分開。** 用 `asetrate` 先令兩者一齊升 `FORMANT` 倍，再用
`rubberband` 配 `formant=preserved` 還原長度兼單獨補音高。淨效果係音高升
`PITCH` 倍、共振峰只升 `FORMANT` 倍。一齊升足 1.25 倍等於把聲道縮短 25%，
過分咗，聽落又尖又假；細路仔聲道大約比成年女性短 15%，所以 1.13–1.18 先
自然。實測共振峰由 1.25 降到 1.15，2–8kHz 刺耳頻段佔比由 +2.46 跌到 +1.31 個
百分點。

**唔好開 rubberband 嘅 `smoothing` / `transients=smooth`。** 名一聽似係令
聲音順滑，實測反而係六個設定入面諧噪比最低嗰個（相位塗抹最嚴重），亦即係
聽落最「機械」。關咗之後 36/36 個檔案嘅諧噪比都升，全部高過原檔。

## 已知伏位

- 呢個 ffmpeg build 嘅 `afftdn` / `anlmdn` 對呢批素材會**加噪**（實測 SNR 反而
  跌 1–2 dB），所以降噪自己寫。
- `aresample=...:resampler=soxr` 接喺 `loudnorm` 後面會**死鎖**（loudnorm 內部
  升到 192kHz）。用預設重採樣引擎。

## 量化驗證

`metrics.py` 提供聽感代理指標：HNR（諧噪比，越低越似機械）、2–8kHz 佔比同
頻譜重心（刺耳程度）、停頓段 log 頻譜跳動（musical noise）。
