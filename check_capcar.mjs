import { supabase } from './src/supabase.js';

async function checkData() {
  const { data, error } = await supabase.from('capcar').select('*').limit(5);
  if (error) console.error(error);
  else console.log("CAPCAR Data:", JSON.stringify(data, null, 2));

  const { data: viewData, error: viewError } = await supabase.from('view_dre_custo_leve').select('*').limit(5);
  if (viewError) console.error(viewError);
  else console.log("VIEW Data:", JSON.stringify(viewData, null, 2));
}
checkData();
