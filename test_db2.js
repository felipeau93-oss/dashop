import { createClient } from '@supabase/supabase-js';
const s = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function run() {
  const { data } = await s.from('penalidades').select('id_rota, filial').not('filial', 'in', '("SJP","CWB","PGZ","LON","MGF","CAS","JOI","BLU","FLN","SJL","ITA")').limit(5);
  console.log('Penalidades órfãs:', data);
  if (data && data.length > 0) {
     const ids = data.map(d => d.id_rota);
     const op = await s.from('operacional').select('id_rota, filial, regional, supervisor').in('id_rota', ids);
     console.log('Operacional correspondente:', op.data);
  }
}
run();
