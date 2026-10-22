// Combat math mirrored from models/combat.cairo (ImplCombat).
import {
  ELEMENTAL_DAMAGE_BONUS,
  MAX_XP_DECAY,
  SPECIAL2_DAMAGE_MULTIPLIER,
  SPECIAL3_DAMAGE_MULTIPLIER,
  STRENGTH_DAMAGE_BONUS,
  TYPE,
  XP_REWARD_DIVISOR,
} from './constants.ts';
import type { CombatSpec, SpecialPowers } from './types.ts';

export interface CombatResult {
  baseAttack: number;
  baseArmor: number;
  elementalAdjustedDamage: number;
  strengthBonus: number;
  criticalHitBonus: number;
  weaponSpecialBonus: number;
  totalDamage: number;
}

export const WEAK = -1;
export const FAIR = 0;
export const STRONG = 1;

/** Tier damage multiplier: T1=5 ... T5=1, None=0. */
export function tierMultiplier(tier: number): number {
  return tier >= 1 && tier <= 5 ? 6 - tier : 0;
}

export function attackHp(spec: CombatSpec): number {
  return spec.level * tierMultiplier(spec.tier);
}

export function armorHp(spec: CombatSpec): number {
  return spec.level * tierMultiplier(spec.tier);
}

// local copies of TYPE values (hot path)
const T_NONE = TYPE.None;
const T_MAGIC = TYPE.MagicCloth;
const T_BLADE = TYPE.BladeHide;
const T_BLUDGEON = TYPE.BludgeonMetal;

/** get_elemental_effectiveness(weapon_type, armor_type) */
export function effectiveness(weaponType: number, armorType: number): number {
  switch (weaponType) {
    case T_MAGIC:
      if (armorType === T_NONE || armorType === T_BLUDGEON) return STRONG;
      if (armorType === T_BLADE) return WEAK;
      return FAIR;
    case T_BLADE:
      if (armorType === T_NONE || armorType === T_MAGIC) return STRONG;
      if (armorType === T_BLUDGEON) return WEAK;
      return FAIR;
    case T_BLUDGEON:
      if (armorType === T_NONE || armorType === T_BLADE) return STRONG;
      if (armorType === T_MAGIC) return WEAK;
      return FAIR;
    default:
      return FAIR;
  }
}

export function elementalAdjustedDamage(damage: number, weaponType: number, armorType: number): number {
  const effect = Math.floor(damage / ELEMENTAL_DAMAGE_BONUS);
  const e = effectiveness(weaponType, armorType);
  if (e === WEAK) return damage - effect;
  if (e === STRONG) return damage + effect;
  return damage;
}

/** is_critical_hit: chance*256 > 100*rnd (rnd is a u8). */
export function isCriticalHit(chance: number, rnd: number): boolean {
  return chance * 256 > 100 * rnd;
}

/** Probability that is_critical_hit returns true for a uniform u8 rnd. */
export function critProbability(chance: number): number {
  if (chance <= 0) return 0;
  // count rnd in [0,255] with 100*rnd < 256*chance
  const limit = Math.ceil((256 * chance) / 100); // smallest rnd that fails
  return Math.min(256, limit) / 256;
}

export function strengthBonus(damage: number, strength: number): number {
  if (strength === 0) return 0;
  return Math.floor((damage * strength * STRENGTH_DAMAGE_BONUS) / 100);
}

export function weaponSpecialBonus(baseDamage: number, weapon: SpecialPowers, armor: SpecialPowers): number {
  let bonus = 0;
  if (weapon.special2 !== 0 && weapon.special2 === armor.special2) bonus += baseDamage * SPECIAL2_DAMAGE_MULTIPLIER;
  if (weapon.special3 !== 0 && weapon.special3 === armor.special3) bonus += baseDamage * SPECIAL3_DAMAGE_MULTIPLIER;
  return bonus;
}

