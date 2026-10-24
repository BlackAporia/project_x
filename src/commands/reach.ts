// `reach`: probability of reaching deep levels (up to the leaderboard top) for one or more policies, by multilevel
// splitting. Writes <data>/reach-compare.json and prints a table.
import { loadParams } from '../ai/params.ts';
import { dungeonEngineSettings } from '../game/dungeons.ts';
import { EvalPool } from '../learn/pool.ts';
import { DataStore } from '../runner/datastore.ts';
import { reachProbabilities } from '../sim/splitting.ts';

export async function runReachCommand(opts: { dataDir: string; dungeon: string; policies: string[]; games: number; effort: number; levels: number[]; seed: number; out?: string }): Promise<void> {
  const pool = new EvalPool();
  if (opts.dungeon !== 'v1') pool.settings = dungeonEngineSettings(opts.dungeon).settings;
  const seeds = Array.from({ length: opts.games }, (_, i) => 60_000_000 + opts.seed * 1_000_003 + i);
  const results: unknown[] = [];
  for (const path of opts.policies) {
    const t0 = Date.now();
    const params = loadParams(path);
    const stages = await pool.split(params, seeds, opts.levels, opts.effort, opts.seed);
    const reach = reachProbabilities(stages);
    console.log(`${path} [${params.version}] (${opts.dungeon}, ${Math.round((Date.now() - t0) / 1000)}s)`);
    stages.forEach((s, i) => {
      const r = reach[i];
      console.log(`  L${String(s.level).padEnd(3)} ${s.reached}/${s.tried}  P(reach)=${r.p.toExponential(2)}  log10=${(r.logP / Math.LN10).toFixed(2)}±${(r.logSe / Math.LN10).toFixed(2)}`);
    });
    results.push({ policy: path, version: params.version, stages, reach: reach.map((r) => ({ level: r.level, p: r.p, log10Se: r.logSe / Math.LN10 })) });
  }
  await pool.close();
  new DataStore(opts.dataDir).writeJson(opts.out ?? 'reach-compare.json', { updated: new Date().toISOString(), dungeon: opts.dungeon, games: opts.games, effort: opts.effort, results });
}
