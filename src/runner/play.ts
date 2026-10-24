// The bot's main loop: read state -> policy decision -> transactions -> log, for any backend (sim/practice/mainnet).
import { level, loadAssets, maxHealth } from '../game/adventurer.ts';
import { beastName } from '../game/beast.ts';
import { applyAction, cloneState, currentBeast, isDead, newGameState } from '../game/engine.ts';
import { greatness, lootInfo } from '../game/loot.ts';
import { ExactRandom, FastRandom, type RandomSource } from '../game/rng.ts';
import type { Action, GameEvent, GameState } from '../game/types.ts';
import { Policy } from '../ai/policy.ts';
import type { PolicyParams } from '../ai/params.ts';
import type { GameClient, Executor } from '../chain/client.ts';
import { DataStore, type DecisionLog, type GameRecord, type LiveStatus, type RunRecord } from './datastore.ts';

export interface Backend {
  mode: 'practice' | 'mainnet' | 'sim';
  account?: string;
  /** outcomes can be predicted exactly (no VRF, no game seed) */
  exact: boolean;
  /** dry run: decide but never send transactions */
  dryRun: boolean;
  /** dungeon / settings label recorded with every game */
  dungeon?: string;
  nextGame(): Promise<bigint | null>;
  readState(id: bigint): Promise<GameState>;
  /** returns tx hashes and the actions actually sent (a decision can be cut after its first random action) */
  execute(id: bigint, actions: Action[], state: GameState): Promise<{ sent: Action[]; txs: string[]; reverted?: string; events?: GameEvent[] }>;
  /** optional: settle a finished game (V2 verify_game) */
  finish?(id: bigint): Promise<string | null>;
}

export function describeAction(a: Action): string {
  switch (a.type) {
    case 'start':
      return `start(${lootInfo(a.weapon).name})`;
    case 'explore':
      return a.tillBeast ? 'explore(till beast)' : 'explore';
    case 'attack':
      return a.toTheDeath ? 'attack(to death)' : 'attack';
    case 'flee':
      return a.toTheDeath ? 'flee(to death)' : 'flee';
    case 'equip':
      return `equip(${a.items.map((i) => lootInfo(i).name).join(', ')})`;
    case 'drop':
      return `drop(${a.items.map((i) => lootInfo(i).name).join(', ')})`;
    case 'buy':
      return `buy(${[a.potions ? `${a.potions} potion${a.potions > 1 ? 's' : ''}` : '', ...a.items.map((p) => lootInfo(p.itemId).name)].filter(Boolean).join(', ')})`;
    case 'stats':
      return `stats(${Object.entries(a.stats).filter(([, v]) => v).map(([k, v]) => `${k}+${v}`).join(' ')})`;
  }
}

function gearList(s: GameState): string[] {
  const a = s.adventurer;
  return [1, 2, 3, 4, 5, 6, 7, 8].map((sl) => {
    const it = a.equipment[sl];
    if (!it.id) return '-';
    const info = lootInfo(it.id);
    return `${info.name} T${info.tier} G${greatness(it.xp)}`;
  });
}

// ---------------------------------------------------------------------------------------------
// backends
// ---------------------------------------------------------------------------------------------

export class SimBackend implements Backend {
  readonly mode = 'sim' as const;
  readonly exact = true;
  readonly dryRun = false;
  private states = new Map<bigint, GameState>();
  private rngs = new Map<bigint, RandomSource>();
  private next: number;

  constructor(seed: number) {
    this.next = seed;
  }

  async nextGame(): Promise<bigint> {
    const id = BigInt(this.next++);
    this.states.set(id, newGameState(id));
    this.rngs.set(id, new FastRandom(Number(id)));
    return id;
  }

  async readState(id: bigint): Promise<GameState> {
    return cloneState(this.states.get(id)!);
  }

  async execute(id: bigint, actions: Action[]): Promise<{ sent: Action[]; txs: string[]; events: GameEvent[] }> {
    let s = this.states.get(id)!;
    const events: GameEvent[] = [];
    for (const a of actions) {
      const r = applyAction(s, a, this.rngs.get(id)!);
      s = r.state;
      events.push(...r.events);
      if (isDead(s)) break;
    }
    this.states.set(id, s);
    return { sent: actions, txs: [], events };
  }
}

