// Game Account: the lootsurvivor.io account for players who sign in with an Ethereum wallet (MetaMask, Ronin, ...).
// It is a Starknet account owned by the EVM wallet. The owner shares a Game Session (lootsurvivor.io -> account
// menu -> Share session): a link that carries a session key and the session terms the owner signed with the EVM
// wallet. The bot signs SNIP-9 outside executions with that key and the lootsurvivor.io paymaster submits them
// (gas sponsored). The account itself refuses token moves for session keys (transfer/approve/burn/upgrade are
// denylisted), caps fees, and every session expires (at most 90 days).
//
// Protocol mirrored from the lootsurvivor.io frontend (game-session-v1):
//   link     https://lootsurvivor.io/#game-session=<base64url(JSON [1, classHash, owner, sessionPrivateKey,
//            [account, chainId, sessionKey, expiresAt, epoch, maxFeePerTxFri, maxSelfPaidTxs,
//             maxExceptionFeePerTxFri, maxFeeExceptions, [[target, method], ...]], ownerSignature(5 felts), run?])>
//   sign     registered session:  ['game-session-v1:use', sessionKey, r, s]
//            first use (registers): ['game-session-v1:register', sessionKey, expiresAt, maxFeePerTxFri,
//            maxSelfPaidTxs, maxExceptionFeePerTxFri, maxFeeExceptions, n, (target, ByteArray(method))*n,
//            ...ownerSignature, r, s]
//   relay    paymaster_executeTransaction {type: invoke, user_address, typed_data (OutsideExecution v2), signature}
import { randomBytes } from 'node:crypto';
import { byteArray, CallData, ec, outsideExecution, OutsideExecutionTypesV2, typedData, type Call, type RpcProvider } from 'starknet';
import type { Executor } from './client.ts';

export const GAME_ACCOUNT = {
  classHash: '0x5b73fb61b1d43327bf6bc8eb5ba1f83ae5ff8a798edcb575a04e6d6f365aed7',
  paymasterUrl: process.env.GAME_ACCOUNT_PAYMASTER_URL ?? 'https://paymaster.provable.games',
  sponsorCaller: '0x127021a1b5a52d3174c2ab077c2b043c80369250d29428cee956d76ee51584f',
  /** seconds an outside execution stays valid (the frontend uses 30) */
  window: Number(process.env.GAME_ACCOUNT_WINDOW ?? 30),
};

export interface GameSessionPermission {
  target: string;
  method: string;
}

export interface GameSession {
  version: 1;
  classHash: string;
  /** EVM address of the owner wallet */
  owner: string;
  /** Starknet private key of the session (secret) */
  privateKey: string;
  approval: {
    account: string;
    chainId: string;
    sessionKey: string;
    expiresAt: string;
    epoch: string;
    maxFeePerTxFri: string;
    maxSelfPaidTxs: string;
    maxExceptionFeePerTxFri: string;
    maxFeeExceptions: string;
    permissions: GameSessionPermission[];
  };
  ownerSignature: string[];
}

const HEX = /^0x[0-9a-fA-F]{1,64}$/;
const UINT = /^(?:0|[1-9][0-9]{0,38})$/;
const felt = (s: string) => '0x' + Buffer.from(s, 'utf8').toString('hex');
const toHex = (v: bigint | string | number) => '0x' + BigInt(v).toString(16);
const USE = felt('game-session-v1:use');
const REGISTER = felt('game-session-v1:register');

function fail(msg: string): never {
  throw new Error(`Game Session link: ${msg}`);
}

/**
 * Parse a shared Game Session: the full link, the `game-session=` fragment, or the bare base64url payload.
 * Validates the shape and that the private key belongs to the approved session key.
 */
