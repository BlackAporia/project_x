// Decision policy: what to do in every game state, with a human-readable explanation for each decision.
//
//  - battle: exact battle solver (attack / flee) plus an optional gear swap from the bag
//  - level up: stat allocation driven by level-relative targets
//  - market: equip upgrades from the bag, buy items (empty slots first, then tier/greatness upgrades), potions
//  - explore: heal to a risk-based health target first; till_beast only when an explore is nearly risk free
import {
  bagContains,
  isEquipped,
  level,
  loadAssets,
  maxHealth,
  potionPrice,
} from '../game/adventurer.ts';
import { beastGoldReward, beastName, beastXpReward } from '../game/beast.ts';
import { tierMultiplier } from '../game/combat.ts';
import { ARMOR_SLOTS, POTION_HEALTH_AMOUNT, SLOT, SLOT_NAMES, STARTER_WEAPONS, TYPE } from '../game/constants.ts';
import { buyItems, currentBeast, equip, selectStatUpgrades } from '../game/engine.ts';
import { greatness, isJewelry, itemPrice, lootInfo } from '../game/loot.ts';
import { FastRandom, type RandomSource } from '../game/rng.ts';
import type { Action, Adventurer, Beast, GameState, Item, ItemPurchase, Stats } from '../game/types.ts';
import { solveBattle, type BattlePlan, type BattleSolution } from './battle.ts';
import { beastDamageOptions, fleeProbability, heroDamageOptions, perilTable, type PerilTable } from './model.ts';
import { DEFAULT_PARAMS, futureXp, type PolicyParams } from './params.ts';
import { loadedFeatures } from './features.ts';
import { loadValueNet, type ValueNet } from './valuenet.ts';

export interface Decision {
  phase: 'start' | 'battle' | 'level_up' | 'explore' | 'dead';
  actions: Action[];
  reason: string;
  metrics: Record<string, number>;
}

const PLANNING_RNG: RandomSource = new FastRandom(1); // stats/buy/equip-outside-battle use no randomness

export interface PolicyOptions {
  /** reuse the solved battle plan for later rounds of the same battle (simulation speed); live play re-solves */
  fast?: boolean;
}

export class Policy {
  readonly params: PolicyParams;
  readonly fast: boolean;
  private perilCache = new Map<string, PerilTable>();
  private planKey = '';
  private plan: BattlePlan | null = null;
  private valueNet: ValueNet | null;

  constructor(params: PolicyParams = DEFAULT_PARAMS, options: PolicyOptions = {}) {
    this.params = params;
    this.fast = options.fast ?? false;
    this.valueNet = params.valueNetWeight ? loadValueNet(params.valueNetPath) : null;
  }

  decide(state: GameState): Decision {
    if (!state.started) return this.decideStart();
    const adv = state.adventurer;
    if (adv.health === 0) return { phase: 'dead', actions: [], reason: 'Adventurer is dead', metrics: {} };
    if (adv.beastHealth > 0) return this.decideBattle(state);
    return this.decideOutOfBattle(state);
  }

  // ------------------------------------------------------------------ start
  private decideStart(): Decision {
    const w = (STARTER_WEAPONS as readonly number[]).includes(this.params.startWeapon)
      ? this.params.startWeapon
      : STARTER_WEAPONS[Math.floor(Math.random() * STARTER_WEAPONS.length)];
    return {
      phase: 'start',
      actions: [{ type: 'start', weapon: w }, { type: 'attack', toTheDeath: false }],
      reason: `Start with ${lootInfo(w).name}; the starter beast always dies to the first hit`,
      metrics: {},
    };
  }

  // ------------------------------------------------------------------ battle
  peril(adv: Adventurer, state: GameState): PerilTable {
    const key = perilKey(adv, state);
    let t = this.perilCache.get(key);
    if (!t) {
      t = perilTable(adv, state.settings);
      if (this.perilCache.size > 512) this.perilCache.clear();
      this.perilCache.set(key, t);
    }
    return t;
  }

