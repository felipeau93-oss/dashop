import pg from 'pg';
import fs from 'fs';

const envFile = '.env.db';
let dbUrl = '';
if (fs.existsSync(envFile)) {
  const lines = fs.readFileSync(envFile, 'utf8').split('\n');
  for (const line of lines) {
    if (line.includes('DATABASE_URL_TEST=')) {
      dbUrl = line.split('=')[1].replace(/^"|"$/g, '').trim();
    }
  }
}

const match = dbUrl.match(/^postgresql:\/\/([^:]+):(.*)@([^@]+:\d+\/.*)$/);
if (match) {
  const user = match[1];
  const pass = match[2];
  const rest = match[3];
  dbUrl = `postgresql://${user}:${encodeURIComponent(pass)}@${rest}`;
}

const client = new pg.Client({
  connectionString: dbUrl,
});

async function run() {
  try {
    await client.connect();
    
    // Check the materialized view
    const viewRes = await client.query('SELECT * FROM view_gaps_operacionais_bsc WHERE pacotes_entregues > 0 ORDER BY pacotes_entregues DESC LIMIT 5');
    console.log("Materialized View output:");
    console.dir(viewRes.rows, { depth: null });
    
  } catch (err) {
    console.error("SQL Error:", err.message);
  } finally {
    await client.end();
  }
}

run();
