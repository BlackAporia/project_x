// Game Account: the lootsurvivor.io account for players who sign in with an Ethereum wallet (MetaMask, Ronin, ...).
// It is a Starknet account owned by the EVM wallet. A Game Session is a link that carries a session key and the
// session terms the owner signed with the EVM wallet (lootsurvivor.io's own "Share session" is switched off, so the
// bot website creates it: src/chain/game-session-terms.ts). The bot signs with that key: SNIP-9 outside executions
// the lootsurvivor.io paymaster sponsors, or ordinary transactions paid in STRK by the account when it does not.
// The account itself refuses token moves for session keys (transfer/approve/burn/upgrade are denylisted), caps
// fees, and every session expires (at most 90 days).
//
// Protocol mirrored from the lootsurvivor.io frontend (game-session-v1):
//   link     https://lootsurvivor.io/#game-session=<base64url(JSON [1, classHash, owner, sessionPrivateKey,
//            [account, chainId, sessionKey, expiresAt, epoch, maxFeePerTxFri, maxSelfPaidTxs,
//             maxExceptionFeePerTxFri, maxFeeExceptions, [[target, method], ...]], ownerSignature(5 felts), run?])>
//   sign     registered session:  ['game-session-v1:use', sessionKey, r, s]
//            first use (registers): ['game-session-v1:register', sessionKey, expiresAt, maxFeePerTxFri,
//            maxSelfPaidTxs, maxExceptionFeePerTxFri, maxFeeExceptions, n, (target, ByteArray(method))*n,
//            ...ownerSignature, r, s]
//   relay    paymaster_executeTransaction {type: invoke | deploy_and_invoke, user_address, typed_data (OutsideExecution
//            v2), signature}; refused -> self-paid V3 invoke (fee <= session caps, paid from the account's STRK)
import { randomBytes } from 'node:crypto';
import { Account, byteArray, CallData, ec, outsideExecution, OutsideExecutionTypesV2, Signer, typedData, type Call, type RpcProvider, type Signature } from 'starknet';
import type { Executor } from './client.ts';
import { createSessionTypedData, felt64, GAME_ACCOUNT_SALT, gameAccountAddress, recoverOwner, sessionDigest } from './game-session-terms.ts';

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
  if (BigInt(gameAccountAddress(owner)) !== BigInt(account)) fail('the account is not the Game Account of this owner');
  const terms = { account, chainId, sessionKey, expiresAt: BigInt(expiresAt), epoch: BigInt(epoch), maxFeePerTxFri: BigInt(maxFeePerTxFri), maxSelfPaidTxs: BigInt(maxSelfPaidTxs), maxExceptionFeePerTxFri: BigInt(maxExceptionFeePerTxFri), maxFeeExceptions: BigInt(maxFeeExceptions), permissions };
  let signer = '';
  try {
    signer = recoverOwner(sessionDigest(createSessionTypedData(terms)), ownerSignature);
  } catch {
    fail('the owner signature is malformed');
  }
  if (signer !== owner.toLowerCase()) fail('the owner signature does not match the session terms');
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

export class PaymasterRefused extends Error {}

const STRK = '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d';
/** self-paid margins over the fee estimate, as the frontend: amounts +10 %, prices +30 %, tip 1 fri per l2 gas */
const plus = (v: bigint, pct: bigint) => v + (v * pct + 99n) / 100n;
const TIP = 1n;

type Bounds = Record<'l1_gas' | 'l1_data_gas' | 'l2_gas', { max_amount: bigint; max_price_per_unit: bigint }>;

/** Session signer for ordinary (self-paid) transactions: starknet.js computes the hash, the session key signs it. */
class SessionTxSigner extends Signer {
  constructor(private ex: GameAccountExecutor) {
    super(ex.session.privateKey);
  }
  protected override async signRaw(msgHash: string): Promise<Signature> {
    return sessionSignature(this.ex.session, msgHash, this.ex.isRegistered);
  }
}

