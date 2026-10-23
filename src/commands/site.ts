// Aggregates the raw data files into site/data/summary.json for the dashboard.
import { existsSync, readFileSync } from 'node:fs';
import { DataStore, type GameRecord } from '../runner/datastore.ts';

function modeSummary(games: GameRecord[]) {
  const done = games.filter((g) => g.status === 'dead');
  const xp = done.map((g) => g.xp);
  const sorted = xp.slice().sort((a, b) => a - b);
  const mean = xp.length ? xp.reduce((s, x) => s + x, 0) / xp.length : 0;
  const last = done.slice(-20).map((g) => g.xp);
  const causes: Record<string, number> = {};
  for (const g of done) {
    const c = (g.deathCause || 'unknown').replace(/"[^"]+" /g, '');
    causes[c] = (causes[c] ?? 0) + 1;
  }
  const levels: Record<number, number> = {};
  for (const g of done) levels[g.level] = (levels[g.level] ?? 0) + 1;
  let best = 0;
  const bestOverTime: Array<{ t: string; xp: number }> = [];
  for (const g of done) {
    if (g.xp > best) {
      best = g.xp;
      bestOverTime.push({ t: g.ended, xp: g.xp });
    }
  }
  const checks = games.reduce((s, g) => s + (g.predictionChecks ?? 0), 0);
  const mism = games.reduce((s, g) => s + (g.predictionMismatches ?? 0), 0);
  return {
    games: done.length,
    inProgress: games.filter((g) => g.status === 'in_progress').length,
    errors: games.filter((g) => g.status === 'error').length,
    best: sorted[sorted.length - 1] ?? 0,
    bestLevel: done.reduce((m, g) => Math.max(m, g.level), 0),
    mean: Math.round(mean),
    median: sorted[Math.floor(sorted.length / 2)] ?? 0,
    p90: sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.9))] ?? 0,
    last20Mean: last.length ? Math.round(last.reduce((s, x) => s + x, 0) / last.length) : 0,
    transactions: games.reduce((s, g) => s + g.transactions, 0),
    reverts: games.reduce((s, g) => s + g.reverts, 0),
    predictionAccuracy: checks ? +(1 - mism / checks).toFixed(4) : null,
    deathCauses: Object.entries(causes)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12),
    levels,
    bestOverTime,
    top: done
      .slice()
      .sort((a, b) => b.xp - a.xp)
      .slice(0, 10)
      .map((g) => ({ id: g.id, xp: g.xp, level: g.level, deathCause: g.deathCause, ended: g.ended, policy: g.policy })),
  };
}

function readPolicy(): unknown {
  try {
    return existsSync('policy/policy.json') ? JSON.parse(readFileSync('policy/policy.json', 'utf8')) : null;
  } catch {
    return null;
  }
}

export function rebuildSummary(store: DataStore): void {
  const games = store.games();
  const modes = ['mainnet', 'practice', 'sim'] as const;
  const summary = {
    updated: new Date().toISOString(),
    modes: Object.fromEntries(modes.map((m) => [m, modeSummary(games.filter((g) => g.mode === m))])),
    runs: store.runs().slice(-30),
    policy: readPolicy(),
  };
  store.writeJson('summary.json', summary);
}

export async function runSiteCommand(opts: { dataDir: string }): Promise<void> {
  const store = new DataStore(opts.dataDir);
  rebuildSummary(store);
  console.log(`summary written to ${opts.dataDir}/summary.json`);
}
