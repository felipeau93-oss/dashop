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

async function run() {
  const res = await fetch(`${supabaseUrl}/rest/v1/bsc?select=quinzena`, {
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Range': '0-1000'
    }
  });
  const data = await res.json();
  const uniqueQs = [...new Set(data.map(d => d.quinzena))];
  console.log("Distinct quinzenas in bsc:");
  console.log(uniqueQs);
}

run();
