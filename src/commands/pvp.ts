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
/** runs a player may enter per table (the entry requirement's entry_limit; the validator's entries_left wins) */
const TABLE_RUNS = 10;

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

type ViewCall = (target: string, entrypoint: string, calldata?: Array<bigint | number | string>) => Promise<bigint[]>;

/**
 * The qualification enter_tournament needs for table `tid`: none without an entry requirement, else the merkle
 * allowlist proof of `address`. The tree is config[0] when the requirement names one, else the validator's tree
 * for (Budokan, tid); each candidate proof is checked with the validator's valid_entry before it is used.
 */
export async function resolveQualification(
  call: ViewCall,
  tid: bigint,
  address: string,
): Promise<{ required: boolean; qualification: string[] | null; treeId?: bigint; entriesLeft?: number; note: string }> {
  const budokan = MAINNET.pvp.budokan;
  const req = await call(budokan, 'get_entry_requirement', [tid]);
  if (req.length < 2 || req[0] !== 0n) return { required: false, qualification: null, note: 'no entry requirement' };
  if (req[2] !== 1n) return { required: true, qualification: null, note: `entry requirement is a token gate (${hex(req[3] ?? 0n)}), not supported` };
  const validator = hex(req[3]);
  const configLen = Number(req[4] ?? 0n);
  const candidates: bigint[] = [];
  if (configLen > 0) candidates.push(req[5]);
  const ctx = await call(validator, 'get_context_tree', [budokan, tid]).then((x) => x[0]).catch(() => 0n);
  if (ctx > 0n) candidates.push(ctx);
  const tried: string[] = [];
  for (const treeId of [...new Set(candidates)]) {
    const q = await merkleProof(treeId, address).catch((e: Error) => {
      tried.push(`tree ${treeId}: ${e.message}`);
      return null;
    });
    if (!q) {
      tried.push(`tree ${treeId}: not on the list`);
      continue;
    }
    const span = [hex(q.length), ...q];
    const valid = await call(validator, 'valid_entry', [budokan, tid, address, ...span]).then((x) => x[0] === 1n).catch(() => false);
    const left = await call(validator, 'entries_left', [budokan, tid, address, ...span])
      .then((x) => (x[0] === 0n ? Number(x[1]) : undefined))
      .catch(() => undefined);
    if (valid) return { required: true, qualification: q, treeId, entriesLeft: left, note: `allowlist tree ${treeId}: proof of ${q.length} felt(s) accepted${left !== undefined ? `, ${left} entr${left === 1 ? 'y' : 'ies'} left` : ''}` };
    tried.push(`tree ${treeId}: proof rejected by the validator${left !== undefined ? ` (entries left ${left})` : ''}`);
  }
  return { required: true, qualification: null, note: `no accepted allowlist proof (${tried.join('; ') || `validator ${validator} names no tree for table ${tid}`})` };
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
  // entry requirement: Option<EntryRequirement{entry_limit, extension{address, config}}> =
  // [0 (Some), limit, 1 (extension), validator, config_len, ...config]. The merkle validator wants
  // QualificationProof::Extension(proof) from the merkle service; PvP tables keep their tree in the validator
  // (get_context_tree), not in the config
  const allow = await resolveQualification(call, tid, address);
  const qualification = allow.qualification;
  console.log(`[pvp] ${allow.note}`);
  if (allow.required && !qualification) throw new Error(`cannot enter table ${today.tournamentId}: ${allow.note}`);
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
  // the table's runs are games on its game core: entering one the session cannot play would waste the entry
  const cannot = ['commit_actions', 'verify_game'].filter((m) => !sessionAllows(gs, game, m));
  if (cannot.length) {
    const msg = `the Game Session does not permit ${cannot.join(' / ')} on this table's game core ${game}: create a new session on the bot website (Accounts -> EVM wallet -> create session) so the bot can play PvP runs`;
    (today.notes ??= []).push(msg.slice(0, 200));
    store.writeStatus({ updated: new Date().toISOString(), mode: 'mainnet', running: false, runId: `pvp-${Date.now()}`, account: address, recent: [], message: `error: ${msg}` });
    save();
    throw new Error(msg);
  }
  const chain = new V2Chain(provider, game);
  // runs already issued to the account at this table (the organizer enters seated players): play those first
  const issued: bigint[] = [];
  for (const id of await chain.ownedGames(address).catch(() => [] as bigint[])) {
    const registered = (await call(budokan, 'is_token_registered', [tid, id]).catch(() => [0n]))[0] === 1n;
    if (!registered) continue;
    if (!today.runs.includes(id.toString())) today.runs.push(id.toString());
    if (!(await chain.gameOver(id).catch(() => false))) issued.push(id);
  }
  if (issued.length) console.log(`[pvp] ${issued.length} unplayed run(s) already issued at this table: ${issued.join(', ')}`);
  save();
  // --max-games N: up to N new entries in this call, never more than the table still allows this account
  const tableLeft = allow.entriesLeft ?? Math.max(0, TABLE_RUNS - today.runs.length);
  const runsLeft = Math.max(0, Math.min(opts.maxRuns, tableLeft));
  console.log(`[pvp] ${tableLeft} entr${tableLeft === 1 ? 'y' : 'ies'} left on this table; entering up to ${runsLeft} now`);
  if ((!runsLeft && !issued.length) || !opts.live) {
    console.log(`[pvp] ${opts.live ? 'all runs used' : 'dry run'}: not playing`);
    save();
    return;
  }
  const backend = new V2MainnetBackend({
    chain,
    executor: ga,
    dryRun: false,
    games: issued,
    maxEntries: runsLeft,
    enter: async () => {
      const id = await chain.enterWith(ga, [enterCall()]);
      today.runs.push(id.toString());
      save();
      console.log(`[pvp] entered run ${today.runs.length}/${TABLE_RUNS} on table ${today.tournamentId}: game ${id}`);
      return id;
    },
  });
  await playLoop({ backend, params: loadParams(), store, minutes: opts.minutes, maxGames: runsLeft + issued.length + 2 });
  // best settled run of this table
  for (const r of today.runs) {
    const id = BigInt(r);
    const [verified, score] = await Promise.all([chain.isVerified(id).catch(() => false), call(game, 'score', [id]).then((x) => Number(x[0])).catch(() => 0)]);
    if (verified && score > (today.best?.score ?? 0)) today.best = { tokenId: r, score };
  }
  console.log(`[pvp] table ${today.tournamentId}: best verified run ${today.best ? `${today.best.tokenId} with ${today.best.score} xp` : '-'}`);
  save();
}
