#!/usr/bin/env python3
"""
人聲 mp3 批次處理：去風聲、剪走前後空白、變聲成小女孩。
保留原本嘅語氣、節奏同音調起伏（速度完全唔改）。

  python3 process.py <輸入夾> <輸出夾>
  PRESET=soft|balanced|bright   選音色（預設 balanced）
"""
import glob, io, json, os, subprocess, sys
import numpy as np, soundfile as sf
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from denoise import voice_bounds, denoise

SR = 44100
# 原素材兩聲道內容完全一樣，單聲道輸出零損失兼細一半。
CHANNELS = os.environ.get("CHANNELS", "1")
BITRATE  = os.environ.get("BITRATE", "128k")
PAD_HEAD, PAD_TAIL = 0.05, 0.12

# PITCH = 音高倍數（決定聽落幾高音）
# FORMANT = 共振峰倍數（決定聽落個人幾細個）。兩者分開控制係關鍵：
#   一齊升到 1.25 會過分「縮短聲道」，變得又尖又假。細路仔聲道大約
#   比成年女性短 15%，所以 FORMANT 1.13–1.18 先係自然嘅細路質感。
PRESETS = {
    "soft":     dict(PITCH=1.20, FORMANT=1.13, PRES=1.2, HARSH=-2.5, AIR=0.8, AGGR=1.1),
    "balanced": dict(PITCH=1.24, FORMANT=1.15, PRES=1.5, HARSH=-2.0, AIR=1.0, AGGR=1.2),
    "bright":   dict(PITCH=1.26, FORMANT=1.18, PRES=2.0, HARSH=-1.5, AIR=1.4, AGGR=1.2),
}
P = PRESETS[os.environ.get("PRESET", "balanced")]

# 高通只斬到 100Hz（v1 斬到 110Hz 三級太狠，抽走咗聲音嘅暖厚感，
# 係「機械聲」嘅幫兇）。餘下低頻風噪交畀 log-MMSE 處理。
HP = "highpass=f=100:poles=2,highpass=f=100:poles=2"

def run(cmd):
    r = subprocess.run(cmd, capture_output=True)
    if r.returncode: raise RuntimeError(f"{cmd[:8]}\n{r.stderr.decode()[-800:]}")
    return r.stdout

def decode(path, af=None):
    c = ["ffmpeg", "-v", "error", "-i", path] + (["-af", af] if af else [])
    return sf.read(io.BytesIO(run(c + ["-ac", "1", "-ar", str(SR), "-f", "wav", "-"])))

def voice_chain():
    k, tgt = P["FORMANT"], P["PITCH"]
    p = tgt / k
    return (
        # 第一步：重採樣令音高同共振峰一齊升 k 倍
        f"asetrate={SR}*{k},aresample={SR},"
        # 第二步：rubberband 還原長度，再單獨補音高（formant=preserved 令共振峰
        # 停喺 k 倍唔會再升）。淨效果：音高 {tgt}x、共振峰 {k}x、速度不變。
        # 特別注意：唔好開 smoothing／transients=smooth —— 實測會令諧噪比跌
        # 0.5dB 以上，即係聽落最「機械」嗰個設定。
        f"rubberband=tempo={1/k:.6f}:pitch={p:.6f}:formant=preserved:"
        f"pitchq=quality:channels=together,"
        f"highpass=f=120:poles=2,"                                    # 清走升調後嘅低頻殘餘
        f"equalizer=f=2600:t=q:w=0.9:g={P['PRES']},"                  # 清澈度／咬字
        f"equalizer=f=6500:t=q:w=1.2:g={P['HARSH']},"                 # 壓走升調後最刺耳嗰段
        f"treble=f=11000:t=q:w=0.7:g={P['AIR']},"                     # 少少空氣感，唔加喺刺耳區
        f"deesser=i=0.2:m=0.5:f=0.5,"
        # 壓縮放輕（v1 用 2.5:1 太扁，扼殺咗活潑感）
        f"acompressor=threshold=-18dB:ratio=2:attack=15:release=250,"
        f"loudnorm=I=-16:TP=-1.5:LRA=11,"
        f"aresample={SR}"           # 註：soxr 引擎接喺 loudnorm 後會 hang
    )

def main(src, dst):
    os.makedirs(dst, exist_ok=True)
    files = sorted(glob.glob(os.path.join(src, "*.mp3")))
    chain, report = voice_chain(), []
    for path in files:
        name = os.path.basename(path)
        orig, _ = decode(path)
        hp, _ = decode(path, HP); hp = hp[:len(orig)]

        v_start, v_end, noise_idx, floor_db = voice_bounds(hp, SR)
        clean = denoise(hp, SR, noise_idx, aggr=P["AGGR"], floor_db=-20.0)

        a = max(0, int((v_start - PAD_HEAD) * SR))
        b = min(len(clean), int((v_end + PAD_TAIL) * SR))
        if b - a < int(0.3 * SR): a, b = 0, len(clean)
        y = clean[a:b].copy()
        fi, fo = int(0.015*SR), int(0.030*SR)
        y[:fi] *= np.linspace(0, 1, fi); y[-fo:] *= np.linspace(1, 0, fo)

        tmp = os.path.join(dst, ".stage.wav")
        sf.write(tmp, y, SR, subtype="PCM_24")
        out = os.path.join(dst, name)
        run(["ffmpeg", "-v", "error", "-y", "-i", tmp, "-af", chain,
             "-ac", CHANNELS, "-c:a", "libmp3lame", "-b:a", BITRATE, "-write_xing", "1", out])

        dur = len(decode(out)[0]) / SR
        report.append(dict(檔案=name, 原長=round(len(orig)/SR, 2), 新長=round(dur, 2),
                           頭剪=round(a/SR, 2), 尾剪=round((len(clean)-b)/SR, 2),
                           原底噪dB=round(float(floor_db), 1)))
        print(f"✓ {name:38s} {len(orig)/SR:5.2f}s → {dur:5.2f}s")
    st = os.path.join(dst, ".stage.wav")
    if os.path.exists(st): os.remove(st)
    json.dump(report, open(os.path.join(dst, "_report.json"), "w"), ensure_ascii=False, indent=1)
    print(f"\n完成 {len(report)}/{len(files)} 個檔案 → {dst}/  (preset={os.environ.get('PRESET','balanced')})")

if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "raw",
         sys.argv[2] if len(sys.argv) > 2 else "out")
