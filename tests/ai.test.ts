import { test } from 'node:test';
import assert from 'node:assert/strict';
import { solveBattle } from '../src/ai/battle.ts';
import { DEFAULT_PARAMS } from '../src/ai/params.ts';
import { Policy } from '../src/ai/policy.ts';
import { applyAction, isDead, newGameState } from '../src/game/engine.ts';
import { dungeonEngineSettings } from '../src/game/dungeons.ts';
import { FastRandom } from '../src/game/rng.ts';
import { reachProbabilities, splitRun } from '../src/sim/splitting.ts';

function battleInput(heroHp: number) {
  const win = new Float64Array(heroHp + 1);
  const escape = new Float64Array(heroHp + 1);
  for (let h = 1; h <= heroHp; h++) {
    win[h] = 100 + h * 0.3;
    escape[h] = 40 + h * 0.2;
  }
  return {
    heroHp,
    beastHp: 97,
    hero: [{ dmg: 12, p: 0.7 }, { dmg: 24, p: 0.3 }],
    beast: [{ dmg: 3, p: 0.5 }, { dmg: 9, p: 0.4 }, { dmg: 20, p: 0.1 }],
    pFlee: 0.45,
    win,
    escape,
  };
}

test('battle solver root values equal a fresh solve at every lower hero health', () => {
  const full = solveBattle({ ...battleInput(60), wantRoots: true });
  assert.ok(full.roots);
  assert.equal(full.roots![60], full.value);
  for (const h of [1, 7, 23, 41, 59]) {
    const at = solveBattle(battleInput(h));
    assert.ok(Math.abs(full.roots![h] - at.value) < 1e-9, `h=${h}: ${full.roots![h]} vs ${at.value}`);
  }
});

test('multilevel splitting reports consistent stages and decreasing reach probabilities', () => {
  const policy = new Policy(DEFAULT_PARAMS, { fast: true });
  const stages = splitRun(policy, { seeds: Array.from({ length: 40 }, (_, i) => i), levels: [3, 6, 8], effort: 30, seed: 5 });
  assert.equal(stages.length, 3);
  assert.equal(stages[0].tried, 40);
  for (const s of stages) assert.ok(s.reached <= s.tried);
  const reach = reachProbabilities(stages);
  for (let i = 1; i < reach.length; i++) assert.ok(reach[i].p <= reach[i - 1].p);
});

test('leader-strategy policy plays V2 mainnet-rule games to the end without engine errors', () => {
  const params = { ...DEFAULT_PARAMS, jewelryRotateG: 20, jewelryCollectGain: 40, rotateG: 20, rotateMaxRisk: 0.01, rotateBuyGain: 30, killSwap: 1, collectGain: 20 };
  const policy = new Policy(params, { fast: true });
  const settings = dungeonEngineSettings('default:mainnet').settings;
  for (let seed = 0; seed < 12; seed++) {
    let s = newGameState(BigInt(seed + 1), settings);
    const rng = new FastRandom(seed);
    for (let n = 0; n < 5000 && !isDead(s); n++) {
      const d = policy.decide(s);
      assert.ok(d.actions.length > 0);
      for (const a of d.actions) {
        s = applyAction(s, a, rng).state; // throws on any illegal action (equip/drop/buy)
        if (isDead(s)) break;
      }
    }
    assert.ok(isDead(s));
  }
});
