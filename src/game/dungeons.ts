// Dungeon game settings (V2 game core) -> engine Settings, for simulating and tuning per dungeon.
// config/dungeon-settings.json is a snapshot from `npm run bot -- dungeon-settings`; the CLI refreshes it in CI.
import { existsSync, readFileSync } from 'node:fs';
import { DUNGEON_SETTINGS } from '../chain/config.ts';
import { decodeAdventurer, decodeBag } from '../chain/state.ts';
import { defaultSettings } from './engine.ts';
import type { Settings } from './types.ts';

interface Snapshot {
  settings: Record<string, { name?: string; settings: Record<string, any> }>;
}

export function loadSnapshot(path = 'config/dungeon-settings.json'): Snapshot {
  if (!existsSync(path)) return { settings: {} };
  return JSON.parse(readFileSync(path, 'utf8')) as Snapshot;
}

/** Resolve "ronke" / "7" / "default" to a settings id. */
export function resolveSettingsId(dungeon: string | number): number {
  if (typeof dungeon === 'number') return dungeon;
  if (/^\d+$/.test(dungeon)) return Number(dungeon);
  const key = dungeon.toLowerCase().replace(/[^a-z]/g, '');
  if (key === '' || key === 'default') return 0;
  const d = DUNGEON_SETTINGS[key];
  if (!d) throw new Error(`unknown dungeon "${dungeon}" (known: default, ${Object.keys(DUNGEON_SETTINGS).join(', ')})`);
  return d.ids[0];
}

/** Engine settings that reproduce a dungeon's client-only (practice) games. */
export function dungeonEngineSettings(dungeon: string | number, snapshot = loadSnapshot()): { settings: Settings; label: string } {
  const id = resolveSettingsId(dungeon);
  const entry = snapshot.settings[String(id)];
  if (!entry) throw new Error(`no snapshot of game settings #${id} (run: npm run bot -- dungeon-settings --ids ${id} --data config)`);
  const raw = entry.settings;
  const settings: Settings = {
    ...defaultSettings(),
    statsMode: 'Dodge',
    baseDamageReduction: Number(raw.base_damage_reduction ?? 0),
    marketSize: 0, // practice games accept any item
    noStarterBeast: true,
    noItemSpecials: true,
    startAdventurer: decodeAdventurer(raw.adventurer),
    startBag: decodeBag(raw.bag),
    randomStartingStats: Number(raw.random_starting_stats ?? 0),
  };
  return { settings, label: `${entry.name || 'settings'} #${id}` };
}
