// Network configuration. Every value can be overridden with an environment variable so the bot keeps working
// when Provable Games redeploys contracts (run `npm run discover` to see what is live).
import { readFileSync } from 'node:fs';

const env = (k: string, d: string) => (process.env[k] && process.env[k]!.trim() !== '' ? process.env[k]!.trim() : d);
const list = (k: string, d: string[]) => (process.env[k] ? process.env[k]!.split(',').map((s) => s.trim()).filter(Boolean) : d);

export const MAINNET = {
  chainId: '0x534e5f4d41494e', // SN_MAIN
  rpcUrls: list('STARKNET_RPC_URLS', [
    'https://api.cartridge.gg/x/starknet/mainnet/rpc/v0_9',
    'https://api.cartridge.gg/x/starknet/mainnet',
    'https://starknet-mainnet.public.blastapi.io/rpc/v0_9',
    'https://rpc.starknet.lava.build',
  ]),
  /** Cartridge RPC: also serves cartridge_addExecuteOutsideTransaction (paymaster + VRF wrapping) */
  cartridgeRpc: env('CARTRIDGE_RPC_URL', 'https://api.cartridge.gg/x/starknet/mainnet'),
  preset: env('CARTRIDGE_PRESET', 'loot-survivor'),
  // Current Death Mountain deployment (docs.provable.games/lootsurvivor/contracts + Cartridge preset, Sep-Oct 2026)
  gameCore: env('GAME_CORE_ADDRESS', '0x023f86f5b4702f6ba114b82fb73448c58aad8f37a28b508b80bf129ee1edc405'),
  // commit-reveal (V2) game core used by lootsurvivor.io for Beast Mode, Loot Bag, Ronke Casino... (VITE_PUBLIC_LOOT_GAME_CORE_ADDRESS)
  gameCoreV2: env('GAME_CORE_V2_ADDRESS', '0x011afdfce6a8c4514c542f57f9ec91a9076784e229df55e1a3d6ec4f9c40183b'),
  /** Proving Grounds: free `enter_dungeon()` (mints a V2 game with the default settings #0; the player pays gas) */
  provingGrounds: env('PROVING_GROUNDS_ADDRESS', '0x00d042acfc0160b6d725281eca1fb856c3e08ed46fbc20405b4d32d5f3b8ac02'),
  /** main dungeon (Loot Bag entry) */
  lootDungeon: env('LOOT_DUNGEON_ADDRESS', '0x02dab28ac4edaae7495174f9dd7668eece14b1e50ce170ff8af2a0e215f48875'),
  gameCoreV2Legacy: env('GAME_CORE_V2_LEGACY_ADDRESS', '0x06179f1c747672c08861da1df3b167eb337cba403778345db2aa9840cc3deb86'),
  gameToken: env('GAME_TOKEN_ADDRESS', '0x04de0351ceab4ecd50be6ee09329b0dcb3b96a9da88cc158f453823a389722fa'),
  combat: env('COMBAT_ADDRESS', '0x045b55409c6b5000132211a1c03dab1ae71ea2e51b53b3796f040b80850ec959'),
  exploration: env('EXPLORATION_ADDRESS', '0x026aa88895cfd078bc16e9f089703c70ea492c778a48b55b7f58ad6f6eb134d6'),
  market: env('MARKET_ADDRESS', '0x048490fa26e9916d13ea03a9ac7e205f9301bbbe2ae2b2b8369b59bf2962ca44'),
  inventory: env('INVENTORY_ADDRESS', '0x0445ba9a79934e2f330e5bcda102ca29b9e03284840c36e5804f2a24a808f5a7'),
  statUpgrades: env('STAT_UPGRADES_ADDRESS', '0x06a33a060f20eda810d3d8f6a10038b2780c1b87b39cfaca09ad3b1e06476ef5'),
  vrfProvider: env('VRF_PROVIDER_ADDRESS', '0x051fea4450da9d6aee758bdeba88b2f665bcbf549d2c61421aa724e9ac0ced8f'),
  dungeonTicket: env('DUNGEON_TICKET_ADDRESS', '0x0452810188c4cb3aebd63711a3b445755bc0d6c4f27b923fdd99b1a118858136'),
  dungeonEntry: env('DUNGEON_ENTRY_ADDRESS', '0x00bcda5aa421e6ea01a9917839551db741eb260713cd35c6a8e6f1a1293fd0a5'),
  denshokan: env('DENSHOKAN_ADDRESS', '0x00263cc540dac11334470a64759e03952ee2f84a290e99ba8cbc391245cd0bf9'),
  dungeons: {
    beastMode: env('BEAST_MODE_DUNGEON', '0x0539d24dfdaa2866d975fa93db501b971c08786f2c88e719800be39903e43bbc'),
    greed: env('GREED_DUNGEON', '0x046db77f066f1bec5ae53d2cf3686a262f308eb904e6b426251bcdf3a6bf34f0'),
    hyperGreed: env('HYPER_GREED_DUNGEON', '0x012ac35cf5112dd1bacd2f1e7342eb5951566262ab52c3c7dddd2b9a77840741'),
    karats: env('KARATS_DUNGEON', '0x0337e25669f6cc7b81a507ebe0d908249cacad9b6e2c0fa43fecb6b6b04b109e'),
    // Ronke Casino promotion (VITE_PUBLIC_RONKEVERSE_ADDRESS); settings variants 7/6/5/4, minter 12
    ronkeverse: env('RONKEVERSE_DUNGEON', '0x037124697382d8a049b617588197fd07648a788e67168b12324c1668b9cce2c0'),
    beastModeV2: env('BEAST_MODE_V2_DUNGEON', '0x0368066825ff8c7ed2b2e73ff513ebd9dc6e41afcbbf853bcf2f793a67a0c264'),
    lootBag: env('LOOT_BAG_DUNGEON', '0x02dab28ac4edaae7495174f9dd7668eece14b1e50ce170ff8af2a0e215f48875'),
    lilDuckies: env('LIL_DUCKIES_DUNGEON', '0x04427c2cdd82bf2283deb39aa939e1ad61051ab932e0de714032fbe22ed0a419'),
    yield: env('YIELD_DUNGEON', '0x0616042ee02abc8c73d7eb975d33ade3b53f8296005363d1ee56a1ccefd4f49f'),
  },
  /** Denshokan indexer API (game tokens, scores, ranks) */
  denshokanApi: env('DENSHOKAN_API', 'https://denshokan-api-production.up.railway.app'),
  /** API used by lootsurvivor.io watch page (live adventurer state, activity feed) */
  watchApi: env('WATCH_API', 'https://super-death-mountain-production.up.railway.app'),
  /** Loot Survivor game id inside Denshokan (low 30 bits of every packed token id) */
  denshokanGameId: Number(env('DENSHOKAN_GAME_ID', '1')),
};

