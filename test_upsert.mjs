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

async function testUpsert() {
    console.log("Testing upsert...");
    const { data, error } = await supabase.from('operacional').upsert([{ id_rota: '999999999', filial: 'TESTE', quinzena: '2099Q1' }], { onConflict: 'id_rota' });
    if (error) {
        console.error("Upsert failed:", error);
    } else {
        console.log("Upsert succeeded!", data);
        await supabase.from('operacional').delete().eq('id_rota', '999999999');
    }
}

testUpsert();
