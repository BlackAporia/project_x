// `v2-audit`: is the bot's engine a faithful model of the V2 mainnet core? Every real game is replayed packet by
// packet on chain (replay_transcript with committed_len = k gives the authoritative state after each packet). From
// each chain state the engine plays the same packet many times with fresh randomness; the real outcome must look
// like a draw from that distribution. Per action kind it reports predicted vs real deaths, battles, escapes and HP
// loss, and the PIT histogram (where the real HP / XP falls in the engine's distribution: flat when calibrated).
// Writes data/v2-audit.json.
import { MAINNET } from '../chain/config.ts';
import { connectProvider } from '../chain/rpc.ts';
import { level } from '../game/adventurer.ts';
import { dungeonEngineSettings, loadSnapshot } from '../game/dungeons.ts';
import { applyAction, isDead } from '../game/engine.ts';
import { FastRandom } from '../game/rng.ts';
import type { Action, GameState, Settings } from '../game/types.ts';
import { DataStore } from '../runner/datastore.ts';
import { V2Chain } from '../v2/chain.ts';
import { chainToEngineState } from '../v2/mainnet-backend.ts';
import { decodePacket, unpackAdventurer, unpackBag, STAT_ID, type Instruction, type MarketConfig } from '../v2/protocol.ts';

type Kind = 'explore' | 'explore-till' | 'attack' | 'attack-all' | 'flee' | 'flee-all' | 'other';

interface Step {
  game: string;
  k: number;
  kind: Kind;
  ins: string;
  lvl: number;
  hp: [number, number];
  xp: [number, number];
  gold: [number, number];
  battle: [boolean, boolean];
  dead: boolean;
  /** engine: P(dead), P(in battle after), mean HP after, PIT of real HP and XP, share of draws equal to the real outcome */
  pDead: number;
  pBattle: number;
  meanHp: number;
  pitHp: number;
  pitXp: number;
  pExact: number;
  hpRange: [number, number];
  /** a new beast appeared: its level and the PIT of that level among the engine's new beasts */
  beast?: { level: number; tier: number; pitLevel: number | null };
  error?: string;
}

/** Packet instructions -> engine actions (inverse of actionsToInstructions). */
export function toActions(ins: Instruction[]): { actions: Action[]; kind: Kind } {
  const actions: Action[] = [];
  let kind: Kind = 'other';
  const stats: Record<string, number> = {};
  const names = Object.fromEntries(Object.entries(STAT_ID).map(([k, v]) => [v, k]));
  let buy: { potions: number; items: { itemId: number; equip: boolean }[] } | null = null;
  const flushStats = () => {
    if (Object.keys(stats).length) actions.push({ type: 'stats', stats: { ...stats } });
    for (const k of Object.keys(stats)) delete stats[k];
  };
  const flushBuy = () => {
    if (buy) actions.push({ type: 'buy', ...buy });
    buy = null;
  };
  for (const i of ins) {
    if (i.type !== 'upgrade_stat') flushStats();
    if (i.type !== 'buy_item' && i.type !== 'buy_potions') flushBuy();
    switch (i.type) {
      case 'upgrade_stat':
        stats[names[i.statId]] = (stats[names[i.statId]] ?? 0) + i.amount;
        break;
      case 'buy_item':
        buy ??= { potions: 0, items: [] };
        buy.items.push({ itemId: i.itemId, equip: i.equip });
        break;
      case 'buy_potions':
        buy ??= { potions: 0, items: [] };
        buy.potions += i.quantity;
        break;
      case 'equip_item':
        actions.push({ type: 'equip', items: [i.itemId] });
        break;
      case 'drop_item':
        actions.push({ type: 'drop', items: [i.itemId] });
        break;
      case 'explore':
        actions.push({ type: 'explore', tillBeast: i.tillDamage > 0 });
        kind = i.tillDamage > 0 ? 'explore-till' : 'explore';
        break;
      case 'attack':
        actions.push({ type: 'attack', toTheDeath: i.tillHealth === 0 });
        kind = i.tillHealth === 0 ? 'attack-all' : 'attack';
        break;
      case 'flee':
        actions.push({ type: 'flee', toTheDeath: i.tillHealth === 0 });
        kind = i.tillHealth === 0 ? 'flee-all' : 'flee';
        break;
      case 'surrender':
        break;
    }
  }
  flushStats();
  flushBuy();
  return { actions, kind };
}

const pit = (draws: number[], v: number) => {
  let lt = 0;
  let eq = 0;
  for (const d of draws) if (d < v) lt++;
  else if (d === v) eq++;
  return (lt + eq / 2) / draws.length;
};

