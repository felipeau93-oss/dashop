const urlDre = "https://lysyyfuylxoiilusjnot.supabase.co/rest/v1/view_dre_custo_leve?select=filial";
const urlMap = "https://lysyyfuylxoiilusjnot.supabase.co/rest/v1/mapeamento_filiais?select=filial";
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5c3l5ZnV5bHhvaWlsdXNqbm90Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE5Mjc2NjUsImV4cCI6MjA5NzUwMzY2NX0.mgBIjzOQKNrUXptQlFj-AtP-PNtuuVUu6t09pfMG-ds";

async function run() {
  const resDre = await fetch(urlDre, { headers: { 'apikey': key, 'Authorization': `Bearer ${key}` } });
  const dreData = await resDre.json();
  const dreFiliais = new Set(dreData.map(d => String(d.filial).toUpperCase().trim()));
  
  const resMap = await fetch(urlMap, { headers: { 'apikey': key, 'Authorization': `Bearer ${key}` } });
  const mapData = await resMap.json();
  const mapFiliais = new Set(mapData.map(d => String(d.filial).toUpperCase().trim()));

  const unmapped = [...dreFiliais].filter(f => !mapFiliais.has(f) && f !== 'N/A');
  
  console.log('Filiais in DRE but not in Map:', unmapped);
}
run();