/** ImplCombat::calculate_damage */
export function calculateDamage(
  weapon: CombatSpec,
  armor: CombatSpec,
  minimumDamage: number,
  attackerStrength: number,
  criticalHitChance: number,
  criticalHitRnd: number,
): CombatResult {
  const baseAttack = attackHp(weapon);
  const baseArmor = armorHp(armor);
  const elemental = elementalAdjustedDamage(baseAttack, weapon.type, armor.type);
  const str = strengthBonus(elemental, attackerStrength);
  const crit = isCriticalHit(criticalHitChance, criticalHitRnd) ? elemental : 0;
  const special = weaponSpecialBonus(elemental, weapon.specials, armor.specials);
  const totalAttack = elemental + str + crit + special;
  let totalDamage = minimumDamage;
  if (totalAttack > baseArmor + minimumDamage) totalDamage = totalAttack - baseArmor;
  return {
    baseAttack,
    baseArmor,
    elementalAdjustedDamage: elemental,
    strengthBonus: str,
    criticalHitBonus: crit,
    weaponSpecialBonus: special,
    totalDamage,
  };
}

/** Damage for both crit outcomes without randomness (fast path for probability models). */
export function damageOutcomes(
  weapon: CombatSpec,
  armor: CombatSpec,
  minimumDamage: number,
  attackerStrength: number,
): { normal: CombatResult; crit: CombatResult } {
  return {
    normal: calculateDamage(weapon, armor, minimumDamage, attackerStrength, 0, 255),
    crit: calculateDamage(weapon, armor, minimumDamage, attackerStrength, 100, 0),
  };
}

/** get_random_level */
export function randomLevel(adventurerLevel: number, seed: number): number {
  const base = 1 + (seed % (adventurerLevel * 3));
  return base + levelDifficultyBonus(adventurerLevel);
}

export function levelDifficultyBonus(adventurerLevel: number): number {
  if (adventurerLevel >= 50) return 80;
  if (adventurerLevel >= 40) return 40;
  if (adventurerLevel >= 30) return 20;
  if (adventurerLevel >= 20) return 10;
  return 0;
}

/** get_random_starting_health */
export function randomStartingHealth(adventurerLevel: number, seed: number): number {
  return 1 + (seed % (adventurerLevel * 20)) + healthDifficultyBonus(adventurerLevel);
}

export function healthDifficultyBonus(adventurerLevel: number): number {
  if (adventurerLevel >= 50) return 500;
  if (adventurerLevel >= 40) return 400;
  if (adventurerLevel >= 30) return 200;
  if (adventurerLevel >= 20) return 100;
  return 10;
}

/** get_level_from_xp: xp 0 -> 1, else floor(sqrt(xp)). */
export function levelFromXp(xp: number): number {
  if (xp === 0) return 1;
  return Math.floor(Math.sqrt(xp));
}

/** get_base_reward */
export function baseReward(spec: CombatSpec, adventurerLevel: number): number {
  let decay = adventurerLevel * 2;
  if (decay >= MAX_XP_DECAY) decay = MAX_XP_DECAY;
  const mult = tierMultiplier(spec.tier);
  if (mult === 0) throw new Error('get_base_reward: tier is none');
  const reward = Math.floor((mult * spec.level) / XP_REWARD_DIVISOR);
  return Math.floor((reward * (100 - decay)) / 100);
}

/** ability_based_avoid_threat */
export function abilityAvoid(adventurerLevel: number, stat: number, rnd: number): boolean {
  if (stat >= adventurerLevel) return true;
  const scaled = Math.floor((adventurerLevel * rnd) / 255);
  return stat > scaled;
}

/** Probability that ability_based_avoid_threat succeeds for a uniform u8 rnd. */
export function abilityAvoidProbability(adventurerLevel: number, stat: number): number {
  if (stat >= adventurerLevel) return 1;
  if (stat <= 0) return 0;
  let ok = 0;
  for (let rnd = 0; rnd < 256; rnd++) if (stat > Math.floor((adventurerLevel * rnd) / 255)) ok++;
  return ok / 256;
}

/** ability_based_damage_reduction (smoothstep of stat/level, percent). */
export function abilityDamageReduction(adventurerLevel: number, stat: number): number {
  const SCALE = 1_000_000n;
  let ratio = (SCALE * BigInt(stat)) / BigInt(adventurerLevel);
  if (ratio > SCALE) ratio = SCALE;
  const r2 = (ratio * ratio) / SCALE;
  const r3 = (r2 * ratio) / SCALE;
  const smooth = 3n * r2 - 2n * r3;
  return Number((100n * smooth) / SCALE);
}

export function applyDamageReduction(damage: number, reduction: number): number {
  return Math.floor((damage * (100 - reduction)) / 100);
}
