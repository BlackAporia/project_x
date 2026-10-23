// Tunable policy parameters. Defaults come from game analysis; the tuner (CMA-ES / GPU ES) optimizes them and
// writes policy/policy.json, which the bot loads at start.
import { existsSync, readFileSync } from 'node:fs';

export interface PolicyParams {
  version: string;
  // ---- start ----
  /** starting weapon item id (12 Wand, 16 Book, 46 Short Sword, 76 Club) or 0 for random */
  startWeapon: number;

  // ---- stat allocation: target = ratio * level, capped; separate ratios before/after phaseLevel ----
  phaseLevel: number;
  chaRatio: number;
  chaRatioLate: number;
  chaCap: number;
  dexRatio: number;
  dexRatioLate: number;
  dexCap: number;
  intRatio: number;
  intRatioLate: number;
  intCap: number;
  wisRatio: number;
  wisRatioLate: number;
  wisCap: number;
  strRatio: number;
  strRatioLate: number;
  strCap: number;
  /** when every target is met, points go to VIT vs STR in this proportion */
  vitShare: number;

  // ---- value model ----
  /** expected future XP K(level) = futureA + futureB * level (overridden by futureXpByLevel when present) */
  futureA: number;
  futureB: number;
  /** learned table: mean remaining XP by level (index = level) */
  futureXpByLevel?: number[];
  /** value of one gold coin in XP units */
  goldValue: number;
  /** extra value per point of item xp gained (items level up while equipped) */
  itemXpValue: number;
  /** weight of the next explore's instant-death risk in the continuation value */
  riskWeight: number;
  /** weight of the missing-health fraction in the continuation value */
  hpWeight: number;

  // ---- shopping ----
  /** heal to max health minus 9 when a potion costs at most this many gold */
  cheapPotionPrice: number;
  /** otherwise heal until the next explore's instant-death risk is below this */
  maxExploreRisk: number;
  /** gold kept back for future healing, expressed as a fraction of max health to restore */
  potionReserveFactor: number;
  /** minimum absolute gold kept */
  goldReserve: number;
  /** greatness growth assumed when comparing a new item with an equipped one */
  itemGrowth: number;
  /** required relative power gain to replace an equipped item */
  upgradeMargin: number;
  /** buy jewelry (ring/necklace) once armor slots are filled */
  buyJewelry: number;
  /** carry a spare weapon of another type for type-advantage swaps (0/1) */
  spareWeapons: number;
  /** carry spare armor pieces for swaps against the beast's attack type (0/1) */
  spareArmor: number;

  // ---- battle ----
  /** consider swapping gear from the bag when it improves the battle value by at least this much */
  swapMinGain: number;
  /** depth cap of the exact battle solver */
  battleDepth: number;

  // ---- explore ----
  /** use till_beast exploration when the instant-death risk of one explore is below this (fewer transactions) */
  tillBeastMaxRisk: number;

  // ---- learned value network (trainer/train.py, GPU) ----
  /** blend between the per-level table (0) and the value network (1) for continuation values */
  valueNetWeight?: number;
  valueNetPath?: string;
}

export const DEFAULT_PARAMS: PolicyParams = {
  version: 'default-1',
  startWeapon: 46,
  phaseLevel: 15,
  chaRatio: 0.4,
  chaRatioLate: 0.3,
  chaCap: 10,
  dexRatio: 0.55,
  dexRatioLate: 0.7,
  dexCap: 60,
  intRatio: 0.05,
  intRatioLate: 0.2,
  intCap: 40,
  wisRatio: 0.05,
  wisRatioLate: 0.2,
  wisCap: 40,
  strRatio: 0.15,
  strRatioLate: 0.1,
  strCap: 20,
  vitShare: 0.8,
  futureA: 150,
  futureB: 22,
  goldValue: 1.0,
  itemXpValue: 0.02,
  riskWeight: 1.0,
  hpWeight: 0.05,
  cheapPotionPrice: 3,
  maxExploreRisk: 0.004,
  potionReserveFactor: 0.35,
  goldReserve: 4,
  itemGrowth: 8,
  upgradeMargin: 0.15,
  buyJewelry: 1,
  spareWeapons: 1,
  spareArmor: 1,
  swapMinGain: 0.5,
  battleDepth: 60,
  tillBeastMaxRisk: 0.0005,
};

/** Bounds used by the tuners (numeric parameters only). */
export const PARAM_BOUNDS: Record<string, [number, number]> = {
  phaseLevel: [3, 40],
  chaRatio: [0, 1],
  chaRatioLate: [0, 1],
  chaCap: [0, 31],
  dexRatio: [0, 1.2],
  dexRatioLate: [0, 1.2],
  dexCap: [0, 80],
  intRatio: [0, 1.2],
  intRatioLate: [0, 1.2],
  intCap: [0, 80],
  wisRatio: [0, 1.2],
  wisRatioLate: [0, 1.2],
  wisCap: [0, 80],
  strRatio: [0, 1],
  strRatioLate: [0, 1],
  strCap: [0, 40],
  vitShare: [0, 1],
  futureA: [20, 600],
  futureB: [0, 80],
  goldValue: [0, 3],
  itemXpValue: [0, 0.3],
  riskWeight: [0, 4],
  hpWeight: [0, 1],
  cheapPotionPrice: [1, 20],
  maxExploreRisk: [0, 0.05],
  potionReserveFactor: [0, 2],
  goldReserve: [0, 60],
  itemGrowth: [0, 19],
  upgradeMargin: [0, 1],
  buyJewelry: [0, 1],
  swapMinGain: [0, 20],
  tillBeastMaxRisk: [0, 0.02],
};

export const TUNABLE_KEYS = Object.keys(PARAM_BOUNDS) as Array<keyof PolicyParams>;

export function loadParams(path = 'policy/policy.json'): PolicyParams {
  if (existsSync(path)) {
    try {
      const raw = JSON.parse(readFileSync(path, 'utf8'));
      return { ...DEFAULT_PARAMS, ...(raw.params ?? raw) };
    } catch {
      return { ...DEFAULT_PARAMS };
    }
  }
  return { ...DEFAULT_PARAMS };
}

export function clampParams(p: PolicyParams): PolicyParams {
  const out = { ...p } as Record<string, unknown>;
  for (const [k, [lo, hi]] of Object.entries(PARAM_BOUNDS)) {
    const v = out[k];
    if (typeof v === 'number') out[k] = Math.min(hi, Math.max(lo, v));
  }
  return out as unknown as PolicyParams;
}

export function futureXp(p: PolicyParams, lvl: number): number {
  const t = p.futureXpByLevel;
  if (t && t.length > 0) {
    if (lvl < t.length && t[lvl] !== undefined && t[lvl] > 0) return t[lvl];
    return t[t.length - 1] ?? p.futureA + p.futureB * lvl;
  }
  return p.futureA + p.futureB * lvl;
}
