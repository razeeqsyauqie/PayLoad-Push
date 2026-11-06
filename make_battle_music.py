# Writes src/music/battle.mp3: an original in-game track (dance-pop groove with heroic brass), synthesised from scratch.
# Inspired by the feel of Overwatch and LE SSERAFIM only: no melodies or samples are taken from either.
import numpy as np, subprocess, pathlib
from scipy.signal import butter, lfilter

SR, BPM = 44100, 124
BEAT = 60 / BPM
BAR = 4 * BEAT
rng = np.random.default_rng(7)
root = pathlib.Path(__file__).parent
NOTE = {n: i for i, n in enumerate(['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'])}
def hz(name):  # 'A4' -> 440
    n, o = name[:-1], int(name[-1])
    return 440 * 2 ** ((NOTE[n] + 12 * (o + 1) - 69) / 12)

# ---- song layout (bars) ----
#  intro 4 | verse A 8 | build 4 | chorus 8 | heroic B 8 | chorus 8   = 40 bars, loops back to the verse groove
SECTIONS = [('intro', 4), ('verse', 8), ('build', 4), ('chorus', 8), ('hero', 8), ('chorus', 8)]
NBARS = sum(n for _, n in SECTIONS)
TAIL = 2.0
N = int((NBARS * BAR + TAIL) * SR)
mix = {k: np.zeros((N, 2)) for k in ('drums', 'bass', 'pad', 'lead', 'brass', 'fx')}
kicks = []

def lp(x, f, order=2):
    b, a = butter(order, min(f, SR / 2 - 100) / (SR / 2)); return lfilter(b, a, x)
def hp(x, f, order=2):
    b, a = butter(order, f / (SR / 2), 'high'); return lfilter(b, a, x)
def add(bus, t0, sig, pan=0.0, gain=1.0):
    i = int(t0 * SR); sig = sig[: max(0, N - i)]
    if sig.ndim == 1:
        l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
        sig = np.stack([sig * l * 1.414, sig * r * 1.414], 1)
    mix[bus][i:i + len(sig)] += sig * gain
def env(n, a, d, s, r, length):
    t = np.arange(n) / SR; e = np.ones(n) * s
    e[t < a] = t[t < a] / max(a, 1e-4)
    m = (t >= a) & (t < a + d); e[m] = 1 - (1 - s) * (t[m] - a) / d
    rel = t > length; e[rel] = s * np.exp(-(t[rel] - length) / max(r, 1e-3) * 4)
    return e
def saw(f, n, detune=0.0, phase=None):
    t = np.arange(n) / SR; ph = rng.random() if phase is None else phase
    return 2 * ((t * f * (1 + detune) + ph) % 1) - 1

# ---- drums ----
def kick(t0, g=1.0):
    n = int(0.45 * SR); t = np.arange(n) / SR
    f = 45 + 95 * np.exp(-t * 28)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 7.5)
    s[:200] += rng.standard_normal(200) * np.linspace(.5, 0, 200)
    add('drums', t0, np.tanh(s * 1.6), 0, 0.9 * g); kicks.append(t0)
def clap(t0, g=1.0):
    n = int(0.3 * SR); out = np.zeros(n)
    for k, d in enumerate((0, .011, .022)):
        i = int(d * SR); m = n - i; t = np.arange(m) / SR
        out[i:] += rng.standard_normal(m) * np.exp(-t * (60 if k < 2 else 16))
    out = hp(lp(out, 5200), 900)
    add('drums', t0, out, -.05, 0.42 * g); add('drums', t0 + .012, out * .6, .3, 0.18 * g)
def hat(t0, g=1.0, open_=False, pan=.25):
    n = int((0.22 if open_ else 0.05) * SR); t = np.arange(n) / SR
    s = hp(rng.standard_normal(n), 7500) * np.exp(-t * (14 if open_ else 70))
    add('drums', t0, s, pan, 0.16 * g)
