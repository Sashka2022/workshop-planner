import { GROUP, PEOPLE, ROUNDS, W } from './workshops';
import type { Ranking, Result, Slot } from './types';

const rnd = (k: number) => Math.floor(Math.random() * k);

function shuffle<T>(a: T[]): T[] {
  for (let i = a.length - 1; i > 0; i--) {
    const j = rnd(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const range = (n: number) => Array.from({ length: n }, (_, i) => i);

interface State {
  /** assign[round][person] = group index 0..2 */
  assign: number[][];
  /** wsOf[round][group] = workshop index */
  wsOf: number[][];
}

const clone = (s: State): State => ({
  assign: s.assign.map((a) => a.slice()),
  wsOf: s.wsOf.map((a) => a.slice()),
});

/**
 * Simulated annealing. Constraints are hard-coded by the state shape
 * (every round: 3 distinct workshops, 3 people each) plus penalties for
 * a person repeating a workshop and a workshop running more than `cap` rounds.
 * Cost per placement is rank^2, which favours fairness over raw average.
 */
export function solve(rank: number[][], cap: number, restarts = 30, iters = 30000) {
  const energy = (s: State): number => {
    let e = 0;
    const runs = new Array(W).fill(0);
    const seen: number[][] = Array.from({ length: PEOPLE }, () => []);
    for (let r = 0; r < ROUNDS; r++) {
      for (let g = 0; g < GROUP; g++) runs[s.wsOf[r][g]]++;
      for (let p = 0; p < PEOPLE; p++) {
        const w = s.wsOf[r][s.assign[r][p]];
        e += rank[p][w] * rank[p][w];
        if (seen[p].includes(w)) e += 1000;
        seen[p].push(w);
      }
    }
    for (let w = 0; w < W; w++) if (runs[w] > cap) e += 1000 * (runs[w] - cap);
    return e;
  };

  let best: State | null = null;
  let bestE = Infinity;

  for (let rs = 0; rs < restarts; rs++) {
    const s: State = { assign: [], wsOf: [] };
    for (let r = 0; r < ROUNDS; r++) {
      const a = new Array<number>(PEOPLE);
      shuffle(range(PEOPLE)).forEach((p, i) => (a[p] = Math.floor(i / GROUP)));
      s.assign.push(a);
      s.wsOf.push(shuffle(range(W)).slice(0, GROUP));
    }
    let E = energy(s);
    let runBest = E;
    let runState = clone(s);
    const T0 = 6;
    const T1 = 0.005;
    const cool = Math.pow(T1 / T0, 1 / iters);
    let T = T0;

    for (let it = 0; it < iters; it++) {
      T *= cool;
      const r = rnd(ROUNDS);
      let undo: () => void;
      if (Math.random() < 0.6) {
        const p = rnd(PEOPLE);
        const q = rnd(PEOPLE);
        if (s.assign[r][p] === s.assign[r][q]) continue;
        [s.assign[r][p], s.assign[r][q]] = [s.assign[r][q], s.assign[r][p]];
        undo = () => {
          [s.assign[r][p], s.assign[r][q]] = [s.assign[r][q], s.assign[r][p]];
        };
      } else {
        const g = rnd(GROUP);
        const free = range(W).filter((w) => !s.wsOf[r].includes(w));
        const w = free[rnd(free.length)];
        const old = s.wsOf[r][g];
        s.wsOf[r][g] = w;
        undo = () => {
          s.wsOf[r][g] = old;
        };
      }
      const E2 = energy(s);
      const dE = E2 - E;
      if (dE <= 0 || Math.random() < Math.exp(-dE / T)) {
        E = E2;
        if (E < runBest) {
          runBest = E;
          runState = clone(s);
        }
      } else {
        undo();
      }
    }
    if (runBest < bestE) {
      bestE = runBest;
      best = runState;
    }
  }
  return { state: best as State, energy: bestE };
}

export function buildResult(rankings: Ranking[], cap: number, restarts?: number, iters?: number): Result {
  if (rankings.length !== PEOPLE) throw new Error(`Need exactly ${PEOPLE} rankings`);
  const people = rankings.slice().sort((a, b) => a.name.localeCompare(b.name, 'he'));
  const rank = people.map((p) => {
    const row = new Array<number>(W).fill(W);
    p.order.forEach((w, i) => (row[w] = i + 1));
    return row;
  });
  const { state, energy } = solve(rank, cap, restarts, iters);

  let sum = 0;
  let top3 = 0;
  let cnt = 0;
  let worst = 0;
  const rounds: Slot[][] = [];
  for (let r = 0; r < ROUNDS; r++) {
    const boxes: Slot[] = [];
    for (let g = 0; g < GROUP; g++) {
      const w = state.wsOf[r][g];
      const ppl: Slot['people'] = [];
      people.forEach((p, pi) => {
        if (state.assign[r][pi] === g) {
          const rk = rank[pi][w];
          ppl.push({ name: p.name, rank: rk });
          sum += rk;
          cnt++;
          if (rk <= 3) top3++;
          if (rk > worst) worst = rk;
        }
      });
      boxes.push({ w, people: ppl });
    }
    boxes.sort((a, b) => a.w - b.w);
    rounds.push(boxes);
  }
  return { rounds, avg: +(sum / cnt).toFixed(2), top3, total: cnt, worst, cap, ok: energy < 1000, ts: Date.now() };
}
