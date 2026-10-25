// Leaderboard snapshot for the dashboard. The board that counts for the bot is the V2 Proving Grounds board
// (lootsurvivor.io reads it from api-v2-next by game core + minter id); the legacy Denshokan indexer has no V2
// games and is kept as `legacy` for reference. Live players still come from Denshokan.
import { MAINNET } from '../chain/config.ts';
import { levelFromXp } from '../game/combat.ts';
import { liveTokens, topTokens, type DenshokanToken } from '../chain/denshokan.ts';
import { DataStore } from '../runner/datastore.ts';

const V2_API = process.env.V2_API_URL ?? 'https://api-v2-next.up.railway.app';
const PG_MINTER = Number(process.env.PROVING_GROUNDS_MINTER_ID ?? 10);

const row = (t: DenshokanToken, i: number) => {
  const xp = Number(t.currentScore);
  return {
    rank: i + 1,
    tokenId: t.tokenId,
    player: t.playerName || null,
    owner: t.ownerAddress,
    xp,
    level: levelFromXp(xp),
    gameOver: t.gameOver,
    updated: t.lastUpdatedAt ?? null,
    settingsId: t.settingsId ?? null,
  };
};

type V2Row = { tokenId: string; owner: string; score: number; gameOver: boolean; settled?: boolean; lastActionAt?: string };

async function v2Board(minter: number, limit: number): Promise<{ total: number; rows: V2Row[] }> {
  const q = new URLSearchParams({ game_core: MAINNET.gameCoreV2, minter_id: String(minter), limit: String(limit), offset: '0' });
  const r = await fetch(`${V2_API}/games/leaderboard?${q}`, { headers: { accept: 'application/json' } });
  if (!r.ok) throw new Error(`V2 leaderboard: ${r.status}`);
  const d = (await r.json()) as { data?: V2Row[]; total?: number };
  return { total: d.total ?? d.data?.length ?? 0, rows: d.data ?? [] };
}

export async function runLeaderboardCommand(opts: { dataDir: string; limit: number }): Promise<void> {
  const store = new DataStore(opts.dataDir);
  const accounts = store.botAccounts([process.env.MAINNET_ACCOUNT_ADDRESS, store.readJson<{ account?: string }>('status.json', {}).account]);
  const isBot = (owner: string) => {
    try {
      return accounts.some((a) => BigInt(owner || '0x0') === BigInt(a));
    } catch {
      return false;
    }
  };
  const [pg, legacy, live] = await Promise.all([
    v2Board(PG_MINTER, Math.max(50, opts.limit)).catch((e) => {
      console.log(`V2 Proving Grounds board unavailable: ${(e as Error).message}`);
      return null;
    }),
    topTokens(opts.limit).catch(() => [] as DenshokanToken[]),
    liveTokens(30).catch(() => [] as DenshokanToken[]),
  ]);
  const entries = pg
    ? pg.rows.map((r, i) => ({ rank: i + 1, tokenId: r.tokenId, player: null, owner: r.owner, xp: Number(r.score), level: levelFromXp(Number(r.score)), gameOver: r.gameOver, settled: r.settled ?? null, updated: r.lastActionAt ?? null, settingsId: 0, bot: isBot(r.owner) }))
    : legacy.map(row).map((e) => ({ ...e, bot: isBot(e.owner) }));
  const botBest = entries.find((e) => e.bot) ?? null;
  store.writeJson('leaderboard.json', {
    updated: new Date().toISOString(),
    board: pg ? { name: 'Proving Grounds', minterId: PG_MINTER, total: pg.total } : { name: 'legacy (Denshokan)', total: legacy.length },
    entries,
    legacy: legacy.length ? { top: legacy.slice(0, 10).map(row) } : null,
    live: live.map(row).map((r) => ({ ...r, rank: undefined })),
    bot: { accounts, bestRank: botBest?.rank ?? null, bestXp: botBest?.xp ?? null, inTop: entries.filter((e) => e.bot).map((e) => e.rank) },
    target: entries[0] ? { xp: entries[0].xp, level: entries[0].level } : null,
  });
  // history of the top score / bot best for the progress chart
  const hist = store.readJson<Array<{ t: string; top1: number; top10: number; bot: number | null; board?: string }>>('leaderboard-history.json', []);
  hist.push({ t: new Date().toISOString(), top1: entries[0]?.xp ?? 0, top10: entries[9]?.xp ?? 0, bot: botBest?.xp ?? null, board: pg ? 'proving-grounds' : 'legacy' });
  store.writeJson('leaderboard-history.json', hist.slice(-2000));
  console.log(
    `leaderboard (${pg ? `Proving Grounds, ${pg.total} games` : 'legacy'}): top ${entries[0]?.xp ?? '-'} xp` +
      (botBest ? `, bot best #${botBest.rank} (${botBest.xp} xp), bot places ${entries.filter((e) => e.bot).map((e) => e.rank).join(', ')}` : ', bot not in the top'),
  );
}
