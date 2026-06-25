-- Migration para adicionar a RPC get_detalhes_penalidades_filial
-- Essa função busca os detalhes pacote a pacote cruzando com a tabela operacional para obter o motorista ofensor
DROP FUNCTION IF EXISTS get_detalhes_penalidades_filial(text);

-- Migration para adicionar a RPC get_detalhes_penalidades_filial
DROP FUNCTION IF EXISTS get_detalhes_penalidades_filial(text);

CREATE OR REPLACE FUNCTION get_detalhes_penalidades_filial(p_filial text)
RETURNS TABLE (
  id uuid,
  quinzena text,
  filial text,
  regional text,
  supervisor text,
  motorista text,
  tipo text,
  id_rota text,
  id_pacote text,
  valor double precision,
  qtd numeric
) AS $$
  SELECT 
    p.id,
    p.quinzena, 
    p.filial, 
    p.regional,
    p.supervisor,
    COALESCE(
      NULLIF(p.motorista, 'N/A'),
      NULLIF(p.motorista, ''), 
      NULLIF(p.dados_originais->>'Motorista', ''),
      NULLIF(p.dados_originais->>'motorista', ''),
      'N/A'
    ) as motorista,
    p.tipo, 
    p.id_rota, 
    CASE 
      WHEN p.id_pacote LIKE '%/%/%' THEN 
        COALESCE(
          NULLIF(substring(COALESCE(p.dados_originais->>'Descrição', p.dados_originais->>'Descricao', '') from '[^ ]+$'), ''), 
          '-'
        )
      ELSE COALESCE(p.id_pacote, '-')
    END as id_pacote, 
    p.valor::double precision,
    COALESCE((p.dados_originais->>'Quantidade')::numeric, p.qtd, 1) as qtd
  FROM penalidades p
  WHERE p.filial = p_filial;
$$ LANGUAGE sql;

GRANT EXECUTE ON FUNCTION get_detalhes_penalidades_filial TO anon, authenticated;
