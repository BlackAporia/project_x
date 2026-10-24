import { test } from 'node:test';
import assert from 'node:assert/strict';
import { poseidonHashMany } from '@scure/starknet';
import {
  abilityAvoid,
  abilityAvoidProbability,
  attackHp,
  calculateDamage,
  critProbability,
  isCriticalHit,
  levelFromXp,
  randomLevel,
  randomStartingHealth,
} from '../src/game/combat.ts';
import { ExactRandom, FastRandom, feltToTwoU64, marketFromHash, splitBattle, splitRandomness } from '../src/game/rng.ts';
import { greatness, itemPrice, itemSpecials, lootInfo } from '../src/game/loot.ts';
import { generateBeast } from '../src/game/beast.ts';
import { TYPE } from '../src/game/constants.ts';
import { calculateLuck, emptyBag, emptyEquipment, loadAssets, maxHealth, potionPrice } from '../src/game/adventurer.ts';
import { applyAction, attack, buyItems, explore, flee, newGameState, selectStatUpgrades, startGame } from '../src/game/engine.ts';
import type { CombatSpec } from '../src/game/types.ts';

const noSp = { special1: 0, special2: 0, special3: 0 };

test('level from xp matches Cairo get_level_from_xp vectors', () => {
  const v: Array<[number, number]> = [
    [0, 1], [1, 1], [3, 1], [4, 2], [8, 2], [9, 3], [15, 3], [16, 4], [24, 4], [25, 5], [99, 9], [100, 10],
    [120, 10], [121, 11], [369, 19], [400, 20], [440, 20], [441, 21], [65535, 255],
  ];
  for (const [xp, lvl] of v) assert.equal(levelFromXp(xp), lvl, `xp ${xp}`);
});

test('random starting health matches Cairo vectors', () => {
  assert.equal(randomStartingHealth(1, 0), 11);
  assert.equal(randomStartingHealth(2, 29), 40);
  assert.equal(randomStartingHealth(19, 284), 295);
  assert.equal(randomStartingHealth(20, 0), 101);
  assert.equal(randomStartingHealth(20, 299), 400);
  assert.equal(randomStartingHealth(30, 449), 650);
  assert.equal(randomStartingHealth(40, 599), 1000);
  assert.equal(randomStartingHealth(50, 749), 1250);
  assert.equal(randomLevel(2, 0), 1);
  assert.equal(randomLevel(2, 3), 4);
  assert.equal(randomLevel(3, 5), 6);
});

test('attack hp by tier and level', () => {
  const spec = (tier: number, level: number): CombatSpec => ({ tier, type: TYPE.BladeHide, level, specials: noSp });
  assert.equal(attackHp(spec(5, 1)), 1);
  assert.equal(attackHp(spec(4, 20)), 40);
  assert.equal(attackHp(spec(3, 2)), 6);
  assert.equal(attackHp(spec(2, 20)), 80);
  assert.equal(attackHp(spec(1, 20)), 100);
});

test('calculate_damage matches Cairo test vectors', () => {
  const weapon: CombatSpec = { type: TYPE.BladeHide, tier: 5, level: 1, specials: noSp };
  const armor: CombatSpec = { type: TYPE.MagicCloth, tier: 5, level: 1, specials: noSp };
  assert.equal(calculateDamage(weapon, armor, 4, 0, 0, 0).totalDamage, 4);
  weapon.level = 4;
  assert.equal(calculateDamage(weapon, armor, 4, 0, 0, 0).totalDamage, 5);
  weapon.tier = 1;
  weapon.level = 1;
  assert.equal(calculateDamage(weapon, armor, 4, 0, 0, 0).totalDamage, 6);
  armor.type = TYPE.BludgeonMetal;
  assert.equal(calculateDamage(weapon, armor, 4, 0, 0, 0).totalDamage, 4);
  weapon.level = 20;
  armor.level = 40;
  armor.tier = 2;
  assert.equal(calculateDamage(weapon, armor, 4, 5, 100, 1).totalDamage, 4);
  armor.type = TYPE.MagicCloth;
  assert.equal(calculateDamage(weapon, armor, 4, 5, 100, 0).totalDamage, 215);
});

