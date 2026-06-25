import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const envFile = fs.readFileSync('.env.local', 'utf-8');
let supabaseUrl = '';
let supabaseKey = '';

envFile.split('\n').forEach(line => {
  if (line.startsWith('VITE_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim();
  if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) supabaseKey = line.split('=')[1].trim();
});

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log("Calling rpc...");
  const { data, error } = await supabase.rpc('rpc_refresh_materialized_views');
  console.log("RPC Error:", error);
  console.log("RPC Data:", data);
  
  const { data: viewData } = await supabase.from('view_dre_custo_leve').select('custo_capcar_pago').eq('quinzena', '202603Q1').eq('filial', 'ESC5').limit(1);
  console.log("Refreshed Custo:", viewData);
}
check();
