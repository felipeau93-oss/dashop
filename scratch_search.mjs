import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Read .env.local to get Supabase keys
const envPath = path.resolve('.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const [key, ...val] = line.split('=');
  if (key && val) {
    envVars[key.trim()] = val.join('=').trim();
  }
});

const SUPABASE_URL = envVars.VITE_SUPABASE_URL;
const SUPABASE_KEY = envVars.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const TABLES = [
  'operacional',
  'faturamento',
  'penalidades',
  'custos',
  'disponibilidade_frota',
  'bsc',
  'motoristas',
  'treinamentos',
  'importacoes_history'
];

async function searchQuinzena(q) {
  console.log(`Searching for quinzena '${q}' in all tables...`);
  
  for (const table of TABLES) {
    try {
      const { data, count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact' })
        .eq('quinzena', q)
        .limit(5);
        
      if (error) {
        // Some tables might not have 'quinzena' column
        if (error.message.includes('column') && error.message.includes('does not exist')) {
            // ignore
        } else {
            console.error(`Error querying ${table}:`, error.message);
        }
        continue;
      }
      
      if (count > 0) {
        console.log(`\n✅ Found ${count} records in table '${table}'!`);
        console.log(`First few records:`);
        console.table(data);
      }
    } catch (e) {
      console.error(`Skipping ${table}:`, e.message);
    }
  }
  
  console.log('\nSearch completed.');
}

searchQuinzena('202611Q1');
