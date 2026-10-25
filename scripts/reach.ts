// Compare policies on one dungeon: mean XP and the share of games reaching each level (P(L>=n)).
//   node --import tsx scripts/reach.ts 0:mainnet 4000 policy/policy.json [other.json ...]
import { loadParams } from '../src/ai/params.ts';
import { dungeonEngineSettings } from '../src/game/dungeons.ts';
import { EvalPool } from '../src/learn/pool.ts';

const [dungeon, n, ...paths] = process.argv.slice(2);
const pool = new EvalPool();
pool.settings = dungeonEngineSettings(dungeon).settings;
const seeds = Array.from({ length: Number(n) }, (_, i) => 7_000_000 + i);
for (const p of paths) {
  const r = await pool.evaluate(loadParams(p), seeds);
  const mean = r.xp.reduce((s, x) => s + x, 0) / r.xp.length;
  const at = (L: number) => r.levels.filter((l) => l >= L).length / r.levels.length;
  const levels = r.levels.slice().sort((a, b) => a - b);
  console.log(
    `${p}: mean ${mean.toFixed(0)} | median L${levels[levels.length >> 1]} | died <=L10 ${((1 - at(11)) * 100).toFixed(1)}% | ` +
      [15, 20, 25, 30, 35, 40, 43, 46].map((L) => `L${L}+ ${(at(L) * 100).toFixed(2)}%`).join(' '),
  );
}
await pool.close();
