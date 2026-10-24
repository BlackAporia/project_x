import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ec, hash } from 'starknet';
import { hashTypedData, recoverTypedDataAddress } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { parseGameSessionLink, sessionAllows } from '../src/chain/game-account.ts';
import {
  GAME_ACCOUNT_CLASS,
  GAME_ACCOUNT_SALT,
  SELF_PAID,
  SN_MAIN,
  createSessionTypedData,
  defaultPermissions,
  feeCaps,
  gameAccountAddress,
  ownerSignatureFelts,
  recoverOwner,
  sessionDigest,
  sessionLink,
  type SessionTerms,
} from '../src/chain/game-session-terms.ts';

const PERMS = defaultPermissions({
  lootDungeon: '0x02dab28ac4edaae7495174f9dd7668eece14b1e50ce170ff8af2a0e215f48875',
  provingGrounds: '0x00d042acfc0160b6d725281eca1fb856c3e08ed46fbc20405b4d32d5f3b8ac02',
  gameCore: '0x011afdfce6a8c4514c542f57f9ec91a9076784e229df55e1a3d6ec4f9c40183b',
});
const wallet = privateKeyToAccount(('0x' + '42'.repeat(32)) as `0x${string}`);
const sessionPriv = '0x' + '01'.repeat(31) + '0b';

function terms(): SessionTerms {
  return {
    account: gameAccountAddress(wallet.address),
    chainId: SN_MAIN,
    sessionKey: ec.starkCurve.getStarkKey(sessionPriv),
    expiresAt: BigInt(Math.floor(Date.now() / 1000) + 30 * 86400),
    epoch: 0n,
    ...feeCaps(120_000n),
    maxSelfPaidTxs: SELF_PAID.maxSelfPaidTxs,
    maxFeeExceptions: SELF_PAID.maxFeeExceptions,
    permissions: PERMS,
  };
}

test('Game Account address matches starknet.js counterfactual deployment', () => {
  const owner = '0x17c1f7000000000000000000000000000001d1bf5'.slice(0, 42);
  const ref = hash.calculateContractAddressFromHash(GAME_ACCOUNT_SALT, GAME_ACCOUNT_CLASS, [owner], 0);
  assert.equal(BigInt(gameAccountAddress(owner)), BigInt(ref));
  assert.equal(gameAccountAddress(owner).length, 66);
  assert.equal(gameAccountAddress(owner.toUpperCase().replace('0X', '0x')), gameAccountAddress(owner));
});

test('CreateGameSession digest matches viem and the owner signature round-trips', async () => {
  const t = terms();
  const td = createSessionTypedData(t);
  assert.equal(sessionDigest(td), hashTypedData(td as never));
  const sig = await wallet.signTypedData(td as never);
  assert.equal((await recoverTypedDataAddress({ ...(td as object), signature: sig } as never)).toLowerCase(), wallet.address.toLowerCase());
  const felts = ownerSignatureFelts(sig);
  assert.equal(felts.length, 5);
  assert.equal(recoverOwner(sessionDigest(td), felts), wallet.address.toLowerCase());
  // a high-s signature (malleable twin) normalizes to the same felts
  const N = 0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141n;
  const s = BigInt('0x' + sig.slice(66, 130));
  const v = parseInt(sig.slice(130), 16);
  const twin = sig.slice(0, 66) + (N - s).toString(16).padStart(64, '0') + (v === 27 ? '1c' : '1b');
  assert.deepEqual(ownerSignatureFelts(twin), felts);
});

test('fee caps follow the STRK price and stay within the frontend bounds', () => {
  const at12c = feeCaps(120_000n);
  assert.equal(at12c.maxFeePerTxFri, (2500n * 10n ** 18n) / 120_000n);
  assert.equal(feeCaps(1n).maxFeePerTxFri, SELF_PAID.normalBounds[1]);
  assert.equal(feeCaps(10n ** 12n).maxExceptionFeePerTxFri, SELF_PAID.exceptionBounds[0]);
});

test('a website-made session link is accepted by the bot', async () => {
  const t = terms();
  const ownerSignature = ownerSignatureFelts(await wallet.signTypedData(createSessionTypedData(t) as never));
  const link = sessionLink({ owner: wallet.address, privateKey: sessionPriv, terms: t, ownerSignature });
  const s = parseGameSessionLink(link);
  assert.equal(BigInt(s.approval.account), BigInt(t.account));
  assert.ok(sessionAllows(s, PERMS[1].target, 'enter_dungeon'));
  assert.ok(sessionAllows(s, PERMS[2].target, 'commit_actions'));
  // tampered terms no longer recover the owner
  const bad = sessionLink({ owner: wallet.address, privateKey: sessionPriv, terms: { ...t, maxSelfPaidTxs: 3000n }, ownerSignature });
  assert.throws(() => parseGameSessionLink(bad), /owner/);
  // the account must be the owner's Game Account
  const other = sessionLink({ owner: wallet.address, privateKey: sessionPriv, terms: { ...t, account: '0x4a1' }, ownerSignature });
  assert.throws(() => parseGameSessionLink(other), /Game Account/);
});
