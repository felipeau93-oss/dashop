import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.db' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://lysyyfuylxoiilusjnot.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
if (!supabaseKey) {
  console.error("Missing supabase key");
  process.exit(1);
}
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.from('bsc').select('*').limit(1);
  console.log("Error:", error);
  console.log("Data:", data);
}
run();
