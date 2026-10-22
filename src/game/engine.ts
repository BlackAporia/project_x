// Game state transitions mirrored from systems/game/contracts.cairo (game_systems).
// Every public function validates the same preconditions as the contract and throws the contract's
// error message, so the bot never submits a transaction the chain would reject.
import {
  ARMOR_SLOTS,
  DEFAULT_SETTINGS,
  ITEM_MAX_GREATNESS,
  ITEM_XP_MULTIPLIER_BEASTS,
  ITEM_XP_MULTIPLIER_OBSTACLES,
  MAX_GREATNESS_STAT_BONUS,
  POTION_HEALTH_AMOUNT,
  SLOT,
  STARTER_BEAST_ATTACK_DAMAGE,
  STARTER_WEAPONS,
  STARTING_HEALTH,
  SUFFIX_UNLOCK_GREATNESS,
  XP_FOR_DISCOVERIES,
} from './constants.ts';
import {
  abilityAvoid,
  abilityDamageReduction,
  applyDamageReduction,
} from './combat.ts';
import {
  adventurerAttack,
  adventurerDefend,
  applyHealthBoostFromVitalityUnlock,
  applyVitalityHealthBoost,
  bagAdd,
  bagContains,
  bagIsFull,
  bagRemove,
  canExplore,
  cloneAdventurer,
  cloneItems,
  decreaseHealth,
  deductGold,
  dropEquipped,
  emptyBag,
  equipItem,
  equippedItem,
  increaseGold,
  increaseHealth,
  increaseItemXp,
  increaseStatUpgrades,
  increaseXp,
  incrementActionCount,
  isEquipped,
  itemAtSlot,
  jewelryGoldBonus,
  level,
  loadAssets,
  maxHealth,
  newAdventurer,
  obstacleDamage,
  potionPrice,
  removeBoosts,
  unlockedSpecials,
  weaponSpec,
} from './adventurer.ts';
import {
  beastCritChance,
  beastGoldReward,
  beastXpReward,
  generateBeast,
  generateObstacle,
  obstacleXpReward,
  starterBeast,
} from './beast.ts';
import { T1_ITEMS, T2_ITEMS, T3_ITEMS, T4_ITEMS, T5_ITEMS } from './data.ts';
import {
  applyBagBoost,
  applySuffixBoost,
  greatness,
  itemPrice,
  itemSpecials,
  itemSuffix,
  lootGoldValue,
  lootInfo,
} from './loot.ts';
import type { RandomSource, SeedContext } from './rng.ts';
import type { Action, Adventurer, Beast, GameEvent, GameState, Item, ItemPurchase, Settings, Stats } from './types.ts';

export class GameRuleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GameRuleError';
  }
}

function assert(cond: boolean, message: string): asserts cond {
  if (!cond) throw new GameRuleError(message);
}

export function defaultSettings(): Settings {
  return { ...DEFAULT_SETTINGS };
}

/** State of a freshly minted (not started) game token. */
export function newGameState(adventurerId: bigint, settings: Settings = defaultSettings()): GameState {
  const adventurer: Adventurer = {
    health: 0,
    xp: 0,
    gold: 0,
    beastHealth: 0,
    statUpgrades: 0,
    stats: { str: 0, dex: 0, vit: 0, int: 0, wis: 0, cha: 0, luck: 0 },
    equipment: [],
    itemSpecialsSeed: 0,
    actionCount: 0,
  };
  for (let i = 0; i <= 8; i++) adventurer.equipment.push({ id: 0, xp: 0 });
  return {
    adventurerId,
    adventurer,
    bag: emptyBag(),
    marketSeed: 0n,
    beastSeed: 0n,
    market: [],
    beast: null,
    settings,
    started: false,
  };
}

