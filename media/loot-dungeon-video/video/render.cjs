// node render.cjs <dir> stills t1,t2,...   -> <dir>/still-<t>.png
// node render.cjs <dir> video <out.mp4> [fps] -> frames piped to ffmpeg (no audio)
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');
(async () => {
  const [dir, mode, arg, fpsArg, fromArg, toArg] = process.argv.slice(2);
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('file://' + path.join(dir, 'index.html'));
  await p.evaluate(() => window.ready);
  const canvas = await p.$('#c');
  if (mode === 'stills') {
    for (const t of arg.split(',').map(Number)) {
      await p.evaluate((t) => window.render(t), t);
      await canvas.screenshot({ path: path.join(dir, `still-${t}.png`) });
    }
  } else {
    const fps = Number(fpsArg || 30);
    const dur = await p.evaluate(() => window.DURATION);
    const n = Math.round(dur * fps);
    const from = Number(fromArg || 0), to = Math.min(n, Number(toArg || n));
    const ff = spawn('ffmpeg', ['-loglevel', 'error', '-y', '-f', 'image2pipe', ...(process.env.JPEG ? ['-c:v', 'mjpeg'] : []), '-framerate', String(fps), '-i', '-', '-c:v', 'libx264', '-preset', 'medium', '-crf', '17', '-pix_fmt', 'yuv420p', arg], { stdio: ['pipe', 'inherit', 'inherit'] });
    for (let i = from; i < to; i++) {
      await p.evaluate((t) => window.render(t), i / fps);
      const buf = await canvas.screenshot(process.env.JPEG ? { type: 'jpeg', quality: 95 } : { type: 'png' });
      if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
      if (i % 300 === 0) console.log(`frame ${i}/${n}`);
    }
    ff.stdin.end();
    await new Promise((r) => ff.on('close', r));
  }
  if (errs.length) console.log('PAGE ERRORS', errs);
  await b.close();
})();
