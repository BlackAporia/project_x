// `v2-leaderboard`: leaderboards of the V2 (commit-reveal) dungeons from the lootsurvivor.io API (the legacy
// Denshokan leaderboard does not include V2 games). Probes minter ids, prints each board's size and top scores and
// where the bot's best games would rank. Writes data/v2-leaderboard.json.
import { MAINNET } from '../chain/config.ts';
import { DataStore } from '../runner/datastore.ts';

const API = process.env.V2_API_URL ?? 'https://api-v2-next.up.railway.app';

async function getJson(url: string): Promise<unknown> {
  const r = await fetch(url, { headers: { accept: 'application/json' } });
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  return r.json();
}

export async function runV2LeaderboardCommand(opts: { minters: number[]; dataDir: string; scores: number[] }): Promise<void> {
  const core = MAINNET.gameCoreV2;
  const boards: Record<string, unknown> = {};
  for (const m of opts.minters) {
    const q = new URLSearchParams({ game_core: core, minter_id: String(m), limit: '25', offset: '0' });
    try {
      const d = (await getJson(`${API}/games/leaderboard?${q}`)) as { data?: Array<Record<string, unknown>>; total?: number };
      const rows = d.data ?? [];
      if (!rows.length && !d.total) continue;
      const ranks: Record<string, unknown> = {};
      for (const s of opts.scores) {
        const rq = new URLSearchParams({ score: String(s), game_core: core, minter_id: String(m) });
        ranks[s] = await getJson(`${API}/games/rank?${rq}`).catch((e) => `error: ${(e as Error).message}`);
      }
      boards[m] = { total: d.total, top: rows, ranks };
      console.log(`minter ${m}: ${d.total ?? rows.length} game(s); top: ${rows.slice(0, 10).map((r) => JSON.stringify(r).slice(0, 160)).join('\n    ')}`);
      console.log(`  rank of scores ${opts.scores.join(', ')}: ${JSON.stringify(ranks).slice(0, 400)}`);
    } catch (e) {
      console.log(`minter ${m}: ${(e as Error).message}`);
    }
  }
  new DataStore(opts.dataDir).writeJson('v2-leaderboard.json', { updated: new Date().toISOString(), api: API, gameCore: core, boards });
}