export function cloneState(s: GameState): GameState {
  return {
    adventurerId: s.adventurerId,
    adventurer: cloneAdventurer(s.adventurer),
    bag: cloneItems(s.bag),
    marketSeed: s.marketSeed,
    beastSeed: s.beastSeed,
    market: s.market.slice(),
    beast: s.beast ? cloneBeast(s.beast) : null,
    settings: s.settings,
    started: s.started,
  };
}

export function cloneBeast(b: Beast): Beast {
  return { id: b.id, startingHealth: b.startingHealth, spec: { ...b.spec, specials: { ...b.spec.specials } } };
}

export function isDead(s: GameState): boolean {
  return s.started && s.adventurer.health === 0;
}

export function score(s: GameState): number {
  return s.adventurer.xp;
}

// ---------------------------------------------------------------------------------------------
// Internal context for one action (mirrors the local variables of a contract entrypoint)
// ---------------------------------------------------------------------------------------------

interface Ctx {
  state: GameState;
  /** loaded adventurer (with item boosts and luck), mutated during the action */
  adv: Adventurer;
  bag: Item[];
  bagMutated: boolean;
  events: GameEvent[];
  rng: RandomSource;
}

function begin(state: GameState, rng: RandomSource): Ctx {
  const next = cloneState(state);
  const adv = loadAssets(next.adventurer, next.bag);
  incrementActionCount(adv);
  return { state: next, adv, bag: next.bag, bagMutated: false, events: [], rng };
}

function seedContext(ctx: Ctx): SeedContext {
  return {
    adventurerId: ctx.state.adventurerId,
    xp: ctx.adv.xp,
    actionCount: ctx.adv.actionCount,
    inBattle: ctx.adv.beastHealth !== 0,
    gameSeed: ctx.state.settings.gameSeed,
    gameSeedUntilXp: ctx.state.settings.gameSeedUntilXp,
  };
}

function finish(ctx: Ctx): { state: GameState; events: GameEvent[] } {
  ctx.state.bag = ctx.bag;
  ctx.state.adventurer = removeBoosts(ctx.adv, ctx.bag);
  if (ctx.adv.beastHealth === 0) ctx.state.beast = null;
  return { state: ctx.state, events: ctx.events };
}

function levelUpMarket(ctx: Ctx, prevLevel: number, marketSeed: bigint): void {
  const newLevel = level(ctx.adv);
  if (prevLevel < newLevel) {
    ctx.state.marketSeed = marketSeed;
    ctx.state.market = ctx.rng.market(ctx.state.adventurerId, marketSeed, ctx.state.settings.marketSize);
    ctx.events.push({ type: 'level_up', level: newLevel });
    ctx.events.push({ type: 'market', items: ctx.state.market.slice() });
  }
}

function assertNotDead(a: Adventurer): void {
  assert(a.health !== 0, 'Adventurer is dead');
}

function assertInBattle(a: Adventurer): void {
  assert(a.beastHealth !== 0, 'Not in battle');
}

function assertNotInBattle(a: Adventurer): void {
  assert(a.beastHealth === 0, 'Action not allowed in battle');
}

// ---------------------------------------------------------------------------------------------
// start_game
// ---------------------------------------------------------------------------------------------

export function startGame(state: GameState, weapon: number, rng: RandomSource): { state: GameState; events: GameEvent[] } {
  assert(!state.started && state.adventurer.xp === 0 && state.adventurer.health === 0, 'Adventurer has already started');
  assert((STARTER_WEAPONS as readonly number[]).includes(weapon), 'Invalid starting weapon');
  const next = cloneState(state);
  const events: GameEvent[] = [];
  const adv = newAdventurer(weapon);
  incrementActionCount(adv);
  decreaseHealth(adv, STARTER_BEAST_ATTACK_DAMAGE);
  const beast = starterBeast(lootInfo(weapon).type);
  events.push({ type: 'beast', beast });
  events.push({ type: 'ambush', damage: STARTER_BEAST_ATTACK_DAMAGE, slot: SLOT.None, critical: false });
  next.beastSeed = next.adventurerId;
  next.adventurer = adv;
  next.beast = beast;
  next.started = true;
  next.market = rng.market(next.adventurerId, next.marketSeed, next.settings.marketSize);
  return { state: next, events };
}

