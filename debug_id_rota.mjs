import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://lysyyfuylxoiilusjnot.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5c3l5ZnV5bHhvaWlsdXNqbm90Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE5Mjc2NjUsImV4cCI6MjA5NzUwMzY2NX0.mgBIjzOQKNrUXptQlFj-AtP-PNtuuVUu6t09pfMG-ds');

async function run() {
  const { data } = await supabase.from('penalidades').select('quinzena, id_rota, dados_originais').eq('filial', 'SSC8').limit(5);
  console.log('SSC8 Penalidades:', data);
  
  // Also list all unique quinzenas for SSC8 in penalidades
  const { data: qData } = await supabase.from('penalidades').select('quinzena').eq('filial', 'SSC8');
  const qs = new Set(qData.map(d => d.quinzena));
  console.log('Distinct quinzenas in penalidades SSC8:', [...qs].sort());
}
run();