  /** Continuation value (expected future xp) after a battle ends with health h, given gold afterwards. */
  continuation(adv: Adventurer, state: GameState, gold: number, lvl: number, H: number, peril: PerilTable): Float64Array {
    const p = this.params;
    const out = new Float64Array(H + 1);
    let K = futureXp(p, lvl);
    const maxHp = maxHealth(adv.stats);
    if (this.valueNet && p.valueNetWeight) {
      const v = this.valueNet.predict(loadedFeatures(adv, state.bag, maxHp, gold, lvl));
      K = (1 - p.valueNetWeight) * K + p.valueNetWeight * v;
    }
    const price = potionPrice(adv);
    const target = this.healTarget(adv, peril, price, maxHp);
    for (let h = 1; h <= H; h++) {
      let hEff = h;
      let spent = 0;
      if (h < target) {
        const need = Math.ceil((target - h) / POTION_HEALTH_AMOUNT);
        const afford = Math.floor(gold / price);
        const n = Math.min(need, afford);
        hEff = Math.min(maxHp, h + n * POTION_HEALTH_AMOUNT);
        spent = n * price;
      }
      const risk = peril.instantDeath[hEff > 1024 ? 1024 : hEff];
      const missing = 1 - hEff / maxHp;
      out[h] = K * Math.max(0, 1 - p.riskWeight * risk - p.hpWeight * missing) - p.goldValue * spent;
    }
    return out;
  }

  healTarget(adv: Adventurer, peril: PerilTable, price: number, maxHp: number): number {
    const p = this.params;
    if (price <= p.cheapPotionPrice) return maxHp;
    // smallest health whose instant-death risk is below the threshold
    for (let h = 1; h <= maxHp; h++) if (peril.instantDeath[h > 1024 ? 1024 : h] <= p.maxExploreRisk) return Math.min(maxHp, h + 1);
    return maxHp;
  }

  evaluateBattle(state: GameState, adv: Adventurer, beast: Beast): { sol: BattleSolution; rootValues: Float64Array } {
    const p = this.params;
    const peril = this.peril(adv, state);
    const lvl = level(adv);
    const H = adv.health;
    const xpWin = beastXpReward(beast, lvl);
    const goldWin = beastGoldReward(beast);
    const lvlAfterWin = Math.floor(Math.sqrt(adv.xp + xpWin)) || 1;
    const contWin = this.continuation(adv, state, adv.gold + goldWin, lvlAfterWin, H, peril);
    const contEsc = this.continuation(adv, state, adv.gold, lvl, H, peril);
    const equipped = countEquipped(adv);
    const W = new Float64Array(H + 1);
    const E = new Float64Array(H + 1);
    const winBonus = xpWin + p.goldValue * goldWin + p.itemXpValue * xpWin * 2 * equipped + (lvlAfterWin > lvl ? 4 : 0);
    for (let h = 1; h <= H; h++) {
      W[h] = winBonus + contWin[h];
      E[h] = 1 + contEsc[h];
    }
    const hero = heroDamageOptions(adv, beast);
    const beastOpts = beastDamageOptions(adv, beast, state.settings, false);
    const pFlee = fleeProbability(adv);
    const sol = solveBattle({ heroHp: H, beastHp: adv.beastHealth, hero, beast: beastOpts, pFlee, win: W, escape: E, maxDepth: p.battleDepth, keepPlan: this.fast });
    // root values for all health levels (used by the swap evaluation)
    const rootValues = new Float64Array(H + 1);
    rootValues[H] = sol.value;
    return { sol, rootValues };
  }

