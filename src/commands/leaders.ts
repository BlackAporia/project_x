// `leaders`: download the full event history of the top leaderboard games (the API behind lootsurvivor.io's
// watch/replay pages) so their decisions can be studied: stat allocation per level, purchases, fights vs flights.
// Output: <data>/leaders/<tokenId>.json (raw) and <data>/leaders-index.json.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { topTokens } from '../chain/denshokan.ts';
import { retry } from '../chain/rpc.ts';
import { DataStore } from '../runner/datastore.ts';

const V1_API = process.env.GAME_API_URL ?? 'https://super-death-mountain-production.up.railway.app';
const V2_API = process.env.GAME_API_V2_URL ?? 'https://api-v2-next.up.railway.app';

async function getJson(url: string): Promise<unknown | null> {
  try {
    return await retry(
      async () => {
        const r = await fetch(url, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(30_000) });
        if (r.status === 404) return null;
        if (!r.ok) throw new Error(`${r.status} ${url}`);
        return r.json();
      },
      { tries: 2, label: url.slice(0, 90) },
    );
  } catch {
    return null;
  }
}

export async function runLeadersCommand(opts: { dataDir: string; limit: number }): Promise<void> {
  const store = new DataStore(opts.dataDir);
  const dir = join(opts.dataDir, 'leaders');
  mkdirSync(dir, { recursive: true });
  const top = await topTokens(opts.limit);
  const index: unknown[] = [];
  for (const t of top) {
    let api = V1_API;
    let adventurer = await getJson(`${api}/adventurer/${t.tokenId}`);
    if (!adventurer) {
      api = V2_API;
      adventurer = await getJson(`${api}/adventurer/${t.tokenId}`);
    }
    const events = adventurer ? await getJson(`${api}/adventurer/${t.tokenId}/events`) : null;
    const n = Array.isArray((events as { events?: unknown[] } | null)?.events) ? (events as { events: unknown[] }).events.length : 0;
    writeFileSync(join(dir, `${t.tokenId}.json`), JSON.stringify({ token: t, api, adventurer, events }) + '\n');
    index.push({ tokenId: t.tokenId, xp: Number(t.currentScore), owner: t.ownerAddress, api, events: n, found: !!adventurer });
    console.log(`  ${t.tokenId.slice(0, 16)}… ${t.currentScore} xp: ${adventurer ? `${n} events (${api.includes('v2') ? 'v2' : 'v1'} api)` : 'not found'}`);
  }
  store.writeJson('leaders-index.json', { updated: new Date().toISOString(), games: index });
  console.log(`leaders: ${index.length} games saved to ${dir}`);
}
