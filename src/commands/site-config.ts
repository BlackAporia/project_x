// `site-config`: write site/bot-config.json - what the website needs to approve a bot session in the browser (the
// same keychain URL, RPC and least-privilege policies the Node session provider uses) and to start bot runs.
import { writeFileSync } from 'node:fs';
import { DUNGEON_SETTINGS, MAINNET } from '../chain/config.ts';
import { parsedBotPolicies } from '../chain/mainnet.ts';
import { GAME_ACCOUNT } from '../chain/game-account.ts';

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
    gameAccount: { classHash: GAME_ACCOUNT.classHash, secret: 'GAME_SESSION_LINK', shareFrom: 'https://lootsurvivor.io/ronkeverse' },
  };
}

export function runSiteConfigCommand(): void {
  writeFileSync(SITE_CONFIG_PATH, JSON.stringify(siteConfig(), null, 2) + '\n');
  console.log(`wrote ${SITE_CONFIG_PATH}`);
}
