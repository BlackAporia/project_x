// JSON files consumed by the dashboard (site/). Everything is small, append-only and capped so the data branch stays light.
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export interface GameRecord {
  id: string;
  mode: 'practice' | 'mainnet' | 'sim';
  xp: number;
  level: number;
  deathCause: string;
  decisions: number;
  transactions: number;
  reverts: number;
  beastsKilled: number;
  fled: number;
  maxGold: number;
  started: string;
  ended: string;
  seconds: number;
  policy: string;
  predictionChecks?: number;
  predictionMismatches?: number;
  status: 'dead' | 'abandoned' | 'error' | 'in_progress' | 'dry_run';
  rank?: number;
}

export interface DecisionLog {
  n: number;
  t: string;
  level: number;
  xp: number;
  hp: number;
  maxHp: number;
  gold: number;
  phase: string;
  reason: string;
  actions: string;
  tx?: string;
  ok?: boolean;
  error?: string;
}

export interface RunRecord {
  id: string;
  mode: string;
  started: string;
  ended?: string;
  games: number;
  bestXp: number;
  meanXp: number;
  errors: number;
  policy: string;
  note?: string;
}

export interface LiveStatus {
  updated: string;
  mode: string;
  running: boolean;
  runId: string;
  account?: string;
  current?: {
    id: string;
    level: number;
    xp: number;
    hp: number;
    maxHp: number;
    gold: number;
    gear: string[];
    stats: Record<string, number>;
    beast?: string;
    lastReason: string;
  };
  recent: DecisionLog[];
  message?: string;
}

const MAX_GAMES = 5000;
const MAX_LOGS = 60;

function readJson<T>(path: string, fallback: T): T {
  if (!existsSync(path)) return fallback;
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as T;
  } catch {
    return fallback;
  }
}

export class DataStore {
  readonly dir: string;

  constructor(dir: string) {
    this.dir = dir;
    mkdirSync(join(dir, 'games'), { recursive: true });
  }

  private path(name: string): string {
    return join(this.dir, name);
  }

  games(): GameRecord[] {
    return readJson<GameRecord[]>(this.path('games.json'), []);
  }

  upsertGame(rec: GameRecord): void {
    const list = this.games().filter((g) => !(g.id === rec.id && g.mode === rec.mode));
    list.push(rec);
    list.sort((a, b) => a.ended.localeCompare(b.ended));
    writeFileSync(this.path('games.json'), JSON.stringify(list.slice(-MAX_GAMES)) + '\n');
  }

  writeGameLog(mode: string, id: string, rec: GameRecord, log: DecisionLog[]): void {
    writeFileSync(join(this.dir, 'games', `${mode}-${id}.json`), JSON.stringify({ game: rec, log }) + '\n');
    // keep only the most recent logs (plus the best few) so the repository stays small
    const files = readdirSync(join(this.dir, 'games')).filter((f) => f.endsWith('.json'));
    if (files.length <= MAX_LOGS) return;
    const games = this.games();
    const best = new Set(
      games
        .slice()
        .sort((a, b) => b.xp - a.xp)
        .slice(0, 15)
        .map((g) => `${g.mode}-${g.id}.json`),
    );
    const recent = new Set(games.slice(-MAX_LOGS + 15).map((g) => `${g.mode}-${g.id}.json`));
    for (const f of files) if (!best.has(f) && !recent.has(f)) rmSync(join(this.dir, 'games', f), { force: true });
  }

  runs(): RunRecord[] {
    return readJson<RunRecord[]>(this.path('runs.json'), []);
  }

  upsertRun(run: RunRecord): void {
    const list = this.runs().filter((r) => r.id !== run.id);
    list.push(run);
    writeFileSync(this.path('runs.json'), JSON.stringify(list.slice(-1000), null, 1) + '\n');
  }

  writeStatus(st: LiveStatus): void {
    writeFileSync(this.path('status.json'), JSON.stringify(st, null, 1) + '\n');
  }

  readJson<T>(name: string, fallback: T): T {
    return readJson(this.path(name), fallback);
  }

  writeJson(name: string, value: unknown): void {
    writeFileSync(this.path(name), JSON.stringify(value, null, 1) + '\n');
  }
}
