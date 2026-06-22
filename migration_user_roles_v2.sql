-- Migration: Create user_roles table for RBAC with Registration Requests in DashOp
-- Execute este script no Supabase SQL Editor.

-- 1. Cria a tabela (caso não exista) com todas as colunas
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email text UNIQUE NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'importer', 'operacao', 'pending')),
  nome text,
  telefone text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Se a tabela já existia antes com a constraint antiga, nós a removemos e atualizamos as colunas
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_role_check;
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_role_check CHECK (role IN ('admin', 'importer', 'operacao', 'pending'));
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS nome text;
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS telefone text;

-- 2. Habilita Row Level Security (RLS)
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. Removemos as políticas antigas (caso você re-rode o script)
DROP POLICY IF EXISTS "Users can view their own role" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can request access" ON public.user_roles;

-- 4. Função Segura (Bypassa RLS temporariamente) para verificar se o usuário atual é admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE lower(email) = lower(auth.email()) AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Recria as Políticas
-- Policy: Usuários podem ler sua própria role
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

-- Policy: Qualquer pessoa (mesmo sem estar logada, já que o email ainda precisa de confirmação) pode enviar um request 'pending'
CREATE POLICY "Users can request access"
ON public.user_roles FOR INSERT 
WITH CHECK (role = 'pending');

-- 5. INSERIR UM ADMIN INICIAL (Para garantir que você tenha acesso)
-- Substitua pelo seu email da Resend ou o seu email real do projeto!
INSERT INTO public.user_roles (email, role, nome) 
VALUES ('felipe.augusto@espindolalog.com', 'admin', 'Felipe Augusto')
ON CONFLICT (email) DO NOTHING;
