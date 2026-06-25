import { createClient } from '@supabase/supabase-js';
const s = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const tables = [
    'operacional',
    'faturamento',
    'penalidades',
    'capcar',
    'custos',
    'disponibilidade_frota',
    'bsc',
    'importacoes_history',
    'rotas_pendentes',
    'rotas_ignoradas'
  ];

  console.log('Iniciando limpeza total do banco de dados (mantendo configurações)...');
  
  for (const table of tables) {
    console.log(`Apagando dados da tabela: ${table}`);
    const { error } = await s.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) {
       console.error(`Erro ao apagar ${table}:`, error.message);
    } else {
       console.log(`Tabela ${table} limpa com sucesso.`);
    }
  }

  console.log('Atualizando materialized views...');
  await s.rpc('rpc_refresh_materialized_views');
  console.log('Limpeza finalizada com sucesso!');
}

run();