// ---------------------------------------------------------------------------------------------
// explore
// ---------------------------------------------------------------------------------------------

export function explore(state: GameState, tillBeast: boolean, rng: RandomSource): { state: GameState; events: GameEvent[] } {
  const ctx = begin(state, rng);
  const adv = ctx.adv;
  assertNotDead(adv);
  assert(adv.statUpgrades === 0, 'Stat upgrade available');
  assertNotInBattle(adv);
  const prevLevel = level(adv);
  const [exploreSeed, marketSeed] = rng.actionSeed(seedContext(ctx));
  exploreLoop(ctx, exploreSeed, tillBeast);
  levelUpMarket(ctx, prevLevel, marketSeed);
  return finish(ctx);
}

function exploreLoop(ctx: Ctx, exploreSeed: bigint, tillBeast: boolean): void {
  for (;;) {
    const adv = ctx.adv;
    const r = ctx.rng.randomness(adv.xp, exploreSeed);
    const result = r.r8d % 3;
    if (result === 0) {
      beastEncounter(ctx, exploreSeed, r.r32a, r.r16a, r.r16b, r.r8a, r.r8b, r.r8c);
    } else if (result === 1) {
      obstacleEncounter(ctx, r.r32a, r.r16b, r.r8a, r.r8b, r.r8c, r.r16a);
    } else {
      processDiscovery(ctx, r.r8a, r.r8b, r.r8c);
    }
    if (!(tillBeast && canExplore(ctx.adv))) break;
  }
}

function beastEncounter(
  ctx: Ctx,
  exploreSeed: bigint,
  seed: number,
  healthRnd: number,
  levelRnd: number,
  dmgLocationRnd: number,
  critHitRnd: number,
  ambushRnd: number,
): void {
  const adv = ctx.adv;
  const lvl = level(adv);
  const beast = generateBeast(lvl, lootInfo(adv.equipment[SLOT.Weapon].id).type, seed, healthRnd, levelRnd, dmgLocationRnd, critHitRnd);
  adv.beastHealth = beast.startingHealth;
  const settings = ctx.state.settings;
  const isAmbush = settings.statsMode === 'Dodge' ? !abilityAvoid(lvl, adv.stats.wis, ambushRnd) : true;
  ctx.state.beastSeed = exploreSeed;
  ctx.state.beast = beast;
  ctx.events.push({ type: 'beast', beast });
  if (isAmbush) {
    const ev = beastAttack(ctx, beast, critHitRnd, dmgLocationRnd, true);
    if (ev.damage > 0) ctx.events.push({ type: 'ambush', damage: ev.damage, slot: ev.slot, critical: ev.critical });
    if (adv.health === 0) ctx.events.push({ type: 'death', cause: 'ambush' });
  }
}

/** _beast_attack — returns the attack details; mutates adventurer health. */
function beastAttack(ctx: Ctx, beast: Beast, critRnd: number, locationRnd: number, isAmbush: boolean) {
  const adv = ctx.adv;
  const slot = ARMOR_SLOTS[locationRnd % 5];
  const armor = itemAtSlot(adv.equipment, slot);
  const armorSpecials = itemSpecials(armor.id, greatness(armor.xp), adv.itemSpecialsSeed);
  const critChance = beastCritChance(level(adv), isAmbush);
  const result = adventurerDefend(adv, beast, armor, armorSpecials, critRnd, critChance);
  let damage = result.totalDamage;
  const settings = ctx.state.settings;
  if (isAmbush) damage = applyDamageReduction(damage, settings.baseDamageReduction);
  if (isAmbush && settings.statsMode === 'Reduction') {
    damage = applyDamageReduction(damage, abilityDamageReduction(level(adv), adv.stats.wis));
  }
  decreaseHealth(adv, damage);
  return { damage, slot, critical: result.criticalHitBonus > 0 };
}

