// `ronke`: Ronke Casino status for the bot's account and, with --claim, claim today's free games.
// The account: the Game Account of a shared Game Session (GAME_SESSION_LINK), else the Cartridge session, else
// MAINNET_ACCOUNT_ADDRESS. Writes <data>/ronke.json for the website.
import { claimRonke, dayState, ronkeStatus } from '../chain/ronke.ts';
import { DataStore } from '../runner/datastore.ts';

export async function botAccount(): Promise<{ address: string; owner?: string; kind: string } | null> {
  const { gameSessionFromEnv } = await import('../chain/game-account.ts');
  const gs = gameSessionFromEnv();
  if (gs) return { address: '0x' + BigInt(gs.approval.account).toString(16), owner: gs.owner, kind: 'game-account' };
  const { restoreSessionFromEnv, sessionProvider } = await import('../chain/mainnet.ts');
  if (restoreSessionFromEnv()) {
    try {
      const acc = await (await sessionProvider()).probe();
      if (acc) return { address: (acc as unknown as { address: string }).address, kind: 'cartridge' };
    } catch {
      // fall through
    }
  }
  const a = process.env.MAINNET_ACCOUNT_ADDRESS;
  return a ? { address: a, kind: 'address' } : null;
}

export async function runRonkeCommand(opts: { dataDir: string; claim: boolean; address?: string }): Promise<void> {
  const store = new DataStore(opts.dataDir);
  const acc = opts.address ? { address: opts.address, kind: 'address' as const } : await botAccount();
  if (!acc) throw new Error('ronke: no account (share a Game Session or connect Cartridge on the website)');
  console.log(`[ronke] account ${acc.address} (${acc.kind})`);
  const out: Record<string, unknown> = { updated: new Date().toISOString(), address: acc.address, kind: acc.kind };
  try {
    const r = opts.claim ? await claimRonke(acc.address, (acc as { owner?: string }).owner) : { status: await ronkeStatus(acc.address), claimed: [], message: 'status only' };
    const s = r.status;
    if (s) {
      out.eligible = s.eligibility?.eligible ?? false;
      out.reason = s.eligibility?.reason ?? null;
      out.needsWallet = s.eligibility?.needsWallet ?? false;
      out.dailyGames = s.eligibility?.dailyGames ?? null;
      out.evmAddress = s.evm?.address ?? null;
      out.currentDay = s.currentDay;
      out.ended = s.ended;
      out.days = [1, 2, 3].map((d) => ({ day: d, state: dayState(s, d), ...(s.days?.[d] ?? s.days?.[String(d)] ?? {}) }));
      // other ways to get Ronke games: open steps (no holder wallet), Super Survivor BOGOF, burn steps, tasks
      const pick = (k: string) => (s as Record<string, unknown>)[k];
      out.extra = Object.fromEntries(['openGame', 'open', 'bogo', 'burn', 'tasks', 'quests', 'superSurvivor', 'discord', 'deposit'].filter((k) => pick(k) !== undefined).map((k) => [k, pick(k)]));
      out.statusKeys = Object.keys(s);
      console.log(`[ronke] eligible=${out.eligible} day ${s.currentDay}${s.ended ? ' (ended)' : ''}; status keys: ${Object.keys(s).join(', ')}`);
      for (const [k, v] of Object.entries(out.extra as Record<string, unknown>)) console.log(`[ronke]   ${k}: ${JSON.stringify(v).slice(0, 300)}`);
    }
    out.claimed = r.claimed;
    out.message = r.message;
    console.log(`[ronke] ${r.message}${r.claimed.length ? ` -> games ${r.claimed.join(', ')}` : ''}`);
  } catch (e) {
    out.error = (e as Error).message;
    console.log(`[ronke] ${out.error}`);
  }
  store.writeJson('ronke.json', out);
}
