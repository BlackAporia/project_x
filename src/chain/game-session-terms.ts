// Creating a Game Session without lootsurvivor.io (its session manager with "Share" is switched off in production).
// Browser-safe (bundled into the website): the owner's EVM wallet signs the same EIP-712 `CreateGameSession` terms the
// lootsurvivor.io frontend asks for, and the result is a game-session-v1 link the bot reads (src/chain/game-account.ts).
//
// Mirrored from the frontend:
//   account   = contract address (deployer 0, salt GAME_ACCOUNT_SALT, class GAME_ACCOUNT_CLASS, calldata [owner])
//   terms     network "Mainnet", expiresAt <= now + 90 days - 1 h - 60 s, epoch (0 until the account is deployed),
//             self-paid limits: 2000 txs at ~$0.0025, 25 exceptions at ~$0.25 (fixed STRK caps sized at approval)
//   signature eth_signTypedData_v4 -> [r.low, r.high, s.low, s.high, yParity] (u128 limbs, low-s normalized)
import { secp256k1 } from '@noble/curves/secp256k1';
import { keccak_256 } from '@noble/hashes/sha3';
import { computeHashOnElements, getStarkKey } from '@scure/starknet';

export const GAME_ACCOUNT_CLASS = '0x05b73fb61b1d43327bf6bc8eb5ba1f83ae5ff8a798edcb575a04e6d6f365aed7';
export const GAME_ACCOUNT_SALT = '0x028c0d654fe3920e7ad3c57ec34c195476b373ecd1537a37f5c4fb5234987ed0';
export const SN_MAIN = '0x534e5f4d41494e';
export const MAX_SESSION_SECONDS = 90 * 86400 - 3600 - 60;
export const SELF_PAID = {
  maxSelfPaidTxs: 2000n,
  maxFeeExceptions: 25n,
  /** fee caps in micro-USD, converted to STRK (fri) at approval time */
  normalCapMicroUsd: 2500n,
  exceptionCapMicroUsd: 250000n,
  normalBounds: [10n ** 14n, 10n ** 18n] as const,
  exceptionBounds: [10n ** 16n, 10n ** 20n] as const,
};

export interface Permission {
  target: string;
  method: string;
}

export interface SessionTerms {
  account: string;
  chainId: string;
  sessionKey: string;
  expiresAt: bigint;
  epoch: bigint;
  maxFeePerTxFri: bigint;
  maxSelfPaidTxs: bigint;
  maxExceptionFeePerTxFri: bigint;
  maxFeeExceptions: bigint;
  permissions: Permission[];
}

const enc = new TextEncoder();
const hex = (b: Uint8Array) => Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
/** felt as 0x + 64 hex digits (the frontend's canonical form) */
export const felt64 = (v: bigint | string) => '0x' + BigInt(v).toString(16).padStart(64, '0');
const shortString = (s: string) => BigInt('0x' + hex(enc.encode(s)));

/** Starknet address of the Game Account owned by an EVM wallet (counterfactual: same before and after deployment). */
export function gameAccountAddress(owner: string): string {
  if (!/^0x[0-9a-fA-F]{40}$/.test(owner)) throw new Error('an EVM address is 0x followed by 40 hex digits');
  const h = computeHashOnElements([
    shortString('STARKNET_CONTRACT_ADDRESS'),
    0n,
    BigInt(GAME_ACCOUNT_SALT),
    BigInt(GAME_ACCOUNT_CLASS),
    computeHashOnElements([BigInt(owner.toLowerCase())]),
  ]);
  return felt64(BigInt(h as string | bigint) % (2n ** 251n - 256n));
}

/** The permissions lootsurvivor.io asks for: enter the main dungeon and Proving Grounds, play and settle games. */
export function defaultPermissions(p: { lootDungeon: string; provingGrounds?: string; gameCore: string }): Permission[] {
  return [
    { target: p.lootDungeon, method: 'enter_dungeon' },
    ...(p.provingGrounds ? [{ target: p.provingGrounds, method: 'enter_dungeon' }] : []),
    { target: p.gameCore, method: 'commit_actions' },
    { target: p.gameCore, method: 'verify_game' },
  ];
}

