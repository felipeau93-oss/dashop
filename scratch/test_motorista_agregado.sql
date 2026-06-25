DROP VIEW IF EXISTS view_motorista_agregado CASCADE;

CREATE MATERIALIZED VIEW view_motorista_agregado AS
SELECT 
    m.driver_id,
    MAX(m.nome) as nome,
    MAX(m.cpf_cnpj) as cpf_cnpj,
    string_agg(DISTINCT COALESCE(o.dados_originais->>'Placa', m.placa), ', ') as placas_vinculadas,
    COUNT(DISTINCT o.id_rota) as total_rotas,
    SUM(o.entregues) as entregues,
    SUM(o.saldo) as saldo,
    COALESCE(SUM(p_agg.total_penalidades_valor), 0) as valor_penalidades,
    COALESCE(SUM(p_agg.qtd_penalidades), 0) as qtd_penalidades
FROM motoristas m
LEFT JOIN operacional o ON o.driver_id = m.driver_id
LEFT JOIN (
    SELECT id_rota, SUM(valor) AS total_penalidades_valor, COUNT(*) AS qtd_penalidades
    FROM penalidades
    GROUP BY id_rota
) p_agg ON p_agg.id_rota = o.id_rota
GROUP BY m.driver_id;

CREATE UNIQUE INDEX idx_motorista_agregado_driver_id ON view_motorista_agregado(driver_id);

GRANT SELECT ON view_motorista_agregado TO anon, authenticated;

CREATE OR REPLACE FUNCTION rpc_refresh_materialized_views()
RETURNS void AS $$
BEGIN
  SET LOCAL statement_timeout = '60s';
  REFRESH MATERIALIZED VIEW view_gaps_operacionais_bsc;
  REFRESH MATERIALIZED VIEW view_motorista_agregado;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
