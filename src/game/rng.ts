// Randomness used by the game, mirrored from ImplAdventurer::get_randomness / get_battle_randomness,
// ImplMarket::get_available_items and ImplStats::generate_starting_stats.
//
// Two interchangeable sources:
//  - ExactRandom: bit-exact Poseidon-based values. With the Katana practice dungeon the action seed is
//    poseidon(xp, adventurer_id), so every outcome is computable before sending the transaction.
//  - FastRandom: statistically identical uniform values from a PRNG, used for Monte Carlo simulation
//    (and for mainnet planning, where the action seed comes from Cartridge VRF and is unknowable).
import { poseidonHashMany } from '@scure/starknet';
import type { Stats } from './types.ts';

export interface Randomness {
  /** rnd1_u32 */ r32a: number;
  /** rnd2_u32 */ r32b: number;
  /** rnd1_u16 */ r16a: number;
  /** rnd2_u16 */ r16b: number;
  /** rnd1_u8 */ r8a: number;
  /** rnd2_u8 */ r8b: number;
  /** rnd3_u8 */ r8c: number;
  /** rnd4_u8 */ r8d: number;
}

export type BattleRandomness = [number, number, number, number];

/** What `_get_random_seed` needs to know about the current action. */
export interface SeedContext {
  adventurerId: bigint;
  xp: number;
  actionCount: number;
  inBattle: boolean;
  gameSeed: bigint;
  gameSeedUntilXp: number;
}

export interface RandomSource {
  readonly exact: boolean;
  /** `_get_random_seed`: returns (u64, u64) = felt_to_two_u64(seed). */
  actionSeed(ctx: SeedContext): [bigint, bigint];
  randomness(xp: number, seed: bigint): Randomness;
  battle(xp: number, count: number, seed: bigint): BattleRandomness;
  market(adventurerId: bigint, seed: bigint, size: number): number[];
  startingStats(seed: bigint): Stats;
}

const MASK_128 = (1n << 128n) - 1n;
const MASK_64 = (1n << 64n) - 1n;
const MASK_32 = (1n << 32n) - 1n;

export function poseidon(values: bigint[]): bigint {
  return poseidonHashMany(values);
}

export function feltToTwoU64(value: bigint): [bigint, bigint] {
  const low = value & MASK_128;
  return [low >> 64n, low & MASK_64];
}

export function simpleEntropy(xp: number, seed: bigint): bigint {
  return poseidon([BigInt(xp), seed]);
}

export function battleEntropy(xp: number, seed: bigint, actionCount: number): bigint {
  return poseidon([BigInt(xp), seed, BigInt(actionCount)]);
}

export function splitRandomness(hash: bigint): Randomness {
  const [rnd1u64, rnd2u64] = feltToTwoU64(hash);
  const r32a = Number(rnd1u64 >> 32n);
  const r32b = Number(rnd1u64 & MASK_32);
  const r32c = Number(rnd2u64 >> 32n);
  const r32d = Number(rnd2u64 & MASK_32);
  const r16a = r32c >>> 16;
  const r16b = r32c & 0xffff;
  const r16c = r32d >>> 16;
  const r16d = r32d & 0xffff;
  return { r32a, r32b, r16a, r16b, r8a: r16c >>> 8, r8b: r16c & 0xff, r8c: r16d >>> 8, r8d: r16d & 0xff };
}

export function splitBattle(hash: bigint): BattleRandomness {
  const v = Number(hash & MASK_32);
  const hi = v >>> 16;
  const lo = v & 0xffff;
  return [hi >>> 8, hi & 0xff, lo >>> 8, lo & 0xff];
}

/** ImplMarket::get_available_items — rejection sampling over the bytes of poseidon(adventurer_id, seed). */
export function marketFromHash(hash: bigint, size: number): number[] {
  const items: number[] = [];
  let remaining = hash;
  for (let pass = 0; pass < 31 && items.length < size; pass++) {
    const byte = Number(remaining & 0xffn);
    remaining >>= 8n;
    if (byte < 202) items.push((byte % 101) + 1);
  }
  return items;
}

/** ImplStats::generate_starting_stats — 12 points, each picked by successive divmod 6 of the seed. */
export function startingStatsFromSeed(seed: bigint): Stats {
  const stats: Stats = { str: 0, dex: 0, vit: 0, int: 0, wis: 0, cha: 0, luck: 0 };
  let entropy = seed;
  for (let i = 0; i < 12; i++) {
    const stat = Number(entropy % 6n);
    entropy /= 6n;
    applyStatIndex(stats, stat);
  }
  return stats;
}

export function applyStatIndex(stats: Stats, stat: number): void {
  switch (stat) {
    case 0: stats.str += 1; break;
    case 1: stats.dex += 1; break;
    case 2: stats.vit += 1; break;
    case 3: stats.int += 1; break;
    case 4: stats.wis += 1; break;
    case 5: stats.cha += 1; break;
    default: throw new Error('stat out of range');
  }
}

