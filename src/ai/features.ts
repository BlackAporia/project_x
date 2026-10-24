// State features shared by the self-play dataset (GPU trainer input) and the value network at decision time.
import { ARMOR_SLOTS, SLOT } from '../game/constants.ts';
import { loadAssets, maxHealth } from '../game/adventurer.ts';
import { greatness, lootInfo } from '../game/loot.ts';
import type { Adventurer, Item } from '../game/types.ts';

export const FEATURE_NAMES = [
  'level', 'hp_frac', 'max_hp', 'gold', 'str', 'dex', 'vit', 'int', 'wis', 'cha', 'luck',
  'weapon_tier_power', 'weapon_greatness', 'armor_slots', 'armor_power', 'armor_greatness', 'jewelry', 'bag_items',
] as const;

/** Item strength proxy: (6 - tier) * greatness (tier 1 is best). */
const power = (it: Item) => (it.id ? (6 - lootInfo(it.id).tier) * greatness(it.xp) : 0);

/** `stored` adventurer (no boosts) + bag -> fixed-length feature vector. `healthOverride` lets callers ask "what if". */
export function stateFeatures(stored: Adventurer, bag: Item[], healthOverride?: number): number[] {
  return loadedFeatures(loadAssets(stored, bag), bag, healthOverride);
}

/** Same as stateFeatures for an adventurer that already has its item boosts applied (loadAssets). */
export function loadedFeatures(a: Adventurer, bag: Item[], healthOverride?: number, goldOverride?: number, levelOverride?: number): number[] {
  const lvl = levelOverride ?? (a.xp === 0 ? 1 : Math.floor(Math.sqrt(a.xp)));
  const mh = maxHealth(a.stats);
  const hp = healthOverride ?? a.health;
  const w = a.equipment[SLOT.Weapon];
  let armorSlots = 0;
  let armorPower = 0;
  let armorG = 0;
  for (const sl of ARMOR_SLOTS) {
    const it = a.equipment[sl];
    if (!it.id) continue;
    armorSlots++;
    armorPower += power(it);
    armorG += greatness(it.xp);
  }
  const jewelry = (a.equipment[SLOT.Neck].id ? 1 : 0) + (a.equipment[SLOT.Ring].id ? 1 : 0);
  return [
    lvl, mh ? hp / mh : 0, mh, goldOverride ?? a.gold, a.stats.str, a.stats.dex, a.stats.vit, a.stats.int, a.stats.wis, a.stats.cha, a.stats.luck,
    power(w), w.id ? greatness(w.xp) : 0, armorSlots, armorPower, armorG, jewelry, bag.filter((b) => b.id).length,
  ];
}
