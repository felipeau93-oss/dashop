import fs from 'fs';
import path from 'path';

// Load env
const envLocal = fs.readFileSync(path.resolve('.env.local'), 'utf-8');
const vars = {};
envLocal.split('\n').forEach(l => {
  const [k, ...v] = l.split('=');
  if (k && v) vars[k.trim()] = v.join('=').replace(/"/g, '').trim();
});

const url = `${vars.VITE_SUPABASE_URL}/rest/v1/view_gaps_operacionais?select=*&limit=10`;

async function run() {
  console.log('Fetching:', url);
  const res = await fetch(url, {
    headers: {
      'apikey': vars.VITE_SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${vars.VITE_SUPABASE_ANON_KEY}`,
      'Accept': 'application/json'
    }
  });
  
  console.log('Status:', res.status, res.statusText);
  const data = await res.json();
  console.log('Data length:', data.length);
  if (data.length > 0) {
    console.log('First item:', data[0]);
  } else {
    console.log('Error/Body:', data);
  }
}

run().catch(console.error);
