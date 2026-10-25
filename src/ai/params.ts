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
  /** multiplier of the continuation value from level 20 (ramp from level 10): >1 values survival over xp */
  futureScale?: number;
  /** value of one gold coin in XP units */
  goldValue: number;
  /** extra value per point of item xp gained (items level up while equipped) */
  itemXpValue: number;
  /** weight of the next explore's instant-death risk in the continuation value */
  riskWeight: number;
  /** weight of the battle-after-encounter death risk added to the instant-death risk (healing, continuation); 0 = off */
  battleRiskWeight?: number;
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
  /** keep DEX >= level - dexFloorGap (guaranteed flee) with top priority, up to level dexFloorUntil (gap >= 40: off) */
  dexFloorGap?: number;
  dexFloorUntil?: number;
  /** priority multiplier of weapon upgrades in the shop (damage drives gold income and safety) */
  weaponBoost?: number;
  /** item valuation horizon in item XP (all equipped items gain XP together): power = tier x greatness(xp + horizon) */
  itemHorizonXp?: number;
  /** jewelry rotation (leaders' luck farm): luck counts the greatness of every owned piece, bag included, but only
   *  equipped pieces gain xp. Level the equipped piece to this greatness, then equip the least experienced one
   *  (0: off, keep the best piece equipped) */
  jewelryRotateG?: number;
  /** shop priority of collecting jewelry not owned yet (scaled by the missing luck; 0: off) */
  jewelryCollectGain?: number;
  /** gear rotation (leaders' item farm, rules with item specials only): an armor piece that reached this greatness is
   *  swapped for an unfinished one from the bag, so every piece gets leveled - each G20 item grants a stat point and
   *  its suffix's VIT/CHA boost keeps working from the bag (0: off) */
  rotateG?: number;
  /** stop gear rotation from this adventurer level (0: never): deep down a weak fresh piece costs more risk than its
   *  stat point is worth */
  rotateUntil?: number;
  /** a rotation is allowed when it raises the next explore's instant-death risk at full health by at most this */
  rotateMaxRisk?: number;
  /** shop priority of buying a fresh piece for a slot whose worn piece is finished (0: off) */
  rotateBuyGain?: number;
  /** weapon rotation from this adventurer level (0: off): explore with an unfinished weapon, swap to the finished one
   *  in battle against strong beasts */
  rotateWeapon?: number;
  /** kill-shot swap (0/1): before a sure killing blow, wear unfinished pieces and the Gold Ring (one beast attack) */
  killSwap?: number;
  /** ...only when the beast's free hit is expected to cost at most this fraction of current health */
  killSwapMaxHp?: number;
  /** shop priority of collecting armor/weapons of the elemental types not owned yet for a slot (0: off) */
  collectGain?: number;
  /** highest (worst) tier worth collecting */
  collectMaxTier?: number;
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
  battleRiskWeight: 0,
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
  jewelryRotateG: 0,
  jewelryCollectGain: 0,
  rotateG: 0,
  rotateMaxRisk: 0.01,
  rotateBuyGain: 0,
  rotateWeapon: 0,
  rotateUntil: 0,
  futureScale: 1,
  killSwap: 0,
  killSwapMaxHp: 0.1,
  collectGain: 0,
  collectMaxTier: 2,
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
  battleRiskWeight: [0, 3],
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
  jewelryRotateG: [0, 20],
  jewelryCollectGain: [0, 200],
  rotateG: [0, 20],
  rotateMaxRisk: [0, 0.05],
  rotateBuyGain: [0, 200],
  killSwapMaxHp: [0, 0.5],
  rotateUntil: [0, 60],
  futureScale: [0.5, 6],
  collectGain: [0, 200],
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
  // value of staying alive, scaled up from level 10 to 20 by futureScale (the leaderboard top needs deep survival)
  const scale = 1 + ((p.futureScale ?? 1) - 1) * Math.min(1, Math.max(0, (lvl - 10) / 10));
  const t = p.futureXpByLevel;
  if (t && t.length > 0) {
    if (lvl < t.length && t[lvl] !== undefined && t[lvl] > 0) return t[lvl] * scale;
    return (t[t.length - 1] ?? p.futureA + p.futureB * lvl) * scale;
  }
  return (p.futureA + p.futureB * lvl) * scale;
}
