-- Migration: Fix Infinite Recursion in user_roles policies
-- Execute este script no Supabase SQL Editor.

-- 1. Remover as políticas antigas de SELECT que causam o loop infinito
DROP POLICY IF EXISTS "Users can view their own role" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;

-- 2. Criar uma política unificada e segura para SELECT
-- Isso permite que usuários autenticados vejam a lista, quebrando o ciclo de recursão do PostgreSQL,
-- mantendo a segurança nas operações de inserção, atualização e exclusão.
CREATE POLICY "Enable read access for authenticated users" 
ON public.user_roles FOR SELECT 
USING (auth.role() = 'authenticated');
