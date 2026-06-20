import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lysyyfuylxoiilusjnot.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5c3l5ZnV5bHhvaWlsdXNqbm90Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE5Mjc2NjUsImV4cCI6MjA5NzUwMzY2NX0.mgBIjzOQKNrUXptQlFj-AtP-PNtuuVUu6t09pfMG-ds';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkTables() {
  const { data, error } = await supabase.rpc('get_tables'); 
  // or just try to fetch 1 row from known tables to see if they exist
  const tablesToCheck = ['operacional', 'operacional_testes', 'importacoes_history', 'importacoes_history_testes', 'disponibilidade_frota', 'disponibilidade_frota_testes'];
  
  for (const t of tablesToCheck) {
     const { error } = await supabase.from(t).select('id').limit(1);
     if (error) {
        console.log(`Table ${t} ERROR: ${error.message}`);
     } else {
        console.log(`Table ${t} EXISTS.`);
     }
  }
}

checkTables();