function obstacleEncounter(
  ctx: Ctx,
  seed: number,
  levelRnd: number,
  dmgLocationRnd: number,
  critHitRnd: number,
  dodgeRnd: number,
  itemSpecialsRnd: number,
): void {
  const adv = ctx.adv;
  const settings = ctx.state.settings;
  const lvl = level(adv);
  const obstacle = generateObstacle(lvl, seed, levelRnd);
  const slot = ARMOR_SLOTS[dmgLocationRnd % 5];
  const armor = itemAtSlot(adv.equipment, slot);
  const result = obstacleDamage(adv, obstacle, armor, critHitRnd);
  let damage = applyDamageReduction(result.totalDamage, settings.baseDamageReduction);
  const xp = obstacleXpReward(obstacle, lvl);
  const dodged = settings.statsMode === 'Dodge' ? abilityAvoid(lvl, adv.stats.int, dodgeRnd) : false;
  if (settings.statsMode === 'Reduction') damage = applyDamageReduction(damage, abilityDamageReduction(lvl, adv.stats.int));
  if (!dodged && damage > 0) decreaseHealth(adv, damage);
  if (adv.health !== 0) {
    increaseXp(adv, xp);
    grantXpToEquippedItems(ctx, xp * ITEM_XP_MULTIPLIER_OBSTACLES, itemSpecialsRnd);
  }
  ctx.events.push({
    type: 'obstacle',
    obstacleId: obstacle.id,
    level: obstacle.spec.level,
    dodged,
    damage,
    slot,
    critical: result.criticalHitBonus > 0,
    xp,
  });
  if (adv.health === 0) ctx.events.push({ type: 'death', cause: 'obstacle' });
}

/** ImplAdventurer::get_discovery */
export function discoveryOf(lvl: number, typeRnd: number, amountRnd1: number, amountRnd2: number): { kind: 'Gold' | 'Health' | 'Loot'; amount: number } {
  const pct = scaleU8ToPercent(typeRnd);
  if (pct < 45) return { kind: 'Gold', amount: (amountRnd1 % lvl) + 1 };
  if (pct < 90) return { kind: 'Health', amount: ((amountRnd1 % lvl) + 1) * 2 };
  return { kind: 'Loot', amount: lootDiscovery(amountRnd1, amountRnd2) };
}

export function scaleU8ToPercent(rnd: number): number {
  return Math.floor((rnd * 100 + 127) / 255);
}

export function lootDiscovery(tierRnd: number, itemRnd: number): number {
  const outcome = scaleU8ToPercent(tierRnd);
  const list = outcome < 50 ? T5_ITEMS : outcome < 80 ? T4_ITEMS : outcome < 92 ? T3_ITEMS : outcome < 98 ? T2_ITEMS : T1_ITEMS;
  return list[itemRnd % list.length];
}

function processDiscovery(ctx: Ctx, typeRnd: number, amountRnd1: number, amountRnd2: number): void {
  const adv = ctx.adv;
  const d = discoveryOf(level(adv), typeRnd, amountRnd1, amountRnd2);
  increaseXp(adv, XP_FOR_DISCOVERIES);
  let converted: number | undefined;
  if (d.kind === 'Gold') {
    increaseGold(adv, d.amount);
  } else if (d.kind === 'Health') {
    increaseHealth(adv, d.amount);
  } else {
    const itemId = d.amount;
    const inBag = bagContains(ctx.bag, itemId) !== null;
    const slot = lootInfo(itemId).slot;
    const slotFree = itemAtSlot(adv.equipment, slot).id === 0;
    const inventoryFull = bagIsFull(ctx.bag) && !slotFree;
    if (inBag || isEquipped(adv.equipment, itemId) || inventoryFull) {
      converted = lootGoldValue(lootInfo(itemId).tier);
      increaseGold(adv, converted);
    } else if (slotFree) {
      equipItem(adv.equipment, { id: itemId, xp: 0 });
    } else {
      bagAdd(ctx.bag, { id: itemId, xp: 0 });
      ctx.bagMutated = true;
    }
  }
  ctx.events.push({ type: 'discovery', kind: d.kind, amount: d.amount, xp: XP_FOR_DISCOVERIES, convertedToGold: converted });
}