def crash(t0, g=1.0):
    n = int(2.2 * SR); t = np.arange(n) / SR
    s = hp(rng.standard_normal((n, 2)).T, 4500).T * np.exp(-t * 2.2)[:, None]
    add('drums', t0, s, 0, 0.13 * g)
def riser(t0, dur):
    n = int(dur * SR); t = np.arange(n) / SR; x = rng.standard_normal(n)
    out = np.zeros(n); seg = 2048
    for i in range(0, n, seg):  # noise sweep up
        f = 400 + 9000 * (i / n) ** 2; out[i:i + seg] = lp(x[i:i + seg], f)[: len(out[i:i + seg])]
    add('fx', t0, out * (t / dur) ** 2, 0, 0.22)

# ---- tonal parts ----
def bass_note(t0, f, length, g=1.0):
    n = int((length + .08) * SR)
    s = saw(f, n, phase=0) * .6 + np.sin(2 * np.pi * f / 2 * np.arange(n) / SR) * .7
    s = lp(s, 900, 2) * env(n, .004, .12, .7, .05, length)
    add('bass', t0, np.tanh(s * 1.4), 0, 0.5 * g)
def pad_chord(t0, freqs, length, g=1.0, bright=1800):
    n = int((length + .4) * SR); out = np.zeros((n, 2))
    for f in freqs:
        for d, side in ((-.009, 0), (.009, 1), (-.004, 1), (.004, 0), (0, 0), (0, 1)):
            out[:, side] += saw(f, n, d)
    out = np.stack([lp(out[:, 0], bright), lp(out[:, 1], bright)], 1) * env(n, .03, .3, .75, .3, length)[:, None]
    add('pad', t0, out / (len(freqs) * 3), 0, 0.42 * g)
def pluck(t0, f, length=.18, g=1.0, pan=0.0):
    n = int((length + .25) * SR); t = np.arange(n) / SR
    s = saw(f, n, .003) + saw(f, n, -.003) + .5 * np.sign(np.sin(2 * np.pi * f * 2 * t))
    out = np.zeros(n); seg = 512
    for i in range(0, n, seg):  # filter closes fast: a bright pluck
        out[i:i + seg] = lp(s[i:i + seg], 600 + 6500 * np.exp(-i / SR * 9))[: len(out[i:i + seg])]
    out *= env(n, .002, .15, .35, .12, length)
    add('lead', t0, out, pan, 0.24 * g)
    add('lead', t0 + 3 * BEAT / 4, out * .35, -pan - .4, 0.24 * g)  # dotted echo
def brass(t0, freqs, length, g=1.0):
    n = int((length + .3) * SR); t = np.arange(n) / SR; out = np.zeros((n, 2))
    vib = 1 + .004 * np.sin(2 * np.pi * 5.2 * t) * np.clip(t * 2 - .3, 0, 1)
    for f in freqs:
        for d, side in ((-.005, 0), (.005, 1), (0, 0), (0, 1)):
            ph = np.cumsum(f * (1 + d) * vib) / SR
            out[:, side] += 2 * ((ph + rng.random()) % 1) - 1
    swell = 900 + 2600 * np.clip(t / .12, 0, 1)
    res = np.zeros_like(out); seg = 1024
    for i in range(0, n, seg):
        for c in (0, 1): res[i:i + seg, c] = lp(out[i:i + seg, c], swell[min(i, n - 1)])[: len(res[i:i + seg, c])]
    res *= env(n, .05, .2, .8, .2, length)[:, None]
    add('brass', t0, res / (len(freqs) * 2), 0, 0.5 * g)

