import { createClient } from '@supabase/supabase-js';
const s = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function run() {
  const { count } = await s.from('bsc').select('*', { count: 'exact', head: true }).not('filial', 'in', '("SJP","CWB","PGZ","LON","MGF","CAS","JOI","BLU","FLN","SJL","ITA")');
  console.log('Orphans in bsc:', count);
}
run();
