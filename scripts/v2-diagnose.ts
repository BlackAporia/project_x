// Model-vs-site-engine check: plays practice games on the official client engine and compares every hit and reward
// with what the bot's model predicts. Usage: node --import tsx scripts/v2-diagnose.ts <frontendDir> <dungeon-settings.json> <settingsId> [games]
import { readFileSync } from 'node:fs';
import { level, loadAssets } from '../src/game/adventurer.ts';
import { beastGoldReward, beastXpReward, generateObstacle, obstacleXpReward } from '../src/game/beast.ts';
import { obstacleDamage } from '../src/game/adventurer.ts';
import { applyDamageReduction } from '../src/game/combat.ts';
import { encounterLevels } from '../src/ai/model.ts';
import { Policy } from '../src/ai/policy.ts';
import { loadParams } from '../src/ai/params.ts';
import { beastDamageOptions, heroDamageOptions } from '../src/ai/model.ts';
import { loadSiteEngine, siteSettings, SiteGame } from '../src/v2/site-engine.ts';
import { siteStateToEngine, toSiteAction } from '../src/v2/backend.ts';

const [dir, file, sid, gamesArg] = process.argv.slice(2);
const ds = JSON.parse(readFileSync(file, 'utf8'));
const settings = siteSettings(ds.settings[sid].settings);
const red = Number(settings.base_damage_reduction ?? 0);
const engine = await loadSiteEngine(dir);
const policy = new Policy(loadParams('policy/policy.json'));
const stats: Record<string, { n: number; bad: number; ex: string[] }> = {};
const rec = (k: string, ok: boolean, ex: string) => {
  const s = (stats[k] ??= { n: 0, bad: 0, ex: [] });
  s.n++;
  if (!ok) {
    s.bad++;
    if (s.ex.length < 6) s.ex.push(ex);
  }
};
const games = Number(gamesArg ?? 20);
for (let g = 0; g < games; g++) {
  const game = new SiteGame(engine, String(900000 + g), settings);
  for (let step = 0; step < 3000; step++) {
    const st = siteStateToEngine(game, red);
    if (st.started && st.adventurer.health === 0) break;
    const d = policy.decide(st);
    if (!d.actions.length) break;
    for (const a of d.actions) {
      const before = siteStateToEngine(game, red);
      const adv = loadAssets(before.adventurer, before.bag);
      const lvl = level(adv);
      const ev = a.type === 'equip' ? game.equipFromBag(a.items) : game.act(toSiteAction(a));
      if (!ev.length) {
        rec('rejected:' + a.type, false, JSON.stringify(a));
        break;
      }
      const beast = before.beast;
      for (const e of ev as any[]) {
        if (e.type === 'attack' && beast) {
          const opts = heroDamageOptions(adv, beast).map((o) => o.dmg);
          rec('hero hit', opts.includes(e.attack.damage), `L${lvl} beast ${beast.id} L${beast.spec.level} got ${e.attack.damage} want ${opts} crit=${e.attack.critical_hit}`);
        }
        if (e.type === 'beast_attack' && beast) {
          const opts = beastDamageOptions(adv, beast, before.settings, false).map((o) => o.dmg);
          rec('beast hit', opts.includes(e.attack.damage), `got ${e.attack.damage} want ${opts} crit=${e.attack.critical_hit} loc=${e.attack.location}`);
        }
        if (e.type === 'obstacle' && !e.obstacle.dodged) {
          const loc = String(e.obstacle.location).toLowerCase();
          const slot = { chest: 2, head: 3, waist: 4, foot: 5, hand: 6 }[loc] ?? 0;
          const armor = adv.equipment[slot] ?? { id: 0, xp: 0 };
          const { min, max } = encounterLevels(lvl);
          const cands: number[] = [];
          let any = false;
          for (let L = min; L <= max; L++) {
            const ob = generateObstacle(lvl, e.obstacle.id - 1, 0);
            ob.spec.level = L;
            if (obstacleXpReward(ob, lvl) !== e.xp_reward) continue;
            const dmg = applyDamageReduction(obstacleDamage(adv, ob, armor, e.obstacle.critical_hit ? 0 : 255).totalDamage, before.settings.baseDamageReduction);
            cands.push(dmg);
            if (dmg === e.obstacle.damage) any = true;
          }
          rec('obstacle dmg', any, `got ${e.obstacle.damage} crit=${e.obstacle.critical_hit} xp=${e.xp_reward} armor=${armor.id}/${armor.xp} ours(levels w/ same xp)=${[...new Set(cands)].slice(0, 12)}`);
        }
        if (e.type === 'defeated_beast' && beast) {
          const xp = beastXpReward(beast, lvl);
          const gold = beastGoldReward(beast);
          rec('kill xp', xp === e.xp_reward, `got ${e.xp_reward} want ${xp} (beast L${beast.spec.level} T${beast.spec.tier}, hero L${lvl})`);
          rec('kill gold', gold === e.gold_reward || adv.equipment[8].id !== 0, `got ${e.gold_reward} want ${gold}`);
        }
      }
      // item xp: compare greatness growth model (V1: weapon on kill / hit armor) with the engine (all items)
      if (game.state.adventurer?.health === 0) break;
    }
    if (game.state.adventurer?.health === 0) break;
  }
}
for (const [k, s] of Object.entries(stats)) {
  console.log(`${k.padEnd(18)} ${s.n} checks, ${s.bad} mismatches (${((100 * s.bad) / Math.max(1, s.n)).toFixed(1)}%)`);
  for (const e of s.ex) console.log('     ', e);
}
process.exit(0);
