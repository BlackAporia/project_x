// Mainnet play with the owner's own Cartridge Controller account through a session key.
//   1. once, on your own computer: `npm run authorize` -> approve the session in the browser
//   2. store .session/cartridge/session.json as the GitHub secret CARTRIDGE_SESSION_B64 (base64)
// The session key can only call commit_actions / verify_game on the game core (see botPolicies) and expires; the Controller owner key never leaves Cartridge. Nothing secret is ever printed or logged.
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Call } from 'starknet';
import { MAINNET } from './config.ts';
import { GameClient, type Executor } from './client.ts';
import { connectProvider, retry } from './rpc.ts';

export const SESSION_DIR = process.env.CARTRIDGE_SESSION_DIR ?? '.session/cartridge';

/** Materialize the session file from the CI secret (if provided). */
export function restoreSessionFromEnv(): boolean {
  const b64 = process.env.CARTRIDGE_SESSION_B64?.trim();
  if (!b64) return existsSync(join(SESSION_DIR, 'session.json'));
  mkdirSync(SESSION_DIR, { recursive: true });
  writeFileSync(join(SESSION_DIR, 'session.json'), Buffer.from(b64, 'base64').toString('utf8'), { mode: 0o600 });
  return true;
}

/**
 * Least-privilege session: only the calls the bot makes on the V2 game core (commit moves, settle finished games).
 * Set CARTRIDGE_USE_PRESET=true to request the full lootsurvivor.io preset instead (needed for V1 games).
 */
export function botPolicies() {
  return {
    contracts: {
      [MAINNET.gameCoreV2]: {
        name: 'Loot Survivor game core',
        description: 'Play and settle your Loot Survivor games',
        methods: [
          { name: 'Commit Actions', entrypoint: 'commit_actions', description: 'Submit game moves' },
          { name: 'Verify Game', entrypoint: 'verify_game', description: 'Settle a finished game so its score counts' },
        ],
      },
    },
  };
}

export async function sessionProvider() {
  const mod = await import('@cartridge/controller/session/node');
  const SessionProvider = mod.default;
  const usePreset = process.env.CARTRIDGE_USE_PRESET === 'true';
  return new SessionProvider({
    rpc: MAINNET.cartridgeRpc,
    chainId: MAINNET.chainId,
    ...(usePreset ? { preset: MAINNET.preset } : { policies: botPolicies() as never, shouldOverridePresetPolicies: true }),
    basePath: SESSION_DIR,
  });
}

export class SessionExecutor implements Executor {
  readonly address: string;
  private account: { execute(calls: Call[]): Promise<{ transaction_hash: string }> };

  constructor(account: { address: string; execute(calls: Call[]): Promise<{ transaction_hash: string }> }) {
    this.account = account;
    this.address = account.address;
  }

  async execute(calls: Call[]): Promise<{ transaction_hash: string }> {
    // executeFromOutside through the Cartridge paymaster (VRF proofs are attached by Cartridge); falls back to a
    // normal invoke paid by the account. No retry here: a resend could double-play an action.
    return this.account.execute(calls);
  }
}

export interface MainnetSession {
  client: GameClient;
  executor: SessionExecutor | null;
  address: string;
  username?: string;
}

export async function openMainnet(opts: { requireSession: boolean }): Promise<MainnetSession> {
  const { provider } = await connectProvider(MAINNET.rpcUrls);
  let executor: SessionExecutor | null = null;
  let address = process.env.MAINNET_ACCOUNT_ADDRESS ?? '';
  let username: string | undefined;
  if (restoreSessionFromEnv()) {
    const sp = await sessionProvider();
    const account = await retry(() => sp.probe(), { label: 'cartridge session probe', tries: 2 });
    if (account) {
      executor = new SessionExecutor(account as unknown as SessionExecutor['account'] & { address: string });
      address = account.address;
      username = await sp.username().catch(() => undefined);
    } else if (opts.requireSession) {
      throw new Error('Cartridge session is missing or expired: run `npm run authorize` locally and update CARTRIDGE_SESSION_B64');
    }
  } else if (opts.requireSession) {
    throw new Error('No Cartridge session: run `npm run authorize` locally (see README)');
  }
  const client = new GameClient(
    provider,
    {
      game: MAINNET.gameCore,
      token: MAINNET.gameToken,
      settings: process.env.MAINNET_SETTINGS_ADDRESS || undefined,
      adventurer: process.env.MAINNET_ADVENTURER_ADDRESS || undefined,
    },
    { provider: MAINNET.vrfProvider, caller: process.env.VRF_CALLER || MAINNET.gameCore },
  );
  await client.init();
  return { client, executor, address, username };
}
