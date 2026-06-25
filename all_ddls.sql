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

-- Habilitando permissÃµes
ALTER TABLE importacoes_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE rotas_pendentes DISABLE ROW LEVEL SECURITY;
ALTER TABLE rotas_ignoradas DISABLE ROW LEVEL SECURITY;
ALTER TABLE operacional DISABLE ROW LEVEL SECURITY;
ALTER TABLE faturamento DISABLE ROW LEVEL SECURITY;
ALTER TABLE penalidades DISABLE ROW LEVEL SECURITY;
ALTER TABLE capcar DISABLE ROW LEVEL SECURITY;
ALTER TABLE bsc DISABLE ROW LEVEL SECURITY;
-- 1. Tabela de HistÃ³rico de ImportaÃ§Ãµes
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

-- Liberar acesso anÃ´nimo (pois estamos sem login ainda)
ALTER TABLE importacoes_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE rotas_pendentes DISABLE ROW LEVEL SECURITY;

GRANT ALL PRIVILEGES ON TABLE importacoes_history TO anon, authenticated;
GRANT ALL PRIVILEGES ON TABLE rotas_pendentes TO anon, authenticated;
-- Migration: Create user_roles table for RBAC with Registration Requests in DashOp
-- Execute este script no Supabase SQL Editor.

-- 1. Cria a tabela (caso nÃ£o exista) com todas as colunas
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email text UNIQUE NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'importer', 'operacao', 'pending')),
  nome text,
  telefone text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Se a tabela jÃ¡ existia antes com a constraint antiga, nÃ³s a removemos e atualizamos as colunas
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_role_check;
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_role_check CHECK (role IN ('admin', 'importer', 'operacao', 'pending'));
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS nome text;
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS telefone text;

-- 2. Habilita Row Level Security (RLS)
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. Removemos as polÃ­ticas antigas (caso vocÃª re-rode o script)
DROP POLICY IF EXISTS "Users can view their own role" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can request access" ON public.user_roles;

-- 4. FunÃ§Ã£o Segura (Bypassa RLS temporariamente) para verificar se o usuÃ¡rio atual Ã© admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE lower(email) = lower(auth.email()) AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Recria as PolÃ­ticas
-- Policy: UsuÃ¡rios podem ler sua prÃ³pria role
CREATE POLICY "Users can view their own role" 
ON public.user_roles FOR SELECT 
USING (lower(auth.email()) = lower(email));

-- Policy: Admins podem ler todas as roles
CREATE POLICY "Admins can view all roles" 
ON public.user_roles FOR SELECT 
USING (public.is_admin());

-- Policy: Admins podem inserir roles diretamente
CREATE POLICY "Admins can insert roles" 
ON public.user_roles FOR INSERT 
WITH CHECK (public.is_admin());

-- Policy: Admins podem atualizar roles
CREATE POLICY "Admins can update roles" 
ON public.user_roles FOR UPDATE 
USING (public.is_admin());

-- Policy: Admins podem deletar roles
CREATE POLICY "Admins can delete roles" 
ON public.user_roles FOR DELETE 
USING (public.is_admin());

-- Policy: Qualquer pessoa (mesmo sem estar logada, jÃ¡ que o email ainda precisa de confirmaÃ§Ã£o) pode enviar um request 'pending'
CREATE POLICY "Users can request access"
ON public.user_roles FOR INSERT 
WITH CHECK (role = 'pending');

-- 5. INSERIR UM ADMIN INICIAL (Para garantir que vocÃª tenha acesso)
-- Substitua pelo seu email da Resend ou o seu email real do projeto!
INSERT INTO public.user_roles (email, role, nome) 
VALUES ('felipe.augusto@espindolalog.com', 'admin', 'Felipe Augusto')
ON CONFLICT (email) DO NOTHING;
-- Migration: Create tables for Treinamentos and Simulacoes to replace Firebase
-- Executar no Supabase SQL Editor

