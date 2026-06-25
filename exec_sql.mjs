import fs from 'fs';
import pg from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Simple env parser to avoid adding dotenv
const envFile = path.join(__dirname, '.env.db');
const env = {};
if (fs.existsSync(envFile)) {
  const lines = fs.readFileSync(envFile, 'utf8').split('\n');
  for (const line of lines) {
    if (line.includes('=')) {
      const [key, ...rest] = line.split('=');
      env[key.trim()] = rest.join('=').replace(/^"|"$/g, '').trim();
    }
  }
}

const envName = process.argv[2] || 'test';
const sqlFile = process.argv[3];

if (!sqlFile) {
  console.error("Usage: node exec_sql.mjs [test|prod] <script.sql>");
  process.exit(1);
}

let dbUrl = envName === 'prod' ? env['DATABASE_URL_PROD'] : env['DATABASE_URL_TEST'];

if (!dbUrl || dbUrl.includes('SUA_SENHA_AQUI')) {
  console.error(`ERROR: Please set the correct password for DATABASE_URL_${envName.toUpperCase()} in .env.db`);
  process.exit(1);
}

// Fix passwords with @ or # by encoding them properly
// postgresql://postgres:PASSWORD@host:port/db
const match = dbUrl.match(/^postgresql:\/\/([^:]+):(.*)@([^@]+:\d+\/.*)$/);
if (match) {
  const user = match[1];
  const pass = match[2];
  const rest = match[3];
  dbUrl = `postgresql://${user}:${encodeURIComponent(pass)}@${rest}`;
}

const sqlContent = fs.readFileSync(sqlFile, 'utf8');

const client = new pg.Client({
  connectionString: dbUrl,
});

async function run() {
  try {
    await client.connect();
    console.log(`Connected to ${envName} database.`);
    
    console.log(`Executing ${sqlFile}...`);
    const res = await client.query(sqlContent);
    
    console.log("Success!");
    console.dir(res, { depth: null });
  } catch (err) {
    console.error("SQL Error:", err.message);
  } finally {
    await client.end();
  }
}

run();
