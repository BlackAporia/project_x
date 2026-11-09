// RPC helpers: pick the first healthy endpoint, retry transient failures with exponential backoff.
import { RpcProvider } from 'starknet';

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function retry<T>(fn: () => Promise<T>, opts: { tries?: number; baseMs?: number; label?: string } = {}): Promise<T> {
  const tries = opts.tries ?? 4;
  const base = opts.baseMs ?? 1000;
  let last: unknown;
  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      if (i < tries - 1) {
        const msg = e instanceof Error ? e.message : String(e);
        if (opts.label) console.warn(`[retry] ${opts.label} failed (${i + 1}/${tries}): ${msg.slice(0, 200)}`);
        await sleep(base * 2 ** i);
      }
    }
  }
  throw last;
}

const MAINNET_CHAIN_ID = '0x534e5f4d41494e';
const STRK_TOKEN = '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d';

/** Connect to the first RPC URL that answers starknet_chainId; when none does (all public endpoints were down
 *  for a moment and a whole run was lost), try again for a few minutes. */
export async function connectProvider(urls: string[], rounds = Number(process.env.RPC_CONNECT_ROUNDS ?? 6)): Promise<{ provider: RpcProvider; url: string; chainId: string }> {
  let errors: string[] = [];
  for (let round = 0; round < Math.max(1, rounds); round++) {
    if (round) {
      console.warn(`[rpc] no endpoint reachable (round ${round}/${rounds}), retrying in ${10 * round} s; first error: ${errors[0] ?? '-'}`);
      await sleep(10_000 * round);
    }
    errors = [];
    for (const url of urls) {
      try {
        const provider = new RpcProvider({ nodeUrl: url });
        const chainId = await provider.getChainId();
        // some public endpoints answer chainId but not starknet_call (-32601): only accept one that can read contracts
        if (chainId === MAINNET_CHAIN_ID) await provider.callContract({ contractAddress: STRK_TOKEN, entrypoint: 'decimals', calldata: [] });
        return { provider, url, chainId };
      } catch (e) {
        errors.push(`${url}: ${(e instanceof Error ? e.message : String(e)).replace(/\s+/g, ' ').slice(0, 200)}`);
      }
    }
  }
  throw new Error(`no RPC endpoint reachable:\n  ${errors.join('\n  ')}`);
}
