-- Adiciona coluna para forçar a troca de senha no primeiro login
ALTER TABLE user_roles ADD COLUMN IF NOT EXISTS needs_password_change BOOLEAN DEFAULT false;