-- 1. Tabela de Treinamentos (Usada pelo Painel de Treinamentos para armazenar dados flexÃ­veis)
CREATE TABLE IF NOT EXISTS public.treinamentos (
  id text PRIMARY KEY, -- ex: 'motoristas_manuais_treinamentos', 'treinamentos_base_data_2023-10-10'
  type text NOT NULL, -- ex: 'config', 'historico'
  data jsonb,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.treinamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all authenticated users" ON public.treinamentos FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Enable insert access for all authenticated users" ON public.treinamentos FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update access for all authenticated users" ON public.treinamentos FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Enable delete access for all authenticated users" ON public.treinamentos FOR DELETE USING (auth.role() = 'authenticated');


-- 2. Tabela de SimulaÃ§Ãµes (Para Simulador, DreViabilidade e DreCustoLeve)
CREATE TABLE IF NOT EXISTS public.simulacoes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  date text NOT NULL,
  name text NOT NULL,
  type text NOT NULL, -- 'viabilidade', 'custo_leve', 'simulador'
  data jsonb, -- Campos genÃ©ricos ou array de analyses
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.simulacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all authenticated users" ON public.simulacoes FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Enable insert access for all authenticated users" ON public.simulacoes FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update access for all authenticated users" ON public.simulacoes FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Enable delete access for all authenticated users" ON public.simulacoes FOR DELETE USING (auth.role() = 'authenticated');
-- ==========================================
-- SCRIPT DE OTIMIZAÃ‡ÃƒO: MATERIALIZED VIEWS
-- ==========================================

-- 1. Removemos as views antigas independentemente do seu tipo atual
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_matviews WHERE matviewname = 'view_dre_custo_leve') THEN
        DROP MATERIALIZED VIEW view_dre_custo_leve CASCADE;
    ELSIF EXISTS (SELECT 1 FROM pg_views WHERE viewname = 'view_dre_custo_leve') THEN
        DROP VIEW view_dre_custo_leve CASCADE;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_matviews WHERE matviewname = 'view_gaps_operacionais_bsc') THEN
        DROP MATERIALIZED VIEW view_gaps_operacionais_bsc CASCADE;
    ELSIF EXISTS (SELECT 1 FROM pg_views WHERE viewname = 'view_gaps_operacionais_bsc') THEN
        DROP VIEW view_gaps_operacionais_bsc CASCADE;
    END IF;
END $$;
-- 2. Criamos Materialized Views (Os dados sÃ£o calculados uma vez e salvos no disco = 1000x mais rÃ¡pido)
CREATE MATERIALIZED VIEW view_dre_custo_leve AS
WITH fat AS (
  SELECT quinzena, filial, 
         SUM(COALESCE(faturamento, 0)) as total_faturamento,
         SUM(COALESCE(faturamento_paradas, 0)) as total_faturamento_paradas
  FROM faturamento GROUP BY quinzena, filial
),
pen AS (
  SELECT quinzena, filial,
         SUM(COALESCE(valor, 0)) as total_penalidades
  FROM penalidades GROUP BY quinzena, filial
),
cap AS (
  SELECT quinzena, filial,
         SUM(COALESCE("valorPago", 0)) as total_pago,
         SUM(COALESCE("valorDevido", 0)) as total_devido,
         SUM(COALESCE("receitaTotal", 0)) as receita_total
  FROM capcar GROUP BY quinzena, filial
),
op AS (
  SELECT quinzena, filial,
         SUM(COALESCE(entregues, 0)) as total_entregues,
         SUM(COALESCE(saldo, 0)) as total_saldo
  FROM operacional GROUP BY quinzena, filial
),
bases AS (
  SELECT quinzena, filial FROM fat
  UNION
  SELECT quinzena, filial FROM pen
  UNION
  SELECT quinzena, filial FROM cap
  UNION
  SELECT quinzena, filial FROM op
)
SELECT 
  b.quinzena, 
  b.filial,
  COALESCE(f.total_faturamento, 0) as faturamento_base,
  COALESCE(f.total_faturamento_paradas, 0) as faturamento_paradas,
  (COALESCE(f.total_faturamento, 0) + COALESCE(f.total_faturamento_paradas, 0)) as faturamento_total,
  COALESCE(p.total_penalidades, 0) as penalidades,
  COALESCE(c.total_pago, 0) as custo_capcar_pago,
  COALESCE(c.total_devido, 0) as custo_capcar_devido,
  COALESCE(c.receita_total, 0) as receita_capcar,
  COALESCE(o.total_entregues, 0) as pacotes_entregues,
  COALESCE(o.total_saldo, 0) as pacotes_saldo
FROM bases b
LEFT JOIN fat f ON b.quinzena = f.quinzena AND b.filial = f.filial
LEFT JOIN pen p ON b.quinzena = p.quinzena AND b.filial = p.filial
LEFT JOIN cap c ON b.quinzena = c.quinzena AND b.filial = c.filial
LEFT JOIN op o ON b.quinzena = o.quinzena AND b.filial = o.filial;


