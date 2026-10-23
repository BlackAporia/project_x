// Download the public lootsurvivor.io frontend (index + every lazily loaded JS chunk) for protocol analysis:
// practice mode, dungeon settings and the V2 commit_action encoding live in these chunks.
//   node scripts/dump-frontend.mjs <outDir> [siteUrl]
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const out = process.argv[2] ?? 'frontend-dump';
const site = process.argv[3] ?? 'https://lootsurvivor.io/';
mkdirSync(join(out, 'assets'), { recursive: true });

const seen = new Set();
const queue = [];
const enqueue = (url) => {
  const u = new URL(url, site).toString();
  if (!seen.has(u) && new URL(u).host === new URL(site).host) {
    seen.add(u);
    queue.push(u);
  }
};

const html = await (await fetch(site)).text();
writeFileSync(join(out, 'index.html'), html);
for (const m of html.matchAll(/(?:src|href)="([^"]+\.(?:js|css|json))"/g)) enqueue(m[1]);

let bytes = 0;
while (queue.length) {
  const url = queue.shift();
  const res = await fetch(url);
  if (!res.ok) {
    console.log(`skip ${res.status} ${url}`);
    continue;
  }
  const text = await res.text();
  bytes += text.length;
  const name = new URL(url).pathname.replace(/^\//, '').replace(/[^\w./-]/g, '_');
  mkdirSync(join(out, name, '..'), { recursive: true });
  writeFileSync(join(out, name), text);
  if (url.endsWith('.js')) {
    for (const m of text.matchAll(/["'`(]((?:\.\/|\/)?(?:assets\/)?[\w.-]+\.js)["'`)]/g)) {
      const ref = m[1];
      if (!/^[\w.-]+-[\w-]{6,}\.js$/.test(ref.split('/').pop())) continue; // hashed vite chunks only
      enqueue(ref.startsWith('/') ? ref : ref.startsWith('./') ? new URL(ref, url).toString() : ref.startsWith('assets/') ? '/' + ref : new URL(ref, url).toString());
    }
  }
}
console.log(`downloaded ${seen.size} files, ${(bytes / 1e6).toFixed(1)} MB into ${out}`);
