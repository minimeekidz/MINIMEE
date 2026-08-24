"""
降噪：log-MMSE（Ephraim-Malah）+ decision-directed 先驗 SNR 估計。

點解唔用頻譜減法：硬減會令個別頻格喺有無之間跳，聽落就係一嚿嚿金屬味嘅
musical noise。log-MMSE 用前一幀嘅估計去平滑先驗 SNR，增益變化連續得多，
基本上冇 musical noise，人聲高頻細節亦保留得好啲。
"""
import numpy as np
from scipy.signal import stft, istft
from scipy.special import exp1

NFFT, HOP = 1024, 256

def frame_db(x, sr, hop=0.02):
    h = int(hop * sr)
    n = max(len(x) - h, 1)
    e = np.array([np.sqrt(np.mean(x[i:i+h]**2)) for i in range(0, n, h)])
    return 20*np.log10(e + 1e-12), h

def voice_bounds(x, sr):
    """回傳 (人聲起秒, 人聲止秒, 噪音段 sample 索引, 底噪 dB)。"""
    d, h = frame_db(x, sr)
    real = d > -100                       # 排除數碼靜音
    floor = np.percentile(d[real], 10) if real.any() else -60.0
    thr = max(floor + 10.0, d.max() - 38.0)
    sp = np.flatnonzero(d > thr)
    if len(sp) == 0:
        return 0.0, len(x)/sr, np.array([], dtype=int), floor
    nf = [i for i in list(range(sp[0])) + list(range(sp[-1]+1, len(d))) if real[i]]
    idx = (np.concatenate([np.arange(i*h, min((i+1)*h, len(x))) for i in nf])
           if nf else np.array([], dtype=int))
    return sp[0]*h/sr, min((sp[-1]+1)*h/sr, len(x)/sr), idx.astype(int), floor

def _noise_psd(x, noise_idx, sr, mag):
    if len(noise_idx) > NFFT * 3:
        _, _, N = stft(x[noise_idx], sr, nperseg=NFFT, noverlap=NFFT-HOP, window="hann")
        return (np.abs(N)**2).mean(1)
    p = np.percentile(mag.sum(0), 10)
    sel = mag[:, mag.sum(0) <= p]
    return (sel**2).mean(1) if sel.shape[1] >= 3 else np.zeros(mag.shape[0])

def denoise(x, sr, noise_idx, aggr=1.0, floor_db=-20.0, alpha=0.98):
    """
    aggr      噪音估計倍數，1.0 = 照量度值（越大越乾淨但越易蝕人聲）
    floor_db  保留幾多原始底噪。唔好設得太低——完全抽乾反而唔自然。
    alpha     decision-directed 平滑係數，越大越唔會有 musical noise
    """
    f, t, X = stft(x, sr, nperseg=NFFT, noverlap=NFFT-HOP, window="hann")
    mag, ph = np.abs(X), np.angle(X)
    lam = _noise_psd(x, noise_idx, sr, mag) * aggr**2
    if not np.any(lam): return x
    lam = np.maximum(lam, 1e-16)[:, None]
    gmin = 10 ** (floor_db / 20.0)

    gamma_all = mag**2 / lam                       # 後驗 SNR
    G = np.empty_like(mag)
    prev = np.maximum(gamma_all[:, 0] - 1.0, 0.0)  # 首幀用最大似然起步
    for k in range(mag.shape[1]):
        gamma = np.minimum(gamma_all[:, k], 1e4)   # 夾住，防止數值爆掉
        xi = np.maximum(alpha * prev + (1 - alpha) * np.maximum(gamma - 1.0, 0.0), 1e-6)
        v = np.clip(xi / (1.0 + xi) * gamma, 1e-8, 500.0)
        g = np.clip(xi / (1.0 + xi) * np.exp(0.5 * exp1(v)), gmin, 1.0)
        G[:, k] = g
        prev = g**2 * gamma                        # 今幀嘅乾淨語音估計，餵去下一幀
    _, y = istft(G * mag * np.exp(1j*ph), sr, nperseg=NFFT, noverlap=NFFT-HOP, window="hann")
    return y[:len(x)].astype(np.float32)