CREATE MATERIALIZED VIEW view_gaps_operacionais_bsc AS
WITH pen_op AS (
  SELECT p.quinzena, p.filial, o.motorista, p.tipo, p.valor
  FROM penalidades p
  LEFT JOIN (
    SELECT DISTINCT id_rota, motorista FROM operacional
  ) o ON p.id_rota = o.id_rota
),
pen_agg AS (
  SELECT quinzena, filial, motorista,
         SUM(CASE WHEN tipo ILIKE '%Not Visited%' THEN 1 ELSE 0 END) as qtd_not_visited,
         SUM(CASE WHEN tipo ILIKE '%PNR%' THEN 1 ELSE 0 END) as qtd_pnr,
         SUM(CASE WHEN tipo ILIKE '%Lost%' THEN 1 ELSE 0 END) as qtd_lost,
         SUM(CASE WHEN tipo ILIKE '%Not Visited%' THEN COALESCE(valor, 0) ELSE 0 END) as valor_not_visited,
         SUM(CASE WHEN tipo ILIKE '%PNR%' THEN COALESCE(valor, 0) ELSE 0 END) as valor_pnr,
         SUM(CASE WHEN tipo ILIKE '%Lost%' THEN COALESCE(valor, 0) ELSE 0 END) as valor_lost,
         SUM(CASE WHEN tipo NOT ILIKE '%Not Visited%' AND tipo NOT ILIKE '%PNR%' AND tipo NOT ILIKE '%Lost%' THEN COALESCE(valor, 0) ELSE 0 END) as valor_outros,
         SUM(COALESCE(valor, 0)) as total_desconto_penalidades
  FROM pen_op
  WHERE motorista IS NOT NULL AND motorista != 'N/A'
  GROUP BY quinzena, filial, motorista
),
bsc_agg AS (
  SELECT quinzena, filial, motorista, 
         SUM(COALESCE(entregues, 0)) as pacotes_entregues,
         SUM(COALESCE(saldo, 0)) as pacotes_saldo,
         CASE WHEN SUM(COALESCE(entregues, 0) + COALESCE(saldo, 0)) > 0 
              THEN ROUND((SUM(COALESCE(entregues, 0)) / SUM(COALESCE(entregues, 0) + COALESCE(saldo, 0))) * 100, 2)
              ELSE 0 END as nota_bsc
  FROM operacional
  WHERE motorista IS NOT NULL AND motorista != 'N/A'
  GROUP BY quinzena, filial, motorista
)
SELECT 
  COALESCE(p.quinzena, b.quinzena) as quinzena,
  COALESCE(p.filial, b.filial) as filial,
  COALESCE(p.motorista, b.motorista) as motorista,
  COALESCE(p.qtd_not_visited, 0) as qtd_not_visited,
  COALESCE(p.qtd_pnr, 0) as qtd_pnr,
  COALESCE(p.qtd_lost, 0) as qtd_lost,
  COALESCE(p.valor_not_visited, 0) as valor_not_visited,
  COALESCE(p.valor_pnr, 0) as valor_pnr,
  COALESCE(p.valor_lost, 0) as valor_lost,
  COALESCE(p.valor_outros, 0) as valor_outros,
  COALESCE(p.total_desconto_penalidades, 0) as total_desconto_penalidades,
  COALESCE(b.pacotes_entregues, 0) as pacotes_entregues,
  COALESCE(b.pacotes_saldo, 0) as pacotes_saldo,
  COALESCE(b.nota_bsc, 0) as nota_bsc
FROM pen_agg p
FULL OUTER JOIN bsc_agg b 
  ON p.quinzena = b.quinzena AND p.filial = b.filial AND p.motorista = b.motorista;


-- 3. Adiciona Ãndices para acelerar a leitura do Front-End
CREATE UNIQUE INDEX idx_mv_dre_custo_leve ON view_dre_custo_leve(quinzena, filial);
CREATE UNIQUE INDEX idx_mv_gaps_operacionais ON view_gaps_operacionais_bsc(quinzena, filial, motorista);

-- 4. FunÃ§Ã£o para atualizar as Materialized Views (o DataImporter vai chamar essa funÃ§Ã£o)
CREATE OR REPLACE FUNCTION rpc_refresh_materialized_views()
RETURNS void AS $$
BEGIN
  -- Atualiza de forma concorrente para nÃ£o travar leituras simultÃ¢neas
  REFRESH MATERIALIZED VIEW CONCURRENTLY view_dre_custo_leve;
  REFRESH MATERIALIZED VIEW CONCURRENTLY view_gaps_operacionais_bsc;
END;
$$ LANGUAGE plpgsql;

-- 5. PermissÃµes de Leitura
GRANT SELECT ON view_dre_custo_leve TO anon, authenticated;
GRANT SELECT ON view_gaps_operacionais_bsc TO anon, authenticated;