/**
 * Executes the bot's calls as the Game Account. Like lootsurvivor.io, every game starts on the sponsored rail (SNIP-9
 * outside execution relayed by its paymaster; an undeployed account is deployed in the same request) and moves to
 * the self-paid rail (an ordinary transaction paid in STRK by the account, within the session's fee caps) once the
 * paymaster refuses to sponsor it. Ronke Casino games are sponsored; Proving Grounds is "free to enter, you pay gas".
 */
export class GameAccountExecutor implements Executor {
  readonly address: string;
  readonly session: GameSession;
  private provider: RpcProvider;
  private registered = false;
  private deployed: boolean | null = null;
  private selfPaidKeys = new Set<string>();
  private nonces = new NonceSource();
  private rpcId = 0;
  private account: Account | null = null;
  log: (m: string) => void = (m) => console.log(m);

  constructor(provider: RpcProvider, session: GameSession, private rail: 'auto' | 'sponsored' | 'self-paid' = (process.env.GAME_ACCOUNT_RAIL as never) ?? 'auto') {
    this.provider = provider;
    this.session = session;
    this.address = toHex(session.approval.account);
  }

  get isRegistered(): boolean {
    return this.registered;
  }

  async isDeployed(): Promise<boolean> {
    if (this.deployed) return true;
    try {
      await this.provider.getClassHashAt(this.address);
      this.deployed = true;
    } catch {
      this.deployed = false;
    }
    return this.deployed;
  }

  /** Session state in the account: active (registered), none (registers with its first transaction) or revoked. */
  async sessionState(): Promise<'active' | 'none' | 'revoked'> {
    if (!(await this.isDeployed())) {
      if (BigInt(this.session.approval.epoch) !== 0n) throw new Error('Game Session: the account is not deployed but the session expects epoch > 0');
      return 'none';
    }
    const call = async (entrypoint: string, calldata: string[]) => (await this.provider.callContract({ contractAddress: this.address, entrypoint, calldata })).map((x) => BigInt(x));
    const [epoch] = await call('get_session_epoch', []);
    const [state, , sEpoch] = await call('get_session', [toHex(this.session.approval.sessionKey)]);
    if (state === 2n) return 'revoked';
    if (state === 1n) {
      if (sEpoch !== epoch) throw new Error('Game Session: all sessions were revoked since this one was approved');
      return 'active';
    }
    if (BigInt(this.session.approval.epoch) !== epoch) throw new Error('Game Session: the account revoked its sessions; create a new one');
    return 'none';
  }

  /** STRK balance of the account (fri), which pays self-paid moves. */
  async strkBalance(): Promise<bigint> {
    if (!(await this.isDeployed())) return 0n;
    const [lo, hi] = await this.provider.callContract({ contractAddress: STRK, entrypoint: 'balance_of', calldata: [this.address] });
    return BigInt(lo) + (BigInt(hi ?? 0) << 128n);
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
    if (now + GAME_ACCOUNT.window > Number(this.session.approval.expiresAt) - 60) throw new Error('Game Session expired: create a new one on the bot website');
    // the rail is chosen per game (commit_actions/verify_game carry the game id first), else per entrypoint
    const key = calls.map((c) => `${BigInt(c.contractAddress)}:${/^(commit_actions|verify_game)$/.test(c.entrypoint) ? String((c.calldata as string[])?.[0] ?? '') : c.entrypoint}`).join('|');
    if (this.rail !== 'self-paid' && !this.selfPaidKeys.has(key)) {
      try {
        return await this.relay(calls);
      } catch (e) {
        if (!(e instanceof PaymasterRefused) || this.rail === 'sponsored') throw e;
        this.selfPaidKeys.add(key);
        this.log(`[game account] not sponsored (${e.message.slice(0, 160)}); paying gas from the account`);
      }
    }
    return this.selfPaid(calls);
  }

