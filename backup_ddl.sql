-- Backup DDL Inferido das tabelas atuais do Supabase
-- Baseado no DataImporter.jsx e scripts do projeto

CREATE TABLE IF NOT EXISTS importacoes_history (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo text NOT NULL,
  quinzena text NOT NULL,
  qtd_registros integer DEFAULT 0,
  data_importacao timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS rotas_pendentes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  id_rota text NOT NULL UNIQUE,
  quinzena_origem text,
  data_identificacao timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  data_inicial text
);

CREATE TABLE IF NOT EXISTS rotas_ignoradas (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  id_rota text NOT NULL UNIQUE,
  data_ignorada timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS operacional (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  id_rota text,
  filial text,
  regional text,
  supervisor text,
  motorista text,
  saldo numeric DEFAULT 0,
  entregues numeric DEFAULT 0,
  "insucessosDetalhados" jsonb,
  quinzena text,
  driver_id text,
  motorista text,
  dados_originais jsonb,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS faturamento (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  id_rota text,
  faturamento numeric DEFAULT 0,
  faturamento_paradas numeric DEFAULT 0,
  dados_originais jsonb,
  filial text,
  regional text,
  supervisor text,
  motorista text,
  quinzena text,
  numero_fatura text,
  motorista text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS penalidades (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  id_rota text,
  id_pacote text,
  descricao text,
  tipo text,
  valor numeric DEFAULT 0,
  quinzena text,
  dados_originais jsonb,
  filial text,
  regional text,
  supervisor text,
  motorista text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS capcar (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  quinzena text,
  filial text,
  dia text,
  agregado text,
  ciclo text,
  categoria text,
  range text,
  "tarifaBase" numeric,
  "valorPago" numeric,
  "receitaBaseRecebido" numeric,
  "receitaBaseAReceber" numeric,
  "receitaParadas" numeric,
  "receitaTotal" numeric,
  "valorDevido" numeric,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS bsc (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  quinzena text,
  filial text,
  driver_id text,
  nota numeric,
  dados_originais jsonb,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Habilitando permissões
ALTER TABLE importacoes_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE rotas_pendentes DISABLE ROW LEVEL SECURITY;
ALTER TABLE rotas_ignoradas DISABLE ROW LEVEL SECURITY;
ALTER TABLE operacional DISABLE ROW LEVEL SECURITY;
ALTER TABLE faturamento DISABLE ROW LEVEL SECURITY;
ALTER TABLE penalidades DISABLE ROW LEVEL SECURITY;
ALTER TABLE capcar DISABLE ROW LEVEL SECURITY;
ALTER TABLE bsc DISABLE ROW LEVEL SECURITY;
