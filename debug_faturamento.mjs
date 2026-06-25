import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://lysyyfuylxoiilusjnot.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5c3l5ZnV5bHhvaWlsdXNqbm90Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE5Mjc2NjUsImV4cCI6MjA5NzUwMzY2NX0.mgBIjzOQKNrUXptQlFj-AtP-PNtuuVUu6t09pfMG-ds');

async function run() {
  const { data, error } = await supabase.from('penalidades').select('id_rota, quinzena').eq('filial', 'SSC8').neq('id_rota', '-').neq('id_rota', 'N/A').limit(50);
  console.log('Penalidades id_rotas SSC8:', data.map(d => d.id_rota).slice(0,5));

  for (const d of data.slice(0,5)) {
    const { data: fData } = await supabase.from('faturamento').select('quinzena, id_rota').eq('id_rota', d.id_rota);
    console.log(`Rota ${d.id_rota} from ${d.quinzena} has faturamento quinzenas:`, fData.map(f => f.quinzena));
  }
}
run();
