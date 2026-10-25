// Exact probability model of the next random events, built on the engine's formulas.
// Hot paths use allocation-free arithmetic kernels that reproduce calculate_damage exactly;
// tests/model.test.ts checks them against the engine functions.
import {
  abilityAvoidProbability,
  abilityDamageReduction,
  applyDamageReduction,
  critProbability,
  healthDifficultyBonus,
  levelDifficultyBonus,
  tierMultiplier,
  effectiveness,
  WEAK,
  STRONG,
} from '../game/combat.ts';
import {
  adventurerAttack,
  adventurerDefend,
  dynamicCritChance,
  jewelryArmorBonus,
  level,
  maxHealth,
  potionPrice,
  weaponSpec,
} from '../game/adventurer.ts';
import { beastCritChance } from '../game/beast.ts';
import {
  ARMOR_SLOTS,
  BEAST_SPECIAL_NAME_LEVEL_UNLOCK,
  MAX_SPECIAL2,
  MAX_SPECIAL3,
  MINIMUM_DAMAGE_FROM_BEASTS,
  MINIMUM_DAMAGE_FROM_OBSTACLES,
  SLOT,
  SPECIAL2_DAMAGE_MULTIPLIER,
  SPECIAL3_DAMAGE_MULTIPLIER,
  TYPE,
} from '../game/constants.ts';
import { greatness, itemSpecials, lootInfo } from '../game/loot.ts';
import type { Adventurer, Beast, Settings } from '../game/types.ts';

export interface Outcome {
  dmg: number;
  p: number;
}

/** Merge equal damage values and drop zero-probability entries. */
export function mergeOutcomes(list: Outcome[]): Outcome[] {
  const map = new Map<number, number>();
  for (const o of list) if (o.p > 0) map.set(o.dmg, (map.get(o.dmg) ?? 0) + o.p);
  return [...map.entries()].map(([dmg, p]) => ({ dmg, p })).sort((a, b) => a.dmg - b.dmg);
}

/** Damage the adventurer deals to a known beast in one hit: normal and critical. */
export function heroDamageOptions(adv: Adventurer, beast: Beast): Outcome[] {
  const weapon = weaponSpec(adv);
  const pc = critProbability(adv.stats.luck);
  const normal = adventurerAttack({ ...adv, stats: { ...adv.stats, luck: 0 } }, weapon, beast, 255).totalDamage;
  const crit = adventurerAttack({ ...adv, stats: { ...adv.stats, luck: 100 } }, weapon, beast, 0).totalDamage;
  return mergeOutcomes([
    { dmg: normal, p: 1 - pc },
    { dmg: crit, p: pc },
  ]);
}

/** Damage a known beast deals in one attack (random slot x crit), optionally as an ambush. */
export function beastDamageOptions(adv: Adventurer, beast: Beast, settings: Settings, isAmbush = false): Outcome[] {
  const lvl = level(adv);
  const pc = critProbability(beastCritChance(lvl, isAmbush));
  const out: Outcome[] = [];
  for (const slot of ARMOR_SLOTS) {
    const armor = adv.equipment[slot];
    const sp = itemSpecials(armor.id, greatness(armor.xp), adv.itemSpecialsSeed);
    for (const crit of [false, true]) {
      const p = 0.2 * (crit ? pc : 1 - pc);
      if (p <= 0) continue;
      let d = adventurerDefend(adv, beast, armor, sp, crit ? 0 : 255, crit ? 100 : 0).totalDamage;
      if (isAmbush) {
        d = applyDamageReduction(d, settings.baseDamageReduction);
        if (settings.statsMode === 'Reduction') d = applyDamageReduction(d, abilityDamageReduction(lvl, adv.stats.wis));
      }
      out.push({ dmg: d, p });
    }
  }
  return mergeOutcomes(out);
}

export function fleeProbability(adv: Adventurer): number {
  if (level(adv) <= 1 || adv.stats.dex === 0) return 0;
  return abilityAvoidProbability(level(adv), adv.stats.dex);
}

export function ambushProbability(adv: Adventurer, settings: Settings): number {
  if (settings.statsMode !== 'Dodge') return 1;
  return 1 - abilityAvoidProbability(level(adv), adv.stats.wis);
}

export function obstacleDodgeProbability(adv: Adventurer, settings: Settings): number {
  if (settings.statsMode !== 'Dodge') return 0;
  return abilityAvoidProbability(level(adv), adv.stats.int);
}

/** Uniform encounter levels at an adventurer level: 1..3L plus the difficulty bonus. */
export function encounterLevels(lvl: number): { min: number; max: number } {
  const bonus = levelDifficultyBonus(lvl);
  return { min: 1 + bonus, max: lvl * 3 + bonus };
}

