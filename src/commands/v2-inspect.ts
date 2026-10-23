// `v2-inspect`: validate the V2 (commit-reveal) read path against live mainnet games without an account:
// find recently active games, rebuild their transcripts from events, check the rolling commitment, replay the state
// on the core and decode adventurer / bag / beast / market. Writes data/v2-inspect.json for the dashboard.
import { hash, num } from 'starknet';
import { MAINNET } from '../chain/config.ts';
import { abiFunctions, fetchAbi, summarizeAbi } from '../chain/abi.ts';
import { connectProvider } from '../chain/rpc.ts';
import { lootInfo } from '../game/loot.ts';
import { beastName } from '../game/beast.ts';
import { DataStore } from '../runner/datastore.ts';
import { V2Chain } from '../v2/chain.ts';
import { currentBeastV2, decodePacket, marketItemsV2 } from '../v2/protocol.ts';

export async function runV2InspectCommand(opts: { dataDir: string; games: number; gameId?: string }): Promise<void> {
  const store = new DataStore(opts.dataDir);
  const { provider } = await connectProvider(MAINNET.rpcUrls);
  const core = MAINNET.gameCoreV2;
  const report: Record<string, unknown> = { updated: new Date().toISOString(), core };
  try {
    const abi = await fetchAbi(provider, core);
    report.functions = summarizeAbi(abi);
    report.hasCommitActions = abiFunctions(abi).some((f) => f.name === 'commit_actions');
    report.hasReplayTranscript = abiFunctions(abi).some((f) => f.name === 'replay_transcript');
  } catch (e) {
    report.abiError = (e as Error).message;
  }
  const chain = new V2Chain(provider, core);
  report.entropyOffset = String(await chain.entropyOffset());
  let ids: bigint[] = [];
  if (opts.gameId) ids = [BigInt(opts.gameId)];
  else {
    const latest = await chain.latestBlock();
    const ev = (await provider.getEvents({
      address: core,
      keys: [[num.toHex(hash.getSelectorFromName('ActionCommitted'))]],
      from_block: { block_number: Math.max(0, latest - 3000) },
      to_block: 'latest',
      chunk_size: 500,
    } as never)) as unknown as { events: Array<{ keys: string[] }> };
    ids = [...new Set(ev.events.map((e) => BigInt(e.keys[1])))].slice(-opts.games);
  }
  console.log(`v2-inspect: core ${core}, entropy offset ${report.entropyOffset}, ${ids.length} game(s)`);
  const games: unknown[] = [];
  for (const id of ids) {
    const g: Record<string, unknown> = { gameId: id.toString() };
    try {
      const t = await chain.transcript(id);
      g.packets = t.packets.length;
      g.rollingMatches = true;
      g.lastInstructions = t.packets.slice(-3).map((p) => decodePacket(p).map((i) => i.type).join('+'));
      const st = await chain.state(id, t);
      g.ready = st.ready;
      g.terminal = st.terminal;
      g.gameOver = await chain.gameOver(id);
      g.settingsId = await chain.settingsId(id).catch(() => null);
      if (st.adventurer) {
        const a = st.adventurer;
        const lvl = a.xp === 0 ? 1 : Math.floor(Math.sqrt(a.xp));
        g.adventurer = { level: lvl, xp: a.xp, health: a.health, gold: a.gold, beastHealth: a.beast_health, statUpgrades: a.stat_upgrades_available, stats: a.stats, weapon: lootInfo(a.equipment.weapon.id).name, levelSalt: a.level_salt };
        const b = currentBeastV2(a, id);
        if (b) g.beast = { name: beastName(b), level: b.spec.level, tier: b.spec.tier, startingHealth: b.startingHealth, health: a.beast_health };
        g.score = await chain.score(id).catch(() => null);
      }
      console.log(`  game ${id}: ${t.packets.length} packets, rolling ok, ${JSON.stringify(g.adventurer ?? {}).slice(0, 220)} ${g.beast ? JSON.stringify(g.beast) : ''}`);
    } catch (e) {
      g.error = (e as Error).message.slice(0, 300);
      console.log(`  game ${id}: ${g.error}`);
    }
    games.push(g);
  }
  report.games = games;
  // market of the first started game with its dungeon settings
  try {
    const first = games.find((g) => (g as { adventurer?: unknown }).adventurer) as { gameId: string; settingsId: number; adventurer: { levelSalt: number } } | undefined;
    if (first && first.settingsId !== null) {
      const raw = await chain.call('get_settings', [first.settingsId]);
      report.settingsRawLength = raw.length;
      // market_config are the 3 felts after base_damage_reduction; located from the end of the struct (see config/dungeon-settings.json)
      const cfg = { pair01: raw[raw.length - 6], pair23: raw[raw.length - 5], pair4_enabled: raw[raw.length - 4] };
      report.sampleMarket = marketItemsV2(first.adventurer.levelSalt, BigInt(first.gameId), cfg).map((i) => lootInfo(i).name);
    }
  } catch (e) {
    report.marketError = (e as Error).message.slice(0, 200);
  }
  store.writeJson('v2-inspect.json', report);
  console.log(`saved ${opts.dataDir}/v2-inspect.json`);
}
