import assert from 'node:assert/strict';
import { buildResult } from './solver';
import { GROUP, PEOPLE, ROUNDS, W } from './workshops';
import type { Ranking } from './types';

function randomRankings(): Ranking[] {
  return Array.from({ length: PEOPLE }, (_, i) => ({
    id: 'p' + i,
    name: 'מנחה ' + (i + 1),
    order: Array.from({ length: W }, (_, k) => k).sort(() => Math.random() - 0.5),
  }));
}

function check(rankings: Ranking[], cap: number) {
  const res = buildResult(rankings, cap, 10, 20000);
  assert.equal(res.ok, true, 'solution should satisfy all hard constraints');
  assert.equal(res.rounds.length, ROUNDS);
  const attended = new Map<string, number[]>();
  const runs = new Array(W).fill(0);
  for (const round of res.rounds) {
    assert.equal(round.length, GROUP, 'workshops per round');
    assert.equal(new Set(round.map((b) => b.w)).size, GROUP, 'distinct workshops per round');
    const inRound = new Set<string>();
    for (const b of round) {
      assert.equal(b.people.length, GROUP, 'people per workshop');
      runs[b.w]++;
      for (const p of b.people) {
        assert.ok(!inRound.has(p.name), 'person once per round');
        inRound.add(p.name);
        attended.set(p.name, [...(attended.get(p.name) ?? []), b.w]);
      }
    }
    assert.equal(inRound.size, PEOPLE);
  }
  for (const [, ws] of attended) assert.equal(new Set(ws).size, ROUNDS, 'three different workshops per person');
  for (const r of runs) assert.ok(r <= cap, 'cap respected');
  return res;
}

for (let i = 0; i < 5; i++) check(randomRankings(), 2);
check(randomRankings(), 3);

// Everyone has the same taste: should still be feasible and fair
const same: Ranking[] = Array.from({ length: PEOPLE }, (_, i) => ({
  id: 'p' + i, name: 'מנחה ' + (i + 1), order: [0, 1, 2, 3, 4, 5],
}));
const r = check(same, 2);
console.log('same-taste avg rank:', r.avg, 'top3:', r.top3, '/', r.total);
console.log('solver tests passed');
