import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envFile = '.env.local';
let url = '';
let key = '';
if (fs.existsSync(envFile)) {
  const lines = fs.readFileSync(envFile, 'utf8').split('\n');
  for (const line of lines) {
    if (line.includes('VITE_SUPABASE_URL=')) url = line.split('=')[1].replace(/^"|"$/g, '').trim();
    if (line.includes('VITE_SUPABASE_ANON_KEY=')) key = line.split('=')[1].replace(/^"|"$/g, '').trim();
  }
}

const supabase = createClient(url, key);

async function run() {
  const dummyRow = {
    quinzena: '202611Q1',
    dia_semana: 'Segunda-feira',
    regional: 'Sul',
    supervisor: 'Felipe',
    filial: 'SP01',
    motorista: 'Joao',
    id_rota: 'R01',
    saldo: 10,
    entregues: 8,
    insucessosDetalhados: { "Not Visited": 2 }
  };

  const { data, error } = await supabase.from('bsc').insert([dummyRow]);
  if (error) {
    console.error("Insert Error:", error);
  } else {
    console.log("Insert Success:", data);
  }
}

run();