test('critical hit probability agrees with is_critical_hit enumeration', () => {
  for (const chance of [0, 1, 5, 25, 33, 50, 99, 100, 140]) {
    let n = 0;
    for (let rnd = 0; rnd < 256; rnd++) if (isCriticalHit(chance, rnd)) n++;
    assert.equal(critProbability(chance), n / 256, `chance ${chance}`);
  }
});

test('ability avoid probability agrees with enumeration', () => {
  for (const [lvl, stat] of [[10, 3], [10, 10], [25, 7], [3, 1], [40, 39]]) {
    let n = 0;
    for (let rnd = 0; rnd < 256; rnd++) if (abilityAvoid(lvl, stat, rnd)) n++;
    assert.equal(abilityAvoidProbability(lvl, stat), n / 256);
  }
});

// Independent re-implementation following client/src/utils/processFutures.ts (split_poseidon)
function referenceSplit(xp: number, seed: bigint) {
  const p = poseidonHashMany([BigInt(xp), seed]);
  const low = p & ((1n << 128n) - 1n);
  const r1u64 = low / 2n ** 64n;
  const r2u64 = low % 2n ** 64n;
  const r1u32 = r1u64 / 2n ** 32n;
  const r2u32 = r1u64 % 2n ** 32n;
  const r3u32 = r2u64 / 2n ** 32n;
  const r4u32 = r2u64 % 2n ** 32n;
  const r1u16 = r3u32 / 2n ** 16n;
  const r2u16 = r3u32 % 2n ** 16n;
  const r3u16 = r4u32 / 2n ** 16n;
  const r4u16 = r4u32 % 2n ** 16n;
  return [r1u32, r2u32, r1u16, r2u16, r3u16 / 256n, r3u16 % 256n, r4u16 / 256n, r4u16 % 256n].map(Number);
}

test('get_randomness split matches the reference implementation', () => {
  for (let i = 0; i < 25; i++) {
    const xp = i * 37;
    const seed = BigInt(i) * 0x9e3779b97f4a7c15n + 12345n;
    const r = splitRandomness(poseidonHashMany([BigInt(xp), seed]));
    assert.deepEqual([r.r32a, r.r32b, r.r16a, r.r16b, r.r8a, r.r8b, r.r8c, r.r8d], referenceSplit(xp, seed));
  }
});

test('battle randomness and market helpers are well formed', () => {
  const h = poseidonHashMany([5n, 77n, 9n]);
  const b = splitBattle(h);
  const v = Number(h & 0xffffffffn);
  assert.deepEqual(b, [(v >>> 24) & 0xff, (v >>> 16) & 0xff, (v >>> 8) & 0xff, v & 0xff]);
  const m = marketFromHash(poseidonHashMany([1n, 12345n]), 25);
  assert.ok(m.length <= 25);
  for (const id of m) assert.ok(id >= 1 && id <= 101);
  const [a, c] = feltToTwoU64((1n << 200n) + (5n << 64n) + 7n);
  assert.equal(a, 5n);
  assert.equal(c, 7n);
});

test('item table, greatness, prices and specials', () => {
  assert.equal(lootInfo(42).name, 'Katana');
  assert.equal(lootInfo(42).tier, 1);
  assert.equal(lootInfo(42).type, TYPE.BladeHide);
  assert.equal(greatness(0), 1);
  assert.equal(greatness(3), 1);
  assert.equal(greatness(4), 2);
  assert.equal(greatness(400), 20);
  assert.equal(itemPrice(42, 0), 20);
  assert.equal(itemPrice(42, 19), 1);
  assert.equal(itemPrice(42, 30), 1);
  assert.deepEqual(itemSpecials(42, 14, 1234), noSp);
  const sp = itemSpecials(42, 15, 1234);
  assert.ok(sp.special1 >= 1 && sp.special1 <= 16 && sp.special2 === 0);
  const sp19 = itemSpecials(42, 19, 1234);
  assert.ok(sp19.special2 >= 1 && sp19.special2 <= 69 && sp19.special3 >= 1 && sp19.special3 <= 18);
});

