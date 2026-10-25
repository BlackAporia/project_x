// Loot Survivor V2 (commit-reveal) protocol, ported from the lootsurvivor.io client:
//   - actions are 16-bit instruction words, up to 15 per packet (felt252), committed with commit_actions
//   - the chain keeps a rolling commitment: poseidon(gameId) then poseidon(prev, packet, commitBlock)
//   - outcomes use the hash of block (commitBlock + entropy offset), unknown when committing
//   - state is a packed adventurer felt and a packed bag felt (replay_transcript / settlement)
import { poseidonSmall } from '@scure/starknet';
import { poseidon } from '../game/rng.ts';
import type { Action, Beast } from '../game/types.ts';
import { TYPE } from '../game/constants.ts';

export const OP = { EXPLORE: 1, ATTACK: 2, FLEE: 3, UPGRADE_STAT: 4, BUY_ITEM: 5, EQUIP_ITEM: 6, DROP_ITEM: 7, SURRENDER: 8, BUY_POTIONS: 9 } as const;
export const BEAST_DEATH = { ALLOW_KILL: 0, STOP_BEFORE_GUARANTEED_KILL: 1, STOP_BEFORE_POSSIBLE_KILL: 2 } as const;
export const STAT_ID = { str: 0, dex: 1, vit: 2, int: 3, wis: 4, cha: 5 } as const;

const WORD_BITS = 16n;
const MAX_INSTRUCTIONS = 15;
const COUNT_SHIFT = 240n;
const VERSION_SHIFT = 244n;
const RESERVED_SHIFT = 248n;

export type Instruction =
  | { type: 'explore'; tillDamage: number; tillGold: boolean }
  | { type: 'attack'; tillHealth: number; beastDeathPolicy: number }
  | { type: 'flee'; tillHealth: number }
  | { type: 'upgrade_stat'; statId: number; amount: number }
  | { type: 'buy_item'; itemId: number; equip: boolean }
  | { type: 'equip_item'; itemId: number }
  | { type: 'drop_item'; itemId: number }
  | { type: 'surrender' }
  | { type: 'buy_potions'; quantity: number };

function range(v: number, lo: number, hi: number, what: string): void {
  if (!Number.isInteger(v) || v < lo || v > hi) throw new Error(`${what} must be in [${lo}, ${hi}]`);
}

export function encodeInstruction(i: Instruction): number {
  switch (i.type) {
    case 'explore':
      range(i.tillDamage, 0, 2047, 'tillDamage');
      return OP.EXPLORE | (i.tillDamage << 4) | (i.tillGold ? 32768 : 0);
    case 'attack':
      range(i.tillHealth, 0, 1023, 'tillHealth');
      range(i.beastDeathPolicy, 0, 2, 'beastDeathPolicy');
      return OP.ATTACK | (i.tillHealth << 4) | (i.beastDeathPolicy << 14);
    case 'flee':
      range(i.tillHealth, 0, 1023, 'tillHealth');
      return OP.FLEE | (i.tillHealth << 4);
    case 'upgrade_stat':
      range(i.statId, 0, 5, 'statId');
      range(i.amount, 1, 15, 'amount');
      return OP.UPGRADE_STAT | (i.statId << 4) | (i.amount << 7);
    case 'buy_item':
      range(i.itemId, 1, 101, 'itemId');
      return OP.BUY_ITEM | (i.itemId << 4) | (i.equip ? 2048 : 0);
    case 'equip_item':
      range(i.itemId, 1, 101, 'itemId');
      return OP.EQUIP_ITEM | (i.itemId << 4);
    case 'drop_item':
      range(i.itemId, 1, 101, 'itemId');
      return OP.DROP_ITEM | (i.itemId << 4);
    case 'surrender':
      return OP.SURRENDER;
    case 'buy_potions':
      range(i.quantity, 1, 255, 'quantity');
      return OP.BUY_POTIONS | (i.quantity << 4);
  }
}

