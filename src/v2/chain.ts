// V2 (commit-reveal) game client for the lootsurvivor.io game core on mainnet.
// Reads go through raw starknet_call so they do not depend on ABI parsing of the (frequently upgraded) core.
import { hash, num, type RpcProvider } from 'starknet';
import type { Executor } from '../chain/client.ts';
import { retry, sleep } from '../chain/rpc.ts';
import { rollingFold, rollingStart, unpackAdventurer, unpackBag, type V2Adventurer, type V2Item } from './protocol.ts';

const ACTION_COMMITTED = BigInt(hash.getSelectorFromName('ActionCommitted'));
const TRANSFER = BigInt(hash.getSelectorFromName('Transfer'));
const hex = (v: bigint | number) => num.toHex(v);

export interface Transcript {
  gameId: bigint;
  packets: bigint[];
  blocks: bigint[];
  rolling: bigint;
}

export interface V2State {
  gameId: bigint;
  started: boolean;
  terminal: boolean;
  adventurer: V2Adventurer | null;
  bag: V2Item[];
  packets: number;
  /** false while the entropy block of the last commit is not produced yet */
  ready: boolean;
}

export class V2Chain {
  readonly provider: RpcProvider;
  readonly core: string;
  private offset: bigint | null = null;
  private blockHashes = new Map<bigint, bigint>();
  private mintBlocks = new Map<bigint, number>();

  constructor(provider: RpcProvider, core: string) {
    this.provider = provider;
    this.core = core;
  }

  async call(entrypoint: string, calldata: (bigint | number | string)[] = []): Promise<bigint[]> {
    const res = await retry(() => this.provider.callContract({ contractAddress: this.core, entrypoint, calldata: calldata.map((x) => hex(BigInt(x))) }), {
      label: `v2 ${entrypoint}`,
      tries: 3,
    });
    return res.map((x) => BigInt(x));
  }

  async entropyOffset(): Promise<bigint> {
    if (this.offset === null) [this.offset] = await this.call('get_entropy_block_offset');
    return this.offset!;
  }

  async commitment(gameId: bigint): Promise<bigint> {
    return (await this.call('get_commitment', [gameId]))[0];
  }

  async gameOver(gameId: bigint): Promise<boolean> {
    return (await this.call('game_over', [gameId]))[0] === 1n;
  }

  async settingsId(gameId: bigint): Promise<number> {
    return Number((await this.call('settings_id', [gameId]))[0]);
  }

  async score(gameId: bigint): Promise<number> {
    return Number((await this.call('score', [gameId]))[0]);
  }

  /** Game tokens owned by an address (the V2 core is the ERC721 token contract). */
  async ownedGames(owner: string, limit = 200): Promise<bigint[]> {
    const [lo, hi] = await this.call('balance_of', [owner]);
    const n = Number(lo + (hi << 128n));
    const out: bigint[] = [];
    for (let i = Math.max(0, n - limit); i < n; i++) {
      const [a, b] = await this.call('token_of_owner_by_index', [owner, i, 0]);
      out.push(a + (b << 128n));
    }
    return out;
  }

  async mintBlock(gameId: bigint): Promise<number> {
    if (!this.mintBlocks.has(gameId)) {
      let b = 0;
      try {
        b = Number((await this.call('minted_at_block_number', [gameId]))[0]);
      } catch {
        b = 0;
      }
      this.mintBlocks.set(gameId, b);
    }
    return this.mintBlocks.get(gameId)!;
  }

