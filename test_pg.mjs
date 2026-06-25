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
  // postgresql://postgres:Aa982451397@#@db.lysyyfuylxoiilusjnot.supabase.co:5432/postgres
  // regex to match: postgresql://(user):(pass)@(host):(port)/(db)
  const regex = /postgresql:\/\/([^:]+):(.+)@([^:]+):(\d+)\/(.+)/;
  const match = url.match(regex);
  if (!match) throw new Error("Could not parse " + url);
  return {
    user: match[1],
    password: match[2],
    host: match[3],
    port: parseInt(match[4]),
    database: match[5],
    ssl: { rejectUnauthorized: false }
  };
}

async function run() {
  const prodClient = new Client(parseConnUrl(vars.DATABASE_URL_PROD));
  const testClient = new Client(parseConnUrl(vars.DATABASE_URL_TEST));
  
  await prodClient.connect();
  await testClient.connect();
  
  console.log("PROD Faturamento rows:");
  const prodFat = await prodClient.query('SELECT count(*) FROM public.faturamento');
  console.log(prodFat.rows[0]);
  
  console.log("TEST Faturamento rows:");
  const testFat = await testClient.query('SELECT count(*) FROM public.faturamento');
  console.log(testFat.rows[0]);

  console.log("PROD Operacional rows:");
  const prodOp = await prodClient.query('SELECT count(*) FROM public.operacional');
  console.log(prodOp.rows[0]);
  
  console.log("TEST Operacional rows:");
  const testOp = await testClient.query('SELECT count(*) FROM public.operacional');
  console.log(testOp.rows[0]);
  
  await prodClient.end();
  await testClient.end();
}

run().catch(console.error);