export class ChainBackend implements Backend {
  readonly mode: 'practice' | 'mainnet';
  readonly exact: boolean;
  readonly dryRun: boolean;
  readonly account?: string;
  private client: GameClient;
  private executor: Executor | null;
  private queue: bigint[] = [];
  private mint: (() => Promise<bigint | null>) | null;
  readonly dungeon?: string;

  constructor(opts: { mode: 'practice' | 'mainnet'; client: GameClient; executor: Executor | null; dryRun: boolean; games?: bigint[]; mint?: () => Promise<bigint | null>; dungeon?: string }) {
    this.mode = opts.mode;
    this.client = opts.client;
    this.executor = opts.executor;
    this.dryRun = opts.dryRun || !opts.executor;
    this.exact = opts.mode === 'practice';
    this.account = opts.executor?.address;
    this.queue = opts.games ?? [];
    this.mint = opts.mint ?? null;
    this.dungeon = opts.dungeon;
  }

  async nextGame(): Promise<bigint | null> {
    if (this.queue.length) return this.queue.shift()!;
    if (this.mint && !this.dryRun) return this.mint();
    return null;
  }

  readState(id: bigint): Promise<GameState> {
    return this.client.readState(id);
  }

  async execute(id: bigint, actions: Action[], state: GameState): Promise<{ sent: Action[]; txs: string[]; reverted?: string }> {
    if (this.dryRun || !this.executor) return { sent: [], txs: [] };
    const plan = this.client.planTransactions(id, actions, state);
    const sent: Action[] = [];
    const txs: string[] = [];
    for (const tx of plan) {
      const r = await this.client.send(this.executor, tx);
      txs.push(r.txHash);
      if (r.status === 'reverted') return { sent, txs, reverted: r.revertReason ?? 'reverted' };
      sent.push(...tx.actions);
    }
    return { sent, txs };
  }
}

// ---------------------------------------------------------------------------------------------
// loop
// ---------------------------------------------------------------------------------------------

export interface PlayOptions {
  backend: Backend;
  params: PolicyParams;
  store: DataStore;
  minutes: number;
  maxGames: number;
  /** extra minutes allowed to finish the game in progress after the time budget */
  graceMinutes?: number;
  log?: (msg: string) => void;
}

export async function playLoop(opts: PlayOptions): Promise<RunRecord> {
  const { backend, store, params } = opts;
  const log = opts.log ?? ((m: string) => console.log(m));
  const policy = new Policy(params, { fast: backend.mode === 'sim' });
  const t0 = Date.now();
  const deadline = t0 + opts.minutes * 60_000;
  const hardDeadline = deadline + (opts.graceMinutes ?? 10) * 60_000;
  const run: RunRecord = {
    id: new Date(t0).toISOString().replace(/[:.]/g, '-'),
    mode: backend.mode + (backend.dryRun ? '-dry' : ''),
    started: new Date(t0).toISOString(),
    games: 0,
    bestXp: 0,
    meanXp: 0,
    errors: 0,
    policy: params.version,
    dungeon: backend.dungeon,
  };
  const finished: number[] = [];
  const recent: DecisionLog[] = [];
  const status: LiveStatus = { updated: '', mode: run.mode, running: true, runId: run.id, account: backend.account, recent };
  const flush = () => {
    status.updated = new Date().toISOString();
    store.writeStatus(status);
  };
  store.upsertRun(run);

  for (let g = 0; g < opts.maxGames && Date.now() < deadline; g++) {
    let id: bigint | null;
    try {
      id = await backend.nextGame();
    } catch (e) {
      log(`[${backend.mode}] cannot get a game: ${(e as Error).message}`);
      run.errors++;
      status.message = `cannot get a game: ${(e as Error).message}`.slice(0, 300);
      break;
    }
    if (id === null) {
      status.message = backend.mode === 'mainnet' ? 'no unplayed games on the account (buy/mint games in the UI)' : 'no more games';
      log(`[${backend.mode}] ${status.message}`);
      break;
    }
    const rec = await playGame(id, backend, policy, store, { deadline: hardDeadline, log, status, flush, recent });
    if (rec.status === 'dead') {
      finished.push(rec.xp);
      run.games++;
      run.bestXp = Math.max(run.bestXp, rec.xp);
      run.meanXp = Math.round(finished.reduce((s, x) => s + x, 0) / finished.length);
    }
    if (rec.status === 'error') run.errors++;
    run.ended = new Date().toISOString();
    store.upsertRun(run);
    if (backend.dryRun && backend.mode === 'mainnet' && g > 25) break;
  }
  status.running = false;
  status.current = undefined;
  flush();
  run.ended = new Date().toISOString();
  store.upsertRun(run);
  log(`[${backend.mode}] run finished: ${run.games} games, best ${run.bestXp} xp, mean ${run.meanXp}, errors ${run.errors}`);
  return run;
}

