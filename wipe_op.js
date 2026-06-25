import { createClient } from '@supabase/supabase-js';
const s = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  let hasMore = true;
  while(hasMore) {
     const { data, error } = await s.from('operacional').select('id').limit(500);
     if (error || !data || data.length === 0) {
        hasMore = false; break;
     }
     const ids = data.map(d => d.id);
     await s.from('operacional').delete().in('id', ids);
     console.log(`Apagados ${ids.length}...`);
  }
  await s.rpc('rpc_refresh_materialized_views');
  console.log('Tudo limpo!');
}
run();
