// Decoding of on-chain structs (as parsed by starknet.js from the contract ABI) into engine state.
// Field lookups are tolerant (several candidate names) so small ABI changes between deployments do not break the bot.
import { SLOT } from '../game/constants.ts';
import { removeBoosts } from '../game/adventurer.ts';
import { beastTier, beastType } from '../game/beast.ts';
import { defaultSettings, newGameState } from '../game/engine.ts';
import type { Adventurer, Beast, GameState, Item, Settings, Stats } from '../game/types.ts';

type Obj = Record<string, unknown>;

export function toBig(v: unknown): bigint {
  if (typeof v === 'bigint') return v;
  if (typeof v === 'number') return BigInt(Math.trunc(v));
  if (typeof v === 'boolean') return v ? 1n : 0n;
  if (typeof v === 'string') return v === '' ? 0n : BigInt(v);
  if (v && typeof v === 'object') {
    const o = v as Obj;
    // u256 {low, high}
    if ('low' in o && 'high' in o) return toBig(o.low) + (toBig(o.high) << 128n);
    // CairoOption / CairoCustomEnum style
    if (typeof (o as { unwrap?: unknown }).unwrap === 'function') return toBig((o as { unwrap: () => unknown }).unwrap());
  }
  return 0n;
}

export const toNum = (v: unknown): number => Number(toBig(v));

export function pick(o: unknown, names: string[], fallback?: unknown): unknown {
  if (!o || typeof o !== 'object') return fallback;
  const obj = o as Obj;
  for (const n of names) if (n in obj && obj[n] !== undefined) return obj[n];
  return fallback;
}

export function enumVariant(v: unknown): string {
  if (v && typeof v === 'object') {
    const o = v as { activeVariant?: () => string; variant?: Obj };
    if (typeof o.activeVariant === 'function') return o.activeVariant();
    if (o.variant) for (const [k, val] of Object.entries(o.variant)) if (val !== undefined) return k;
  }
  if (typeof v === 'string') return v;
  return String(toNum(v));
}

function decodeItem(v: unknown): Item {
  return { id: toNum(pick(v, ['id'], 0)), xp: toNum(pick(v, ['xp'], 0)) };
}

export function decodeStats(v: unknown): Stats {
  return {
    str: toNum(pick(v, ['strength', 'str'], 0)),
    dex: toNum(pick(v, ['dexterity', 'dex'], 0)),
    vit: toNum(pick(v, ['vitality', 'vit'], 0)),
    int: toNum(pick(v, ['intelligence', 'int'], 0)),
    wis: toNum(pick(v, ['wisdom', 'wis'], 0)),
    cha: toNum(pick(v, ['charisma', 'cha'], 0)),
    luck: toNum(pick(v, ['luck'], 0)),
  };
}

export function encodeStats(s: Partial<Stats>): Record<string, number> {
  return {
    strength: s.str ?? 0,
    dexterity: s.dex ?? 0,
    vitality: s.vit ?? 0,
    intelligence: s.int ?? 0,
    wisdom: s.wis ?? 0,
    charisma: s.cha ?? 0,
    luck: s.luck ?? 0,
  };
}

const EQUIP_FIELDS: Array<[number, string]> = [
  [SLOT.Weapon, 'weapon'],
  [SLOT.Chest, 'chest'],
  [SLOT.Head, 'head'],
  [SLOT.Waist, 'waist'],
  [SLOT.Foot, 'foot'],
  [SLOT.Hand, 'hand'],
  [SLOT.Neck, 'neck'],
  [SLOT.Ring, 'ring'],
];

