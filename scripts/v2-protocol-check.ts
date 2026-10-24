// Cross-check src/v2/protocol.ts against the official client functions (frontend dump).
// Usage: node --import tsx scripts/v2-protocol-check.ts <frontendDir>
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadSiteEngine } from '../src/v2/site-engine.ts';
import { marketDensities, marketItemsV2, currentBeastV2, decodePacket, encodePacket, rollingFold, rollingStart, unpackAdventurer, unpackBag, type Instruction } from '../src/v2/protocol.ts';

const dir = process.argv[2];
await loadSiteEngine(dir); // browser globals
const files = readdirSync(join(dir, 'assets'));
const imp = async (prefix: string) => import(pathToFileURL(join(dir, 'assets', files.find((f) => f.startsWith(prefix) && f.endsWith('.js'))!)).href);
const sk = await imp('starknet-');
const aa = await imp('AutoAwesome-');
const site = { market: sk.C, densities: sk.E, maskToIds: sk.w, encode: sk.et, parse: sk.$, fold: sk.nt, start: sk.rt, unpackAdv: aa.Ut, unpackBag: aa.Wt, beastSeed: aa.Nt, beast: aa.Pt };

let ok = 0;
let bad = 0;
const check = (name: string, a: unknown, b: unknown) => {
  const sa = JSON.stringify(a, (_k, v) => (typeof v === 'bigint' ? v.toString() : v));
  const sb = JSON.stringify(b, (_k, v) => (typeof v === 'bigint' ? v.toString() : v));
  if (sa === sb) ok++;
  else {
    bad++;
    if (bad < 8) console.log(`MISMATCH ${name}\n  ours ${sa.slice(0, 300)}\n  site ${sb.slice(0, 300)}`);
  }
};
const rnd = (n: number) => Math.floor(Math.random() * n);
const randIns = (): Instruction => {
  switch (rnd(9)) {
    case 0: return { type: 'explore', tillDamage: rnd(2048), tillGold: rnd(2) === 1 };
    case 1: return { type: 'attack', tillHealth: rnd(1024), beastDeathPolicy: rnd(3) };
    case 2: return { type: 'flee', tillHealth: rnd(1024) };
    case 3: return { type: 'upgrade_stat', statId: rnd(6), amount: 1 + rnd(15) };
    case 4: return { type: 'buy_item', itemId: 1 + rnd(101), equip: rnd(2) === 1 };
    case 5: return { type: 'equip_item', itemId: 1 + rnd(101) };
    case 6: return { type: 'drop_item', itemId: 1 + rnd(101) };
    case 7: return { type: 'surrender' };
    default: return { type: 'buy_potions', quantity: 1 + rnd(255) };
  }
};
// packets: single instructions (site validates grouping rules for multi-instruction packets)
for (let t = 0; t < 300; t++) {
  const ins = [randIns()];
  let siteP: bigint | null = null;
  try {
    siteP = site.encode(ins);
  } catch {
    continue;
  }
  check('encode', encodePacket(ins), siteP);
  check('decode', decodePacket(siteP!).map((x) => JSON.stringify(x)).join(), ins.map((x) => JSON.stringify(x)).join());
}
// realistic multi-instruction packet
const multi: Instruction[] = [
  { type: 'upgrade_stat', statId: 1, amount: 2 },
  { type: 'buy_item', itemId: 9, equip: true },
  { type: 'buy_potions', quantity: 3 },
  { type: 'explore', tillDamage: 1, tillGold: false },
];
check('encode multi', encodePacket(multi), site.encode(multi));
for (let t = 0; t < 50; t++) {
  const id = BigInt(rnd(2 ** 30)) * 1000003n;
  const packet = BigInt(rnd(2 ** 31)) << BigInt(rnd(200));
  const blk = BigInt(rnd(2 ** 31));
  check('rolling start', rollingStart(id), site.start(id));
  check('rolling fold', rollingFold(id, packet, blk), site.fold(id, packet, blk));
  let packed = 0n;
  for (let k = 0; k < 251; k++) if (rnd(2)) packed |= 1n << BigInt(k);
  const a = unpackAdventurer(packed);
  check('unpack adventurer', a, site.unpackAdv(packed));
  check('unpack bag', unpackBag(packed & ((1n << 240n) - 1n)), site.unpackBag(packed & ((1n << 240n) - 1n)));
  // beast
  const adv = { ...a, beast_health: 1 + rnd(500), xp: rnd(3000) };
  const ours = currentBeastV2(adv, id)!;
  const seed = site.beastSeed(adv.beast_salt, id, adv.xp);
  const sb = site.beast(adv.xp, seed);
  check('beast id/level/health', [ours.id, ours.spec.level, ours.startingHealth, ours.spec.tier], [sb.id, sb.level, sb.health, sb.tier]);
}
const cfgs = [
  { pair01: '0', pair23: '6427752177035961102167848369362115108888355516328177934794752', pair4_enabled: '6427752177035961102167848369364650410088811975131171341205503' },
];
for (let t = 0; t < 40; t++) {
  const cfg = cfgs[0];
  const salt = rnd(16384);
  const gid = BigInt(rnd(2 ** 30)) * 7919n;
  check('market', marketItemsV2(salt, gid, cfg), site.maskToIds(site.market(gid, salt, cfg)));
  if (t === 0) check('densities', marketDensities(cfg), site.densities(cfg));
}
console.log(`protocol check: ${ok} ok, ${bad} mismatches`);
process.exit(bad ? 1 : 0);
