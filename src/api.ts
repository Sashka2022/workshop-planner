import { createClient } from '@supabase/supabase-js';
import type { Ranking, Result } from './types';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

const sb = url && key ? createClient(url, key) : null;

/** True when a shared backend is configured. Otherwise data stays in this browser only. */
export const isShared = sb !== null;

const LS_RANK = 'ws_rankings';
const LS_RESULT = 'ws_result';

function lsGet<T>(k: string, fallback: T): T {
  try {
    const v = localStorage.getItem(k);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}
function lsSet(k: string, v: unknown) {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {
    /* storage unavailable */
  }
}

export function idFor(name: string): string {
  const s = name.trim().replace(/\s+/g, ' ').toLowerCase();
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
  return 'p' + h.toString(36);
}

export async function listRankings(): Promise<Ranking[]> {
  if (!sb) return lsGet<Ranking[]>(LS_RANK, []);
  const { data, error } = await sb.from('rankings').select('id,name,workshop_order');
  if (error) throw error;
  return (data ?? []).map((d) => ({ id: d.id as string, name: d.name as string, order: d.workshop_order as number[] }));
}

export async function saveRanking(name: string, order: number[]): Promise<void> {
  const id = idFor(name);
  if (!sb) {
    const all = lsGet<Ranking[]>(LS_RANK, []).filter((r) => r.id !== id);
    all.push({ id, name, order });
    lsSet(LS_RANK, all);
    return;
  }
  const { error } = await sb
    .from('rankings')
    .upsert({ id, name, workshop_order: order, updated_at: new Date().toISOString() });
  if (error) throw error;
}

export async function deleteRanking(id: string): Promise<void> {
  if (!sb) {
    lsSet(LS_RANK, lsGet<Ranking[]>(LS_RANK, []).filter((r) => r.id !== id));
    return;
  }
  const { error } = await sb.from('rankings').delete().eq('id', id);
  if (error) throw error;
}

export async function getResult(): Promise<Result | null> {
  if (!sb) return lsGet<Result | null>(LS_RESULT, null);
  const { data, error } = await sb.from('result').select('data').eq('id', 'latest').maybeSingle();
  if (error) throw error;
  return (data?.data as Result | undefined) ?? null;
}

export async function saveResult(res: Result): Promise<void> {
  if (!sb) {
    lsSet(LS_RESULT, res);
    return;
  }
  const { error } = await sb.from('result').upsert({ id: 'latest', data: res, updated_at: new Date().toISOString() });
  if (error) throw error;
}
