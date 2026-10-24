// Denshokan indexer API (https://github.com/Provable-Games/denshokan api/): game tokens, owners, scores, ranks.
// Used for the leaderboard, finding the bot's own unplayed games and learning from top players.
import { MAINNET } from './config.ts';
import { retry } from './rpc.ts';

export interface DenshokanToken {
  id?: string;
  tokenId: string;
  gameId: number;
  settingsId?: number;
  ownerAddress: string;
  playerName?: string | null;
  currentScore: string;
  gameOver: boolean;
  mintedAt?: string;
  completedAt?: string | null;
  lastUpdatedAt?: string;
  contextName?: string | null;
  minterAddress?: string;
  gameAddress?: string;
}

interface Page<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
}

async function get<T>(path: string, params: Record<string, string | number | boolean | undefined> = {}): Promise<T> {
  const qs = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
    .join('&');
  const url = `${MAINNET.denshokanApi}${path}${qs ? '?' + qs : ''}`;
  return retry(
    async () => {
      const res = await fetch(url, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(20_000) });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
      return (await res.json()) as T;
    },
    { label: `denshokan ${path}`, tries: 3 },
  );
}

let cachedGameId: number | null = null;

/** Denshokan game id of Loot Survivor (resolved by name / contract, env override DENSHOKAN_GAME_ID). */
export async function lootSurvivorGameId(): Promise<number> {
  if (process.env.DENSHOKAN_GAME_ID) return Number(process.env.DENSHOKAN_GAME_ID);
  if (cachedGameId !== null) return cachedGameId;
  try {
    const page = await get<Page<Record<string, unknown>>>('/games', { limit: 100 });
    const want = [MAINNET.gameCore, MAINNET.gameToken, MAINNET.gameCoreV2].map((a) => BigInt(a));
    const hit =
      page.data.find((g) => {
        try {
          return want.includes(BigInt(String(g.contractAddress ?? g.gameAddress ?? '0x0')));
        } catch {
          return false;
        }
      }) ?? page.data.find((g) => /loot\s*survivor|death\s*mountain/i.test(String(g.name ?? '')));
    cachedGameId = hit ? Number(hit.id ?? hit.gameId) : MAINNET.denshokanGameId;
  } catch {
    cachedGameId = MAINNET.denshokanGameId;
  }
  return cachedGameId;
}

export async function topTokens(limit = 100, opts: { gameOver?: boolean; offset?: number; settingsId?: number } = {}): Promise<DenshokanToken[]> {
  const gameId = await lootSurvivorGameId();
  const page = await get<Page<DenshokanToken>>('/tokens', {
    game_id: gameId,
    sort_by: 'score',
    sort_order: 'desc',
    limit,
    offset: opts.offset ?? 0,
    game_over: opts.gameOver,
    settings_id: opts.settingsId,
  });
  return page.data;
}

/** Recently updated games still in progress (to watch live players). */
export async function liveTokens(limit = 50): Promise<DenshokanToken[]> {
  const gameId = await lootSurvivorGameId();
  const page = await get<Page<DenshokanToken>>('/tokens', { game_id: gameId, game_over: false, sort_by: 'updated', sort_order: 'desc', limit });
  return page.data;
}

export async function playerTokens(address: string, opts: { gameOver?: boolean; limit?: number } = {}): Promise<DenshokanToken[]> {
  const gameId = await lootSurvivorGameId();
  const out: DenshokanToken[] = [];
  const limit = opts.limit ?? 500;
  for (let offset = 0; offset < limit; offset += 100) {
    const page = await get<Page<DenshokanToken>>(`/players/${address}/tokens`, { game_id: gameId, game_over: opts.gameOver, sort_by: 'minted', sort_order: 'asc', limit: 100, offset });
    out.push(...page.data);
    if (page.data.length < 100) break;
  }
  return out;
}

export async function tokenRank(tokenId: string): Promise<{ rank?: number; total?: number } | null> {
  try {
    return await get<{ rank?: number; total?: number }>(`/tokens/${tokenId}/rank`);
  } catch {
    return null;
  }
}

export async function tokenScores(tokenId: string): Promise<unknown> {
  return get(`/tokens/${tokenId}/scores`);
}

export async function playerRank(address: string): Promise<unknown> {
  const gameId = await lootSurvivorGameId();
  return get(`/players/${address}/rank`, { game_id: gameId });
}

/** Denshokan packed token id: game id lives in the low bits; this helper is informative only. */
export function describeTokenId(tokenId: string): { hex: string; bits: number } {
  const v = BigInt(tokenId);
  return { hex: '0x' + v.toString(16), bits: v.toString(2).length };
}
