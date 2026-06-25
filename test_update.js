import { createClient } from '@supabase/supabase-js';
const s = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function run() {
  const item = { _tabela: 'bsc', id: 'e25c90cd-0623-4c19-8259-f10b42ac535b' };
  const { data, error } = await s.from(item._tabela).update({ filial: 'SPR8', regional: '4', supervisor: 'Johnatan' }).eq('id', item.id);
  console.log('Update result:', data, error);
  const check = await s.from('bsc').select('id_rota, filial, regional, supervisor').eq('id', item.id);
  console.log('Check:', check.data);
}
run();
