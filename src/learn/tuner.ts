// Policy optimization by simulation:
//   1. CMA-ES over the tunable policy parameters (common random numbers inside a generation)
//   2. value learning: fit futureXpByLevel (expected remaining XP per level) from simulated games
// Results are written to policy/policy.json (loaded by the bot) and site/data/training.json (dashboard).
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { DEFAULT_PARAMS, PARAM_BOUNDS, TUNABLE_KEYS, clampParams, loadParams, type PolicyParams } from '../ai/params.ts';
import { CMAES } from './cmaes.ts';
import { EvalPool } from './pool.ts';

export type Objective = 'mean' | 'p90' | 'top10' | 'blend';

export interface TuneOptions {
  generations: number;
  games: number;
  objective: Objective;
  workers?: number;
  policyPath?: string;
  trainingPath?: string;
  sigma?: number;
  seed?: number;
  validateGames?: number;
  log?: (msg: string) => void;
  /** tune for a dungeon's rules (e.g. Ronke Casino #7) */
  settings?: import('../game/types.ts').Settings;
  label?: string;
  /** required z-score of the paired mean improvement before a new policy is saved */
  minZ?: number;
}

export interface TrainingRecord {
  date: string;
  generation: number;
  objective: Objective;
  fitness: number;
  mean: number;
  p90: number;
  max: number;
  games: number;
  source: string;
}

export function fitnessOf(xp: number[], objective: Objective): number {
  const xs = xp.slice().sort((a, b) => a - b);
  const n = xs.length;
  const mean = xs.reduce((s, x) => s + x, 0) / n;
  const p90 = xs[Math.min(n - 1, Math.floor(0.9 * n))];
  const top = xs.slice(Math.floor(0.9 * n));
  const top10 = top.reduce((s, x) => s + x, 0) / Math.max(1, top.length);
  switch (objective) {
    case 'mean':
      return mean;
    case 'p90':
      return p90;
    case 'top10':
      return top10;
    case 'blend':
      return 0.5 * mean + 0.25 * p90 + 0.25 * top10;
  }
}

export function stats(xp: number[]): { mean: number; p90: number; max: number } {
  const xs = xp.slice().sort((a, b) => a - b);
  const n = xs.length;
  return { mean: xs.reduce((s, x) => s + x, 0) / n, p90: xs[Math.min(n - 1, Math.floor(0.9 * n))], max: xs[n - 1] };
}

export function encode(p: PolicyParams): number[] {
  return TUNABLE_KEYS.map((k) => {
    const [lo, hi] = PARAM_BOUNDS[k as string];
    const v = p[k] as number;
    return hi === lo ? 0 : (v - lo) / (hi - lo);
  });
}

export function decode(x: number[], base: PolicyParams): PolicyParams {
  const out = { ...base } as Record<string, unknown>;
  TUNABLE_KEYS.forEach((k, i) => {
    const [lo, hi] = PARAM_BOUNDS[k as string];
    out[k as string] = lo + x[i] * (hi - lo);
  });
  return clampParams(out as unknown as PolicyParams);
}

export function savePolicy(path: string, params: PolicyParams, meta: Record<string, unknown>): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify({ params, meta }, null, 2) + '\n');
}

export function appendTraining(path: string, rec: TrainingRecord): void {
  mkdirSync(dirname(path), { recursive: true });
  let list: TrainingRecord[] = [];
  if (existsSync(path)) {
    try {
      list = JSON.parse(readFileSync(path, 'utf8'));
    } catch {
      list = [];
    }
  }
  list.push(rec);
  if (list.length > 2000) list = list.slice(-2000);
  writeFileSync(path, JSON.stringify(list, null, 1) + '\n');
}

/** Mean remaining XP from each level, estimated from simulated games (the learned value function). */
export function fitFutureXp(xp: number[], xpByLevel: number[][]): number[] {
  const sum: number[] = [];
  const cnt: number[] = [];
  for (let g = 0; g < xp.length; g++) {
    const table = xpByLevel[g] ?? [];
    for (let l = 1; l < table.length; l++) {
      if (table[l] === undefined) continue;
      sum[l] = (sum[l] ?? 0) + (xp[g] - table[l]);
      cnt[l] = (cnt[l] ?? 0) + 1;
    }
  }
  const out: number[] = [0];
  let last = 0;
  for (let l = 1; l < sum.length; l++) {
    if (cnt[l] && cnt[l] >= 20) last = sum[l] / cnt[l];
    out[l] = Math.max(20, last);
  }
  // smooth with a 3-level moving average
  return out.map((v, i) => (i === 0 ? 0 : Math.round((out[Math.max(1, i - 1)] + v + out[Math.min(out.length - 1, i + 1)]) / 3)));
}