export function parseGameSessionLink(input: string, nowSec = Math.floor(Date.now() / 1000)): GameSession {
  const raw = input.trim();
  const m = /game-session=([A-Za-z0-9_-]+)/.exec(raw);
  const payload = m ? m[1] : raw;
  if (!/^[A-Za-z0-9_-]+$/.test(payload) || payload.length > 8192) fail('not a lootsurvivor.io session link');
  let t: unknown;
  try {
    t = JSON.parse(Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
  } catch {
    fail('cannot decode');
  }
  if (!Array.isArray(t) || (t.length !== 6 && t.length !== 7)) fail('unexpected format');
  const [version, classHash, owner, privateKey, a, ownerSignature] = t as [number, string, string, string, unknown[], string[]];
  if (version !== 1) fail(`unsupported version ${version}`);
  if (typeof classHash !== 'string' || BigInt(classHash) !== BigInt(GAME_ACCOUNT.classHash)) fail('not a Game Account session');
  if (typeof owner !== 'string' || !/^0x[0-9a-fA-F]{40}$/.test(owner)) fail('bad owner');
  if (typeof privateKey !== 'string' || !/^0x[0-9a-f]{64}$/.test(privateKey)) fail('bad session key');
  if (!Array.isArray(a) || a.length !== 10 || !Array.isArray(a[9])) fail('bad approval');
  const [account, chainId, sessionKey, expiresAt, epoch, maxFeePerTxFri, maxSelfPaidTxs, maxExceptionFeePerTxFri, maxFeeExceptions] = a as string[];
  for (const v of [account, chainId, sessionKey]) if (typeof v !== 'string' || !HEX.test(v)) fail('bad approval field');
  for (const v of [expiresAt, epoch, maxFeePerTxFri, maxSelfPaidTxs, maxExceptionFeePerTxFri, maxFeeExceptions]) if (typeof v !== 'string' || !UINT.test(v)) fail('bad approval number');
  const permissions = (a[9] as unknown[]).map((p) => {
    if (!Array.isArray(p) || p.length !== 2 || !HEX.test(String(p[0])) || !/^[a-zA-Z0-9_]{1,64}$/.test(String(p[1]))) fail('bad permission');
    return { target: String(p[0]), method: String(p[1]) };
  });
  if (!Array.isArray(ownerSignature) || ownerSignature.length !== 5 || ownerSignature.some((x) => typeof x !== 'string' || !HEX.test(x))) fail('bad owner signature');
  if (BigInt(ec.starkCurve.getStarkKey(privateKey)) !== BigInt(sessionKey)) fail('the session key does not match its private key');
  if (BigInt(expiresAt) <= BigInt(nowSec + 60)) fail(`the session expired at ${new Date(Number(expiresAt) * 1000).toISOString()}`);
  return {
    version: 1,
    classHash,
    owner,
    privateKey,
    approval: { account, chainId, sessionKey, expiresAt, epoch, maxFeePerTxFri, maxSelfPaidTxs, maxExceptionFeePerTxFri, maxFeeExceptions, permissions },
    ownerSignature,
  };
}

/** Whether the session may call `method` on `target` (from its signed terms). */
export function sessionAllows(s: GameSession, target: string, method: string): boolean {
  return s.approval.permissions.some((p) => BigInt(p.target) === BigInt(target) && p.method === method);
}

/** Session signature over a message hash: the short form once the session is registered in the account. */
export function sessionSignature(s: GameSession, hash: string, registered: boolean): string[] {
  const sig = ec.starkCurve.sign(hash, s.privateKey);
  const r = toHex(sig.r);
  const sv = toHex(sig.s);
  const a = s.approval;
  if (registered) return [USE, toHex(a.sessionKey), r, sv];
  return [
    REGISTER,
    toHex(a.sessionKey),
    toHex(a.expiresAt),
    toHex(a.maxFeePerTxFri),
    toHex(a.maxSelfPaidTxs),
    toHex(a.maxExceptionFeePerTxFri),
    toHex(a.maxFeeExceptions),
    toHex(a.permissions.length),
    ...a.permissions.flatMap((p) => [toHex(p.target), ...CallData.compile(byteArray.byteArrayFromString(p.method) as never).map(toHex)]),
    ...s.ownerSignature.map(toHex),
    r,
    sv,
  ];
}

export interface OutsideExecutionV2 {
  caller: string;
  nonce: string;
  execute_after: number;
  execute_before: number;
  calls: Array<{ to: string; selector: string; calldata: string[] }>;
}

/** SNIP-9 v2 typed data of an outside execution, in the shape the paymaster expects (hex values). */
export function outsideTypedData(chainId: string, e: OutsideExecutionV2) {
  return {
    types: OutsideExecutionTypesV2,
    primaryType: 'OutsideExecution',
    domain: { name: 'Account.execute_from_outside', version: '2', chainId: toHex(chainId), revision: '1' },
    message: {
      Caller: toHex(e.caller),
      Nonce: toHex(e.nonce),
      'Execute After': toHex(e.execute_after),
      'Execute Before': toHex(e.execute_before),
      Calls: e.calls.map((c) => ({ To: toHex(c.to), Selector: toHex(c.selector), Calldata: c.calldata.map(toHex) })),
    },
  };
}

/** Nonces like the frontend: a random 30-byte channel times 128 plus a counter. */
class NonceSource {
  private channel = 0n;
  private i = 128n;
  next(): string {
    if (this.i >= 128n) {
      this.channel = BigInt('0x' + randomBytes(30).toString('hex'));
      this.i = 0n;
    }
    return toHex(this.channel * 128n + this.i++);
  }
}

/** Executes the bot's calls as the Game Account through the sponsoring paymaster. */
export class GameAccountExecutor implements Executor {
  readonly address: string;
  readonly session: GameSession;
  private provider: RpcProvider;
  private registered = false;
  private nonces = new NonceSource();
  private rpcId = 0;

  constructor(provider: RpcProvider, session: GameSession) {
    this.provider = provider;
    this.session = session;
    this.address = toHex(session.approval.account);
  }

  /** Session state in the account: active (registered), none (registers with its first transaction) or revoked. */
  async sessionState(): Promise<'active' | 'none' | 'revoked'> {
    const call = async (entrypoint: string, calldata: string[]) => (await this.provider.callContract({ contractAddress: this.address, entrypoint, calldata })).map((x) => BigInt(x));
    const [epoch] = await call('get_session_epoch', []);
    const [state, , sEpoch] = await call('get_session', [toHex(this.session.approval.sessionKey)]);
    if (state === 2n) return 'revoked';
    if (state === 1n) {
      if (sEpoch !== epoch) throw new Error('Game Session: all sessions were revoked since this one was approved');
      return 'active';
    }
    if (BigInt(this.session.approval.epoch) !== epoch) throw new Error('Game Session: the account revoked its sessions; share a new one');
    return 'none';
  }

  async execute(calls: Call[]): Promise<{ transaction_hash: string }> {
    for (const c of calls) {
      if (!sessionAllows(this.session, c.contractAddress, c.entrypoint)) throw new Error(`Game Session does not permit ${c.entrypoint} on ${c.contractAddress}`);
    }
    if (!this.registered) {
      const st = await this.sessionState();
      if (st === 'revoked') throw new Error('Game Session was revoked by its owner');
      this.registered = st === 'active';
    }
    const now = Math.floor(Date.now() / 1000);
    if (now + GAME_ACCOUNT.window > Number(this.session.approval.expiresAt) - 60) throw new Error('Game Session expired: share a new one from lootsurvivor.io');
    const execution: OutsideExecutionV2 = {
      caller: GAME_ACCOUNT.sponsorCaller,
      nonce: this.nonces.next(),
      execute_after: 0,
      execute_before: now + GAME_ACCOUNT.window,
      calls: calls.map((c) => {
        const o = outsideExecution.getOutsideCall(c);
        return { to: String(o.to), selector: String(o.selector), calldata: CallData.compile(c.calldata ?? []).map(String) };
      }),
    };
    const td = outsideTypedData(this.session.approval.chainId, execution);
    const hash = typedData.getMessageHash(td as never, this.address);
    const signature = sessionSignature(this.session, hash, this.registered);
    const result = (await this.rpc('paymaster_executeTransaction', {
      transaction: { type: 'invoke', invoke: { user_address: this.address, typed_data: { ...td, domain: { ...td.domain, revision: 1 } }, signature } },
      parameters: { version: '0x1', fee_mode: { mode: 'sponsored' } },
    })) as { transaction_hash?: string; tracking_id?: string | number };
    if (!result?.transaction_hash) throw new Error('paymaster returned no transaction hash');
    this.registered = true; // a successful first use registers the session
    return { transaction_hash: toHex(result.transaction_hash) };
  }

  private async rpc(method: string, params: unknown): Promise<unknown> {
    const id = ++this.rpcId;
    const res = await fetch(GAME_ACCOUNT.paymasterUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id, method, params }),
      signal: AbortSignal.timeout(60_000),
    });
    const body = (await res.json().catch(() => null)) as { result?: unknown; error?: { code: number; message: string; data?: unknown } } | null;
    if (!res.ok || !body || body.error) {
      const err = body?.error;
      throw new Error(`paymaster ${method} refused: ${err ? `${err.code} ${err.message}${err.data ? ` ${JSON.stringify(err.data).slice(0, 300)}` : ''}` : `HTTP ${res.status}`}`);
    }
    return body.result;
  }
}

/** The Game Session from the environment (secret GAME_SESSION_LINK), if any. */
export function gameSessionFromEnv(): GameSession | null {
  const link = process.env.GAME_SESSION_LINK?.trim();
  return link ? parseGameSessionLink(link) : null;
}
