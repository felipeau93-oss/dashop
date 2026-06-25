import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lysyyfuylxoiilusjnot.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5c3l5ZnV5bHhvaWlsdXNqbm90Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE5Mjc2NjUsImV4cCI6MjA5NzUwMzY2NX0.mgBIjzOQKNrUXptQlFj-AtP-PNtuuVUu6t09pfMG-ds';
const supabase = createClient(supabaseUrl, supabaseKey);

async function repairAll() {
  let totalCount = 0;
  while (true) {
    console.log('Fetching batch...');
    const { data, error } = await supabase.from('penalidades').select('id, id_pacote, dados_originais').like('id_pacote', '%/%/%').limit(1000);
    
    if (error || !data || data.length === 0) {
      console.log('Finished processing all records.', error || 'No more data.');
      break;
    }
    
    console.log(`Found ${data.length} records in this batch.`);
    for (const d of data) {
      const desc = d.dados_originais['Descrição'] || d.dados_originais['Descri\u00e7\u00e3o'] || d.dados_originais['Descricao'] || '';
      const match = desc.match(/([^ ]+)$/);
      const newId = match ? match[1] : '-';
      
      await supabase.from('penalidades').update({ id_pacote: newId }).eq('id', d.id);
      totalCount++;
      if (totalCount % 100 === 0) console.log(`Total Updated: ${totalCount}`);
    }
  }
  
  console.log(`Successfully repaired total ${totalCount} records!`);
}

repairAll();
