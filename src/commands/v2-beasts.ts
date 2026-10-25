// `v2-beasts`: check the bot's view of real V2 games against the chain, packet by packet. The core replays every
// transcript prefix (replay_transcript with committed_len = k), so each step's authoritative adventurer is known.
// At every new beast encounter the beast's starting health is on chain (beast_health); the bot derives the beast
// (id, tier, level, health) from beast_salt + game id + xp. A wrong derivation shows up as a health mismatch.
// Writes data/v2-beasts.json (all steps) and prints match rates per candidate game-id encoding.
import { MAINNET } from '../chain/config.ts';
import { connectProvider } from '../chain/rpc.ts';
import { beastName } from '../game/beast.ts';
import { DataStore } from '../runner/datastore.ts';
import { V2Chain } from '../v2/chain.ts';
import { currentBeastV2, unpackAdventurer } from '../v2/protocol.ts';

const MASK = (bits: bigint) => (1n << bits) - 1n;

export async function runV2BeastsCommand(opts: { games: string[]; dataDir: string; maxSteps?: number }): Promise<void> {
  const { provider } = await connectProvider(MAINNET.rpcUrls);
  const chain = new V2Chain(provider, MAINNET.gameCoreV2);
  const offset = await chain.entropyOffset();
  const out: Array<Record<string, unknown>> = [];
  const tally = new Map<string, { ok: number; n: number }>();
  for (const g of opts.games) {
    const id = BigInt(g);
    const t = await chain.transcript(id);
    const hashes: bigint[] = [];
    for (const b of t.blocks) hashes.push((await chain.blockHash(b + offset)) ?? 0n);
    const cands: Record<string, bigint> = { full: id, low64: id & MASK(64n), low128: id & MASK(128n), low32: id & MASK(32n), high: id >> 128n };
    let prev: ReturnType<typeof unpackAdventurer> | null = null;
    const steps: Array<Record<string, unknown>> = [];
    const n = Math.min(t.packets.length, opts.maxSteps ?? 400);
    for (let k = 1; k <= n; k++) {
      const r = await chain.call('replay_transcript', [id, k, ...t.packets.slice(0, k), k, ...t.blocks.slice(0, k), k, ...hashes.slice(0, k), k]);
      const adv = unpackAdventurer(r[3]);
      const step: Record<string, unknown> = { k, xp: adv.xp, hp: adv.health, gold: adv.gold, beastHp: adv.beast_health, beastSalt: adv.beast_salt };
      const fresh = adv.beast_health > 0 && (!prev || prev.beast_health === 0 || prev.beast_salt !== adv.beast_salt);
      if (fresh) {
        const matches: Record<string, boolean> = {};
        for (const [name, gid] of Object.entries(cands)) {
          const b = currentBeastV2(adv, gid);
          const ok = !!b && b.startingHealth === adv.beast_health;
          matches[name] = ok;
          const c = tally.get(name) ?? { ok: 0, n: 0 };
          c.n++;
          if (ok) c.ok++;
          tally.set(name, c);
        }
        const b = currentBeastV2(adv, id);
        step.encounter = b ? { name: beastName(b), id: b.id, tier: b.spec.tier, level: b.spec.level, derivedHealth: b.startingHealth } : null;
        step.matches = matches;
      }
      if (prev && prev.beast_health > 0) {
        step.hpLoss = prev.health - adv.health;
        step.beastHpLoss = prev.beast_health - adv.beast_health;
      }
      steps.push(step);
      prev = adv;
    }
    const enc = steps.filter((s) => s.encounter);
    console.log(`game ${g}: ${t.packets.length} packets, ${enc.length} encounters`);
    for (const s of enc) {
      const e = s.encounter as { name: string; tier: number; level: number; derivedHealth: number } | null;
      console.log(`  k=${s.k} xp=${s.xp} hp=${s.hp}: chain beast HP ${s.beastHp}, derived ${e ? `${e.name} T${e.tier} L${e.level} HP ${e.derivedHealth}` : '-'} ${JSON.stringify(s.matches)}`);
    }
    out.push({ game: g, packets: t.packets.length, steps });
  }
  console.log('derivation matches by game-id encoding:');
  for (const [k, v] of tally) console.log(`  ${k.padEnd(8)} ${v.ok}/${v.n}`);
  new DataStore(opts.dataDir).writeJson('v2-beasts.json', { updated: new Date().toISOString(), tally: Object.fromEntries(tally), games: out });
}
