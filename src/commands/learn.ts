// Learning from the competition: read the on-chain builds of the top leaderboard games (stats, gear, gold) and turn
// them into priors for the policy. The tuner then tests these "imitation" parameters in simulation and keeps them
// only when they actually score better (top players' habits are evidence, not gospel).
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { level, loadAssets } from '../game/adventurer.ts';
import { ARMOR_SLOTS, SLOT_NAMES } from '../game/constants.ts';
import { greatness, lootInfo } from '../game/loot.ts';
import type { GameState, Stats } from '../game/types.ts';
import { loadParams, type PolicyParams } from '../ai/params.ts';
import { liveTokens, topTokens, type DenshokanToken } from '../chain/denshokan.ts';
import { openMainnet } from '../chain/mainnet.ts';
import { DataStore } from '../runner/datastore.ts';

export const INSIGHTS_PATH = 'policy/insights.json';

interface PlayerBuild {
  tokenId: string;
  player: string | null;
  xp: number;
  level: number;
  alive: boolean;
  stats: Stats;
  perLevel: Record<string, number>;
  gold: number;
  gear: Array<{ slot: string; name: string; tier: number; greatness: number }>;
  armorFilled: number;
  bagItems: number;
}

const STAT_KEYS = ['str', 'dex', 'vit', 'int', 'wis', 'cha'] as const;

function buildOf(t: DenshokanToken, s: GameState): PlayerBuild {
  const adv = s.adventurer;
  const lvl = level(adv);
  const loaded = loadAssets(adv, s.bag);
  const perLevel: Record<string, number> = {};
  for (const k of STAT_KEYS) perLevel[k] = +(adv.stats[k] / Math.max(1, lvl)).toFixed(3);
  return {
    tokenId: t.tokenId,
    player: t.playerName || null,
    xp: adv.xp,
    level: lvl,
    alive: adv.health > 0,
    stats: { ...loaded.stats },
    perLevel,
    gold: adv.gold,
    gear: [1, 2, 3, 4, 5, 6, 7, 8]
      .filter((sl) => adv.equipment[sl].id)
      .map((sl) => {
        const it = adv.equipment[sl];
        const info = lootInfo(it.id);
        return { slot: SLOT_NAMES[sl], name: info.name, tier: info.tier, greatness: greatness(it.xp) };
      }),
    armorFilled: ARMOR_SLOTS.filter((sl) => adv.equipment[sl].id).length,
    bagItems: s.bag.filter((b) => b.id).length,
  };
}

function mean(xs: number[]): number {
  return xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0;
}

/** Stat-per-level ratios of strong players, early vs late game, weighted by score. */
export function aggregate(builds: PlayerBuild[], phaseLevel: number) {
  const group = (bs: PlayerBuild[]) => {
    const w = bs.map((b) => Math.sqrt(Math.max(1, b.xp)));
    const tot = w.reduce((s, x) => s + x, 0) || 1;
    const out: Record<string, number> = {};
    for (const k of STAT_KEYS) out[k] = +(bs.reduce((s, b, i) => s + b.perLevel[k] * w[i], 0) / tot).toFixed(3);
    return { players: bs.length, ratios: out };
  };
  const early = builds.filter((b) => b.level <= phaseLevel);
  const late = builds.filter((b) => b.level > phaseLevel);
  return {
    early: group(early),
    late: group(late),
    avgLevel: +mean(builds.map((b) => b.level)).toFixed(1),
    avgArmorFilled: +mean(builds.map((b) => b.armorFilled)).toFixed(2),
    avgGearTier: +mean(builds.flatMap((b) => b.gear.map((g) => g.tier))).toFixed(2),
    jewelryShare: +mean(builds.map((b) => (b.gear.some((g) => g.slot === 'Neck' || g.slot === 'Ring') ? 1 : 0))).toFixed(2),
    weaponTypes: Object.entries(
      builds.reduce<Record<string, number>>((m, b) => {
        const w = b.gear.find((g) => g.slot === 'Weapon');
        if (w) m[w.name] = (m[w.name] ?? 0) + 1;
        return m;
      }, {}),
    )
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8),
  };
}

/** Policy parameters with the stat targets of top players (used as an extra tuner candidate). */
export function imitationParams(base: PolicyParams, agg: ReturnType<typeof aggregate>): PolicyParams {
  const p = { ...base };
  const set = (key: keyof PolicyParams, v: number | undefined) => {
    if (v !== undefined && Number.isFinite(v) && v > 0) (p as Record<string, unknown>)[key as string] = v;
  };
  if (agg.early.players >= 3) {
    set('chaRatio', agg.early.ratios.cha);
    set('dexRatio', agg.early.ratios.dex);
    set('intRatio', agg.early.ratios.int);
    set('wisRatio', agg.early.ratios.wis);
    set('strRatio', agg.early.ratios.str);
  }
  if (agg.late.players >= 3) {
    set('chaRatioLate', agg.late.ratios.cha);
    set('dexRatioLate', agg.late.ratios.dex);
    set('intRatioLate', agg.late.ratios.int);
    set('wisRatioLate', agg.late.ratios.wis);
    set('strRatioLate', agg.late.ratios.str);
  }
  p.version = `${base.version}+imitation`;
  return p;
}

