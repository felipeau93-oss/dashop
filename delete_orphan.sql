DELETE FROM penalidades WHERE filial = 'N/A' AND id_rota = '309694589';
DELETE FROM faturamento WHERE filial = 'N/A' AND id_rota = '309694589';
SELECT rpc_refresh_materialized_views();
