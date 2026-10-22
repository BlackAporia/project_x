// Compact CMA-ES (Hansen) for continuous black-box optimization in a normalized [0,1]^n box.
// Minimizes `f`; the tuner passes negative fitness.

export interface CmaState {
  n: number;
  mean: number[];
  sigma: number;
  C: number[][];
  pc: number[];
  ps: number[];
  B: number[][];
  D: number[];
  generation: number;
  eigenGeneration: number;
}

export interface CmaOptions {
  sigma?: number;
  lambda?: number;
  seed?: number;
}

export class CMAES {
  readonly n: number;
  readonly lambda: number;
  readonly mu: number;
  readonly weights: number[];
  readonly mueff: number;
  readonly cc: number;
  readonly cs: number;
  readonly c1: number;
  readonly cmu: number;
  readonly damps: number;
  readonly chiN: number;
  state: CmaState;
  private rngState: number;

  constructor(x0: number[], options: CmaOptions = {}) {
    const n = x0.length;
    this.n = n;
    this.lambda = options.lambda ?? 4 + Math.floor(3 * Math.log(n));
    this.mu = Math.floor(this.lambda / 2);
    const w = Array.from({ length: this.mu }, (_, i) => Math.log(this.mu + 0.5) - Math.log(i + 1));
    const sw = w.reduce((a, b) => a + b, 0);
    this.weights = w.map((x) => x / sw);
    this.mueff = 1 / this.weights.reduce((a, b) => a + b * b, 0);
    this.cc = (4 + this.mueff / n) / (n + 4 + (2 * this.mueff) / n);
    this.cs = (this.mueff + 2) / (n + this.mueff + 5);
    this.c1 = 2 / ((n + 1.3) ** 2 + this.mueff);
    this.cmu = Math.min(1 - this.c1, (2 * (this.mueff - 2 + 1 / this.mueff)) / ((n + 2) ** 2 + this.mueff));
    this.damps = 1 + 2 * Math.max(0, Math.sqrt((this.mueff - 1) / (n + 1)) - 1) + this.cs;
    this.chiN = Math.sqrt(n) * (1 - 1 / (4 * n) + 1 / (21 * n * n));
    const I = identity(n);
    this.state = {
      n,
      mean: x0.slice(),
      sigma: options.sigma ?? 0.15,
      C: I.map((r) => r.slice()),
      pc: new Array(n).fill(0),
      ps: new Array(n).fill(0),
      B: I.map((r) => r.slice()),
      D: new Array(n).fill(1),
      generation: 0,
      eigenGeneration: 0,
    };
    this.rngState = (options.seed ?? 12345) >>> 0;
  }

  /** Sample lambda candidates (clipped to [0,1]). Returns raw z/y vectors for the update. */
  ask(): { x: number[]; y: number[] }[] {
    const { n, mean, sigma, B, D } = this.state;
    const out: { x: number[]; y: number[] }[] = [];
    for (let k = 0; k < this.lambda; k++) {
      const z = Array.from({ length: n }, () => this.gauss());
      const y = new Array(n).fill(0);
      for (let i = 0; i < n; i++) {
        let s = 0;
        for (let j = 0; j < n; j++) s += B[i][j] * D[j] * z[j];
        y[i] = s;
      }
      const x = mean.map((m, i) => clamp01(m + sigma * y[i]));
      // use the clipped step for the update so the mean stays inside the box
      const yc = x.map((xi, i) => (xi - mean[i]) / sigma);
      out.push({ x, y: yc });
    }
    return out;
  }

