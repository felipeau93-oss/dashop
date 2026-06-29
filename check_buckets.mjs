import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const envLocal = fs.readFileSync(path.resolve('.env.local'), 'utf-8');
const vars = {};
envLocal.split('\n').forEach(l => {
  const [k, ...v] = l.split('=');
  if (k && v) vars[k.trim()] = v.join('=').replace(/"/g, '').trim();
});

const supabase = createClient(vars.VITE_SUPABASE_URL, vars.VITE_SUPABASE_ANON_KEY);

async function run() {
  const { data, error } = await supabase.storage.from('dados_json').list();
  if (error) console.error(error);
  else console.log(data);
}

run();
