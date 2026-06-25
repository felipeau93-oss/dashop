const url = "https://lysyyfuylxoiilusjnot.supabase.co/rest/v1/view_dre_custo_leve?select=*&faturamento_total=lt.0";
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5c3l5ZnV5bHhvaWlsdXNqbm90Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE5Mjc2NjUsImV4cCI6MjA5NzUwMzY2NX0.mgBIjzOQKNrUXptQlFj-AtP-PNtuuVUu6t09pfMG-ds";

async function run() {
  const res = await fetch(url, { headers: { 'apikey': key, 'Authorization': `Bearer ${key}` } });
  const data = await res.json();
  console.log('Negative Faturamento:', data);
}
run();
