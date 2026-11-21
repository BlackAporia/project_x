# Loot Dungeon video (creator bounty, StarkWare-sponsored)

A ~2:18 1080p video of the owner's first Loot Dungeon run, made for the lootsurvivor.io creator bounty
(deadline Sunday 22.11.2026, tags @LootSurvivor @lootproject, submit the post link in the Telegram
"Content Submission" channel). Everything here rebuilds the video from data; nothing is a screen recording.

## The run (all from the chain / lootsurvivor API, 20–21.11.2026)

- Game `0x0100000000001ec400000400000000060000000001c878ba01144c4d00048b41` on the Beast Mode core
  (`0x03cafe…1dd2`), Loot Bag dungeon `0x03921001…622f`, settings #6, bag **#7876**, entry bought for **51 $SURVIVOR**
  with the Cartridge account `0x03b318…0e82`.
- 93 moves, level 26, 711 XP, 302 gold unspent, killed at move 93 by "Foe Bite" Poltergeist (T3 Magical, L76, 594 HP).
- 14 beasts slain, 9 collected: Surtr (T1 Brute, "Apocalypse Shadow", move 71), Tengu, Kamaitachi, Kikimora, Bugbear,
  Enfield, Leshy, two Brownies. As of 21.11: 6 Mega, 3 evolving (done 21.11 14:25 UTC).
- Leaderboard: #79 of 501 runs (top 16%). Dungeon: 1,353 beasts collected, 824 staked, 22 Mega, 12 taken (20.11).
- `video/story.json` is the packet-by-packet replay (`npm run bot -- v2-story --game <id>` on CI).

## Layout

- `video/index.html` – the whole video as one canvas page: `render(t)` draws frame t (scenes, cues from `timing.js`).
- `video/render.cjs` – Playwright: `node render.cjs <dir> stills 5,12,…` or
  `JPEG=1 node render.cjs <dir> video out.mp4 30 <fromFrame> <toFrame>` (run 4 ranges in parallel, then concat).
- `video/music3.py` – procedural upbeat soundtrack timed to `timing.js` (`python3 music3.py music.wav`).
- `tools/align.py` – forced alignment of the script (`video/paragraphs.json`) to a voiceover with PocketSphinx
  (`python3 -m venv asr && asr/bin/pip install pocketsphinx`; audio as 16 kHz mono s16le raw).
- `tools/timing2.py` – scene slots + word cues + reading pauses from the alignment → `timing.js` and `gaps.json`
  (silence inserted into the voice after dense scenes; keeps the total under X's 2:20 limit).
- `cover/` – the Megas cover (`cover.html`, `node shot.cjs` renders the 6-Mega and 9/9-Mega versions at 3200×1800).
- `source/` – the owner's screenshots and the second voiceover (Lumea TTS).
- `video/script-and-post.md` – voiceover script, X post texts, checklist.

## Pipeline (what the last cut did)

1. Voice → raw: `ffmpeg -i voice.mp3 -ac 1 -ar 16000 -f s16le vo.raw`; align: `asr/bin/python tools/align.py vo.raw video/paragraphs.json align.json`.
2. Timing: `python3 tools/timing2.py align.json video/timing.js gaps.json`.
3. Voice with pauses + clean-up chain (highpass, light afftdn, EQ, de-ess, compressor, subtle echo), split at the
   `gaps.json` points with silence between (ffmpeg `-filter_complex_script`).
4. Music: `python3 video/music3.py music.wav`; mix: music at ~0.5 under the voice with light sidechain ducking,
   `loudnorm=I=-14:TP=-1.2`.
5. Render 4 frame ranges in parallel (JPEG frames), concat, encode `libx264 -crf 21`, mux the mix.

## Next step (planned)

Replace the TTS voice and the procedural music/SFX with better ones from lumea.app (owner's account), keep the same
script (or update `paragraphs.json`), re-run steps 1–5. Optional: rebuild the finale with all 9 Megas once the owner
sends a new "Your Megas" screenshot.
