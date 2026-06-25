const url = "https://lysyyfuylxoiilusjnot.supabase.co/rest/v1/mapeamento_filiais?select=*";
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5c3l5ZnV5bHhvaWlsdXNqbm90Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE5Mjc2NjUsImV4cCI6MjA5NzUwMzY2NX0.mgBIjzOQKNrUXptQlFj-AtP-PNtuuVUu6t09pfMG-ds";

async function run() {
  const res = await fetch(url, { headers: { 'apikey': key, 'Authorization': `Bearer ${key}` } });
  const allData = await res.json();
  
  const jsonString = JSON.stringify(allData);
  const uploadUrl = "https://lysyyfuylxoiilusjnot.supabase.co/storage/v1/object/dados_json/mapeamento_filiais.json";
  
  const upRes = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
      'x-upsert': 'true'
    },
    body: jsonString
  });
  
  console.log(upRes.status);
  console.log(await upRes.text());
}
run();