# ---- harmony (A minor) ----
CH = {  # chord tones for pads/brass, bass root
  'Am': (['A3', 'C4', 'E4'], 'A1'), 'F': (['F3', 'A3', 'C4'], 'F1'), 'G': (['G3', 'B3', 'D4'], 'G1'),
  'Em': (['E3', 'G3', 'B3'], 'E1'), 'C': (['C4', 'E4', 'G4'], 'C2'), 'E': (['E3', 'G#3', 'B3'], 'E1'),
  'Dm': (['D3', 'F3', 'A3'], 'D2'),
}
PROG = {'intro': ['Am', 'F', 'G', 'Em'], 'verse': ['Am', 'F', 'G', 'Em'], 'build': ['F', 'G', 'Am', 'E'],
        'chorus': ['Am', 'F', 'C', 'G'], 'hero': ['F', 'G', 'Am', 'Am', 'Dm', 'G', 'C', 'E']}
# bass rhythm in 16ths (1 = note, 2 = octave up): syncopated, bouncy
BASS = [1, 0, 0, 1, 0, 0, 1, 0, 2, 0, 1, 0, 0, 1, 0, 0]
# the hook: 2-bar phrase, (16th step, note, length in 16ths)
HOOK_A = [(0, 'E5', 2), (3, 'D5', 1), (4, 'E5', 2), (6, 'G5', 2), (8, 'A5', 3), (11, 'G5', 1), (12, 'E5', 2), (14, 'D5', 2),
          (16, 'C5', 2), (19, 'D5', 1), (20, 'E5', 2), (22, 'D5', 2), (24, 'C5', 2), (26, 'B4', 2), (28, 'A4', 4)]
HOOK_B = [(0, 'E5', 2), (3, 'D5', 1), (4, 'E5', 2), (6, 'G5', 2), (8, 'A5', 3), (11, 'B5', 1), (12, 'C6', 2), (14, 'B5', 2),
          (16, 'A5', 2), (18, 'G5', 2), (20, 'E5', 3), (23, 'G5', 1), (24, 'A5', 6)]
VERSE_RIFF = [(0, 'A4', 1), (2, 'C5', 1), (3, 'E5', 1), (6, 'D5', 1), (8, 'C5', 1), (10, 'E5', 1), (11, 'A4', 1), (14, 'B4', 1)]
HERO_MEL = [('A4', 'C5', 'E5'), ('B4', 'D5', 'G5'), ('C5', 'E5', 'A5'), ('C5', 'E5', 'A5'),
            ('A4', 'D5', 'F5'), ('B4', 'D5', 'G5'), ('C5', 'E5', 'G5'), ('B4', 'E5', 'G#5')]

