// Export self-play samples for the GPU trainer (trainer/train.py): one JSON line per sampled state with the
// features and the remaining XP that game eventually scored (value-function target).
import { createWriteStream, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { Policy } from '../ai/policy.ts';
import { loadParams } from '../ai/params.ts';
import { simulateGame } from '../sim/simulate.ts';

export async function runDatasetCommand(opts: { games: number; out: string; policyPath: string; seed: number }): Promise<void> {
  const params = loadParams(opts.policyPath);
  const policy = new Policy(params, { fast: true });
  mkdirSync(dirname(opts.out), { recursive: true });
  const out = createWriteStream(opts.out);
  let rows = 0;
  for (let g = 0; g < opts.games; g++) {
    const r = simulateGame(policy, { seed: opts.seed * 1_000_000 + g, collectSamples: true });
    for (const s of r.samples ?? []) {
      out.write(JSON.stringify({ level: s.level, xp: s.xp, f: s.features, remaining: r.xp - s.xp, final: r.xp }) + '\n');
      rows++;
    }
    if ((g + 1) % 500 === 0) console.log(`  ${g + 1}/${opts.games} games, ${rows} rows`);
  }
  await new Promise<void>((res) => out.end(res));
  console.log(`dataset: ${rows} rows from ${opts.games} games -> ${opts.out}`);
}
