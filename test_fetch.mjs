import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.join(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');

let supabaseUrl = '';
let supabaseKey = '';
envContent.split(/\r?\n/).forEach(line => {
  if (line.startsWith('VITE_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim().replace(/['"]/g, '');
  if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) supabaseKey = line.split('=')[1].trim().replace(/['"]/g, '');
});

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const tableName = 'operacional';
  const { count, error: countError } = await supabase.from(tableName).select('*', { count: 'exact', head: true });
  console.log("Count exact:", count);
  
  const limit = 1000;
  const promises = [];
  for (let start = 0; start < count; start += limit) {
      promises.push(
          supabase.from(tableName).select('*').range(start, start + limit - 1)
      );
  }
  
  const results = await Promise.all(promises);
  let allData = [];
  let errorCount = 0;
  for (const res of results) {
      if (res.data) allData = allData.concat(res.data);
      if (res.error) {
          console.error("Error in chunk:", res.error);
          errorCount++;
      }
  }
  console.log(`Fetched ${allData.length} rows. Errors: ${errorCount}`);
}

check();
