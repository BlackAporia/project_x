// Generic Loot Survivor game client: reads on-chain state into the engine format and turns policy actions into
// transactions. Works for the free practice dungeon (burner account, no VRF) and mainnet (Cartridge session + VRF).
// Calldata is encoded from the live ABI, so renamed/reordered arguments in a redeploy are handled automatically.
import { CairoOption, CairoOptionVariant, CallData, Contract, hash, type Abi, type Call, type RawArgs, type RpcProvider } from 'starknet';
import { poseidon } from '../game/rng.ts';
import type { Action, GameState, ItemPurchase, Stats } from '../game/types.ts';
import { abiFunctions, fetchAbi, findFunction, structMembers, type AbiFunction } from './abi.ts';
import { retry, sleep } from './rpc.ts';
import { encodeStats, toEngineState, type ChainSnapshot } from './state.ts';

export interface Executor {
  address: string;
  execute(calls: Call[]): Promise<{ transaction_hash: string }>;
}

export interface ClientAddresses {
  game: string;
  token?: string;
  settings?: string;
  adventurer?: string;
}

export interface VrfConfig {
  provider: string;
  /** contract that calls consume_random (the game contract) */
  caller: string;
}

export interface TxResult {
  txHash: string;
  actions: Action[];
  status: 'ok' | 'reverted';
  revertReason?: string;
  events: number;
}

const ENTRYPOINTS: Record<Action['type'], string[]> = {
  start: ['start_game'],
  explore: ['explore'],
  attack: ['attack'],
  flee: ['flee'],
  equip: ['equip'],
  drop: ['drop', 'drop_items'],
  buy: ['buy_items'],
  stats: ['select_stat_upgrades'],
};

/** Actions whose execution consumes randomness (need their own transaction + VRF request on mainnet). */
export function consumesRandomness(a: Action, inBattle: boolean): boolean {
  return a.type === 'start' || a.type === 'explore' || a.type === 'attack' || a.type === 'flee' || (a.type === 'equip' && inBattle);
}

/** Same salts as the official client (utils.ts generateSalt / generateBattleSalt). */
export function exploreSalt(gameId: bigint, xp: number): bigint {
  return poseidon([BigInt(xp), gameId]);
}
export function battleSalt(gameId: bigint, xp: number, actionCount: number): bigint {
  return poseidon([BigInt(xp), gameId, BigInt(actionCount + 1)]);
}

export class GameClient {
  readonly provider: RpcProvider;
  readonly addresses: ClientAddresses;
  readonly vrf: VrfConfig | null;
  private abis: Record<string, Abi> = {};
  private contracts: Record<string, Contract> = {};

  constructor(provider: RpcProvider, addresses: ClientAddresses, vrf: VrfConfig | null, abis: Partial<Record<keyof ClientAddresses, Abi>> = {}) {
    this.provider = provider;
    this.addresses = addresses;
    this.vrf = vrf;
    for (const [k, v] of Object.entries(abis)) if (v) this.abis[k] = v;
  }

  /** Load ABIs that were not supplied (from chain). */
  async init(): Promise<void> {
    for (const key of Object.keys(this.addresses) as Array<keyof ClientAddresses>) {
      const addr = this.addresses[key];
      if (!addr) continue;
      if (!this.abis[key]) {
        try {
          this.abis[key] = await retry(() => fetchAbi(this.provider, addr), { label: `abi ${key}` });
        } catch (e) {
          if (key === 'game') throw e;
          console.warn(`[client] no ABI for ${key} (${addr}): ${(e as Error).message}`);
          continue;
        }
      }
      this.contracts[key] = new Contract({ abi: this.abis[key], address: addr, providerOrAccount: this.provider });
    }
  }

  abi(key: keyof ClientAddresses): Abi | undefined {
    return this.abis[key];
  }

