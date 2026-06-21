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

async function testInsert() {
  console.log("Testing insert...");
  const { error } = await supabase.from('importacoes_history').insert([{
    tipo: 'Teste', quinzena: 'GERAL', qtd_registros: 1, data_importacao: new Date().toISOString()
  }]);
  console.log("Insert Historico error:", error);

  const { error: err2 } = await supabase.from('rotas_pendentes').upsert([{
    id_rota: 'ROTA_TESTE', quinzena_origem: 'GERAL', data_identificacao: new Date().toISOString()
  }], { onConflict: 'id_rota' });
  console.log("Insert Pendentes error:", err2);
}

testInsert();
