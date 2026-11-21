# Scene slots + word cues with reading pauses: silence is inserted into the voice after dense scenes so the
# viewer has time to read them. Writes timing.js and gaps.json (split points in the raw voice for ffmpeg).
#   python3 timing2.py align.json timing.js gaps.json
import json, re, sys

A = json.load(open(sys.argv[1]))
LEAD = 0.5
MEGAS = 6.5
words0 = [(re.sub(r'\(\d+\)', '', w), a, b) for w, a, b in A['words']]
P0 = {pi: (a, b) for pi, a, b in A['paragraphs']}


def word_end(seq, after):
    seq = seq.split()
    for i in range(len(words0) - len(seq) + 1):
        if words0[i][1] >= after and all(words0[i + j][0] == seq[j] for j in range(len(seq))):
            return words0[i + len(seq) - 1][2]
    raise SystemExit('not found ' + ' '.join(seq))


between = lambda p: round((P0[p][1] + P0[p + 1][0]) / 2, 3)  # pause point after paragraph p
# (raw voice time, seconds of silence, label)
GAPS = [
    (between(1), 1.5, 'bag'),
    (between(3), 2.0, 'gear'),
    (round(word_end('escapes worked', P0[4][0]) + 0.12, 3), 1.5, 'chart'),
    (between(7), 2.0, 'haul'),
] + [(between(p), 1.6, f'tip{p - 8}') for p in range(9, 15)] + [
    (between(15), 2.0 + MEGAS, 'nums+megas'),
]
GAPS.sort()
shift = lambda t: t + sum(g for s, g, _ in GAPS if s <= t)
f = lambda t: round(LEAD + shift(t), 3)
W = [(w, f(a), f(b)) for w, a, b in words0]
ps = {pi: (f(a), f(b)) for pi, (a, b) in P0.items()}


def find(seq, after=0.0, which='start'):
    seq = seq.split()
    for i in range(len(W) - len(seq) + 1):
        if W[i][1] >= after and all(W[i + j][0] == seq[j] for j in range(len(seq))):
            return W[i][1] if which == 'start' else W[i + len(seq) - 1][2]
    raise SystemExit('not found: ' + ' '.join(seq))


S = lambda pi: round(ps[pi][0] - 0.3, 3)
tips0 = round(ps[9][0] - 0.4, 3)  # the haul runs through "What I learned"; the tips scene starts at tip 1
nums_end = round(ps[15][1] + 2.0 + 0.3, 3)
scenes = {
    'hook': [0, S(1)], 'bag': [S(1), S(2)], 'ways': [S(2), S(3)], 'gear': [S(3), S(4)], 'chart': [S(4), S(5)],
    'surtr': [S(5), S(6)], 'death': [S(6), S(7)], 'haul': [S(7), tips0], 'tips': [tips0, S(15)],
    'nums': [S(15), nums_end], 'megas': [nums_end, S(16)],
}
total = round(ps[16][1] + 3.4, 2)
scenes['outro'] = [S(16), total]
r = lambda x: round(x, 3)
c0 = scenes['chart'][0]
cues = {
    'chartKeys': [[0, 0], [r(find('first kill') - c0), 1.5], [r(find('move three', which='end') - c0), 3], [r(find('fourteen', which='end') - c0), 14],
                  [r(find('ran from') - c0), 21], [r(find('escapes worked', which='end') - c0), 37], [r(find('by move fifty') - c0), 43],
                  [r(find('tengu', which='end') - c0), 57], [r(find('seventy one', after=ps[4][0], which='end') - c0), 71]],
    'surtrDrop': r(find('seventy eight', after=ps[5][0]) - scenes['surtr'][0]),
    'surtrMega': r(find('today') - scenes['surtr'][0]),
    'deathAmbush': r(find('one ambush') - scenes['death'][0]),
    'deathDrop': r(find('became seventy', which='end') - scenes['death'][0] - 0.25),
    'deathName': r(find('a level seventy six') - scenes['death'][0]),
    'deathDead': r(find('dead at level') - scenes['death'][0]),
    'deathGold': r(find('three hundred and two') - scenes['death'][0]),
    'haulMega': r(find('three of them') - scenes['haul'][0]),
    'haulOther': r(find('the other six') - scenes['haul'][0]),
    'tipStarts': [r(ps[i][0] - 0.25 - scenes['tips'][0]) for i in range(9, 15)],
    'numsMine': r(find('my first run') - scenes['nums'][0]),
}
cues['tipStarts'][0] = 0.15
T = {'scenes': scenes, 'cues': cues, 'total': total, 'lead': LEAD}
open(sys.argv[2], 'w').write('window.T=' + json.dumps(T) + ';\n')
json.dump({'lead': LEAD, 'total': total, 'gaps': GAPS}, open(sys.argv[3], 'w'))
for k, v in scenes.items():
    print(f'{k:6s} {v[0]:7.2f} {v[1]:7.2f}  {v[1] - v[0]:5.2f}s')
print('tips each', [round(b - a, 2) for a, b in zip(cues['tipStarts'], cues['tipStarts'][1:] + [scenes['tips'][1] - scenes['tips'][0]])])
print('total', total)
