import { loadParams } from '../ai/params.ts';
import { playerTokens } from '../chain/denshokan.ts';
import { openMainnet } from '../chain/mainnet.ts';
import { openPractice } from '../chain/practice.ts';
import { PRACTICE } from '../chain/config.ts';
import type { Executor, GameClient } from '../chain/client.ts';
import { DataStore } from '../runner/datastore.ts';
import { ChainBackend, SimBackend, playLoop, type Backend } from '../runner/play.ts';

export async function runPlayCommand(opts: {
  mode: 'practice' | 'practice-slot' | 'mainnet' | 'sim';
  /** directory with a lootsurvivor.io frontend dump (practice); downloaded when missing */
  frontend?: string;
  minutes: number;
  maxGames: number;
  dataDir: string;
  policyPath: string;
  live: boolean;
  /** practice: dungeon name to look up among the slot's game settings (e.g. "ronke") */
  dungeon?: string;
  settingsId?: number;
  /** mainnet: play/inspect only this game id (dry run works without an account) */
  game?: string;
}): Promise<void> {
  const params = loadParams(opts.policyPath);
  const store = new DataStore(opts.dataDir);
  let backend: Backend;

  if (opts.mode === 'sim') {
    backend = new SimBackend(Date.now() % 1_000_000_000);
  } else if (opts.mode === 'practice') {
    backend = await openSitePracticeBackend(store, opts);
  } else if (opts.mode === 'practice-slot') {
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
  } else if ((process.env.MAINNET_PROTOCOL ?? 'v2') === 'v2') {
    backend = await openV2Mainnet(opts.live, opts.game);
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

/** Practice = client-only game on the official site engine with a dungeon's on-chain settings. */
export async function openSitePracticeBackend(store: DataStore, opts: { dungeon?: string; settingsId?: number; frontend?: string; dataDir: string }): Promise<Backend> {
  const { existsSync } = await import('node:fs');
  const { execFileSync } = await import('node:child_process');
  const { DUNGEON_SETTINGS } = await import('../chain/config.ts');
  const { loadSiteEngine, siteSettings } = await import('../v2/site-engine.ts');
  const { SitePracticeBackend } = await import('../v2/backend.ts');
  const frontend = opts.frontend ?? process.env.FRONTEND_DIR ?? 'data/local/frontend';
  if (!existsSync(`${frontend}/assets`)) {
    console.log(`[practice] downloading the lootsurvivor.io client into ${frontend}`);
    execFileSync(process.execPath, ['scripts/dump-frontend.mjs', frontend], { stdio: 'inherit' });
  }
  const key = (opts.dungeon ?? 'default').toLowerCase().replace(/[^a-z]/g, '');
  const id = opts.settingsId ?? (key === 'default' ? 0 : DUNGEON_SETTINGS[key]?.ids[0]);
  if (id === undefined) throw new Error(`unknown dungeon "${opts.dungeon}" (known: ${Object.keys(DUNGEON_SETTINGS).join(', ')}) - or pass --settings-id`);
  let all = store.readJson<{ settings?: Record<string, { details?: { name?: string }; settings?: Record<string, unknown> }> }>('dungeon-settings.json', {});
  if (!all.settings?.[id]?.settings || 'error' in (all.settings[id].settings ?? {})) {
    const { runDungeonSettingsCommand } = await import('./dungeon-settings.ts');
    await runDungeonSettingsCommand({ dataDir: opts.dataDir, ids: [id] });
    all = store.readJson('dungeon-settings.json', {});
  }
  const entry = all.settings?.[id];
  if (!entry?.settings) throw new Error(`no game settings #${id} available`);
  const engine = await loadSiteEngine(frontend);
  const label = `${entry.details?.name || 'settings'} #${id}`;
  console.log(`[practice] site engine loaded from ${frontend}; dungeon ${label}`);
  return new SitePracticeBackend(engine, siteSettings(entry.settings as Record<string, unknown>), label);
}

/** Mainnet V2 (commit-reveal) games owned by the Cartridge account. */
async function openV2Mainnet(live: boolean, game?: string): Promise<Backend> {
  const { MAINNET } = await import('../chain/config.ts');
  const { connectProvider } = await import('../chain/rpc.ts');
  const { restoreSessionFromEnv, sessionProvider, SessionExecutor } = await import('../chain/mainnet.ts');
  const { V2Chain } = await import('../v2/chain.ts');
  const { V2MainnetBackend } = await import('../v2/mainnet-backend.ts');
  const { provider } = await connectProvider(MAINNET.rpcUrls);
  let executor: Executor | null = null;
  let address = process.env.MAINNET_ACCOUNT_ADDRESS ?? '';
  // a Game Session shared from lootsurvivor.io (account owned by an EVM / Ronin wallet) takes precedence
  const { gameSessionFromEnv, GameAccountExecutor, sessionAllows } = await import('../chain/game-account.ts');
  const gs = gameSessionFromEnv();
  if (gs) {
    const ga = new GameAccountExecutor(provider, gs);
    const state = await ga.sessionState();
    const deployed = await ga.isDeployed();
    const strk = deployed ? await ga.strkBalance().catch(() => 0n) : 0n;
    console.log(
      `[mainnet v2] Game Account ${ga.address} (owner ${gs.owner}), ${deployed ? `deployed, ${(Number(strk) / 1e18).toFixed(3)} STRK for gas` : 'not deployed yet'}, session ${state}, expires ${new Date(Number(gs.approval.expiresAt) * 1000).toISOString()}`,
    );
    if (!sessionAllows(gs, MAINNET.gameCoreV2, 'commit_actions')) throw new Error('the shared Game Session does not permit commit_actions on the game core');
    if (state === 'revoked') throw new Error('the shared Game Session was revoked: share a new one from lootsurvivor.io');
    executor = ga;
    address = ga.address;
  } else if (restoreSessionFromEnv()) {
    const account = await (await sessionProvider()).probe();
    if (account) {
      executor = new SessionExecutor(account as never);
      address = account.address;
    }
  }
  if (live && !executor) throw new Error('mainnet live play needs a Game Session (GAME_SESSION_LINK) or a Cartridge session (CARTRIDGE_SESSION_B64)');
  const chain = new V2Chain(provider, MAINNET.gameCoreV2);
  if (game) return new V2MainnetBackend({ chain, executor: live ? executor : null, dryRun: !live, games: [BigInt(game)] });
  if (!address) throw new Error('mainnet: no account (set CARTRIDGE_SESSION_B64 or MAINNET_ACCOUNT_ADDRESS for a dry run)');
  const games = await chain.ownedGames(address);
  console.log(`[mainnet v2] account ${address}: ${games.length} game token(s) on the V2 core, live=${live && !!executor}`);
  // free mainnet games: enter Proving Grounds when the account has no unplayed game left (gas paid by the account)
  const entries = Number(process.env.PROVING_GROUNDS_GAMES ?? 0);
  const enter =
    executor && entries > 0
      ? async () => {
          const exec = executor!;
          const id = await chain.enterDungeon(exec, MAINNET.provingGrounds);
          console.log(`[mainnet v2] entered Proving Grounds: game ${id}`);
          return id;
        }
      : undefined;
  if (enter) console.log(`[mainnet v2] Proving Grounds: up to ${entries} free entr${entries === 1 ? 'y' : 'ies'} when no game is left`);
  return new V2MainnetBackend({ chain, executor, dryRun: !live, games, enter, maxEntries: entries });
}