export function decodeInstruction(w: number): Instruction {
  const op = w & 15;
  switch (op) {
    case OP.EXPLORE:
      return { type: 'explore', tillDamage: (w >>> 4) & 2047, tillGold: (w & 32768) !== 0 };
    case OP.ATTACK:
      return { type: 'attack', tillHealth: (w >>> 4) & 1023, beastDeathPolicy: w >>> 14 };
    case OP.FLEE:
      return { type: 'flee', tillHealth: (w >>> 4) & 1023 };
    case OP.UPGRADE_STAT:
      return { type: 'upgrade_stat', statId: (w >>> 4) & 7, amount: (w >>> 7) & 15 };
    case OP.BUY_ITEM:
      return { type: 'buy_item', itemId: (w >>> 4) & 127, equip: (w & 2048) !== 0 };
    case OP.EQUIP_ITEM:
      return { type: 'equip_item', itemId: (w >>> 4) & 127 };
    case OP.DROP_ITEM:
      return { type: 'drop_item', itemId: (w >>> 4) & 127 };
    case OP.SURRENDER:
      return { type: 'surrender' };
    case OP.BUY_POTIONS:
      return { type: 'buy_potions', quantity: (w >>> 4) & 255 };
    default:
      throw new Error(`unknown opcode ${op}`);
  }
}

export function encodePacket(ins: Instruction[]): bigint {
  if (ins.length < 1 || ins.length > MAX_INSTRUCTIONS) throw new Error('instruction count must be in [1, 15]');
  let p = 0n;
  ins.forEach((i, k) => {
    p |= BigInt(encodeInstruction(i)) << (BigInt(k) * WORD_BITS);
  });
  return p | (BigInt(ins.length - 1) << COUNT_SHIFT);
}

export function decodePacket(p: bigint): Instruction[] {
  if (p >> RESERVED_SHIFT !== 0n) throw new Error('packet reserved bits set');
  if (((p >> VERSION_SHIFT) & 15n) !== 0n) throw new Error('unsupported packet version');
  const n = Number((p >> COUNT_SHIFT) & 15n) + 1;
  const out: Instruction[] = [];
  for (let k = 0; k < n; k++) out.push(decodeInstruction(Number((p >> (BigInt(k) * WORD_BITS)) & 65535n)));
  return out;
}

export const rollingStart = (gameId: bigint): bigint => poseidon([gameId]);
export const rollingFold = (prev: bigint, packet: bigint, commitBlock: bigint): bigint => poseidon([prev, packet, commitBlock]);

// ------------------------------------------------------------------------------------- packed state

export interface V2Item {
  id: number;
  xp: number;
}

export interface V2Adventurer {
  health: number;
  xp: number;
  gold: number;
  beast_health: number;
  stat_upgrades_available: number;
  stats: { strength: number; dexterity: number; vitality: number; intelligence: number; wisdom: number; charisma: number; luck: number };
  equipment: { weapon: V2Item; chest: V2Item; head: V2Item; waist: V2Item; foot: V2Item; hand: V2Item; neck: V2Item; ring: V2Item };
  item_specials_salt: number;
  beast_salt: number;
  level_salt: number;
}

const item16 = (v: bigint): V2Item => ({ id: Number(v & 127n), xp: Number(v >> 7n) });

export function unpackAdventurer(packed: bigint): V2Adventurer {
  let low = packed & ((1n << 128n) - 1n);
  const items: V2Item[] = [];
  for (let k = 0; k < 8; k++) {
    items.push(item16(low & 65535n));
    low >>= 16n;
  }
  let hi = packed >> 128n;
  const take = (bits: bigint) => {
    const v = Number(hi & ((1n << bits) - 1n));
    hi >>= bits;
    return v;
  };
  const health = take(10n);
  const xp = take(15n);
  const gold = take(9n);
  const beast_health = take(10n);
  const stat_upgrades_available = take(4n);
  const stats = { strength: take(5n), dexterity: take(5n), vitality: take(5n), intelligence: take(5n), wisdom: take(5n), charisma: take(5n), luck: 0 };
  return {
    health,
    xp,
    gold,
    beast_health,
    stat_upgrades_available,
    stats,
    equipment: { weapon: items[0], chest: items[1], head: items[2], waist: items[3], foot: items[4], hand: items[5], neck: items[6], ring: items[7] },
    item_specials_salt: take(14n),
    beast_salt: take(17n),
    level_salt: take(14n),
  };
}

