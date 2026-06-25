DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_matviews WHERE matviewname = 'view_gaps_operacionais_bsc') THEN
        DROP MATERIALIZED VIEW view_gaps_operacionais_bsc CASCADE;
    ELSIF EXISTS (SELECT 1 FROM pg_views WHERE viewname = 'view_gaps_operacionais_bsc') THEN
        DROP VIEW view_gaps_operacionais_bsc CASCADE;
    END IF;
END $$;

CREATE MATERIALIZED VIEW view_gaps_operacionais_bsc AS
WITH pen_op AS (
  SELECT p.quinzena, p.filial, o.driver_id, o.motorista, p.tipo, p.valor
  FROM penalidades p
  LEFT JOIN (
    SELECT id_rota, MIN(driver_id) as driver_id, MAX(motorista) as motorista FROM operacional GROUP BY id_rota
  ) o ON p.id_rota = o.id_rota
),
pen_agg AS (
  SELECT quinzena, filial, driver_id, MAX(motorista) as motorista,
         SUM(CASE WHEN tipo ILIKE '%Not Visited%' THEN 1 ELSE 0 END) as qtd_not_visited,
         SUM(CASE WHEN tipo ILIKE '%PNR%' THEN 1 ELSE 0 END) as qtd_pnr,
         SUM(CASE WHEN tipo ILIKE '%Lost%' THEN 1 ELSE 0 END) as qtd_lost,
         SUM(CASE WHEN tipo ILIKE '%Not Visited%' THEN COALESCE(valor, 0) ELSE 0 END) as valor_not_visited,
         SUM(CASE WHEN tipo ILIKE '%PNR%' THEN COALESCE(valor, 0) ELSE 0 END) as valor_pnr,
         SUM(CASE WHEN tipo ILIKE '%Lost%' THEN COALESCE(valor, 0) ELSE 0 END) as valor_lost,
         SUM(CASE WHEN tipo NOT ILIKE '%Not Visited%' AND tipo NOT ILIKE '%PNR%' AND tipo NOT ILIKE '%Lost%' THEN COALESCE(valor, 0) ELSE 0 END) as valor_outros,
         SUM(COALESCE(valor, 0)) as total_desconto_penalidades
  FROM pen_op
  WHERE driver_id IS NOT NULL AND driver_id != 'N/A'
  GROUP BY quinzena, filial, driver_id
),
bsc_agg AS (
  SELECT quinzena, filial, driver_id, MAX(motorista) as motorista,
         SUM(COALESCE(entregues, 0)) as pacotes_entregues,
         SUM(COALESCE(saldo, 0)) as pacotes_saldo,
         CASE WHEN SUM(COALESCE(entregues, 0) + COALESCE(saldo, 0)) > 0 
              THEN ROUND((SUM(COALESCE(entregues, 0)) / SUM(COALESCE(entregues, 0) + COALESCE(saldo, 0))) * 100, 2)
              ELSE 0 END as nota_bsc
  FROM operacional
  WHERE driver_id IS NOT NULL AND driver_id != 'N/A'
  GROUP BY quinzena, filial, driver_id
)
SELECT 
  COALESCE(p.quinzena, b.quinzena) as quinzena,
  COALESCE(p.filial, b.filial) as filial,
  COALESCE(p.driver_id, b.driver_id) as driver_id,
  COALESCE(p.motorista, b.motorista) as motorista,
  COALESCE(p.qtd_not_visited, 0) as qtd_not_visited,
  COALESCE(p.qtd_pnr, 0) as qtd_pnr,
  COALESCE(p.qtd_lost, 0) as qtd_lost,
  COALESCE(p.valor_not_visited, 0) as valor_not_visited,
  COALESCE(p.valor_pnr, 0) as valor_pnr,
  COALESCE(p.valor_lost, 0) as valor_lost,
  COALESCE(p.valor_outros, 0) as valor_outros,
  COALESCE(p.total_desconto_penalidades, 0) as total_desconto_penalidades,
  COALESCE(b.pacotes_entregues, 0) as pacotes_entregues,
  COALESCE(b.pacotes_saldo, 0) as pacotes_saldo,
  COALESCE(b.nota_bsc, 0) as nota_bsc
FROM pen_agg p
FULL OUTER JOIN bsc_agg b 
  ON p.quinzena = b.quinzena AND p.filial = b.filial AND p.driver_id = b.driver_id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_gaps_operacionais ON view_gaps_operacionais_bsc(quinzena, filial, driver_id);

GRANT SELECT ON view_gaps_operacionais_bsc TO anon, authenticated;

-- Atualizar RPC que dá refresh pra usar a view certa
CREATE OR REPLACE FUNCTION rpc_refresh_materialized_views()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY view_dre_custo_leve;
  REFRESH MATERIALIZED VIEW CONCURRENTLY view_gaps_operacionais_bsc;
END;
$$ LANGUAGE plpgsql;

NOTIFY pgrst, 'reload schema';
