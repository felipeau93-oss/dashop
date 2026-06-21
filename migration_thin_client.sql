-- ==========================================
-- FASE A: OTIMIZAÇÃO DE BANCO (ÍNDICES)
-- ==========================================

-- Índices em Operacional
CREATE INDEX IF NOT EXISTS idx_operacional_quinzena ON operacional(quinzena);
CREATE INDEX IF NOT EXISTS idx_operacional_filial ON operacional(filial);
CREATE INDEX IF NOT EXISTS idx_operacional_id_rota ON operacional(id_rota);
CREATE INDEX IF NOT EXISTS idx_operacional_driver_id ON operacional(driver_id);

-- Índices em Faturamento
CREATE INDEX IF NOT EXISTS idx_faturamento_quinzena ON faturamento(quinzena);
CREATE INDEX IF NOT EXISTS idx_faturamento_filial ON faturamento(filial);
CREATE INDEX IF NOT EXISTS idx_faturamento_id_rota ON faturamento(id_rota);

-- Índices em Penalidades
CREATE INDEX IF NOT EXISTS idx_penalidades_quinzena ON penalidades(quinzena);
CREATE INDEX IF NOT EXISTS idx_penalidades_filial ON penalidades(filial);
CREATE INDEX IF NOT EXISTS idx_penalidades_id_rota ON penalidades(id_rota);

-- Índices em Capcar
CREATE INDEX IF NOT EXISTS idx_capcar_quinzena ON capcar(quinzena);
CREATE INDEX IF NOT EXISTS idx_capcar_filial ON capcar(filial);

-- Índices em BSC
CREATE INDEX IF NOT EXISTS idx_bsc_quinzena ON bsc(quinzena);
CREATE INDEX IF NOT EXISTS idx_bsc_filial ON bsc(filial);
CREATE INDEX IF NOT EXISTS idx_bsc_driver_id ON bsc(driver_id);

-- Índices em Rotas Pendentes
CREATE INDEX IF NOT EXISTS idx_rotas_pendentes_id_rota ON rotas_pendentes(id_rota);

-- ==========================================
-- FASE B: SQL VIEWS (SUBSTITUIÇÃO DE PROCVs)
-- ==========================================

-- 1. View Consolidada de DRE Custo Leve (Agrupado por Quinzena e Filial)
CREATE OR REPLACE VIEW view_dre_custo_leve AS
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

-- 2. View: Gaps Operacionais e Comparativo BSC (Agrupado por Quinzena, Filial e Motorista)
CREATE OR REPLACE VIEW view_gaps_operacionais_bsc AS
WITH pen_op AS (
  -- Cruza penalidades com operacional para obter motorista
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
         SUM(COALESCE(valor, 0)) as total_desconto_penalidades
  FROM pen_op
  WHERE motorista IS NOT NULL AND motorista != 'N/A'
  GROUP BY quinzena, filial, motorista
),
bsc_agg AS (
  SELECT quinzena, filial, motorista, 
         SUM(COALESCE(entregues, 0)) as pacotes_entregues,
         SUM(COALESCE(saldo, 0)) as pacotes_saldo,
         CASE WHEN SUM(COALESCE(entregues, 0) + COALESCE(saldo, 0)) > 0 
              THEN ROUND((SUM(COALESCE(entregues, 0)) / SUM(COALESCE(entregues, 0) + COALESCE(saldo, 0))) * 100, 2)
              ELSE 0 END as nota_bsc
  FROM bsc
  WHERE motorista IS NOT NULL AND motorista != 'N/A'
  GROUP BY quinzena, filial, motorista
)
SELECT 
  COALESCE(p.quinzena, b.quinzena) as quinzena,
  COALESCE(p.filial, b.filial) as filial,
  COALESCE(p.motorista, b.motorista) as motorista,
  COALESCE(p.qtd_not_visited, 0) as qtd_not_visited,
  COALESCE(p.qtd_pnr, 0) as qtd_pnr,
  COALESCE(p.qtd_lost, 0) as qtd_lost,
  COALESCE(p.total_desconto_penalidades, 0) as total_desconto_penalidades,
  COALESCE(b.pacotes_entregues, 0) as pacotes_entregues,
  COALESCE(b.pacotes_saldo, 0) as pacotes_saldo,
  COALESCE(b.nota_bsc, 0) as nota_bsc
FROM pen_agg p
FULL OUTER JOIN bsc_agg b 
  ON p.quinzena = b.quinzena AND p.filial = b.filial AND p.motorista = b.motorista;

-- ==========================================
-- FASE C: TRIGGER PARA RESOLUÇÃO DE ROTAS PENDENTES
-- ==========================================

-- Trigger Function para consolidar rotas órfãs automaticamente no banco
CREATE OR REPLACE FUNCTION trg_resolve_rotas_pendentes() 
RETURNS TRIGGER AS $$
BEGIN
  -- 1. Atualizar Faturamento onde a rota era N/A
  UPDATE faturamento 
  SET filial = NEW.filial, 
      regional = NEW.regional, 
      supervisor = NEW.supervisor,
      motorista = NEW.motorista
  WHERE id_rota = NEW.id_rota AND filial = 'N/A';

  -- 2. Atualizar Penalidades onde a rota era N/A
  UPDATE penalidades 
  SET filial = NEW.filial, 
      regional = NEW.regional, 
      supervisor = NEW.supervisor
  WHERE id_rota = NEW.id_rota AND filial = 'N/A';

  -- 3. Remover a rota da tabela de pendentes, pois já foi resolvida
  DELETE FROM rotas_pendentes WHERE id_rota = NEW.id_rota;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Remove o trigger se existir para recriar
