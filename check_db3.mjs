import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.join(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');

let supabaseUrl = '';
let supabaseKey = '';

envContent.split(/\r?\n/).forEach(line => {
  if (line.startsWith('VITE_SUPABASE_URL=')) {
    supabaseUrl = line.substring('VITE_SUPABASE_URL='.length).trim().replace(/['"]/g, '');
  }
  if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) {
    supabaseKey = line.substring('VITE_SUPABASE_ANON_KEY='.length).trim().replace(/['"]/g, '');
  }
});

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log("Checking DB...");
  const { data: hist, error: err1 } = await supabase.from('importacoes_history').select('*');
  console.log("Historico:", err1 ? err1 : hist?.length + " items");

  const { data: pend, error: err2 } = await supabase.from('rotas_pendentes').select('*');
  console.log("Pendentes:", err2 ? err2 : pend?.length + " items");

  const { data: op, error: err3 } = await supabase.from('operacional').select('id_rota').limit(5);
  console.log("Operacional (sample):", err3 ? err3 : op?.length + " items");
}

check();
