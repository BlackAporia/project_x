// Runtime ABI discovery: contracts are read from chain so calldata always matches the live deployment.
import type { Abi, RpcProvider } from 'starknet';

export interface AbiFunction {
  name: string;
  inputs: Array<{ name: string; type: string }>;
  outputs: Array<{ type: string }>;
  state_mutability?: string;
}

export interface AbiStructMember {
  name: string;
  type: string;
}

export async function fetchAbi(provider: RpcProvider, address: string): Promise<Abi> {
  const cls = (await provider.getClassAt(address)) as { abi: Abi | string };
  return typeof cls.abi === 'string' ? (JSON.parse(cls.abi) as Abi) : cls.abi;
}

/** All functions in an ABI (top level and inside interfaces). */
export function abiFunctions(abi: Abi): AbiFunction[] {
  const out: AbiFunction[] = [];
  for (const e of abi as Array<Record<string, unknown>>) {
    if (e.type === 'function') out.push(e as unknown as AbiFunction);
    if (e.type === 'interface' && Array.isArray(e.items)) {
      for (const it of e.items as Array<Record<string, unknown>>) if (it.type === 'function') out.push(it as unknown as AbiFunction);
    }
  }
  return out;
}

export function findFunction(abi: Abi, candidates: string[]): AbiFunction | null {
  const fns = abiFunctions(abi);
  for (const c of candidates) {
    const f = fns.find((x) => x.name === c);
    if (f) return f;
  }
  return null;
}

export function structMembers(abi: Abi, type: string): AbiStructMember[] | null {
  for (const e of abi as Array<Record<string, unknown>>) {
    if (e.type === 'struct' && e.name === type) return e.members as AbiStructMember[];
  }
  return null;
}

/** Compact human-readable signature list (written by `discover`). */
export function summarizeAbi(abi: Abi): string[] {
  return abiFunctions(abi).map(
    (f) => `${f.name}(${f.inputs.map((i) => `${i.name}: ${short(i.type)}`).join(', ')})${f.outputs.length ? ' -> ' + f.outputs.map((o) => short(o.type)).join(', ') : ''}${f.state_mutability === 'view' ? ' [view]' : ''}`,
  );
}

const short = (t: string) => t.replace(/core::(integer::|bool::|array::|felt252|starknet::contract_address::)/g, (m) => (m === 'core::felt252' ? 'felt252' : '')).replace(/[a-z_]+::/g, '');
