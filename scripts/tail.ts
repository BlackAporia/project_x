// Upper-tail statistics of a policy (what matters for a leaderboard top-1): p99, p99.9, max, P(xp > targets).
// Usage: node --import tsx scripts/tail.ts <games> [dungeon|v1] [policy]
import { loadParams } from '../src/ai/params.ts';
import { dungeonEngineSettings } from '../src/game/dungeons.ts';
import { EvalPool } from '../src/learn/pool.ts';

const games = Number(process.argv[2] ?? 10000);
const dungeon = process.argv[3] ?? 'v1';
const policyPath = process.argv[4] ?? 'policy/policy.json';
const pool = new EvalPool();
if (dungeon !== 'v1') pool.settings = dungeonEngineSettings(dungeon).settings;
const seeds = Array.from({ length: games }, (_, i) => 50_000_000 + i);
const t0 = Date.now();
const r = await pool.evaluate(loadParams(policyPath), seeds);
await pool.close();
const xs = r.xp.slice().sort((a, b) => a - b);
const q = (p: number) => xs[Math.min(xs.length - 1, Math.floor(p * xs.length))];
const over = (t: number) => xs.filter((x) => x > t).length;
console.log(JSON.stringify({
  dungeon, games, seconds: Math.round((Date.now() - t0) / 1000),
  mean: Math.round(xs.reduce((s, x) => s + x, 0) / xs.length), p50: q(0.5), p90: q(0.9), p99: q(0.99), p999: q(0.999), max: xs[xs.length - 1],
  over1000: over(1000), over1500: over(1500), over2000: over(2000), over2564: over(2564),
}));
process.exit(0);
