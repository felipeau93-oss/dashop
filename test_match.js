import { createClient } from '@supabase/supabase-js';
const s = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
s.from('bsc').select('id_rota, filial').not('filial', 'in', '("SJP")').limit(5).then(r => {
  console.log('BSC ORPHANS:', r.data);
  if (r.data && r.data.length > 0) {
     const ids = r.data.map(d => d.id_rota);
     s.from('operacional').select('id_rota, filial').in('id_rota', ids).then(o => console.log('OPERACIONAL:', o.data));
  }
});