test('empty jewelry slots still count luck 1 each (contract quirk)', () => {
  assert.equal(calculateLuck(emptyEquipment(), emptyBag()), 2);
});

test('beast generation ranges', () => {
  const b = generateBeast(10, TYPE.BladeHide, 123456, 777, 29, 3, 4);
  assert.equal(b.id, (123456 % 75) + 1);
  assert.ok(b.spec.level >= 1 && b.spec.level <= 30);
  assert.ok(b.startingHealth >= 11 && b.startingHealth <= 210);
  const starter = generateBeast(1, TYPE.MagicCloth, 1, 1, 1, 1, 1);
  assert.equal(starter.id, 71);
  assert.equal(starter.startingHealth, 3);
});

test('start game, kill starter beast, reveal stats, explore (exact katana randomness)', () => {
  const rng = new ExactRandom();
  let s = newGameState(123456789n);
  let r = startGame(s, 46, rng); // Short Sword
  s = r.state;
  assert.equal(s.adventurer.health, 90);
  assert.equal(s.adventurer.beastHealth, 3);
  assert.equal(s.beast?.id, 21); // Fairy for a blade weapon
  assert.throws(() => flee(s, false, rng), /Cant flee starter beast/);
  r = attack(s, false, rng);
  s = r.state;
  assert.equal(s.adventurer.beastHealth, 0);
  assert.equal(s.adventurer.xp, 4);
  assert.equal(s.adventurer.statUpgrades, 1);
  const st = s.adventurer.stats;
  assert.equal(st.str + st.dex + st.vit + st.int + st.wis + st.cha, 12);
  assert.equal(s.adventurer.health, 90 + 15 * st.vit);
  assert.ok(r.events.some((e) => e.type === 'level_up'));
  assert.ok(s.market.length > 0);
  assert.throws(() => explore(s, false, rng), /Stat upgrade available/);
  s = selectStatUpgrades(s, { cha: 1 }, rng).state;
  assert.equal(s.adventurer.stats.cha, st.cha + 1);
  // deterministic: same state + same action => same result
  const a = explore(s, false, rng);
  const b = explore(s, false, rng);
  assert.deepEqual(a.events, b.events);
  assert.equal(a.state.adventurer.xp >= s.adventurer.xp, true);
});

test('buy potions respects charisma price and health cap', () => {
  const rng = new ExactRandom();
  let s = startGame(newGameState(42n), 12, rng).state;
  s = attack(s, false, rng).state;
  s = selectStatUpgrades(s, { vit: 1 }, rng).state;
  const eff = loadAssets(s.adventurer, s.bag);
  const max = maxHealth(eff.stats);
  if (eff.health >= max) {
    assert.throws(() => buyItems(s, 1, [], rng), /Health already full/);
  } else {
    const price = potionPrice(eff);
    const before = s.adventurer.gold;
    const after = buyItems(s, 1, [], rng).state;
    assert.equal(after.adventurer.gold, before - price);
  }
});

test('fast-random full games never violate invariants', () => {
  for (let g = 0; g < 40; g++) {
    const rng = new FastRandom(1000 + g);
    let s = startGame(newGameState(BigInt(g + 1)), 76, rng).state;
    for (let step = 0; step < 3000 && s.adventurer.health > 0; step++) {
      const adv = s.adventurer;
      let r;
      if (adv.beastHealth > 0) {
        r = attack(s, true, rng);
      } else if (adv.statUpgrades > 0) {
        r = selectStatUpgrades(s, { vit: adv.statUpgrades }, rng);
      } else {
        r = applyAction(s, { type: 'explore', tillBeast: false }, rng);
      }
      s = r.state;
      const eff = loadAssets(s.adventurer, s.bag);
      assert.ok(eff.health <= maxHealth(eff.stats));
      assert.ok(s.adventurer.gold <= 511);
      assert.ok(s.adventurer.health >= 0);
    }
    assert.equal(s.adventurer.health, 0);
  }
});
