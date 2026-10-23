// Tail tuning: optimize the probability of reaching the leaderboard top instead of the mean score.
// Every candidate is scored by multilevel splitting (src/sim/splitting.ts): fitness = mean log10 P(reach level) over
// the deepest stages. The mean-xp tuner favours cheap early safety; this one favours builds that survive levels 40-50.
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { DEFAULT_PARAMS, PARAM_BOUNDS, clampParams, loadParams, type PolicyParams } from '../ai/params.ts';
import type { Settings } from '../game/types.ts';
import { reachProbabilities } from '../sim/splitting.ts';
import { CMAES } from './cmaes.ts';
import { EvalPool } from './pool.ts';
import { appendTraining, savePolicy } from './tuner.ts';

/** Parameters that shape the deep game (stats, gear farming, risk); the rest keeps its tuned values. */
export const TAIL_KEYS: Array<keyof PolicyParams> = [
  'phaseLevel',
  'chaRatio',
  'dexRatio',
  'chaRatioLate',
  'dexRatioLate',
  'strRatioLate',
  'intRatioLate',
  'wisRatioLate',
  'vitShare',
  'potionReserveFactor',
  'maxExploreRisk',
  'swapMinGain',
  'rotateMaxRisk',
  'rotateBuyGain',
  'collectGain',
  'killSwapMaxHp',
  'jewelryCollectGain',
];

export interface TailOptions {
  generations: number;
  /** stage-0 games and per-stage effort of one candidate evaluation */
  games: number;
  effort: number;
  levels: number[];
  settings?: Settings;
  label?: string;
  policyPath: string;
  trainingPath?: string;
  workers?: number;
  sigma?: number;
  seed?: number;
  minZ?: number;
  log?: (m: string) => void;
}

const bound = (k: keyof PolicyParams): [number, number] => PARAM_BOUNDS[k as string] ?? [0, 1];

function encode(p: PolicyParams): number[] {
  return TAIL_KEYS.map((k) => {
    const [lo, hi] = bound(k);
    return Math.min(1, Math.max(0, ((p[k] as number) - lo) / (hi - lo)));
  });
}

function decode(x: number[], base: PolicyParams): PolicyParams {
  const out = { ...base } as Record<string, unknown>;
  TAIL_KEYS.forEach((k, i) => {
    const [lo, hi] = bound(k);
    out[k as string] = lo + Math.min(1, Math.max(0, x[i])) * (hi - lo);
  });
  return clampParams(out as unknown as PolicyParams);
}

/** Fitness of a split run: mean log10 P(reach) over the last three stages, with its standard error. */
export function tailFitness(stages: ReturnType<typeof reachProbabilities>): { fit: number; se: number } {
  const last = stages.slice(-3);
  const fit = last.reduce((s, r) => s + r.logP, 0) / last.length / Math.LN10;
  const se = last.reduce((s, r) => s + r.logSe, 0) / last.length / Math.LN10;
  return { fit, se };
}

export async function tuneTail(opts: TailOptions): Promise<PolicyParams> {
  const log = opts.log ?? ((m: string) => console.log(m));
  const trainingPath = opts.trainingPath ?? (process.env.BOT_DATA_DIR ? `${process.env.BOT_DATA_DIR}/training.json` : 'site/data/training.json');
  const base = existsSync(opts.policyPath) ? loadParams(opts.policyPath) : existsSync('policy/policy.json') ? loadParams('policy/policy.json') : { ...DEFAULT_PARAMS };
  const pool = new EvalPool(opts.workers);
  pool.settings = opts.settings;
  let seedBase = (opts.seed ?? 1) * 7_000_001;
  // candidates of one generation share their games and clone randomness (common random numbers)
  const evaluate = async (p: PolicyParams, base: number, effortScale = 1) => {
    const seeds = Array.from({ length: Math.round(opts.games * effortScale) }, (_, i) => base + i);
    const stages = await pool.split(p, seeds, opts.levels, Math.round(opts.effort * effortScale), base);
    const reach = reachProbabilities(stages);
    return { ...tailFitness(reach), reach };
  };
  // dashboard: probability of reaching each level with the current policy
  const dataDir = process.env.BOT_DATA_DIR ?? 'site/data';
  const writeReach = (p: PolicyParams, reach: ReturnType<typeof reachProbabilities>) => {
    mkdirSync(dataDir, { recursive: true });
    writeFileSync(
      `${dataDir}/reach.json`,
      JSON.stringify({ updated: new Date().toISOString(), rules: opts.label ?? 'default', policy: p.version, levels: reach.map((r) => ({ level: r.level, p: r.p, log10Se: r.logSe / Math.LN10 })) }, null, 1) + '\n',
    );
  };
  const nextBase = () => (seedBase += 1_000_003);
  log(`tail tuning ${TAIL_KEYS.length} params${opts.label ? ` for ${opts.label}` : ''}: stages ${opts.levels.join(',')}, ${opts.games} games + ${opts.effort}/stage per candidate, ${pool.size} workers`);
  let best = base;
  let bestEval = await evaluate(best, nextBase(), 2);
  log(`incumbent: log10 P(deep) = ${bestEval.fit.toFixed(2)} ± ${bestEval.se.toFixed(2)}`);
  writeReach(best, bestEval.reach);
  const es = new CMAES(encode(best), { sigma: opts.sigma ?? 0.08, seed: opts.seed ?? Date.now() & 0xffff });
  for (let gen = 0; gen < opts.generations; gen++) {
    const cands = es.ask();
    const fits: number[] = [];
    const genBase = nextBase();
    for (const c of cands) fits.push((await evaluate(decode(c.x, best), genBase)).fit);
    es.tell(cands, fits.map((f) => -f));
    log(`gen ${gen + 1}/${opts.generations}: best ${Math.max(...fits).toFixed(2)}, median ${fits.slice().sort((a, b) => a - b)[Math.floor(fits.length / 2)].toFixed(2)}, sigma=${es.state.sigma.toFixed(3)}`);
    if ((gen + 1) % 3 === 0 || gen === opts.generations - 1) {
      const cand = decode(es.state.mean, best);
      const valBase = nextBase();
      const [ce, ie] = [await evaluate(cand, valBase, 2), await evaluate(best, valBase, 2)];
      const diff = ce.fit - ie.fit;
      const se = Math.hypot(ce.se, ie.se);
      const significant = diff > (opts.minZ ?? 1.5) * se;
      log(`  validation: candidate ${ce.fit.toFixed(2)} vs incumbent ${ie.fit.toFixed(2)} (diff ${diff.toFixed(2)} ± ${se.toFixed(2)})${significant ? ' -> adopted' : ''}`);
      appendTraining(trainingPath, {
        date: new Date().toISOString(),
        generation: es.state.generation,
        objective: 'tail',
        fitness: ce.fit,
        mean: 0,
        p90: 0,
        max: 0,
        games: opts.games * 2,
        source: 'tail',
      });
      if (significant) {
        best = { ...cand, version: `tail-${new Date().toISOString().slice(0, 10)}-g${es.state.generation}` };
        bestEval = ce;
        writeReach(best, ce.reach);
        savePolicy(opts.policyPath, best, { objective: 'tail', levels: opts.levels, log10Reach: ce.fit, updated: new Date().toISOString() });
        log(`  saved ${opts.policyPath}`);
      }
    }
  }
  await pool.close();
  return best;
}
