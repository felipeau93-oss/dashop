import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  console.log("Wiping BSC table...");
  const { error } = await supabase.from('bsc').delete().neq('id', 0);
  if (error) console.error("Error wiping:", error);
  else console.log("Wiped BSC successfully.");

  console.log("Refreshing views...");
  await supabase.rpc('rpc_refresh_materialized_views');
  console.log("Done.");
}

run();
