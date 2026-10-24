import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { getStarkKey, utils } from '@scure/starknet';

// the session directory is read when src/chain/mainnet.ts is first imported
const dir = mkdtempSync(join(tmpdir(), 'session-'));
process.env.CARTRIDGE_SESSION_DIR = dir;

test('site/bot-config.json matches the session policies and RPC the bot uses', async () => {
  const { siteConfig, SITE_CONFIG_PATH } = await import('../src/commands/site-config.ts');
  assert.deepEqual(JSON.parse(readFileSync(SITE_CONFIG_PATH, 'utf8')), JSON.parse(JSON.stringify(siteConfig())), 'run `npm run bot -- site-config`');
});

test('a session approved on the website loads in the Node session provider', async () => {
  const { normalizeSessionFile, sessionProvider, parsedBotPolicies } = await import('../src/chain/mainnet.ts');
  // what site/control.js uploads: browser-generated signer, raw keychain registration, parsed policies
  const priv = '0x' + Buffer.from(utils.randomPrivateKey()).toString('hex');
  const pub = getStarkKey(priv);
  const registration = {
    username: 'tester',
    address: '0x04ABCDEF0000000000000000000000000000000000000000000000000000001',
    ownerGuid: '0x0123456789ABCDEF',
    expiresAt: String(Math.floor(Date.now() / 1000) + 86400),
    transactionHash: '0x1',
  };
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'session.json'), JSON.stringify({ signer: { privKey: priv, pubKey: pub }, session: registration, policies: parsedBotPolicies() }));
  await normalizeSessionFile();
  const s = JSON.parse(readFileSync(join(dir, 'session.json'), 'utf8')).session;
  assert.equal(s.address, registration.address.toLowerCase());
  const { signerToGuid } = await import('@cartridge/controller-wasm');
  assert.equal(s.sessionKeyGuid, String(signerToGuid({ starknet: { privateKey: priv } } as never)), 'browser SessionProvider derivation');
  assert.equal(s.guardianKeyGuid, '0x0');
  const account = await (await sessionProvider()).probe();
  assert.ok(account, 'probe() returns a session account');
  assert.equal((account as unknown as { address: string }).address, registration.address.toLowerCase());
});

test('website sealed boxes open with libsodium (GitHub secret format) and session keys are valid', async () => {
  const sodium = (await import('libsodium-wrappers')).default;
  await sodium.ready;
  const { sealSecret, newSessionKey, textToB64 } = await import('../scripts/site-crypto.ts');
  const kp = sodium.crypto_box_keypair();
  const secret = textToB64(JSON.stringify({ hello: 'світ' }));
  const sealed = sealSecret(secret, sodium.to_base64(kp.publicKey, sodium.base64_variants.ORIGINAL));
  const opened = sodium.crypto_box_seal_open(sodium.from_base64(sealed, sodium.base64_variants.ORIGINAL), kp.publicKey, kp.privateKey);
  assert.equal(sodium.to_string(opened), secret);
  const k = newSessionKey();
  assert.equal(getStarkKey(k.privKey), k.pubKey);
});