export function decodeAdventurer(v: unknown): Adventurer {
  const eq = pick(v, ['equipment'], {});
  const equipment: Item[] = [];
  for (let i = 0; i <= 8; i++) equipment.push({ id: 0, xp: 0 });
  for (const [slot, name] of EQUIP_FIELDS) equipment[slot] = decodeItem(pick(eq, [name], {}));
  return {
    health: toNum(pick(v, ['health'], 0)),
    xp: toNum(pick(v, ['xp'], 0)),
    gold: toNum(pick(v, ['gold'], 0)),
    beastHealth: toNum(pick(v, ['beast_health', 'beastHealth'], 0)),
    statUpgrades: toNum(pick(v, ['stat_upgrades_available', 'stat_upgrades', 'statUpgrades'], 0)),
    stats: decodeStats(pick(v, ['stats'], {})),
    equipment,
    itemSpecialsSeed: toNum(pick(v, ['item_specials_seed', 'itemSpecialsSeed'], 0)),
    actionCount: toNum(pick(v, ['action_count', 'actionCount'], 0)),
  };
}

export function decodeBag(v: unknown): Item[] {
  const bag: Item[] = [];
  for (let i = 1; i <= 15; i++) bag.push(decodeItem(pick(v, [`item_${i}`], {})));
  return bag;
}

export function decodeSettings(v: unknown): Settings {
  const d = defaultSettings();
  if (!v) return d;
  const mode = enumVariant(pick(v, ['stats_mode', 'statsMode'], 'Dodge'));
  return {
    statsMode: mode === 'Reduction' || mode === '1' ? 'Reduction' : 'Dodge',
    baseDamageReduction: toNum(pick(v, ['base_damage_reduction'], d.baseDamageReduction)),
    marketSize: toNum(pick(v, ['market_size'], d.marketSize)) || d.marketSize,
    inBattle: Boolean(pick(v, ['in_battle'], false)),
    gameSeed: toBig(pick(v, ['game_seed'], 0n)),
    gameSeedUntilXp: toNum(pick(v, ['game_seed_until_xp'], 0)),
  };
}

export function decodeBeast(v: unknown): Beast | null {
  const id = toNum(pick(v, ['id'], 0));
  if (!id) return null;
  const specials = pick(v, ['specials'], {});
  return {
    id,
    startingHealth: toNum(pick(v, ['health', 'starting_health'], 0)),
    spec: {
      tier: beastTier(id),
      type: beastType(id),
      level: toNum(pick(v, ['level'], 1)),
      specials: {
        special1: toNum(pick(specials, ['special1'], 0)),
        special2: toNum(pick(specials, ['special2'], 0)),
        special3: toNum(pick(specials, ['special3'], 0)),
      },
    },
  };
}

export interface ChainSnapshot {
  /** get_game_state() result (adventurer has item boosts applied) */
  gameState?: unknown;
  /** raw stored adventurer (adventurer_systems.get_adventurer) — preferred over gameState.adventurer */
  adventurer?: unknown;
  bag?: unknown;
  settings?: unknown;
  entropy?: unknown;
}

/** Build the engine state for one game from whatever on-chain views were available. */
export function toEngineState(adventurerId: bigint, snap: ChainSnapshot): GameState {
  const settings = decodeSettings(snap.settings);
  const s = newGameState(adventurerId, settings);
  const bag = decodeBag(snap.bag ?? pick(snap.gameState, ['bag'], {}));
  let adv: Adventurer;
  if (snap.adventurer) adv = decodeAdventurer(snap.adventurer);
  else adv = removeBoosts(decodeAdventurer(pick(snap.gameState, ['adventurer'], {})), bag);
  adv.stats.luck = 0; // luck is derived from jewelry, never stored
  s.adventurer = adv;
  s.bag = bag;
  s.marketSeed = toBig(pick(snap.entropy, ['market_seed'], 0n));
  s.beastSeed = toBig(pick(snap.entropy, ['beast_seed'], 0n));
  const market = pick(snap.gameState, ['market'], []);
  s.market = Array.isArray(market) ? market.map(toNum) : [];
  s.started = adv.equipment[SLOT.Weapon].id !== 0;
  if (adv.beastHealth > 0 && adv.health > 0) s.beast = decodeBeast(pick(snap.gameState, ['beast'], {}));
  return s;
}
