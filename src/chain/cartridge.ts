// `npm run authorize`: one-time Cartridge Controller session approval (run on your own computer, needs a browser).
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { SESSION_DIR, sessionProvider } from './mainnet.ts';

export async function runAuthorizeCommand(): Promise<void> {
  const sp = await sessionProvider();
  const existing = await sp.probe().catch(() => undefined);
  if (existing) {
    console.log(`Session already active for ${existing.address}.`);
  } else {
    console.log('Opening Cartridge to approve a session for the loot-survivor preset...');
    console.log('(If no browser opens, copy the printed URL into your browser and log in with your Controller.)');
    const account = await sp.connect();
    if (!account) throw new Error('Session was not approved');
    console.log(`Session approved for ${account.address}.`);
  }
  const file = join(SESSION_DIR, 'session.json');
  if (!existsSync(file)) throw new Error(`expected session file at ${file}`);
  console.log(`
Next: store the session as a GitHub secret (the file contains the session key, never commit or share it):

  base64 -w0 ${file} | gh secret set CARTRIDGE_SESSION_B64      # Linux
  base64 -i ${file} | gh secret set CARTRIDGE_SESSION_B64        # macOS
  [Convert]::ToBase64String([IO.File]::ReadAllBytes("${file}")) | gh secret set CARTRIDGE_SESSION_B64   # PowerShell

or paste the base64 text in GitHub -> Settings -> Secrets and variables -> Actions -> New repository secret.
Sessions expire; re-run this command when the bot reports an expired session.`);
}