  private async view(key: keyof ClientAddresses, names: string[], args: unknown[]): Promise<unknown | undefined> {
    const abi = this.abis[key];
    const c = this.contracts[key];
    if (!abi || !c) return undefined;
    const fn = findFunction(abi, names);
    if (!fn) return undefined;
    return retry(() => c.call(fn.name, args as never[]), { label: `${key}.${fn.name}`, tries: 3 });
  }

  /** Read the full game state of one adventurer from chain. */
  async readState(gameId: bigint): Promise<GameState> {
    const id = gameId.toString();
    const snap: ChainSnapshot = {};
    const [gameState, settings, adventurer, bag, entropy] = await Promise.all([
      this.view('game', ['get_game_state'], [id]),
      this.view('settings', ['game_settings'], [id]).catch(() => undefined),
      this.view('adventurer', ['get_adventurer'], [id]).catch(() => undefined),
      this.view('adventurer', ['get_bag'], [id]).catch(() => undefined),
      this.view('adventurer', ['get_adventurer_entropy'], [id]).catch(() => undefined),
    ]);
    snap.gameState = gameState;
    snap.settings = settings;
    snap.adventurer = adventurer;
    snap.bag = bag;
    snap.entropy = entropy;
    if (!gameState && !adventurer) throw new Error('could not read game state (no get_game_state / get_adventurer view)');
    return toEngineState(gameId, snap);
  }

  /** Build the calldata of one game action from the live ABI. */
  actionCall(gameId: bigint, action: Action): Call {
    const abi = this.abis.game;
    const fn = findFunction(abi, ENTRYPOINTS[action.type]);
    if (!fn) throw new Error(`game contract has no entrypoint for ${action.type} (have: ${abiFunctions(abi).map((f) => f.name).join(', ')})`);
    const args = buildArgs(abi, fn, gameId, action);
    const calldata = new CallData(abi).compile(fn.name, args as RawArgs);
    return { contractAddress: this.addresses.game, entrypoint: fn.name, calldata };
  }

  vrfCall(salt: bigint): Call {
    if (!this.vrf) throw new Error('VRF not configured');
    // Source::Salt(felt252) is enum variant 1
    return { contractAddress: this.vrf.provider, entrypoint: 'request_random', calldata: [this.vrf.caller, '0x1', '0x' + salt.toString(16)] };
  }

  /**
   * Split a decision into transactions: non-random actions are batched in front of the next random action,
   * each random action gets its own transaction (preceded by request_random when VRF is enabled).
   */
  planTransactions(gameId: bigint, actions: Action[], state: GameState): Array<{ calls: Call[]; actions: Action[] }> {
    const txs: Array<{ calls: Call[]; actions: Action[] }> = [];
    let pending: { calls: Call[]; actions: Action[] } = { calls: [], actions: [] };
    const xp = state.adventurer.xp;
    const actionCount = state.adventurer.actionCount;
    let inBattle = state.adventurer.beastHealth > 0;
    for (const a of actions) {
      if (consumesRandomness(a, inBattle)) {
        const calls: Call[] = [];
        if (this.vrf) {
          if (a.type === 'explore') calls.push(this.vrfCall(exploreSalt(gameId, xp)));
          else if (a.type === 'start') calls.push(this.vrfCall(battleSalt(gameId, 0, 1)));
          else calls.push(this.vrfCall(battleSalt(gameId, xp, actionCount)));
        }
        calls.push(...pending.calls, this.actionCall(gameId, a));
        txs.push({ calls, actions: [...pending.actions, a] });
        pending = { calls: [], actions: [] };
        // anything after a random action is decided on the next state read
        break;
      }
      pending.calls.push(this.actionCall(gameId, a));
      pending.actions.push(a);
      inBattle = inBattle && a.type !== 'flee';
    }
    if (pending.calls.length) txs.push(pending);
    return txs;
  }