  private decideBattle(state: GameState): Decision {
    const adv = loadAssets(state.adventurer, state.bag);
    const beast = currentBeast(state, PLANNING_RNG);
    const key = this.fast ? battleKey(adv, beast) : '';
    if (this.fast && key === this.planKey && this.plan) {
      const act = this.plan.lookup(adv.health, adv.beastHealth);
      if (act) {
        return {
          phase: 'battle',
          actions: [act === 'attack' ? { type: 'attack', toTheDeath: false } : { type: 'flee', toTheDeath: false }],
          reason: `${act === 'attack' ? 'Attack' : 'Flee'} ${beastName(beast)} (cached battle plan)`,
          metrics: {},
        };
      }
    }
    const { sol } = this.evaluateBattle(state, adv, beast);
    if (this.fast && sol.plan) {
      this.planKey = key;
      this.plan = sol.plan;
    }
    const name = beastName(beast);
    const metrics: Record<string, number> = {
      pWin: sol.pWin,
      pDeath: sol.pDeath,
      pEscape: sol.pEscape,
      valueAttack: sol.valueAttack,
      valueFlee: sol.valueFlee,
      beastHp: adv.beastHealth,
      beastLevel: beast.spec.level,
      beastTier: beast.spec.tier,
    };

    // gear swap from the bag (costs one free beast attack)
    const swap = this.params.spareArmor || this.params.spareWeapons || state.bag.some((i) => i.id !== 0) ? this.bestSwap(state, adv, beast) : null;
    if (swap) {
      const base = Math.max(sol.valueAttack, sol.valueFlee);
      if (swap.value > base + this.params.swapMinGain) {
        metrics.valueSwap = swap.value;
        return {
          phase: 'battle',
          actions: [{ type: 'equip', items: swap.items }],
          reason: `Swap gear vs ${name}: ${swap.items.map((i) => lootInfo(i).name).join(', ')} (value ${swap.value.toFixed(1)} > ${base.toFixed(1)})`,
          metrics,
        };
      }
    }

    const toTheDeath = sol.action === 'attack' && fleeProbability(adv) === 0 && sol.pDeath < 1e-9;
    const reason =
      sol.action === 'attack'
        ? `Attack ${name} (L${beast.spec.level} T${beast.spec.tier}, ${adv.beastHealth} HP): P(win)=${pct(sol.pWin)} P(death)=${pct(sol.pDeath)}; attack value ${sol.valueAttack.toFixed(1)} vs flee ${sol.valueFlee.toFixed(1)}`
        : `Flee from ${name} (L${beast.spec.level} T${beast.spec.tier}): P(escape)=${pct(sol.pEscape)} P(death)=${pct(sol.pDeath)}; flee value ${sol.valueFlee.toFixed(1)} vs attack ${sol.valueAttack.toFixed(1)}`;
    return {
      phase: 'battle',
      actions: [sol.action === 'attack' ? { type: 'attack', toTheDeath } : { type: 'flee', toTheDeath: false }],
      reason,
      metrics,
    };
  }

  /** Best weapon and armor from equipment+bag against a specific beast; returns null if nothing changes. */
  private bestSwap(state: GameState, adv: Adventurer, beast: Beast): { items: number[]; value: number } | null {
    const bagItems = state.bag.filter((i) => i.id !== 0);
    if (bagItems.length === 0) return null;
    const changes: number[] = [];
    // weapon: maximize expected damage per hit
    const curWeapon = adv.equipment[SLOT.Weapon];
    let bestW = curWeapon;
    let bestWDmg = expectedHeroDamage(adv, beast);
    for (const it of bagItems) {
      if (lootInfo(it.id).slot !== SLOT.Weapon) continue;
      const trial = withItem(adv, it);
      const d = expectedHeroDamage(trial, beast);
      if (d > bestWDmg * 1.05) {
        bestWDmg = d;
        bestW = it;
      }
    }
    if (bestW.id !== curWeapon.id) changes.push(bestW.id);
    // armor: minimize expected beast damage on that slot
    for (const slot of ARMOR_SLOTS) {
      const cur = adv.equipment[slot];
      let best = cur;
      let bestD = slotDamage(adv, beast, slot, state);
      for (const it of bagItems) {
        if (lootInfo(it.id).slot !== slot) continue;
        const d = slotDamage(withItem(adv, it), beast, slot, state);
        if (d < bestD - 0.5) {
          bestD = d;
          best = it;
        }
      }
      if (best.id !== cur.id) changes.push(best.id);
    }
    if (changes.length === 0) return null;
    // exact evaluation: apply the equip with the engine (beast gets a free hit), average over the hit outcomes
    let after: GameState;
    try {
      after = equip(state, changes, new FastRandom(7)).state; // state after equip (hit sampled; we re-average below)
    } catch {
      return null;
    }
    const swapped = loadAssets({ ...after.adventurer, health: adv.health, beastHealth: adv.beastHealth }, after.bag);
    const freeHit = beastDamageOptions(swapped, beast, state.settings, false);
    let value = 0;
    for (const o of freeHit) {
      const h = adv.health - o.dmg;
      if (h <= 0) continue;
      const trial = { ...swapped, health: h };
      const { sol } = this.evaluateBattle({ ...state, adventurer: after.adventurer, bag: after.bag }, trial, beast);
      value += o.p * sol.value;
    }
    return { items: changes, value };
  }