/** Fee caps for self-paid moves from the STRK price (micro-USD per STRK), clamped like the frontend. */
export function feeCaps(strkMicroUsd: bigint): { maxFeePerTxFri: bigint; maxExceptionFeePerTxFri: bigint } {
  if (strkMicroUsd <= 0n) throw new Error('bad STRK price');
  const clamp = (v: bigint, [lo, hi]: readonly [bigint, bigint]) => (v < lo ? lo : v > hi ? hi : v);
  return {
    maxFeePerTxFri: clamp((SELF_PAID.normalCapMicroUsd * 10n ** 18n) / strkMicroUsd, SELF_PAID.normalBounds),
    maxExceptionFeePerTxFri: clamp((SELF_PAID.exceptionCapMicroUsd * 10n ** 18n) / strkMicroUsd, SELF_PAID.exceptionBounds),
  };
}

const NETWORKS: Record<string, string> = { [BigInt(SN_MAIN).toString()]: 'Mainnet', [shortString('SN_SEPOLIA').toString()]: 'Sepolia' };

/** EIP-712 typed data the owner signs (eth_signTypedData_v4), identical to lootsurvivor.io's. */
export function createSessionTypedData(t: SessionTerms) {
  const network = NETWORKS[BigInt(t.chainId).toString()];
  if (!network) throw new Error('unsupported chain');
  return {
    types: {
      EIP712Domain: [
        { name: 'name', type: 'string' },
        { name: 'version', type: 'string' },
      ],
      CreateGameSession: [
        { name: 'network', type: 'string' },
        { name: 'expiresAt', type: 'uint64' },
        { name: 'permissions', type: 'Permission[]' },
        { name: 'gameAccount', type: 'bytes32' },
        { name: 'sessionKey', type: 'bytes32' },
        { name: 'epoch', type: 'uint32' },
        { name: 'maxFeePerTxFri', type: 'uint128' },
        { name: 'maxSelfPaidTxs', type: 'uint32' },
        { name: 'maxExceptionFeePerTxFri', type: 'uint128' },
        { name: 'maxFeeExceptions', type: 'uint32' },
      ],
      Permission: [
        { name: 'contract', type: 'bytes32' },
        { name: 'function', type: 'string' },
      ],
    },
    primaryType: 'CreateGameSession' as const,
    domain: { name: 'Game Account', version: '1' },
    message: {
      network,
      expiresAt: t.expiresAt.toString(),
      permissions: t.permissions.map((p) => ({ contract: felt64(p.target), function: p.method })),
      gameAccount: felt64(t.account),
      sessionKey: felt64(t.sessionKey),
      epoch: t.epoch.toString(),
      maxFeePerTxFri: t.maxFeePerTxFri.toString(),
      maxSelfPaidTxs: t.maxSelfPaidTxs.toString(),
      maxExceptionFeePerTxFri: t.maxExceptionFeePerTxFri.toString(),
      maxFeeExceptions: t.maxFeeExceptions.toString(),
    },
  };
}

// ---- EIP-712 digest for this schema (verified against viem in tests)
const keccak = (b: Uint8Array) => keccak_256(b);
const word = (v: bigint) => {
  const out = new Uint8Array(32);
  let x = v;
  for (let i = 31; i >= 0; i--) {
    out[i] = Number(x & 0xffn);
    x >>= 8n;
  }
  return out;
};
const cat = (...parts: Uint8Array[]) => {
  const out = new Uint8Array(parts.reduce((s, p) => s + p.length, 0));
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
};
const bytes32 = (v: string) => {
  if (!/^0x[0-9a-fA-F]{64}$/.test(v)) throw new Error(`bytes32 must be 32 bytes: ${v}`);
  return word(BigInt(v));
};
const typeHash = (s: string) => keccak(enc.encode(s));
const PERMISSION_TYPE = 'Permission(bytes32 contract,string function)';
const SESSION_TYPE =
  'CreateGameSession(string network,uint64 expiresAt,Permission[] permissions,bytes32 gameAccount,bytes32 sessionKey,uint32 epoch,uint128 maxFeePerTxFri,uint32 maxSelfPaidTxs,uint128 maxExceptionFeePerTxFri,uint32 maxFeeExceptions)' +
  PERMISSION_TYPE;

