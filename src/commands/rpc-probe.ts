// `rpc-probe`: raw answers of RPC endpoints (status and the first bytes of the body) for chainId, specVersion and
// the Cartridge paymaster method, to see which endpoint still speaks JSON-RPC.
export async function runRpcProbeCommand(opts: { urls: string[] }): Promise<void> {
  const calls = [
    { method: 'starknet_chainId', params: [] },
    { method: 'starknet_specVersion', params: [] },
    { method: 'cartridge_addExecuteOutsideTransaction', params: [] },
  ];
  for (const url of opts.urls) {
    for (const c of calls) {
      try {
        const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, ...c }) });
        const body = (await r.text()).replace(/\s+/g, ' ').slice(0, 220);
        console.log(`${url} ${c.method}: HTTP ${r.status} ${body}`);
      } catch (e) {
        console.log(`${url} ${c.method}: ${(e as Error).message}`);
      }
    }
  }
}
