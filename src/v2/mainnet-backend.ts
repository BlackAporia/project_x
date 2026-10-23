// Mainnet backend for V2 (commit-reveal) games: plays the account's own game tokens on the lootsurvivor.io game core.
import { defaultSettings, newGameState, startGame } from '../game/engine.ts';
import { FastRandom } from '../game/rng.ts';
import type { Action, GameState, Item, Settings } from '../game/types.ts';
import { decodeAdventurer } from '../chain/state.ts';
import type { Executor } from '../chain/client.ts';
import { dungeonEngineSettings, loadSnapshot } from '../game/dungeons.ts';
import type { Backend } from '../runner/play.ts';
import { V2Chain, type Transcript } from './chain.ts';
import { specialsSeed } from './backend.ts';
import { actionsToInstructions, currentBeastV2, marketItemsV2, packetize, type MarketConfig } from './protocol.ts';

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

  constructor(opts: { chain: V2Chain; executor: Executor | null; dryRun: boolean; games: bigint[]; log?: (m: string) => void }) {
    this.chain = opts.chain;
    this.executor = opts.executor;
    this.dryRun = opts.dryRun || !opts.executor;
    this.account = opts.executor?.address;
    this.queue = opts.games;
    this.log = opts.log ?? ((m) => console.log(m));
  }

  async nextGame(): Promise<bigint | null> {
    while (this.queue.length) {
      const id = this.queue.shift()!;
      if (await this.chain.gameOver(id).catch(() => false)) continue;
      return id;
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
    await this.chain.waitReady(c.transcript);
    const st = await this.chain.state(id, c.transcript);
    if (!st.ready) throw new Error('entropy block not produced yet');
    if (!st.started || !st.adventurer) {
      // not played yet: the template adventurer of the dungeon (V2 games start implicitly with the first packet)
      const s0 = newGameState(id, c.settings);
      return startGame(s0, 46, new FastRandom(Number(id % 1000003n))).state;
    }
    const s = newGameState(id, c.settings);
    const adv = decodeAdventurer(st.adventurer);
    adv.itemSpecialsSeed = specialsSeed(st.adventurer.item_specials_salt, id.toString());
    const bag: Item[] = st.bag.map((b) => ({ id: b.id, xp: b.xp }));
    s.adventurer = adv;
    s.bag = bag;
    s.started = true;
    s.market = c.market ? marketItemsV2(st.adventurer.level_salt, id, c.market) : Array.from({ length: 101 }, (_, i) => i + 1);
    s.beast = currentBeastV2(st.adventurer, id);
    if (st.terminal && adv.health > 0) adv.health = 0; // surrendered / finished
    return s;
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
  async finish(id: bigint): Promise<string | null> {
    if (this.dryRun || !this.executor) return null;
    const c = await this.ctx(id);
    try {
      const tx = await this.chain.verify(this.executor, c.transcript);
      this.log(`[v2] game ${id} verified (${tx})`);
      return tx;
    } catch (e) {
      this.log(`[v2] verify_game failed for ${id}: ${(e as Error).message.slice(0, 200)}`);
      return null;
    }
  }
}
