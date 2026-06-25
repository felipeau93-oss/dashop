import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://lysyyfuylxoiilusjnot.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5c3l5ZnV5bHhvaWlsdXNqbm90Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE5Mjc2NjUsImV4cCI6MjA5NzUwMzY2NX0.mgBIjzOQKNrUXptQlFj-AtP-PNtuuVUu6t09pfMG-ds');
async function run() {
  const { data: d2, error: e2 } = await supabase.rpc('get_detalhes_penalidades_filial', { p_filial: 'ERS16' });
  if (d2) {
     const counts = {};
     d2.forEach(r => { counts[r.quinzena] = (counts[r.quinzena]||0) + 1; });
     console.log('From RPC:', counts);
  }
}
run();
