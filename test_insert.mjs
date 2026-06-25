import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envFile = '.env.db';
let dbUrl = '';
if (fs.existsSync(envFile)) {
  const lines = fs.readFileSync(envFile, 'utf8').split('\n');
  for (const line of lines) {
    if (line.includes('DATABASE_URL_PROD=')) {
      dbUrl = line.split('=')[1].replace(/^"|"$/g, '').trim();
    }
  }
}

// I can just query the DB using pg directly to see the columns, or use the Supabase JS client.
import pg from 'pg';

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
    console.log("Connected to prod database.");
    
    // We will attempt to insert a dummy row into bsc with 'motorista', 'saldo', 'entregues'
    const query = `
      INSERT INTO bsc (quinzena, motorista, saldo, entregues)
      VALUES ('2026-TEST', 'John Doe', 10, 5)
    `;
    
    const res = await client.query(query);
    console.log("Insert success!", res);
  } catch (err) {
    console.error("SQL Error:", err.message);
  } finally {
    await client.end();
  }
}

run();