DROP TRIGGER IF EXISTS trigger_resolve_rotas_pendentes_on_insert ON operacional;

-- Associa o Trigger a cada nova inserção na tabela Operacional
CREATE TRIGGER trigger_resolve_rotas_pendentes_on_insert
AFTER INSERT ON operacional
FOR EACH ROW
EXECUTE FUNCTION trg_resolve_rotas_pendentes();

-- ==========================================
-- FASE C (CONT.): RPCS (DATABASE FUNCTIONS)
-- ==========================================

-- RPC: Margem de Contribuição Rápida
CREATE OR REPLACE FUNCTION rpc_calcular_margem_contribuicao(p_quinzena TEXT, p_filial TEXT DEFAULT NULL)
RETURNS TABLE (
  quinzena TEXT,
  filial TEXT,
  faturamento_total NUMERIC,
  custo_operacional NUMERIC,
  margem NUMERIC,
  margem_percentual NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    v.quinzena,
    v.filial,
    v.faturamento_total,
    v.custo_capcar_pago as custo_operacional,
    (v.faturamento_total - v.custo_capcar_pago) as margem,
    CASE 
      WHEN v.faturamento_total > 0 THEN ROUND(((v.faturamento_total - v.custo_capcar_pago) / v.faturamento_total * 100), 2)
      ELSE 0
    END as margem_percentual
  FROM view_dre_custo_leve v
  WHERE (p_quinzena IS NULL OR v.quinzena = p_quinzena)
    AND (p_filial IS NULL OR v.filial = p_filial);
END;
$$ LANGUAGE plpgsql;

-- RPC: Evolução de Penalidades e Gaps por Quinzena
CREATE OR REPLACE FUNCTION rpc_evolucao_gaps(p_filial TEXT DEFAULT NULL)
RETURNS TABLE (
  quinzena TEXT,
  total_descontos NUMERIC,
  qtd_not_visited BIGINT,
  qtd_pnr BIGINT,
  qtd_lost BIGINT,
  media_bsc NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    v.quinzena,
    SUM(v.total_desconto_penalidades) as total_descontos,
    SUM(v.qtd_not_visited) as qtd_not_visited,
    SUM(v.qtd_pnr) as qtd_pnr,
    SUM(v.qtd_lost) as qtd_lost,
    AVG(v.nota_bsc) as media_bsc
  FROM view_gaps_operacionais_bsc v
  WHERE (p_filial IS NULL OR v.filial = p_filial)
  GROUP BY v.quinzena
  ORDER BY v.quinzena;
END;
$$ LANGUAGE plpgsql;

-- RPC: Calcular Streaks (Inatividade)
-- Identifica quantos dias o motorista ficou sem viagens com base nas quinzenas trabalhadas
CREATE OR REPLACE FUNCTION rpc_calcular_streaks_frota(p_quinzena TEXT)
RETURNS TABLE (
  driver_id TEXT,
  motorista TEXT,
  filial TEXT,
  viagens_na_quinzena BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    o.driver_id,
    MAX(o.motorista) as motorista,
    o.filial,
    COUNT(DISTINCT o.id_rota) as viagens_na_quinzena
  FROM operacional o
  WHERE o.quinzena = p_quinzena AND o.driver_id IS NOT NULL AND o.driver_id != ''
  GROUP BY o.driver_id, o.filial;
END;
$$ LANGUAGE plpgsql;

-- RPC: Sincronizar Faturamento com Operacional
-- Caso o faturamento seja importado com filiais em 'N/A', essa RPC cruza com o operacional e corrige as pendências
CREATE OR REPLACE FUNCTION rpc_sincronizar_faturamento_operacional(p_quinzena TEXT)
RETURNS void AS $$
BEGIN
  -- Atualiza Faturamento (Case Insensitive e Trim)
  UPDATE faturamento f
  SET filial = o.filial,
      regional = o.regional,
      supervisor = o.supervisor
  FROM (
    SELECT DISTINCT id_rota, filial, regional, supervisor 
    FROM operacional
  ) o
  WHERE UPPER(TRIM(f.id_rota)) = UPPER(TRIM(o.id_rota))
    AND f.quinzena = p_quinzena
    AND f.filial = 'N/A';

  -- Atualiza Penalidades (Case Insensitive e Trim)
  UPDATE penalidades p
  SET filial = o.filial,
      regional = o.regional,
      supervisor = o.supervisor
  FROM (
    SELECT DISTINCT id_rota, filial, regional, supervisor 
    FROM operacional
  ) o
  WHERE UPPER(TRIM(p.id_rota)) = UPPER(TRIM(o.id_rota))
    AND p.quinzena = p_quinzena
    AND p.filial = 'N/A';
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- FASE E: PERMISSÕES DE ACESSO (GRANT)
-- ==========================================
-- Essencial para que o App.jsx (via supabase-js anon key) possa baixar os dados das views!
GRANT SELECT ON view_dre_custo_leve TO anon, authenticated;
GRANT SELECT ON view_gaps_operacionais_bsc TO anon, authenticated;