export function beastHealthRange(lvl: number): { min: number; max: number } {
  const bonus = healthDifficultyBonus(lvl);
  return { min: 1 + bonus, max: Math.min(1023, lvl * 20 + bonus) };
}

// -------------------------------------------------------------------------------------------
// Fast kernels
// -------------------------------------------------------------------------------------------

/** One slot's defensive profile. */
export interface SlotProfile {
  armorType: number; // TYPE (None when empty)
  armorHp: number; // greatness * tier multiplier (0 when empty)
  neckBonus: number; // necklace armor bonus for this piece
  special2: number; // armor name prefix (0 if locked)
  special3: number; // armor name suffix (0 if locked)
}

export function slotProfiles(adv: Adventurer): SlotProfile[] {
  const neck = adv.equipment[SLOT.Neck];
  return ARMOR_SLOTS.map((slot) => {
    const it = adv.equipment[slot];
    const info = lootInfo(it.id);
    const g = greatness(it.xp);
    const armorHp = it.id === 0 ? 0 : g * tierMultiplier(info.tier);
    const sp = itemSpecials(it.id, g, adv.itemSpecialsSeed);
    return {
      armorType: info.type,
      armorHp,
      neckBonus: jewelryArmorBonus(neck, info.type, armorHp),
      special2: sp.special2,
      special3: sp.special3,
    };
  });
}

// module-local copies of imported functions/constants used in the hot loops (avoids live-binding getters)
const effectivenessL = effectiveness;
const reduceL = applyDamageReduction;
const WEAK_L = WEAK;
const STRONG_L = STRONG;

function elemental(base: number, attackType: number, armorType: number): number {
  const e = effectivenessL(attackType, armorType);
  const half = Math.floor(base / 2);
  return e === WEAK_L ? base - half : e === STRONG_L ? base + half : base;
}

/** calculate_damage + necklace adjustment for an attacker with no strength. */
export function hitDamage(elem: number, bonus: number, crit: boolean, armorHp: number, neckBonus: number, minDmg: number): number {
  const total = elem + bonus + (crit ? elem : 0);
  let d = total > armorHp + minDmg ? total - armorHp : minDmg;
  if (d > neckBonus + minDmg) d -= neckBonus;
  else d = minDmg;
  return d;
}

/** P(1 + (u8 % mod) == target) for a uniform u8. */
function u8ModProbability(mod: number, target: number): number {
  if (target <= 0) return 0;
  const v = target - 1;
  let n = 0;
  for (let r = v; r < 256; r += mod) n++;
  return n / 256;
}

const HIST = 2048;
const MIN_OBS = MINIMUM_DAMAGE_FROM_OBSTACLES;
const MIN_BEAST = MINIMUM_DAMAGE_FROM_BEASTS;
const SP2_MULT = SPECIAL2_DAMAGE_MULTIPLIER;
const SP3_MULT = SPECIAL3_DAMAGE_MULTIPLIER;
const NAME_UNLOCK = BEAST_SPECIAL_NAME_LEVEL_UNLOCK;

export interface PerilTable {
  /** P(the next explore kills instantly | health h), h = 0..1024 */
  instantDeath: Float64Array;
  /** P(the next explore meets a beast and the battle that follows kills | health h): flee or fight, whichever is safer */
  encounterDeath: Float64Array;
  /** expected single-hit damage of the next explore (0 for discoveries) */
  expectedDamage: number;
}

/**
 * Instant-death table of the next explore: 1/3 obstacle hit (dodge-able with INT), 1/3 beast encounter with an
 * ambush hit (dodge-able with WIS), 1/3 discovery. Battle risk after the encounter is handled by the battle solver.
 */
