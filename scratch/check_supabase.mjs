import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lysyyfuylxoiilusjnot.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5c3l5ZnV5bHhvaWlsdXNqbm90Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE5Mjc2NjUsImV4cCI6MjA5NzUwMzY2NX0.mgBIjzOQKNrUXptQlFj-AtP-PNtuuVUu6t09pfMG-ds';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase
    .from('operacional')
    .select('dados_originais')
    .not('motorista', 'is', null)
    .neq('motorista', 'N/A')
    .limit(5);

  if (error) {
    console.error(error);
    return;
  }
  
  if (data && data.length > 0) {
    data.forEach((row, idx) => {
      console.log(`Sample ${idx} keys:`, Object.keys(row.dados_originais));
    });
  } else {
    console.log('No data found');
  }
}

run();
