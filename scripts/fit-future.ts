// Refit futureXpByLevel (expected remaining xp from each level = the value of staying alive) for a policy, including
// the deep levels plain simulation rarely reaches: states at stage levels come from multilevel splitting, and each is
// played on to death.
// Usage: node --import tsx scripts/fit-future.ts <dungeon|v1> <policy> [--write]
import { readFileSync, writeFileSync } from 'node:fs';
import { Policy } from '../src/ai/policy.ts';
import { loadParams } from '../src/ai/params.ts';
import { level } from '../src/game/adventurer.ts';
import { dungeonEngineSettings } from '../src/game/dungeons.ts';
import { applyAction, isDead, newGameState } from '../src/game/engine.ts';
import { FastRandom } from '../src/game/rng.ts';
import type { GameState } from '../src/game/types.ts';

const dungeon = process.argv[2] ?? 'default:mainnet';
const path = process.argv[3] ?? 'policy/policy.json';
const write = process.argv.includes('--write');
const settings = dungeon === 'v1' ? undefined : dungeonEngineSettings(dungeon).settings;
const policy = new Policy(loadParams(path), { fast: true });
const STAGES = [5, 10, 15, 20, 25, 30, 35, 40, 45];
const PER = Number(process.env.PER ?? 300);

function play(s: GameState, rng: FastRandom, target: number): GameState | null {
  for (let n = 0; n < 30000; n++) {
    if (isDead(s)) return target === Infinity ? s : null;
    if (s.started && level(s.adventurer) >= target) return s;
    for (const a of policy.decide(s).actions) {
      s = applyAction(s, a, rng).state;
      if (isDead(s)) break;
    }
  }
  return s;
}

let pop: GameState[] = [];
for (let g = 0; g < PER * 2; g++) pop.push(newGameState(BigInt(g + 1), settings));
let seed = 1;
const remaining: Record<number, number> = {};
for (const L of STAGES) {
  const next: GameState[] = [];
  for (let i = 0; i < PER * 2 && pop.length; i++) {
    const r = play(pop[i % pop.length], new FastRandom(seed++), L);
    if (r) next.push(r);
  }
  pop = next;
  if (!pop.length) break;
  // play survivors on to death: mean remaining xp from level L
  let sum = 0;
  const n = Math.min(PER, pop.length * 3);
  for (let i = 0; i < n; i++) {
    const start = pop[i % pop.length];
    const end = play(start, new FastRandom(10_000_000 + seed++), Infinity)!;
    sum += end.adventurer.xp - start.adventurer.xp;
  }
  remaining[L] = sum / n;
  console.log(`L${L}: ${pop.length} reached, mean remaining xp ${remaining[L].toFixed(0)} (${n} runs)`);
}
// piecewise-linear table by level
const known = Object.entries(remaining).map(([l, v]) => [Number(l), v] as [number, number]);
const table: number[] = [0];
for (let l = 1; l <= 50; l++) {
  let v: number;
  if (l <= known[0][0]) v = known[0][1];
  else if (l >= known[known.length - 1][0]) v = known[known.length - 1][1];
  else {
    const j = known.findIndex(([kl]) => kl >= l);
    const [l0, v0] = known[j - 1];
    const [l1, v1] = known[j];
    v = v0 + ((v1 - v0) * (l - l0)) / (l1 - l0);
  }
  table.push(Math.round(v));
}
console.log(JSON.stringify(table));
if (write) {
  const j = JSON.parse(readFileSync(path, 'utf8'));
  j.params.futureXpByLevel = table;
  writeFileSync(path, JSON.stringify(j, null, 2) + '\n');
  console.log(`futureXpByLevel written to ${path}`);
}
process.exit(0);
