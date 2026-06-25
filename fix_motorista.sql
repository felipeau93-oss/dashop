UPDATE penalidades 
SET motorista = COALESCE(NULLIF(dados_originais->>'Motorista', ''), NULLIF(dados_originais->>'motorista', ''), 'N/A')
WHERE motorista IS NULL OR motorista = 'N/A' OR motorista = '';