async function playGame(
  id: bigint,
  backend: Backend,
  policy: Policy,
  store: DataStore,
  ctx: { deadline: number; log: (m: string) => void; status: LiveStatus; flush: () => void; recent: DecisionLog[] },
): Promise<GameRecord> {
  const started = new Date();
  const decisions: DecisionLog[] = [];
  const rec: GameRecord = {
    id: id.toString(),
    mode: backend.mode,
    dungeon: backend.dungeon,
    xp: 0,
    level: 0,
    deathCause: '',
    decisions: 0,
    transactions: 0,
    reverts: 0,
    beastsKilled: 0,
    fled: 0,
    maxGold: 0,
    started: started.toISOString(),
    ended: started.toISOString(),
    seconds: 0,
    policy: policy.params.version,
    predictionChecks: 0,
    predictionMismatches: 0,
    status: 'in_progress',
  };
  const exactRng = new ExactRandom();
  let state: GameState;
  try {
    state = await backend.readState(id);
  } catch (e) {
    ctx.log(`[${backend.mode}] game ${id}: cannot read state: ${(e as Error).message}`);
    rec.status = 'error';
    rec.deathCause = 'read error';
    return rec;
  }
  if (isDead(state) && state.started) {
    rec.status = 'dead';
    rec.xp = state.adventurer.xp;
    rec.level = level(state.adventurer);
    rec.deathCause = 'already dead';
    return rec;
  }
  ctx.log(`[${backend.mode}] game ${id}: ${state.started ? `resuming at level ${level(state.adventurer)} (${state.adventurer.xp} xp)` : 'starting'}`);
  let consecutiveErrors = 0;

  while (!(state.started && isDead(state))) {
    if (Date.now() > ctx.deadline) {
      rec.status = 'in_progress';
      break;
    }
    const d = policy.decide(state);
    if (d.phase === 'dead' || d.actions.length === 0) break;
    const loaded = loadAssets(state.adventurer, state.bag);
    const entry: DecisionLog = {
      n: rec.decisions,
      t: new Date().toISOString(),
      level: level(state.adventurer),
      xp: state.adventurer.xp,
      hp: state.adventurer.health,
      maxHp: maxHealth(loaded.stats),
      gold: state.adventurer.gold,
      phase: d.phase,
      reason: d.reason,
      actions: d.actions.map(describeAction).join(' + '),
    };
    const beast = state.adventurer.beastHealth > 0 ? beastName(currentBeast(state, exactRng)) : undefined;
    ctx.status.current = {
      id: rec.id,
      level: entry.level,
      xp: entry.xp,
      hp: entry.hp,
      maxHp: entry.maxHp,
      gold: entry.gold,
      gear: gearList(state),
      stats: { ...loaded.stats },
      beast,
      lastReason: d.reason,
    };

    if (backend.dryRun) {
      decisions.push(entry);
      pushRecent(ctx.recent, entry);
      ctx.flush();
      rec.status = 'dry_run';
      ctx.log(`  [dry] L${entry.level} xp=${entry.xp} hp=${entry.hp}/${entry.maxHp} -> ${entry.actions} | ${d.reason}`);
      break;
    }

    let result: { sent: Action[]; txs: string[]; reverted?: string; events?: GameEvent[] };
    try {
      result = await backend.execute(id, d.actions, state);
    } catch (e) {
      result = { sent: [], txs: [], reverted: (e as Error).message };
    }
    rec.transactions += result.txs.length;
    entry.tx = result.txs[result.txs.length - 1];
    entry.ok = !result.reverted;
    if (result.reverted) {
      entry.error = result.reverted.slice(0, 300);
      rec.reverts++;
      consecutiveErrors++;
      ctx.log(`  ! ${entry.actions}: ${entry.error}`);
    } else consecutiveErrors = 0;

    // exact prediction of what the chain should now show (practice) -> engine validation + event details
    let predicted: GameState | null = null;
    const events: GameEvent[] = result.events ? [...result.events] : [];
    if (backend.exact && backend.mode !== 'sim' && result.sent.length) {
      try {
        let p = state;
        for (const a of result.sent) {
          const r = applyAction(p, a, exactRng);
          p = r.state;
          events.push(...r.events);
          if (isDead(p)) break;
        }
        predicted = p;
      } catch {
        predicted = null;
      }
    }

    let next: GameState;
    try {
      next = await backend.readState(id);
    } catch (e) {
      ctx.log(`  ! state read failed: ${(e as Error).message}`);
      consecutiveErrors++;
      if (consecutiveErrors >= 4) {
        rec.status = 'error';
        break;
      }
      continue;
    }
    if (predicted) {
      rec.predictionChecks!++;
      const a = predicted.adventurer;
      const b = next.adventurer;
      if (a.xp !== b.xp || a.health !== b.health || a.gold !== b.gold || a.beastHealth !== b.beastHealth) {
        rec.predictionMismatches!++;
        ctx.log(`  ~ prediction mismatch: predicted xp/hp/gold/beast ${a.xp}/${a.health}/${a.gold}/${a.beastHealth}, chain ${b.xp}/${b.health}/${b.gold}/${b.beastHealth}`);
      }
    }
    if (backend.mode === 'sim' || predicted) {
      for (const e of events) {
        if (e.type === 'defeated_beast') rec.beastsKilled++;
        else if (e.type === 'fled_beast') rec.fled++;
        else if (e.type === 'death') rec.deathCause = e.cause;
      }
    } else {
      if (state.adventurer.beastHealth > 0 && next.adventurer.beastHealth === 0 && next.adventurer.health > 0) {
        if (next.adventurer.xp > state.adventurer.xp) rec.beastsKilled++;
        else rec.fled++;
      }
    }
    if (isDead(next) && next.started && (rec.deathCause === 'beast' || rec.deathCause === 'ambush')) {
      const killer = beast ?? (next.adventurer.beastHealth > 0 ? beastName(currentBeast(next, exactRng)) : null);
      if (killer) rec.deathCause = rec.deathCause === 'ambush' ? `ambush by ${killer}` : killer;
    }
    if (isDead(next) && next.started && !rec.deathCause) {
      rec.deathCause = state.adventurer.beastHealth > 0 ? beast ?? 'beast' : next.adventurer.beastHealth > 0 ? `ambush by ${beastName(currentBeast(next, exactRng))}` : 'obstacle';
    }
    rec.decisions++;
    rec.maxGold = Math.max(rec.maxGold, next.adventurer.gold);
    decisions.push(entry);
    pushRecent(ctx.recent, entry);
    if (rec.decisions % 3 === 0 || isDead(next)) ctx.flush();
    if (backend.mode !== 'sim') ctx.log(`  L${entry.level} xp=${entry.xp} hp=${entry.hp}/${entry.maxHp} g=${entry.gold} -> ${entry.actions}${entry.ok ? '' : ' (reverted)'} | ${d.reason}`);
    state = next;
    if (consecutiveErrors >= 4) {
      rec.status = 'error';
      rec.deathCause = rec.deathCause || 'too many failed transactions';
      break;
    }
  }

  if (state.started && isDead(state)) {
    rec.status = 'dead';
    if (backend.finish && !backend.dryRun) await backend.finish(id);
  }
  rec.xp = state.adventurer.xp;
  rec.level = level(state.adventurer);
  rec.ended = new Date().toISOString();
  rec.seconds = Math.round((Date.now() - started.getTime()) / 1000);
  if (rec.status !== 'dry_run') {
    store.upsertGame(rec);
    store.writeGameLog(backend.mode, rec.id, rec, decisions);
  }
  ctx.log(`[${backend.mode}] game ${id} ${rec.status}: level ${rec.level}, ${rec.xp} xp${rec.deathCause ? ` (${rec.deathCause})` : ''}`);
  return rec;
}

function pushRecent(list: DecisionLog[], e: DecisionLog): void {
  list.push(e);
  if (list.length > 40) list.splice(0, list.length - 40);
}
