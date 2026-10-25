// Mainnet backend for V2 (commit-reveal) games: plays the account's own game tokens on the lootsurvivor.io game core.
import { defaultSettings, newGameState, startGame } from '../game/engine.ts';
import { FastRandom } from '../game/rng.ts';
import type { Action, GameState, Item, Settings } from '../game/types.ts';
import { decodeAdventurer } from '../chain/state.ts';
import type { Executor } from '../chain/client.ts';
import { dungeonEngineSettings, loadSnapshot } from '../game/dungeons.ts';
import type { Backend, SettleResult } from '../runner/play.ts';
import { V2Chain, type Transcript } from './chain.ts';
import { specialsSeed } from './backend.ts';
import { actionsToInstructions, currentBeastV2, marketItemsV2, packetize, type MarketConfig, type V2Adventurer, type V2Item } from './protocol.ts';

/** Authoritative chain state (replay_transcript) -> engine GameState, as the bot sees it. */
export function chainToEngineState(id: bigint, a: V2Adventurer, bagItems: V2Item[], terminal: boolean, settings: Settings, market: MarketConfig | null): GameState {
  const s = newGameState(id, settings);
  const adv = decodeAdventurer(a);
  adv.itemSpecialsSeed = specialsSeed(a.item_specials_salt, id.toString());
  const bag: Item[] = bagItems.map((b) => ({ id: b.id, xp: b.xp }));
  s.adventurer = adv;
  s.bag = bag;
  s.started = true;
  s.market = market ? marketItemsV2(a.level_salt, id, market) : Array.from({ length: 101 }, (_, i) => i + 1);
  s.beast = currentBeastV2(a, id);
  if (terminal && adv.health > 0) adv.health = 0; // surrendered / finished
  return s;
}

interface GameCtx {
  transcript: Transcript;
  settingsId: number;
  settings: Settings;
  market: MarketConfig | null;
  label: string;
}

export class V2MainnetBackend implements Backend {
  readonly mode = 'mainnet' as const;
  readonly exact = false;
  readonly dryRun: boolean;
  readonly account?: string;
  dungeon?: string;
  private chain: V2Chain;
  private executor: Executor | null;
  private queue: bigint[];
  private games = new Map<bigint, GameCtx>();
  private snapshot = loadSnapshot();
  private log: (m: string) => void;
  private enter?: () => Promise<bigint | null>;
  private entries: number;
  private owned: bigint[];
  private settled = false;

  constructor(opts: {
    chain: V2Chain;
    executor: Executor | null;
    dryRun: boolean;
    games: bigint[];
    log?: (m: string) => void;
    /** start a new game when the account has none left (e.g. free Proving Grounds entry) */
    enter?: () => Promise<bigint | null>;
    maxEntries?: number;
  }) {
    this.chain = opts.chain;
    this.executor = opts.executor;
    this.dryRun = opts.dryRun || !opts.executor;
    this.account = opts.executor?.address;
    this.queue = [...opts.games];
    this.owned = [...opts.games];
    this.log = opts.log ?? ((m) => console.log(m));
    this.enter = opts.enter;
    this.entries = opts.maxEntries ?? 0;
  }

