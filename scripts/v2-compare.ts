// Event-frequency comparison between the bot's simulator (dungeon rules) and the official site engine, same policy.
// Usage: node --import tsx scripts/v2-compare.ts <frontendDir> <dungeon-settings.json> <settingsId> [games]
import { readFileSync } from 'node:fs';
import { level, loadAssets } from '../src/game/adventurer.ts';
import { applyAction, isDead, newGameState } from '../src/game/engine.ts';
import { FastRandom } from '../src/game/rng.ts';
import { Policy } from '../src/ai/policy.ts';
import { loadParams } from '../src/ai/params.ts';
import { dungeonEngineSettings } from '../src/game/dungeons.ts';
import { loadSiteEngine, siteSettings, SiteGame } from '../src/v2/site-engine.ts';
import { siteStateToEngine, toSiteAction } from '../src/v2/backend.ts';

const [dir, file, sid, gamesArg] = process.argv.slice(2);
const games = Number(gamesArg ?? 60);
type Agg = Record<string, number>;
const bucket = (l: number) => (l < 10 ? '01-09' : l < 20 ? '10-19' : l < 30 ? '20-29' : '30+');
function add(a: Agg, k: string, v = 1) {
  a[k] = (a[k] ?? 0) + v;
}
const policy = new Policy(loadParams('policy/policy.json'));

function record(a: Agg, lvl: number, kind: string, extra: Record<string, number> = {}) {
  const b = bucket(lvl);
  add(a, `${b} ${kind}`);
  for (const [k, v] of Object.entries(extra)) add(a, `${b} ${kind}.${k}`, v);
}

// ---------------- simulator
const sim: Agg = {};
const { settings } = dungeonEngineSettings(Number(sid));
for (let g = 0; g < games; g++) {
  const rng = new FastRandom(4242 + g);
  let s = newGameState(BigInt(5000 + g), settings);
  for (let n = 0; n < 4000 && !(s.started && isDead(s)); n++) {
    const d = policy.decide(s);
    if (!d.actions.length) break;
    for (const act of d.actions) {
      const lvl = level(s.adventurer);
      if (act.type === 'explore') {
        const la = loadAssets(s.adventurer, s.bag);
        record(sim, lvl, 'stats', { int: la.stats.int, wis: la.stats.wis, dex: la.stats.dex, str: la.stats.str, cha: la.stats.cha, vit: la.stats.vit, lvl });
      }
      const r = applyAction(s, act, rng);
      s = r.state;
      if (act.type === 'explore') add(sim, `${bucket(lvl)} explore-actions`);
      for (const e of r.events) {
        if (e.type === 'beast') record(sim, lvl, 'beast');
        if (e.type === 'ambush') record(sim, lvl, 'ambush', { dmg: e.damage });
        if (e.type === 'obstacle') record(sim, lvl, e.dodged ? 'obstacle-dodged' : 'obstacle-hit', { dmg: e.damage });
        if (e.type === 'discovery') record(sim, lvl, `disc-${e.kind}`, { amt: e.kind === 'Loot' ? 0 : e.amount });
        if (e.type === 'flee') record(sim, lvl, e.success ? 'flee-ok' : 'flee-fail');
        if (e.type === 'defeated_beast') record(sim, lvl, 'kill', { gold: e.gold, xp: e.xp });
      }
      if (isDead(s)) break;
    }
  }
  add(sim, 'games');
  add(sim, 'xp', s.adventurer.xp);
}

// ---------------- site engine
const site: Agg = {};
const ds = JSON.parse(readFileSync(file, 'utf8'));
const ss = siteSettings(ds.settings[sid].settings);
const red = Number(ss.base_damage_reduction ?? 0);
const engine = await loadSiteEngine(dir);
for (let g = 0; g < games; g++) {
  const game = new SiteGame(engine, String(800000 + g), ss);
  for (let n = 0; n < 4000; n++) {
    const st = siteStateToEngine(game, red);
    if (st.started && st.adventurer.health === 0) break;
    const d = policy.decide(st);
    if (!d.actions.length) break;
    let stop = false;
    for (const act of d.actions) {
      const lvl = level(siteStateToEngine(game, red).adventurer);
      if (act.type === 'explore') {
        const sa = game.state.adventurer.stats;
        record(site, lvl, 'stats', { int: sa.intelligence, wis: sa.wisdom, dex: sa.dexterity, str: sa.strength, cha: sa.charisma, vit: sa.vitality, lvl });
      }
      const ev = (act.type === 'equip' ? game.equipFromBag(act.items) : game.act(toSiteAction(act))) as any[];
      if (!ev.length) {
        stop = true;
        break;
      }
      if (act.type === 'explore') add(site, `${bucket(lvl)} explore-actions`);
      for (const e of ev) {
        if (e.type === 'beast') record(site, lvl, 'beast');
        if (e.type === 'ambush') record(site, lvl, 'ambush', { dmg: e.attack.damage });
        if (e.type === 'obstacle') record(site, lvl, e.obstacle.dodged ? 'obstacle-dodged' : 'obstacle-hit', { dmg: e.obstacle.damage });
        if (e.type === 'discovery') record(site, lvl, `disc-${e.discovery.type}`, { amt: e.discovery.type === 'Loot' ? 0 : e.discovery.amount });
        if (e.type === 'flee') record(site, lvl, e.success ? 'flee-ok' : 'flee-fail');
        if (e.type === 'defeated_beast') record(site, lvl, 'kill', { gold: e.gold_reward, xp: e.xp_reward });
      }
      if ((game.state.adventurer?.health ?? 1) === 0) break;
    }
    if (stop) break;
  }
  add(site, 'games');
  add(site, 'xp', game.state.adventurer?.xp ?? 0);
}

const keys = [...new Set([...Object.keys(sim), ...Object.keys(site)])].sort();
console.log(`mean xp: sim ${(sim.xp / sim.games).toFixed(0)}  site ${(site.xp / site.games).toFixed(0)}  (${games} games each)`);
console.log('key'.padEnd(34), 'sim/game'.padStart(10), 'site/game'.padStart(10), '  avg(sim)  avg(site)');
for (const k of keys) {
  if (k === 'games' || k === 'xp' || k.includes('.')) continue;
  const a = (sim[k] ?? 0) / sim.games;
  const b = (site[k] ?? 0) / site.games;
  const sub = keys.filter((x) => x.startsWith(k + '.'));
  const avg = sub.map((x) => `${x.slice(k.length + 1)}=${((sim[x] ?? 0) / Math.max(1, sim[k] ?? 0)).toFixed(1)}|${((site[x] ?? 0) / Math.max(1, site[k] ?? 0)).toFixed(1)}`).join(' ');
  console.log(k.padEnd(34), a.toFixed(2).padStart(10), b.toFixed(2).padStart(10), ' ', avg);
}
process.exit(0);
