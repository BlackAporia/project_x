// Adventurer, equipment, bag and stats helpers (models/adventurer/*.cairo, systems/adventurer).
import {
  BAG_SIZE,
  BASE_POTION_PRICE,
  CHARISMA_POTION_DISCOUNT,
  CRITICAL_HIT_LEVEL_MULTIPLIER,
  HEALTH_INCREASE_PER_VITALITY,
  ITEM_MAX_XP,
  JEWELRY_BONUS_BEAST_GOLD_PERCENT,
  JEWELRY_BONUS_CRITICAL_HIT_PERCENT_PER_GREATNESS,
  JEWELRY_BONUS_NAME_MATCH_PERCENT_PER_GREATNESS,
  MAX_ADVENTURER_HEALTH,
  MAX_ADVENTURER_XP,
  MAX_GOLD,
  MAX_STAT_UPGRADES_AVAILABLE,
  MINIMUM_DAMAGE_FROM_BEASTS,
  MINIMUM_DAMAGE_FROM_OBSTACLES,
  MINIMUM_DAMAGE_TO_BEASTS,
  MINIMUM_POTION_PRICE,
  NECKLACE_ARMOR_BONUS,
  SILVER_RING_LUCK_BONUS_PER_GREATNESS,
  SLOT,
  STARTER_BEAST_HEALTH,
  STARTING_GOLD,
  STARTING_HEALTH,
  SUFFIX_UNLOCK_GREATNESS,
  TYPE,
  VITALITY_INSTANT_HEALTH_BONUS,
} from './constants.ts';
import { calculateDamage, levelFromXp, type CombatResult } from './combat.ts';
import { ITEM_ID } from './data.ts';
import {
  applyBagBoost,
  applySuffixBoost,
  greatness,
  isJewelry,
  itemSpecials,
  itemSuffix,
  lootInfo,
  vitalityItemBoost,
} from './loot.ts';
import type { Adventurer, Beast, CombatSpec, Item, Obstacle, SpecialPowers, Stats } from './types.ts';

export function emptyStats(): Stats {
  return { str: 0, dex: 0, vit: 0, int: 0, wis: 0, cha: 0, luck: 0 };
}

export function cloneStats(s: Stats): Stats {
  return { str: s.str, dex: s.dex, vit: s.vit, int: s.int, wis: s.wis, cha: s.cha, luck: s.luck };
}

export function emptyItem(): Item {
  return { id: 0, xp: 0 };
}

export function emptyEquipment(): Item[] {
  const e: Item[] = [];
  for (let i = 0; i <= 8; i++) e.push({ id: 0, xp: 0 });
  return e;
}

export function emptyBag(): Item[] {
  const b: Item[] = [];
  for (let i = 0; i < BAG_SIZE; i++) b.push({ id: 0, xp: 0 });
  return b;
}

export function cloneItems(items: Item[]): Item[] {
  const out: Item[] = new Array(items.length);
  for (let i = 0; i < items.length; i++) out[i] = { id: items[i].id, xp: items[i].xp };
  return out;
}

export function cloneAdventurer(a: Adventurer): Adventurer {
  return {
    health: a.health,
    xp: a.xp,
    gold: a.gold,
    beastHealth: a.beastHealth,
    statUpgrades: a.statUpgrades,
    stats: cloneStats(a.stats),
    equipment: cloneItems(a.equipment),
    itemSpecialsSeed: a.itemSpecialsSeed,
    actionCount: a.actionCount,
  };
}

/** ImplAdventurer::new */
export function newAdventurer(startingWeapon: number): Adventurer {
  const equipment = emptyEquipment();
  equipment[SLOT.Weapon] = { id: startingWeapon, xp: 0 };
  return {
    health: STARTING_HEALTH,
    xp: 0,
    gold: STARTING_GOLD,
    beastHealth: STARTER_BEAST_HEALTH,
    statUpgrades: 0,
    stats: emptyStats(),
    equipment,
    itemSpecialsSeed: 0,
    actionCount: 0,
  };
}

