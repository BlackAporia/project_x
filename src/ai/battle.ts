// Exact battle solver.
//
// State: (hero health h, beast health b). Each round the hero either attacks (normal/critical hit; if the beast
// survives it counterattacks a random armor slot, possibly critically) or tries to flee (success with
// probability pFlee, otherwise the beast attacks). The solver maximizes expected value where
//   win(h)    -> W[h]   (xp/gold reward + continuation value at health h)
//   escape(h) -> E[h]   (1 xp + continuation value)
//   death     -> 0
// Beast health only changes through the hero's hits, so states are indexed by how many normal (i) and critical
// (j) hits the beast took: b(i, j) = b0 - i*dN - j*dC. Diagonals s = i+j are swept from deep to shallow keeping
// two diagonals in reusable flat buffers. At depth s the hero took at least s-1 counterattacks, so health above
// H - (s-1)*minBeastHit is unreachable and skipped.
import type { Outcome } from './model.ts';

export interface BattleInput {
  heroHp: number;
  beastHp: number;
  hero: Outcome[]; // 1 or 2 outcomes (normal, critical)
  beast: Outcome[]; // counterattack damage distribution
  pFlee: number; // 0 when fleeing is impossible
  win: Float64Array; // W[h] for h = 0..heroHp
  escape: Float64Array; // E[h] for h = 0..heroHp
  maxDepth?: number; // cap on hero hits considered (default 60)
  /** keep the action table of every state so later rounds of the same battle need no new solve */
  keepPlan?: boolean;
}

/** Optimal action for every reachable (hero health, beast health) state of one battle. */
export class BattlePlan {
  readonly b0: number;
  readonly dN: number;
  readonly dC: number;
  readonly H: number;
  private readonly diagonals: Uint8Array[];

  constructor(b0: number, dN: number, dC: number, H: number, diagonals: Uint8Array[]) {
    this.b0 = b0;
    this.dN = dN;
    this.dC = dC;
    this.H = H;
    this.diagonals = diagonals;
  }

  /** Action for the state (h, beastHp), or null when the state is outside the solved table. */
  lookup(h: number, beastHp: number): 'attack' | 'flee' | null {
    if (h < 1 || h > this.H) return null;
    const dealt = this.b0 - beastHp;
    if (dealt < 0) return null;
    const S = this.diagonals.length - 1;
    const stride = this.H + 1;
    for (let j = 0; j <= S; j++) {
      const rest = dealt - j * this.dC;
      if (rest < 0) break;
      if (this.dN === 0 ? rest !== 0 : rest % this.dN !== 0) continue;
      const i = this.dN === 0 ? 0 : rest / this.dN;
      const s = i + j;
      if (s > S) continue;
      const act = this.diagonals[s][i * stride + h];
      return act === 1 ? 'attack' : 'flee';
    }
    return null;
  }
}

export interface BattleSolution {
  action: 'attack' | 'flee';
  valueAttack: number;
  valueFlee: number;
  value: number;
  pWin: number;
  pDeath: number;
  pEscape: number;
  /** probability the beast dies on this very attack */
  pKillNow: number;
  /** probability the counterattack after this attack kills the hero */
  pDieNextHit: number;
  depthCapped: boolean;
  plan?: BattlePlan;
}

// reusable buffers
let cap = 0;
let vA = new Float64Array(0);
let dA = new Float64Array(0);
let eA = new Float64Array(0);
let vB = new Float64Array(0);
let dB = new Float64Array(0);
let eB = new Float64Array(0);
let aA = new Uint8Array(0);
let aB = new Uint8Array(0);

function ensure(size: number): void {
  if (size <= cap) return;
  cap = Math.max(size, cap * 2);
  vA = new Float64Array(cap);
  dA = new Float64Array(cap);
  eA = new Float64Array(cap);
  vB = new Float64Array(cap);
  dB = new Float64Array(cap);
  eB = new Float64Array(cap);
  aA = new Uint8Array(cap);
  aB = new Uint8Array(cap);
}