export async function tune(opts: TuneOptions): Promise<PolicyParams> {
  const log = opts.log ?? ((m: string) => console.log(m));
  const policyPath = opts.policyPath ?? 'policy/policy.json';
  const trainingPath = opts.trainingPath ?? (process.env.BOT_DATA_DIR ? `${process.env.BOT_DATA_DIR}/training.json` : 'site/data/training.json');
  // a new per-dungeon policy starts from the main policy
  const base = existsSync(policyPath) ? loadParams(policyPath) : existsSync('policy/policy.json') ? loadParams('policy/policy.json') : { ...DEFAULT_PARAMS };
  const pool = new EvalPool(opts.workers);
  pool.settings = opts.settings;
  const es = new CMAES(encode(base), { sigma: opts.sigma ?? 0.12, seed: opts.seed ?? Date.now() & 0xffff });
  const validateGames = opts.validateGames ?? Math.max(opts.games * 2, 400);
  log(`tuning ${TUNABLE_KEYS.length} params${opts.label ? ` for ${opts.label}` : ''}, lambda=${es.lambda}, ${opts.games} games/candidate, ${pool.size} workers, objective=${opts.objective}`);

  // incumbent: validated fitness of the starting policy
  let seedBase = (opts.seed ?? 1) * 1_000_003;
  const valSeeds = Array.from({ length: validateGames }, (_, i) => 900_000_000 + i);
  const baseVal = await pool.evaluate(base, valSeeds, true);
  let best = { ...base, futureXpByLevel: base.futureXpByLevel };
  let bestFit = fitnessOf(baseVal.xp, opts.objective);
  log(`baseline validated ${opts.objective}=${bestFit.toFixed(1)} mean=${stats(baseVal.xp).mean.toFixed(1)}`);

  // learning from top players: their stat build is tried as a candidate and adopted only if it validates better
  if (existsSync('policy/insights.json')) {
    try {
      const { imitationParams } = await import('../commands/learn.ts');
      const ins = JSON.parse(readFileSync('policy/insights.json', 'utf8'));
      const imit = clampParams(imitationParams(base, ins.aggregate));
      const r = await pool.evaluate(imit, valSeeds, true);
      const f = fitnessOf(r.xp, opts.objective);
      log(`top-player imitation candidate: ${opts.objective}=${f.toFixed(1)} (${ins.players} players)`);
      if (f > bestFit) {
        bestFit = f;
        best = { ...imit, futureXpByLevel: base.futureXpByLevel };
        es.state.mean = encode(best);
        log('  adopted top-player stat targets as the new starting point');
      }
    } catch (e) {
      log(`imitation candidate skipped: ${(e as Error).message}`);
    }
  }

  let validationRound = 0;
  for (let gen = 0; gen < opts.generations; gen++) {
    const seeds = Array.from({ length: opts.games }, (_, i) => seedBase + i);
    seedBase += opts.games;
    const cands = es.ask();
    const params = cands.map((c) => ({ ...decode(c.x, best), futureXpByLevel: best.futureXpByLevel }));
    const results = await Promise.all(params.map((p) => pool.evaluate(p, seeds)));
    const fits = results.map((r) => fitnessOf(r.xp, opts.objective));
    es.tell(cands, fits.map((f) => -f));
    const genBest = fits.indexOf(Math.max(...fits));
    const st = stats(results[genBest].xp);
    log(`gen ${gen + 1}/${opts.generations}: best ${fits[genBest].toFixed(1)} (mean ${st.mean.toFixed(1)}, p90 ${st.p90}, max ${st.max}) sigma=${es.state.sigma.toFixed(3)}`);

    // validate the distribution mean every few generations (and at the end)
    if ((gen + 1) % 4 === 0 || gen === opts.generations - 1) {
      const meanParams = { ...decode(es.state.mean, best), futureXpByLevel: best.futureXpByLevel };
      // fresh seeds every round (no repeated selection on one validation set), candidate and incumbent on the same games
      validationRound++;
      const roundSeeds = valSeeds.map((x) => x + validationRound * 10_000_000);
      const [val, inc] = await Promise.all([pool.evaluate(meanParams, roundSeeds, true), pool.evaluate(best, roundSeeds)]);
      const vf = fitnessOf(val.xp, opts.objective);
      const incFit = fitnessOf(inc.xp, opts.objective);
      const vs = stats(val.xp);
      const diffs = val.xp.map((x, i) => x - inc.xp[i]);
      const dMean = diffs.reduce((a, b) => a + b, 0) / diffs.length;
      const dSe = Math.sqrt(diffs.reduce((a, b) => a + (b - dMean) ** 2, 0) / Math.max(1, diffs.length - 1) / diffs.length);
      const significant = vf > incFit && dMean > (opts.minZ ?? 1.5) * dSe;
      log(`  validation of CMA mean: ${opts.objective}=${vf.toFixed(1)} vs incumbent ${incFit.toFixed(1)} on the same ${roundSeeds.length} games; mean diff ${dMean.toFixed(1)}±${dSe.toFixed(1)}${significant ? ' (significant)' : ''}`);
      appendTraining(trainingPath, {
        date: new Date().toISOString(),
        generation: es.state.generation,
        objective: opts.objective,
        fitness: vf,
        mean: vs.mean,
        p90: vs.p90,
        max: vs.max,
        games: valSeeds.length,
        source: 'cmaes',
      });
      if (significant) {
        bestFit = vf;
        // value learning: refresh the expected-remaining-xp table from the validation games
        const future = fitFutureXp(val.xp, val.xpByLevel);
        best = { ...meanParams, futureXpByLevel: future, version: `tuned-${new Date().toISOString().slice(0, 10)}-g${es.state.generation}` };
        savePolicy(policyPath, best, {
          objective: opts.objective,
          fitness: vf,
          mean: vs.mean,
          p90: vs.p90,
          max: vs.max,
          validationGames: valSeeds.length,
          generation: es.state.generation,
          updated: new Date().toISOString(),
        });
        log(`  new best policy saved to ${policyPath}`);
      }
    }
  }
  await pool.close();
  return best;
}
