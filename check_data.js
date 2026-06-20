import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lysyyfuylxoiilusjnot.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5c3l5ZnV5bHhvaWlsdXNqbm90Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE5Mjc2NjUsImV4cCI6MjA5NzUwMzY2NX0.mgBIjzOQKNrUXptQlFj-AtP-PNtuuVUu6t09pfMG-ds';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkData() {
  const { data, error } = await supabase.from('importacoes_history').select('quinzena');
  const distinctQuinzenas = [...new Set(data.map(d => d.quinzena))];
  console.log("Distinct quinzenas in importacoes_history:", distinctQuinzenas);
}

checkData();
