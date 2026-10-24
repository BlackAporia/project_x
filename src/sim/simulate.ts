// Full-game simulation with the exact engine and statistically identical randomness.
import { stateFeatures } from '../ai/features.ts';
import { level } from '../game/adventurer.ts';
import { applyAction, isDead, newGameState } from '../game/engine.ts';
import { FastRandom, type RandomSource } from '../game/rng.ts';
import type { GameEvent, GameState, Settings } from '../game/types.ts';
import { Policy } from '../ai/policy.ts';
import type { PolicyParams } from '../ai/params.ts';

export interface SimResult {
  xp: number;
  level: number;
  actions: number;
  transactions: number;
  deathCause: string;
  beastsKilled: number;
  fled: number;
  maxGold: number;
  /** xp at the moment each level was reached (index = level) */
  xpByLevel: number[];
  /** sampled states for value learning: [level, xp, health, maxHealth-ish features...] */
  samples?: Array<{ level: number; xp: number; features: number[] }>;
  error?: string;
}

export interface SimOptions {
  seed: number;
  maxActions?: number;
  settings?: Settings;
  collectSamples?: boolean;
  rng?: RandomSource;
}

export function simulateGame(policy: Policy, opts: SimOptions): SimResult {
  const rng = opts.rng ?? new FastRandom(opts.seed);
  let state: GameState = newGameState(BigInt(opts.seed + 1), opts.settings);
  const maxActions = opts.maxActions ?? 20000;
  let actions = 0;
  let txs = 0;
  let killed = 0;
  let fled = 0;
  let maxGold = 0;
  let deathCause = 'unknown';
  const xpByLevel: number[] = [];
  const samples: SimResult['samples'] = opts.collectSamples ? [] : undefined;
  let lastLevel = 0;
  try {
    while (!isDead(state) && actions < maxActions) {
      const decision = policy.decide(state);
      if (decision.actions.length === 0) break;
      txs++;
      for (const action of decision.actions) {
        const r = applyAction(state, action, rng);
        state = r.state;
        actions++;
        for (const e of r.events) handleEvent(e);
        if (isDead(state)) break;
      }
      const lvl = level(state.adventurer);
      if (lvl > lastLevel) {
        for (let l = lastLevel + 1; l <= lvl; l++) xpByLevel[l] = state.adventurer.xp;
        lastLevel = lvl;
      }
      if (samples && state.adventurer.beastHealth === 0 && actions % 3 === 0) {
        samples.push({ level: lvl, xp: state.adventurer.xp, features: stateFeatures(state.adventurer, state.bag) });
      }
      if (state.adventurer.gold > maxGold) maxGold = state.adventurer.gold;
    }
  } catch (e) {
    return {
      xp: state.adventurer.xp,
      level: level(state.adventurer),
      actions,
      transactions: txs,
      deathCause: 'error',
      beastsKilled: killed,
      fled,
      maxGold,
      xpByLevel,
      samples,
      error: (e as Error).message,
    };
  }
  return {
    xp: state.adventurer.xp,
    level: level(state.adventurer),
    actions,
    transactions: txs,
    deathCause,
    beastsKilled: killed,
    fled,
    maxGold,
    xpByLevel,
    samples,
  };

  function handleEvent(e: GameEvent) {
    if (e.type === 'defeated_beast') killed++;
    else if (e.type === 'fled_beast') fled++;
    else if (e.type === 'death') deathCause = e.cause;
  }
}

export interface BenchStats {
  games: number;
  mean: number;
  median: number;
  p90: number;
  p99: number;
  max: number;
  min: number;
  std: number;
  meanLevel: number;
  meanTx: number;
  deathCauses: Record<string, number>;
  errors: number;
  msPerGame: number;
  /** probability of reaching at least this xp */
  pAtLeast: Record<string, number>;
}

export function summarize(results: SimResult[], elapsedMs: number): BenchStats {
  const xs = results.map((r) => r.xp).sort((a, b) => a - b);
  const n = xs.length;
  const mean = xs.reduce((s, x) => s + x, 0) / n;
  const std = Math.sqrt(xs.reduce((s, x) => s + (x - mean) ** 2, 0) / Math.max(1, n - 1));
  const q = (f: number) => xs[Math.min(n - 1, Math.floor(f * n))];
  const causes: Record<string, number> = {};
  for (const r of results) causes[r.deathCause] = (causes[r.deathCause] ?? 0) + 1;
  const pAtLeast: Record<string, number> = {};
  for (const t of [100, 200, 400, 625, 900, 1225, 1600, 2025, 2500]) pAtLeast[String(t)] = xs.filter((x) => x >= t).length / n;
  return {
    games: n,
    mean,
    median: q(0.5),
    p90: q(0.9),
    p99: q(0.99),
    max: xs[n - 1],
    min: xs[0],
    std,
    meanLevel: results.reduce((s, r) => s + r.level, 0) / n,
    meanTx: results.reduce((s, r) => s + r.transactions, 0) / n,
    deathCauses: causes,
    errors: results.filter((r) => r.error).length,
    msPerGame: elapsedMs / n,
    pAtLeast,
  };
}

export function runBatch(params: PolicyParams, games: number, seed0: number, settings?: Settings): { results: SimResult[]; stats: BenchStats } {
  const policy = new Policy(params, { fast: true });
  const t0 = performance.now();
  const results: SimResult[] = [];
  for (let g = 0; g < games; g++) results.push(simulateGame(policy, { seed: seed0 + g, settings }));
  return { results, stats: summarize(results, performance.now() - t0) };
}