export function perilTable(adv: Adventurer, settings: Settings): PerilTable {
  const lvl = level(adv);
  const profiles = slotProfiles(adv);
  const { min, max } = encounterLevels(lvl);
  const nLevels = max - min + 1;
  const step = Math.max(1, Math.floor(nLevels / 48));
  const reductionBase = settings.baseDamageReduction;
  const pDodge = obstacleDodgeProbability(adv, settings);
  const pAmbush = ambushProbability(adv, settings);
  const intRed = settings.statsMode === 'Reduction' ? abilityDamageReduction(lvl, adv.stats.int) : 0;
  const wisRed = settings.statsMode === 'Reduction' ? abilityDamageReduction(lvl, adv.stats.wis) : 0;
  const pcObs = critProbability(dynamicCritChance(lvl));
  const pcBeast = critProbability(beastCritChance(lvl, true));

  const obs = new Float64Array(HIST);
  const amb = new Float64Array(HIST);
  let wObs = 0;
  let wAmb = 0;
  let expObs = 0;
  let expAmb = 0;

  for (let tier = 1; tier <= 5; tier++) {
    const mult = 6 - tier;
    for (let type = 1; type <= 3; type++) {
      for (let l = min; l <= max; l += step) {
        const w = Math.min(step, max - l + 1);
        const base = l * mult;
        const named = l >= NAME_UNLOCK;
        for (let s = 0; s < 5; s++) {
          const pr = profiles[s];
          const elem = elemental(base, type, pr.armorType);
          // obstacle: no specials
          for (let c = 0; c < 2; c++) {
            const pc = c === 1 ? pcObs : 1 - pcObs;
            if (pc <= 0) continue;
            let d = hitDamage(elem, 0, c === 1, pr.armorHp, pr.neckBonus, MIN_OBS);
            d = reduceL(d, reductionBase);
            if (intRed) d = reduceL(d, intRed);
            const ww = w * pc * 0.2;
            obs[d < HIST ? d : HIST - 1] += ww;
            wObs += ww;
            expObs += ww * d;
          }
          // beast ambush (name match possible on armor with unlocked prefixes)
          let pS2 = 0;
          let pS3 = 0;
          if (named) {
            pS2 = pr.special2 ? u8ModProbability(MAX_SPECIAL2, pr.special2) : 0;
            pS3 = pr.special3 ? u8ModProbability(MAX_SPECIAL3, pr.special3) : 0;
          }
          for (let c = 0; c < 2; c++) {
            const pc = c === 1 ? pcBeast : 1 - pcBeast;
            if (pc <= 0) continue;
            for (let m = 0; m < 4; m++) {
              const m2 = (m & 1) === 1;
              const m3 = (m & 2) === 2;
              const pm = (m2 ? pS2 : 1 - pS2) * (m3 ? pS3 : 1 - pS3);
              if (pm <= 0) continue;
              const bonus = (m2 ? elem * SP2_MULT : 0) + (m3 ? elem * SP3_MULT : 0);
              let d = hitDamage(elem, bonus, c === 1, pr.armorHp, pr.neckBonus, MIN_BEAST);
              d = reduceL(d, reductionBase);
              if (wisRed) d = reduceL(d, wisRed);
              const ww = w * pc * 0.2 * pm;
              amb[d < HIST ? d : HIST - 1] += ww;
              wAmb += ww;
              expAmb += ww * d;
            }
          }
        }
      }
    }
  }

  const instantDeath = new Float64Array(1025);
  // suffix sums: P(dmg >= h)
  let tailObs = 0;
  let tailAmb = 0;
  const tObs = new Float64Array(HIST + 1);
  const tAmb = new Float64Array(HIST + 1);
  for (let d = HIST - 1; d >= 0; d--) {
    tailObs += obs[d];
    tailAmb += amb[d];
    tObs[d] = tailObs;
    tAmb[d] = tailAmb;
  }
  for (let h = 0; h <= 1024; h++) {
    const po = (tObs[h] / wObs) * (1 - pDodge);
    const pa = (tAmb[h] / wAmb) * pAmbush;
    instantDeath[h] = h === 0 ? 1 : (po + pa) / 3;
  }
  const expectedDamage = ((expObs / wObs) * (1 - pDodge) + (expAmb / wAmb) * pAmbush) / 3;
  // the battle starts after the (possible) ambush hit
  // (an ambush that kills outright is already in instantDeath; a survived one starts the battle lower)
  const battle = battleDeathTable(adv, settings);
  const shift = Math.round(expAmb / wAmb);
  const encounterDeath = new Float64Array(1025);
  for (let h = 1; h <= 1024; h++) encounterDeath[h] = ((1 - pAmbush) * battle[h] + pAmbush * battle[Math.max(1, h - shift)]) / 3;
  encounterDeath[0] = 1 / 3;
  return { instantDeath, encounterDeath, expectedDamage };
}

const erfc = (x: number): number => {
  // Abramowitz-Stegun 7.1.26
  const z = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * z);
  const y = t * (0.254829592 + t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429)))) * Math.exp(-z * z);
  return x >= 0 ? y : 2 - y;
};

/**
 * P(dying in the battle with an unknown beast met at health h), averaged over the beasts of this level (tier x type x
 * level grid, beast health quartiles). Per beast: flee every round (survival DP over health) or fight it out (R-1
 * counterattacks before the kill, normal approximation of their sum), whichever is safer. This is the risk that
 * the instant-death table misses: most deaths on mainnet rules are failed escapes from beasts met at half health.
 */
