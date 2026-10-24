// Item metadata and item specials (models/loot.cairo, models/adventurer/item.cairo, stats.cairo suffix boosts).
import {
  CHARISMA_ITEM_DISCOUNT,
  ITEM_MAX_GREATNESS,
  ITEM_SUFFIX_LENGTH,
  MINIMUM_ITEM_PRICE,
  NAME_PREFIX_LENGTH,
  NAME_SUFFIX_LENGTH,
  NUM_ITEMS,
  PREFIXES_UNLOCK_GREATNESS,
  SLOT,
  SUFFIX_UNLOCK_GREATNESS,
  TIER_PRICE,
  TYPE,
} from './constants.ts';
import { ITEM_ID, ITEM_ROWS, ITEM_SUFFIXES, NAME_PREFIXES, NAME_SUFFIXES, SLOT_LENGTH } from './data.ts';
import type { Item, SpecialPowers, Stats } from './types.ts';

export interface LootInfo {
  id: number;
  name: string;
  tier: number;
  type: number;
  slot: number;
  index: number;
}

const NONE: LootInfo = { id: 0, name: 'None', tier: 0, type: TYPE.None, slot: SLOT.None, index: 0 };
const TABLE: LootInfo[] = [NONE];
for (const [id, name, tier, type, slot, index] of ITEM_ROWS) TABLE[id] = { id, name, tier, type, slot, index };

export function lootInfo(id: number): LootInfo {
  return TABLE[id] ?? NONE;
}

export const ALL_ITEM_IDS: readonly number[] = ITEM_ROWS.map((r) => r[0]);

export function isJewelry(id: number): boolean {
  const t = lootInfo(id).type;
  return t === TYPE.Necklace || t === TYPE.Ring;
}

export function isWeapon(id: number): boolean {
  return lootInfo(id).slot === SLOT.Weapon;
}

export function isArmor(id: number): boolean {
  const s = lootInfo(id).slot;
  return s >= SLOT.Chest && s <= SLOT.Hand;
}

/** ImplItem::get_greatness: xp 0 -> 1, otherwise floor(sqrt(xp)) capped at 20. */
export function greatness(xp: number): number {
  if (xp === 0) return 1;
  const g = Math.floor(Math.sqrt(xp));
  return g > ITEM_MAX_GREATNESS ? ITEM_MAX_GREATNESS : g;
}

/** ImplLoot::get_specials_seed (u16 arithmetic). */
export function specialsSeed(itemId: number, entropy: number): number {
  let itemEntropy = entropy + itemId;
  if (itemEntropy > 0xffff) itemEntropy = entropy - itemId;
  const rnd = itemEntropy % NUM_ITEMS;
  const info = lootInfo(itemId);
  return rnd * SLOT_LENGTH[info.slot] + info.index;
}

export function itemSuffix(itemId: number, seed: number): number {
  return (specialsSeed(itemId, seed) % ITEM_SUFFIX_LENGTH) + 1;
}

export function itemPrefix1(itemId: number, seed: number): number {
  return (specialsSeed(itemId, seed) % NAME_PREFIX_LENGTH) + 1;
}

export function itemPrefix2(itemId: number, seed: number): number {
  return (specialsSeed(itemId, seed) % NAME_SUFFIX_LENGTH) + 1;
}

const NO_SPECIALS: SpecialPowers = Object.freeze({ special1: 0, special2: 0, special3: 0 }) as SpecialPowers;

/** ImplLoot::get_specials(id, greatness, seed). */
export function itemSpecials(itemId: number, g: number, seed: number): SpecialPowers {
  if (itemId === 0 || g < SUFFIX_UNLOCK_GREATNESS) return NO_SPECIALS;
  if (g < PREFIXES_UNLOCK_GREATNESS) return { special1: itemSuffix(itemId, seed), special2: 0, special3: 0 };
  return { special1: itemSuffix(itemId, seed), special2: itemPrefix1(itemId, seed), special3: itemPrefix2(itemId, seed) };
}

