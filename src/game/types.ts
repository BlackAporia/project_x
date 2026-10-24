export interface Item {
  id: number;
  xp: number;
}

export interface Stats {
  str: number;
  dex: number;
  vit: number;
  int: number;
  wis: number;
  cha: number;
  luck: number;
}

/**
 * Mirrors the Cairo `Adventurer` struct. `equipment` is indexed by slot id (1..8, index 0 unused).
 * Stats are "stored" stats (without item boosts) unless a value comes from `loadAssets`.
 */
export interface Adventurer {
  health: number;
  xp: number;
  gold: number;
  beastHealth: number;
  statUpgrades: number;
  stats: Stats;
  equipment: Item[];
  itemSpecialsSeed: number;
  actionCount: number;
}

export interface SpecialPowers {
  special1: number; // item suffix ("of Power" ...), 0 if locked
  special2: number; // name prefix ("Agony" ...)
  special3: number; // name suffix ("Bane" ...)
}

export interface CombatSpec {
  tier: number; // 0 none, 1..5
  type: number; // TYPE
  level: number;
  specials: SpecialPowers;
}

export interface Beast {
  id: number;
  startingHealth: number;
  spec: CombatSpec;
}

export interface Obstacle {
  id: number;
  spec: CombatSpec;
}

export interface Settings {
  statsMode: 'Dodge' | 'Reduction';
  baseDamageReduction: number;
  marketSize: number;
  inBattle: boolean;
  gameSeed: bigint;
  gameSeedUntilXp: number;
  /** dungeon preset: start from this stored adventurer instead of a fresh one (used when its xp > 0) */
  startAdventurer?: Adventurer;
  startBag?: Item[];
  /** V2 rules (lootsurvivor.io commit-reveal / client games): no starter-beast fight after start_game */
  noStarterBeast?: boolean;
  /** client-only (practice) games: item specials and the greatness-20 stat point never unlock */
  noItemSpecials?: boolean;
  /** V2 mainnet market: per-item density 0..32 (item on sale with probability density/32 at each level) */
  marketDensities?: number[];
  /** V2: random stat points added to the start template */
  randomStartingStats?: number;
}

/** A purchase request for buy_items. */
export interface ItemPurchase {
  itemId: number;
  equip: boolean;
}

export type GameEvent =
  | { type: 'beast'; beast: Beast; collectable?: boolean }
  | { type: 'ambush'; damage: number; slot: number; critical: boolean }
  | { type: 'obstacle'; obstacleId: number; level: number; dodged: boolean; damage: number; slot: number; critical: boolean; xp: number }
  | { type: 'discovery'; kind: 'Gold' | 'Health' | 'Loot'; amount: number; xp: number; convertedToGold?: number }
  | { type: 'attack'; damage: number; critical: boolean }
  | { type: 'beast_attack'; damage: number; slot: number; critical: boolean }
  | { type: 'defeated_beast'; beastId: number; gold: number; xp: number }
  | { type: 'flee'; success: boolean }
  | { type: 'fled_beast'; beastId: number; xp: number }
  | { type: 'level_up'; level: number }
  | { type: 'market'; items: number[] }
  | { type: 'stat_upgrade'; stats: Partial<Stats> }
  | { type: 'buy_items'; potions: number; items: ItemPurchase[] }
  | { type: 'equip'; items: number[] }
  | { type: 'drop'; items: number[] }
  | { type: 'item_level_up'; itemId: number; from: number; to: number; suffix: boolean; prefix: boolean }
  | { type: 'starting_stats'; stats: Stats }
  | { type: 'death'; cause: 'beast' | 'obstacle' | 'ambush' };

export type Action =
  | { type: 'start'; weapon: number }
  | { type: 'explore'; tillBeast: boolean }
  | { type: 'attack'; toTheDeath: boolean }
  | { type: 'flee'; toTheDeath: boolean }
  | { type: 'equip'; items: number[] }
  | { type: 'drop'; items: number[] }
  | { type: 'buy'; potions: number; items: ItemPurchase[] }
  | { type: 'stats'; stats: Partial<Stats> };

/** Full engine state of one game. */
export interface GameState {
  adventurerId: bigint;
  adventurer: Adventurer;
  bag: Item[];
  marketSeed: bigint;
  beastSeed: bigint;
  market: number[];
  /** Beast currently being fought (null when not in battle). */
  beast: Beast | null;
  settings: Settings;
  started: boolean;
}
