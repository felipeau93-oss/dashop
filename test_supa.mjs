import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function run() {
  const { data: d1, error: e1 } = await supabase.from('view_dre_custo_leve').select('*').limit(2);
  console.log('view_dre:', d1, e1);
  const { data: d2, error: e2 } = await supabase.from('view_gaps_operacionais_bsc').select('*').limit(2);
  console.log('view_gaps:', d2, e2);
}
run();
