import { level, loadAssets, maxHealth } from '../game/adventurer.ts';
import { applyAction, isDead, newGameState } from '../game/engine.ts';
import { greatness, lootInfo } from '../game/loot.ts';
import { FastRandom } from '../game/rng.ts';
import { Policy } from '../ai/policy.ts';
import { loadParams } from '../ai/params.ts';
import { EvalPool } from '../learn/pool.ts';
import { dungeonEngineSettings } from '../game/dungeons.ts';
import { fitnessOf, stats } from '../learn/tuner.ts';

export async function runSimCommand(opts: { seed: number; policyPath: string; verbose: boolean; dungeon?: string }): Promise<void> {
  const params = loadParams(opts.policyPath);
  const policy = new Policy(params);
  const rng = new FastRandom(opts.seed);
  const settings = opts.dungeon ? dungeonEngineSettings(opts.dungeon).settings : undefined;
  let s = newGameState(BigInt(opts.seed), settings);
  let n = 0;
  while (!isDead(s) && n < 5000) {
    const d = policy.decide(s);
    const a = loadAssets(s.adventurer, s.bag);
    console.log(`#${n} L${level(a)} xp=${a.xp} hp=${a.health}/${maxHealth(a.stats)} gold=${a.gold} | ${d.reason}`);
    if (opts.verbose && n % 10 === 0) {
      const gear = [1, 2, 3, 4, 5, 6, 7, 8]
        .map((sl) => (a.equipment[sl].id ? `${lootInfo(a.equipment[sl].id).name}(T${lootInfo(a.equipment[sl].id).tier} G${greatness(a.equipment[sl].xp)})` : '-'))
        .join(', ');
      console.log(`    gear: ${gear}`);
    }
    for (const act of d.actions) {
      const r = applyAction(s, act, rng);
      s = r.state;
      if (opts.verbose) for (const e of r.events) if (e.type !== 'market' && e.type !== 'item_level_up') console.log('     ', JSON.stringify(e));
      if (isDead(s)) break;
    }
    n++;
  }
  console.log(`final xp=${s.adventurer.xp} level=${level(s.adventurer)} decisions=${n}`);
}

export async function runBenchCommand(opts: { games: number; seed: number; policyPath: string; workers?: number; dungeon?: string }): Promise<void> {
  const params = loadParams(opts.policyPath);
  const pool = new EvalPool(opts.workers);
  const dungeon = opts.dungeon ? dungeonEngineSettings(opts.dungeon) : null;
  pool.settings = dungeon?.settings;
  const seeds = Array.from({ length: opts.games }, (_, i) => opts.seed * 1_000_000 + i);
  const t0 = performance.now();
  const r = await pool.evaluate(params, seeds);
  const ms = performance.now() - t0;
  await pool.close();
  const st = stats(r.xp);
  const levels = r.levels.slice().sort((a, b) => a - b);
  console.log(
    JSON.stringify(
      {
        policy: params.version,
        dungeon: dungeon?.label ?? 'default rules',
        games: r.xp.length,
        mean: +st.mean.toFixed(1),
        p90: st.p90,
        max: st.max,
        blend: +fitnessOf(r.xp, 'blend').toFixed(1),
        medianLevel: levels[Math.floor(levels.length / 2)],
        maxLevel: levels[levels.length - 1],
        errors: r.errors,
        seconds: +(ms / 1000).toFixed(1),
        gamesPerSecond: +((r.xp.length / ms) * 1000).toFixed(1),
      },
      null,
      2,
    ),
  );
}
