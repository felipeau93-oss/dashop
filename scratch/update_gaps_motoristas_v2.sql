DROP MATERIALIZED VIEW IF EXISTS view_gaps_operacionais_bsc CASCADE;

CREATE MATERIALIZED VIEW view_gaps_operacionais_bsc AS
WITH pen_op AS (
  -- Para penalidades (Billing), não precisa buscar o nome no Driver ID porque já vem o nome correto.
  SELECT p.quinzena, p.filial, p.motorista, p.tipo, p.valor
  FROM penalidades p
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
  -- Para BSC, busca pelo Driver ID caso não tenha o nome do motorista
  SELECT b.quinzena, b.filial, 
         COALESCE(NULLIF(TRIM(b.motorista), ''), NULLIF(b.motorista, 'N/A'), m.nome) as motorista,
         SUM(COALESCE(entregues, 0)) as total_entregues,
         SUM(COALESCE(saldo, 0)) as total_saldo
  FROM bsc b
  LEFT JOIN motoristas m ON b.driver_id = m.driver_id
  WHERE COALESCE(NULLIF(TRIM(b.motorista), ''), NULLIF(b.motorista, 'N/A'), m.nome) IS NOT NULL 
    AND COALESCE(NULLIF(TRIM(b.motorista), ''), NULLIF(b.motorista, 'N/A'), m.nome) != 'N/A'
  GROUP BY b.quinzena, b.filial, COALESCE(NULLIF(TRIM(b.motorista), ''), NULLIF(b.motorista, 'N/A'), m.nome)
)
SELECT 
  COALESCE(b.quinzena, p.quinzena) as quinzena,
  COALESCE(b.filial, p.filial) as filial,
  COALESCE(b.motorista, p.motorista) as motorista,
  COALESCE(b.total_entregues, 0) as total_entregues,
  COALESCE(b.total_saldo, 0) as total_saldo,
  COALESCE(p.qtd_not_visited, 0) as qtd_not_visited,
  COALESCE(p.qtd_pnr, 0) as qtd_pnr,
  COALESCE(p.qtd_lost, 0) as qtd_lost,
  COALESCE(p.valor_not_visited, 0) as valor_not_visited,
  COALESCE(p.valor_pnr, 0) as valor_pnr,
  COALESCE(p.valor_lost, 0) as valor_lost,
  COALESCE(p.valor_outros, 0) as valor_outros,
  COALESCE(p.total_desconto_penalidades, 0) as total_desconto_penalidades
FROM bsc_agg b
FULL OUTER JOIN pen_agg p 
  ON p.quinzena = b.quinzena AND p.filial = b.filial AND p.motorista = b.motorista;

CREATE UNIQUE INDEX idx_mv_gaps_operacionais ON view_gaps_operacionais_bsc(quinzena, filial, motorista);

GRANT SELECT ON view_gaps_operacionais_bsc TO anon, authenticated;

-- Refresh materializations
SET LOCAL statement_timeout = '60s';
REFRESH MATERIALIZED VIEW view_gaps_operacionais_bsc;