  async nextGame(): Promise<bigint | null> {
    while (this.queue.length) {
      const id = this.queue.shift()!;
      if (await this.chain.gameOver(id).catch(() => false)) continue;
      // dead but never verified: game_over stays false until settlement, so it would be "played" and counted again
      const st = await this.readState(id).catch(() => null);
      if (st?.started && st.adventurer.health === 0) continue;
      return id;
    }
    // unplayed games first, then settle the finished ones that were never verified (once per run)
    if (!this.settled) {
      this.settled = true;
      const n = await this.settleFinished(this.owned).catch(() => 0);
      if (n) this.log(`[v2] settled ${n} finished game(s) that were never verified`);
    }
    if (this.enter && !this.dryRun && this.entries > 0) {
      this.entries--;
      // a one-off 'Transaction execution error' right after settling ended a 10-game run at 8: retry a few times,
      // stop entering only when it keeps failing (no gas, a session without enter_dungeon...)
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const id = await this.enter();
          if (id !== null) return id;
          break;
        } catch (e) {
          this.log(`[v2] could not start a new game (attempt ${attempt}/3): ${(e as Error).message.slice(0, 300)}`);
          if (attempt === 3) this.entries = 0;
          else await new Promise((r) => setTimeout(r, 20_000 * attempt));
        }
      }
    }
    return null;
  }

  private async ctx(id: bigint): Promise<GameCtx> {
    let c = this.games.get(id);
    if (!c) {
      const settingsId = await this.chain.settingsId(id).catch(() => 0);
      let settings: Settings = defaultSettings();
      let label = `settings #${settingsId}`;
      let market: MarketConfig | null = null;
      try {
        const d = dungeonEngineSettings(settingsId, this.snapshot, 'mainnet'); // on-chain games: specials unlock, density market
        settings = d.settings;
        label = d.label;
        const raw = this.snapshot.settings[String(settingsId)]?.settings as { market_config?: MarketConfig } | undefined;
        market = raw?.market_config ?? null;
      } catch (e) {
        this.log(`[v2] no settings snapshot for #${settingsId} (${(e as Error).message}); using defaults`);
        settings = { ...defaultSettings(), noStarterBeast: true, baseDamageReduction: 35 };
      }
      c = { transcript: await this.chain.transcript(id), settingsId, settings, market, label };
      this.games.set(id, c);
      this.dungeon = label;
    }
    return c;
  }

  async readState(id: bigint): Promise<GameState> {
    const c = await this.ctx(id);
    // a just-entered or just-committed game is "unripe" until its entropy block exists; RPCs also rate-limit
    let st: Awaited<ReturnType<V2Chain['state']>> | null = null;
    for (let attempt = 0; ; attempt++) {
      try {
        await this.chain.waitReady(c.transcript);
        st = await this.chain.state(id, c.transcript);
        if (st.ready) break;
        throw new Error('entropy block not produced yet');
      } catch (e) {
        const msg = (e as Error).message;
        if (attempt >= 4 || !/unripe|not produced|rate limit|timeout|ECONN|fetch failed/i.test(msg)) throw e;
        this.log(`[v2] game ${id}: waiting (${msg.slice(0, 80)})`);
        await new Promise((r) => setTimeout(r, 10_000 * (attempt + 1)));
      }
    }
    if (!st.started || !st.adventurer) {
      // not played yet: the template adventurer of the dungeon (V2 games start implicitly with the first packet)
      const s0 = newGameState(id, c.settings);
      return startGame(s0, 46, new FastRandom(Number(id % 1000003n))).state;
    }
    return chainToEngineState(id, st.adventurer, st.bag, st.terminal, c.settings, c.market);
  }

  async execute(id: bigint, actions: Action[]): Promise<{ sent: Action[]; txs: string[]; reverted?: string }> {
    const c = await this.ctx(id);
    const packets = packetize(actionsToInstructions(actions));
    if (!packets.length) return { sent: actions, txs: [] };
    if (this.dryRun || !this.executor) return { sent: [], txs: [] };
    try {
      const r = await this.chain.commit(this.executor, c.transcript, packets);
      c.transcript = r.transcript;
      return { sent: actions, txs: [r.txHash] };
    } catch (e) {
      // the local transcript may be stale (e.g. a commit from another device): rebuild it from events
      c.transcript = await this.chain.transcript(id);
      return { sent: [], txs: [], reverted: (e as Error).message };
    }
  }

  /** Settle the score of a finished game on-chain. */
  requeue(id: bigint): void {
    this.games.delete(id); // re-read the transcript from the chain
    this.queue.push(id);
  }

  async finish(id: bigint): Promise<SettleResult | null> {
    if (this.dryRun || !this.executor) return null;
    if (await this.chain.isVerified(id).catch(() => false)) return { verified: true };
    const c = await this.ctx(id);
    // the replay needs the entropy block of the last commit: settling right after the final move reverted
    // ("unripe"), which left every finished game unverified (not on the leaderboard)
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        await this.chain.waitReady(c.transcript);
        const tx = await this.chain.verify(this.executor, c.transcript);
        this.log(`[v2] game ${id} verified (${tx})`);
        return { verified: true, tx };
      } catch (e) {
        if (await this.chain.isVerified(id).catch(() => false)) return { verified: true };
        const msg = (e as Error).message;
        this.log(`[v2] verify_game failed for ${id} (attempt ${attempt + 1}/4): ${msg.slice(0, 200)}`);
        // not enough STRK for this game, or above the session's fee cap: retrying cannot help (it held up the
        // unplayed games for minutes); the cost differs per game, so the next game may still fit
        if (/needs gas|too expensive|not eligible for sponsorship/.test(msg)) return { verified: false, note: msg.slice(0, 200) };
        await new Promise((r) => setTimeout(r, 15_000 * (attempt + 1)));
      }
    }
    return { verified: false, note: 'verify_game failed 4 times' };
  }

  /** Finished (dead) games that were never settled: verify them so their scores count. */
  async settleFinished(ids: bigint[]): Promise<number> {
    if (this.dryRun || !this.executor) return 0;
    let n = 0;
    // newest first: the latest games matter most when STRK runs short
    for (const id of [...ids].reverse()) {
      if (await this.chain.isVerified(id).catch(() => true)) continue;
      try {
        const st = await this.readState(id);
        if (!st.started || st.adventurer.health > 0) continue;
      } catch {
        continue;
      }
      if ((await this.finish(id))?.tx) n++;
    }
    return n;
  }
}
