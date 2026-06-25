const { Client } = require('pg');

const client = new Client({ connectionString: 'postgresql://postgres:Aa982451397%40%23@db.lysyyfuylxoiilusjnot.supabase.co:5432/postgres' });

client.connect().then(async () => {
  try {
    const { rows } = await client.query("SELECT * FROM penalidades LIMIT 1");
    console.log("Penalidades structure:", rows[0]);
  } catch (e) {
    console.error("Query Error:", e);
  }
  client.end();
});
