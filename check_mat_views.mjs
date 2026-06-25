import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log("Checking row counts...");

  const tables = ['operacional', 'faturamento', 'view_dre_custo_leve', 'view_gaps_operacionais_bsc'];
  
  for (const table of tables) {
    const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
    if (error) {
      console.error(`Error fetching count for ${table}:`, error.message);
    } else {
      console.log(`Table ${table} has ${count} rows.`);
    }
  }

  console.log("\nRefreshing materialized views...");
  const { error: rpcError } = await supabase.rpc('rpc_refresh_materialized_views');
  if (rpcError) {
    console.error("Error refreshing views:", rpcError.message);
  } else {
    console.log("Successfully refreshed views.");
    
    // Check counts again
    console.log("\nChecking row counts after refresh...");
    for (const table of tables) {
      const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
      if (error) {
        console.error(`Error fetching count for ${table}:`, error.message);
      } else {
        console.log(`Table ${table} has ${count} rows.`);
      }
    }
  }
}

main();
