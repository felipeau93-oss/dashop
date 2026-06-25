const { Client } = require('pg');

const client = new Client({ connectionString: 'postgresql://postgres:Aa982451397%40%23@db.lysyyfuylxoiilusjnot.supabase.co:5432/postgres' });

client.connect().then(async () => {
  const { rows } = await client.query('SELECT COUNT(*) FROM motoristas');
  console.log("Total Motoristas:", rows[0].count);
  
  const { rows: details } = await client.query('SELECT COUNT(*) FROM view_motorista_detalhes');
  console.log("Total view_motorista_detalhes:", details[0].count);
  
  const { rows: m_sample } = await client.query('SELECT * FROM motoristas LIMIT 2');
  console.log("Sample motoristas:", m_sample);
  
  client.end();
}).catch(err => {
  console.error(err);
  process.exit(1);
});
