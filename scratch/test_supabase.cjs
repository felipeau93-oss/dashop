const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://lysyyfuylxoiilusjnot.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5c3l5ZnV5bHhvaWlsdXNqbm90Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE5Mjc2NjUsImV4cCI6MjA5NzUwMzY2NX0.mgBIjzOQKNrUXptQlFj-AtP-PNtuuVUu6t09pfMG-ds';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  const { data, error } = await supabase
    .from('view_motorista_agregado')
    .select('driver_id, nome, cpf_cnpj, placas_vinculadas, total_rotas, entregues, saldo, valor_penalidades, qtd_penalidades')
    .order('valor_penalidades', { ascending: false });

  if (error) {
    console.error("Supabase Error:", error);
  } else {
    console.log("Supabase Data fetched:", data.length, "rows");
  }
}

test();
