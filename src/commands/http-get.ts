// `http-get`: GET public JSON endpoints (e.g. the lootsurvivor.io PvP / Budokan APIs) and print status + body.
export async function runHttpGetCommand(opts: { urls: string[] }): Promise<void> {
  for (const url of opts.urls) {
    try {
      const r = await fetch(url, { headers: { accept: 'application/json' } });
      const body = await r.text();
      console.log(`GET ${url}: HTTP ${r.status} ${body.replace(/\s+/g, ' ').slice(0, 1500)}`);
      // the whole body too (the log keeps 1500 characters): data/http/<host+path>.txt
      if (process.env.BOT_DATA_DIR && r.ok) {
        const { mkdirSync, writeFileSync } = await import('node:fs');
        const { join } = await import('node:path');
        const dir = join(process.env.BOT_DATA_DIR, 'http');
        mkdirSync(dir, { recursive: true });
        writeFileSync(join(dir, `${url.replace(/^https?:\/\//, '').replace(/[^A-Za-z0-9._-]+/g, '_').slice(0, 180)}.txt`), body);
      }
    } catch (e) {
      console.log(`GET ${url}: ${(e as Error).message}`);
    }
  }
}
