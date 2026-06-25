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
  // Let's try to get all tables via RPC if it exists
  const { data, error } = await supabase.rpc('get_tables');
  if (error) {
     console.log("RPC get_tables error:", error.message);
  } else {
     console.log("All tables:", data);
  }
  
  // Also check simulacoes and treinamentos
  const extra = ['treinamentos', 'simulacoes'];
  for (const t of extra) {
     const prod = await supabase.from(t).select('id').limit(1);
     const test = await supabase.from(t + '_testes').select('id').limit(1);
     const prodExists = !prod.error || prod.error.code !== '42P01';
     const testExists = !test.error || test.error.code !== '42P01';
     console.log(`${t} -> PROD EXISTS: ${prodExists}, TEST EXISTS: ${testExists}`);
  }
}
run();
