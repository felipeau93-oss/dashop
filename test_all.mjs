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

async function checkAll() {
  console.log("Checking DB...");
  const tables = ['importacoes_history', 'rotas_pendentes', 'capcar', 'faturamento', 'operacional'];
  
  for (const t of tables) {
    const { data, error } = await supabase.from(t).select('*').limit(3);
    if (error) {
      console.log(`Table ${t} ERROR:`, error.message);
    } else {
      console.log(`Table ${t}: ${data.length} items. Sample keys:`, data.length > 0 ? Object.keys(data[0]) : 'None');
    }
  }
}

checkAll();
