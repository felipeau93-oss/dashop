const { Client } = require('pg');

const client = new Client({ connectionString: 'postgresql://postgres:Aa982451397%40%23@db.lysyyfuylxoiilusjnot.supabase.co:5432/postgres' });

client.connect().then(async () => {
  try {
    const { rows } = await client.query('SELECT * FROM view_motorista_agregado LIMIT 2');
    console.log("Data from view:", rows);
  } catch (e) {
    console.error("Query Error:", e);
  }
  client.end();
});
