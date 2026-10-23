// Build profile of the bot by level (compare with scripts/analyze-leaders.py): stats, luck, max health, gold,
// average item greatness, bag size, owned jewelry, G20 items.
// Usage: node --import tsx scripts/profile.ts <games> [dungeon|v1] [policy]
import { Policy } from '../src/ai/policy.ts';
import { loadParams } from '../src/ai/params.ts';
import { level, loadAssets, maxHealth } from '../src/game/adventurer.ts';
import { dungeonEngineSettings } from '../src/game/dungeons.ts';
import { applyAction, isDead, newGameState } from '../src/game/engine.ts';
import { greatness, isJewelry } from '../src/game/loot.ts';
import { FastRandom } from '../src/game/rng.ts';
import type { GameState } from '../src/game/types.ts';

const games = Number(process.argv[2] ?? 300);
const dungeon = process.argv[3] ?? 'v1';
const policy = new Policy(loadParams(process.argv[4] ?? 'policy/policy.json'), { fast: true });
const settings = dungeon === 'v1' ? undefined : dungeonEngineSettings(dungeon).settings;
const LEVELS = [5, 10, 15, 20, 25, 30, 35, 40];
type Row = Record<string, number>;
const rows = new Map<number, Row[]>();
const totals = { equipsBattle: 0, equipsOut: 0, potions: 0, bought: 0, xp: 0 };

function snapshot(s: GameState): Row {
  const a = loadAssets(s.adventurer, s.bag);
  const eq = a.equipment.slice(1).filter((i) => i.id);
  const owned = [...eq, ...s.bag.filter((i) => i.id)];
  return {
    str: a.stats.str, dex: a.stats.dex, vit: a.stats.vit, int: a.stats.int, wis: a.stats.wis, cha: a.stats.cha, luck: a.stats.luck,
    maxHp: maxHealth(a.stats), gold: a.gold,
    avgG: eq.reduce((t, i) => t + greatness(i.xp), 0) / Math.max(1, eq.length),
    bag: s.bag.filter((i) => i.id).length,
    jewelry: owned.filter((i) => isJewelry(i.id)).length,
    g20: owned.filter((i) => greatness(i.xp) >= 20).length,
  };
}

for (let g = 0; g < games; g++) {
  const rng = new FastRandom(70_000_000 + g);
  let s = newGameState(BigInt(g + 1), settings);
  let seen = 0;
  let n = 0;
  while (!isDead(s) && n++ < 20000) {
    const d = policy.decide(s);
    if (!d.actions.length) break;
    for (const act of d.actions) {
      if (act.type === 'equip') s.adventurer.beastHealth > 0 ? totals.equipsBattle++ : totals.equipsOut++;
      if (act.type === 'buy') {
        totals.potions += act.potions;
        totals.bought += act.items.length;
      }
      s = applyAction(s, act, rng).state;
      if (isDead(s)) break;
    }
    const lvl = level(s.adventurer);
    for (const L of LEVELS) {
      if (L > seen && lvl >= L && s.adventurer.beastHealth === 0) {
        if (!rows.has(L)) rows.set(L, []);
        rows.get(L)!.push(snapshot(s));
        seen = L;
      }
    }
  }
  totals.xp += s.adventurer.xp;
}

console.log(`${games} games (${dungeon}), mean xp ${(totals.xp / games).toFixed(0)}; per game: equips in battle ${(totals.equipsBattle / games).toFixed(1)}, outside ${(totals.equipsOut / games).toFixed(1)}, items bought ${(totals.bought / games).toFixed(1)}, potions ${(totals.potions / games).toFixed(0)}`);
const keys = ['str', 'dex', 'vit', 'int', 'wis', 'cha', 'luck', 'maxHp', 'gold', 'avgG', 'bag', 'jewelry', 'g20'];
console.log(['lvl', 'n', ...keys].map((k) => k.padStart(6)).join(''));
for (const L of LEVELS) {
  const rs = rows.get(L) ?? [];
  if (!rs.length) continue;
  const m = (k: string) => rs.reduce((t, r) => t + r[k], 0) / rs.length;
  console.log([String(L), String(rs.length), ...keys.map((k) => m(k).toFixed(1))].map((x) => x.padStart(6)).join(''));
}
process.exit(0);
