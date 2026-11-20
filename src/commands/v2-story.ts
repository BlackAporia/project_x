// `v2-story`: the story of one V2 game, packet by packet, from the chain (replay_transcript with committed_len = k
// gives the state after each packet). For each packet: what the player did (decoded instructions) and what changed
// (level, XP, HP, gold, gear, beast met / slain, death). Also the starting gear (the core's start override, e.g. the
// Loot bag of a Loot Dungeon run). Writes data/story/<game id>.json; used for write-ups and videos of a run.
//   v2-story --game <id> [--core 0x..]   (default core: Beast Mode, where Loot Dungeon runs live)
import { MAINNET } from '../chain/config.ts';
import { connectProvider } from '../chain/rpc.ts';
import { level, maxHealth } from '../game/adventurer.ts';
import { beastName } from '../game/beast.ts';
import { ITEM_ROWS } from '../game/data.ts';
import { dungeonEngineSettings, loadSnapshot } from '../game/dungeons.ts';
import type { GameState } from '../game/types.ts';
import { DataStore } from '../runner/datastore.ts';
import { V2Chain } from '../v2/chain.ts';
import { chainToEngineState } from '../v2/mainnet-backend.ts';
import { decodePacket, unpackAdventurer, unpackBag, v2BeastTier, v2BeastType, type MarketConfig } from '../v2/protocol.ts';

const ITEM = new Map(ITEM_ROWS.map((r) => [r[0], { name: r[1], tier: r[2] }]));
const itemName = (id: number) => (id ? `${ITEM.get(id)?.name ?? `item ${id}`} (T${ITEM.get(id)?.tier ?? '?'})` : '-');
const SLOTS = ['weapon', 'chest', 'head', 'waist', 'foot', 'hand', 'neck', 'ring'] as const;
const STATS = ['str', 'dex', 'vit', 'int', 'wis', 'cha'];
const TYPE = ['?', 'Magic', 'Blade', 'Bludgeon'];

function gear(s: GameState): Record<string, string> {
  const e = s.adventurer.equipment as unknown as Record<string, { id: number; xp: number }> | Array<{ id: number; xp: number }>;
  const out: Record<string, string> = {};
  SLOTS.forEach((slot, i) => {
    const it = Array.isArray(e) ? e[i] : e[slot];
    out[slot] = itemName(it?.id ?? 0);
  });
  return out;
}

function describe(ins: ReturnType<typeof decodePacket>): string[] {
  return ins.map((i) => {
    switch (i.type) {
      case 'explore':
        return `explore${i.tillDamage ? ` (stop at ${i.tillDamage} dmg)` : ''}${i.tillGold ? ' till gold' : ''}`;
      case 'attack':
        return `attack${i.tillHealth ? ` (stop at ${i.tillHealth} HP)` : ' to the end'}`;
      case 'flee':
        return `flee${i.tillHealth ? ` (stop at ${i.tillHealth} HP)` : ''}`;
      case 'upgrade_stat':
        return `+${i.amount} ${STATS[i.statId] ?? 'luck'}`;
      case 'buy_item':
        return `buy ${itemName(i.itemId)}${i.equip ? ' + equip' : ''}`;
      case 'equip_item':
        return `equip ${itemName(i.itemId)}`;
      case 'drop_item':
        return `drop ${itemName(i.itemId)}`;
      case 'buy_potions':
        return `buy ${i.quantity} potion(s)`;
      case 'surrender':
        return 'surrender';
    }
  });
}

