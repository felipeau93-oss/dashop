-- Migration: Update user_roles table for Registration Requests
-- Executar este script no Supabase SQL Editor.

-- 1. Alterar a constraint de role para permitir 'pending'
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_role_check;
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_role_check CHECK (role IN ('admin', 'importer', 'operacao', 'pending'));

-- 2. Adicionar colunas nome e telefone
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS nome text;
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS telefone text;

-- 3. Nova política: Qualquer usuário recém-autenticado pode inserir um pedido pendente
-- A verificação será baseada no e-mail do usuário autenticado e a role TEM que ser 'pending'
CREATE POLICY "Users can request access"
ON public.user_roles
FOR INSERT 
WITH CHECK (
  auth.email() = email AND role = 'pending'
);