export function battleDeathTable(adv: Adventurer, settings: Settings): Float64Array {
  const out = new Float64Array(1025);
  const lvl = level(adv);
  const hMax = Math.min(1024, maxHealth(adv.stats) + 30);
  const { min, max } = encounterLevels(lvl);
  const hpRange = beastHealthRange(lvl);
  const beastHps = [0.25, 0.75].map((q) => Math.max(1, Math.round(hpRange.min + q * (hpRange.max - hpRange.min))));
  const nL = 4;
  const pF = fleeProbability(adv);
  const surv = new Float64Array(hMax + 1);
  const acc = new Float64Array(hMax + 1);
  const hd = new Int32Array(16);
  const hq = new Float64Array(16);
  let wSum = 0;
  for (let tier = 1; tier <= 5; tier++) {
    for (let type = 1; type <= 3; type++) {
      for (let i = 0; i < nL; i++) {
        const l = Math.max(1, Math.round(min + ((i + 0.5) * (max - min + 1)) / nL - 0.5));
        const beast: Beast = { id: 0, startingHealth: 1, spec: { tier, type, level: l, specials: { special1: 0, special2: 0, special3: 0 } } };
        const hits = beastDamageOptions(adv, beast, settings, false);
        const nh = hits.length;
        let mu = 0;
        let m2 = 0;
        for (let k = 0; k < nh; k++) {
          hd[k] = hits[k].dmg;
          hq[k] = (1 - pF) * hits[k].p;
          mu += hits[k].p * hits[k].dmg;
          m2 += hits[k].p * hits[k].dmg * hits[k].dmg;
        }
        const sd1 = Math.sqrt(Math.max(0, m2 - mu * mu));
        surv[0] = 0;
        for (let h = 1; h <= hMax; h++) {
          let v = pF;
          for (let k = 0; k < nh; k++) v += hq[k] * surv[h > hd[k] ? h - hd[k] : 0];
          surv[h] = v;
        }
        const heroHit = Math.max(1, heroDamageOptions(adv, beast)[0]?.dmg ?? 1);
        for (const bh of beastHps) {
          const n = Math.ceil(bh / heroHit) - 1; // counterattacks taken before the killing blow
          const mean = n * mu;
          const sd = Math.sqrt(Math.max(0, n)) * sd1;
          // the normal tail is 0 / 1 beyond 6 sd: only the band around the mean needs erfc
          const lo = sd > 0 ? Math.max(1, Math.floor(mean - 6 * sd)) : Math.floor(mean) + 1;
          const hi = sd > 0 ? Math.min(hMax, Math.ceil(mean + 6 * sd)) : Math.floor(mean);
          for (let h = 1; h <= hMax; h++) {
            let fight: number;
            if (n <= 0 || h > hi) fight = n <= 0 || sd > 0 || h > mean ? 0 : 1;
            else if (h < lo) fight = 1;
            else fight = 0.5 * erfc((h - 0.5 - mean) / (sd * Math.SQRT2));
            const flee = 1 - surv[h];
            acc[h] += flee < fight ? flee : fight;
          }
          wSum++;
        }
      }
    }
  }
  out[0] = 1;
  for (let h = 1; h <= 1024; h++) out[h] = h <= hMax ? acc[h] / wSum : out[hMax];
  return out;
}

/** Expected damage a beast deals per counterattack at the current level (averaged over unknown beasts). */
export function expectedBeastHitDamage(adv: Adventurer): number {
  const lvl = level(adv);
  const profiles = slotProfiles(adv);
  const { min, max } = encounterLevels(lvl);
  const pc = critProbability(beastCritChance(lvl, false));
  let total = 0;
  let w = 0;
  for (let tier = 1; tier <= 5; tier++) {
    for (let type = 1; type <= 3; type++) {
      for (let l = min; l <= max; l += Math.max(1, Math.floor((max - min + 1) / 24))) {
        const base = l * (6 - tier);
        for (let s = 0; s < 5; s++) {
          const pr = profiles[s];
          const elem = elemental(base, type, pr.armorType);
          const dn = hitDamage(elem, 0, false, pr.armorHp, pr.neckBonus, MIN_BEAST);
          const dc = hitDamage(elem, 0, true, pr.armorHp, pr.neckBonus, MIN_BEAST);
          total += dn * (1 - pc) + dc * pc;
          w += 1;
        }
      }
    }
  }
  return total / w;
}

/** Health reachable by buying potions with the gold at hand (capped by max health). */
export function healableHealth(adv: Adventurer, gold: number = adv.gold): number {
  const price = potionPrice(adv);
  const max = maxHealth(adv.stats);
  const potions = Math.floor(gold / price);
  return Math.min(max, adv.health + potions * 10);
}

export function isNone(type: number): boolean {
  return type === TYPE.None;
}
