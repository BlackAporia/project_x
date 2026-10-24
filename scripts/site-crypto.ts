// Browser crypto for the bot website, bundled into site/vendor/crypto.js by scripts/build-site-crypto.mjs:
// a Starknet session key pair for the Cartridge session, and libsodium-compatible sealed boxes for GitHub secrets.
import nacl from 'tweetnacl';
import { blake2b } from '@noble/hashes/blake2b';
import { getStarkKey, utils } from '@scure/starknet';

const hex = (b: Uint8Array) => Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');

function concat(a: Uint8Array, b: Uint8Array): Uint8Array {
  const out = new Uint8Array(a.length + b.length);
  out.set(a);
  out.set(b, a.length);
  return out;
}

function fromB64(s: string): Uint8Array {
  const bin = atob(s);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

export function toB64(b: Uint8Array): string {
  let s = '';
  for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000));
  return btoa(s);
}

/** UTF-8 text as base64 (the format of the CARTRIDGE_SESSION_B64 secret). */
export function textToB64(text: string): string {
  return toB64(new TextEncoder().encode(text));
}

/** A fresh Starknet key pair for a Cartridge session (the key the bot signs moves with). */
export function newSessionKey(): { privKey: string; pubKey: string } {
  const privKey = '0x' + hex(utils.randomPrivateKey());
  return { privKey, pubKey: getStarkKey(privKey) };
}

/** Public Starknet key of a private key (checks that a shared Game Session key matches its approval). */
export function starkKey(privKey: string): string {
  return getStarkKey(privKey);
}

/** libsodium crypto_box_seal: GitHub stores secret values only in this form. */
export function sealSecret(value: string, publicKeyB64: string): string {
  const rpk = fromB64(publicKeyB64);
  const eph = nacl.box.keyPair();
  const nonce = blake2b(concat(eph.publicKey, rpk), { dkLen: 24 });
  const box = nacl.box(new TextEncoder().encode(value), nonce, rpk, eph.secretKey);
  return toB64(concat(eph.publicKey, box));
}
