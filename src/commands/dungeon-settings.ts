// `dungeon-settings`: read the game settings of dungeons from the V2 game core (the same data lootsurvivor.io
// loads for a dungeon's practice / client-only game) and store them for the simulator.
import { join } from 'node:path';
import { Contract, type Abi } from 'starknet';
import { DUNGEON_SETTINGS, MAINNET } from '../chain/config.ts';
import { fetchAbi, findFunction } from '../chain/abi.ts';
import { connectProvider, retry } from '../chain/rpc.ts';
import { DataStore } from '../runner/datastore.ts';

const json = (v: unknown) => JSON.parse(JSON.stringify(v ?? null, (_k, x) => (typeof x === 'bigint' ? x.toString() : x)));

export async function runDungeonSettingsCommand(opts: { dataDir: string; ids?: number[]; core?: string }): Promise<void> {
  const store = new DataStore(opts.dataDir);
  const core = opts.core ?? MAINNET.gameCoreV2;
  const { provider } = await connectProvider(MAINNET.rpcUrls);
  const abi: Abi = await retry(() => fetchAbi(provider, core), { label: 'v2 core abi' });
  const c = new Contract({ abi, address: core, providerOrAccount: provider });
  const ids = opts.ids ?? [...new Set(Object.values(DUNGEON_SETTINGS).flatMap((d) => d.ids))].sort((a, b) => a - b);
  const call = async (names: string[], args: unknown[]) => {
    const fn = findFunction(abi, names);
    if (!fn) return { error: `no ${names.join('/')}` };
    try {
      return json(await retry(() => c.call(fn.name, args as never[]), { tries: 2, label: fn.name }));
    } catch (e) {
      return { error: (e as Error).message.slice(0, 300) };
    }
  };
  const count = await call(['settings_count'], []);
  const out: Record<string, unknown> = {};
  for (const id of ids) {
    out[id] = {
      details: await call(['settings_details'], [id]),
      settings: await call(['get_settings'], [id]),
      actionSettings: await call(['get_action_settings'], [id]),
    };
    console.log(`settings #${id}: ${JSON.stringify(out[id]).slice(0, 400)}`);
  }
  // struct layouts, so the simulator mapping can be checked against the live ABI
  const structs = (abi as Array<Record<string, unknown>>).filter(
    (e) => (e.type === 'struct' || e.type === 'enum') && /GameSettings|ActionSettings|Adventurer$|Bag$|Stats$|StatsMode|Item$|Equipment$/.test(String(e.name)),
  );
  store.writeJson('dungeon-settings.json', { updated: new Date().toISOString(), core, settingsCount: count, dungeons: DUNGEON_SETTINGS, settings: out, structs });
  console.log(`saved ${join(opts.dataDir, 'dungeon-settings.json')} (${ids.length} settings, core ${core})`);
}
