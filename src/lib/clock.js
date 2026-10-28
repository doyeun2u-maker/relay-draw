import { supabase } from './supabase';

let offset = 0; // 서버시간 - 클라이언트시간 (ms)

export async function syncClock() {
  try {
    const t0 = Date.now();
    const { data, error } = await supabase.rpc('server_now');
    const t1 = Date.now();
    if (error || !data) return;
    const server = new Date(data).getTime();
    offset = server - (t0 + (t1 - t0) / 2);
  } catch (e) {
    console.warn('clock sync failed', e);
  }
}

export function serverNow() {
  return Date.now() + offset;
}
