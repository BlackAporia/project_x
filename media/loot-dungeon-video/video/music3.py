# Upbeat soundtrack for the Loot Dungeon video, timed to timing.js: C major, 112 BPM, I-V-vi-IV.
# Pad, pluck arpeggio, driving bass, four-on-the-floor kick, claps, hats, a bell melody, crashes and risers on
# the scene changes, a short minor tension for the death and a triumphant comeback for the haul and the Megas.
import json, sys, wave
import numpy as np

T = json.loads(open('timing.js').read().split('=', 1)[1].rstrip().rstrip(';'))
SC = T['scenes']; CU = T['cues']
SR = 44100
DUR = float(T['total'])
N = int(SR * DUR)
mix = np.zeros((N, 2))
BPM = 112
BEAT = 60 / BPM
BAR = 4 * BEAT
rng = np.random.default_rng(11)
D0, D1 = SC['death']

def midi(n): return 440.0 * 2 ** ((n - 69) / 12)
def in_death(t): return D0 <= t < D1
MAJOR = [[60, 64, 67], [55, 59, 62], [57, 60, 64], [53, 57, 60]]   # C G Am F
MINOR = [[57, 60, 64], [53, 57, 60], [50, 53, 57], [52, 56, 59]]   # Am F Dm E
def chord(t):
    prog = MINOR if in_death(t) else MAJOR
    return prog[int((t - (D0 if in_death(t) else 0)) / BAR) % 4]

def add(sig, start, gain=1.0, pan=0.0):
    i0 = int(start * SR)
    if i0 >= N or i0 < 0: return
    sig = sig[: N - i0]
    l = gain * np.sqrt(0.5 * (1 - pan)); r = gain * np.sqrt(0.5 * (1 + pan))
    mix[i0:i0 + len(sig), 0] += sig * l
    mix[i0:i0 + len(sig), 1] += sig * r

def env(L, a, d_rate):
    tt = np.arange(L) / SR
    return tt, np.minimum(1, tt / a) * np.exp(-tt * d_rate)

# ---------------------------------------------------------------- sections
def level(t):
    keys = [(0, .55), (SC['bag'][0], .7), (SC['chart'][0], .9), (SC['surtr'][0], 1.0), (D0, .5), (D1, 1.0),
            (SC['tips'][0], .8), (SC['nums'][0], .95), (SC['megas'][0], 1.0), (SC['outro'][0], .85), (DUR, .6)]
    for (a, va), (b, vb) in zip(keys, keys[1:]):
        if a <= t <= b: return va + (vb - va) * (t - a) / max(1e-6, b - a)
    return .6
drums_on = lambda t: t >= SC['bag'][0] and not in_death(t) and t < SC['outro'][0] + 2 * BAR
full = lambda t: (SC['chart'][0] <= t < D0) or (D1 <= t < SC['tips'][0]) or (SC['nums'][0] <= t < SC['outro'][0])

# pad: one chord per bar, soft detuned saws
t0 = 0.0
while t0 < DUR:
    L = int((BAR + 0.6) * SR); tt = np.arange(L) / SR
    e = np.minimum(1, tt / 0.25) * np.minimum(1, np.maximum(0, BAR + 0.6 - tt) / 0.6)
    sig = np.zeros(L)
    for n in chord(t0) + [chord(t0)[0] - 12]:
        for det in (-0.08, 0.07):
            f = midi(n) * 2 ** (det / 12)
            for h in range(1, 5): sig += np.sin(2 * np.pi * f * h * tt + h * 1.3) / (h * 1.8)
    add(sig * e / 34, t0, 0.5 * (0.7 if in_death(t0) else 1), -0.15)
    add(sig * e / 34, t0 + 0.011, 0.5 * (0.7 if in_death(t0) else 1), 0.15)
    t0 += BAR

# pluck arpeggio: 8ths in the intro/verses, 16ths in the full sections
t0 = 0.0; k = 0
while t0 < SC['outro'][1] - BAR:
    step = BEAT / 4 if full(t0) else BEAT / 2
    if in_death(t0):
        t0 += step; k += 1; continue
    ch = chord(t0); notes = ch + [c + 12 for c in ch]
    n = notes[[0, 2, 1, 3, 2, 4, 3, 5][k % 8]] + 12
    L = int(0.35 * SR); tt, e = env(L, 0.002, 11)
    ph = 2 * np.pi * midi(n) * tt
    sig = (np.sin(ph) + 0.45 * np.sin(2 * ph) + 0.2 * np.sin(3 * ph)) * e
    add(sig, t0, 0.075, 0.3 if k % 2 else -0.3)
    t0 += step; k += 1

# bass: driving 8ths on the root, pumped
t0 = SC['bag'][0]
while t0 < SC['outro'][0] + BAR:
    if not in_death(t0):
        n = chord(t0)[0] - 24
        L = int(BEAT / 2 * SR); tt = np.arange(L) / SR
        pump = np.minimum(1, tt / 0.06)
        sig = (np.sin(2 * np.pi * midi(n) * tt) + 0.35 * np.sin(4 * np.pi * midi(n) * tt)) * pump * np.exp(-tt * 3)
        add(sig, t0, 0.42)
    t0 += BEAT / 2

