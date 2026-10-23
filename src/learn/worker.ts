// Worker thread: evaluates policy parameters on a list of seeds and returns per-game results.
import { parentPort } from 'node:worker_threads';
import { Policy } from '../ai/policy.ts';
import type { PolicyParams } from '../ai/params.ts';
import type { Settings } from '../game/types.ts';
import { simulateGame } from '../sim/simulate.ts';

export interface EvalTask {
  id: number;
  params: PolicyParams;
  seeds: number[];
  collect?: boolean;
  /** dungeon settings (default rules when absent) */
  settings?: Settings;
}

export interface EvalResult {
  id: number;
  xp: number[];
  levels: number[];
  xpByLevel: number[][];
  errors: number;
  ms: number;
}

parentPort?.on('message', (task: EvalTask) => {
  const t0 = performance.now();
  const policy = new Policy(task.params, { fast: true });
  const xp: number[] = [];
  const levels: number[] = [];
  const xpByLevel: number[][] = [];
  let errors = 0;
  for (const seed of task.seeds) {
    const r = simulateGame(policy, { seed, settings: task.settings });
    xp.push(r.xp);
    levels.push(r.level);
    if (task.collect) xpByLevel.push(r.xpByLevel);
    if (r.error) errors++;
  }
  const res: EvalResult = { id: task.id, xp, levels, xpByLevel, errors, ms: performance.now() - t0 };
  parentPort?.postMessage(res);
});
