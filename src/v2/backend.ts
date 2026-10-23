// Practice backend: the bot's policy plays client-only games on the official site engine (src/v2/site-engine.ts)
// with a dungeon's on-chain game settings (e.g. Ronke Casino / "Ronkeverse Large" #7).
import { removeBoosts } from '../game/adventurer.ts';
import { beastTier, beastType } from '../game/beast.ts';
import { NAME_PREFIXES, NAME_SUFFIXES } from '../game/data.ts';
import { defaultSettings, newGameState } from '../game/engine.ts';
import { poseidon } from '../game/rng.ts';
import type { Action, Beast, GameEvent, GameState, Item } from '../game/types.ts';
import { decodeAdventurer } from '../chain/state.ts';
import type { Backend } from '../runner/play.ts';
import { SiteGame, type SiteAction, type SiteEngine, type SiteEvent } from './site-engine.ts';

/** item_specials_salt -> item specials seed (client: getItemSpecialsSeed = poseidon(salt, gameId) % 65536). */
export function specialsSeed(salt: number, gameId: string): number {
  if (!salt) return 0;
  return Number(poseidon([BigInt(salt), BigInt(gameId)]) % 65536n);
}

export function siteBeastToEngine(b: Record<string, any>): Beast {
  const id = Number(b.id);
  return {
    id,
    startingHealth: Number(b.health ?? 0),
    spec: {
      tier: beastTier(id),
      type: beastType(id),
      level: Number(b.level ?? 1),
      specials: {
        special1: 0,
        special2: b.specialPrefix ? Math.max(0, NAME_PREFIXES.indexOf(b.specialPrefix)) : 0,
        special3: b.specialSuffix ? Math.max(0, NAME_SUFFIXES.indexOf(b.specialSuffix)) : 0,
      },
    },
  };
}

/** Site store -> engine GameState (stored stats, i.e. item boosts removed). */
export function siteStateToEngine(game: SiteGame, baseDamageReduction: number): GameState {
  const { adventurer, bag, beast } = game.state;
  const tpl = (game.engine.store.getState().gameSettings as Record<string, any> | null)?.adventurer;
  const settings = {
    ...defaultSettings(),
    baseDamageReduction,
    statsMode: 'Dodge' as const,
    noStarterBeast: true,
    startAdventurer: tpl ? decodeAdventurer(tpl) : undefined,
  };
  const s = newGameState(BigInt(game.gameId), settings);
  if (!adventurer) return s;
  const items: Item[] = [];
  for (let i = 0; i < 15; i++) items.push({ id: Number(bag[i]?.id ?? 0), xp: Number(bag[i]?.xp ?? 0) });
  const adv = decodeAdventurer(adventurer);
  adv.itemSpecialsSeed = specialsSeed(Number(adventurer.item_specials_salt ?? 0), game.gameId);
  s.adventurer = removeBoosts(adv, items);
  s.bag = items;
  s.started = true;
  // client-only games without market_size accept any item
  s.market = Array.from({ length: 101 }, (_, i) => i + 1);
  if (adv.beastHealth > 0 && beast) s.beast = siteBeastToEngine(beast);
  return s;
}

const SINGLE = 65535; // "till health" threshold that stops after one round

export function toSiteAction(a: Action): SiteAction {
  switch (a.type) {
    case 'start':
      return { type: 'start_game', weapon: a.weapon };
    case 'explore':
      // till_damage=1: keep exploring through harmless events, stop at the first damage, beast or loot
      return { type: 'explore', tillDamage: a.tillBeast ? 1 : 0, tillGold: false };
    case 'attack':
      return { type: 'attack', tillHealth: a.toTheDeath ? 0 : SINGLE, tillBeastHealth: 0 };
    case 'flee':
      return { type: 'flee', tillHealth: a.toTheDeath ? 0 : SINGLE };
    case 'equip':
      return { type: 'equip', items: a.items };
    case 'drop':
      return { type: 'drop', items: a.items };
    case 'buy':
      return { type: 'buy_items', potions: a.potions, itemPurchases: a.items.map((p) => ({ item_id: p.itemId, equip: p.equip })) };
    case 'stats':
      return {
        type: 'select_stat_upgrades',
        statUpgrades: {
          strength: a.stats.str ?? 0,
          dexterity: a.stats.dex ?? 0,
          vitality: a.stats.vit ?? 0,
          intelligence: a.stats.int ?? 0,
          wisdom: a.stats.wis ?? 0,
          charisma: a.stats.cha ?? 0,
          luck: 0,
        },
      };
  }
}

function toEngineEvents(events: SiteEvent[]): GameEvent[] {
  const out: GameEvent[] = [];
  for (const e of events) {
    if (e.type === 'defeated_beast') out.push({ type: 'defeated_beast' } as unknown as GameEvent);
    else if (e.type === 'fled_beast') out.push({ type: 'fled_beast' } as unknown as GameEvent);
  }
  return out;
}

export class SitePracticeBackend implements Backend {
  readonly mode = 'practice' as const;
  readonly exact = false;
  readonly dryRun = false;
  readonly dungeon: string;
  private engine: SiteEngine;
  private settings: Record<string, unknown>;
  private games = new Map<bigint, SiteGame>();
  private next: number;
  private reduction: number;

  constructor(engine: SiteEngine, settings: Record<string, unknown>, label: string, seed = Date.now() % 1_000_000) {
    this.engine = engine;
    this.settings = settings;
    this.dungeon = label;
    this.next = seed;
    this.reduction = Number(settings.base_damage_reduction ?? 0);
  }

  async nextGame(): Promise<bigint> {
    const id = BigInt(this.next++);
    this.games.clear(); // the site store holds one game at a time
    this.games.set(id, new SiteGame(this.engine, id.toString(), this.settings));
    return id;
  }

  async readState(id: bigint): Promise<GameState> {
    return siteStateToEngine(this.games.get(id)!, this.reduction);
  }

  async execute(id: bigint, actions: Action[]): Promise<{ sent: Action[]; txs: string[]; reverted?: string; events?: GameEvent[] }> {
    const game = this.games.get(id)!;
    const sent: Action[] = [];
    const events: GameEvent[] = [];
    for (const a of actions) {
      const ev = a.type === 'equip' ? game.equipFromBag(a.items) : game.act(toSiteAction(a));
      if (ev.length === 0) return { sent, txs: [], reverted: `site engine rejected ${a.type}`, events };
      sent.push(a);
      events.push(...toEngineEvents(ev));
      if ((game.state.adventurer?.health ?? 1) === 0) break;
    }
    return { sent, txs: [], events };
  }
}