def kick():
    L = int(0.42 * SR); tt = np.arange(L) / SR
    f = 48 + 110 * np.exp(-tt * 35)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 8)
def clap():
    L = int(0.25 * SR); tt = np.arange(L) / SR
    nz = rng.standard_normal(L); nz = nz - np.concatenate([[0], nz[:-1]]) * 0.6
    e = np.exp(-tt * 22) * (1 + 0.6 * (np.sin(tt * 2 * np.pi * 90) > 0))
    return nz * e * 0.5
def hat(open_=False):
    L = int((0.18 if open_ else 0.05) * SR); tt = np.arange(L) / SR
    nz = rng.standard_normal(L); nz = np.diff(np.concatenate([[0], nz]))
    return nz * np.exp(-tt * (18 if open_ else 70))
K, CL = kick(), clap()
b = SC['bag'][0]; beat = 0
while b < SC['outro'][0] + 2 * BAR:
    if drums_on(b):
        add(K, b, 0.75)
        if beat % 2 == 1 and (full(b) or b >= SC['megas'][0]): add(CL, b, 0.32, 0.1)
        add(hat(True), b + BEAT / 2, 0.06, 0.35)
        if full(b):
            for q in (1, 3): add(hat(), b + q * BEAT / 4, 0.045, -0.3)
    b += BEAT; beat += 1
# death: slow heartbeat
b = D0
while b < D1:
    add(K * 0.9, b, 0.6); add(K * 0.6, b + 0.28, 0.45)
    b += BAR / 2

# bell melody (uplifting motif) in the hook, the haul, the Megas and the outro
MOTIF = [(76, 1), (74, .5), (72, .5), (67, 2), (74, 1), (72, .5), (71, .5), (67, 2), (72, 1), (71, .5), (69, .5), (64, 2), (69, 1), (72, .5), (74, .5), (76, 2)]
def bell(n, dur):
    L = int((dur * BEAT + 1.2) * SR); tt = np.arange(L) / SR
    f = midi(n)
    sig = (np.sin(2 * np.pi * f * tt) + 0.5 * np.sin(2 * np.pi * f * 2.0 * tt) * np.exp(-tt * 3) + 0.25 * np.sin(2 * np.pi * f * 3.01 * tt) * np.exp(-tt * 5))
    return sig * np.exp(-tt * 2.6) * np.minimum(1, tt / 0.004)
for a, b_ in [(0.0, SC['bag'][0]), (D1, SC['tips'][0]), (SC['megas'][0], SC['outro'][1] - 1.0)]:
    t0 = a; i = 0
    while t0 < b_:
        n, d = MOTIF[i % len(MOTIF)]
        add(bell(n, d), t0, 0.09, 0.2)
        t0 += d * BEAT; i += 1

# crashes on the scene changes, risers into the big moments, impacts on the HP drops
def crash(L=2.5):
    L = int(L * SR); tt = np.arange(L) / SR
    nz = rng.standard_normal(L); nz = np.diff(np.concatenate([[0], nz]))
    return nz * np.exp(-tt * 1.8) * 0.5
def riser(L=2.0):
    L = int(L * SR); tt = np.arange(L) / SR
    nz = rng.standard_normal(L) * (tt / tt[-1]) ** 2 * 0.25
    sweep = np.sin(2 * np.pi * np.cumsum(300 + 1500 * (tt / tt[-1]) ** 2) / SR) * (tt / tt[-1]) ** 2 * 0.12
    return nz + sweep
def boom(L=2.2, f0=50):
    L = int(L * SR); tt = np.arange(L) / SR
    f = f0 + 100 * np.exp(-tt * 12)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 2.4) + rng.standard_normal(L) * np.exp(-tt * 20) * 0.3
for name in ['bag', 'chart', 'haul', 'nums', 'megas', 'outro']:
    add(crash(), SC[name][0], 0.32)
for name in ['surtr', 'haul', 'megas']:
    add(riser(2.0), SC[name][0] - 2.0, 0.8)
add(boom(), SC['surtr'][0] + CU['surtrDrop'], 0.8)
add(crash(3.0), SC['surtr'][0] + CU['surtrMega'], 0.35)
add(boom(3.0, 40), D0 + CU['deathDrop'] - 0.3, 0.9)
add(boom(2.5, 55) * 0.6, SC['outro'][0] + 0.1, 0.6)

# dynamics, fades, soft clip, -1 dBFS
tgrid = np.arange(0, DUR, 0.01)
lv = np.interp(np.arange(N) / SR, tgrid, [level(x) for x in tgrid])
mix *= lv[:, None]
tt = np.arange(N) / SR
mix *= (np.minimum(1, tt / 0.8) * np.minimum(1, (DUR - tt) / 3.0))[:, None]
mix = np.tanh(mix * 1.15)
mix /= np.max(np.abs(mix)) / 10 ** (-1 / 20)
with wave.open(sys.argv[1] if len(sys.argv) > 1 else 'music3.wav', 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix * 32767).astype(np.int16).tobytes())
print('music', DUR, 's')
