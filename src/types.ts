export interface Ranking {
  id: string;
  name: string;
  /** Workshop indices, most wanted first. */
  order: number[];
}

export interface PersonInSlot {
  name: string;
  /** 1 = most wanted, 6 = least wanted */
  rank: number;
}

export interface Slot {
  w: number;
  people: PersonInSlot[];
}

export interface Result {
  rounds: Slot[][];
  avg: number;
  top3: number;
  total: number;
  worst: number;
  cap: number;
  ok: boolean;
  ts: number;
}
