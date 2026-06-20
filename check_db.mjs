import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: hist, error: err1 } = await supabase.from('importacoes_history').select('*');
  console.log("Historico:", err1 ? err1 : hist.length + " items");

  const { data: pend, error: err2 } = await supabase.from('rotas_pendentes').select('*');
  console.log("Pendentes:", err2 ? err2 : pend.length + " items");

  const { data: op, error: err3 } = await supabase.from('operacional').select('id_rota').limit(10);
  console.log("Operacional (sample):", err3 ? err3 : op.length + " items");
}

check();