  // ------------------------------------------------------------------ out of battle
  private decideOutOfBattle(state: GameState): Decision {
    const actions: Action[] = [];
    const reasons: string[] = [];
    let s = state;
    const metrics: Record<string, number> = {};

    if (s.adventurer.statUpgrades > 0) {
      const alloc = this.allocateStats(s);
      actions.push({ type: 'stats', stats: alloc });
      s = selectStatUpgrades(s, alloc, PLANNING_RNG).state;
      reasons.push(`Stats ${fmtStats(alloc)}`);
    }

    // equip better items already in the bag (free outside battle)
    const fromBag = this.bagUpgrades(s);
    if (fromBag.length > 0) {
      actions.push({ type: 'equip', items: fromBag });
      s = equip(s, fromBag, PLANNING_RNG).state;
      reasons.push(`Equip ${fromBag.map((i) => lootInfo(i).name).join(', ')}`);
    }

    // market
    const shop = this.shop(s);
    if (shop.items.length > 0 || shop.potions > 0) {
      actions.push({ type: 'buy', potions: shop.potions, items: shop.items });
      s = buyItems(s, shop.potions, shop.items, PLANNING_RNG).state;
      if (shop.items.length) reasons.push(`Buy ${shop.items.map((i) => lootInfo(i.itemId).name + (i.equip ? '' : ' (bag)')).join(', ')}`);
      if (shop.potions) reasons.push(`Drink ${shop.potions} potion(s)`);
    }

    const adv = loadAssets(s.adventurer, s.bag);
    const peril = this.peril(adv, s);
    const risk = peril.instantDeath[adv.health > 1024 ? 1024 : adv.health];
    metrics.exploreRisk = risk;
    metrics.health = adv.health;
    metrics.maxHealth = maxHealth(adv.stats);
    const tillBeast = risk <= this.params.tillBeastMaxRisk;
    actions.push({ type: 'explore', tillBeast });
    reasons.push(`Explore${tillBeast ? ' until beast' : ''} (instant-death risk ${pct(risk)}, HP ${adv.health}/${metrics.maxHealth})`);
    return { phase: actions.some((a) => a.type === 'stats') ? 'level_up' : 'explore', actions, reason: reasons.join('; '), metrics };
  }