export function solveBattle(input: BattleInput): BattleSolution {
  const H = Math.max(0, Math.floor(input.heroHp));
  const b0 = input.beastHp;
  const hero = input.hero.length > 0 ? input.hero : [{ dmg: 4, p: 1 }];
  const dN = hero[0].dmg;
  const pN = hero[0].p;
  const dC = hero.length > 1 ? hero[1].dmg : dN;
  const pC = hero.length > 1 ? hero[1].p : 0;
  const pFlee = input.pFlee;
  const q = 1 - pFlee;
  const W = input.win;
  const E = input.escape;
  const maxDepth = input.maxDepth ?? 60;
  const nb = input.beast.length;
  const bd = new Int32Array(nb);
  const bp = new Float64Array(nb);
  let minBeast = Infinity;
  for (let k = 0; k < nb; k++) {
    bd[k] = input.beast[k].dmg;
    bp[k] = input.beast[k].p;
    if (bd[k] < minBeast) minBeast = bd[k];
  }
  if (!Number.isFinite(minBeast) || minBeast < 1) minBeast = 1;

  if (H === 0) {
    return { action: 'attack', valueAttack: 0, valueFlee: 0, value: 0, pWin: 0, pDeath: 1, pEscape: 0, pKillNow: 0, pDieNextHit: 1, depthCapped: false };
  }

  const minHit = Math.max(1, Math.min(dN, dC));
  const needed = Math.ceil(b0 / minHit);
  const S = Math.min(needed, maxDepth);
  const depthCapped = needed > maxDepth;
  const stride = H + 1;
  ensure((S + 2) * stride);

  // "next" = diagonal s+1, "cur" = diagonal s; buffers swap each iteration
  let nV = vA, nD = dA, nE = eA, nAct = aA;
  let cV = vB, cD = dB, cE = eB, cAct = aB;
  const keep = input.keepPlan === true;
  const diagonals: Uint8Array[] = keep ? new Array(S + 1) : [];

  for (let s = S; s >= 0; s--) {
    const hMax = s === 0 ? H : Math.max(0, H - (s - 1) * minBeast);
    const atCap = depthCapped && s === S;
    for (let i = 0; i <= s; i++) {
      const j = s - i;
      const b = b0 - i * dN - j * dC;
      const base = i * stride;
      cV[base] = 0;
      cD[base] = 1;
      cE[base] = 0;
      if (b <= 0) {
        for (let h = 1; h <= hMax; h++) {
          cV[base + h] = 0;
          cD[base + h] = 0;
          cE[base + h] = 0;
        }
        continue;
      }
      const nBaseN = (i + 1) * stride; // normal hit -> (i+1, j)
      const nBaseC = i * stride; // critical hit -> (i, j+1)
      for (let h = 1; h <= hMax; h++) {
        // ---- attack ----
        let va = 0;
        let pad = 0;
        let pae = 0;
        if (!atCap) {
          if (pN > 0) {
            if (dN >= b) {
              va += pN * W[h];
            } else {
              for (let k = 0; k < nb; k++) {
                const p = pN * bp[k];
                const nh = h - bd[k];
                if (nh <= 0) pad += p;
                else {
                  va += p * nV[nBaseN + nh];
                  pad += p * nD[nBaseN + nh];
                  pae += p * nE[nBaseN + nh];
                }
              }
            }
          }
          if (pC > 0) {
            if (dC >= b) {
              va += pC * W[h];
            } else {
              for (let k = 0; k < nb; k++) {
                const p = pC * bp[k];
                const nh = h - bd[k];
                if (nh <= 0) pad += p;
                else {
                  va += p * nV[nBaseC + nh];
                  pad += p * nD[nBaseC + nh];
                  pae += p * nE[nBaseC + nh];
                }
              }
            }
          }
        }
        // ---- flee (self loop on the same (i, j); smaller h already computed) ----
        let vf = -1;
        let pfd = 0;
        let pfe = 0;
        if (pFlee > 0) {
          vf = pFlee * E[h];
          pfe = pFlee;
          if (q > 0) {
            for (let k = 0; k < nb; k++) {
              const p = q * bp[k];
              const nh = h - bd[k];
              if (nh <= 0) pfd += p;
              else {
                vf += p * cV[base + nh];
                pfd += p * cD[base + nh];
                pfe += p * cE[base + nh];
              }
            }
          }
        }
        const idx = base + h;
        if (atCap && pFlee <= 0) {
          // the fight cannot be resolved within the depth cap and fleeing is impossible: pessimistic
          cV[idx] = 0;
          cD[idx] = 1;
          cE[idx] = 0;
          cAct[idx] = 1;
        } else if (atCap || vf > va) {
          cV[idx] = vf;
          cD[idx] = pfd;
          cE[idx] = pfe;
          cAct[idx] = 0;
        } else {
          cV[idx] = va;
          cD[idx] = pad;
          cE[idx] = pae;
          cAct[idx] = 1;
        }
      }
    }
    if (keep) diagonals[s] = cAct.slice(0, (s + 1) * stride);
    if (s > 0) {
      // swap: current diagonal becomes "next" for s-1
      const tV = nV; nV = cV; cV = tV;
      const tD = nD; nD = cD; cD = tD;
      const tE = nE; nE = cE; cE = tE;
      const tA = nAct; nAct = cAct; cAct = tA;
    }
  }

  // root (i=0,j=0) lives in "cur" at offset 0; diagonal 1 lives in "next"
  const h = H;
  let valueAttack = 0;
  let pKillNow = 0;
  let pDieNextHit = 0;
  if (pN > 0) {
    if (dN >= b0) {
      valueAttack += pN * W[h];
      pKillNow += pN;
    } else {
      for (let k = 0; k < nb; k++) {
        const nh = h - bd[k];
        if (nh > 0) valueAttack += pN * bp[k] * nV[1 * stride + nh];
        else pDieNextHit += pN * bp[k];
      }
    }
  }
  if (pC > 0) {
    if (dC >= b0) {
      valueAttack += pC * W[h];
      pKillNow += pC;
    } else {
      for (let k = 0; k < nb; k++) {
        const nh = h - bd[k];
        if (nh > 0) valueAttack += pC * bp[k] * nV[0 * stride + nh];
        else pDieNextHit += pC * bp[k];
      }
    }
  }
  let valueFlee = -1;
  if (pFlee > 0) {
    valueFlee = pFlee * E[h];
    for (let k = 0; k < nb; k++) {
      const nh = h - bd[k];
      if (nh > 0) valueFlee += q * bp[k] * cV[nh];
    }
  }
  const action: 'attack' | 'flee' = cAct[h] === 1 ? 'attack' : 'flee';
  const pDeath = cD[h];
  const pEscape = cE[h];
  return {
    action,
    valueAttack,
    valueFlee,
    value: cV[h],
    pWin: Math.max(0, 1 - pDeath - pEscape),
    pDeath,
    pEscape,
    pKillNow,
    pDieNextHit,
    depthCapped,
    plan: keep ? new BattlePlan(b0, dN, dC, H, diagonals) : undefined,
  };
}
