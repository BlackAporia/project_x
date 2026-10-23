#!/usr/bin/env node
// Command line entry point.
//   npm run bot -- <command> [--flags]
// Commands: play, sim, bench, tune, dataset, discover, leaderboard, learn, authorize, site, local
import { existsSync, readFileSync } from 'node:fs';
import { parseArgs } from 'node:util';

const COMMANDS: Record<string, string> = {
  play: 'Play games (practice or mainnet) and write dashboard data',
  sim: 'Simulate one game locally and print the decision log',
  bench: 'Benchmark the current policy over many simulated games',
  tune: 'Optimize policy parameters with CMA-ES on simulated games (multi-core)',
  dataset: 'Export simulated states for the GPU trainer (trainer/)',
  discover: 'Fetch live contract ABIs, presets and API endpoints; write data/discovery',
  leaderboard: 'Fetch the mainnet leaderboard and live players; write site/data',
  learn: 'Learn from top players: ingest their games and update insights',
  authorize: 'One-time Cartridge Controller session authorization for mainnet play',
  site: 'Rebuild site/data summaries from the bot data directory',
  local: 'Local GPU learning loop: self-play dataset -> value net (PyTorch) -> A/B -> tune',
  leaders: 'Download the full event history of the top leaderboard games for analysis',
  'v2-inspect': 'Validate the V2 commit-reveal read path on live mainnet games (no account needed)',
  validate: 'A/B a candidate policy on the official site engine (practice) and adopt it only if better',
  'dungeon-settings': 'Read dungeon game settings (e.g. Ronke Casino #7) from the V2 game core',
};

