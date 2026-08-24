#!/usr/bin/env python3
"""
人聲 mp3 批次處理：
  1. 陡斜高通斬走低頻風噪
  2. 頻譜門控降噪（用檔案自己頭尾嘅無人聲段做噪音指紋）
  3. 剪走前後空白無人聲位（中間停頓保留，唔影響語氣節奏）
  4. rubberband 變聲成小女孩：只升音高 + 共振峰，唔改速度
     → 語速、停頓、音調起伏（語氣）原封不動
  5. 齒音處理、輕微壓縮、響度標準化
"""
import glob, io, json, os, subprocess, sys
import numpy as np, soundfile as sf
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from denoise import voice_bounds, denoise

SRC  = sys.argv[1] if len(sys.argv) > 1 else "raw"
DST  = sys.argv[2] if len(sys.argv) > 2 else "out"
PITCH = float(os.environ.get("PITCH", "1.25"))    # +3.9 半音；女聲 F0 ~220Hz → ~275Hz
OVER, FGAIN = 1.5, 0.15                           # 降噪力度（保守，護住人聲）
PAD_HEAD, PAD_TAIL = 0.05, 0.12                   # 頭尾各留少少氣口
HP = "highpass=f=110:poles=2,highpass=f=110:poles=2,highpass=f=110:poles=2"
SR = 44100

def run(cmd, stdin=None):
    r = subprocess.run(cmd, input=stdin, capture_output=True)
    if r.returncode:
        raise RuntimeError(f"{cmd[:8]}\n{r.stderr.decode()[-800:]}")
    return r.stdout

def decode(path, af=None):
    c = ["ffmpeg", "-v", "error", "-i", path]
    if af: c += ["-af", af]
    return sf.read(io.BytesIO(run(c + ["-ac", "1", "-ar", str(SR), "-f", "wav", "-"])))

os.makedirs(DST, exist_ok=True)
files = sorted(glob.glob(os.path.join(SRC, "*.mp3")))
report = []

for path in files:
    name = os.path.basename(path)
    if os.path.exists(os.path.join(DST, name)) and os.environ.get("RESUME"):
        print(f"· {name} 已存在，略過"); continue
    orig, _ = decode(path)
    hp, _   = decode(path, HP)
    hp = hp[:len(orig)]

    # ---- 定位人聲頭尾 + 抽噪音指紋 ----
    v_start, v_end, noise_idx, floor_db = voice_bounds(hp, SR)

    # ---- 頻譜門控降噪 ----
    clean = denoise(hp, SR, noise_idx, over=OVER, floor_gain=FGAIN)

    # ---- 剪走前後空白 ----
    a = max(0, int((v_start - PAD_HEAD) * SR))
    b = min(len(clean), int((v_end + PAD_TAIL) * SR))
    if b - a < int(0.3 * SR):                      # 保險：唔好剪到冇聲
        a, b = 0, len(clean)
    y = clean[a:b].copy()

    # 頭尾淡入淡出，避免爆音
    fi, fo = int(0.015 * SR), int(0.030 * SR)
    y[:fi]  *= np.linspace(0, 1, fi)
    y[-fo:] *= np.linspace(1, 0, fo)

    tmp = os.path.join(DST, ".stage.wav")
    sf.write(tmp, y, SR, subtype="PCM_24")

    # ---- 變聲 + 修飾 + 輸出 ----
    chain = (
        f"rubberband=pitch={PITCH}:formant=shifted:pitchq=quality:"
        f"transients=smooth:smoothing=on:channels=together,"
        f"highpass=f=140:poles=2,"                              # 升調後殘餘低頻再清一次
        f"treble=g=2.2:f=4500:width_type=q:width=0.7,"           # 補返降噪蝕咗嘅高頻齒音
        f"deesser=i=0.35:m=0.5:f=0.5,"                           # 但唔好刺耳
        f"acompressor=threshold=-20dB:ratio=2.5:attack=10:release=200,"
        f"loudnorm=I=-16:TP=-1.5:LRA=11,"
        f"aresample={SR}"   # 註：soxr 引擎接喺 loudnorm 後會 hang，用預設引擎
    )
    out = os.path.join(DST, name)
    run(["ffmpeg", "-v", "error", "-y", "-i", tmp,
         "-af", chain, "-ac", "2", "-c:a", "libmp3lame", "-b:a", "192k",
         "-write_xing", "1", out])

    dur = len(decode(out)[0]) / SR
    report.append(dict(檔案=name, 原長=round(len(orig)/SR, 2), 新長=round(dur, 2),
                       頭剪=round(a/SR, 2), 尾剪=round((len(clean)-b)/SR, 2),
                       原底噪dB=round(float(floor_db), 1)))
    print(f"✓ {name:38s} {len(orig)/SR:5.2f}s → {dur:5.2f}s  "
          f"(頭剪 {a/SR:.2f}s 尾剪 {(len(clean)-b)/SR:.2f}s)")

st = os.path.join(DST, ".stage.wav")
if os.path.exists(st): os.remove(st)
json.dump(report, open(os.path.join(DST, "_report.json"), "w"), ensure_ascii=False, indent=1)
print(f"\n完成 {len(report)}/{len(files)} 個檔案 → {DST}/")