export function level(a: Adventurer): number {
  return levelFromXp(a.xp);
}

export function maxHealth(stats: Stats): number {
  const h = STARTING_HEALTH + stats.vit * HEALTH_INCREASE_PER_VITALITY;
  return h > MAX_ADVENTURER_HEALTH ? MAX_ADVENTURER_HEALTH : h;
}

export function increaseHealth(a: Adventurer, amount: number): void {
  const nh = a.health + amount;
  const max = maxHealth(a.stats);
  a.health = nh > max ? max : nh;
}

export function decreaseHealth(a: Adventurer, value: number): void {
  a.health = value > a.health ? 0 : a.health - value;
}

export function increaseGold(a: Adventurer, amount: number): void {
  const n = a.gold + amount;
  a.gold = n > MAX_GOLD ? MAX_GOLD : n;
}

export function deductGold(a: Adventurer, amount: number): void {
  a.gold = amount > a.gold ? 0 : a.gold - amount;
}

export function increaseStatUpgrades(a: Adventurer, amount: number): void {
  const n = a.statUpgrades + amount;
  a.statUpgrades = n > MAX_STAT_UPGRADES_AVAILABLE ? MAX_STAT_UPGRADES_AVAILABLE : n;
}

/** increase_adventurer_xp — returns [previousLevel, newLevel] and grants stat points on level up. */
export function increaseXp(a: Adventurer, amount: number): [number, number] {
  const prev = level(a);
  const n = a.xp + amount;
  a.xp = n > MAX_ADVENTURER_XP ? MAX_ADVENTURER_XP : n;
  const next = level(a);
  if (next > prev) increaseStatUpgrades(a, next - prev);
  return [prev, next];
}

export function incrementActionCount(a: Adventurer): void {
  a.actionCount = a.actionCount + 1 > 0xffff ? 0 : a.actionCount + 1;
}

export function potionPrice(a: Adventurer): number {
  const discount = CHARISMA_POTION_DISCOUNT * a.stats.cha;
  const price = BASE_POTION_PRICE * level(a);
  return discount >= price ? MINIMUM_POTION_PRICE : price - discount;
}

export function canExplore(a: Adventurer): boolean {
  return a.health !== 0 && a.beastHealth === 0 && a.statUpgrades === 0;
}

export function inBattle(a: Adventurer): boolean {
  return a.beastHealth !== 0;
}

// --- equipment ---

export function itemAtSlot(equipment: Item[], slot: number): Item {
  return slot >= 1 && slot <= 8 ? equipment[slot] : { id: 0, xp: 0 };
}

export function isEquipped(equipment: Item[], itemId: number): boolean {
  for (let s = 1; s <= 8; s++) if (equipment[s].id === itemId) return true;
  return false;
}

export function equippedItem(equipment: Item[], itemId: number): Item {
  for (let s = 1; s <= 8; s++) if (equipment[s].id === itemId) return equipment[s];
  return { id: 0, xp: 0 };
}

export function equipItem(equipment: Item[], item: Item): void {
  const slot = lootInfo(item.id).slot;
  if (slot === SLOT.None) return;
  equipment[slot] = { id: item.id, xp: item.xp };
}

export function dropEquipped(equipment: Item[], itemId: number): void {
  for (let s = 1; s <= 8; s++) {
    if (equipment[s].id === itemId) {
      equipment[s] = { id: 0, xp: 0 };
      return;
    }
  }
  throw new Error('item is not equipped');
}

export function equipmentHasSpecials(equipment: Item[]): boolean {
  for (let s = 1; s <= 8; s++) if (equipment[s].id !== 0 && greatness(equipment[s].xp) >= SUFFIX_UNLOCK_GREATNESS) return true;
  return false;
}

