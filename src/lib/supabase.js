import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
	console.error('VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY 환경변수가 없습니다.');
}

export const supabase = createClient(url, key, {
	realtime: { params: { eventsPerSecond: 20 } },
});
