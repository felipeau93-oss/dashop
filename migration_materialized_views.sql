-- ==========================================
-- SCRIPT DE OTIMIZAÇÃO: MATERIALIZED VIEWS
-- ==========================================

-- 1. Removemos as views antigas independentemente do seu tipo atual
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_matviews WHERE matviewname = 'view_dre_custo_leve') THEN
        DROP MATERIALIZED VIEW view_dre_custo_leve CASCADE;
    ELSIF EXISTS (SELECT 1 FROM pg_views WHERE viewname = 'view_dre_custo_leve') THEN
        DROP VIEW view_dre_custo_leve CASCADE;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_matviews WHERE matviewname = 'view_gaps_operacionais_bsc') THEN
        DROP MATERIALIZED VIEW view_gaps_operacionais_bsc CASCADE;
    ELSIF EXISTS (SELECT 1 FROM pg_views WHERE viewname = 'view_gaps_operacionais_bsc') THEN
        DROP VIEW view_gaps_operacionais_bsc CASCADE;
    END IF;
END $$;
-- 2. Criamos Materialized Views (Os dados são calculados uma vez e salvos no disco = 1000x mais rápido)
CREATE MATERIALIZED VIEW view_dre_custo_leve AS
WITH fat AS (
  SELECT quinzena, filial, 
         SUM(COALESCE(faturamento, 0)) as total_faturamento,
         SUM(COALESCE(faturamento_paradas, 0)) as total_faturamento_paradas
  FROM faturamento GROUP BY quinzena, filial
),
pen AS (
  SELECT quinzena, filial,
         SUM(COALESCE(valor, 0)) as total_penalidades
  FROM penalidades GROUP BY quinzena, filial
),
cap AS (
  SELECT quinzena, filial,
         SUM(COALESCE("valorPago", 0)) as total_pago,
         SUM(COALESCE("valorDevido", 0)) as total_devido,
         SUM(COALESCE("receitaTotal", 0)) as receita_total
  FROM capcar GROUP BY quinzena, filial
),
op AS (
  SELECT quinzena, filial,
         SUM(COALESCE(entregues, 0)) as total_entregues,
         SUM(COALESCE(saldo, 0)) as total_saldo
  FROM operacional GROUP BY quinzena, filial
),
bases AS (
  SELECT quinzena, filial FROM fat
  UNION
  SELECT quinzena, filial FROM pen
  UNION
  SELECT quinzena, filial FROM cap
  UNION
  SELECT quinzena, filial FROM op
)
SELECT 
  b.quinzena, 
  b.filial,
  COALESCE(f.total_faturamento, 0) as faturamento_base,
  COALESCE(f.total_faturamento_paradas, 0) as faturamento_paradas,
  (COALESCE(f.total_faturamento, 0) + COALESCE(f.total_faturamento_paradas, 0)) as faturamento_total,
  COALESCE(p.total_penalidades, 0) as penalidades,
  COALESCE(c.total_pago, 0) as custo_capcar_pago,
  COALESCE(c.total_devido, 0) as custo_capcar_devido,
  COALESCE(c.receita_total, 0) as receita_capcar,
  COALESCE(o.total_entregues, 0) as pacotes_entregues,
  COALESCE(o.total_saldo, 0) as pacotes_saldo
FROM bases b
LEFT JOIN fat f ON b.quinzena = f.quinzena AND b.filial = f.filial
LEFT JOIN pen p ON b.quinzena = p.quinzena AND b.filial = p.filial
LEFT JOIN cap c ON b.quinzena = c.quinzena AND b.filial = c.filial
LEFT JOIN op o ON b.quinzena = o.quinzena AND b.filial = o.filial;


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


-- 3. Adiciona Índices para acelerar a leitura do Front-End
CREATE UNIQUE INDEX idx_mv_dre_custo_leve ON view_dre_custo_leve(quinzena, filial);
CREATE UNIQUE INDEX idx_mv_gaps_operacionais ON view_gaps_operacionais_bsc(quinzena, filial, motorista);

-- 4. Função para atualizar as Materialized Views (o DataImporter vai chamar essa função)
CREATE OR REPLACE FUNCTION rpc_refresh_materialized_views()
RETURNS void AS $$
BEGIN
  -- Aumenta o tempo de timeout local da transação (para garantir)
  SET LOCAL statement_timeout = '60s';
  
  -- Atualiza as views materializadas sem CONCURRENTLY (muito mais rápido e evita timeout)
  REFRESH MATERIALIZED VIEW view_dre_custo_leve;
  REFRESH MATERIALIZED VIEW view_gaps_operacionais_bsc;
END;
$$ LANGUAGE plpgsql;

-- 5. Permissões de Leitura
GRANT SELECT ON view_dre_custo_leve TO anon, authenticated;
GRANT SELECT ON view_gaps_operacionais_bsc TO anon, authenticated;
