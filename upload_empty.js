import { createClient } from '@supabase/supabase-js';
const s = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function run() {
  const tables = ['operacional', 'faturamento', 'penalidades', 'capcar', 'custos', 'bsc', 'disponibilidade_frota', 'rotas_pendentes', 'rotas_ignoradas', 'importacoes_history'];
  for (const table of tables) {
    const json = JSON.stringify([]);
    const { data, error } = await s.storage.from('dados_json').upload(`${table}.json`, json, {
        contentType: 'application/json',
        cacheControl: '3600',
        upsert: true
    });
    console.log(`Upload ${table}:`, error || 'Success');
  }
}
run();
