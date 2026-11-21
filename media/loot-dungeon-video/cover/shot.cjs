const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 2 });
  for (const [v, out] of [['now', 'cover-6-mega.png'], ['done', 'cover-9-mega.png']]) {
    await p.goto('file://' + path.join(__dirname, 'cover.html') + '?v=' + v);
    await p.evaluate(() => document.fonts.ready);
    await p.waitForTimeout(300);
    await p.screenshot({ path: path.join(__dirname, out) });
  }
  await b.close();
})();
