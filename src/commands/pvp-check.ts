// `pvp-check`: read-only diagnosis of entering a PvP table, run from CI (the dev sandbox has no Starknet access).
//   - Budokan's entry types (QualificationProof, EntryRequirement...), the table's tournament record and entries
//   - the entry-requirement extension's ABI and its views for this table
//   - enter_tournament simulated from the Game Account (SKIP_VALIDATE: no key, nothing is sent) with each plausible
//     qualification, printing the full revert reason
//   - the PvP / entry APIs for the account
import { MAINNET } from '../chain/config.ts';
import { connectProvider, decodeFelts } from '../chain/rpc.ts';
import { resolveQualification } from './pvp.ts';

const hex = (v: bigint | number | string) => '0x' + BigInt(v).toString(16);

export async function runPvpCheckCommand(opts: { tournamentId?: string; address?: string }): Promise<void> {
  const { provider, url } = await connectProvider(MAINNET.rpcUrls);
  const budokan = MAINNET.pvp.budokan;
  const address = opts.address ?? '0x066d5a1db95492c40629a376cbe9cfedadf24636d251ad6b4b371db72ef7a452';
  const rpc = async (method: string, params: unknown) => {
    const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }) });
    return (await r.json()) as { result?: any; error?: { code: number; message: string; data?: unknown } };
  };
  const call = async (target: string, entrypoint: string, calldata: Array<bigint | number | string> = []) =>
    (await provider.callContract({ contractAddress: target, entrypoint, calldata: calldata.map((x) => hex(x)) })).map((x) => BigInt(x));
  const show = (label: string, v: bigint[] | string) => console.log(`${label}: ${typeof v === 'string' ? v : v.map((x) => hex(x)).join(',')}`);
  const tryCall = async (label: string, target: string, ep: string, cd: Array<bigint | number | string>) => {
    try {
      show(label, await call(target, ep, cd));
    } catch (e) {
      const m = (e as Error).message;
      show(label, `ERROR ${m.slice(-400)} ${decodeFelts(m)}`);
    }
  };

  // 1) API view of the account
  const api = MAINNET.pvp.api;
  let tid = opts.tournamentId;
  for (const path of [`tables/status?address=${address}`, `tables/check?address=${address}`]) {
    try {
      const r = await fetch(`${api}/${path}`, { headers: { accept: 'application/json' } });
      const body = await r.text();
      console.log(`GET ${path}: HTTP ${r.status} ${body.slice(0, 1500)}`);
      if (!tid && path.startsWith('tables/status') && r.ok) tid = String(JSON.parse(body)?.table?.tournamentId ?? '') || undefined;
    } catch (e) {
      console.log(`GET ${path}: ${(e as Error).message}`);
    }
  }
  if (!tid) {
    console.log('no table: nothing more to check');
    return;
  }
  try {
    const r = await fetch(`${api}/entry/status?tournament=${tid}&address=${encodeURIComponent(address)}`, { headers: { accept: 'application/json' } });
    console.log(`GET entry/status: HTTP ${r.status} ${(await r.text()).slice(0, 800)}`);
  } catch (e) {
    console.log(`GET entry/status: ${(e as Error).message}`);
  }

  // 2) Budokan types and the table
  const cls = (await provider.getClassAt(budokan)) as { abi: unknown };
  const abi = (typeof cls.abi === 'string' ? JSON.parse(cls.abi) : cls.abi) as Array<Record<string, any>>;
  const types = abi.filter((e) => (e.type === 'enum' || e.type === 'struct') && /QualificationProof|EntryRequirement|ExtensionConfig|Registration|RewardType|TournamentRecipientParams|EntryFee|PrizeType|Phase/.test(e.name));
  for (const t of types) console.log(`${t.type} ${t.name} ${JSON.stringify(t.variants ?? t.members)}`);
  const fns: Array<Record<string, any>> = [];
  for (const e of abi) {
    if (e.type === 'interface') fns.push(...(e.items as Array<Record<string, any>>));
    else if (e.type === 'function') fns.push(e);
  }
  for (const f of fns.filter((x) => /tournament|entry|registr|phase|qualif/.test(String(x.name)) && x.state_mutability === 'view'))
    console.log(`view ${f.name}(${(f.inputs as any[]).map((i) => `${i.name}: ${String(i.type).split('::').pop()}`).join(', ')})`);
  const T = BigInt(tid);
  await tryCall(`current_phase(${tid})`, budokan, 'current_phase', [T]);
  for (const name of ['get_tournament', 'tournament']) if (fns.some((f) => f.name === name)) await tryCall(`${name}(${tid})`, budokan, name, [T]);
  await tryCall('get_entry_requirement', budokan, 'get_entry_requirement', [T]);
  await tryCall('get_entry_fee', budokan, 'get_entry_fee', [T]);
  const count = await call(budokan, 'get_entry_count', [T]).then((x) => Number(x[0])).catch(() => 0);
  console.log(`entries: ${count}`);
  for (let i = 1; i <= Math.min(count, 40); i++) await tryCall(`get_entry(${tid}, ${i})`, budokan, 'get_entry', [T, i]);

  // 3) the entry-requirement extension
  const req = await call(budokan, 'get_entry_requirement', [T]).catch(() => [] as bigint[]);
  const ext = req.length >= 4 && req[0] === 0n && req[2] === 1n ? hex(req[3]) : MAINNET.pvp.merkleValidator;
  try {
    const ec = (await provider.getClassAt(ext)) as { abi: unknown };
    const eabi = (typeof ec.abi === 'string' ? JSON.parse(ec.abi) : ec.abi) as Array<Record<string, any>>;
    const efns: Array<Record<string, any>> = [];
    for (const e of eabi) {
      if (e.type === 'interface') efns.push(...(e.items as Array<Record<string, any>>));
      else if (e.type === 'function') efns.push(e);
    }
    for (const f of efns) console.log(`extension ${ext} ${f.state_mutability === 'view' ? 'view' : 'ext'} ${f.name}(${(f.inputs as any[]).map((i) => `${i.name}: ${String(i.type).split('::').pop()}`).join(', ')}) -> ${(f.outputs as any[]).map((o) => String(o.type).split('::').pop()).join(',')}`);
    for (const f of efns.filter((x) => x.state_mutability === 'view')) {
      const ins = (f.inputs as Array<{ name: string; type: string }>).map((i) => i.type);
      // guess arguments: (context/tournament id, address, Span qualification)
      const args: Array<bigint | number | string> = [];
      let ok = true;
      for (const [k, t] of ins.entries()) {
        if (/u64|u32|u128/.test(t)) args.push(k === 0 ? T : 0n);
        else if (/ContractAddress/.test(t)) args.push(k === 0 ? budokan : address);
        else if (/Span|Array/.test(t)) args.push(0);
        else if (/felt252/.test(t)) args.push(T);
        else ok = false;
      }
      if (ok) await tryCall(`extension ${f.name}(${args.map((a) => hex(a)).join(',')})`, ext, String(f.name), args);
    }
  } catch (e) {
    console.log(`extension ${ext}: ${(e as Error).message.slice(0, 200)}`);
  }

  // 4) enter_tournament simulated from the account with each plausible qualification
  const qp = types.find((t) => t.type === 'enum' && /QualificationProof/.test(t.name));
  const variants: Array<{ label: string; q: string[] }> = [{ label: 'None', q: ['0x1'] }];
  const allow = await resolveQualification(call, T, address).catch((e: Error) => ({ required: true, qualification: null, note: e.message }) as Awaited<ReturnType<typeof resolveQualification>>);
  console.log(`allowlist: ${allow.note}`);
  if (allow.qualification) variants.unshift({ label: `Some(Extension(proof ${allow.qualification.length}))`, q: ['0x0', '0x1', hex(allow.qualification.length), ...allow.qualification] });
  const ctxTree = await call(ext, 'get_context_tree', [budokan, T]).catch(() => [] as bigint[]);
  show(`extension get_context_tree(budokan, ${tid})`, ctxTree);
  for (const id of [...new Set([T, ...ctxTree.filter((x) => x > 0n)])]) {
    for (const path of [`trees/${id}`, `trees/${id}/proof/${address.toLowerCase()}`]) {
      try {
        const r = await fetch(`${MAINNET.pvp.merkleApi}/${path}`, { headers: { accept: 'application/json' } });
        console.log(`merkle GET ${path}: HTTP ${r.status} ${(await r.text()).slice(0, 600)}`);
      } catch (e) {
        console.log(`merkle GET ${path}: ${(e as Error).message}`);
      }
    }
  }
  for (const [i, v] of ((qp?.variants ?? []) as Array<{ name: string; type: string }>).entries()) {
    if (/Span|Array/.test(v.type)) variants.push({ label: `Some(${v.name}([]))`, q: ['0x0', hex(i), '0x0'] });
  }
  const nonce = await provider.getNonceForAddress(address).catch(() => '0x0');
  const block = (await rpc('starknet_getBlockWithTxHashes', { block_id: 'latest' })).result ?? {};
  const price = (k: string) => hex(BigInt(block?.[k]?.price_in_fri ?? '0x0') * 3n);
  for (const v of variants) {
    for (const player of [['0x0', address], ['0x1']]) {
      const inner = [hex(T), ...player, '0x1', ...v.q, '0x1'];
      const sel = '0x' + (await import('starknet')).hash.getSelectorFromName('enter_tournament').replace(/^0x/, '');
      const tx = {
        type: 'INVOKE',
        version: '0x3',
        sender_address: address,
        calldata: ['0x1', budokan, sel, hex(inner.length), ...inner],
        signature: [],
        nonce,
        resource_bounds: {
          l1_gas: { max_amount: '0x0', max_price_per_unit: price('l1_gas_price') },
          l1_data_gas: { max_amount: '0x2000', max_price_per_unit: price('l1_data_gas_price') },
          l2_gas: { max_amount: hex(400_000_000n), max_price_per_unit: price('l2_gas_price') },
        },
        tip: '0x0',
        paymaster_data: [],
        account_deployment_data: [],
        nonce_data_availability_mode: 'L1',
        fee_data_availability_mode: 'L1',
      };
      const label = `simulate enter_tournament(player ${player.length > 1 ? 'Some(account)' : 'None'}, qualification ${v.label})`;
      const r = await rpc('starknet_simulateTransactions', { block_id: 'latest', transactions: [tx], simulation_flags: ['SKIP_VALIDATE', 'SKIP_FEE_CHARGE'] });
      if (r.error) {
        const m = JSON.stringify(r.error);
        console.log(`${label}: RPC ERROR ${m.slice(0, 1500)} || ${decodeFelts(m)}`);
        continue;
      }
      const trace = r.result?.[0]?.transaction_trace ?? {};
      const exe = trace.execute_invocation ?? {};
      if (exe.revert_reason) console.log(`${label}: REVERTED ${String(exe.revert_reason).slice(0, 1500)} || ${decodeFelts(String(exe.revert_reason))}`);
      else console.log(`${label}: OK result ${JSON.stringify(exe.result ?? []).slice(0, 300)} fee ${JSON.stringify(r.result?.[0]?.fee_estimation ?? {}).slice(0, 300)}`);
    }
  }
}
