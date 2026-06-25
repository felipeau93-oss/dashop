import { createClient } from "@supabase/supabase-js";
const s = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
s.from("penalidades").select("*").limit(1).then(r => {
  console.log(r.data[0]);
});
