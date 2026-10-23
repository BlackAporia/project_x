import { loadParams } from '../ai/params.ts';
import { playerTokens } from '../chain/denshokan.ts';
import { openMainnet } from '../chain/mainnet.ts';
import { openPractice } from '../chain/practice.ts';
import { PRACTICE } from '../chain/config.ts';
import { DataStore } from '../runner/datastore.ts';
import { ChainBackend, SimBackend, playLoop, type Backend } from '../runner/play.ts';

export async function runPlayCommand(opts: {
  mode: 'practice' | 'mainnet' | 'sim';
  minutes: number;
  maxGames: number;
  dataDir: string;
  policyPath: string;
  live: boolean;
}): Promise<void> {
  const params = loadParams(opts.policyPath);
  const store = new DataStore(opts.dataDir);
  let backend: Backend;

  if (opts.mode === 'sim') {
    backend = new SimBackend(Date.now() % 1_000_000_000);
  } else if (opts.mode === 'practice') {
    const p = await openPractice();
    console.log(`[practice] rpc ${p.rpc}, burner ${p.executor.address}`);
    let n = 0;
    backend = new ChainBackend({
      mode: 'practice',
      client: p.client,
      executor: p.executor,
      dryRun: false,
      mint: async () => {
        const id = await p.client.mintGame(p.executor, `bot${Date.now() % 100000}-${n++}`, PRACTICE.settingsId);
        if (id === null) throw new Error('minted a game but could not find its id in the receipt');
        return id;
      },
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
