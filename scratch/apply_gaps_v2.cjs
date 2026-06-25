const { Client } = require('pg');
const fs = require('fs');

const client = new Client({ connectionString: 'postgresql://postgres:Aa982451397%40%23@db.lysyyfuylxoiilusjnot.supabase.co:5432/postgres' });

client.connect().then(async () => {
  try {
    const sql = fs.readFileSync('scratch/update_gaps_motoristas_v2.sql', 'utf8');
    await client.query(sql);
    console.log("SQL executed successfully on TEST DB!");
  } catch (e) {
    console.error("Query Error:", e);
  }
  client.end();
});