export function sessionDigest(td: ReturnType<typeof createSessionTypedData>): string {
  const m = td.message;
  const domain = keccak(cat(typeHash('EIP712Domain(string name,string version)'), keccak(enc.encode(td.domain.name)), keccak(enc.encode(td.domain.version))));
  const perms = keccak(cat(...m.permissions.map((p) => keccak(cat(typeHash(PERMISSION_TYPE), bytes32(p.contract), keccak(enc.encode(p.function)))))));
  const struct = keccak(
    cat(
      typeHash(SESSION_TYPE),
      keccak(enc.encode(m.network)),
      word(BigInt(m.expiresAt)),
      perms,
      bytes32(m.gameAccount),
      bytes32(m.sessionKey),
      word(BigInt(m.epoch)),
      word(BigInt(m.maxFeePerTxFri)),
      word(BigInt(m.maxSelfPaidTxs)),
      word(BigInt(m.maxExceptionFeePerTxFri)),
      word(BigInt(m.maxFeeExceptions)),
    ),
  );
  return '0x' + hex(keccak(cat(new Uint8Array([0x19, 0x01]), domain, struct)));
}

const N = secp256k1.CURVE.n;
const LIMB = 2n ** 128n;
const h = (v: bigint) => '0x' + v.toString(16);

/** Wallet signature (0x + r + s + v) -> the account's 5-felt owner signature, normalized to low s like the frontend. */
export function ownerSignatureFelts(sig: string): string[] {
  if (!/^0x[0-9a-fA-F]{130}$/.test(sig)) throw new Error('a wallet signature is 0x followed by 65 bytes of hex');
  const r = BigInt('0x' + sig.slice(2, 66));
  let s = BigInt('0x' + sig.slice(66, 130));
  const v = parseInt(sig.slice(130, 132), 16);
  let parity = v >= 27 ? v - 27 : v;
  if (parity > 1) throw new Error('bad signature recovery id');
  if (s > N / 2n) {
    s = N - s;
    parity = 1 - parity;
  }
  return [h(r % LIMB), h(r / LIMB), h(s % LIMB), h(s / LIMB), h(BigInt(parity))];
}

/** EVM address that produced a 5-felt owner signature over a digest. */
export function recoverOwner(digest: string, felts: string[]): string {
  const [rl, rh, sl, sh, p] = felts.map((x) => BigInt(x));
  const sig = new secp256k1.Signature(rh * LIMB + rl, sh * LIMB + sl).addRecoveryBit(Number(p));
  const pub = sig.recoverPublicKey(digest.slice(2)).toRawBytes(false);
  return '0x' + hex(keccak(pub.subarray(1)).subarray(12));
}

/** game-session-v1 link for the bot (same payload lootsurvivor.io's share link carries). */
export function sessionLink(p: { owner: string; privateKey: string; terms: SessionTerms; ownerSignature: string[] }): string {
  const t = p.terms;
  if (BigInt(getStarkKey(p.privateKey)) !== BigInt(t.sessionKey)) throw new Error('the session key does not match its private key');
  const payload = [
    1,
    GAME_ACCOUNT_CLASS,
    p.owner.toLowerCase(),
    felt64(p.privateKey),
    [
      felt64(t.account),
      felt64(t.chainId),
      felt64(t.sessionKey),
      t.expiresAt.toString(),
      t.epoch.toString(),
      t.maxFeePerTxFri.toString(),
      t.maxSelfPaidTxs.toString(),
      t.maxExceptionFeePerTxFri.toString(),
      t.maxFeeExceptions.toString(),
      t.permissions.map((x) => [felt64(x.target), x.method]),
    ],
    p.ownerSignature,
  ];
  const b = enc.encode(JSON.stringify(payload));
  let s = '';
  for (const x of b) s += String.fromCharCode(x);
  return 'https://lootsurvivor.io/#game-session=' + btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
