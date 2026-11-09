// `http-get`: GET public JSON endpoints (e.g. the lootsurvivor.io PvP / Budokan APIs) and print status + body.
export async function runHttpGetCommand(opts: { urls: string[] }): Promise<void> {
  for (const url of opts.urls) {
    try {
      const r = await fetch(url, { headers: { accept: 'application/json' } });
      console.log(`GET ${url}: HTTP ${r.status} ${(await r.text()).replace(/\s+/g, ' ').slice(0, 1500)}`);
    } catch (e) {
      console.log(`GET ${url}: ${(e as Error).message}`);
    }
  }
}