  /** Sponsored rail: SNIP-9 outside execution relayed by the paymaster (deploys the account first if needed). */
  private async relay(calls: Call[]): Promise<{ transaction_hash: string }> {
    const now = Math.floor(Date.now() / 1000);
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
    const invoke = { user_address: this.address, typed_data: { ...td, domain: { ...td.domain, revision: 1 } }, signature };
    const deployed = await this.isDeployed();
    const transaction = deployed
      ? { type: 'invoke', invoke }
      : {
          type: 'deploy_and_invoke',
          deployment: { address: felt64(this.address), class_hash: felt64(GAME_ACCOUNT.classHash), salt: GAME_ACCOUNT_SALT, calldata: [felt64(this.session.owner)], version: 1 },
          invoke,
        };
    const result = (await this.rpc('paymaster_executeTransaction', { transaction, parameters: { version: '0x1', fee_mode: { mode: 'sponsored' } } })) as {
      transaction_hash?: string;
      tracking_id?: string | number;
    };
    if (!result?.transaction_hash) throw new Error('paymaster returned no transaction hash');
    this.registered = true; // a successful first use registers the session
    if (!deployed) this.deployed = null; // re-check after the deployment lands
    return { transaction_hash: toHex(result.transaction_hash) };
  }

  /** Self-paid rail: an ordinary V3 transaction signed by the session key, fee bounded by the session's caps. */
  private async selfPaid(calls: Call[]): Promise<{ transaction_hash: string }> {
    if (!(await this.isDeployed())) throw new Error('the Game Account is not deployed yet and the paymaster refused to sponsor its setup: play one sponsored action on lootsurvivor.io first');
    this.account ??= new Account({ provider: this.provider, address: this.address, signer: new SessionTxSigner(this), cairoVersion: '1' });
    const nonce = await this.provider.getNonceForAddress(this.address);
    const est = await this.account.estimateInvokeFee(calls, { nonce, tip: TIP, skipValidate: false });
    const rb = est.resourceBounds as unknown as Bounds;
    const bump = (r: Bounds[keyof Bounds]) => ({ max_amount: plus(BigInt(r.max_amount), 10n), max_price_per_unit: plus(BigInt(r.max_price_per_unit), 30n) });
    const bounds: Bounds = { l1_gas: bump(rb.l1_gas), l1_data_gas: bump(rb.l1_data_gas), l2_gas: bump(rb.l2_gas) };
    const maxFee = (Object.values(bounds) as Bounds[keyof Bounds][]).reduce((s, r) => s + r.max_amount * r.max_price_per_unit, 0n) + TIP * bounds.l2_gas.max_amount;
    const a = this.session.approval;
    if (maxFee > BigInt(a.maxExceptionFeePerTxFri)) throw new Error(`gas is too expensive for this Game Session right now (${fmtStrk(maxFee)} > cap ${fmtStrk(BigInt(a.maxExceptionFeePerTxFri))})`);
    const balance = await this.strkBalance();
    if (balance < maxFee) throw new Error(`the Game Account needs gas: ${fmtStrk(balance)} on the account, a move may cost up to ${fmtStrk(maxFee)} (deposit STRK to ${this.address})`);
    if (maxFee > BigInt(a.maxFeePerTxFri)) this.log(`[game account] this move uses one of the session's ${a.maxFeeExceptions} higher-fee exceptions (${fmtStrk(maxFee)})`);
    const r = await this.account.execute(calls, { nonce, tip: TIP, resourceBounds: bounds as never });
    this.registered = true;
    return { transaction_hash: toHex(r.transaction_hash) };
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
      const msg = `paymaster ${method} refused: ${err ? `${err.code} ${err.message}${err.data ? ` ${JSON.stringify(err.data).slice(0, 300)}` : ''}` : `HTTP ${res.status}`}`;
      // a JSON-RPC refusal or a 4xx means "not sponsored"; 5xx / unreachable are transient
      throw err || (res.status >= 400 && res.status < 500) ? new PaymasterRefused(msg) : new Error(msg);
    }
    return body.result;
  }
}

const fmtStrk = (fri: bigint) => `${(Number(fri) / 1e18).toFixed(4)} STRK`;

/** The Game Session from the environment (secret GAME_SESSION_LINK), if any. */
export function gameSessionFromEnv(): GameSession | null {
  const link = process.env.GAME_SESSION_LINK?.trim();
  return link ? parseGameSessionLink(link) : null;
}
