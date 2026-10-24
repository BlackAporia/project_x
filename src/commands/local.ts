// `npm run local`: the GPU learning loop for your own PC (e.g. RTX 3060 laptop).
//   1. self-play dataset with the current policy (all CPU cores)
//   2. value network trained on the GPU (trainer/train.py, PyTorch + CUDA; falls back to CPU)
//   3. A/B benchmark on identical seeds: table only vs network blends -> adopt only a real improvement
//   4. CMA-ES tuning of the policy around the adopted value function
// Repeat with --rounds. The resulting policy/ files are what the online bot uses (commit + push them).
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { loadParams, type PolicyParams } from '../ai/params.ts';
import { EvalPool } from '../learn/pool.ts';
import { fitnessOf, savePolicy, stats, tune } from '../learn/tuner.ts';
import { runDatasetCommand } from './dataset.ts';

export async function runLocalCommand(opts: { rounds: number; games: number; generations: number; policyPath: string; python: string; seed: number }): Promise<void> {
  const netPath = 'policy/value-net.json';
  for (let round = 1; round <= opts.rounds; round++) {
    console.log(`\n=== local learning round ${round}/${opts.rounds} ===`);
    const data = 'data/datasets/selfplay.jsonl';
    await runDatasetCommand({ games: opts.games, out: data, policyPath: opts.policyPath, seed: opts.seed + round * 101 });

    const tr = spawnSync(opts.python, ['trainer/train.py', '--data', data, '--out', 'data/datasets/value-net.candidate.json'], { stdio: 'inherit' });
    if (tr.status !== 0) {
      console.log('trainer failed (is PyTorch installed? pip install -r trainer/requirements.txt) - continuing with tuning only');
    } else {
      await abTest(opts.policyPath, 'data/datasets/value-net.candidate.json', netPath);
    }
    await tune({ generations: opts.generations, games: 250, objective: 'blend', policyPath: opts.policyPath, seed: opts.seed + round });
  }
}

async function abTest(policyPath: string, candidate: string, netPath: string): Promise<void> {
  const base = loadParams(policyPath);
  const pool = new EvalPool();
  const seeds = Array.from({ length: 1500 }, (_, i) => 700_000_000 + i);
  const variants: Array<{ name: string; p: PolicyParams }> = [
    { name: 'current', p: base },
    { name: 'net 0.5', p: { ...base, valueNetWeight: 0.5, valueNetPath: candidate } },
    { name: 'net 1.0', p: { ...base, valueNetWeight: 1, valueNetPath: candidate } },
  ];
  const results = [];
  for (const v of variants) {
    const r = await pool.evaluate(v.p, seeds);
    const f = fitnessOf(r.xp, 'blend');
    results.push({ ...v, f, mean: stats(r.xp).mean });
    console.log(`  A/B ${v.name.padEnd(8)} blend=${f.toFixed(1)} mean=${stats(r.xp).mean.toFixed(1)}`);
  }
  await pool.close();
  const best = results.reduce((a, b) => (b.f > a.f ? b : a));
  // require a margin above noise before switching
  if (best.name !== 'current' && best.f > results[0].f * 1.02) {
    const { copyFileSync } = await import('node:fs');
    copyFileSync(candidate, netPath);
    const meta = existsSync(policyPath) ? JSON.parse(readFileSync(policyPath, 'utf8')).meta ?? {} : {};
    savePolicy(policyPath, { ...best.p, valueNetPath: netPath, version: `${base.version.replace(/\+net.*$/, '')}+net` }, { ...meta, valueNetAdopted: new Date().toISOString(), abBlend: best.f });
    console.log(`  adopted value network (${best.name}) -> ${netPath}`);
  } else {
    console.log('  value network not adopted (no significant gain)');
  }
}
