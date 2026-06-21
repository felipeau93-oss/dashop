-- Migration: Create user_roles table for RBAC in DashOp
-- Execute this script in the Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email text UNIQUE NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'importer', 'operacao')),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can read their own role or any role if they are authenticated (for simplicity we let authenticated users read it).
-- We can lock it down so only admins can read all, and users can read their own.
CREATE POLICY "Users can view their own role" 
ON public.user_roles 
FOR SELECT 
USING (auth.email() = email);

-- Policy: Admins can view all roles
CREATE POLICY "Admins can view all roles" 
ON public.user_roles 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.email = auth.email() AND ur.role = 'admin'
  )
);

-- Policy: Admins can insert/update/delete roles
CREATE POLICY "Admins can insert roles" 
ON public.user_roles 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.email = auth.email() AND ur.role = 'admin'
  )
);

CREATE POLICY "Admins can update roles" 
ON public.user_roles 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.email = auth.email() AND ur.role = 'admin'
  )
);

CREATE POLICY "Admins can delete roles" 
ON public.user_roles 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.email = auth.email() AND ur.role = 'admin'
  )
);

-- INSERIR UM ADMIN INICIAL (Para que você não perca o acesso após criar a tabela)
-- Substitua pelo seu email se for diferente!
INSERT INTO public.user_roles (email, role) 
VALUES ('felipe.augusto@espindolalog.com', 'admin')
ON CONFLICT (email) DO NOTHING;
