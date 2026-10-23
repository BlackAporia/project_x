// Small MLP value network V(features) -> expected remaining XP, trained on the GPU by trainer/train.py and exported
// as JSON. Pure TypeScript forward pass (a few hundred multiply-adds), so it also runs in GitHub Actions.
import { existsSync, readFileSync } from 'node:fs';
import { FEATURE_NAMES } from './features.ts';

interface Layer {
  W: number[][]; // [out][in]
  b: number[];
}

export interface ValueNetFile {
  features: string[];
  mean: number[];
  std: number[];
  layers: Layer[];
  outMean: number;
  outStd: number;
  meta?: Record<string, unknown>;
}

export class ValueNet {
  private file: ValueNetFile;
  private buf: Float64Array[];

  constructor(file: ValueNetFile) {
    if (file.features.join(',') !== FEATURE_NAMES.join(',')) throw new Error('value net was trained on a different feature set');
    this.file = file;
    this.buf = [new Float64Array(file.mean.length), ...file.layers.map((l) => new Float64Array(l.b.length))];
  }

  predict(x: number[]): number {
    const f = this.file;
    const inp = this.buf[0];
    for (let i = 0; i < inp.length; i++) inp[i] = (x[i] - f.mean[i]) / f.std[i];
    let cur = inp;
    f.layers.forEach((layer, li) => {
      const out = this.buf[li + 1];
      const last = li === f.layers.length - 1;
      for (let o = 0; o < layer.b.length; o++) {
        const row = layer.W[o];
        let s = layer.b[o];
        for (let i = 0; i < row.length; i++) s += row[i] * cur[i];
        out[o] = last || s > 0 ? s : 0;
      }
      cur = out;
    });
    return Math.max(0, cur[0] * f.outStd + f.outMean);
  }
}

const cache = new Map<string, ValueNet | null>();

export function loadValueNet(path = 'policy/value-net.json'): ValueNet | null {
  if (cache.has(path)) return cache.get(path)!;
  let net: ValueNet | null = null;
  try {
    if (existsSync(path)) net = new ValueNet(JSON.parse(readFileSync(path, 'utf8')) as ValueNetFile);
  } catch (e) {
    console.warn(`[valuenet] ignoring ${path}: ${(e as Error).message}`);
  }
  cache.set(path, net);
  return net;
}
