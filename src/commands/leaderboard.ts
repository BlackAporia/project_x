// Mainnet leaderboard + live players snapshot (Denshokan indexer) for the dashboard.
import { levelFromXp } from '../game/combat.ts';
import { liveTokens, topTokens, type DenshokanToken } from '../chain/denshokan.ts';
import { DataStore } from '../runner/datastore.ts';

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

export async function runLeaderboardCommand(opts: { dataDir: string; limit: number }): Promise<void> {
  const store = new DataStore(opts.dataDir);
  const bot = (process.env.MAINNET_ACCOUNT_ADDRESS || store.readJson<{ account?: string }>('status.json', {}).account || '').toLowerCase();
  const [top, live] = await Promise.all([topTokens(opts.limit), liveTokens(30).catch(() => [] as DenshokanToken[])]);
  const entries = top.map(row);
  const isBot = (owner: string) => !!bot && BigInt(owner || '0x0') === BigInt(bot);
  const botBest = entries.find((e) => isBot(e.owner)) ?? null;
  store.writeJson('leaderboard.json', {
    updated: new Date().toISOString(),
    entries,
    live: live.map(row).map((r) => ({ ...r, rank: undefined })),
    bot: bot ? { account: bot, bestRank: botBest?.rank ?? null, bestXp: botBest?.xp ?? null } : null,
    target: entries[0] ? { xp: entries[0].xp, level: entries[0].level } : null,
  });
  // history of the top score / bot best for the progress chart
  const hist = store.readJson<Array<{ t: string; top1: number; top10: number; bot: number | null }>>('leaderboard-history.json', []);
  hist.push({ t: new Date().toISOString(), top1: entries[0]?.xp ?? 0, top10: entries[9]?.xp ?? 0, bot: botBest?.xp ?? null });
  store.writeJson('leaderboard-history.json', hist.slice(-2000));
  console.log(`leaderboard: ${entries.length} entries, top ${entries[0]?.xp ?? '-'} xp${botBest ? `, bot best rank #${botBest.rank}` : ''}`);
}
