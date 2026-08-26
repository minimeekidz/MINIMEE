"""聽感代理指標：HNR（越低越似機械/相位塗抹）、尖銳度、內部停頓嘅 musical noise。"""
import io, subprocess, numpy as np, soundfile as sf
from scipy.signal import stft

def load(p, af=None, sr=44100):
    c = ["ffmpeg","-v","error","-i",p] + (["-af",af] if af else []) + \
        ["-ac","1","-ar",str(sr),"-f","wav","-"]
    r = subprocess.run(c, capture_output=True)
    if r.returncode: raise RuntimeError(r.stderr.decode()[-500:])
    return sf.read(io.BytesIO(r.stdout))

def hnr(x, sr, fmin=70, fmax=600):
    """濁音幀嘅諧波對噪音比。相位塗抹、金屬味會令佢跌。"""
    N, H = int(0.045*sr), int(0.015*sr)
    out = []
    for i in range(0, len(x)-N, H):
        s = x[i:i+N]
        if 20*np.log10(np.sqrt(np.mean(s**2))+1e-12) < -42: continue
        s = (s - s.mean()) * np.hanning(N)
        c = np.correlate(s, s, "full")[N-1:]
        c = c / (c[0] + 1e-12)
        lo, hi = int(sr/fmax), int(sr/fmin)
        if hi >= len(c): continue
        r = c[lo:hi].max()
        if r <= 0.15 or r >= 0.999: continue
        out.append(10*np.log10(r/(1-r)))
    return float(np.mean(out)) if out else float("nan")

def sharpness(x, sr):
    """2–8kHz 佔比同頻譜重心：反映刺唔刺耳。"""
    _, _, S = stft(x, sr, nperseg=2048, noverlap=1536, window="hann")
    P = (np.abs(S)**2)
    keep = P.sum(0) > np.percentile(P.sum(0), 60)      # 只計有聲幀
    P = P[:, keep]
    f = np.linspace(0, sr/2, P.shape[0])
    tot = P.sum() + 1e-20
    hi = P[(f >= 2000) & (f < 8000)].sum() / tot
    cen = float((f[:, None]*P).sum() / tot)
    return hi*100, cen

def pause_artifact(x, sr):
    """句子之間低電平段嘅 log 頻譜跳動：musical noise 嘅代理。"""
    h = int(0.02*sr)
    e = np.array([np.sqrt(np.mean(x[i:i+h]**2)) for i in range(0, len(x)-h, h)])
    d = 20*np.log10(e+1e-12)
    lo = np.flatnonzero((d < d.max()-28) & (d > -100))
    if len(lo) < 8: return float("nan")
    idx = np.concatenate([np.arange(i*h, min((i+1)*h, len(x))) for i in lo])
    _, _, S = stft(x[idx], sr, nperseg=512, noverlap=384, window="hann")
    L = 20*np.log10(np.abs(S)+1e-10)
    f = np.arange(L.shape[0])*sr/512
    return float(L[f > 500].std(axis=1).mean())
