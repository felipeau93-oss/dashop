import { createClient } from '@supabase/supabase-js';
const s = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function run() {
  const tables = ['operacional', 'faturamento', 'penalidades', 'capcar', 'custos', 'bsc'];
  for (const t of tables) {
    const { count } = await s.from(t).select('*', { count: 'exact', head: true });
    console.log(`${t}: ${count}`);
  }
}
run();
