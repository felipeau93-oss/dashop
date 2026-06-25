import pg from 'pg';
import fs from 'fs';

const envDb = fs.readFileSync('.env.db', 'utf-8');
const vars = {};
envDb.split('\n').forEach(l => {
  const [k, ...v] = l.split('=');
  if (k && v) vars[k.trim()] = v.join('=').replace(/"/g, '').trim();
});

function parse(url) {
  const regex = /postgresql:\/\/([^:]+):(.+)@([^:]+):(\d+)\/(.+)/;
  const match = url.match(regex);
  return { user: match[1], password: match[2], host: match[3], port: parseInt(match[4]), database: match[5], ssl: { rejectUnauthorized: false } };
}

const p = new pg.Client(parse(vars.DATABASE_URL_PROD));
const t = new pg.Client(parse(vars.DATABASE_URL_TEST));

async function check() {
  await p.connect(); await t.connect();
  
  const pp = await p.query('SELECT sum(valor) as v, count(*) as c FROM penalidades');
  const tp = await t.query('SELECT sum(valor) as v, count(*) as c FROM penalidades');
  console.log('PENALIDADES PROD:', pp.rows[0]);
  console.log('PENALIDADES TEST:', tp.rows[0]);
  
  const pf = await p.query('SELECT sum(faturamento) as f, sum(faturamento_paradas) as fp FROM faturamento');
  const tf = await t.query('SELECT sum(faturamento) as f, sum(faturamento_paradas) as fp FROM faturamento');
  console.log('FATURAMENTO TABLE PROD:', pf.rows[0]);
  console.log('FATURAMENTO TABLE TEST:', tf.rows[0]);
  
  const pmv = await p.query('SELECT sum(faturamento_total) as f FROM view_dre_custo_leve');
  const tmv = await t.query('SELECT sum(faturamento_total) as f FROM view_dre_custo_leve');
  console.log('MV FATURAMENTO PROD:', pmv.rows[0]);
  console.log('MV FATURAMENTO TEST:', tmv.rows[0]);
  
  await p.end(); await t.end();
}

check().catch(console.error);
