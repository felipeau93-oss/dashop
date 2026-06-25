import pg from 'pg';
import fs from 'fs';
import path from 'path';
const { Client } = pg;

const envDb = fs.readFileSync(path.resolve('.env.db'), 'utf-8');
const vars = {};
envDb.split('\n').forEach(l => {
  const [k, ...v] = l.split('=');
  if (k && v) vars[k.trim()] = v.join('=').replace(/"/g, '').trim();
});

function parseConnUrl(url) {
  const regex = /postgresql:\/\/([^:]+):(.+)@([^:]+):(\d+)\/(.+)/;
  const match = url.match(regex);
  if (!match) throw new Error("Could not parse url");
  return {
    user: match[1],
    password: match[2],
    host: match[3],
    port: parseInt(match[4]),
    database: match[5],
    ssl: { rejectUnauthorized: false }
  };
}

async function syncTable(tableName, prodClient, testClient) {
  console.log(`\nStarting sync for ${tableName}...`);
  await testClient.query(`TRUNCATE TABLE public.${tableName}`);
  console.log(`Truncated ${tableName} in TEST.`);

  const BATCH_SIZE = 3000; // Safe batch size to avoid query parameter limit (max 65535 parameters)
  let offset = 0;
  let totalCopied = 0;

  while (true) {
    const res = await prodClient.query(`SELECT * FROM public.${tableName} ORDER BY id LIMIT $1 OFFSET $2`, [BATCH_SIZE, offset]);
    if (res.rows.length === 0) break;

    const columns = Object.keys(res.rows[0]);
    // Postgres parameter limit is 65535. 3000 rows * ~15 columns = 45000 parameters.
    const insertQuery = `INSERT INTO public.${tableName} (${columns.map(c => `"${c}"`).join(', ')}) VALUES ${res.rows.map((_, i) => `(${columns.map((_, j) => `$${i * columns.length + j + 1}`).join(', ')})`).join(', ')}`;
    
    const values = res.rows.flatMap(row => columns.map(c => row[c]));
    
    await testClient.query(insertQuery, values);
    
    totalCopied += res.rows.length;
    console.log(`Copied ${totalCopied} rows of ${tableName}...`);
    offset += BATCH_SIZE;
  }
  console.log(`Finished ${tableName}. Total: ${totalCopied} rows.`);
}

async function run() {
  const prodClient = new Client(parseConnUrl(vars.DATABASE_URL_PROD));
  const testClient = new Client(parseConnUrl(vars.DATABASE_URL_TEST));
  
  await prodClient.connect();
  await testClient.connect();

  await syncTable('faturamento', prodClient, testClient);
  await syncTable('operacional', prodClient, testClient);
  await syncTable('penalidades', prodClient, testClient);

  console.log("\nRefreshing materialized views in TEST...");
  try {
     // Run the views directly just like the previous fix
     await testClient.query("SET statement_timeout = '10min'");
     await testClient.query("REFRESH MATERIALIZED VIEW view_gaps_operacionais_bsc");
     await testClient.query("REFRESH MATERIALIZED VIEW view_motorista_agregado");
     await testClient.query("REFRESH MATERIALIZED VIEW view_dre_custo_leve");
     // wait wait, does test have more views? The previous fix in test refreshed those two.
     console.log("Materialized views refreshed.");
  } catch(e) { console.error("Error refreshing views:", e.message) }

  await prodClient.end();
  await testClient.end();
  console.log("All done!");
}

run().catch(console.error);
