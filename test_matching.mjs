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
  if (line.startsWith('VITE_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim().replace(/['"]/g, '');
  if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) supabaseKey = line.split('=')[1].trim().replace(/['"]/g, '');
});

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: pendentes } = await supabase.from('rotas_pendentes').select('*').limit(10);
  if (!pendentes || pendentes.length === 0) {
      console.log("Sem pendentes.");
      return;
  }
  
  const idToTest = pendentes[0].id_rota;
  console.log("Procurando id_rota:", idToTest, "da quinzena origem", pendentes[0].quinzena_origem);
  
  const { data: opMatch, error } = await supabase.from('operacional').select('*').eq('id_rota', idToTest);
  if (error) console.error("Error fetching opMatch:", error);
  console.log("Encontrado no operacional DB?", opMatch && opMatch.length > 0 ? "SIM" : "NÃO");
  if(opMatch && opMatch.length > 0) {
      console.log("Detalhes DB:", opMatch[0].id_rota, opMatch[0].filial, opMatch[0].quinzena);
  } else {
      // Find what DOES exist
      const { data: opAny } = await supabase.from('operacional').select('id_rota, quinzena, filial').limit(5);
      console.log("Alguns dados do DB:", opAny);
  }
  
  const { count: countOp } = await supabase.from('operacional').select('*', { count: 'exact', head: true });
  console.log("Total operacional:", countOp);
  
  const { count: countFat } = await supabase.from('faturamento').select('*', { count: 'exact', head: true });
  console.log("Total faturamento:", countFat);
}

check();
