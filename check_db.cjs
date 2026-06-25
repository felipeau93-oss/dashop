const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const supabaseUrl = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const supabaseKey = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();

async function check() {
  const url = `${supabaseUrl}/rest/v1/importacoes_history?select=*&tipo=eq.Disponibilidade%20de%20Frota&limit=5&order=data_importacao.desc`;
  const res = await fetch(url, {
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`
    }
  });
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
}

check();
