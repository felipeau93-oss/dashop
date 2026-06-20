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
  console.log("Checking DB Quinzenas...");
  const tables = ['operacional', 'penalidades', 'faturamento', 'capcar'];
  
  for (const t of tables) {
    const { data, error } = await supabase.from(t).select('quinzena');
    if (error) {
      console.log(`Table ${t} ERROR:`, error.message);
    } else {
      const distinct = [...new Set(data.map(d => d.quinzena))];
      console.log(`Table ${t} distinct quinzenas:`, distinct);
    }
  }
}

checkAll();
