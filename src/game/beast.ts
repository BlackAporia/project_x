// Beasts and obstacles (models/beast.cairo, models/obstacle.cairo).
import {
  BEAST_CRITICAL_HIT_AMBUSH_MULTIPLIER,
  BEAST_CRITICAL_HIT_LEVEL_MULTIPLIER,
  BEAST_MAXIMUM_HEALTH,
  BEAST_MINIMUM_XP_REWARD,
  BEAST_SPECIAL_NAME_LEVEL_UNLOCK,
  GOLD_REWARD_DIVISOR,
  MAX_BEAST_ID,
  MAX_OBSTACLE_ID,
  MAX_SPECIAL2,
  MAX_SPECIAL3,
  OBSTACLE_MINIMUM_XP_REWARD,
  STARTER_BEAST_HEALTH,
  TYPE,
  WANTED_BEASTS,
} from './constants.ts';
import { baseReward, randomLevel, randomStartingHealth, tierMultiplier } from './combat.ts';
import { BEAST_NAMES, NAME_PREFIXES, NAME_SUFFIXES, OBSTACLE_NAMES } from './data.ts';
import type { Beast, CombatSpec, Obstacle } from './types.ts';

// --- beasts ---

export function beastTier(id: number): number {
  if ((id >= 1 && id <= 5) || (id >= 26 && id < 31) || (id >= 51 && id < 56)) return 1;
  if ((id >= 6 && id < 11) || (id >= 31 && id < 36) || (id >= 56 && id < 61)) return 2;
  if ((id >= 11 && id < 16) || (id >= 36 && id < 41) || (id >= 61 && id < 66)) return 3;
  if ((id >= 16 && id < 21) || (id >= 41 && id < 46) || (id >= 66 && id < 71)) return 4;
  return 5;
}

/** Beast type: 1-25 Magical (magic attack / cloth armor), 26-50 Hunter (blade / hide), 51-75 Brute (bludgeon / metal). */
export function beastType(id: number): number {
  if (id >= 0 && id < 26) return TYPE.MagicCloth;
  if (id < 51) return TYPE.BladeHide;
  if (id < 76) return TYPE.BludgeonMetal;
  return TYPE.None;
}

export function beastId(seed: number): number {
  return (seed % MAX_BEAST_ID) + 1;
}

export function beastStartingHealth(adventurerLevel: number, rnd: number): number {
  const h = randomStartingHealth(adventurerLevel, rnd);
  return h > BEAST_MAXIMUM_HEALTH ? BEAST_MAXIMUM_HEALTH : h;
}

/** Starter beast picked so it is weak against the starting weapon type. */
export function starterBeast(weaponType: number): Beast {
  let id: number;
  if (weaponType === TYPE.MagicCloth) id = 71; // Troll
  else if (weaponType === TYPE.BladeHide) id = 21; // Fairy
  else if (weaponType === TYPE.BludgeonMetal) id = 46; // Bear
  else throw new Error('invalid starter weapon type');
  return {
    id,
    startingHealth: STARTER_BEAST_HEALTH,
    spec: { tier: beastTier(id), type: beastType(id), level: 1, specials: { special1: 0, special2: 0, special3: 0 } },
  };
}

/** ImplBeast::get_beast */
export function generateBeast(
  adventurerLevel: number,
  weaponType: number,
  seed: number,
  healthRnd: number,
  levelRnd: number,
  special2Rnd: number,
  special3Rnd: number,
): Beast {
  if (adventurerLevel === 1) return starterBeast(weaponType);
  const id = beastId(seed);
  const startingHealth = beastStartingHealth(adventurerLevel, healthRnd);
  const level = randomLevel(adventurerLevel, levelRnd);
  const specials =
    level >= BEAST_SPECIAL_NAME_LEVEL_UNLOCK
      ? { special1: 0, special2: 1 + (special2Rnd % MAX_SPECIAL2), special3: 1 + (special3Rnd % MAX_SPECIAL3) }
      : { special1: 0, special2: 0, special3: 0 };
  return { id, startingHealth, spec: { tier: beastTier(id), type: beastType(id), level, specials } };
}

export function beastGoldReward(beast: Beast): number {
  return Math.floor((tierMultiplier(beast.spec.tier) * beast.spec.level) / GOLD_REWARD_DIVISOR);
}

export function beastXpReward(beast: Beast, adventurerLevel: number): number {
  const r = baseReward(beast.spec, adventurerLevel);
  return r < BEAST_MINIMUM_XP_REWARD ? BEAST_MINIMUM_XP_REWARD : r;
}

/** ImplBeast::get_critical_hit_chance */
export function beastCritChance(adventurerLevel: number, isAmbush: boolean): number {
  const mult = isAmbush ? BEAST_CRITICAL_HIT_AMBUSH_MULTIPLIER : BEAST_CRITICAL_HIT_LEVEL_MULTIPLIER;
  const chance = adventurerLevel * mult;
  return chance > 100 ? 100 : chance;
}

export function beastName(beast: { id: number; spec: CombatSpec }): string {
  const base = BEAST_NAMES[beast.id] ?? `Beast#${beast.id}`;
  const s = beast.spec.specials;
  if (s.special2 && s.special3) return `"${NAME_PREFIXES[s.special2]} ${NAME_SUFFIXES[s.special3]}" ${base}`;
  return base;
}

export function isWantedBeast(beast: Beast): boolean {
  return WANTED_BEASTS.some(
    (w) => w.id === beast.id && w.prefix === beast.spec.specials.special2 && w.suffix === beast.spec.specials.special3,
  );
}

// --- obstacles ---

export function obstacleTier(id: number): number {
  return beastTier(id); // same id banding as beasts
}

/** Obstacle type: <26 magic, <51 blade, otherwise bludgeon. */
export function obstacleType(id: number): number {
  if (id < 26) return TYPE.MagicCloth;
  if (id < 51) return TYPE.BladeHide;
  return TYPE.BludgeonMetal;
}

export function generateObstacle(adventurerLevel: number, idSeed: number, levelSeed: number): Obstacle {
  const id = (idSeed % MAX_OBSTACLE_ID) + 1;
  const level = randomLevel(adventurerLevel, levelSeed);
  return { id, spec: { tier: obstacleTier(id), type: obstacleType(id), level, specials: { special1: 0, special2: 0, special3: 0 } } };
}

export function obstacleXpReward(obstacle: Obstacle, adventurerLevel: number): number {
  const r = baseReward(obstacle.spec, adventurerLevel);
  return r < OBSTACLE_MINIMUM_XP_REWARD ? OBSTACLE_MINIMUM_XP_REWARD : r;
}

export function obstacleName(id: number): string {
  return OBSTACLE_NAMES[id] ?? `Obstacle#${id}`;
}
