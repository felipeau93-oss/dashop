import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

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
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const VIEWS = [
  'v_dre_custos',
  'v_dre_leves',
  'v_gaps_operacionais',
  'v_dashboard_operacional',
  'v_dashboard_financeiro',
  'v_comparativo_bsc',
  'v_detalhes_penalidades'
];

async function checkViews() {
  console.log("Checking materialized views for '202611Q1'...");
  for (const v of VIEWS) {
    try {
      const { data, count, error } = await supabase
        .from(v)
        .select('*', { count: 'exact' })
        .eq('quinzena', '202611Q1')
        .limit(1);
      
      if (error) {
         if(!error.message.includes("does not exist")) console.log(`Error on ${v}:`, error.message);
         continue;
      }
      if (count > 0) {
        console.log(`❌ Found ${count} records in view '${v}'!`);
      } else {
        console.log(`✅ View '${v}' is clean.`);
      }
    } catch(e) {}
  }
  
  // also check raw tables just in case we missed one
  const TABLES = ['faturamento', 'operacional', 'penalidades', 'custos', 'bsc', 'disponibilidade_frota', 'importacoes_history'];
  for (const t of TABLES) {
      const {count} = await supabase.from(t).select('*', {count: 'exact', head: true}).eq('quinzena', '202611Q1');
      if (count > 0) {
          console.log(`❌ Found ${count} records in raw table '${t}'!`);
      }
  }
  
  console.log("Done.");
}

checkViews();
