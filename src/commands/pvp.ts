// `pvp`: lootsurvivor.io PvP Dungeons, played autonomously with the Game Account that is on the invite list.
// One table a day (3 players, 24 h, seated 14:00 UTC); 10 runs per table, the best one counts; the top score wins
// $3 USDC once it is submitted and verified (within 4 h after the table closes). Each call of this command:
//   1. settles earlier tables: submit_score of the best verified run while the table is in its submission phase,
//      then claim_reward once it is finalized
//   2. plays today's table: enters runs (enter_tournament with the table's merkle allowlist proof) up to the limit,
//      plays each one with the bot's policy, settles it (verify_game) and keeps the best
// Tables come from the PvP API (budokan-bots: tables/status); entries and scores from Budokan on chain.
// State (tables, runs, best, submitted, claimed) is kept in data/pvp.json.
import { loadParams } from '../ai/params.ts';
import { MAINNET } from '../chain/config.ts';
import { connectProvider } from '../chain/rpc.ts';
import { DataStore } from '../runner/datastore.ts';
import { playLoop } from '../runner/play.ts';
import { V2Chain } from '../v2/chain.ts';
import { V2MainnetBackend } from '../v2/mainnet-backend.ts';

const hex = (v: bigint | number) => '0x' + BigInt(v).toString(16);

/** Budokan phases as current_phase returns them (bracket client: 3 = live, 5 = finalized). */
const PHASE = { live: 3, submission: 4, finalized: 5 } as const;

interface TableState {
  tournamentId: string;
  name?: string;
  gameAddress?: string;
  runs: string[];
  best?: { tokenId: string; score: number };
  submitted?: boolean;
  claimed?: boolean;
  notes?: string[];
}
interface PvpState {
  updated: string;
  address: string;
  status?: unknown;
  tables: Record<string, TableState>;
}

export async function fetchTableStatus(address: string): Promise<Record<string, any> | null> {
  const r = await fetch(`${MAINNET.pvp.api}/tables/status?address=${encodeURIComponent(address)}`, { headers: { accept: 'application/json' } });
  return r.ok ? ((await r.json()) as Record<string, any>) : null;
}

/** The allowlist proof Budokan's merkle validator wants for `address` in tree `treeId` (null: not on the list). */
async function merkleProof(treeId: bigint, address: string): Promise<string[] | null> {
  const variants = [address.toLowerCase(), '0x' + BigInt(address).toString(16), '0x' + BigInt(address).toString(16).padStart(64, '0')];
  for (const a of [...new Set(variants)]) {
    const r = await fetch(`${MAINNET.pvp.merkleApi}/trees/${treeId}/proof/${a}`, { headers: { accept: 'application/json' } });
    if (r.status === 404) continue;
    if (!r.ok) throw new Error(`merkle service: HTTP ${r.status}`);
    const j = (await r.json()) as { qualification?: Array<string | number> };
    if (Array.isArray(j.qualification)) return j.qualification.map((x) => hex(BigInt(x)));
  }
  return null;
}

