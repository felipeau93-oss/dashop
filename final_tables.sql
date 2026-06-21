-- 1. Tabela de Histórico de Importações
CREATE TABLE IF NOT EXISTS importacoes_history (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo text NOT NULL,
  quinzena text NOT NULL,
  qtd_registros integer DEFAULT 0,
  data_importacao timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Tabela de Rotas Pendentes
CREATE TABLE IF NOT EXISTS rotas_pendentes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  id_rota text NOT NULL UNIQUE,
  quinzena_origem text,
  data_identificacao timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  data_inicial text
);

-- Liberar acesso anônimo (pois estamos sem login ainda)
ALTER TABLE importacoes_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE rotas_pendentes DISABLE ROW LEVEL SECURITY;

GRANT ALL PRIVILEGES ON TABLE importacoes_history TO anon, authenticated;
GRANT ALL PRIVILEGES ON TABLE rotas_pendentes TO anon, authenticated;
