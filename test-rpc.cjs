const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres:Aa982451397%40%23@db.rfxkxxvaykiolzhmkaxt.supabase.co:5432/postgres' });
client.connect().then(async () => {
  const res = await client.query("SELECT has_table_privilege('anon', 'penalidades', 'SELECT') as can_select_anon;");
  console.log("Anon Privilege Status:", res.rows);
  client.end();
}).catch(console.error);