  /** Update with candidates and their (to-be-minimized) losses. */
  tell(cands: { x: number[]; y: number[] }[], losses: number[]): void {
    const st = this.state;
    const n = this.n;
    const order = losses.map((l, i) => [l, i] as const).sort((a, b) => a[0] - b[0]).map((p) => p[1]);
    const oldMean = st.mean.slice();
    const yw = new Array(n).fill(0);
    for (let k = 0; k < this.mu; k++) {
      const c = cands[order[k]];
      for (let i = 0; i < n; i++) yw[i] += this.weights[k] * c.y[i];
    }
    st.mean = oldMean.map((m, i) => clamp01(m + st.sigma * yw[i]));
    // C^{-1/2} * yw = B * D^-1 * B^T * yw
    const bty = new Array(n).fill(0);
    for (let j = 0; j < n; j++) {
      let s = 0;
      for (let i = 0; i < n; i++) s += st.B[i][j] * yw[i];
      bty[j] = s / st.D[j];
    }
    const invSqrtCy = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      let s = 0;
      for (let j = 0; j < n; j++) s += st.B[i][j] * bty[j];
      invSqrtCy[i] = s;
    }
    const csn = Math.sqrt(this.cs * (2 - this.cs) * this.mueff);
    for (let i = 0; i < n; i++) st.ps[i] = (1 - this.cs) * st.ps[i] + csn * invSqrtCy[i];
    const psNorm = Math.sqrt(st.ps.reduce((a, b) => a + b * b, 0));
    const hsig = psNorm / Math.sqrt(1 - (1 - this.cs) ** (2 * (st.generation + 1))) / this.chiN < 1.4 + 2 / (n + 1) ? 1 : 0;
    const ccn = Math.sqrt(this.cc * (2 - this.cc) * this.mueff);
    for (let i = 0; i < n; i++) st.pc[i] = (1 - this.cc) * st.pc[i] + hsig * ccn * yw[i];
    for (let i = 0; i < n; i++) {
      for (let j = 0; j <= i; j++) {
        let rankMu = 0;
        for (let k = 0; k < this.mu; k++) {
          const y = cands[order[k]].y;
          rankMu += this.weights[k] * y[i] * y[j];
        }
        const v =
          (1 - this.c1 - this.cmu) * st.C[i][j] +
          this.c1 * (st.pc[i] * st.pc[j] + (1 - hsig) * this.cc * (2 - this.cc) * st.C[i][j]) +
          this.cmu * rankMu;
        st.C[i][j] = v;
        st.C[j][i] = v;
      }
    }
    st.sigma *= Math.exp((this.cs / this.damps) * (psNorm / this.chiN - 1));
    st.sigma = Math.min(0.5, Math.max(1e-4, st.sigma));
    st.generation++;
    if (st.generation - st.eigenGeneration > 1 / (this.c1 + this.cmu) / n / 10) {
      st.eigenGeneration = st.generation;
      const { values, vectors } = jacobiEigen(st.C);
      st.D = values.map((v) => Math.sqrt(Math.max(1e-20, v)));
      st.B = vectors;
    }
  }

  private gauss(): number {
    // Box-Muller with an xorshift PRNG
    const u = Math.max(1e-12, this.rand());
    const v = this.rand();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  private rand(): number {
    let x = this.rngState;
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    this.rngState = x >>> 0;
    return this.rngState / 4294967296;
  }
}

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

function identity(n: number): number[][] {
  return Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)));
}

/** Symmetric eigen-decomposition (cyclic Jacobi). Returns eigenvalues and column eigenvectors. */
export function jacobiEigen(A: number[][]): { values: number[]; vectors: number[][] } {
  const n = A.length;
  const a = A.map((r) => r.slice());
  const v = identity(n);
  for (let sweep = 0; sweep < 60; sweep++) {
    let off = 0;
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) off += a[i][j] * a[i][j];
    if (off < 1e-18) break;
    for (let p = 0; p < n; p++) {
      for (let q = p + 1; q < n; q++) {
        if (Math.abs(a[p][q]) < 1e-15) continue;
        const theta = (a[q][q] - a[p][p]) / (2 * a[p][q]);
        const t = Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
        const c = 1 / Math.sqrt(t * t + 1);
        const s = t * c;
        for (let k = 0; k < n; k++) {
          const akp = a[k][p];
          const akq = a[k][q];
          a[k][p] = c * akp - s * akq;
          a[k][q] = s * akp + c * akq;
        }
        for (let k = 0; k < n; k++) {
          const apk = a[p][k];
          const aqk = a[q][k];
          a[p][k] = c * apk - s * aqk;
          a[q][k] = s * apk + c * aqk;
        }
        for (let k = 0; k < n; k++) {
          const vkp = v[k][p];
          const vkq = v[k][q];
          v[k][p] = c * vkp - s * vkq;
          v[k][q] = s * vkp + c * vkq;
        }
      }
    }
  }
  return { values: a.map((r, i) => r[i]), vectors: v };
}
