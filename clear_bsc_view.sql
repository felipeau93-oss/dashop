DO $$ 
BEGIN
    DROP MATERIALIZED VIEW IF EXISTS view_gaps_operacionais_bsc CASCADE;
END $$;

CREATE MATERIALIZED VIEW view_gaps_operacionais_bsc AS
WITH pen_op AS (
  SELECT p.quinzena, p.filial, o.motorista, p.tipo, p.valor
  FROM penalidades p
  LEFT JOIN (
    SELECT DISTINCT id_rota, motorista FROM operacional
  ) o ON p.id_rota = o.id_rota
),
pen_agg AS (
  SELECT quinzena, filial, motorista,
         SUM(CASE WHEN tipo ILIKE '%Not Visited%' THEN 1 ELSE 0 END) as qtd_not_visited,
         SUM(CASE WHEN tipo ILIKE '%PNR%' THEN 1 ELSE 0 END) as qtd_pnr,
         SUM(CASE WHEN tipo ILIKE '%Lost%' THEN 1 ELSE 0 END) as qtd_lost,
         SUM(CASE WHEN tipo ILIKE '%Not Visited%' THEN COALESCE(valor, 0) ELSE 0 END) as valor_not_visited,
         SUM(CASE WHEN tipo ILIKE '%PNR%' THEN COALESCE(valor, 0) ELSE 0 END) as valor_pnr,
         SUM(CASE WHEN tipo ILIKE '%Lost%' THEN COALESCE(valor, 0) ELSE 0 END) as valor_lost,
         SUM(CASE WHEN tipo NOT ILIKE '%Not Visited%' AND tipo NOT ILIKE '%PNR%' AND tipo NOT ILIKE '%Lost%' THEN COALESCE(valor, 0) ELSE 0 END) as valor_outros,
         SUM(COALESCE(valor, 0)) as total_desconto_penalidades
  FROM pen_op
  WHERE motorista IS NOT NULL AND motorista != 'N/A'
  GROUP BY quinzena, filial, motorista
),
bsc_agg AS (
  SELECT b.quinzena, b.filial, o.motorista, 
         0 as pacotes_entregues,
         0 as pacotes_saldo,
         MAX(b.nota) as nota_bsc
  FROM bsc b
  LEFT JOIN (
    SELECT DISTINCT driver_id, motorista FROM operacional WHERE driver_id IS NOT NULL AND driver_id != 'N/A'
  ) o ON b.driver_id = o.driver_id
  WHERE o.motorista IS NOT NULL AND o.motorista != 'N/A'
  GROUP BY b.quinzena, b.filial, o.motorista
)
SELECT 
  COALESCE(p.quinzena, b.quinzena) as quinzena,
  COALESCE(p.filial, b.filial) as filial,
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
  ON p.quinzena = b.quinzena AND p.filial = b.filial AND p.motorista = b.motorista;

CREATE UNIQUE INDEX idx_mv_gaps_operacionais ON view_gaps_operacionais_bsc(quinzena, filial, motorista);

GRANT SELECT ON view_gaps_operacionais_bsc TO anon, authenticated;
