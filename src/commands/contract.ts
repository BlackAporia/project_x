// `contract`: inspect live mainnet contracts from CI (the dev sandbox has no Starknet access).
//   contract --address 0x.. [--address 0x..]        ABI functions (inputs -> outputs) and class hash
//   contract --address 0x.. --call name[:arg,arg]   also call view functions (no account needed)
// Output: data/contracts/<address>.json on bot-data and a readable summary in the log.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Abi } from 'starknet';
import { abiFunctions, fetchAbi } from '../chain/abi.ts';
import { MAINNET } from '../chain/config.ts';
import { connectProvider } from '../chain/rpc.ts';

const pad = (a: string) => '0x' + BigInt(a).toString(16).padStart(64, '0');

export async function runContractCommand(opts: { addresses: string[]; calls: string[]; dataDir: string }): Promise<void> {
  const { provider } = await connectProvider(MAINNET.rpcUrls);
  const outDir = join(opts.dataDir, 'contracts');
  mkdirSync(outDir, { recursive: true });
  for (const address of opts.addresses.map(pad)) {
    const report: Record<string, unknown> = { address, updated: new Date().toISOString() };
    let abi: Abi;
    try {
      report.classHash = pad(await provider.getClassHashAt(address));
      abi = await fetchAbi(provider, address);
    } catch (e) {
      // not a deployed contract: maybe a class hash (e.g. the Game Account class)
      try {
        const cls = (await provider.getClass(address)) as { abi: Abi | string };
        abi = typeof cls.abi === 'string' ? (JSON.parse(cls.abi) as Abi) : cls.abi;
        report.classHash = address;
        report.isClass = true;
      } catch {
        report.classHash = null;
        report.error = `not deployed: ${(e as Error).message.slice(0, 200)}`;
        console.log(`${address}: not deployed`);
        writeFileSync(join(outDir, `${address}.json`), JSON.stringify(report, null, 1) + '\n');
        continue;
      }
    }
    const fns = abiFunctions(abi);
    report.functions = fns.map((f) => ({ name: f.name, inputs: f.inputs, outputs: f.outputs, state: f.state_mutability }));
    console.log(`${address} class ${report.classHash}: ${fns.length} functions`);
    for (const f of fns) {
      console.log(`  ${f.state_mutability === 'view' ? 'view ' : 'write'} ${f.name}(${f.inputs.map((i) => `${i.name}: ${i.type.split('::').pop()}`).join(', ')}) -> ${f.outputs.map((o) => o.type.split('::').pop()).join(', ')}`);
    }
    const results: Record<string, unknown> = {};
    for (const spec of report.isClass ? [] : opts.calls) {
      const [name, args = ''] = spec.split(':');
      if (!fns.some((f) => f.name === name)) continue;
      try {
        const calldata = args ? args.split(',').map((a) => a.trim()).filter(Boolean) : [];
        const r = await provider.callContract({ contractAddress: address, entrypoint: name, calldata });
        results[spec] = r;
        console.log(`  ${spec} = [${r.join(', ')}]`);
      } catch (e) {
        results[spec] = { error: (e as Error).message.slice(0, 300) };
        console.log(`  ${spec} failed: ${(e as Error).message.slice(0, 200)}`);
      }
    }
    report.calls = results;
    writeFileSync(join(outDir, `${address}.json`), JSON.stringify(report, null, 1) + '\n');
  }
}
