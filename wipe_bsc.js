import { createClient } from '@supabase/supabase-js';
const s = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  let hasMore = true;
  while(hasMore) {
     const { data, error } = await s.from('bsc').select('id').limit(500);
     if (error || !data || data.length === 0) {
        hasMore = false; break;
     }
     const ids = data.map(d => d.id);
     await s.from('bsc').delete().in('id', ids);
     console.log(`Apagados ${ids.length} itens do BSC...`);
  }
  await s.rpc('rpc_refresh_materialized_views');
  console.log('Tabela BSC limpa!');
}
run();