// ---------------------------------------------------------------------------------------------
// item xp
// ---------------------------------------------------------------------------------------------

function grantXpToEquippedItems(ctx: Ctx, amount: number, itemSpecialsRnd: number): void {
  const adv = ctx.adv;
  for (let slot = 1; slot <= 8; slot++) {
    const item = adv.equipment[slot];
    if (item.id === 0) continue;
    const [prev, next] = increaseItemXp(item, amount);
    if (next > prev) processItemLevelUp(ctx, item, prev, next, itemSpecialsRnd);
  }
}

function processItemLevelUp(ctx: Ctx, item: Item, prev: number, next: number, itemSpecialsRnd: number): void {
  const adv = ctx.adv;
  if (next === ITEM_MAX_GREATNESS) increaseStatUpgrades(adv, MAX_GREATNESS_STAT_BONUS);
  const [suffixUnlocked, prefixUnlocked] = unlockedSpecials(prev, next);
  if (suffixUnlocked || prefixUnlocked) {
    if (adv.itemSpecialsSeed === 0) adv.itemSpecialsSeed = itemSpecialsRnd;
    if (suffixUnlocked) {
      const sp = itemSpecials(item.id, greatness(item.xp), adv.itemSpecialsSeed);
      applySuffixBoost(adv.stats, sp.special1);
      applyBagBoost(adv.stats, sp.special1);
      applyHealthBoostFromVitalityUnlock(adv, sp.special1);
    }
  }
  ctx.events.push({ type: 'item_level_up', itemId: item.id, from: prev, to: next, suffix: suffixUnlocked, prefix: prefixUnlocked });
}

// ---------------------------------------------------------------------------------------------
// attack / flee
// ---------------------------------------------------------------------------------------------

/** Beast currently fought; regenerated from the beast seed when the state came from chain. */
export function currentBeast(state: GameState, rng: RandomSource): Beast {
  if (state.beast) return state.beast;
  const adv = state.adventurer;
  if (level(adv) === 1) return starterBeast(lootInfo(adv.equipment[SLOT.Weapon].id).type);
  const r = rng.randomness(adv.xp, state.beastSeed);
  return generateBeast(level(adv), lootInfo(adv.equipment[SLOT.Weapon].id).type, r.r32a, r.r16a, r.r16b, r.r8a, r.r8b);
}

export function attack(state: GameState, toTheDeath: boolean, rng: RandomSource): { state: GameState; events: GameEvent[] } {
  const ctx = begin(state, rng);
  const adv = ctx.adv;
  assertNotDead(adv);
  assertInBattle(adv);
  const beast = currentBeast(ctx.state, rng);
  // _get_beast also returns beast_level_rnd, which the contract passes on as the item specials rnd
  const beastLevelRnd = rng.randomness(adv.xp, ctx.state.beastSeed).r16b;
  const weapon = weaponSpec(adv);
  const prevLevel = level(adv);
  const [levelSeed, marketSeed] = rng.actionSeed(seedContext(ctx));
  let battleCount = adv.actionCount;
  for (;;) {
    battleCount = battleCount + 1 > 0xffff ? 0 : battleCount + 1;
    const [, advCritRnd, beastCritRnd, locationRnd] = rng.battle(adv.xp, battleCount, levelSeed);
    const result = adventurerAttack(adv, weapon, beast, advCritRnd);
    ctx.events.push({ type: 'attack', damage: result.totalDamage, critical: result.criticalHitBonus > 0 });
    if (result.totalDamage >= adv.beastHealth) {
      processBeastDeath(ctx, beast, beastLevelRnd, levelSeed);
      break;
    }
    adv.beastHealth -= result.totalDamage;
    const ev = beastAttack(ctx, beast, beastCritRnd, locationRnd, false);
    ctx.events.push({ type: 'beast_attack', damage: ev.damage, slot: ev.slot, critical: ev.critical });
    if (adv.health === 0) {
      ctx.events.push({ type: 'death', cause: 'beast' });
      break;
    }
    if (!toTheDeath) break;
  }
  levelUpMarket(ctx, prevLevel, marketSeed);
  return finish(ctx);
}

