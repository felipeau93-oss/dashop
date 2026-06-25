-- Migration: Fix infinite loop in password update due to RLS
-- Executar este script no Supabase SQL Editor.

-- Criação de uma função segura (SECURITY DEFINER) para permitir que o próprio usuário
-- atualize a sua flag 'needs_password_change' para false, ignorando a restrição de RLS
-- que impede o usuário de dar UPDATE na tabela user_roles.
CREATE OR REPLACE FUNCTION public.clear_needs_password_change(p_email text)
RETURNS void AS $$
BEGIN
  -- Permite que a ação seja realizada se o usuário autenticado for o dono do email
  -- ou se o usuário autenticado for um administrador
  IF lower(auth.email()) = lower(p_email) OR public.is_admin() THEN
    UPDATE public.user_roles 
    SET needs_password_change = false 
    WHERE lower(email) = lower(p_email);
  ELSE
    RAISE EXCEPTION 'Acesso negado';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
