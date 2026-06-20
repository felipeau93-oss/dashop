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
  const badQs = ['1 de mar. de 2026', '10 de mar. de 2026', '11 de mar. de 2026'];
  for (const q of badQs) {
    const res = await fetch(`${supabaseUrl}/rest/v1/bsc?quinzena=eq.${encodeURIComponent(q)}`, {
      method: 'DELETE',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    });
    console.log(`Deleted ${q}:`, res.status);
  }
  
  // Clean up importacoes_history as well to keep UI clean
  const res2 = await fetch(`${supabaseUrl}/rest/v1/importacoes_history?tipo=eq.BSC&status=eq.Sucesso`, {
     method: 'DELETE',
     headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
  });
  console.log(`Cleared BSC history:`, res2.status);
}

run();