export async function runV2AuditCommand(opts: { games: string[]; owners: string[]; draws: number; dataDir: string; maxGames?: number }): Promise<void> {
  const { provider } = await connectProvider(MAINNET.rpcUrls);
  const chain = new V2Chain(provider, MAINNET.gameCoreV2);
  const offset = await chain.entropyOffset();
  const snapshot = loadSnapshot();
  const ids = new Set(opts.games.map((g) => BigInt(g)));
  for (const o of opts.owners) for (const g of await chain.ownedGames(o)) ids.add(g);
  const games = [...ids].slice(-(opts.maxGames ?? 400));
  console.log(`[audit] ${games.length} game(s), ${opts.draws} engine draws per packet`);
  const steps: Step[] = [];
  for (const id of games) {
    let t;
    try {
      t = await chain.transcript(id);
    } catch (e) {
      console.log(`[audit] ${id}: no transcript (${(e as Error).message.slice(0, 120)})`);
      continue;
    }
    if (t.packets.length < 2) continue;
    const settingsId = await chain.settingsId(id).catch(() => 0);
    let settings: Settings;
    let market: MarketConfig | null = null;
    try {
      settings = dungeonEngineSettings(settingsId, snapshot, 'mainnet').settings;
      market = (snapshot.settings[String(settingsId)]?.settings as { market_config?: MarketConfig } | undefined)?.market_config ?? null;
    } catch {
      console.log(`[audit] ${id}: no snapshot of settings #${settingsId}, skipped`);
      continue;
    }
    const hashes: bigint[] = [];
    let ready = true;
    for (const b of t.blocks) {
      const h = await chain.blockHash(b + offset);
      if (h === null) ready = false;
      hashes.push(h ?? 0n);
    }
    if (!ready) continue;
    const stateAt = async (k: number): Promise<{ s: GameState; beastLevel: number; beastSalt: number; beastHp: number } | null> => {
      const r = await chain.call('replay_transcript', [id, k, ...t.packets.slice(0, k), k, ...t.blocks.slice(0, k), k, ...hashes.slice(0, k), k]);
      if (r[3] === 0n) return null;
      const a = unpackAdventurer(r[3]);
      const s = chainToEngineState(id, a, unpackBag(r[4]), r[5] === 1n, settings, market);
      return { s, beastLevel: s.beast?.spec.level ?? 0, beastSalt: a.beast_salt, beastHp: a.beast_health };
    };
    let prev = await stateAt(1).catch(() => null);
    let n = 0;
    for (let k = 2; k <= t.packets.length && prev; k++) {
      const cur = await stateAt(k).catch(() => null);
      if (!cur) break;
      const { actions, kind } = toActions(decodePacket(t.packets[k - 1]));
      const p = prev.s;
      const c = cur.s;
      const step: Step = {
        game: id.toString(),
        k,
        kind,
        ins: actions.map((a) => a.type).join('+'),
        lvl: level(p.adventurer),
        hp: [p.adventurer.health, c.adventurer.health],
        xp: [p.adventurer.xp, c.adventurer.xp],
        gold: [p.adventurer.gold, c.adventurer.gold],
        battle: [prev.beastHp > 0, cur.beastHp > 0],
        dead: c.adventurer.health === 0,
        pDead: 0,
        pBattle: 0,
        meanHp: 0,
        pitHp: 0,
        pitXp: 0,
        pExact: 0,
        hpRange: [0, 0],
      };
      const hpD: number[] = [];
      const xpD: number[] = [];
      const lvlD: number[] = [];
      let dead = 0;
      let battle = 0;
      let exact = 0;
      let errors = 0;
      for (let d = 0; d < opts.draws; d++) {
        let s = structuredClone(p);
        const rng = new FastRandom(1_000_003 * k + d * 7919 + Number(id % 100_000n));
        try {
          for (const a of actions) {
            s = applyAction(s, a, rng).state;
            if (isDead(s)) break;
          }
        } catch (e) {
          errors++;
          if (errors === 1) step.error = (e as Error).message.slice(0, 160);
          continue;
        }
        const a = s.adventurer;
        hpD.push(a.health);
        xpD.push(a.xp);
        if (a.health === 0) dead++;
        if (a.beastHealth > 0) {
          battle++;
          if (!step.battle[0] && s.beast) lvlD.push(s.beast.spec.level);
        }
        if (a.health === c.adventurer.health && a.xp === c.adventurer.xp && a.gold === c.adventurer.gold) exact++;
      }
      const m = hpD.length || 1;
      step.pDead = dead / m;
      step.pBattle = battle / m;
      step.meanHp = hpD.reduce((s, x) => s + x, 0) / m;
      step.pitHp = hpD.length ? pit(hpD, c.adventurer.health) : NaN;
      step.pitXp = xpD.length ? pit(xpD, c.adventurer.xp) : NaN;
      step.pExact = exact / m;
      step.hpRange = [Math.min(...hpD), Math.max(...hpD)];
      const fresh = cur.beastHp > 0 && (prev.beastHp === 0 || prev.beastSalt !== cur.beastSalt);
      if (fresh && c.beast) step.beast = { level: c.beast.spec.level, tier: c.beast.spec.tier, pitLevel: lvlD.length ? pit(lvlD, c.beast.spec.level) : null };
      steps.push(step);
      prev = cur;
      n++;
    }
    console.log(`[audit] game …${id.toString().slice(-8)} (settings #${settingsId}): ${n} packets audited`);
  }
  report(steps);
  new DataStore(opts.dataDir).writeJson('v2-audit.json', { updated: new Date().toISOString(), draws: opts.draws, steps });
}

