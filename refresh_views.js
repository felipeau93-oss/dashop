import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing SUPABASE env vars");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  console.log("Running rpc_sincronizar_faturamento_operacional para 202603Q2...");
  const { error: err1 } = await supabase.rpc('rpc_sincronizar_faturamento_operacional', { p_quinzena: '202603Q2' });
  if (err1) console.error("Error 1:", err1);
  else console.log("Sincronização OK");

  console.log("Running rpc_refresh_materialized_views...");
  const { error: err2 } = await supabase.rpc('rpc_refresh_materialized_views');
  if (err2) console.error("Error 2:", err2);
  else console.log("Views refreshed OK");
}

run();
