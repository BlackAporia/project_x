import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ec, outsideExecution, typedData } from 'starknet';
import { GAME_ACCOUNT, outsideTypedData, parseGameSessionLink, sessionAllows, sessionSignature } from '../src/chain/game-account.ts';

const CORE = '0x011afdfce6a8c4514c542f57f9ec91a9076784e229df55e1a3d6ec4f9c40183b';
const priv = '0x' + '01'.repeat(31) + '07';
const pub = ec.starkCurve.getStarkKey(priv);
const expiresAt = String(Math.floor(Date.now() / 1000) + 30 * 86400);

/** A link encoded exactly like the lootsurvivor.io frontend (JSON array, base64url without padding). */
function link(overrides: { privateKey?: string; expiresAt?: string } = {}) {
  const arr = [
    1,
    GAME_ACCOUNT.classHash,
    '0x00000000000000000000000000000000000b0b0b',
    overrides.privateKey ?? priv,
    ['0x4a1', '0x534e5f4d41494e', pub, overrides.expiresAt ?? expiresAt, '0', '1000000000000000', '5', '100000000000000000', '3', [[CORE, 'commit_actions'], [CORE, 'verify_game']]],
    ['0x1', '0x2', '0x3', '0x4', '0x1'],
  ];
  return 'https://lootsurvivor.io/#game-session=' + Buffer.from(JSON.stringify(arr)).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

test('parses a shared Game Session link and checks key, class and expiry', () => {
  const s = parseGameSessionLink(link());
  assert.equal(s.approval.account, '0x4a1');
  assert.equal(s.approval.permissions.length, 2);
  assert.ok(sessionAllows(s, CORE, 'commit_actions'));
  assert.ok(!sessionAllows(s, CORE, 'transfer'));
  assert.throws(() => parseGameSessionLink(link({ privateKey: '0x' + '02'.repeat(31) + '09' })), /does not match/);
  assert.throws(() => parseGameSessionLink(link({ expiresAt: '1000' })), /expired/);
  assert.throws(() => parseGameSessionLink('https://lootsurvivor.io/'), /link/);
});

test('outside execution hash matches starknet.js SNIP-9 v2 and the session signature verifies', () => {
  const s = parseGameSessionLink(link());
  const calls = [{ contractAddress: CORE, entrypoint: 'commit_actions', calldata: ['0x1', '0x0', '0x1', '0x123'] }];
  const e = {
    caller: GAME_ACCOUNT.sponsorCaller,
    nonce: '0x77',
    execute_after: 0,
    execute_before: 1_900_000_000,
    calls: calls.map((c) => {
      const o = outsideExecution.getOutsideCall(c);
      return { to: String(o.to), selector: String(o.selector), calldata: c.calldata };
    }),
  };
  const ours = typedData.getMessageHash(outsideTypedData(s.approval.chainId, e) as never, s.approval.account);
  const ref = typedData.getMessageHash(
    outsideExecution.getTypedData(s.approval.chainId, { caller: e.caller, execute_after: e.execute_after, execute_before: e.execute_before }, e.nonce, calls, '2') as never,
    s.approval.account,
  );
  assert.equal(BigInt(ours), BigInt(ref));
  const use = sessionSignature(s, ours, true);
  assert.equal(use.length, 4);
  assert.equal(Buffer.from(BigInt(use[0]).toString(16), 'hex').toString(), 'game-session-v1:use');
  assert.ok(ec.starkCurve.verify(new ec.starkCurve.Signature(BigInt(use[2]), BigInt(use[3])), ours, ec.starkCurve.getPublicKey(priv)));
  const reg = sessionSignature(s, ours, false);
  // marker, key, 5 terms, count, 2 x (target + ByteArray(3 felts)), 5 owner-signature felts, r, s
  assert.equal(reg.length, 1 + 1 + 5 + 1 + 2 * 4 + 5 + 2);
  assert.equal(Buffer.from(BigInt(reg[0]).toString(16), 'hex').toString(), 'game-session-v1:register');
});
