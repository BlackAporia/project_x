// `site-config`: write site/bot-config.json - what the website needs to approve a bot session in the browser (the
// same keychain URL, RPC and least-privilege policies the Node session provider uses) and to start bot runs.
import { writeFileSync } from 'node:fs';
import { DUNGEON_SETTINGS, MAINNET } from '../chain/config.ts';
import { parsedBotPolicies } from '../chain/mainnet.ts';
import { hash } from 'starknet';
import { GAME_ACCOUNT } from '../chain/game-account.ts';
import { GAME_ACCOUNT_SALT, MAX_SESSION_SECONDS, SELF_PAID, defaultPermissions } from '../chain/game-session-terms.ts';

export const SITE_CONFIG_PATH = 'site/bot-config.json';

export function siteConfig() {
  return {
    keychainUrl: 'https://x.cartridge.gg',
    rpcUrl: MAINNET.cartridgeRpc,
    chainId: MAINNET.chainId,
    policies: parsedBotPolicies(),
    dungeons: ['default', ...Object.keys(DUNGEON_SETTINGS)],
    workflows: { bot: 'bot.yml', learn: 'learn.yml', pages: 'pages.yml' },
    secret: 'CARTRIDGE_SESSION_B64',
    gameCore: MAINNET.gameCoreV2,
    provingGrounds: MAINNET.provingGrounds,
    gameAccount: {
      classHash: GAME_ACCOUNT.classHash,
      salt: GAME_ACCOUNT_SALT,
      secret: 'GAME_SESSION_LINK',
      // what the owner approves: the same terms lootsurvivor.io asks for (its session manager / Share is off)
      permissions: defaultPermissions({ lootDungeon: MAINNET.lootDungeon, provingGrounds: MAINNET.provingGrounds, gameCore: MAINNET.gameCoreV2 }),
      maxSessionSeconds: MAX_SESSION_SECONDS,
      maxSelfPaidTxs: SELF_PAID.maxSelfPaidTxs.toString(),
      maxFeeExceptions: SELF_PAID.maxFeeExceptions.toString(),
      rpcUrls: [MAINNET.cartridgeRpc, ...MAINNET.rpcUrls.filter((u) => u !== MAINNET.cartridgeRpc)],
      selectors: { get_session_epoch: hash.getSelectorFromName('get_session_epoch'), balance_of: hash.getSelectorFromName('balance_of') },
      strk: '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d',
    },
  };
}

export function runSiteConfigCommand(): void {
  writeFileSync(SITE_CONFIG_PATH, JSON.stringify(siteConfig(), null, 2) + '\n');
  console.log(`wrote ${SITE_CONFIG_PATH}`);
}