export function unpackBag(packed: bigint): V2Item[] {
  const out: V2Item[] = [];
  let v = packed;
  for (let k = 0; k < 15; k++) {
    out.push(item16(v & 65535n));
    v >>= 16n;
  }
  return out;
}

const levelOf = (xp: number) => (xp === 0 ? 1 : Math.floor(Math.sqrt(xp)));

/**
 * Beast tier and type on the V2 core. The id is derived like the client does (rnd1 % 75 + 1), but the chain maps it
 * differently from the V1 table (blocks of five per tier): tier cycles with the id and the type changes every five
 * ids. Measured on real games (kill XP and every beast hit of 13 games, 50/50 encounters):
 *   tier = (id - 1) % 5 + 1,  type = floor((id - 1) / 5) % 3  (Magic/Cloth, Blade/Hide, Bludgeon/Metal)
 */
export function v2BeastTier(id: number): number {
  return ((id - 1) % 5) + 1;
}

export function v2BeastType(id: number): number {
  return [TYPE.MagicCloth, TYPE.BladeHide, TYPE.BludgeonMetal][Math.floor((id - 1) / 5) % 3];
}

/** Current beast of an adventurer in battle: id, level and health as the client derives them (In(xp, Pn(beast_salt, gameId, xp))), tier and type as the V2 core maps the id. */
export function currentBeastV2(adv: V2Adventurer, gameId: bigint): Beast | null {
  if (adv.beast_health <= 0) return null;
  const seed = poseidon([BigInt(adv.beast_salt), gameId, BigInt(adv.xp)]) % (1n << 64n);
  const h = poseidon([BigInt(adv.xp), seed]) & ((1n << 128n) - 1n);
  const hi64 = h / (1n << 64n);
  const lo64 = h % (1n << 64n);
  const rnd1 = hi64 / (1n << 32n); // u32
  const r2 = lo64 / (1n << 32n);
  const r3 = lo64 % (1n << 32n);
  const rnd3 = r2 / 65536n; // u16
  const rnd4 = r2 % 65536n; // u16
  const rnd5 = r3 / 65536n / 256n; // u8
  const rnd6 = (r3 / 65536n) % 256n; // u8
  const L = BigInt(levelOf(adv.xp));
  const id = Number((rnd1 % 75n) + 1n);
  let level = 1n + (rnd4 % (L * 3n));
  level += L >= 50n ? 80n : L >= 40n ? 40n : L >= 30n ? 20n : L >= 20n ? 10n : 0n;
  const lvl = Number(level);
  let hp = 1n + (rnd3 % (L * 20n));
  hp += L >= 50n ? 500n : L >= 40n ? 400n : L >= 30n ? 200n : L >= 20n ? 100n : 10n;
  return {
    id,
    startingHealth: Number(hp > 1023n ? 1023n : hp),
    spec: {
      tier: v2BeastTier(id),
      type: v2BeastType(id),
      level: lvl,
      specials: {
        special1: 0,
        special2: lvl >= 19 ? 1 + Number(rnd5 % 69n) : 0,
        special3: lvl >= 19 ? 1 + Number(rnd6 % 18n) : 0,
      },
    },
  };
}

// ------------------------------------------------------------------------------------- engine actions

const SINGLE_ROUND = 1023;

