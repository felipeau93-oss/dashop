-- Tabelas adicionais que faltaram no primeiro schema

CREATE TABLE IF NOT EXISTS rotas_pendentes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  id_rota text NOT NULL UNIQUE,
  data_identificacao timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS importacoes_history (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  nome_base text,
  data_importacao timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  total_linhas integer,
  quinzena text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE rotas_pendentes ENABLE ROW LEVEL SECURITY;
ALTER TABLE importacoes_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow ALL on rotas_pendentes" ON rotas_pendentes FOR ALL USING (true);
CREATE POLICY "Allow ALL on importacoes_history" ON importacoes_history FOR ALL USING (true);
