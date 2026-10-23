// Small worker-thread pool for parallel policy evaluation (one worker per CPU core by default).
import { availableParallelism } from 'node:os';
import { Worker } from 'node:worker_threads';
import type { PolicyParams } from '../ai/params.ts';
import type { Settings } from '../game/types.ts';
import { mergeStages, type SplitStage } from '../sim/splitting.ts';
import type { EvalResult, EvalTask } from './worker.ts';

export class EvalPool {
  private workers: Worker[] = [];
  private idle: Worker[] = [];
  private queue: Array<{ task: EvalTask; resolve: (r: EvalResult) => void; reject: (e: Error) => void }> = [];
  private pending = new Map<number, { resolve: (r: EvalResult) => void; reject: (e: Error) => void; worker: Worker }>();
  private nextId = 1;

  constructor(size = Math.max(1, availableParallelism() - 0)) {
    const url = new URL('./worker.ts', import.meta.url);
    for (let i = 0; i < size; i++) {
      const w = new Worker(url, { execArgv: process.execArgv });
      w.on('message', (res: EvalResult) => {
        const p = this.pending.get(res.id);
        if (!p) return;
        this.pending.delete(res.id);
        p.resolve(res);
        this.release(w);
      });
      w.on('error', (err) => {
        for (const [id, p] of this.pending) {
          if (p.worker === w) {
            this.pending.delete(id);
            p.reject(err);
          }
        }
      });
      this.workers.push(w);
      this.idle.push(w);
    }
  }

  get size(): number {
    return this.workers.length;
  }

  private release(w: Worker): void {
    const next = this.queue.shift();
    if (next) this.dispatch(w, next.task, next.resolve, next.reject);
    else this.idle.push(w);
  }

  private dispatch(w: Worker, task: EvalTask, resolve: (r: EvalResult) => void, reject: (e: Error) => void): void {
    this.pending.set(task.id, { resolve, reject, worker: w });
    w.postMessage(task);
  }

  /** dungeon settings used by every evaluation of this pool */
  settings?: Settings;

  run(params: PolicyParams, seeds: number[], collect = false, split?: EvalTask['split']): Promise<EvalResult> {
    const task: EvalTask = { id: this.nextId++, params, seeds, collect, settings: this.settings, split };
    return new Promise((resolve, reject) => {
      const w = this.idle.pop();
      if (w) this.dispatch(w, task, resolve, reject);
      else this.queue.push({ task, resolve, reject });
    });
  }

  /** Evaluate one parameter set on many seeds, split across the pool. */
  async evaluate(params: PolicyParams, seeds: number[], collect = false): Promise<{ xp: number[]; levels: number[]; xpByLevel: number[][]; errors: number }> {
    const chunks = Math.min(seeds.length, this.size * 2);
    const per = Math.ceil(seeds.length / chunks);
    const parts: Promise<EvalResult>[] = [];
    for (let i = 0; i < seeds.length; i += per) parts.push(this.run(params, seeds.slice(i, i + per), collect));
    const res = await Promise.all(parts);
    return {
      xp: res.flatMap((r) => r.xp),
      levels: res.flatMap((r) => r.levels),
      xpByLevel: res.flatMap((r) => r.xpByLevel),
      errors: res.reduce((s, r) => s + r.errors, 0),
    };
  }

  /**
   * Multilevel splitting estimate of reaching deep levels: one independent replicate per worker
   * (seeds split across them, `effort` trajectories per stage in total).
   */
  async split(params: PolicyParams, seeds: number[], levels: number[], effort: number, seed = 1): Promise<SplitStage[]> {
    const n = Math.min(seeds.length, this.size);
    const per = Math.ceil(seeds.length / n);
    const parts: Promise<EvalResult>[] = [];
    for (let i = 0; i < n; i++) {
      const chunk = seeds.slice(i * per, (i + 1) * per);
      if (chunk.length) parts.push(this.run(params, chunk, false, { levels, effort: Math.ceil(effort / n), seed: seed * 1000 + i }));
    }
    const res = await Promise.all(parts);
    return mergeStages(res.map((r) => r.stages ?? []));
  }

  async close(): Promise<void> {
    await Promise.all(this.workers.map((w) => w.terminate()));
  }
}