export async function runLearnCommand(opts: { dataDir: string; limit: number }): Promise<void> {
  const store = new DataStore(opts.dataDir);
  const params = loadParams('policy/policy.json');
  const [top, live] = await Promise.all([topTokens(opts.limit), liveTokens(10).catch(() => [] as DenshokanToken[])]);
  const tokens = [...top, ...live.filter((l) => !top.some((t) => t.tokenId === l.tokenId))];
  const builds: PlayerBuild[] = [];
  const errors: string[] = [];
  let m: Awaited<ReturnType<typeof openMainnet>> | null = null;
  try {
    m = await openMainnet({ requireSession: false });
  } catch (e) {
    errors.push(`mainnet client: ${(e as Error).message}`);
  }
  // V2 (current lootsurvivor.io dungeons): the most advanced recently played games on the commit-reveal core
  try {
    for (const b of await v2Builds(Math.max(20, opts.limit))) builds.push(b);
  } catch (e) {
    errors.push(`v2 builds: ${(e as Error).message.slice(0, 200)}`);
  }
  if (m) {
    for (const t of tokens) {
      try {
        const s = await m.client.readState(BigInt(t.tokenId));
        if (!s.started) continue;
        builds.push(buildOf(t, s));
      } catch (e) {
        if (errors.length < 10) errors.push(`${t.tokenId}: ${(e as Error).message.slice(0, 200)}`);
      }
    }
  }
  const agg = aggregate(builds, params.phaseLevel);
  const imitation = imitationParams(params, agg);
  const insights = {
    updated: new Date().toISOString(),
    source: `top ${top.length} + ${live.length} live games (Denshokan) read on-chain`,
    players: builds.length,
    aggregate: agg,
    botTargets: {
      early: { cha: params.chaRatio, dex: params.dexRatio, int: params.intRatio, wis: params.wisRatio, str: params.strRatio },
      late: { cha: params.chaRatioLate, dex: params.dexRatioLate, int: params.intRatioLate, wis: params.wisRatioLate, str: params.strRatioLate },
    },
    imitation: STAT_KEYS.reduce<Record<string, number>>((o, k) => {
      const v = (imitation as unknown as Record<string, number>)[`${k}Ratio`];
      if (v !== undefined) o[k] = v;
      return o;
    }, {}),
    builds: builds.sort((a, b) => b.xp - a.xp),
    errors,
  };
  store.writeJson('insights.json', insights);
  if (builds.length >= 5) {
    if (!existsSync(dirname(INSIGHTS_PATH))) mkdirSync(dirname(INSIGHTS_PATH), { recursive: true });
    writeFileSync(INSIGHTS_PATH, JSON.stringify({ updated: insights.updated, players: builds.length, aggregate: agg }, null, 2) + '\n');
  }
  console.log(`learn: ${builds.length} builds analysed${errors.length ? `, ${errors.length} errors (first: ${errors[0]})` : ''}`);
  console.log(`  early ratios ${JSON.stringify(agg.early.ratios)} (${agg.early.players} players), late ${JSON.stringify(agg.late.ratios)} (${agg.late.players})`);
}

/** Builds of the deepest recent V2 games (ActionCommitted events -> replay_transcript state). */
async function v2Builds(limit: number): Promise<PlayerBuild[]> {
  const { hash, num } = await import('starknet');
  const { MAINNET } = await import('../chain/config.ts');
  const { connectProvider } = await import('../chain/rpc.ts');
  const { V2Chain } = await import('../v2/chain.ts');
  const { decodeAdventurer } = await import('../chain/state.ts');
  const { newGameState } = await import('../game/engine.ts');
  const { provider } = await connectProvider(MAINNET.rpcUrls);
  const chain = new V2Chain(provider, MAINNET.gameCoreV2);
  const latest = await chain.latestBlock();
  const counts = new Map<bigint, number>();
  let token: string | undefined;
  let pages = 0;
  do {
    const page = (await provider.getEvents({
      address: MAINNET.gameCoreV2,
      keys: [[num.toHex(hash.getSelectorFromName('ActionCommitted'))]],
      from_block: { block_number: Math.max(0, latest - 40000) },
      to_block: 'latest',
      chunk_size: 1000,
      ...(token ? { continuation_token: token } : {}),
    } as never)) as unknown as { events: Array<{ keys: string[]; data: string[] }>; continuation_token?: string };
    for (const e of page.events) {
      const id = BigInt(e.keys[1]);
      counts.set(id, (counts.get(id) ?? 0) + Number(BigInt(e.data[0] ?? '0x1')));
    }
    token = page.continuation_token;
  } while (token && ++pages < 30);
  // most packets ~ deepest runs
  const ids = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([id]) => id);
  const out: PlayerBuild[] = [];
  for (const id of ids) {
    try {
      const st = await chain.state(id);
      if (!st.adventurer) continue;
      const s = newGameState(id);
      s.adventurer = decodeAdventurer(st.adventurer);
      s.bag = st.bag.map((b) => ({ id: b.id, xp: b.xp }));
      s.started = true;
      out.push(buildOf({ tokenId: id.toString(), playerName: `v2 settings #${await chain.settingsId(id).catch(() => '?')}` } as DenshokanToken, s));
    } catch {
      // skip games whose transcript cannot be rebuilt
    }
  }
  return out;
}