/** One engine decision -> instruction list (stats, market, equip/drop, then at most one primary action). */
export function actionsToInstructions(actions: Action[]): Instruction[] {
  const out: Instruction[] = [];
  for (const a of actions) {
    switch (a.type) {
      case 'start':
        break; // V2 games start implicitly from the settings template
      case 'stats':
        for (const [k, id] of Object.entries(STAT_ID)) {
          const n = (a.stats as Record<string, number | undefined>)[k] ?? 0;
          if (n > 0) out.push({ type: 'upgrade_stat', statId: id, amount: n });
        }
        break;
      case 'buy':
        for (const p of a.items) out.push({ type: 'buy_item', itemId: p.itemId, equip: p.equip });
        if (a.potions > 0) out.push({ type: 'buy_potions', quantity: a.potions });
        break;
      case 'equip':
        for (const id of a.items) out.push({ type: 'equip_item', itemId: id });
        break;
      case 'drop':
        for (const id of a.items) out.push({ type: 'drop_item', itemId: id });
        break;
      case 'explore':
        out.push({ type: 'explore', tillDamage: a.tillBeast ? 1 : 0, tillGold: false });
        break;
      case 'attack':
        out.push({ type: 'attack', tillHealth: a.toTheDeath ? 0 : SINGLE_ROUND, beastDeathPolicy: BEAST_DEATH.ALLOW_KILL });
        break;
      case 'flee':
        out.push({ type: 'flee', tillHealth: a.toTheDeath ? 0 : SINGLE_ROUND });
        break;
    }
  }
  return out;
}

const PRIMARY = new Set(['explore', 'attack', 'flee', 'surrender']);

/** Split instructions into packets: a packet ends after its first primary (random) instruction or at 15. */
export function packetize(ins: Instruction[]): bigint[] {
  const packets: bigint[] = [];
  let cur: Instruction[] = [];
  for (const i of ins) {
    cur.push(i);
    if (PRIMARY.has(i.type) || cur.length === MAX_INSTRUCTIONS) {
      packets.push(encodePacket(cur));
      cur = [];
    }
  }
  if (cur.length) packets.push(encodePacket(cur));
  return packets;
}

// ------------------------------------------------------------------------------------- market (V2)

const ITEM_MASK = (1n << 101n) - 1n;
const MARKET_DOMAIN = 84942948877652n;

export interface MarketConfig {
  pair01: string | bigint;
  pair23: string | bigint;
  pair4_enabled: string | bigint;
}

/** Six 101-bit planes: five density bits (32 - density) and the enabled mask. */
export function marketPlanes(cfg: MarketConfig): bigint[] {
  return [cfg.pair01, cfg.pair23, cfg.pair4_enabled].map((x) => BigInt(x)).flatMap((v) => [v & ITEM_MASK, (v >> 101n) & ITEM_MASK]);
}

export function marketDensities(cfg: MarketConfig): number[] {
  const p = marketPlanes(cfg);
  return Array.from({ length: 101 }, (_, i) => {
    const bit = 1n << BigInt(i);
    if (!(p[5] & bit)) return 0;
    let d = 0;
    for (let k = 0; k < 5; k++) if (p[k] & bit) d |= 1 << k;
    return 32 - d;
  });
}

/** Items on sale at a level (client j_): each item appears with probability density/32, seeded by level_salt. */
export function marketItemsV2(levelSalt: number, gameId: bigint, cfg: MarketConfig): number[] {
  const p = marketPlanes(cfg);
  const [i2, a2, o2] = poseidonSmall([BigInt(levelSalt), gameId, MARKET_DOMAIN]);
  const s2 = [o2, a2 >> 128n, a2, i2 >> 128n, i2];
  let c = ITEM_MASK;
  for (let k = 0; k < 5; k++) c = (s2[k] & ~p[k]) | ((s2[k] | ~p[k]) & c);
  const mask = c & p[5];
  const out: number[] = [];
  for (let id = 1; id <= 101; id++) if (mask & (1n << BigInt(id - 1))) out.push(id);
  return out;
}
