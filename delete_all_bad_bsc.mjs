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

async function fetchAllBadQuinzenas() {
  const badQs = new Set();
  const limit = 1000;
  let offset = 0;
  
  while (true) {
    const res = await fetch(`${supabaseUrl}/rest/v1/bsc?select=quinzena`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Range': `${offset}-${offset + limit - 1}`
      }
    });
    
    if (!res.ok) {
       console.log("Error fetching:", res.status, await res.text());
       break;
    }
    
    const data = await res.json();
    if (data.length === 0) break;
    
    data.forEach(d => {
       if (d.quinzena && !/^\d{6}Q[12]$/.test(d.quinzena) && d.quinzena !== 'GERAL') {
          badQs.add(d.quinzena);
       }
    });
    
    if (data.length < limit) break;
    offset += limit;
  }
  
  return Array.from(badQs);
}

async function run() {
  console.log("Fetching bad quinzenas...");
  const badQs = await fetchAllBadQuinzenas();
  console.log("Found bad quinzenas:", badQs);
  
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
  console.log("Cleanup complete!");
}

run();
