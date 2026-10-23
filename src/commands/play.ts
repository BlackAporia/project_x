import { loadParams } from '../ai/params.ts';
import { playerTokens } from '../chain/denshokan.ts';
import { openMainnet } from '../chain/mainnet.ts';
import { openPractice } from '../chain/practice.ts';
import { PRACTICE } from '../chain/config.ts';
import type { GameClient } from '../chain/client.ts';
import { DataStore } from '../runner/datastore.ts';
import { ChainBackend, SimBackend, playLoop, type Backend } from '../runner/play.ts';

export async function runPlayCommand(opts: {
  mode: 'practice' | 'mainnet' | 'sim';
  minutes: number;
  maxGames: number;
  dataDir: string;
  policyPath: string;
  live: boolean;
  /** practice: dungeon name to look up among the slot's game settings (e.g. "ronke") */
  dungeon?: string;
  settingsId?: number;
}): Promise<void> {
  const params = loadParams(opts.policyPath);
  const store = new DataStore(opts.dataDir);
  let backend: Backend;

  if (opts.mode === 'sim') {
    backend = new SimBackend(Date.now() % 1_000_000_000);
  } else if (opts.mode === 'practice') {
    const p = await openPractice();
    console.log(`[practice] rpc ${p.rpc}, burner ${p.executor.address}`);
    const chosen = await resolvePracticeSettings(p.client, store, opts.dungeon, opts.settingsId);
    console.log(`[practice] dungeon settings #${chosen.id}${chosen.name ? ` "${chosen.name}"` : ''}`);
    let n = 0;
    backend = new ChainBackend({
      mode: 'practice',
      client: p.client,
      executor: p.executor,
      dryRun: false,
      mint: async () => {
        const id = await p.client.mintGame(p.executor, `bot${Date.now() % 100000}-${n++}`, chosen.id);
        if (id === null) throw new Error('minted a game but could not find its id in the receipt');
        return id;
      },
      dungeon: chosen.name ? `${chosen.name} #${chosen.id}` : `settings #${chosen.id}`,
    });
  } else {
    const m = await openMainnet({ requireSession: opts.live });
    if (!m.address) throw new Error('mainnet: no account (set CARTRIDGE_SESSION_B64 or MAINNET_ACCOUNT_ADDRESS for a dry run)');
    console.log(`[mainnet] account ${m.address}${m.username ? ` (${m.username})` : ''}, live=${opts.live && !!m.executor}`);
    // unfinished games owned by the account (bought/minted in the UI); oldest first
    const tokens = await playerTokens(m.address, { gameOver: false });
    const games = tokens.map((t) => BigInt(t.tokenId));
    console.log(`[mainnet] ${games.length} unfinished game(s) on the account`);
    backend = new ChainBackend({ mode: 'mainnet', client: m.client, executor: m.executor, dryRun: !opts.live, games });
  }

  await playLoop({ backend, params, store, minutes: opts.minutes, maxGames: opts.maxGames });
  const { rebuildSummary } = await import('./site.ts');
  rebuildSummary(store);
}

/** Pick the practice game settings ("dungeon"): explicit id, or a name match among all settings on the slot. */
async function resolvePracticeSettings(client: GameClient, store: DataStore, dungeon?: string, settingsId?: number): Promise<{ id: number; name: string }> {
  let all: Array<{ id: number; name: string; description: string; settings: unknown }> = [];
  try {
    all = await client.listSettings();
  } catch (e) {
    console.warn(`[practice] cannot list game settings: ${(e as Error).message}`);
  }
  if (all.length) {
    console.log(`[practice] ${all.length} game settings on the slot:`);
    for (const s of all) console.log(`    #${s.id} ${s.name || '(unnamed)'}${s.description ? ` - ${s.description.slice(0, 100)}` : ''}`);
    store.writeJson('practice-settings.json', {
      updated: new Date().toISOString(),
      settings: all.map((s) => ({ id: s.id, name: s.name, description: s.description, settings: JSON.parse(JSON.stringify(s.settings ?? null, (_k, v) => (typeof v === 'bigint' ? v.toString() : v))) })),
    });
  }
  if (settingsId !== undefined && !Number.isNaN(settingsId)) {
    return { id: settingsId, name: all.find((s) => s.id === settingsId)?.name ?? '' };
  }
  if (dungeon) {
    const norm = (x: string) => x.toLowerCase().replace(/[^a-z0-9]/g, '');
    const want = norm(dungeon);
    const hit = all.find((s) => norm(s.name) === want) ?? all.find((s) => norm(s.name).includes(want) || (want.length >= 4 && norm(s.description).includes(want)));
    if (!hit) throw new Error(`no practice settings match "${dungeon}" (available: ${all.map((s) => `#${s.id} ${s.name}`).join(', ') || 'none readable'})`);
    return { id: hit.id, name: hit.name };
  }
  return { id: PRACTICE.settingsId, name: all.find((s) => s.id === PRACTICE.settingsId)?.name ?? '' };
}
