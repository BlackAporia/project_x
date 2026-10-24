// `validate`: A/B a candidate policy against the current one on the official site engine (practice games of a
// dungeon) and adopt it only when it is better beyond noise. Keeps the learning loop honest: simulator gains that do
// not transfer to the real engine are rejected.
import { copyFileSync, existsSync, rmSync } from 'node:fs';
import { Policy } from '../ai/policy.ts';
import { loadParams } from '../ai/params.ts';
import { isDead } from '../game/engine.ts';
import { DataStore } from '../runner/datastore.ts';
import { SitePracticeBackend } from '../v2/backend.ts';

interface Sample {
  xp: number[];
}

function stats(xs: number[]): { mean: number; se: number } {
  const n = xs.length;
  const mean = xs.reduce((s, x) => s + x, 0) / n;
  const v = xs.reduce((s, x) => s + (x - mean) ** 2, 0) / Math.max(1, n - 1);
  return { mean, se: Math.sqrt(v / n) };
}

async function playOne(backend: SitePracticeBackend, policy: Policy): Promise<number> {
  const id = await backend.nextGame();
  let state = await backend.readState(id);
  for (let n = 0; n < 5000; n++) {
    if (state.started && isDead(state)) break;
    const d = policy.decide(state);
    if (!d.actions.length) break;
    const r = await backend.execute(id, d.actions);
    if (r.reverted && !r.sent.length) break;
    state = await backend.readState(id);
  }
  return state.adventurer.xp;
}

export async function runValidateCommand(opts: {
  dungeon: string;
  candidate: string;
  baseline: string;
  games: number;
  frontend?: string;
  dataDir: string;
  adoptTo?: string;
  z?: number;
}): Promise<boolean> {
  const { openSitePracticeBackend } = await import('./play.ts');
  const backend = (await openSitePracticeBackend(new DataStore(opts.dataDir), { dungeon: opts.dungeon, frontend: opts.frontend, dataDir: opts.dataDir })) as SitePracticeBackend;
  const cand = new Policy(loadParams(opts.candidate));
  const base = new Policy(loadParams(opts.baseline));
  const a: Sample = { xp: [] };
  const b: Sample = { xp: [] };
  for (let g = 0; g < opts.games; g++) {
    // alternate so drifts (none expected) affect both arms equally
    a.xp.push(await playOne(backend, cand));
    b.xp.push(await playOne(backend, base));
    if ((g + 1) % 25 === 0) console.log(`  ${g + 1}/${opts.games}: candidate ${stats(a.xp).mean.toFixed(0)} vs baseline ${stats(b.xp).mean.toFixed(0)}`);
  }
  const sa = stats(a.xp);
  const sb = stats(b.xp);
  const diff = sa.mean - sb.mean;
  const se = Math.sqrt(sa.se ** 2 + sb.se ** 2);
  const z = se > 0 ? diff / se : 0;
  const need = opts.z ?? 1.0;
  const better = z >= need;
  console.log(`validate ${opts.dungeon}: candidate ${sa.mean.toFixed(1)}±${sa.se.toFixed(1)} vs baseline ${sb.mean.toFixed(1)}±${sb.se.toFixed(1)} (z=${z.toFixed(2)}, need ${need}) -> ${better ? 'ADOPT' : 'REJECT'}`);
  const store = new DataStore(opts.dataDir);
  const hist = store.readJson<unknown[]>('validations.json', []);
  hist.push({ t: new Date().toISOString(), dungeon: opts.dungeon, games: opts.games, candidate: sa, baseline: sb, z, adopted: better });
  store.writeJson('validations.json', hist.slice(-500));
  if (opts.adoptTo) {
    if (better) copyFileSync(opts.candidate, opts.adoptTo);
    else if (existsSync(opts.candidate) && opts.candidate !== opts.adoptTo) rmSync(opts.candidate);
  }
  return better;
}