export async function runV2StoryCommand(opts: { game: string; core?: string; dataDir: string }): Promise<void> {
  const { provider } = await connectProvider(MAINNET.rpcUrls);
  const core = opts.core || MAINNET.beastMode.core;
  const chain = new V2Chain(provider, core);
  const id = BigInt(opts.game);
  const t = await chain.transcript(id);
  const offset = await chain.entropyOffset();
  const hashes: bigint[] = [];
  for (const b of t.blocks) hashes.push((await chain.blockHash(b + offset)) ?? 0n);
  const settingsId = await chain.settingsId(id).catch(() => 0);
  const snapshot = loadSnapshot();
  let label = `settings #${settingsId}`;
  let settings;
  let market: MarketConfig | null = null;
  try {
    const d = dungeonEngineSettings(settingsId, snapshot, 'mainnet', core);
    settings = d.settings;
    label = d.label;
    const key = `0x${BigInt(core).toString(16).padStart(64, '0')}:${settingsId}`;
    market = ((snapshot.settings[key] ?? snapshot.settings[String(settingsId)])?.settings as { market_config?: MarketConfig } | undefined)?.market_config ?? null;
  } catch {
    settings = undefined;
  }
  const { defaultSettings } = await import('../game/engine.ts');
  const st = settings ?? defaultSettings();

  // starting gear: the core's start override (a Loot Dungeon run starts in its bag's eight items)
  let start: Record<string, unknown> | null = null;
  try {
    const o = await chain.call('get_start_override', [id]);
    const a = unpackAdventurer(o[0]);
    const s0 = chainToEngineState(id, a, unpackBag(o[1] ?? 0n), false, st, null);
    start = { gear: gear(s0), stats: s0.adventurer.stats, hp: s0.adventurer.health, gold: s0.adventurer.gold };
  } catch (e) {
    start = { error: (e as Error).message.slice(0, 160) };
  }

  const steps: Array<Record<string, unknown>> = [];
  const kills: Array<Record<string, unknown>> = [];
  let prev: { s: GameState; beastHp: number; beast: string | null } | null = null;
  for (let k = 1; k <= t.packets.length; k++) {
    let r: bigint[];
    try {
      r = await chain.call('replay_transcript', [id, k, ...t.packets.slice(0, k), k, ...t.blocks.slice(0, k), k, ...hashes.slice(0, k), k]);
    } catch (e) {
      console.log(`[story] packet ${k}: replay failed: ${(e as Error).message.slice(0, 160)}`);
      break;
    }
    if (r[3] === 0n) continue;
    const a = unpackAdventurer(r[3]);
    const s = chainToEngineState(id, a, unpackBag(r[4]), r[5] === 1n, st, market);
    const b = s.beast;
    const beast = b && a.beast_health > 0 ? `${beastName(b)} (T${v2BeastTier(b.id)} ${TYPE[v2BeastType(b.id)] ?? ''}, lvl ${b.spec.level}, ${a.beast_health} HP)` : null;
    const lvl = level(s.adventurer);
    const did = describe(decodePacket(t.packets[k - 1]));
    const step: Record<string, unknown> = {
      k,
      did,
      level: lvl,
      xp: s.adventurer.xp,
      hp: s.adventurer.health,
      maxHp: maxHealth(s.adventurer.stats),
      gold: s.adventurer.gold,
      stats: s.adventurer.stats,
      gear: gear(s),
      bag: s.bag.filter((x) => x.id).map((x) => itemName(x.id)),
      beast,
      dead: s.adventurer.health === 0,
    };
    if (prev) {
      if (lvl > level(prev.s.adventurer)) step.levelUp = lvl;
      if (prev.beastHp > 0 && a.beast_health === 0 && s.adventurer.health > 0) {
        const xpGain = s.adventurer.xp - prev.s.adventurer.xp;
        if (xpGain > 0) {
          step.slain = prev.beast;
          kills.push({ k, beast: prev.beast, xpGain, level: lvl });
        } else step.escaped = prev.beast;
      }
      const changed = SLOTS.filter((x) => (step.gear as Record<string, string>)[x] !== gear(prev!.s)[x]);
      if (changed.length) step.gearChanged = changed.map((x) => `${x}: ${(step.gear as Record<string, string>)[x]}`);
      if (step.dead) step.killedBy = beast ?? prev.beast ?? 'an obstacle';
    }
    steps.push(step);
    console.log(
      `#${k} L${lvl} xp ${s.adventurer.xp} hp ${s.adventurer.health}/${step.maxHp} gold ${s.adventurer.gold} | ${did.join(', ')}${step.slain ? ` | SLAIN ${step.slain}` : ''}${step.escaped ? ` | escaped ${step.escaped}` : ''}${step.levelUp ? ` | LEVEL ${lvl}` : ''}${step.gearChanged ? ` | gear ${(step.gearChanged as string[]).join('; ')}` : ''}${beast && !step.dead ? ` | facing ${beast}` : ''}${step.dead ? ` | DEAD (${step.killedBy})` : ''}`,
    );
    prev = { s, beastHp: a.beast_health, beast };
  }
  const last = steps[steps.length - 1] ?? {};
  const story = {
    game: '0x' + id.toString(16),
    core,
    settings: label,
    owner: await chain.call('owner_of', [id, 0n]).then((x) => '0x' + x[0].toString(16)).catch(() => null),
    packets: t.packets.length,
    start,
    final: last,
    kills,
    steps,
    updated: new Date().toISOString(),
  };
  console.log(`[story] start gear ${JSON.stringify(start)}`);
  console.log(`[story] ${steps.length} packets, ${kills.length} beasts slain, final level ${last.level} xp ${last.xp}, ${last.dead ? `killed by ${last.killedBy}` : 'alive'}`);
  new DataStore(opts.dataDir).writeJson(`story/${story.game}.json`, story);
}