function processBeastDeath(ctx: Ctx, beast: Beast, itemSpecialsRnd: number, levelSeed: bigint): void {
  const adv = ctx.adv;
  adv.beastHealth = 0;
  const gold = beastGoldReward(beast);
  const ringBonus = jewelryGoldBonus(adv.equipment[SLOT.Ring], gold);
  increaseGold(adv, gold + ringBonus);
  const xp = beastXpReward(beast, level(adv));
  const [prev, next] = increaseXp(adv, xp);
  grantXpToEquippedItems(ctx, xp * ITEM_XP_MULTIPLIER_BEASTS, itemSpecialsRnd);
  if (prev === 1 && next === 2) {
    const stats = ctx.rng.startingStats(levelSeed);
    adv.stats = stats;
    adv.health += maxHealth(stats) - STARTING_HEALTH;
    ctx.events.push({ type: 'starting_stats', stats: { ...stats } });
  }
  ctx.events.push({ type: 'defeated_beast', beastId: beast.id, gold: gold + ringBonus, xp });
}

export function flee(state: GameState, toTheDeath: boolean, rng: RandomSource): { state: GameState; events: GameEvent[] } {
  const ctx = begin(state, rng);
  const adv = ctx.adv;
  assertNotDead(adv);
  assertInBattle(adv);
  assert(level(adv) > 1, 'Cant flee starter beast');
  assert(adv.stats.dex !== 0, 'Cant flee, no dexterity');
  const beast = currentBeast(ctx.state, rng);
  const prevLevel = level(adv);
  const [fleeSeed, marketSeed] = rng.actionSeed(seedContext(ctx));
  let battleCount = adv.actionCount;
  for (;;) {
    battleCount = battleCount + 1 > 0xffff ? 0 : battleCount + 1;
    const [fleeRnd, , beastCritRnd, locationRnd] = rng.battle(adv.xp, battleCount, fleeSeed);
    const fled = abilityAvoid(level(adv), adv.stats.dex, fleeRnd);
    if (fled) {
      adv.beastHealth = 0;
      increaseXp(adv, 1);
      ctx.events.push({ type: 'flee', success: true });
      ctx.events.push({ type: 'fled_beast', beastId: beast.id, xp: 1 });
      break;
    }
    const ev = beastAttack(ctx, beast, beastCritRnd, locationRnd, false);
    ctx.events.push({ type: 'flee', success: false });
    ctx.events.push({ type: 'beast_attack', damage: ev.damage, slot: ev.slot, critical: ev.critical });
    if (adv.health === 0) {
      ctx.events.push({ type: 'death', cause: 'beast' });
      break;
    }
    if (!toTheDeath) break;
  }
  levelUpMarket(ctx, prevLevel, marketSeed);
  return finish(ctx);
}

// ---------------------------------------------------------------------------------------------
// equip / drop
// ---------------------------------------------------------------------------------------------

function equipOne(ctx: Ctx, item: Item): void {
  const adv = ctx.adv;
  const slot = lootInfo(item.id).slot;
  const unequipping = itemAtSlot(adv.equipment, slot);
  if (unequipping.id !== 0) {
    bagAdd(ctx.bag, unequipping);
    ctx.bagMutated = true;
    if (greatness(unequipping.xp) >= SUFFIX_UNLOCK_GREATNESS) {
      applySuffixBoost(adv.stats, itemSuffix(unequipping.id, adv.itemSpecialsSeed), -1);
    }
  }
  equipItem(adv.equipment, item);
  if (greatness(item.xp) >= SUFFIX_UNLOCK_GREATNESS) applySuffixBoost(adv.stats, itemSuffix(item.id, adv.itemSpecialsSeed));
}

