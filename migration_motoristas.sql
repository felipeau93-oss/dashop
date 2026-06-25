-- Criação da tabela de motoristas
CREATE TABLE IF NOT EXISTS public.motoristas (
    driver_id text PRIMARY KEY,
    nome text,
    cpf_cnpj text DEFAULT 'Pendente de atualização manual',
    placa text,
    dia_semana text,
    data_rota text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Habilitar RLS e Permissões
ALTER TABLE public.motoristas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON public.motoristas;
CREATE POLICY "Enable read access for all authenticated users" ON public.motoristas FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Enable insert access for all authenticated users" ON public.motoristas;
CREATE POLICY "Enable insert access for all authenticated users" ON public.motoristas FOR INSERT WITH CHECK (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Enable update access for all authenticated users" ON public.motoristas;
CREATE POLICY "Enable update access for all authenticated users" ON public.motoristas FOR UPDATE USING (auth.role() = 'authenticated');

GRANT ALL PRIVILEGES ON TABLE public.motoristas TO anon, authenticated;

-- Criação da Função do Gatilho
CREATE OR REPLACE FUNCTION rpc_upsert_motorista()
RETURNS trigger AS $$
DECLARE
  v_cpf text;
  v_placa text;
  v_dia text;
  v_data text;
BEGIN
  v_cpf := NULL;
  v_placa := NULL;
  v_dia := NULL;
  v_data := NULL;

  IF NEW.dados_originais IS NOT NULL THEN
    v_cpf := NEW.dados_originais->>'CPF/CNPJ';
    v_placa := NEW.dados_originais->>'Placa';
    v_dia := NEW.dados_originais->>'Dia';
    v_data := NEW.dados_originais->>'Data';
    
    IF v_cpf IS NULL THEN
        SELECT value INTO v_cpf FROM jsonb_each_text(NEW.dados_originais) WHERE key ILIKE '%cpf%' OR key ILIKE '%cnpj%' OR key ILIKE '%documento%' LIMIT 1;
    END IF;
    IF v_placa IS NULL THEN
        SELECT value INTO v_placa FROM jsonb_each_text(NEW.dados_originais) WHERE key ILIKE 'placa' LIMIT 1;
    END IF;
    IF v_dia IS NULL THEN
        SELECT value INTO v_dia FROM jsonb_each_text(NEW.dados_originais) WHERE key ILIKE 'dia' LIMIT 1;
    END IF;
    IF v_data IS NULL THEN
        SELECT value INTO v_data FROM jsonb_each_text(NEW.dados_originais) WHERE key ILIKE 'data' LIMIT 1;
    END IF;
  END IF;

  INSERT INTO public.motoristas (driver_id, nome, cpf_cnpj, placa, dia_semana, data_rota)
  VALUES (
    NEW.driver_id, 
    NEW.motorista, 
    COALESCE(NULLIF(v_cpf, ''), 'Pendente de atualização manual'),
    v_placa,
    v_dia,
    v_data
  )
  ON CONFLICT (driver_id) DO UPDATE 
  SET 
    nome = EXCLUDED.nome,
    cpf_cnpj = CASE WHEN EXCLUDED.cpf_cnpj != 'Pendente de atualização manual' AND EXCLUDED.cpf_cnpj IS NOT NULL THEN EXCLUDED.cpf_cnpj ELSE motoristas.cpf_cnpj END,
    placa = COALESCE(EXCLUDED.placa, motoristas.placa),
    dia_semana = COALESCE(EXCLUDED.dia_semana, motoristas.dia_semana),
    data_rota = COALESCE(EXCLUDED.data_rota, motoristas.data_rota),
    updated_at = timezone('utc'::text, now());

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criação do Gatilho
DROP TRIGGER IF EXISTS trg_upsert_motorista ON public.operacional;
CREATE TRIGGER trg_upsert_motorista
AFTER INSERT OR UPDATE ON public.operacional
FOR EACH ROW
WHEN (NEW.driver_id IS NOT NULL AND NEW.driver_id != '')
EXECUTE FUNCTION rpc_upsert_motorista();


-- Backfill: Preenchendo a tabela com todos os dados existentes
INSERT INTO public.motoristas (driver_id, nome, cpf_cnpj, placa, dia_semana, data_rota)
SELECT 
  driver_id,
  MAX(motorista) as nome,
  MAX(COALESCE(NULLIF(dados_originais->>'CPF/CNPJ', ''), 'Pendente de atualização manual')) as cpf_cnpj,
  MAX(dados_originais->>'Placa') as placa,
  MAX(dados_originais->>'Dia') as dia_semana,
  MAX(dados_originais->>'Data') as data_rota
FROM public.operacional
WHERE driver_id IS NOT NULL AND driver_id != ''
GROUP BY driver_id
ON CONFLICT (driver_id) DO UPDATE 
SET 
  nome = EXCLUDED.nome,
  cpf_cnpj = CASE WHEN EXCLUDED.cpf_cnpj != 'Pendente de atualização manual' AND EXCLUDED.cpf_cnpj IS NOT NULL THEN EXCLUDED.cpf_cnpj ELSE motoristas.cpf_cnpj END,
  placa = COALESCE(EXCLUDED.placa, motoristas.placa),
  dia_semana = COALESCE(EXCLUDED.dia_semana, motoristas.dia_semana),
  data_rota = COALESCE(EXCLUDED.data_rota, motoristas.data_rota),
  updated_at = timezone('utc'::text, now());

-- View: Detalhamento do motorista
DROP VIEW IF EXISTS view_motorista_detalhes CASCADE;
CREATE VIEW view_motorista_detalhes AS
WITH p_agg AS (
  SELECT id_rota, SUM(valor) as total_penalidades_valor, COUNT(*) as qtd_penalidades
  FROM public.penalidades
  GROUP BY id_rota
)
SELECT 
  o.driver_id,
  m.nome,
  m.cpf_cnpj,
  o.id_rota,
  o.quinzena,
  COALESCE(o.dados_originais->>'Data', m.data_rota) as data_rota,
  COALESCE(o.dados_originais->>'Dia', m.dia_semana) as dia_semana,
  COALESCE(o.dados_originais->>'Placa', m.placa) as placa,
  o.filial,
  o.entregues,
  o.saldo,
  COALESCE(p.total_penalidades_valor, 0) as valor_penalidades,
  COALESCE(p.qtd_penalidades, 0) as qtd_penalidades
FROM public.operacional o
LEFT JOIN public.motoristas m ON o.driver_id = m.driver_id
LEFT JOIN p_agg p ON o.id_rota = p.id_rota
WHERE o.driver_id IS NOT NULL AND o.driver_id != '';

GRANT SELECT ON view_motorista_detalhes TO anon, authenticated;
