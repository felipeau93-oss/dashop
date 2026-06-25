CREATE OR REPLACE FUNCTION rpc_refresh_materialized_views()
RETURNS void AS $$
BEGIN
  SET LOCAL statement_timeout = '5min';
  REFRESH MATERIALIZED VIEW view_gaps_operacionais_bsc;
  REFRESH MATERIALIZED VIEW view_motorista_agregado;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REFRESH MATERIALIZED VIEW view_gaps_operacionais_bsc;
REFRESH MATERIALIZED VIEW view_motorista_agregado;