function assertItemNotOwned(ctx: Ctx, itemId: number): void {
  assert(!isEquipped(ctx.adv.equipment, itemId) && bagContains(ctx.bag, itemId) === null, 'Item already owned');
}

function equipItems(ctx: Ctx, items: number[], newlyPurchased: boolean): void {
  for (const itemId of items) {
    if (newlyPurchased) {
      assertItemNotOwned(ctx, itemId);
      equipOne(ctx, { id: itemId, xp: 0 });
    } else {
      assert(bagContains(ctx.bag, itemId) !== null, 'Item not in bag');
      const item = bagRemove(ctx.bag, itemId);
      ctx.bagMutated = true;
      equipOne(ctx, item);
    }
  }
}

export function equip(state: GameState, items: number[], rng: RandomSource): { state: GameState; events: GameEvent[] } {
  const ctx = begin(state, rng);
  const adv = ctx.adv;
  assertNotDead(adv);
  assert(items.length !== 0, 'Must provide item ids');
  assert(items.length <= 8, 'Too many items');
  equipItems(ctx, items, false);
  if (adv.beastHealth !== 0) {
    const beast = currentBeast(ctx.state, rng);
    const [seed] = rng.actionSeed(seedContext(ctx));
    const [, , beastCritRnd, locationRnd] = rng.battle(adv.xp, 0, seed);
    const ev = beastAttack(ctx, beast, beastCritRnd, locationRnd, false);
    ctx.events.push({ type: 'beast_attack', damage: ev.damage, slot: ev.slot, critical: ev.critical });
    if (adv.health === 0) ctx.events.push({ type: 'death', cause: 'beast' });
  }
  ctx.events.push({ type: 'equip', items: items.slice() });
  return finish(ctx);
}

export function drop(state: GameState, items: number[], rng: RandomSource): { state: GameState; events: GameEvent[] } {
  const ctx = begin(state, rng);
  const adv = ctx.adv;
  assertNotDead(adv);
  assertNotInBattle(adv);
  assert(items.length !== 0, 'Must provide item ids');
  assert(level(adv) > 1, 'Cant drop during starter beast');
  for (const itemId of items) {
    const suffix = itemSuffix(itemId, adv.itemSpecialsSeed);
    let item: Item;
    if (isEquipped(adv.equipment, itemId)) {
      item = equippedItem(adv.equipment, itemId);
      if (greatness(item.xp) >= SUFFIX_UNLOCK_GREATNESS) applySuffixBoost(adv.stats, suffix, -1);
      dropEquipped(adv.equipment, itemId);
    } else {
      const inBag = bagContains(ctx.bag, itemId);
      assert(inBag !== null, 'Item not owned by adventurer');
      item = { id: inBag.id, xp: inBag.xp };
      bagRemove(ctx.bag, itemId);
      ctx.bagMutated = true;
    }
    if (greatness(item.xp) >= SUFFIX_UNLOCK_GREATNESS) applyBagBoost(adv.stats, suffix, -1);
    const max = maxHealth(adv.stats);
    if (adv.health > max) adv.health = max;
  }
  ctx.events.push({ type: 'drop', items: items.slice() });
  return finish(ctx);
}

// ---------------------------------------------------------------------------------------------
// buy_items / select_stat_upgrades
// ---------------------------------------------------------------------------------------------

export function marketHas(market: number[], itemId: number): boolean {
  if (market.length >= 101) return true;
  return market.includes(itemId);
}