function report(steps: Step[]): void {
  const kinds: Kind[] = ['explore', 'explore-till', 'attack', 'attack-all', 'flee', 'flee-all', 'other'];
  console.log('\nkind          steps  deaths real/pred  battle-after real/pred  meanHP real/pred  exact-hit  PIT(HP) deciles  PIT(XP) deciles');
  for (const kind of kinds) {
    const s = steps.filter((x) => x.kind === kind && !x.error);
    if (!s.length) continue;
    const sum = (f: (x: Step) => number) => s.reduce((a, x) => a + f(x), 0);
    const dec = (f: (x: Step) => number) => {
      const h = Array(10).fill(0);
      for (const x of s) {
        const v = f(x);
        if (Number.isFinite(v)) h[Math.min(9, Math.floor(v * 10))]++;
      }
      return h.join(',');
    };
    console.log(
      `${kind.padEnd(13)} ${String(s.length).padStart(5)}  ${String(sum((x) => +x.dead)).padStart(5)}/${sum((x) => x.pDead).toFixed(1).padStart(5)}` +
        `        ${String(sum((x) => +x.battle[1])).padStart(5)}/${sum((x) => x.pBattle).toFixed(1).padStart(6)}` +
        `      ${(sum((x) => x.hp[1]) / s.length).toFixed(1).padStart(6)}/${(sum((x) => x.meanHp) / s.length).toFixed(1).padStart(6)}` +
        `   ${(sum((x) => x.pExact) / s.length).toFixed(3)}   [${dec((x) => x.pitHp)}]  [${dec((x) => x.pitXp)}]`,
    );
  }
  const errs = steps.filter((x) => x.error);
  if (errs.length) console.log(`engine errors on ${errs.length} packet(s), e.g. ${errs[0].ins}: ${errs[0].error}`);
  // outcomes the engine (almost) never produces: the clearest model bugs
  const odd = steps.filter((x) => !x.error && x.kind !== 'other' && x.pExact === 0 && (x.hp[1] < x.hpRange[0] || x.hp[1] > x.hpRange[1] || (x.dead && x.pDead === 0)));
  console.log(`\nreal outcomes outside the engine's range: ${odd.length} of ${steps.length}`);
  for (const x of odd.slice(0, 30)) {
    console.log(
      `  …${x.game.slice(-6)} k=${x.k} L${x.lvl} ${x.kind} [${x.ins}] HP ${x.hp[0]}->${x.hp[1]} (engine ${x.hpRange[0]}..${x.hpRange[1]}, mean ${x.meanHp.toFixed(0)}) XP ${x.xp[0]}->${x.xp[1]} gold ${x.gold[0]}->${x.gold[1]} battle ${x.battle[0]}->${x.battle[1]}${x.dead ? ' DEAD' : ''}`,
    );
  }
  const nb = steps.filter((x) => x.beast && x.beast.pitLevel !== null);
  if (nb.length) {
    const h = Array(10).fill(0);
    for (const x of nb) h[Math.min(9, Math.floor(x.beast!.pitLevel! * 10))]++;
    console.log(`\nnew beasts: ${nb.length}; PIT of beast level among the engine's new beasts (flat if right): [${h.join(',')}]`);
  }
  const byLvl = new Map<string, { n: number; dead: number; pDead: number }>();
  for (const x of steps.filter((s) => !s.error && s.kind.startsWith('explore'))) {
    const b = x.lvl <= 5 ? 'L1-5' : x.lvl <= 10 ? 'L6-10' : x.lvl <= 15 ? 'L11-15' : x.lvl <= 20 ? 'L16-20' : 'L21+';
    const e = byLvl.get(b) ?? { n: 0, dead: 0, pDead: 0 };
    e.n++;
    e.dead += +x.dead;
    e.pDead += x.pDead;
    byLvl.set(b, e);
  }
  console.log('\nexplore deaths by level (real / engine):');
  for (const [b, e] of byLvl) console.log(`  ${b.padEnd(7)} ${e.n} packets: ${e.dead} / ${e.pDead.toFixed(2)}`);
}
