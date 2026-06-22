-- 1. Limpar tabelas caso já existam (idempotência)
DROP TABLE IF EXISTS public.treinamentos_pendentes CASCADE;
DROP TABLE IF EXISTS public.treinamentos_historico CASCADE;
DROP TABLE IF EXISTS public.motoristas_manuais_treinamentos CASCADE;

-- 2. Tabela de Histórico de Uploads
CREATE TABLE IF NOT EXISTS public.treinamentos_historico (
    id VARCHAR(50) PRIMARY KEY, -- ex: '2026_06_22'
    data_atualizacao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    total_linhas INTEGER NOT NULL
);

ALTER TABLE public.treinamentos_historico ENABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE public.treinamentos_historico TO authenticated;
GRANT ALL ON TABLE public.treinamentos_historico TO service_role;

CREATE POLICY "Enable all for authenticated" ON public.treinamentos_historico FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 3. Tabela de Treinamentos Pendentes (dados da base de cada data)
CREATE TABLE IF NOT EXISTS public.treinamentos_pendentes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    id_historico VARCHAR(50) NOT NULL REFERENCES public.treinamentos_historico(id) ON DELETE CASCADE,
    driver_id VARCHAR(100) NOT NULL,
    curso VARCHAR(255) NOT NULL,
    ultima_rota_data VARCHAR(50),
    milla VARCHAR(50),
    status VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para melhorar a performance de busca por driver ou histórico
CREATE INDEX IF NOT EXISTS idx_treinamentos_pendentes_historico ON public.treinamentos_pendentes(id_historico);
CREATE INDEX IF NOT EXISTS idx_treinamentos_pendentes_driver ON public.treinamentos_pendentes(driver_id);

ALTER TABLE public.treinamentos_pendentes ENABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE public.treinamentos_pendentes TO authenticated;
GRANT ALL ON TABLE public.treinamentos_pendentes TO service_role;

CREATE POLICY "Enable all for authenticated" ON public.treinamentos_pendentes FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 4. Tabela de Motoristas Vinculados Manualmente
CREATE TABLE IF NOT EXISTS public.motoristas_manuais_treinamentos (
    driver_id VARCHAR(100) PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    filial VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.motoristas_manuais_treinamentos ENABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE public.motoristas_manuais_treinamentos TO authenticated;
GRANT ALL ON TABLE public.motoristas_manuais_treinamentos TO service_role;

CREATE POLICY "Enable all for authenticated" ON public.motoristas_manuais_treinamentos FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Opcional: deletar as entradas antigas da tabela 'treinamentos' para limpar, mas apenas se desejar.
-- DELETE FROM public.treinamentos WHERE id LIKE 'treinamentos_base_%' OR id = 'motoristas_manuais_treinamentos';
