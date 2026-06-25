-- Migration: Create tables for Treinamentos and Simulacoes to replace Firebase
-- Executar no Supabase SQL Editor

-- 1. Tabela de Treinamentos (Usada pelo Painel de Treinamentos para armazenar dados flexíveis)
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


-- 2. Tabela de Simulações (Para Simulador, DreViabilidade e DreCustoLeve)
CREATE TABLE IF NOT EXISTS public.simulacoes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  date text NOT NULL,
  name text NOT NULL,
  type text NOT NULL, -- 'viabilidade', 'custo_leve', 'simulador'
  data jsonb, -- Campos genéricos ou array de analyses
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.simulacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all authenticated users" ON public.simulacoes FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Enable insert access for all authenticated users" ON public.simulacoes FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update access for all authenticated users" ON public.simulacoes FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Enable delete access for all authenticated users" ON public.simulacoes FOR DELETE USING (auth.role() = 'authenticated');
