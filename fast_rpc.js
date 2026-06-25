import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing SUPABASE env vars");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  console.log("Updating RPC function to be extremely fast...");
  const sql = `
CREATE OR REPLACE FUNCTION rpc_sincronizar_faturamento_operacional(p_quinzena TEXT)
RETURNS void AS $$
BEGIN
  SET LOCAL statement_timeout = '10min';
  
  -- Usa o proprio índice para buscar e não faz DISTINCT
  UPDATE faturamento f
  SET filial = o.filial,
      regional = o.regional,
      supervisor = o.supervisor,
      motorista = COALESCE(o.motorista, f.motorista)
  FROM operacional o
  WHERE f.id_rota = o.id_rota
    AND f.quinzena = p_quinzena
    AND f.filial = 'N/A';

  UPDATE penalidades p
  SET filial = o.filial,
      regional = o.regional,
      supervisor = o.supervisor
  FROM operacional o
  WHERE p.id_rota = o.id_rota
    AND p.quinzena = p_quinzena
    AND p.filial = 'N/A';
END;
$$ LANGUAGE plpgsql;
  `;
  
  // NOTE: supabase anon key cannot CREATE FUNCTION usually! Let's try.
  // Actually, wait, maybe we can just query it through REST?
  // Let's just create an endpoint or just ask the user to run it.
  console.log("We can't CREATE FUNCTION via Anon Key. We must tell the user to do it.");
}

run();