/**
 * Bit-exact randomness. `vrf` controls `_get_random_seed`:
 *  - 'katana': seed = poseidon(xp, adventurer_id) (practice dungeon, no VRF)
 *  - a supplied (u64,u64) pair for each call via `override` (used when replaying a known VRF value)
 */
export class ExactRandom implements RandomSource {
  readonly exact = true;
  private override: [bigint, bigint] | null = null;

  /** Use a known action seed for the next actionSeed() call (e.g. a revealed VRF value). */
  setNextSeed(seed: [bigint, bigint] | null): void {
    this.override = seed;
  }

  actionSeed(ctx: SeedContext): [bigint, bigint] {
    if (this.override) {
      const s = this.override;
      this.override = null;
      return s;
    }
    let felt: bigint;
    if (ctx.gameSeed !== 0n && (ctx.gameSeedUntilXp === 0 || ctx.gameSeedUntilXp > ctx.xp)) {
      felt = simpleEntropy(ctx.xp, ctx.gameSeed);
    } else {
      felt = simpleEntropy(ctx.xp, ctx.adventurerId);
    }
    return feltToTwoU64(felt);
  }

  randomness(xp: number, seed: bigint): Randomness {
    return splitRandomness(poseidon([BigInt(xp), seed]));
  }

  battle(xp: number, count: number, seed: bigint): BattleRandomness {
    return splitBattle(poseidon([BigInt(xp), seed, BigInt(count)]));
  }

  market(adventurerId: bigint, seed: bigint, size: number): number[] {
    return marketFromHash(poseidon([adventurerId, seed]), size);
  }

  startingStats(seed: bigint): Stats {
    return startingStatsFromSeed(seed);
  }
}

/** xoshiro128** — fast, good-quality 32-bit PRNG for Monte Carlo. */
export class Xoshiro128 {
  private a: number;
  private b: number;
  private c: number;
  private d: number;

  constructor(seed: number) {
    // splitmix32 to expand the seed
    let s = seed >>> 0;
    const next = () => {
      s = (s + 0x9e3779b9) >>> 0;
      let z = s;
      z = Math.imul(z ^ (z >>> 16), 0x85ebca6b) >>> 0;
      z = Math.imul(z ^ (z >>> 13), 0xc2b2ae35) >>> 0;
      return (z ^ (z >>> 16)) >>> 0;
    };
    this.a = next();
    this.b = next();
    this.c = next();
    this.d = next();
    if ((this.a | this.b | this.c | this.d) === 0) this.a = 1;
  }

  nextU32(): number {
    const result = Math.imul(rotl(Math.imul(this.b, 5) >>> 0, 7), 9) >>> 0;
    const t = (this.b << 9) >>> 0;
    this.c ^= this.a;
    this.d ^= this.b;
    this.b ^= this.c;
    this.a ^= this.d;
    this.c ^= t;
    this.d = rotl(this.d, 11);
    return result;
  }

  /** Uniform float in [0, 1). */
  next(): number {
    return this.nextU32() / 4294967296;
  }

  /** Uniform integer in [0, n). */
  int(n: number): number {
    return Math.floor(this.next() * n);
  }
}

function rotl(x: number, k: number): number {
  return ((x << k) | (x >>> (32 - k))) >>> 0;
}

const ZERO_SEED: [bigint, bigint] = [0n, 0n];

/** Statistically equivalent randomness for simulation (ignores seeds). */
export class FastRandom implements RandomSource {
  readonly exact = false;
  readonly prng: Xoshiro128;

  constructor(seed: number) {
    this.prng = new Xoshiro128(seed);
  }

  actionSeed(_ctx: SeedContext): [bigint, bigint] {
    return ZERO_SEED;
  }

  randomness(_xp: number, _seed: bigint): Randomness {
    const p = this.prng;
    const a = p.nextU32();
    const b = p.nextU32();
    const c = p.nextU32();
    const d = p.nextU32();
    return {
      r32a: a,
      r32b: b,
      r16a: c >>> 16,
      r16b: c & 0xffff,
      r8a: d >>> 24,
      r8b: (d >>> 16) & 0xff,
      r8c: (d >>> 8) & 0xff,
      r8d: d & 0xff,
    };
  }

  battle(_xp: number, _count: number, _seed: bigint): BattleRandomness {
    const v = this.prng.nextU32();
    return [v >>> 24, (v >>> 16) & 0xff, (v >>> 8) & 0xff, v & 0xff];
  }

  market(_adventurerId: bigint, _seed: bigint, size: number): number[] {
    const items: number[] = [];
    for (let pass = 0; pass < 31 && items.length < size; pass++) {
      const byte = this.prng.nextU32() & 0xff;
      if (byte < 202) items.push((byte % 101) + 1);
    }
    return items;
  }

  startingStats(_seed: bigint): Stats {
    const stats: Stats = { str: 0, dex: 0, vit: 0, int: 0, wis: 0, cha: 0, luck: 0 };
    for (let i = 0; i < 12; i++) applyStatIndex(stats, this.prng.int(6));
    return stats;
  }

  /** Random u16 (used for item specials seeds). */
  u16(): number {
    return this.prng.nextU32() & 0xffff;
  }
}