  /** All committed packets of a game, rebuilt from ActionCommitted events and checked against get_commitment. */
  async transcript(gameId: bigint): Promise<Transcript> {
    const from = await this.mintBlock(gameId);
    const events: Array<{ block: number; data: bigint[] }> = [];
    let token: string | undefined;
    do {
      const page = await retry(
        () =>
          this.provider.getEvents({
            address: this.core,
            keys: [[hex(ACTION_COMMITTED)], [hex(gameId)]],
            from_block: { block_number: from },
            to_block: 'latest',
            chunk_size: 256,
            ...(token ? { continuation_token: token } : {}),
          } as never),
        { label: 'v2 events', tries: 3 },
      );
      const p = page as unknown as { events: Array<{ block_number?: number; data: string[] }>; continuation_token?: string };
      for (const e of p.events) if (e.block_number !== undefined) events.push({ block: e.block_number, data: e.data.map((x) => BigInt(x)) });
      token = p.continuation_token;
    } while (token);
    events.sort((a, b) => a.block - b.block);
    const packets: bigint[] = [];
    const blocks: bigint[] = [];
    let rolling = rollingStart(gameId);
    for (const e of events) {
      const n = Number(e.data[0]);
      for (let k = 1; k <= n; k++) {
        packets.push(e.data[k]);
        blocks.push(BigInt(e.block));
        rolling = rollingFold(rolling, e.data[k], BigInt(e.block));
      }
    }
    const onchain = await this.commitment(gameId);
    if (packets.length && onchain !== rolling) throw new Error(`transcript of ${gameId} does not match the on-chain commitment (events incomplete?)`);
    return { gameId, packets, blocks, rolling: packets.length ? rolling : 0n };
  }

  /** Hash of block n, or null if it does not exist yet (RPC errors such as rate limits are retried, not "missing"). */
  async blockHash(n: bigint): Promise<bigint | null> {
    const cached = this.blockHashes.get(n);
    if (cached !== undefined) return cached;
    if (n > BigInt(await this.latestBlock())) return null;
    const b = (await retry(() => this.provider.getBlockWithTxHashes(Number(n)), { label: 'v2 block', tries: 5 }).catch(() => null)) as { block_hash?: string; status?: string } | null;
    if (!b?.block_hash || b.status === 'PRE_CONFIRMED' || b.status === 'PENDING') return null;
    const h = BigInt(b.block_hash);
    this.blockHashes.set(n, h);
    return h;
  }

  private latest = { n: 0, at: 0 };
  async latestBlock(): Promise<number> {
    if (Date.now() - this.latest.at > 2000) {
      this.latest = { n: Number(await retry(() => this.provider.getBlockNumber(), { label: 'v2 block number', tries: 5 })), at: Date.now() };
    }
    return this.latest.n;
  }

  /** Authoritative state: the core replays the transcript (with the entropy block hashes) and returns packed state. */
  async state(gameId: bigint, t?: Transcript): Promise<V2State> {
    const tr = t ?? (await this.transcript(gameId));
    const offset = await this.entropyOffset();
    const hashes: bigint[] = [];
    for (const b of tr.blocks) {
      const h = await this.blockHash(b + offset);
      if (h === null) return { gameId, started: tr.packets.length > 0, terminal: false, adventurer: null, bag: [], packets: tr.packets.length, ready: false };
      hashes.push(h);
    }
    const r = await this.call('replay_transcript', [gameId, tr.packets.length, ...tr.packets, tr.blocks.length, ...tr.blocks, hashes.length, ...hashes, tr.packets.length]);
    if (r.length !== 8) throw new Error(`replay_transcript returned ${r.length} values`);
    const [, , , packedAdventurer, packedBag, terminal] = r;
    const started = packedAdventurer !== 0n;
    return {
      gameId,
      started,
      terminal: terminal === 1n,
      adventurer: started ? unpackAdventurer(packedAdventurer) : null,
      bag: unpackBag(packedBag),
      packets: tr.packets.length,
      ready: true,
    };
  }

  /**
   * Wait until the entropy block of the last commit exists (outcomes become known). A fresh game has no commit yet:
   * its start depends on the mint block ("bh: commit unripe" until mint block + offset is produced).
   */
  async waitReady(t: Transcript, timeoutMs = 300_000): Promise<void> {
    const base = t.blocks.length ? t.blocks[t.blocks.length - 1] : BigInt(await this.mintBlock(t.gameId));
    if (!base) return;
    const target = base + (await this.entropyOffset());
    const until = Date.now() + timeoutMs;
    while (Date.now() < until) {
      if ((await this.blockHash(target)) !== null) return;
      await sleep(3000);
    }
    throw new Error(`entropy block ${target} not produced within ${timeoutMs / 1000}s`);
  }

