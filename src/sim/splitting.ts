// Multilevel splitting (fixed effort): estimates the probability of reaching deep levels (the leaderboard top) with
// far fewer games than plain simulation. Games that reach a stage level are cloned (same state, fresh randomness)
// to fill the next stage, so the rare deep runs are explored many times.
//   P(reach L_k) = prod_j reached_j / tried_j
import { level } from '../game/adventurer.ts';
import { applyAction, isDead, newGameState } from '../game/engine.ts';
import { FastRandom, Xoshiro128 } from '../game/rng.ts';
import type { GameState, Settings } from '../game/types.ts';
import type { Policy } from '../ai/policy.ts';

export interface SplitStage {
  level: number;
  tried: number;
  reached: number;
}

export interface SplitOptions {
  /** initial games (stage 0 starts every one of them from a new adventurer) */
  seeds: number[];
  /** stage levels, increasing */
  levels: number[];
  /** trajectories per later stage */
  effort: number;
  settings?: Settings;
  /** randomness of the clones */
  seed: number;
  maxActions?: number;
}

/** Play until the adventurer reaches `target` level (returns the state) or dies (null). */
function advance(policy: Policy, state: GameState, rng: FastRandom, target: number, maxActions: number): GameState | null {
  let s = state;
  for (let n = 0; n < maxActions; n++) {
    if (isDead(s)) return null;
    if (s.started && level(s.adventurer) >= target) return s;
    const d = policy.decide(s);
    if (d.actions.length === 0) return null;
    for (const action of d.actions) {
      s = applyAction(s, action, rng).state;
      if (isDead(s)) return null;
    }
  }
  return null;
}

export function splitRun(policy: Policy, opts: SplitOptions): SplitStage[] {
  const maxActions = opts.maxActions ?? 20000;
  const pick = new Xoshiro128(opts.seed ^ 0x5bd1e995);
  const stages: SplitStage[] = [];
  let survivors: GameState[] = [];
  opts.levels.forEach((target, k) => {
    const starts: Array<{ state: GameState; rng: FastRandom }> = [];
    if (k === 0) {
      for (const seed of opts.seeds) starts.push({ state: newGameState(BigInt(seed + 1), opts.settings), rng: new FastRandom(seed) });
    } else if (survivors.length) {
      // every survivor gets an equal share of the effort (shuffled remainder)
      const order = survivors.slice();
      for (let i = order.length - 1; i > 0; i--) {
        const j = pick.nextU32() % (i + 1);
        [order[i], order[j]] = [order[j], order[i]];
      }
      for (let i = 0; i < opts.effort; i++) starts.push({ state: order[i % order.length], rng: new FastRandom((opts.seed * 7919 + k * 1_000_003 + i) | 0) });
    }
    const next: GameState[] = [];
    for (const st of starts) {
      const r = advance(policy, st.state, st.rng, target, maxActions);
      if (r) next.push(r);
    }
    stages.push({ level: target, tried: starts.length, reached: next.length });
    survivors = next;
  });
  return stages;
}

/** Merge stage counts of independent replicates. */
export function mergeStages(parts: SplitStage[][]): SplitStage[] {
  const out: SplitStage[] = [];
  for (const p of parts) {
    p.forEach((s, i) => {
      out[i] ??= { level: s.level, tried: 0, reached: 0 };
      out[i].tried += s.tried;
      out[i].reached += s.reached;
    });
  }
  return out;
}

/** P(reach each stage level) with its approximate standard error on the log scale. */
export function reachProbabilities(stages: SplitStage[]): Array<{ level: number; p: number; logP: number; logSe: number }> {
  let logP = 0;
  let v = 0;
  return stages.map((s) => {
    // +0.5 smoothing keeps log finite when a stage has no survivors
    const p = (s.reached + 0.5) / (s.tried + 1);
    logP += Math.log(p);
    v += (1 - p) / Math.max(1, (s.tried + 1) * p);
    return { level: s.level, p: Math.exp(logP), logP, logSe: Math.sqrt(v) };
  });
}
