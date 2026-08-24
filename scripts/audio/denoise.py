"""頻譜門控降噪：用檔案頭尾真實無人聲段做噪音指紋，做過減 + 平滑，避免 musical noise。"""
import numpy as np
from scipy.signal import stft, istft
from scipy.ndimage import convolve1d

def frame_db(x, sr, hop=0.02):
    h = int(hop * sr)
    n = max(len(x) - h, 1)
    e = np.array([np.sqrt(np.mean(x[i:i+h]**2)) for i in range(0, n, h)])
    return 20*np.log10(e + 1e-12), h

def voice_bounds(x, sr):
    """回傳 (人聲起, 人聲止) 秒數，同埋噪音區 sample 索引。"""
    d, h = frame_db(x, sr)
    real = d > -100                       # 排除數碼靜音
    floor = np.percentile(d[real], 10) if real.any() else -60.0
    thr = max(floor + 10.0, d.max() - 38.0)
    sp = np.flatnonzero(d > thr)
    if len(sp) == 0:
        return 0.0, len(x)/sr, np.array([], dtype=int), floor
    noise_frames = [i for i in list(range(sp[0])) + list(range(sp[-1]+1, len(d))) if real[i]]
    idx = np.concatenate([np.arange(i*h, min((i+1)*h, len(x))) for i in noise_frames]) \
          if noise_frames else np.array([], dtype=int)
    return sp[0]*h/sr, min((sp[-1]+1)*h/sr, len(x)/sr), idx.astype(int), floor

def denoise(x, sr, noise_idx, over=2.2, floor_gain=0.10, nfft=1024, hop=256):
    """噪音指紋唔夠長就退回用最靜嘅 10% 幀。"""
    f, t, X = stft(x, sr, nperseg=nfft, noverlap=nfft-hop, window="hann")
    mag, ph = np.abs(X), np.angle(X)
    if len(noise_idx) > nfft * 3:
        _, _, Nspec = stft(x[noise_idx], sr, nperseg=nfft, noverlap=nfft-hop, window="hann")
        nm = np.abs(Nspec)
    else:
        p = np.percentile(mag.sum(0), 10)
        nm = mag[:, mag.sum(0) <= p]
        if nm.shape[1] < 3: return x
    prof = nm.mean(1) + 1.0 * nm.std(1)                  # 每個頻段嘅噪音門檻
    gain = np.clip((mag - over*prof[:, None]) / (mag + 1e-12), floor_gain, 1.0)
    # 時間、頻率兩個方向平滑增益 → 壓走 musical noise
    k = np.array([.25, .5, .25])
    for _ in range(2):
        gain = convolve1d(gain, k, axis=1, mode="nearest")   # 時間方向
        gain = convolve1d(gain, k, axis=0, mode="nearest")   # 頻率方向
    _, y = istft(gain * mag * np.exp(1j*ph), sr, nperseg=nfft, noverlap=nfft-hop, window="hann")
    return y[:len(x)].astype(np.float32)
