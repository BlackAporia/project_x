// Runs the official lootsurvivor.io client game engine (the code behind the site's "Practice" button, which plays
// client-only games with Math.random) inside Node. The frontend bundle is downloaded fresh by
// scripts/dump-frontend.mjs, so the bot always practises against the engine the site uses today.
// Chunk and export names are minified and change per deploy, so they are located by code patterns, not names.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

export type SiteEvent = { type: string; [k: string]: unknown };
export type SiteAction = { type: string; [k: string]: unknown };

interface Store {
  getState(): Record<string, any>;
  setState(patch: Record<string, unknown>): void;
}

interface Director {
  clientGameAction(action: SiteAction, override?: Record<string, unknown>): SiteEvent[];
}

let browserReady = false;

async function registerBrowser(): Promise<void> {
  if (browserReady) return;
  const { GlobalRegistrator } = await import('@happy-dom/global-registrator');
  GlobalRegistrator.register({ url: 'https://lootsurvivor.io/play', width: 1280, height: 800 });
  // the engine is pure computation: block network access from the bundle (analytics, presets, RPC)
  globalThis.fetch = (async (u: unknown) => {
    throw new Error(`offline: ${String(u).slice(0, 80)}`);
  }) as typeof fetch;
  (globalThis as Record<string, unknown>).WebSocket = class {
    onerror?: (e: Error) => void;
    constructor() {
      setTimeout(() => this.onerror?.(new Error('offline')), 0);
    }
    send() {}
    close() {}
    addEventListener() {}
    removeEventListener() {}
  };
  process.on('unhandledRejection', () => {});
  browserReady = true;
}

function exportKey(src: string, local: string): string | null {
  const exp = src.slice(src.lastIndexOf('export{'));
  const esc = local.replace(/\$/g, '\\$');
  const m = new RegExp(`(?:^|[{,])${esc} as ([\\w$]+)`).exec(exp);
  return m ? m[1] : null;
}

export interface SiteEngine {
  store: Store;
  director: Director;
  dir: string;
}

/** Load the client engine from a frontend dump directory (contains assets/*.js). */
export async function loadSiteEngine(dumpDir: string): Promise<SiteEngine> {
  await registerBrowser();
  const assets = join(dumpDir, 'assets');
  const files = readdirSync(assets).filter((f) => f.endsWith('.js'));
  let director: Director | null = null;
  let store: Store | null = null;
  for (const f of files) {
    const src = readFileSync(join(assets, f), 'utf8');
    if (!director && src.includes('{clientGameAction:')) {
      // var Va={clientGameAction:...}, Ha=()=>Va ; export {Ha as Y}
      const v = /(?:var |[,;])([\w$]+)=\{clientGameAction:/.exec(src)?.[1];
      const h = v ? new RegExp(`[,;\\s]([\\w$]+)=\\(\\)=>${v.replace(/\$/g, '\\$')}(?![\\w$])`).exec(src)?.[1] : undefined;
      const key = h ? exportKey(src, h) : null;
      if (key) {
        const mod = await import(pathToFileURL(join(assets, f)).href);
        director = (mod[key] as () => Director)();
      }
    }
    if (!store && src.includes('setDemoGame:') && src.includes('clientOnlyGame:!1')) {
      const s = /(?:var |[,;])([\w$]+)=[\w$]+\([\w$]+=>\(\{gameId:null,dungeonId:null/.exec(src)?.[1];
      const key = s ? exportKey(src, s) : null;
      if (key) {
        const mod = await import(pathToFileURL(join(assets, f)).href);
        store = mod[key] as Store;
      }
    }
    if (director && store) break;
  }
  if (!director) throw new Error('site engine: clientGameAction not found in the frontend bundle (the site changed; update src/v2/site-engine.ts)');
  if (!store) throw new Error('site engine: game store not found in the frontend bundle');
  return { store, director, dir: dumpDir };
}

/** Chain GameSettings JSON (strings) -> the shape the client engine uses. */
export function siteSettings(raw: Record<string, unknown>): Record<string, unknown> {
  const conv = (o: unknown, key = ''): unknown => {
    if (Array.isArray(o)) return o.map((x) => conv(x));
    if (o && typeof o === 'object') return Object.fromEntries(Object.entries(o).map(([k, v]) => [k, conv(v, k)]));
    if (typeof o === 'string' && /^\d+$/.test(o) && !key.startsWith('pair') && o.length < 16) return Number(o);
    return o;
  };
  const s = conv(raw) as Record<string, any>;
  if (s.bag && !Array.isArray(s.bag)) {
    s.bag = Object.entries(s.bag)
      .filter(([k]) => k.startsWith('item_'))
      .sort((a, b) => Number(a[0].slice(5)) - Number(b[0].slice(5)))
      .map(([, v]) => v);
  }
  return s;
}

/** One client-only game driven through the site engine. */
export class SiteGame {
  readonly engine: SiteEngine;
  readonly gameId: string;

  constructor(engine: SiteEngine, gameId: string, settings: Record<string, unknown>) {
    this.engine = engine;
    this.gameId = gameId;
    engine.store.setState({
      gameId,
      gameSettings: settings,
      clientOnlyGame: true,
      tutorialActive: false,
      spectating: false,
      dungeonId: null,
      adventurer: null,
      adventurerState: null,
      bag: [],
      beast: null,
    });
  }

  get state(): { adventurer: any; bag: any[]; beast: any } {
    const s = this.engine.store.getState();
    return { adventurer: s.adventurer, bag: s.bag ?? [], beast: s.beast ?? null };
  }

  /** Run one action; returns the engine events ([] means the engine rejected it). */
  act(action: SiteAction): SiteEvent[] {
    const events = this.engine.director.clientGameAction(action);
    const patch: Record<string, unknown> = {};
    for (const e of events) {
      if (e.type === 'adventurer') {
        patch.adventurer = e.adventurer;
        patch.adventurerState = e.adventurer;
      } else if (e.type === 'bag') patch.bag = e.bag;
      else if (e.type === 'beast') patch.beast = e.beast;
    }
    const adv = (patch.adventurer ?? this.engine.store.getState().adventurer) as { beast_health?: number } | null;
    if (adv && (adv.beast_health ?? 0) <= 0) patch.beast = null;
    if (Object.keys(patch).length) this.engine.store.setState(patch);
    return events;
  }

  /** The UI equips bag items in the store first, then sends `equip` (equipmentApplied=true). */
  equipFromBag(itemIds: number[]): SiteEvent[] {
    const st = this.engine.store.getState();
    for (const id of itemIds) {
      const item = (st.bag as Array<{ id: number; xp: number }>).find((b) => b.id === id);
      if (item) this.engine.store.getState().equipItem(item);
    }
    return this.act({ type: 'equip', items: itemIds });
  }
}
