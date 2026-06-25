import { createClient } from "@supabase/supabase-js";
const supabase = createClient("https://lysyyfuylxoiilusjnot.supabase.co", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5c3l5ZnV5bHhvaWlsdXNqbm90Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE5Mjc2NjUsImV4cCI6MjA5NzUwMzY2NX0.mgBIjzOQKNrUXptQlFj-AtP-PNtuuVUu6t09pfMG-ds");

async function run() {
  const { data, error } = await supabase.rpc('get_detalhes_penalidades_filial', { p_filial: 'SSC8' });
  if (error) {
    console.error("RPC Error:", error);
  } else {
    console.log("RPC Data count:", data.length);
    console.log("RPC Data sample:", data.slice(0, 5));
  }
}
run();