  allocateStats(state: GameState): Partial<Stats> {
    const p = this.params;
    const adv = loadAssets(state.adventurer, state.bag);
    const lvl = level(adv);
    const alloc: Stats = { str: 0, dex: 0, vit: 0, int: 0, wis: 0, cha: 0, luck: 0 };
    const cur = (k: keyof Stats) => adv.stats[k] + alloc[k];
    const late = lvl > p.phaseLevel;
    const r = (early: number, lateR: number) => (late ? lateR : early);
    const targets: Array<[keyof Stats, number]> = [
      ['cha', Math.min(p.chaCap, Math.floor(r(p.chaRatio, p.chaRatioLate) * lvl))],
      ['dex', Math.min(p.dexCap, Math.max(1, Math.floor(r(p.dexRatio, p.dexRatioLate) * lvl)))],
      ['int', Math.min(p.intCap, Math.floor(r(p.intRatio, p.intRatioLate) * lvl))],
      ['wis', Math.min(p.wisCap, Math.floor(r(p.wisRatio, p.wisRatioLate) * lvl))],
      ['str', Math.min(p.strCap, Math.floor(r(p.strRatio, p.strRatioLate) * lvl))],
    ];
    for (let n = 0; n < adv.statUpgrades; n++) {
      let pick: keyof Stats | null = null;
      let bestDeficit = 0;
      for (const [k, t] of targets) {
        const d = t - cur(k);
        if (d > bestDeficit) {
          bestDeficit = d;
          pick = k;
        }
      }
      if (!pick) {
        const vit = cur('vit');
        const str = cur('str');
        pick = vit * (1 - p.vitShare) <= str * p.vitShare ? 'vit' : 'str';
        if (maxHealth({ ...adv.stats, vit: vit + 1 }) === maxHealth({ ...adv.stats, vit })) pick = 'str'; // health cap reached
      }
      alloc[pick] += 1;
    }
    const out: Partial<Stats> = {};
    for (const k of ['str', 'dex', 'vit', 'int', 'wis', 'cha'] as const) if (alloc[k]) out[k] = alloc[k];
    return out;
  }

  /** Long-run combat power of an item in its slot. */
  itemPower(item: Item, isNew: boolean): number {
    const info = lootInfo(item.id);
    if (item.id === 0) return 0;
    const g = isNew ? 1 : greatness(item.xp);
    const gEff = Math.min(20, g + this.params.itemGrowth);
    return tierMultiplier(info.tier) * gEff;
  }

  private bagUpgrades(state: GameState): number[] {
    const adv = state.adventurer;
    const out: number[] = [];
    for (let slot = 1; slot <= 8; slot++) {
      const cur = adv.equipment[slot];
      let best = cur;
      let bestPower = cur.id === 0 ? -1 : this.itemPower(cur, false);
      for (const it of state.bag) {
        if (it.id === 0 || lootInfo(it.id).slot !== slot) continue;
        const pw = this.itemPower(it, false);
        if (pw > bestPower * (1 + this.params.upgradeMargin) || (cur.id === 0 && pw > bestPower)) {
          best = it;
          bestPower = pw;
        }
      }
      if (best.id !== cur.id) out.push(best.id);
    }
    return out;
  }

  /** Potions needed to bring the next explore's instant-death risk under the threshold. */
  safetyPotions(adv: Adventurer, peril: PerilTable, maxHp: number): number {
    const p = this.params;
    let h = adv.health;
    let n = 0;
    while (h < maxHp && peril.instantDeath[h > 1024 ? 1024 : h] > p.maxExploreRisk) {
      h += POTION_HEALTH_AMOUNT;
      n++;
    }
    return n;
  }

