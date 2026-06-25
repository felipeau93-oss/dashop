import { createClient } from "@supabase/supabase-js";
const supabase = createClient("https://lysyyfuylxoiilusjnot.supabase.co", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5c3l5ZnV5bHhvaWlsdXNqbm90Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE5Mjc2NjUsImV4cCI6MjA5NzUwMzY2NX0.mgBIjzOQKNrUXptQlFj-AtP-PNtuuVUu6t09pfMG-ds");

async function applyMigration() {
  const sql = `
    CREATE OR REPLACE FUNCTION get_detalhes_penalidades_filial(p_filial text)
    RETURNS TABLE (
      id uuid,
      quinzena text,
      filial text,
      regional text,
      supervisor text,
      motorista text,
      tipo text,
      id_rota text,
      id_pacote text,
      valor double precision,
      qtd numeric
    ) AS $$
      SELECT 
        p.id,
        p.quinzena, 
        p.filial, 
        p.regional,
        p.supervisor,
        COALESCE(
          NULLIF(p.motorista, 'N/A'),
          NULLIF(p.motorista, ''), 
          NULLIF(p.dados_originais->>'Motorista', ''),
          NULLIF(p.dados_originais->>'motorista', ''),
          'N/A'
        ) as motorista, 
        p.tipo, 
        p.id_rota, 
        CASE 
          WHEN p.id_pacote LIKE '%/%/%' THEN 
            COALESCE(
              NULLIF(substring(COALESCE(p.dados_originais->>'Descrição', p.dados_originais->>'Descricao', '') from '[^ ]+$'), ''), 
              '-'
            )
          ELSE COALESCE(p.id_pacote, '-')
        END as id_pacote, 
        p.valor::double precision,
        COALESCE((p.dados_originais->>'Quantidade')::numeric, p.qtd, 1) as qtd
      FROM penalidades p
      WHERE p.filial = p_filial;
    $$ LANGUAGE sql;

    GRANT EXECUTE ON FUNCTION get_detalhes_penalidades_filial TO anon, authenticated;
  `;

  // We can't execute raw SQL directly from the client without a function.
  // Wait, if we can't execute raw SQL, how do we apply it?
  // We can't!
}
applyMigration();
