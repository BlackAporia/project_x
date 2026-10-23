// `discover`: verify what is live right now — contract ABIs on mainnet and the practice slot, dungeons and
// addresses referenced by lootsurvivor.io, and the Denshokan game registry. Output: data/discovery/* and
// site/data/discovery.json (shown on the dashboard). Run in CI because the bot must adapt to redeploys.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Abi } from 'starknet';
import { MAINNET, PRACTICE, practiceAbis } from '../chain/config.ts';
import { abiFunctions, fetchAbi, summarizeAbi } from '../chain/abi.ts';
import { connectProvider } from '../chain/rpc.ts';
import { lootSurvivorGameId } from '../chain/denshokan.ts';

const REQUIRED_GAME_FNS = ['start_game', 'explore', 'attack', 'flee', 'equip', 'buy_items', 'select_stat_upgrades'];

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, { signal: AbortSignal.timeout(20_000), headers: { 'user-agent': 'Mozilla/5.0 loot-survivor-bot' } });
  if (!res.ok) throw new Error(`${res.status} for ${url}`);
  return res.text();
}

/** Scan the lootsurvivor.io frontend bundles for contract addresses, slots and dungeon names. */
async function scanFrontend(site: string): Promise<Record<string, unknown>> {
  const html = await fetchText(site);
  const scripts = [...html.matchAll(/<script[^>]+src="([^"]+\.js)"/g)].map((m) => new URL(m[1], site).toString());
  const addresses = new Map<string, string[]>();
  const slots = new Set<string>();
  const dungeonNames = new Set<string>();
  for (const src of scripts.slice(0, 12)) {
    let js = '';
    try {
      js = await fetchText(src);
    } catch {
      continue;
    }
    for (const m of js.matchAll(/["'`](0x0?[0-9a-fA-F]{62,64})["'`]/g)) {
      const addr = '0x' + BigInt(m[1]).toString(16).padStart(64, '0');
      const ctx = js.slice(Math.max(0, (m.index ?? 0) - 60), (m.index ?? 0)).replace(/[^\w: .-]/g, ' ').trim().slice(-50);
      const list = addresses.get(addr) ?? [];
      if (list.length < 3 && ctx) list.push(ctx);
      addresses.set(addr, list);
    }
    for (const m of js.matchAll(/(pg-[a-z0-9-]+|ls_\d+_\d+_\d+)/g)) slots.add(m[1]);
    for (const m of js.matchAll(/["'`]([A-Z][A-Za-z ]{2,30} Dungeon)["'`]/g)) dungeonNames.add(m[1]);
  }
  const known = new Map<string, string>();
  const add = (name: string, a: string) => known.set('0x' + BigInt(a).toString(16).padStart(64, '0'), name);
  for (const [k, v] of Object.entries(MAINNET)) if (typeof v === 'string' && /^0x[0-9a-f]{40,}$/i.test(v)) add(k, v);
  for (const [k, v] of Object.entries(MAINNET.dungeons)) add(`dungeon:${k}`, v);
  return {
    scripts: scripts.length,
    slots: [...slots].sort(),
    dungeonNames: [...dungeonNames].sort(),
    addresses: [...addresses.entries()].map(([a, ctx]) => ({ address: a, known: known.get(a) ?? null, context: ctx })),
    configuredButNotSeen: [...known.entries()].filter(([a]) => !addresses.has(a)).map(([a, n]) => ({ name: n, address: a })),
  };
}

export async function runDiscoverCommand(opts: { out: string }): Promise<void> {
  mkdirSync(join(opts.out, 'abis'), { recursive: true });
  const report: Record<string, unknown> = { updated: new Date().toISOString() };
  const problems: string[] = [];

  // mainnet contracts
  try {
    const { provider, url } = await connectProvider(MAINNET.rpcUrls);
    report.mainnetRpc = url;
    const targets: Record<string, string> = {
      gameCore: MAINNET.gameCore,
      gameCoreV2: MAINNET.gameCoreV2,
      gameToken: MAINNET.gameToken,
      vrfProvider: MAINNET.vrfProvider,
      denshokan: MAINNET.denshokan,
      ...Object.fromEntries(Object.entries(MAINNET.dungeons).map(([k, v]) => [`dungeon_${k}`, v])),
    };
    const contracts: Record<string, unknown> = {};
    for (const [name, addr] of Object.entries(targets)) {
      try {
        const abi = await fetchAbi(provider, addr);
        writeFileSync(join(opts.out, 'abis', `mainnet-${name}.json`), JSON.stringify({ address: addr, abi }, null, 1));
        const fns = summarizeAbi(abi);
        contracts[name] = { address: addr, live: true, functions: fns };
        if (name === 'gameCore') {
          const have = abiFunctions(abi).map((f) => f.name);
          const missing = REQUIRED_GAME_FNS.filter((f) => !have.includes(f));
          if (missing.length) problems.push(`game core is missing ${missing.join(', ')}`);
          if (!have.includes('get_game_state')) problems.push('game core has no get_game_state view (state reading needs another contract: set MAINNET_ADVENTURER_ADDRESS)');
        }
      } catch (e) {
        contracts[name] = { address: addr, live: false, error: (e as Error).message.slice(0, 200) };
        problems.push(`${name} (${addr}) not readable`);
      }
    }
    report.mainnet = contracts;
  } catch (e) {
    problems.push(`mainnet RPC: ${(e as Error).message}`);
  }

  // practice slot: compare the live ABI with the bundled copy
  try {
    const { provider, url } = await connectProvider(PRACTICE.rpcUrls);
    report.practiceRpc = url;
    const local = practiceAbis();
    const out: Record<string, unknown> = {};
    for (const [name, c] of Object.entries(local)) {
      try {
        const abi = await fetchAbi(provider, c.address);
        const liveSig = summarizeAbi(abi).sort();
        const localSig = summarizeAbi(c.abi as Abi).sort();
        const same = JSON.stringify(liveSig) === JSON.stringify(localSig);
        out[name] = { address: c.address, live: true, matchesBundledAbi: same };
        if (!same) problems.push(`practice ${name} ABI differs from config/abi/practice-slot.json`);
        writeFileSync(join(opts.out, 'abis', `practice-${name}.json`), JSON.stringify({ address: c.address, abi }, null, 1));
      } catch (e) {
        out[name] = { address: c.address, live: false, error: (e as Error).message.slice(0, 200) };
        problems.push(`practice ${name} not readable (slot redeployed? update PRACTICE_* addresses)`);
      }
    }
    report.practice = out;
  } catch (e) {
    problems.push(`practice RPC: ${(e as Error).message}`);
  }

  // frontend: dungeons / addresses currently used by lootsurvivor.io
  try {
    report.frontend = await scanFrontend(process.env.LOOT_SURVIVOR_SITE ?? 'https://lootsurvivor.io/');
  } catch (e) {
    problems.push(`lootsurvivor.io scan: ${(e as Error).message}`);
  }

  try {
    report.denshokanGameId = await lootSurvivorGameId();
  } catch (e) {
    problems.push(`denshokan: ${(e as Error).message}`);
  }

  report.problems = problems;
  writeFileSync(join(opts.out, 'report.json'), JSON.stringify(report, null, 1) + '\n');
  mkdirSync('site/data', { recursive: true });
  writeFileSync('site/data/discovery.json', JSON.stringify(report, null, 1) + '\n');
  console.log(`discovery written to ${opts.out}/report.json`);
  for (const p of problems) console.log(`  ! ${p}`);
}