/** Equipment::get_stat_boosts — full suffix boost for every equipped item at greatness >= 15. */
export function equipmentStatBoosts(equipment: Item[], seed: number): Stats {
  const stats = emptyStats();
  for (let s = 1; s <= 8; s++) {
    const it = equipment[s];
    if (it.id !== 0 && greatness(it.xp) >= SUFFIX_UNLOCK_GREATNESS) {
      const suffix = itemSuffix(it.id, seed);
      applySuffixBoost(stats, suffix);
      applyBagBoost(stats, suffix);
    }
  }
  return stats;
}

// --- bag ---

export function bagContains(bag: Item[], itemId: number): Item | null {
  if (itemId === 0) throw new Error('Item ID cannot be 0');
  for (const it of bag) if (it.id === itemId) return it;
  return null;
}

export function bagIsFull(bag: Item[]): boolean {
  for (const it of bag) if (it.id === 0) return false;
  return true;
}

export function bagCount(bag: Item[]): number {
  let n = 0;
  for (const it of bag) if (it.id !== 0) n++;
  return n;
}

export function bagAdd(bag: Item[], item: Item): void {
  if (item.id === 0) throw new Error('Item ID cannot be 0');
  for (let i = 0; i < bag.length; i++) {
    if (bag[i].id === 0) {
      bag[i] = { id: item.id, xp: item.xp };
      return;
    }
  }
  throw new Error('Bag is full');
}

export function bagRemove(bag: Item[], itemId: number): Item {
  for (let i = 0; i < bag.length; i++) {
    if (bag[i].id === itemId) {
      const removed = bag[i];
      bag[i] = { id: 0, xp: 0 };
      return removed;
    }
  }
  throw new Error('Item not in bag');
}

export function bagHasSpecials(bag: Item[]): boolean {
  for (const it of bag) if (it.id !== 0 && greatness(it.xp) >= SUFFIX_UNLOCK_GREATNESS) return true;
  return false;
}

/** Bag::get_stat_boosts — only the VIT/CHA part applies to bagged items. */
export function bagStatBoosts(bag: Item[], seed: number): Stats {
  const stats = emptyStats();
  for (const it of bag) {
    if (it.id !== 0 && greatness(it.xp) >= SUFFIX_UNLOCK_GREATNESS) applyBagBoost(stats, itemSuffix(it.id, seed));
  }
  return stats;
}

export function bagJewelryGreatness(bag: Item[]): number {
  let total = 0;
  for (const it of bag) if (it.id !== 0 && isJewelry(it.id)) total += greatness(it.xp);
  return total;
}

// --- stats & luck ---

export function addStats(target: Stats, delta: Stats, sign = 1): void {
  target.str += sign * delta.str;
  target.dex += sign * delta.dex;
  target.vit += sign * delta.vit;
  target.int += sign * delta.int;
  target.wis += sign * delta.wis;
  target.cha += sign * delta.cha;
}

export function jewelryBonusLuck(item: Item): number {
  return item.id === ITEM_ID.SilverRing ? greatness(item.xp) * SILVER_RING_LUCK_BONUS_PER_GREATNESS : 0;
}

/**
 * Equipment::calculate_luck. Note the contract calls get_greatness() on the neck and ring slots even when
 * they are empty (xp 0 -> greatness 1), so an adventurer without jewelry has luck 2.
 */
export function calculateLuck(equipment: Item[], bag: Item[]): number {
  const neck = equipment[SLOT.Neck];
  const ring = equipment[SLOT.Ring];
  return greatness(neck.xp) + greatness(ring.xp) + jewelryBonusLuck(ring) + bagJewelryGreatness(bag);
}

/**
 * adventurer_systems::load_assets — apply item stat boosts and luck to a stored adventurer.
 * Returns a new object; the input is not modified.
 */