export function noSpecials(): SpecialPowers {
  return NO_SPECIALS;
}

/** ImplMarket::get_price */
export function basePrice(tier: number): number {
  return tier === 0 ? 0 : (6 - tier) * TIER_PRICE;
}

/** charisma_adjusted_item_price */
export function itemPrice(itemId: number, charisma: number): number {
  const base = basePrice(lootInfo(itemId).tier);
  const discount = CHARISMA_ITEM_DISCOUNT * charisma;
  return discount >= base ? MINIMUM_ITEM_PRICE : base - discount;
}

/** Gold received instead of a loot discovery that cannot be taken (by tier). */
export function lootGoldValue(tier: number): number {
  return [0, 20, 16, 12, 8, 4][tier] ?? 0;
}

// --- suffix boosts (ImplStats::apply_suffix_boost / apply_bag_boost) ---

/** Part of a suffix that applies only while the item is equipped (STR/DEX/INT/WIS). */
export function applySuffixBoost(stats: Stats, suffix: number, sign = 1): void {
  switch (suffix) {
    case 1: stats.str += 3 * sign; break; // of Power
    case 3: stats.str += 2 * sign; break; // of Titans
    case 4: stats.dex += 3 * sign; break; // of Skill
    case 5: stats.str += sign; stats.dex += sign; break; // of Perfection
    case 6: stats.int += 3 * sign; break; // of Brilliance
    case 7: stats.wis += 3 * sign; break; // of Enlightenment
    case 8: stats.dex += sign; break; // of Protection
    case 9: stats.str += 2 * sign; stats.dex += sign; break; // of Anger
    case 10: stats.str += sign; stats.wis += sign; break; // of Rage
    case 11: stats.int += sign; break; // of Fury
    case 12: stats.int += 2 * sign; stats.wis += sign; break; // of Vitriol
    case 13: stats.dex += 2 * sign; break; // of the Fox
    case 14: stats.wis += 2 * sign; stats.dex += sign; break; // of Detection
    case 15: stats.int += sign; stats.wis += 2 * sign; break; // of Reflection
    default: break; // of Giant / of the Twins have no equipped-only part
  }
}

/** Part of a suffix that applies while the item is equipped OR in the bag (VIT/CHA). */
export function applyBagBoost(stats: Stats, suffix: number, sign = 1): void {
  switch (suffix) {
    case 2: stats.vit += 3 * sign; break; // of Giant
    case 3: stats.cha += sign; break; // of Titans
    case 5: stats.vit += sign; break; // of Perfection
    case 8: stats.vit += 2 * sign; break; // of Protection
    case 10: stats.cha += sign; break; // of Rage
    case 11: stats.vit += sign; stats.cha += sign; break; // of Fury
    case 13: stats.cha += sign; break; // of the Fox
    case 16: stats.cha += 3 * sign; break; // of the Twins
    default: break;
  }
}

/** ImplAdventurer::get_vitality_item_boost */
export function vitalityItemBoost(suffix: number): number {
  switch (suffix) {
    case 2: return 3;
    case 5: return 1;
    case 8: return 2;
    case 11: return 1;
    default: return 0;
  }
}

export function suffixName(suffix: number): string {
  return ITEM_SUFFIXES[suffix] ?? '';
}

/** Full display name of an item, including specials once unlocked. */
export function itemDisplayName(item: Item, seed: number): string {
  const info = lootInfo(item.id);
  if (item.id === 0) return 'None';
  const g = greatness(item.xp);
  const sp = itemSpecials(item.id, g, seed);
  let name = info.name;
  if (sp.special2) name = `"${NAME_PREFIXES[sp.special2]} ${NAME_SUFFIXES[sp.special3]}" ${name}`;
  if (sp.special1) name = `${name} ${ITEM_SUFFIXES[sp.special1]}`;
  return `${name} (G${g})`;
}

export { ITEM_ID };
