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
      const step: Record<string, unknown> = { k, xp: adv.xp, hp: adv.health, gold: adv.gold, beastHp: adv.beast_health, beastSalt: adv.beast_salt, adventurer: adv, packedAdventurer: '0x' + r[3].toString(16), packedBag: '0x' + r[4].toString(16) };
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
        // ground truth once the beast is slain: Option<RecordedKill{beast{starting_health, spec{tier, type, level, specials}}, seed, block}>
        try {
          const k = await chain.call('get_slain_beast', [id, adv.xp]);
          step.slain = k.map((x) => x.toString());
        } catch (e) {
          step.slain = `error: ${(e as Error).message.slice(0, 120)}`;
        }
        step.matches = matches;
      }
      if (prev && prev.beast_health > 0) {
        step.hpLoss = prev.health - adv.health;
        step.beastHpLoss = prev.beast_health - adv.beast_health;
      }
      steps.push(step);
      prev = adv;
    }
    // ground truth for proofs: the provable replay lists effects (kind, id), e.g. the beasts met and killed
    let effects: Array<{ kind: number; id: string }> = [];
    try {
      const mint = await chain.mintBlock(id);
      const mintHash = (await chain.blockHash(BigInt(mint))) ?? 0n;
      const r = await chain.call('replay_provable_transcript', [id, t.packets.length, ...t.packets, t.blocks.length, ...t.blocks, hashes.length, ...hashes, mintHash]);
      const n = Number(r[9] ?? 0n);
      for (let i = 0; i < n; i++) effects.push({ kind: Number(r[10 + 2 * i]), id: '0x' + r[11 + 2 * i].toString(16) });
      console.log(`  provable replay: matches=${r[2]} applied=${r[6]} ruleset=0x${r[7].toString(16)} effects=${n}: ${effects.map((e) => `${e.kind}:${e.id}`).join(' ').slice(0, 1500)}`);
    } catch (e) {
      console.log(`  provable replay failed: ${(e as Error).message.slice(0, 300)}`);
    }
    const enc = steps.filter((s) => s.encounter);
    console.log(`game ${g}: ${t.packets.length} packets, ${enc.length} encounters`);
    for (const s of enc) {
      const e = s.encounter as { name: string; tier: number; level: number; derivedHealth: number } | null;
      console.log(`  k=${s.k} xp=${s.xp} hp=${s.hp}: chain beast HP ${s.beastHp}, derived ${e ? `${e.name} T${e.tier} L${e.level} HP ${e.derivedHealth}` : '-'} slain=${JSON.stringify(s.slain)}`);
    }
    out.push({ game: g, packets: t.packets.length, effects, steps });
  }
  console.log('derivation matches by game-id encoding:');
  for (const [k, v] of tally) console.log(`  ${k.padEnd(8)} ${v.ok}/${v.n}`);
  new DataStore(opts.dataDir).writeJson('v2-beasts.json', { updated: new Date().toISOString(), tally: Object.fromEntries(tally), games: out });
}

/** Dry-run verify_game for games (starknet_call executes it without a transaction) to see why settlement reverts. */
export async function runV2VerifyCheck(opts: { games: string[] }): Promise<void> {
  const { provider } = await connectProvider(MAINNET.rpcUrls);
  const chain = new V2Chain(provider, MAINNET.gameCoreV2);
  for (const g of opts.games) {
    const id = BigInt(g);
    const t = await chain.transcript(id);
    const hex = (v: bigint) => '0x' + v.toString(16);
    const calldata = [hex(id), hex(BigInt(t.packets.length)), ...t.packets.map(hex), hex(BigInt(t.blocks.length)), ...t.blocks.map(hex)];
    try {
      const r = await provider.callContract({ contractAddress: MAINNET.gameCoreV2, entrypoint: 'verify_game', calldata });
      console.log(`game ${g}: verify_game would succeed (${t.packets.length} packets) -> [${r.join(', ')}]`);
    } catch (e) {
      const m = (e as Error).message;
      const reason = /\('([^']+)'\)/.exec(m)?.[1] ?? m.slice(-400);
      console.log(`game ${g}: verify_game reverts (${t.packets.length} packets): ${reason}`);
    }
  }
}

/**
 * Why does the core reject the bot's next move in a game? Reads the game, asks the policy for its decision and
 * dry-runs it: replay_transcript with the decision's packets appended (latest block as their entropy) shows whether
 * the core can apply them, and a commit_actions call (no account) shows the core's own revert reason.
 */
export async function runV2DryRunCommand(opts: { games: string[] }): Promise<void> {
  const { loadParams } = await import('../ai/params.ts');
  const { Policy } = await import('../ai/policy.ts');
  const { V2MainnetBackend } = await import('../v2/mainnet-backend.ts');
  const { actionsToInstructions, packetize, decodePacket } = await import('../v2/protocol.ts');
  const { provider } = await connectProvider(MAINNET.rpcUrls);
  const chain = new V2Chain(provider, MAINNET.gameCoreV2);
  const offset = await chain.entropyOffset();
  const policy = new Policy(loadParams());
  const hex = (v: bigint) => '0x' + v.toString(16);
  const reason = (e: unknown) => {
    const m = (e as Error).message;
    return (/\('([^']+)'\)/.exec(m)?.[1] ?? m.replace(/\s+/g, ' ')).slice(-500);
  };
  for (const g of opts.games) {
    const id = BigInt(g);
    const backend = new V2MainnetBackend({ chain, executor: null, dryRun: true, games: [id] });
    const s = await backend.readState(id);
    const a = s.adventurer;
    const d = policy.decide(s);
    const t = await chain.transcript(id);
    const packets = packetize(actionsToInstructions(d.actions));
    console.log(`game ${g}: L${Math.floor(Math.sqrt(a.xp))} xp ${a.xp} hp ${a.health} gold ${a.gold} beastHp ${a.beastHealth} stat points ${a.statUpgrades} stats ${JSON.stringify(a.stats)} | ${t.packets.length} packets`);
    console.log(`  decision: ${d.reason}`);
    console.log(`  packets: ${packets.map((p) => JSON.stringify(decodePacket(p))).join(' | ')}`);
    const latest = BigInt(await chain.latestBlock()) - offset - 1n;
    const hashes: bigint[] = [];
    for (const b of t.blocks) hashes.push((await chain.blockHash(b + offset)) ?? 0n);
    const hLatest = (await chain.blockHash(latest + offset)) ?? 0n;
    const P = [...t.packets, ...packets];
    const B = [...t.blocks, ...packets.map(() => latest)];
    const H = [...hashes, ...packets.map(() => hLatest)];
    try {
      const r = await chain.call('replay_transcript', [id, P.length, ...P, B.length, ...B, H.length, ...H, P.length]);
      console.log(`  replay with the move appended: OK (terminal=${r[5]}, applied=${r[2] ?? '?'})`);
    } catch (e) {
      console.log(`  replay with the move appended REVERTS: ${reason(e)}`);
    }
    try {
      await provider.callContract({ contractAddress: MAINNET.gameCoreV2, entrypoint: 'commit_actions', calldata: [hex(id), hex(t.rolling), hex(BigInt(packets.length)), ...packets.map(hex)] });
      console.log('  commit_actions (no account): would succeed');
    } catch (e) {
      console.log(`  commit_actions (no account) reverts: ${reason(e)}`);
    }
  }
}
