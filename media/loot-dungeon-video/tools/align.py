import re, sys, json
from pocketsphinx import Decoder
P = json.load(open(sys.argv[2]))
d = Decoder(samprate=16000, lm=None, logfn='/dev/null')
# extra pronunciations (CMU phones) for words the default dictionary lacks
EXTRA = {
  'surtr': 'S ER T ER', 'tengu': 'T EH NG G UW', 'katana': 'K AH T AA N AH', 'poltergeist': 'P OW L T ER G AY S T',
  'mega': 'M EH G AH', 'hp': 'EY CH P IY', 'dex': 'D EH K S', "i've": 'AY V', "here's": 'HH IH R Z', "it's": 'IH T S',
  "i'd": 'AY D', "bag's": 'B AE G Z', 'collectable': 'K AH L EH K T AH B AH L',
}
words = []
for i, p in enumerate(P):
    for w in re.findall(r"[A-Za-z'\-]+", p):
        for part in w.lower().split('-'):
            part = part.strip("'")
            if part: words.append((i, part))
missing = sorted({w for _, w in words if d.lookup_word(w) is None})
for w in missing:
    if w in EXTRA: d.add_word(w, EXTRA[w], True)
still = [w for w in missing if w not in EXTRA]
print('missing', missing, 'unresolved', still, file=sys.stderr)
d.set_align_text(' '.join(w for _, w in words))
raw = open(sys.argv[1], 'rb').read()
d.start_utt(); d.process_raw(raw, full_utt=True); d.end_utt()
segs = [(s.word, s.start_frame / 100, s.end_frame / 100) for s in d.seg() if s.word not in ('<s>', '</s>', '<sil>', '(NULL)')]
print('aligned words', len(segs), 'of', len(words), file=sys.stderr)
# paragraph starts: walk the aligned words in order with the expected word list
out = []
k = 0
for (pi, w), s in zip(words, segs):
    if not out or out[-1][0] != pi:
        out.append([pi, s[1], s[2]])
    out[-1][2] = s[2]
json.dump({'paragraphs': out, 'words': segs}, open(sys.argv[3], 'w'))
for pi, a, b in out: print(f'{pi:2d} {a:7.2f} {b:7.2f}  {P[pi][:50]}')
