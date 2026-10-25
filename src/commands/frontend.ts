// `frontend`: what dungeons lootsurvivor.io offers right now. Downloads the live client (scripts/dump-frontend.mjs),
// extracts every dungeon config (id, name, status, entry, contract, settings / minter ids, sponsored moves...) and
// the Ronke-related texts, and reports dungeons that are new since the last run. Output: data/frontend/dungeons.json.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export interface FrontendDungeon {
  id: string;
  name: string;
  fields: Record<string, string>;
  raw: string;
}

const FIELDS = [
  'status',
  'tagline',
  'address',
  'settingsId',
  'v2MinterId',
  'entryCost',
  'difficulty',
  'mainButtonText',
  'entryNote',
  'freeEntry',
  'sponsoredMoves',
  'commitReveal',
  'restricted',
  'protocol',
  'reward',
  'hideEnterButton',
];

/** Dungeon configs in a JS bundle: `key:{id:..,name:`Y`,...,cardImage:..}` entries of DUNGEON_CONFIGS. */
export function extractDungeons(js: string): FrontendDungeon[] {
  const out: FrontendDungeon[] = [];
  const re = /[{,](?:"([\w-]+)"|([\w-]+)|\[([\w$]+)\]):\{id:(?:`([\w-]+)`|([\w$]+)),name:`([^`]{1,80})`/g;
  const starts = [...js.matchAll(re)];
  starts.forEach((m, i) => {
    const from = m.index ?? 0;
    const next = starts[i + 1]?.index ?? from + 3000;
    const raw = js.slice(from + 1, Math.min(next, from + 3000));
    if (!/cardImage:|entryCost:|tagline:/.test(raw)) return; // wallets, achievements, ... share the {id,name} shape
    const slug = m[6].toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const id = m[4] ?? m[1] ?? m[2] ?? slug;
    const fields: Record<string, string> = {};
    for (const f of FIELDS) {
      const v = new RegExp(`[,{]${f}:(\`[^\`]*\`|!0|!1|[\\w$.]+(?:\\?\`[^\`]*\`:\`[^\`]*\`)?)`).exec(raw);
      if (v) fields[f] = v[1].replace(/^`|`$/g, '').replace(/^!0$/, 'true').replace(/^!1$/, 'false');
    }
    out.push({ id, name: m[6], fields, raw: raw.slice(0, 1500) });
  });
  return out;
}

export async function runFrontendCommand(opts: { dataDir: string; site?: string; grep?: string[] }): Promise<void> {
  const dir = join(tmpdir(), `lsfront-${Date.now()}`);
  execFileSync(process.execPath, ['scripts/dump-frontend.mjs', dir, opts.site ?? 'https://lootsurvivor.io/'], { stdio: 'inherit' });
  const files = readdirSync(join(dir, 'assets')).filter((f) => f.endsWith('.js'));
  const dungeons = new Map<string, FrontendDungeon>();
  const ronke = new Set<string>();
  const snippets: Array<{ file: string; keyword: string; text: string }> = [];
  for (const f of files) {
    const js = readFileSync(join(dir, 'assets', f), 'utf8');
    for (const k of opts.grep ?? []) {
      let i = js.indexOf(k);
      let n = 0;
      while (i >= 0 && n++ < 6) {
        snippets.push({ file: f, keyword: k, text: js.slice(Math.max(0, i - 1200), i + 1200) });
        i = js.indexOf(k, i + 1200);
      }
    }
    for (const d of extractDungeons(js)) if (!dungeons.has(d.id) || Object.keys(d.fields).length > Object.keys(dungeons.get(d.id)!.fields).length) dungeons.set(d.id, d);
    for (const m of js.matchAll(/`([^`]{0,160}[Rr]onke[^`]{0,200})`/g)) if (ronke.size < 400) ronke.add(m[1].replace(/\s+/g, ' '));
  }
  rmSync(dir, { recursive: true, force: true });

  const outDir = join(opts.dataDir, 'frontend');
  mkdirSync(outDir, { recursive: true });
  const file = join(outDir, 'dungeons.json');
  const before = existsSync(file) ? (JSON.parse(readFileSync(file, 'utf8')) as { dungeons?: FrontendDungeon[] }).dungeons ?? [] : [];
  const known = new Set(before.map((d) => d.id));
  const list = [...dungeons.values()];
  const added = before.length ? list.filter((d) => !known.has(d.id)).map((d) => d.id) : [];
  writeFileSync(file, JSON.stringify({ updated: new Date().toISOString(), new: added, dungeons: list, ronkeStrings: [...ronke] }, null, 1) + '\n');
  if (opts.grep?.length) {
    writeFileSync(join(outDir, 'snippets.json'), JSON.stringify({ updated: new Date().toISOString(), keywords: opts.grep, snippets }, null, 1) + '\n');
    console.log(`${snippets.length} snippet(s) for ${opts.grep.join(', ')} -> frontend/snippets.json`);
  }
  console.log(`${list.length} dungeon configs on lootsurvivor.io${added.length ? `, NEW: ${added.join(', ')}` : ''}`);
  for (const d of list) {
    const f = d.fields;
    console.log(`  ${d.id.padEnd(24)} ${d.name.padEnd(26)} ${(f.status ?? '').padEnd(12)} ${f.entryCost ?? ''}${f.settingsId ? ` settings=${f.settingsId}` : ''}${f.v2MinterId ? ` minter=${f.v2MinterId}` : ''}${f.sponsoredMoves === 'true' ? ' sponsored' : ''}${f.address ? ` @${f.address}` : ''}`);
  }
  const r = list.filter((d) => /ronke/i.test(d.id + d.name + d.raw));
  console.log(`Ronke dungeons: ${r.map((d) => `${d.id} (${d.name})`).join(', ') || 'none'}`);
}
