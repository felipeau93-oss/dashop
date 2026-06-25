-- 1. Create a custom aggregate function to sum JSONB objects
CREATE OR REPLACE FUNCTION sum_jsonb(a jsonb, b jsonb)
RETURNS jsonb AS $$
  SELECT jsonb_object_agg(key, val) FROM (
    SELECT key, sum(val::numeric) as val
    FROM (
      SELECT key, value as val FROM jsonb_each_text(a) WHERE a IS NOT NULL
      UNION ALL
      SELECT key, value as val FROM jsonb_each_text(b) WHERE b IS NOT NULL
    ) t
    GROUP BY key
  ) s;
$$ LANGUAGE SQL IMMUTABLE;

DROP AGGREGATE IF EXISTS sum_jsonb_agg(jsonb);
CREATE AGGREGATE sum_jsonb_agg(jsonb) (
  sfunc = sum_jsonb,
  stype = jsonb,
  initcond = '{}'
);

-- 2. Recreate the view_gaps_operacionais_bsc
DROP MATERIALIZED VIEW IF EXISTS view_gaps_operacionais_bsc;

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
  SELECT b.quinzena, b.filial, b.motorista, 
         SUM(COALESCE(b.entregues, 0)) as pacotes_entregues,
         SUM(COALESCE(b.saldo, 0)) as pacotes_saldo,
         sum_jsonb_agg(b."insucessosDetalhados") as insucessos_detalhados,
         0 as nota_bsc
  FROM bsc b
  WHERE b.motorista IS NOT NULL AND b.motorista != 'N/A'
  GROUP BY b.quinzena, b.filial, b.motorista
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
  COALESCE(b.insucessos_detalhados, '{}'::jsonb) as insucessos_detalhados,
  COALESCE(b.nota_bsc, 0) as nota_bsc
FROM pen_agg p
FULL OUTER JOIN bsc_agg b 
  ON p.quinzena = b.quinzena AND p.filial = b.filial AND p.motorista = b.motorista;

CREATE UNIQUE INDEX idx_mv_gaps_operacionais ON view_gaps_operacionais_bsc(quinzena, filial, motorista);