  /** Commit packets; returns the block they were committed in. */
  async commit(executor: Executor, t: Transcript, packets: bigint[]): Promise<{ txHash: string; block: bigint; transcript: Transcript }> {
    const expected = t.packets.length ? t.rolling : 0n;
    const call = { contractAddress: this.core, entrypoint: 'commit_actions', calldata: [hex(t.gameId), hex(expected), hex(packets.length), ...packets.map(hex)] };
    const { transaction_hash } = await executor.execute([call]);
    const receipt = (await this.provider.waitForTransaction(transaction_hash, { retryInterval: 1500 })) as unknown as {
      execution_status?: string;
      revert_reason?: string;
      block_number?: number;
      events?: Array<{ from_address: string; keys: string[]; data: string[] }>;
    };
    if (receipt.execution_status === 'REVERTED') throw new Error(`commit_actions reverted: ${String(receipt.revert_reason ?? '').slice(0, 300)}`);
    let block = receipt.block_number !== undefined ? BigInt(receipt.block_number) : null;
    if (block === null) {
      const tx = (await this.provider.getTransactionReceipt(transaction_hash)) as unknown as { block_number?: number };
      block = BigInt(tx.block_number ?? 0);
    }
    let rolling = t.packets.length ? t.rolling : rollingStart(t.gameId);
    for (const p of packets) rolling = rollingFold(rolling, p, block);
    return {
      txHash: transaction_hash,
      block,
      transcript: { gameId: t.gameId, packets: [...t.packets, ...packets], blocks: [...t.blocks, ...packets.map(() => block!)], rolling },
    };
  }

  /** Settle a finished game so its score counts (verify_game with the full transcript). */
  async verify(executor: Executor, t: Transcript): Promise<string> {
    const call = {
      contractAddress: this.core,
      entrypoint: 'verify_game',
      calldata: [hex(t.gameId), hex(t.packets.length), ...t.packets.map(hex), hex(t.blocks.length), ...t.blocks.map(hex)],
    };
    const { transaction_hash } = await executor.execute([call]);
    await this.provider.waitForTransaction(transaction_hash, { retryInterval: 2000 });
    return transaction_hash;
  }

  /**
   * Enter a dungeon that mints a game to the caller (e.g. Proving Grounds: free `enter_dungeon()`).
   * Returns the new game id from the core's mint Transfer event (falls back to the newest owned token).
   */
  async enterDungeon(executor: Executor, dungeon: string): Promise<bigint> {
    const { transaction_hash } = await executor.execute([{ contractAddress: dungeon, entrypoint: 'enter_dungeon', calldata: [] }]);
    const receipt = (await this.provider.waitForTransaction(transaction_hash, { retryInterval: 2000 })) as unknown as {
      execution_status?: string;
      revert_reason?: string;
      events?: Array<{ from_address: string; keys: string[]; data: string[] }>;
    };
    if (receipt.execution_status === 'REVERTED') throw new Error(`enter_dungeon reverted: ${String(receipt.revert_reason ?? '').slice(0, 300)}`);
    const me = BigInt(executor.address);
    for (const e of receipt.events ?? []) {
      if (BigInt(e.from_address) !== BigInt(this.core) || BigInt(e.keys[0] ?? 0) !== TRANSFER) continue;
      // ERC721 Transfer: keys [selector, from, to, id.low, id.high]
      const k = e.keys.map((x) => BigInt(x));
      if (k.length >= 5 && k[1] === 0n && k[2] === me) return k[3] + (k[4] << 128n);
    }
    const owned = await this.ownedGames(executor.address, 1);
    if (!owned.length) throw new Error(`enter_dungeon succeeded (${transaction_hash}) but no game was found on the account`);
    return owned[owned.length - 1];
  }
}
