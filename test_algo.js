import { createClient } from '@supabase/supabase-js';
const s = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function run() {
  const op = await s.from('operacional').select('id_rota, filial');
  const opMap = {};
  op.data.forEach(d => opMap[String(d.id_rota).trim()] = d.filial);
  const orf = await s.from('bsc').select('id_rota, filial').not('filial', 'in', '("SJP","CWB","PGZ","LON","MGF","CAS","JOI","BLU","FLN","SJL","ITA")').limit(100);
  console.log('BSC Órfãs:', orf.data.length);
  let found = 0;
  orf.data.forEach(d => {
     if(opMap[String(d.id_rota).trim()]) {
         found++;
         // console.log(`Match: ${d.id_rota} -> ${opMap[String(d.id_rota).trim()]}`);
     }
  });
  console.log('Found in Op:', found);
}
run();
