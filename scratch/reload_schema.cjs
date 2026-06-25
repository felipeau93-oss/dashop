const { Client } = require('pg');

const client = new Client({ connectionString: 'postgresql://postgres:Aa982451397%40%23@db.lysyyfuylxoiilusjnot.supabase.co:5432/postgres' });

client.connect().then(async () => {
  try {
    await client.query("NOTIFY pgrst, 'reload schema'");
    console.log("Schema reloaded!");
  } catch (e) {
    console.error("Query Error:", e);
  }
  client.end();
});