  /** Execute and wait; returns one result per transaction. */
  async send(executor: Executor, tx: { calls: Call[]; actions: Action[] }): Promise<TxResult> {
    const { transaction_hash } = await executor.execute(tx.calls);
    const receipt = (await this.waitFor(transaction_hash)) as Record<string, unknown>;
    const status = receipt.execution_status === 'REVERTED' ? 'reverted' : 'ok';
    return {
      txHash: transaction_hash,
      actions: tx.actions,
      status,
      revertReason: status === 'reverted' ? String(receipt.revert_reason ?? '').slice(0, 500) : undefined,
      events: Array.isArray(receipt.events) ? receipt.events.length : 0,
    };
  }

  async waitFor(txHash: string): Promise<unknown> {
    for (let attempt = 0; attempt < 8; attempt++) {
      try {
        return await this.provider.waitForTransaction(txHash, {
          retryInterval: 400,
          successStates: ['PRE_CONFIRMED', 'ACCEPTED_ON_L2', 'ACCEPTED_ON_L1'] as never,
        });
      } catch (e) {
        if (attempt === 7) throw e;
        await sleep(700 * (attempt + 1));
      }
    }
    throw new Error('unreachable');
  }

  /** All game settings ("dungeon" presets) registered in the settings contract, with names. */
  async listSettings(maxCount = 200): Promise<Array<{ id: number; name: string; description: string; settings: unknown }>> {
    const countRaw = await this.view('settings', ['settings_count'], []);
    const count = Math.min(maxCount, Number(countRaw ?? 0));
    const out: Array<{ id: number; name: string; description: string; settings: unknown }> = [];
    for (let id = 0; id <= count; id++) {
      try {
        const d = (await this.view('settings', ['settings_details'], [id])) as Record<string, unknown> | undefined;
        if (!d) continue;
        const name = String(d.name ?? '').trim();
        const settings = d.settings ?? (await this.view('settings', ['setting_details'], [id]));
        if (!name && id !== 0) continue;
        out.push({ id, name, description: String(d.description ?? ''), settings });
      } catch {
        // ids can start at 1 or have gaps
      }
    }
    return out;
  }

  /** Mint a new game token (practice: free). Returns the new adventurer / token id when it can be read from events. */
  async mintGame(executor: Executor, name: string, settingsId: number): Promise<bigint | null> {
    const abi = this.abis.token;
    if (!abi || !this.addresses.token) throw new Error('game token contract not configured');
    const fn = findFunction(abi, ['mint_game', 'mint']);
    if (!fn) throw new Error('token contract has no mint_game');
    const nameFelt = '0x' + Buffer.from(name.slice(0, 31), 'utf8').toString('hex');
    const values: Record<string, unknown> = {};
    for (const inp of fn.inputs) {
      const t = inp.type;
      const n = inp.name;
      if (t.includes('Option')) {
        if (n.includes('name')) values[n] = { Some: nameFelt };
        else if (n.includes('settings')) values[n] = { Some: settingsId };
        else values[n] = { None: {} };
      } else if (t.includes('ContractAddress')) values[n] = executor.address;
      else if (t.includes('bool')) values[n] = false;
      else values[n] = 0;
    }
    const calldata = new CallData(abi).compile(fn.name, toCairoOptions(values, fn) as RawArgs);
    const { transaction_hash } = await executor.execute([{ contractAddress: this.addresses.token, entrypoint: fn.name, calldata }]);
    const receipt = (await this.waitFor(transaction_hash)) as { events?: Array<{ from_address: string; keys: string[]; data: string[] }>; execution_status?: string };
    if (receipt.execution_status === 'REVERTED') throw new Error('mint_game reverted');
    // ERC721 Transfer(from=0, to=executor, token_id u256) is emitted by the token contract
    const transferKey = hash.getSelectorFromName('Transfer');
    for (const ev of receipt.events ?? []) {
      if (BigInt(ev.from_address) !== BigInt(this.addresses.token)) continue;
      const k = ev.keys.map((x) => BigInt(x));
      if (k[0] === BigInt(transferKey) && k.length >= 5) return k[3] + (k[4] << 128n);
      if (k[0] === BigInt(transferKey) && ev.data.length >= 4) return BigInt(ev.data[2]) + (BigInt(ev.data[3]) << 128n);
    }
    // official client: TokenMetadata event with 14 data fields, token id at data[1]
    const meta = (receipt.events ?? []).find((e) => e.data.length === 14);
    return meta ? BigInt(meta.data[1]) : null;
  }
}

