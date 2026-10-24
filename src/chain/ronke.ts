// Ronke Casino (Ronkeverse) daily free games, as lootsurvivor.io claims them for an account:
//   1. eligibility token  POST https://www.lootsurvivor.io/api/eligibility {addresses}  -> {token, ...}
//   2. campaign status    GET  {campaigns}/ronkeverse/status?address=
//   3. claim the day      POST {campaigns}/ronkeverse/claim {address, day}  (header X-Eligibility-Token)
//      bonus games        POST {campaigns}/ronkeverse/bonus {address, day}
// Eligibility comes from the Ronin wallet: holders sign in with it on lootsurvivor.io (a Game Account owned by that
// wallet); the games are minted to the account and the bot plays them. No wallet signature is needed to claim.
const SITE = process.env.LOOTSURVIVOR_URL ?? 'https://www.lootsurvivor.io';
const CAMPAIGNS = process.env.CAMPAIGNS_API_URL ?? 'https://campaigns-api-aqkq.onrender.com';

export interface RonkeDay {
  claimed: boolean;
  games: number;
  played: number;
  bonusClaimed: number;
}

export interface RonkeStatus {
  address: string;
  currentDay: number;
  ended: boolean;
  startedAt: number | null;
  days: Record<string, RonkeDay>;
  eligibility: { eligible: boolean; reason?: string | null; needsWallet?: boolean; dailyGames?: number; source?: string };
  evm?: { address: string | null };
  [k: string]: unknown;
}

async function json<T>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, { ...init, signal: AbortSignal.timeout(45_000) });
  const body = (await r.json().catch(() => null)) as (T & { error?: string; reason?: string }) | null;
  if (!r.ok) throw new Error(`${r.status} ${body?.error ?? ''}${body?.reason ? `: ${body.reason}` : ''}`.trim());
  return body as T;
}

/** The geo/eligibility token lootsurvivor.io attaches to dungeon requests (null when not required). */
export async function eligibilityToken(addresses: string[]): Promise<string | null> {
  try {
    const d = await json<{ token?: string; verdict?: string; mode?: string }>(`${SITE}/api/eligibility`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ addresses }),
    });
    return d?.token ?? null;
  } catch (e) {
    console.warn(`[ronke] eligibility check failed: ${(e as Error).message}`);
    return null;
  }
}

export async function ronkeStatus(address: string): Promise<RonkeStatus> {
  const r = await json<{ status?: RonkeStatus } & RonkeStatus>(`${CAMPAIGNS}/ronkeverse/status?address=${encodeURIComponent(address)}`);
  return (r.status ?? r) as RonkeStatus;
}

/** Day state as the frontend computes it. */
export function dayState(s: RonkeStatus, day: number): 'locked' | 'claim' | 'playing' | 'spent' | 'missed' {
  const d = s.days?.[day] ?? s.days?.[String(day)];
  if (day > s.currentDay) return 'locked';
  if (d?.claimed) return d.games + (d.bonusClaimed ?? 0) - d.played > 0 ? 'playing' : 'spent';
  return day < s.currentDay || s.ended ? 'missed' : 'claim';
}

async function post(path: string, address: string, body: Record<string, unknown>, token: string | null): Promise<{ tokenIds?: Array<string | number>; status?: RonkeStatus }> {
  return json(`${CAMPAIGNS}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(token ? { 'X-Eligibility-Token': token } : {}) },
    body: JSON.stringify({ address, ...body }),
  });
}

export interface ClaimResult {
  status: RonkeStatus | null;
  claimed: string[];
  message: string;
}

/** Claim today's free games (and bonus games when unlocked) for the account. */
export async function claimRonke(address: string, owner?: string): Promise<ClaimResult> {
  let status = await ronkeStatus(address);
  if (!status.eligibility?.eligible) {
    return { status, claimed: [], message: `not eligible: ${status.eligibility?.reason ?? (status.eligibility?.needsWallet ? 'no Ronin wallet linked to this account' : 'unknown')}` };
  }
  const token = await eligibilityToken(owner ? [address, owner] : [address]);
  const claimed: string[] = [];
  const day = status.currentDay;
  const notes: string[] = [];
  if (dayState(status, day) === 'claim') {
    const r = await post('/ronkeverse/claim', address, { day }, token);
    claimed.push(...(r.tokenIds ?? []).map(String));
    if (r.status) status = r.status;
    notes.push(`day ${day}: ${r.tokenIds?.length ?? 0} game(s) claimed`);
  } else {
    notes.push(`day ${day}: ${dayState(status, day)}`);
  }
  if (dayState(status, day) === 'spent') {
    try {
      const r = await post('/ronkeverse/bonus', address, { day }, token);
      if (r.tokenIds?.length) {
        claimed.push(...r.tokenIds.map(String));
        notes.push(`${r.tokenIds.length} bonus game(s)`);
      }
      if (r.status) status = r.status;
    } catch {
      // bonus games unlock after the day's games are played and quests are done on lootsurvivor.io
    }
  }
  return { status, claimed, message: notes.join('; ') };
}