  shop(state: GameState): { items: ItemPurchase[]; potions: number } {
    const p = this.params;
    const adv = loadAssets(state.adventurer, state.bag);
    const maxHp = maxHealth(adv.stats);
    const price = potionPrice(adv);
    const peril = this.peril(adv, state);
    const maxByCap = Math.max(0, Math.ceil((maxHp + POTION_HEALTH_AMOUNT - adv.health) / POTION_HEALTH_AMOUNT) - 1);
    // 1) mandatory potions for the next explore
    const mandatory = Math.min(maxByCap, this.safetyPotions(adv, peril, maxHp));
    let gold = adv.gold;
    const mandatoryCost = Math.min(gold, mandatory * price);
    // gold kept for later healing (fraction of max health), never needed to fill an empty armor slot
    const healReserve = Math.ceil(((p.potionReserveFactor * maxHp) / POTION_HEALTH_AMOUNT) * price) + p.goldReserve;
    let budget = gold - mandatoryCost - healReserve;
    let emptySlotBudget = gold - mandatoryCost;

    const owned = (id: number) => isEquipped(adv.equipment, id) || bagContains(state.bag, id) !== null;
    const bagFree = state.bag.filter((i) => i.id === 0).length;
    let bagUsed = 0;
    const claimedSlots = new Set<number>();
    type Cand = { id: number; slot: number; gain: number; price: number; equip: boolean; key: boolean };
    const scored: Cand[] = [];
    for (const id of [...new Set(state.market)]) {
      if (owned(id)) continue;
      const info = lootInfo(id);
      const slot = info.slot;
      const cur = adv.equipment[slot];
      const cost = itemPrice(id, adv.stats.cha);
      if (slot === SLOT.Neck || slot === SLOT.Ring) {
        if (!p.buyJewelry && cur.id !== 0) continue;
        const gain = jewelryGain(id, adv, cur);
        if (gain > 0) scored.push({ id, slot, gain: cur.id === 0 ? 50 + gain : gain, price: cost, equip: true, key: false });
        continue;
      }
      const newPower = this.itemPower({ id, xp: 0 }, true);
      const curPower = cur.id === 0 ? 0 : this.itemPower(cur, false);
      if (cur.id === 0) {
        // empty armor slot: very high priority (an empty slot takes +50% damage with 0 armor)
        scored.push({ id, slot, gain: 1000 + newPower, price: cost, equip: true, key: true });
      } else if (newPower > curPower * (1 + p.upgradeMargin)) {
        const rel = (newPower - curPower) / Math.max(1, curPower);
        const weaponBoost = slot === SLOT.Weapon ? 3 : 1; // damage drives gold income and safety
        scored.push({ id, slot, gain: rel * weaponBoost * 100, price: cost, equip: true, key: info.tier <= 2 });
      }
    }
    // empty slot: prefer the best tier we can afford, else the cheapest filler
    scored.sort((a, b) => b.gain - a.gain);
    const items: ItemPurchase[] = [];
    let savingFor = 0;
    for (const c of scored) {
      if (claimedSlots.has(c.slot)) continue;
      const fillsEmpty = adv.equipment[c.slot].id === 0 && c.slot !== SLOT.Neck && c.slot !== SLOT.Ring;
      if (fillsEmpty && c.price <= emptySlotBudget && c.price > budget) {
        // an empty armor slot takes +50% damage with no armor: fill it even from the healing reserve,
        // but only with the cheapest option for that slot
        const cheapest = scored.filter((x) => x.slot === c.slot).reduce((m, x) => (x.price < m.price ? x : m), c);
        if (cheapest.price <= emptySlotBudget) {
          items.push({ itemId: cheapest.id, equip: true });
          emptySlotBudget -= cheapest.price;
          budget -= cheapest.price;
          gold -= cheapest.price;
          claimedSlots.add(c.slot);
          continue;
        }
      }
      if (c.price > budget) {
        // remember the most valuable unaffordable key item: keep gold for it instead of luxury potions
        if (c.key && savingFor === 0 && c.price <= gold + 40) savingFor = c.price;
        continue;
      }
      if (adv.equipment[c.slot].id !== 0) {
        if (bagUsed >= bagFree) continue;
        bagUsed++;
      }
      // for an empty slot, skip a cheap filler when a better tier for the same slot is affordable later in the list
      items.push({ itemId: c.id, equip: c.equip });
      budget -= c.price;
      emptySlotBudget -= c.price;
      gold -= c.price;
      claimedSlots.add(c.slot);
    }
    // 2) potions: mandatory ones, then top up (cheap potions) unless saving for a key item
    let potions = Math.min(mandatory, Math.floor(gold / price));
    gold -= potions * price;
    const target = this.healTarget(adv, peril, price, maxHp);
    const want = Math.max(0, Math.ceil((target - adv.health) / POTION_HEALTH_AMOUNT) - potions);
    if (want > 0) {
      const spare = savingFor > 0 ? Math.max(0, gold - savingFor) : gold - p.goldReserve;
      const extra = Math.min(want, Math.max(0, Math.floor(spare / price)));
      potions += extra;
    }
    potions = Math.min(potions, maxByCap);
    return { items, potions };
  }
}

// ------------------------------------------------------------------ helpers