export function loadAssets(stored: Adventurer, bag: Item[]): Adventurer {
  const a = cloneAdventurer(stored);
  if (equipmentHasSpecials(a.equipment)) addStats(a.stats, equipmentStatBoosts(a.equipment, a.itemSpecialsSeed));
  if (bagHasSpecials(bag)) addStats(a.stats, bagStatBoosts(bag, a.itemSpecialsSeed));
  a.stats.luck = calculateLuck(a.equipment, bag);
  return a;
}

/** adventurer_systems::remove_stat_boosts (luck is not persisted). */
export function removeBoosts(loaded: Adventurer, bag: Item[]): Adventurer {
  const a = cloneAdventurer(loaded);
  if (equipmentHasSpecials(a.equipment)) addStats(a.stats, equipmentStatBoosts(a.equipment, a.itemSpecialsSeed), -1);
  if (bagHasSpecials(bag)) addStats(a.stats, bagStatBoosts(bag, a.itemSpecialsSeed), -1);
  a.stats.luck = 0;
  return a;
}

// --- jewelry bonuses ---

export function jewelryGoldBonus(ring: Item, baseGold: number): number {
  if (ring.id !== ITEM_ID.GoldRing) return 0;
  return Math.floor((baseGold * JEWELRY_BONUS_BEAST_GOLD_PERCENT * greatness(ring.xp)) / 100);
}

export function nameMatchBonusDamage(ring: Item, baseDamage: number): number {
  if (ring.id !== ITEM_ID.PlatinumRing) return 0;
  return Math.floor((baseDamage * JEWELRY_BONUS_NAME_MATCH_PERCENT_PER_GREATNESS * greatness(ring.xp)) / 100);
}

export function criticalHitBonusDamage(ring: Item, baseDamage: number): number {
  if (ring.id !== ITEM_ID.TitaniumRing) return 0;
  return Math.floor((baseDamage * JEWELRY_BONUS_CRITICAL_HIT_PERCENT_PER_GREATNESS * greatness(ring.xp)) / 100);
}

/** jewelry_armor_bonus: Amulet↔Cloth, Pendant↔Hide, Necklace↔Metal. */
export function jewelryArmorBonus(neck: Item, armorType: number, baseArmor: number): number {
  if (neck.id === 0) return 0;
  if (armorType === TYPE.MagicCloth && neck.id !== ITEM_ID.Amulet) return 0;
  if (armorType === TYPE.BladeHide && neck.id !== ITEM_ID.Pendant) return 0;
  if (armorType === TYPE.BludgeonMetal && neck.id !== ITEM_ID.Necklace) return 0;
  if (armorType === TYPE.None || armorType === TYPE.Necklace || armorType === TYPE.Ring) return 0;
  return Math.floor((baseArmor * (greatness(neck.xp) * NECKLACE_ARMOR_BONUS)) / 100);
}

// --- combat helpers on the adventurer ---

export function weaponSpec(a: Adventurer): CombatSpec {
  const w = a.equipment[SLOT.Weapon];
  const info = lootInfo(w.id);
  const g = greatness(w.xp);
  return { tier: info.tier, type: info.type, level: w.id === 0 ? 0 : g, specials: itemSpecials(w.id, g, a.itemSpecialsSeed) };
}

/** ImplAdventurer::attack (weapon vs beast) including ring bonuses. */
export function adventurerAttack(a: Adventurer, weapon: CombatSpec, beast: Beast, critRnd: number): CombatResult {
  const r = calculateDamage(weapon, beast.spec, MINIMUM_DAMAGE_TO_BEASTS, a.stats.str, a.stats.luck, critRnd);
  const ring = a.equipment[SLOT.Ring];
  r.totalDamage += nameMatchBonusDamage(ring, r.weaponSpecialBonus) + criticalHitBonusDamage(ring, r.criticalHitBonus);
  return r;
}

