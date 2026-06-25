-- 1. Força a atualização do cache da API para as tabelas voltarem a aparecer (Tira o Erro 404)
NOTIFY pgrst, 'reload schema';

-- 2. Cria as políticas de segurança para o Storage (Tira o Erro 400 do Bucket)
-- Isso permite que o sistema (usuários autenticados) grave arquivos no bucket 'dados_json'
DROP POLICY IF EXISTS "Enable all for authenticated users" ON storage.objects;

CREATE POLICY "Enable all for authenticated users" 
ON storage.objects FOR ALL 
TO authenticated 
USING (bucket_id = 'dados_json') 
WITH CHECK (bucket_id = 'dados_json');