export function buyItems(
  state: GameState,
  potions: number,
  items: ItemPurchase[],
  rng: RandomSource,
): { state: GameState; events: GameEvent[] } {
  const ctx = begin(state, rng);
  const adv = ctx.adv;
  assertNotDead(adv);
  assertNotInBattle(adv);
  assert(adv.statUpgrades === 0, 'Market is closed');
  if (items.length !== 0) {
    const toEquip: number[] = [];
    for (const p of items) {
      assert(marketHas(ctx.state.market, p.itemId), 'Market item does not exist');
      assertItemNotOwned(ctx, p.itemId);
      assert(p.itemId > 0 && p.itemId <= 101, 'invalid item id');
      const price = itemPrice(p.itemId, adv.stats.cha);
      assert(adv.gold >= price, 'Not enough gold');
      deductGold(adv, price);
      if (p.equip) toEquip.push(p.itemId);
      else {
        bagAdd(ctx.bag, { id: p.itemId, xp: 0 });
        ctx.bagMutated = true;
      }
    }
    if (toEquip.length !== 0) equipItems(ctx, toEquip, true);
  }
  if (potions !== 0) {
    const cost = potionPrice(adv) * potions;
    const health = POTION_HEALTH_AMOUNT * potions;
    assert(adv.gold >= cost, 'Not enough gold');
    assert(adv.health + health < maxHealth(adv.stats) + POTION_HEALTH_AMOUNT, 'Health already full');
    deductGold(adv, cost);
    increaseHealth(adv, health);
  }
  ctx.events.push({ type: 'buy_items', potions, items: items.map((i) => ({ ...i })) });
  return finish(ctx);
}

export function selectStatUpgrades(state: GameState, stats: Partial<Stats>, rng: RandomSource): { state: GameState; events: GameEvent[] } {
  const ctx = begin(state, rng);
  const adv = ctx.adv;
  assertNotDead(adv);
  assertNotInBattle(adv);
  const s = { str: stats.str ?? 0, dex: stats.dex ?? 0, vit: stats.vit ?? 0, int: stats.int ?? 0, wis: stats.wis ?? 0, cha: stats.cha ?? 0 };
  assert(adv.statUpgrades !== 0, 'Market is closed');
  const count = s.str + s.dex + s.vit + s.int + s.wis + s.cha;
  assert(adv.statUpgrades >= count, 'insufficient stat upgrades');
  assert(adv.statUpgrades <= count, 'Must use all stats');
  assert((stats.luck ?? 0) === 0, 'Luck must be zero');
  adv.statUpgrades = 0;
  adv.stats.str += s.str;
  adv.stats.dex += s.dex;
  adv.stats.vit += s.vit;
  adv.stats.int += s.int;
  adv.stats.wis += s.wis;
  adv.stats.cha += s.cha;
  if (s.vit !== 0) applyVitalityHealthBoost(adv, s.vit);
  ctx.events.push({ type: 'stat_upgrade', stats: s });
  return finish(ctx);
}

// ---------------------------------------------------------------------------------------------
// generic dispatcher
// ---------------------------------------------------------------------------------------------

export function applyAction(state: GameState, action: Action, rng: RandomSource): { state: GameState; events: GameEvent[] } {
  switch (action.type) {
    case 'start':
      return startGame(state, action.weapon, rng);
    case 'explore':
      return explore(state, action.tillBeast, rng);
    case 'attack':
      return attack(state, action.toTheDeath, rng);
    case 'flee':
      return flee(state, action.toTheDeath, rng);
    case 'equip':
      return equip(state, action.items, rng);
    case 'drop':
      return drop(state, action.items, rng);
    case 'buy':
      return buyItems(state, action.potions, action.items, rng);
    case 'stats':
      return selectStatUpgrades(state, action.stats, rng);
  }
}

/** Effective (boosted) adventurer as the contract sees it during an action. */
export function effectiveAdventurer(state: GameState): Adventurer {
  return loadAssets(state.adventurer, state.bag);
}