/** Minimal .env loader for local runs (real environment variables win). */
function loadDotEnv(): void {
  if (!existsSync('.env')) return;
  for (const line of readFileSync('.env', 'utf8').split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (m && !line.trimStart().startsWith('#') && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

/**
 * Policy file for a run. Practice games (client-side, no item specials, so no gear farming) use a dungeon's own
 * practice policy (policy/<dungeon>.json) or policy/practice.json; mainnet games use the main policy, tuned for the
 * deep levels under V2 rules.
 */
function dungeonPolicy(dungeon: string, mode = ''): string {
  if (!mode.startsWith('practice')) return 'policy/policy.json';
  const key = dungeon.toLowerCase().replace(/[^a-z]/g, '');
  if (key && existsSync(`policy/${key}.json`)) return `policy/${key}.json`;
  if (existsSync('policy/practice.json')) return 'policy/practice.json';
  return 'policy/policy.json';
}

async function main(): Promise<void> {
  loadDotEnv();
  const [cmd, ...rest] = process.argv.slice(2);
  if (!cmd || cmd === 'help' || cmd === '--help' || !(cmd in COMMANDS)) {
    console.log('Loot Survivor bot\n\nUsage: npm run bot -- <command> [options]\n');
    for (const [k, v] of Object.entries(COMMANDS)) console.log(`  ${k.padEnd(12)} ${v}`);
    process.exit(cmd && !(cmd in COMMANDS) ? 1 : 0);
  }
  const { values } = parseArgs({
    args: rest,
    allowPositionals: true,
    strict: false,
    options: {
      games: { type: 'string' },
      generations: { type: 'string' },
      objective: { type: 'string' },
      workers: { type: 'string' },
      seed: { type: 'string' },
      mode: { type: 'string' },
      minutes: { type: 'string' },
      data: { type: 'string' },
      policy: { type: 'string' },
      out: { type: 'string' },
      verbose: { type: 'boolean' },
      live: { type: 'boolean' },
      limit: { type: 'string' },
      'max-games': { type: 'string' },
      rounds: { type: 'string' },
      dungeon: { type: 'string' },
      frontend: { type: 'string' },
      ids: { type: 'string' },
      candidate: { type: 'string' },
      game: { type: 'string' },
      baseline: { type: 'string' },
      adopt: { type: 'string' },
      core: { type: 'string' },
      'settings-id': { type: 'string' },
      python: { type: 'string' },
      levels: { type: 'string' },
      effort: { type: 'string' },
    },
  });
  const num = (v: unknown, d: number) => (typeof v === 'string' && v !== '' && !Number.isNaN(Number(v)) ? Number(v) : d);
  const str = (v: unknown, d: string) => (typeof v === 'string' && v !== '' ? v : d);

  switch (cmd) {
    case 'sim': {
      const { runSimCommand } = await import('./commands/sim.ts');
      await runSimCommand({ seed: num(values.seed, 1), policyPath: str(values.policy, 'policy/policy.json'), verbose: values.verbose === true, dungeon: str(values.dungeon, '') || undefined });
      break;
    }
    case 'bench': {
      const { runBenchCommand } = await import('./commands/sim.ts');
      await runBenchCommand({ games: num(values.games, 400), seed: num(values.seed, 1), policyPath: str(values.policy, 'policy/policy.json'), workers: num(values.workers, 0) || undefined, dungeon: str(values.dungeon, '') || undefined });
      break;
    }
    case 'tune': {
      const { tune } = await import('./learn/tuner.ts');
      const dungeonName = str(values.dungeon, '');
      const dungeon = dungeonName ? (await import('./game/dungeons.ts')).dungeonEngineSettings(dungeonName) : null;
      if (str(values.objective, '') === 'tail') {
        // optimize P(reaching the leaderboard top) by multilevel splitting
        const { tuneTail } = await import('./learn/tail.ts');
        await tuneTail({
          settings: dungeon?.settings,
          label: dungeon?.label,
          generations: num(values.generations, 6),
          games: num(values.games, 800),
          effort: num(values.effort, 400),
          levels: str(values.levels, '10,15,20,25,30,35,40,43,46').split(',').map(Number),
          workers: num(values.workers, 0) || undefined,
          policyPath: str(values.policy, 'policy/policy.json'),
          seed: num(values.seed, 1),
        });
        break;
      }
      await tune({
        settings: dungeon?.settings,
        label: dungeon?.label,
        generations: num(values.generations, 20),
        games: num(values.games, 200),
        objective: str(values.objective, 'blend') as 'mean' | 'p90' | 'top10' | 'blend',
        workers: num(values.workers, 0) || undefined,
        policyPath: str(values.policy, 'policy/policy.json'),
        seed: num(values.seed, 1),
      });
      break;
    }
    case 'dataset': {
      const { runDatasetCommand } = await import('./commands/dataset.ts');
      await runDatasetCommand({ games: num(values.games, 2000), out: str(values.out, 'data/datasets/selfplay.jsonl'), policyPath: str(values.policy, 'policy/policy.json'), seed: num(values.seed, 1) });
      break;
    }
    case 'play': {
      const { runPlayCommand } = await import('./commands/play.ts');
      await runPlayCommand({
        mode: str(values.mode, process.env.BOT_MODE ?? 'practice') as 'practice' | 'practice-slot' | 'mainnet' | 'sim',
        minutes: num(values.minutes, Number(process.env.BOT_MINUTES ?? 20)),
        maxGames: num(values['max-games'], Number(process.env.BOT_MAX_GAMES ?? 50)),
        dataDir: str(values.data, process.env.BOT_DATA_DIR ?? 'site/data'),
        policyPath: str(values.policy, dungeonPolicy(str(values.dungeon, process.env.BOT_DUNGEON ?? ''), str(values.mode, process.env.BOT_MODE ?? 'practice'))),
        live: values.live === true || process.env.MAINNET_LIVE === 'true',
        dungeon: str(values.dungeon, process.env.BOT_DUNGEON ?? '') || undefined,
        frontend: str(values.frontend, '') || undefined,
        settingsId: values['settings-id'] !== undefined ? num(values['settings-id'], NaN) : process.env.PRACTICE_SETTINGS_ID ? Number(process.env.PRACTICE_SETTINGS_ID) : undefined,
        game: str(values.game, '') || undefined,
      });
      break;
    }
    case 'discover': {
      const { runDiscoverCommand } = await import('./commands/discover.ts');
      await runDiscoverCommand({ out: str(values.out, 'data/discovery') });
      break;
    }
    case 'leaderboard': {
      const { runLeaderboardCommand } = await import('./commands/leaderboard.ts');
      await runLeaderboardCommand({ dataDir: str(values.data, process.env.BOT_DATA_DIR ?? 'site/data'), limit: num(values.limit, 100) });
      break;
    }
    case 'learn': {
      const { runLearnCommand } = await import('./commands/learn.ts');
      await runLearnCommand({ dataDir: str(values.data, process.env.BOT_DATA_DIR ?? 'site/data'), limit: num(values.limit, 25) });
      break;
    }
    case 'authorize': {
      const { runAuthorizeCommand } = await import('./chain/cartridge.ts');
      await runAuthorizeCommand();
      break;
    }
    case 'local': {
      const { runLocalCommand } = await import('./commands/local.ts');
      await runLocalCommand({
        rounds: num(values.rounds, 3),
        games: num(values.games, 6000),
        generations: num(values.generations, 12),
        policyPath: str(values.policy, 'policy/policy.json'),
        python: str(values.python, process.platform === 'win32' ? 'python' : 'python3'),
        seed: num(values.seed, 1),
      });
      break;
    }
    case 'leaders': {
      const { runLeadersCommand } = await import('./commands/leaders.ts');
      await runLeadersCommand({ dataDir: str(values.data, process.env.BOT_DATA_DIR ?? 'site/data'), limit: num(values.limit, 20) });
      break;
    }
    case 'v2-inspect': {
      const { runV2InspectCommand } = await import('./commands/v2-inspect.ts');
      await runV2InspectCommand({ dataDir: str(values.data, process.env.BOT_DATA_DIR ?? 'site/data'), games: num(values.games, 5), gameId: str(values.game, '') || undefined });
      break;
    }
    case 'validate': {
      const { runValidateCommand } = await import('./commands/validate.ts');
      const ok = await runValidateCommand({
        dungeon: str(values.dungeon, 'default'),
        candidate: str(values.candidate, 'policy/candidate.json'),
        baseline: str(values.baseline, 'policy/policy.json'),
        games: num(values.games, 150),
        frontend: str(values.frontend, '') || undefined,
        dataDir: str(values.data, process.env.BOT_DATA_DIR ?? 'site/data'),
        adoptTo: str(values.adopt, '') || undefined,
      });
      process.exitCode = ok ? 0 : 3;
      break;
    }
    case 'dungeon-settings': {
      const { runDungeonSettingsCommand } = await import('./commands/dungeon-settings.ts');
      const ids = str(values.ids, '');
      await runDungeonSettingsCommand({
        dataDir: str(values.data, process.env.BOT_DATA_DIR ?? 'site/data'),
        ids: ids ? ids.split(',').map(Number) : undefined,
        core: str(values.core, '') || undefined,
      });
      break;
    }
    case 'site': {
      const { runSiteCommand } = await import('./commands/site.ts');
      await runSiteCommand({ dataDir: str(values.data, 'site/data') });
      break;
    }
  }
}

main().then(
  // exit explicitly: the site engine bundle (practice) leaves timers running that would keep Node alive
  () => process.exit(process.exitCode ?? 0),
  (e) => {
    console.error(e instanceof Error ? e.stack ?? e.message : e);
    process.exit(1);
  },
);