function perilKey(adv: Adventurer, state: GameState): string {
  const e = adv.equipment;
  let k = `${level(adv)}|${adv.stats.int}|${adv.stats.wis}|${state.settings.statsMode}|${adv.itemSpecialsSeed}`;
  for (let s = 1; s <= 8; s++) k += `|${e[s].id}:${greatness(e[s].xp)}`;
  return k;
}

function battleKey(adv: Adventurer, beast: Beast): string {
  const e = adv.equipment;
  const st = adv.stats;
  let k = `${beast.id}|${beast.spec.level}|${beast.startingHealth}|${beast.spec.specials.special2}|${beast.spec.specials.special3}|${adv.xp}|${adv.gold}|${st.str},${st.dex},${st.vit},${st.int},${st.wis},${st.cha},${st.luck}`;
  for (let s = 1; s <= 8; s++) k += `|${e[s].id}:${e[s].xp}`;
  return k;
}

function countEquipped(adv: Adventurer): number {
  let n = 0;
  for (let s = 1; s <= 8; s++) if (adv.equipment[s].id !== 0) n++;
  return n;
}

function withItem(adv: Adventurer, item: Item): Adventurer {
  const eq = adv.equipment.map((x) => ({ ...x }));
  eq[lootInfo(item.id).slot] = { ...item };
  return { ...adv, equipment: eq };
}

function expectedHeroDamage(adv: Adventurer, beast: Beast): number {
  return heroDamageOptions(adv, beast).reduce((s, o) => s + o.dmg * o.p, 0);
}

function slotDamage(adv: Adventurer, beast: Beast, slot: number, state: GameState): number {
  // average damage of a beast hit on this slot (crit-weighted) - reuse the full option list filtered by slot order
  const only = { ...adv, equipment: adv.equipment.map((x) => ({ ...x })) };
  const opts = beastDamageOptions(only, beast, state.settings, false);
  // beastDamageOptions merges slots; approximate per-slot damage by evaluating a copy where every armor slot holds
  // this slot's item
  const it = adv.equipment[slot];
  for (const s of ARMOR_SLOTS) only.equipment[s] = { ...it };
  const per = beastDamageOptions(only, beast, state.settings, false);
  void opts;
  return per.reduce((s, o) => s + o.dmg * o.p, 0);
}

/** Heuristic gain of a jewelry piece vs the current one in that slot. */
function jewelryGain(id: number, adv: Adventurer, cur: Item): number {
  if (cur.id !== 0 && greatness(cur.xp) >= 8) return 0; // keep a leveled piece
  const armorTypes = ARMOR_SLOTS.map((s) => lootInfo(adv.equipment[s].id).type);
  const count = (t: number) => armorTypes.filter((x) => x === t).length;
  let base = 0;
  switch (id) {
    case 1: base = 1 + count(TYPE.BladeHide); break; // Pendant -> hide
    case 2: base = 1 + count(TYPE.BludgeonMetal); break; // Necklace -> metal
    case 3: base = 1 + count(TYPE.MagicCloth); break; // Amulet -> cloth
    case 7: base = 5; break; // Titanium ring: crit damage
    case 4: base = 4.5; break; // Silver ring: luck
    case 6: base = 3; break; // Platinum ring: name match damage
    case 8: base = 3.5; break; // Gold ring: gold
    case 5: base = 1; break; // Bronze ring
  }
  if (cur.id === 0) return base + 10;
  if (!isJewelry(id)) return 0;
  const curBase = jewelryGain(cur.id, adv, { id: 0, xp: 0 }) - 10;
  return base > curBase + 1 ? base - curBase : 0;
}

export function pct(x: number): string {
  if (!Number.isFinite(x)) return '-';
  if (x > 0 && x < 0.001) return '<0.1%';
  return `${(x * 100).toFixed(1)}%`;
}

function fmtStats(s: Partial<Stats>): string {
  return Object.entries(s)
    .filter(([, v]) => v)
    .map(([k, v]) => `+${v} ${k.toUpperCase()}`)
    .join(' ');
}

export function describeSlot(slot: number): string {
  return SLOT_NAMES[slot] ?? '?';
}
