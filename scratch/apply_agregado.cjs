const { Client } = require('pg');
const fs = require('fs');

const client = new Client({ connectionString: 'postgresql://postgres:Aa982451397%40%23@db.lysyyfuylxoiilusjnot.supabase.co:5432/postgres' });

client.connect().then(async () => {
  const sql = fs.readFileSync('scratch/test_motorista_agregado.sql', 'utf8');
  await client.query(sql);
  console.log("SQL executed successfully on TEST DB!");
  client.end();
}).catch(err => {
  console.error("Error executing SQL on TEST DB:", err);
  process.exit(1);
});