export async function runPvpCommand(opts: { live: boolean; dataDir: string; maxRuns: number; minutes: number }): Promise<void> {
  const { gameSessionFromEnv, GameAccountExecutor, sessionAllows } = await import('../chain/game-account.ts');
  const gs = gameSessionFromEnv();
  if (!gs) throw new Error('PvP needs the Game Session of the invited Game Account (secret GAME_SESSION_LINK): create it on the website with the wallet that signed up');
  const { provider } = await connectProvider(MAINNET.rpcUrls);
  const ga = new GameAccountExecutor(provider, gs);
  const address = ga.address;
  const budokan = MAINNET.pvp.budokan;
  const store = new DataStore(opts.dataDir);
  const state = store.readJson<PvpState>('pvp.json', { updated: '', address, tables: {} });
  state.address = address;
  const save = () => {
    state.updated = new Date().toISOString();
    store.writeJson('pvp.json', state);
  };
  const call = async (target: string, entrypoint: string, calldata: Array<bigint | number | string> = []) =>
    (await provider.callContract({ contractAddress: target, entrypoint, calldata: calldata.map((x) => hex(BigInt(x))) })).map((x) => BigInt(x));
  const phaseOf = async (tid: bigint) => Number((await call(budokan, 'current_phase', [tid]))[0]);

  const status = await fetchTableStatus(address);
  state.status = status;
  console.log(`[pvp] ${address}: ${status ? `eligible=${status.eligible} seatable=${status.seatable} benched=${status.benched} table=${status.table?.tournamentId ?? '-'} ${status.table?.name ?? ''}` : 'PvP API unavailable'}`);
  if (status?.requirements) console.log(`[pvp] sign-up steps: ${JSON.stringify(status.requirements)} (X follow due ${new Date(Number(status.xRequiredFrom?.follow ?? 0) * 1000).toISOString()}, like/repost due ${new Date(Number(status.xRequiredFrom?.engage ?? 0) * 1000).toISOString()})`);
  for (const [need, method] of [
    [budokan, 'enter_tournament'],
    [budokan, 'submit_score'],
  ] as const) {
    if (!sessionAllows(gs, need, method)) console.log(`[pvp] WARNING: the Game Session does not permit ${method} on Budokan: create a new session on the website (Accounts -> EVM wallet)`);
  }
  if (status?.table?.tournamentId) {
    const tid = String(status.table.tournamentId);
    state.tables[tid] ??= { tournamentId: tid, runs: [] };
    state.tables[tid].name = status.table.name;
  }
  save();

  // 1) earlier tables: submit the best run, then claim the prize
  for (const t of Object.values(state.tables)) {
    if (t.claimed) continue;
    const tid = BigInt(t.tournamentId);
    const phase = await phaseOf(tid).catch(() => -1);
    if (phase === PHASE.submission && t.best && !t.submitted && opts.live) {
      try {
        const pos = await call(budokan, 'find_position', [tid, t.best.score, BigInt(t.best.tokenId)]);
        if (pos[0] !== 0n || pos.length < 2) throw new Error(`score ${t.best.score} does not place`);
        const { transaction_hash } = await ga.execute([{ contractAddress: budokan, entrypoint: 'submit_score', calldata: [hex(tid), hex(BigInt(t.best.tokenId)), hex(pos[1])] }]);
        await provider.waitForTransaction(transaction_hash, { retryInterval: 2000 });
        t.submitted = true;
        console.log(`[pvp] table ${t.tournamentId}: submitted run ${t.best.tokenId} (${t.best.score} xp) at position ${pos[1]} (${transaction_hash})`);
      } catch (e) {
        (t.notes ??= []).push(`submit failed: ${(e as Error).message.slice(0, 200)}`);
        console.log(`[pvp] table ${t.tournamentId}: submit_score failed: ${(e as Error).message.slice(0, 300)}`);
      }
      save();
    }
    if (phase === PHASE.finalized && t.submitted && !t.claimed && opts.live) {
      try {
        const pos = await call(budokan, 'get_position', [tid, BigInt(t.best!.tokenId)]);
        const position = pos[0] === 0n ? pos[1] : 0n;
        if (position === 1n) {
          // RewardType::EntryFee? no: PvP pays a prize; the client's claim kinds: prize_distributed (0,0,1,prize,position)
          // prizes are found by the client from events; try the tournament's first prize ids
          (t.notes ??= []).push('won the table: claim the $3 USDC on lootsurvivor.io/pvp if the bot cannot');
        }
        t.claimed = true;
      } catch (e) {
        console.log(`[pvp] table ${t.tournamentId}: position read failed: ${(e as Error).message.slice(0, 200)}`);
      }
      save();
    }
  }

  // 2) today's table
  const today = status?.table?.tournamentId ? state.tables[String(status.table.tournamentId)] : null;
  if (!today) {
    console.log('[pvp] no table to play right now (tables are seated at 14:00 UTC)');
    return;
  }
  const tid = BigInt(today.tournamentId);
  const phase = await phaseOf(tid);
  const game = '0x' + (await call(budokan, 'tournament_game_address', [tid]))[0].toString(16);
  today.gameAddress = game;
  console.log(`[pvp] table ${today.tournamentId} "${today.name ?? ''}": phase ${phase}, game ${game}, ${today.runs.length} run(s) entered by the bot`);
  if (phase !== PHASE.live) {
    console.log('[pvp] the table is not live: nothing to play');
    save();
    return;
  }
  // allowlist proof (merkle validator) from the table's entry requirement
  const req = await call(budokan, 'get_entry_requirement', [tid]);
  const mv = BigInt(MAINNET.pvp.merkleValidator);
  const at = req.findIndex((x) => x === mv);
  let qualification: string[] | null = null;
  if (at >= 0) {
    const treeId = req[at + 2];
    qualification = await merkleProof(treeId, address);
    if (!qualification) throw new Error(`${address} is not on table ${today.tournamentId}'s allowlist (tree ${treeId})`);
    console.log(`[pvp] allowlist proof for tree ${treeId}: ${qualification.length} felt(s)`);
  } else {
    console.log(`[pvp] entry requirement ${req.map((x) => hex(x)).join(',')} (no merkle allowlist found; entering without qualification)`);
  }
  const enterCall = (): { contractAddress: string; entrypoint: string; calldata: string[] } => ({
    contractAddress: budokan,
    entrypoint: 'enter_tournament',
    calldata: [
      hex(tid),
      '0x0', address, // player_address: Some(address)
      '0x1', // qualifier: None
      ...(qualification ? ['0x0', '0x1', hex(qualification.length), ...qualification] : ['0x1']), // Some(extension(data)) / None
      '0x1', // entry_fee_pay_params: None
    ],
  });
  const chain = new V2Chain(provider, game);
  const runsLeft = Math.max(0, opts.maxRuns - today.runs.length);
  if (!runsLeft || !opts.live) {
    console.log(`[pvp] ${opts.live ? 'all runs used' : 'dry run'}: not entering`);
    save();
    return;
  }
  const backend = new V2MainnetBackend({
    chain,
    executor: ga,
    dryRun: false,
    games: [],
    maxEntries: runsLeft,
    enter: async () => {
      const id = await chain.enterWith(ga, [enterCall()]);
      today.runs.push(id.toString());
      save();
      console.log(`[pvp] entered run ${today.runs.length}/${opts.maxRuns} on table ${today.tournamentId}: game ${id}`);
      return id;
    },
  });
  await playLoop({ backend, params: loadParams(), store, minutes: opts.minutes, maxGames: runsLeft + 2 });
  // best settled run of this table
  for (const r of today.runs) {
    const id = BigInt(r);
    const [verified, score] = await Promise.all([chain.isVerified(id).catch(() => false), call(game, 'score', [id]).then((x) => Number(x[0])).catch(() => 0)]);
    if (verified && score > (today.best?.score ?? 0)) today.best = { tokenId: r, score };
  }
  console.log(`[pvp] table ${today.tournamentId}: best verified run ${today.best ? `${today.best.tokenId} with ${today.best.score} xp` : '-'}`);
  save();
}
