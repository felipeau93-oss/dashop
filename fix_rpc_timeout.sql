-- ==========================================
-- SCRIPT PARA CORRIGIR TIMEOUT NAS MATERIALIZED VIEWS
-- ==========================================

-- A função original estava sofrendo timeout (estouro de limite de 15s) 
-- por causa do comando CONCURRENTLY que exige verificações complexas.
-- Removendo o CONCURRENTLY a atualização será praticamente instantânea.

CREATE OR REPLACE FUNCTION rpc_refresh_materialized_views()
RETURNS void AS $$
BEGIN
  -- Aumenta o tempo de timeout local da transação (para garantir)
  SET LOCAL statement_timeout = '60s';
  
  -- Atualiza as views materializadas sem CONCURRENTLY (muito mais rápido)
  REFRESH MATERIALIZED VIEW view_dre_custo_leve;
  REFRESH MATERIALIZED VIEW view_gaps_operacionais_bsc;
END;
$$ LANGUAGE plpgsql;

-- Opcional: Forçar a atualização imediatamente ao rodar este script
SELECT rpc_refresh_materialized_views();
