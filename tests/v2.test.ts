import { test } from 'node:test';
import assert from 'node:assert/strict';
import { adventurerDefend } from '../src/game/adventurer.ts';
import { baseReward } from '../src/game/combat.ts';
import { TYPE } from '../src/game/constants.ts';
import { currentBeastV2, unpackAdventurer, v2BeastTier, v2BeastType } from '../src/v2/protocol.ts';
import { decodeAdventurer } from '../src/chain/state.ts';

// Encounters from real mainnet V2 games (packed adventurer as replay_transcript returned it), with what the chain
// then did: beast hits on the adventurer and the XP for the kill.
const REAL = [
  {
    name: 'Fairy',
    game: 904625697166532776746652061824565847215142356634039857385949574314741349409n,
    packed: 0x7018546d00002218c230078040018910000000000000000021e02370214022an,
    expect: { id: 21, tier: 1, type: TYPE.BladeHide, level: 6, health: 30 },
    hits: [45, 41, 41],
  },
  {
    name: 'Jaguar',
    game: 904625697166532776746652061824565847215142356634039857385949574353396942177n,
    packed: 0x39e0a5d30000621106100601e005092000000000ac70aa40abd0a990ab30a89n,
    expect: { id: 43, tier: 3, type: TYPE.BludgeonMetal, level: 6, health: 24 },
    hits: [23],
    killXp: 8,
  },
  {
    name: 'Spider',
    game: 904625697166532776746652061824565847215142356634039857385949574336216087617n,
    packed: 0x29a4ba0d0000810948100842000809d000000000de40de00d9f09380dd10d89n,
    expect: { id: 49, tier: 4, type: TYPE.MagicCloth, level: 9, health: 33 },
    hits: [22, 13, 17],
    killXp: 8,
  },
];

test('V2 beast tier/type map: tier cycles with the id, type changes every five ids', () => {
  assert.deepEqual([1, 2, 3, 4, 5, 6, 11, 16, 75].map(v2BeastTier), [1, 2, 3, 4, 5, 1, 1, 1, 5]);
  assert.deepEqual([1, 5, 6, 10, 11, 15, 16, 75].map(v2BeastType), [1, 1, 2, 2, 3, 3, 1, 3].map((t) => [0, TYPE.MagicCloth, TYPE.BladeHide, TYPE.BludgeonMetal][t]));
  for (let id = 1; id <= 75; id++) {
    assert.ok(v2BeastTier(id) >= 1 && v2BeastTier(id) <= 5);
  }
  // every tier and type is equally likely, like the V1 table: simulations stay valid
  const count = (f: (id: number) => number, v: number) => Array.from({ length: 75 }, (_, i) => f(i + 1)).filter((x) => x === v).length;
  for (const t of [1, 2, 3, 4, 5]) assert.equal(count(v2BeastTier, t), 15);
  for (const t of [TYPE.MagicCloth, TYPE.BladeHide, TYPE.BludgeonMetal]) assert.equal(count(v2BeastType, t), 25);
});

test('the derived beast explains the hits and kill XP of real V2 games', () => {
  for (const r of REAL) {
    const adv = unpackAdventurer(r.packed);
    const b = currentBeastV2(adv, r.game);
    assert.ok(b, r.name);
    assert.deepEqual({ id: b.id, tier: b.spec.tier, type: b.spec.type, level: b.spec.level, health: b.startingHealth }, r.expect, r.name);
    // every observed hit is one of the beast's possible hits (any armour slot, normal or critical)
    const a = decodeAdventurer(adv);
    const possible = new Set<number>();
    for (const slot of [2, 3, 4, 5, 6]) {
      const armor = a.equipment[slot];
      for (const critRnd of [0, 255]) possible.add(adventurerDefend(a, b, armor, { special1: 0, special2: 0, special3: 0 }, critRnd, critRnd === 0 ? 100 : 0).totalDamage);
    }
    for (const h of r.hits) assert.ok(possible.has(h), `${r.name}: hit ${h} not in {${[...possible]}}`);
    if (r.killXp) assert.equal(Math.max(4, baseReward(b.spec, Math.floor(Math.sqrt(adv.xp)))), r.killXp, `${r.name} kill xp`);
  }
});
