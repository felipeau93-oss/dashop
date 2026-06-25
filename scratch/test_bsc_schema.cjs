const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres:Aa982451397%40%23@db.lysyyfuylxoiilusjnot.supabase.co:5432/postgres' });
client.connect().then(async () => {
  try {
    const { rows } = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'bsc'");
    console.log(rows);
  } catch (e) {
    console.error("Query Error:", e);
  }
  client.end();
});
