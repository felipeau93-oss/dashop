import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.join(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');

let supabaseUrl = '';
let supabaseKey = '';

envContent.split(/\r?\n/).forEach(line => {
  if (line.startsWith('VITE_SUPABASE_URL=')) {
    supabaseUrl = line.split('=')[1].trim().replace(/['"]/g, '');
  }
  if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) {
    supabaseKey = line.split('=')[1].trim().replace(/['"]/g, '');
  }
});

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const tablesToCheck = [
    'operacional', 'faturamento', 'penalidades', 'rotas_pendentes', 'rotas_ignoradas',
    'importacoes_history', 'cap_car', 'operacional_bsc', 'disp_frota',
    'user_roles', 'user_requests', 'mapeamento_filiais'
  ];

  console.log("Checking tables...");
  for (const t of tablesToCheck) {
     const prod = await supabase.from(t).select('id').limit(1);
     const test = await supabase.from(t + '_testes').select('id').limit(1);
     
     const prodExists = !prod.error || prod.error.code !== '42P01';
     const testExists = !test.error || test.error.code !== '42P01';
     
     if (testExists && !prodExists) {
        console.log(`MISSING IN PROD: ${t} (Exists in test: ${t + '_testes'})`);
     } else if (!prodExists && !testExists) {
        console.log(`MISSING IN BOTH: ${t}`);
     } else if (prodExists && !testExists) {
        console.log(`EXISTS IN PROD, BUT NOT TEST: ${t}`);
     } else {
        console.log(`EXISTS IN BOTH: ${t}`);
     }
  }
}
run();
