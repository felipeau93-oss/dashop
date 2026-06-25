import { createClient } from "@supabase/supabase-js";
const s = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
s.from("penalidades").select("filial, id_rota").not("filial", "in", `(SJP,CWB)`).limit(5).then(r => console.log("STRING NO QUOTES:", r.error?.message || "Success", r.data?.length));
s.from("penalidades").select("filial, id_rota").not("filial", "in", `("SJP","CWB")`).limit(5).then(r => console.log("STRING W QUOTES:", r.error?.message || "Success", r.data?.length));
s.from("penalidades").select("filial, id_rota").not("filial", "in", ["SJP","CWB"]).limit(5).then(r => console.log("ARRAY:", r.error?.message || "Success", r.data?.length));
