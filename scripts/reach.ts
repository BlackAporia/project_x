// Probability of reaching deep levels (up to the leaderboard top) by multilevel splitting.
// Usage: node --import tsx scripts/reach.ts [dungeon|v1] [policy ...]   (env: GAMES, EFFORT, LEVELS)
import { loadParams } from '../src/ai/params.ts';
import { dungeonEngineSettings } from '../src/game/dungeons.ts';
import { EvalPool } from '../src/learn/pool.ts';
import { reachProbabilities } from '../src/sim/splitting.ts';

const dungeon = process.argv[2] ?? 'v1';
const policies = process.argv.slice(3);
if (!policies.length) policies.push('policy/policy.json');
const games = Number(process.env.GAMES ?? 4000);
const effort = Number(process.env.EFFORT ?? 2000);
const levels = (process.env.LEVELS ?? '10,15,20,25,30,35,40,45,51').split(',').map(Number);
const pool = new EvalPool();
if (dungeon !== 'v1') pool.settings = dungeonEngineSettings(dungeon).settings;
const seeds = Array.from({ length: games }, (_, i) => 60_000_000 + i);
for (const path of policies) {
  const t0 = Date.now();
  const stages = await pool.split(loadParams(path), seeds, levels, effort, 1);
  const reach = reachProbabilities(stages);
  console.log(`${path} (${dungeon}, ${Math.round((Date.now() - t0) / 1000)}s)`);
  for (let i = 0; i < stages.length; i++) {
    const s = stages[i];
    const r = reach[i];
    console.log(`  L${String(s.level).padEnd(3)} stage ${s.reached}/${s.tried} (${((100 * s.reached) / Math.max(1, s.tried)).toFixed(1)}%)  P(reach)=${r.p.toExponential(2)}  log10=${(r.logP / Math.LN10).toFixed(2)}±${(r.logSe / Math.LN10).toFixed(2)}`);
  }
}
await pool.close();
process.exit(0);
