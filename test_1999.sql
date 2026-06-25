SELECT quinzena, filial, motorista, valor, tipo, 'penalidades' as source 
FROM penalidades 
WHERE valor = 19.99 OR valor = -19.99
UNION ALL
SELECT quinzena, filial, motorista, valor, tipo, 'penalidades' as source 
FROM penalidades 
WHERE CAST(valor AS TEXT) LIKE '%19.99%'
LIMIT 10;
