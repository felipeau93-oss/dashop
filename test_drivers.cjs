const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://lysyyfuylxoiilusjnot.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5c3l5ZnV5bHhvaWlsdXNqbm90Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE5Mjc2NjUsImV4cCI6MjA5NzUwMzY2NX0.mgBIjzOQKNrUXptQlFj-AtP-PNtuuVUu6t09pfMG-ds');

async function run() {
  const { data, error } = await supabase.from('operacional').select('driver_id, motorista, filial').in('driver_id', ['4777372', '4812160', '4791935', '3373595', '4792021', '4213145', '4309696', '4761370']);
  console.log('Error:', error);
  console.log('Result:', data);
  
  // also check if they are stored as numbers if string fails
  const { data: d2 } = await supabase.from('operacional').select('driver_id, motorista, filial').limit(5);
  console.log('Sample data:', d2);
}
run();