export function armorSpec(a: Adventurer, armor: Item, withSpecials: boolean): CombatSpec {
  const info = lootInfo(armor.id);
  const g = greatness(armor.xp);
  return {
    tier: info.tier,
    type: info.type,
    level: armor.id === 0 ? 1 : g, // empty slot: tier None -> armor HP 0 regardless of level
    specials: withSpecials ? itemSpecials(armor.id, g, a.itemSpecialsSeed) : { special1: 0, special2: 0, special3: 0 },
  };
}

/** ImplAdventurer::defend (beast vs armor) including necklace bonus. */
export function adventurerDefend(
  a: Adventurer,
  beast: Beast,
  armor: Item,
  armorSpecials: SpecialPowers,
  critRnd: number,
  critChance: number,
): CombatResult {
  const info = lootInfo(armor.id);
  const spec: CombatSpec = { tier: info.tier, type: info.type, level: greatness(armor.xp), specials: armorSpecials };
  const r = calculateDamage(beast.spec, spec, MINIMUM_DAMAGE_FROM_BEASTS, 0, critChance, critRnd);
  const bonus = jewelryArmorBonus(a.equipment[SLOT.Neck], info.type, r.baseArmor);
  if (r.totalDamage > bonus + MINIMUM_DAMAGE_FROM_BEASTS) r.totalDamage -= bonus;
  else r.totalDamage = MINIMUM_DAMAGE_FROM_BEASTS;
  return r;
}

export function dynamicCritChance(level: number): number {
  const c = level * CRITICAL_HIT_LEVEL_MULTIPLIER;
  return c > 100 ? 100 : c;
}

/** ImplAdventurer::get_obstacle_damage */
export function obstacleDamage(a: Adventurer, obstacle: Obstacle, armor: Item, critRnd: number): CombatResult {
  const info = lootInfo(armor.id);
  const spec: CombatSpec = {
    tier: info.tier,
    type: info.type,
    level: greatness(armor.xp),
    specials: { special1: 0, special2: 0, special3: 0 },
  };
  const r = calculateDamage(obstacle.spec, spec, MINIMUM_DAMAGE_FROM_OBSTACLES, 0, dynamicCritChance(level(a)), critRnd);
  const bonus = jewelryArmorBonus(a.equipment[SLOT.Neck], info.type, r.baseArmor);
  if (r.totalDamage > bonus + MINIMUM_DAMAGE_FROM_OBSTACLES) r.totalDamage -= bonus;
  else r.totalDamage = MINIMUM_DAMAGE_FROM_OBSTACLES;
  return r;
}

export function applyVitalityHealthBoost(a: Adventurer, vitality: number): void {
  increaseHealth(a, VITALITY_INSTANT_HEALTH_BONUS * vitality);
}

export function applyHealthBoostFromVitalityUnlock(a: Adventurer, suffix: number): void {
  const vit = vitalityItemBoost(suffix);
  if (vit !== 0) increaseHealth(a, vit * VITALITY_INSTANT_HEALTH_BONUS);
}

/** unlocked_specials(previous_level, new_level) -> [suffixUnlocked, prefixesUnlocked] */
export function unlockedSpecials(prev: number, next: number): [boolean, boolean] {
  if (prev < 15 && next >= 19) return [true, true];
  if (prev < SUFFIX_UNLOCK_GREATNESS && next >= SUFFIX_UNLOCK_GREATNESS) return [true, false];
  if (prev < 19 && next >= 19) return [false, true];
  return [false, false];
}

/** ImplItem::increase_xp — returns [prevGreatness, newGreatness]. */
export function increaseItemXp(item: Item, amount: number): [number, number] {
  const prev = greatness(item.xp);
  const n = item.xp + amount;
  item.xp = n > ITEM_MAX_XP ? ITEM_MAX_XP : n;
  return [prev, greatness(item.xp)];
}

/** Total stat points (without luck). */
export function totalStats(s: Stats): number {
  return s.str + s.dex + s.vit + s.int + s.wis + s.cha;
}