export const PRACTICE = {
  // Free practice dungeon ("Practice for Free" on lootsurvivor.io): Cartridge Katana slot, no VRF, no fees.
  rpcUrls: list('PRACTICE_RPC_URLS', ['https://api.cartridge.gg/x/pg-slot-4/katana']),
  toriiUrl: env('PRACTICE_TORII_URL', 'https://api.cartridge.gg/x/pg-slot-5/torii'),
  namespace: env('PRACTICE_NAMESPACE', 'ls_0_0_6'),
  gameSystems: env('PRACTICE_GAME_SYSTEMS', '0x7933c7e622f1dda406a6f69cbce12c97f36c2b738b442f50a2a1fcea7f6a530'),
  gameTokenSystems: env('PRACTICE_GAME_TOKEN_SYSTEMS', '0x56a32ac6baa3d3e2634d55e6f2ca07bfee4ab09c6c6f0b93d456b0a6da4c84c'),
  settingsSystems: env('PRACTICE_SETTINGS_SYSTEMS', '0x592c60a1de008b0ae2cf9e08674c36d179d5cc7b51482ee26498806273c5bfe'),
  adventurerSystems: env('PRACTICE_ADVENTURER_SYSTEMS', '0x1005f63c805f1ef42521e69292dad3505223bf43f7a20cb292dc52823faff95'),
  /** account class used by the official client for practice burner accounts */
  burnerClassHash: env('PRACTICE_BURNER_CLASS_HASH', '0x07dc7899aa655b0aae51eadff6d801a58e97dd99cf4666ee59e704249e51adf2'),
  settingsId: Number(env('PRACTICE_SETTINGS_ID', '0')),
};

let practiceAbiCache: Record<string, { address: string; abi: unknown[] }> | null = null;

/** ABIs of the practice slot contracts (extracted from the official client manifest). */
export function practiceAbis(): Record<string, { address: string; abi: unknown[] }> {
  if (!practiceAbiCache) {
    const raw = JSON.parse(readFileSync(new URL('../../config/abi/practice-slot.json', import.meta.url), 'utf8'));
    practiceAbiCache = raw.contracts;
  }
  return practiceAbiCache!;
}

/** Game settings ids of dungeons on the V2 game core (from the lootsurvivor.io frontend config). */
export const DUNGEON_SETTINGS: Record<string, { ids: number[]; labels: string[]; note: string }> = {
  ronke: { ids: [7, 6, 5, 4], labels: ['Ronke 800+', 'Ronke 300+', 'Holder', 'Survivor & FOMO'], note: 'Ronke Casino (Ronkeverse promotion)' },
  beastmode: { ids: [2], labels: ['Beast Mode'], note: 'Beast Mode' },
  lootbag: { ids: [1], labels: ['Loot Bag'], note: 'Loot Bag' },
  greed: { ids: [1], labels: ['Greed Run'], note: 'Greed Run (practice available)' },
  karats: { ids: [3], labels: ['Karats'], note: 'Karats' },
  raidboss: { ids: [17], labels: ['Raid Boss'], note: 'Raid Boss' },
};
