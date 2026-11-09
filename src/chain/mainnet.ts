// Mainnet play with the owner's own Cartridge Controller account through a session key.
//   1. once, on your own computer: `npm run authorize` -> approve the session in the browser
//   2. store .session/cartridge/session.json as the GitHub secret CARTRIDGE_SESSION_B64 (base64)
// The session key can only call commit_actions / verify_game on the game cores, enter Proving Grounds and Beast Mode (TICKET approve, new_game, claim_beast; see botPolicies) and expires; the Controller owner key never leaves Cartridge. Nothing secret is ever printed or logged.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
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
      [MAINNET.provingGrounds]: {
        name: 'Proving Grounds',
        description: 'Free entry to Loot Survivor games (you pay only gas)',
        methods: [{ name: 'Enter Dungeon', entrypoint: 'enter_dungeon', description: 'Start a free Proving Grounds game' }],
      },
      // Beast Mode (same permissions lootsurvivor.io asks its own sessions for): play and settle on the Beast Mode
      // core, enter with a TICKET, mint earned beasts
      [MAINNET.beastMode.core]: {
        name: 'Beast Mode game core',
        description: 'Play and settle your Beast Mode games',
        methods: [
          { name: 'Commit Actions', entrypoint: 'commit_actions', description: 'Submit game moves' },
          { name: 'Verify Game', entrypoint: 'verify_game', description: 'Settle a finished game so it counts and its beasts can be claimed' },
        ],
      },
      [MAINNET.beastMode.dungeon]: {
        name: 'Beast Mode',
        description: 'Enter Beast Mode with a ticket and collect the beasts you defeat',
        methods: [
          { name: 'Enter Beast Mode', entrypoint: 'new_game', description: 'Start a Beast Mode game for 1 TICKET' },
          { name: 'Claim Beast', entrypoint: 'claim_beast', description: 'Mint a beast your settled game earned' },
        ],
      },
      [MAINNET.beastMode.ticket]: {
        name: 'Dungeon Ticket',
        description: 'Allow Beast Mode to take 1 TICKET per game',
        // spender + amount: Cartridge limits the approval to the Beast Mode dungeon and 1 TICKET (1e18) per call
        methods: [{ name: 'Approve Ticket', entrypoint: 'approve', description: 'Approve 1 TICKET for a Beast Mode entry', spender: MAINNET.beastMode.dungeon, amount: '0xde0b6b3a7640000' }],
      },
    },
  };
}

/** The policies object exactly as the session provider stores and sends it (methods marked authorized). */
export function parsedBotPolicies() {
  const p = botPolicies();
  return {
    verified: false,
    contracts: Object.fromEntries(
      Object.entries(p.contracts).map(([address, c]) => [address, { ...c, methods: c.methods.map((m) => ({ ...m, authorized: true })) }]),
    ),
  };
}

/**
 * Sessions approved on the bot's website are stored as {signer, session (raw keychain registration), policies}.
 * Fill in what the Node session provider derives itself after the keychain callback (it needs the wasm
 * signerToGuid, which the website does not load).
 */
export async function normalizeSessionFile(): Promise<void> {
  const file = join(SESSION_DIR, 'session.json');
  if (!existsSync(file)) return;
  const data = JSON.parse(readFileSync(file, 'utf8')) as { signer?: { privKey?: string }; session?: Record<string, string> };
  const s = data.session;
  if (!s || s.sessionKeyGuid || !data.signer?.privKey) return;
  const { signerToGuid } = await import('@cartridge/controller-wasm');
  // same derivation as the browser SessionProvider of @cartridge/controller (guid of the signer's key pair)
  const priv = data.signer.privKey.startsWith('0x') ? data.signer.privKey : `0x${data.signer.privKey}`;
  s.address = String(s.address).toLowerCase();
  s.ownerGuid = String(s.ownerGuid).toLowerCase();
  s.guardianKeyGuid = '0x0';
  s.metadataHash = '0x0';
  s.sessionKeyGuid = String(signerToGuid({ starknet: { privateKey: priv } } as never));
  writeFileSync(file, JSON.stringify(data, null, 2), { mode: 0o600 });
}

export async function sessionProvider() {
  await normalizeSessionFile();
  const mod = await import('@cartridge/controller/session/node');
  const SessionProvider = mod.default;
  const usePreset = process.env.CARTRIDGE_USE_PRESET === 'true';
  // sign with the policies the session was approved with: the session's merkle root covers exactly those, so
  // passing the bot's current (wider) list made Cartridge reject every call of an older session
  const policies = storedSessionPolicies() ?? botPolicies();
  return new SessionProvider({
    rpc: MAINNET.cartridgeRpc,
    chainId: MAINNET.chainId,
    ...(usePreset ? { preset: MAINNET.preset } : { policies: policies as never, shouldOverridePresetPolicies: true }),
    basePath: SESSION_DIR,
  });
}

type PolicyMethod = { name?: string; entrypoint: string; description?: string; authorized?: boolean; [k: string]: unknown };

/** The policies stored with the approved session (website sessions keep them next to the registration). */
export function storedSessionPolicies(): { contracts: Record<string, { name?: string; description?: string; methods: PolicyMethod[] }> } | null {
  const file = join(SESSION_DIR, 'session.json');
  if (!existsSync(file)) return null;
  try {
    const data = JSON.parse(readFileSync(file, 'utf8')) as { policies?: { contracts?: Record<string, { name?: string; description?: string; methods?: PolicyMethod[] }> } };
    const contracts = data.policies?.contracts;
    if (!contracts || !Object.keys(contracts).length) return null;
    return {
      contracts: Object.fromEntries(
        Object.entries(contracts).map(([address, c]) => [address, { ...c, methods: (c.methods ?? []).map(({ authorized: _a, ...m }) => m) }]),
      ),
    };
  } catch {
    return null;
  }
}

/** Whether the approved Cartridge session may call `entrypoint` on `target` (true when it is not known). */
export function sessionPermits(target: string, entrypoint: string): boolean {
  const p = storedSessionPolicies();
  if (!p) return true;
  return Object.entries(p.contracts).some(([address, c]) => BigInt(address) === BigInt(target) && c.methods.some((m) => m.entrypoint === entrypoint));
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
    try {
      return await this.account.execute(calls);
    } catch (e) {
      // Cartridge answers with a bare "Validation failure" / "Transaction execution error": keep whatever detail the
      // error carries (RPC error data, revert reason) so a stuck game can be diagnosed from the run log
      const err = e as Error & { baseError?: unknown; data?: unknown; cause?: unknown; code?: unknown };
      const extra = [err.code, err.baseError, err.data, (err.cause as Error | undefined)?.message]
        .filter((x) => x !== undefined && x !== null)
        .map((x) => (typeof x === 'string' ? x : JSON.stringify(x)))
        .join(' | ');
      throw new Error(`${err.message}${extra ? ` [${extra.slice(0, 900)}]` : ''}`);
    }
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