function toCairoOptions(values: Record<string, unknown>, fn: AbiFunction): Record<string, unknown> {
  // starknet.js encodes Option via CairoOption; build them lazily to avoid importing enum classes everywhere
  return Object.fromEntries(
    fn.inputs.map((inp) => {
      const v = values[inp.name] as { Some?: unknown; None?: unknown } | unknown;
      if (inp.type.includes('Option') && v && typeof v === 'object') {
        const o = v as { Some?: unknown };
        return [inp.name, 'Some' in o ? optionSome(o.Some) : optionNone()];
      }
      return [inp.name, v];
    }),
  );
}

const optionSome = (v: unknown) => new CairoOption(CairoOptionVariant.Some, v);
const optionNone = () => new CairoOption(CairoOptionVariant.None);

/** Map an engine action onto the live function's inputs by type and name. */
export function buildArgs(abi: Abi, fn: AbiFunction, gameId: bigint, action: Action): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  fn.inputs.forEach((inp, i) => {
    const t = inp.type;
    const n = inp.name.toLowerCase();
    if (i === 0) {
      out[inp.name] = gameId.toString();
      return;
    }
    if (t === 'core::bool') {
      out[inp.name] = action.type === 'explore' ? action.tillBeast : action.type === 'attack' || action.type === 'flee' ? action.toTheDeath : false;
      return;
    }
    const arr = /^core::array::(Array|Span)::<(.+)>$/.exec(t);
    if (arr) {
      const inner = arr[2];
      if (inner === 'core::integer::u8') {
        out[inp.name] = action.type === 'equip' || action.type === 'drop' ? action.items : [];
        return;
      }
      const members = structMembers(abi, inner);
      if (members && action.type === 'buy') {
        out[inp.name] = action.items.map((p: ItemPurchase) => purchaseStruct(members, p));
        return;
      }
      throw new Error(`cannot encode ${fn.name}.${inp.name}: ${t}`);
    }
    const members = structMembers(abi, t);
    if (members && action.type === 'stats') {
      out[inp.name] = statsStruct(members, action.stats);
      return;
    }
    if (t.startsWith('core::integer::')) {
      if (action.type === 'buy') out[inp.name] = action.potions;
      else if (action.type === 'start') out[inp.name] = action.weapon;
      else out[inp.name] = 0;
      return;
    }
    if (n.includes('weapon') && action.type === 'start') {
      out[inp.name] = action.weapon;
      return;
    }
    throw new Error(`cannot encode ${fn.name}.${inp.name}: ${t}`);
  });
  return out;
}

function purchaseStruct(members: Array<{ name: string; type: string }>, p: ItemPurchase): Record<string, unknown> {
  const o: Record<string, unknown> = {};
  for (const m of members) {
    if (m.name.includes('id')) o[m.name] = p.itemId;
    else if (m.name.includes('equip')) o[m.name] = p.equip;
    else o[m.name] = 0;
  }
  return o;
}

function statsStruct(members: Array<{ name: string; type: string }>, stats: Partial<Stats>): Record<string, unknown> {
  const full = encodeStats(stats);
  const o: Record<string, unknown> = {};
  for (const m of members) {
    const key = Object.keys(full).find((k) => k === m.name || k.startsWith(m.name.slice(0, 3)));
    o[m.name] = key ? full[key] : 0;
  }
  return o;
}