S16 = BEAT / 4
bar_i = 0
for sec, nb in SECTIONS:
    prog = PROG[sec]
    if sec in ('chorus', 'hero'): crash(bar_i * BAR, 1.1)
    for b in range(nb):
        t = (bar_i + b) * BAR; ch = prog[b % len(prog)]; tones, broot = CH[ch]
        last_bar = b == nb - 1
        # drums
        if sec != 'intro' or b >= 2:
            for q in range(4):
                if sec == 'build' and last_bar and q >= 2: continue
                kick(t + q * BEAT, .8 if sec == 'intro' else 1)
        if sec in ('verse', 'chorus', 'hero', 'build'):
            for q in (1, 3): clap(t + q * BEAT, 1.1 if sec == 'chorus' else .9)
        for e in range(8):
            if sec == 'intro' and b < 2 and e % 2 == 0: continue
            hat(t + e * BEAT / 2 + (BEAT / 4 if e % 2 == 0 else 0) * 0, .6 + .5 * (e % 2), open_=(e % 2 == 1 and sec == 'chorus'), pan=.25 if e % 2 else -.15)
        if sec in ('chorus', 'hero'):
            for s16 in (3, 7, 11, 15): hat(t + s16 * S16, .35, pan=-.3)
        if sec == 'build':
            n = 4 if b < 2 else (8 if b == 2 else 16)  # snare roll speeds up
            for k in range(n): clap(t + k * BAR / n, .35 + .5 * k / n)
            if b == 0: riser(t, 4 * BAR)
        if sec == 'verse' and b == nb - 1: riser(t + BAR / 2, BAR / 2)
        # bass
        if sec != 'intro' or b >= 2:
            f = hz(broot)
            for s, v in enumerate(BASS):
                if v and not (sec == 'build' and last_bar and s >= 8):
                    bass_note(t + s * S16, f * (2 if v == 2 else 1) * (2 if broot.endswith('1') else 1), S16 * 1.6)
        # pads
        bright = {'intro': 900, 'verse': 1300, 'build': 1000 + 600 * b, 'chorus': 2600, 'hero': 2200}[sec]
        if sec == 'chorus':  # pumping offbeat stabs in the chorus
            for q in range(4): pad_chord(t + q * BEAT + BEAT / 2, [hz(x) for x in tones], BEAT * .42, .9, bright)
        else:
            pad_chord(t, [hz(x) for x in tones], BAR * .98, .8, bright)
        # lead
        if sec == 'verse' and b % 2 == 0:
            for s, n, l in VERSE_RIFF: pluck(t + s * S16, hz(n), l * S16, .8, .2)
            for s, n, l in VERSE_RIFF: pluck(t + BAR + s * S16, hz(n) * (2 ** (2 / 12) if b % 4 == 2 else 1), l * S16, .7, -.2)
        if sec == 'chorus' and b % 2 == 0:
            hook = HOOK_A if (b // 2) % 2 == 0 else HOOK_B
            for s, n, l in hook: pluck(t + s * S16, hz(n), l * S16, 1.15, 0)
        if sec == 'intro' and b >= 2:
            for s, n, l in VERSE_RIFF: pluck(t + s * S16, hz(n), l * S16, .55, .2)
        # heroic brass
        if sec == 'hero':
            mel = HERO_MEL[b % len(HERO_MEL)]
            brass(t, [hz(x) for x in mel], BAR * .55, 1.0)
            brass(t + BAR * .625, [hz(x) for x in mel], BAR * .3, .8)
            brass(t + BAR * .875, [hz(mel[-1]) * 2 ** (2 / 12) if b % 2 else hz(mel[-1])], BAR * .1, .6)
        if sec == 'chorus' and b % 4 == 3:
            brass(t + 2 * BEAT, [hz(x) for x in tones] + [hz(tones[0]) * 2], 2 * BEAT, .7)
    bar_i += nb

# ---- sidechain: duck pad, bass and brass under each kick ----
duck = np.ones(N)
for k in kicks:
    i = int(k * SR); m = min(N - i, int(.3 * SR)); tt = np.arange(m) / SR
    duck[i:i + m] = np.minimum(duck[i:i + m], 1 - .55 * np.exp(-tt / .09))
for bus, amt in (('pad', 1), ('bass', .6), ('brass', .5)):
    mix[bus] *= (1 - amt * (1 - duck))[:, None]

LEVEL = {'drums': 1.0, 'bass': .9, 'pad': .8, 'lead': .95, 'brass': .85, 'fx': .7}
out = sum(mix[k] * v for k, v in LEVEL.items())
# simple reverb-ish space for lead and brass: a few filtered echoes
wet = mix['lead'] * .6 + mix['brass'] * .5 + mix['pad'] * .3
for d, g in ((.031, .3), (.047, .26), (.073, .22), (.113, .18), (.167, .14)):
    i = int(d * SR); w = np.zeros_like(wet); w[i:] = wet[:-i]; out[:, ::-1] += w * g * .5
# make it loop: fold the tail back onto the start
L = int(NBARS * BAR * SR)
out[:N - L] += out[L:]
out = out[:L]
out = np.tanh(out / np.max(np.abs(out)) * 1.1) / np.tanh(1.1) * .89
dst = root / 'src' / 'music'; dst.mkdir(exist_ok=True)
wav = root / 'art-src' / 'battle.wav'
import wave
with wave.open(str(wav), 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((out * 32767).astype('<i2').tobytes())
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', str(wav), '-b:a', '160k', str(dst / 'battle.mp3')], check=True)
print('battle.mp3', round(L / SR, 1), 's', (dst / 'battle.mp3').stat().st_size // 1024, 'KB')
