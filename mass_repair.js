import { createClient } from '@supabase/supabase-js';
const s = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const { data: mapeamentoData } = await s.from('config_filiais').select('*');
  const mapeamentoFiliais = mapeamentoData || [];
  const validFiliais = mapeamentoFiliais.map(m => String(m.filial).trim()).filter(Boolean);
  const filterStr = validFiliais.length > 0 ? '(' + validFiliais.map(f => '"' + f + '"').join(',') + ')' : '()';

  const tabelasComFilial = ['operacional', 'faturamento', 'penalidades', 'capcar', 'custos', 'bsc'];

  let totalRepaired = 0;

  for (const table of tabelasComFilial) {
    console.log(`Verificando tabela ${table}...`);
    let hasMore = true;
    let offset = 0;
    while (hasMore) {
      const { data: orphans } = await s.from(table).select('id, id_rota, filial').not('filial', 'in', filterStr).range(offset, offset + 999);
      if (!orphans || orphans.length === 0) {
        hasMore = false;
        break;
      }
      
      console.log(`Encontrados ${orphans.length} órfãos na tabela ${table} (offset ${offset})`);
      
      const idsToRepair = orphans.map(d => String(d.id_rota).trim()).filter(Boolean);
      const uniqueIds = [...new Set(idsToRepair)];
      
      if (uniqueIds.length === 0) {
         offset += 1000;
         continue;
      }

      const mapRotaFilial = {};
      for (let i = 0; i < uniqueIds.length; i += 200) {
        const chunk = uniqueIds.slice(i, i + 200);
        const { data: opData } = await s.from('operacional').select('id_rota, filial, regional, supervisor').in('id_rota', chunk);
        if (opData) {
          opData.forEach(d => {
            if (d.filial && d.filial !== 'N/A') {
              let fKey = String(d.filial).trim().toUpperCase();
              let config = mapeamentoFiliais.find(m => String(m.filial).toUpperCase() === fKey);
              if (!config) {
                 config = mapeamentoFiliais.find(m => m.de_para && String(m.de_para).toUpperCase().split(',').map(s => s.trim()).includes(fKey));
              }
              if (config) {
                 mapRotaFilial[String(d.id_rota).trim()] = { filial: config.filial, regional: config.regional, supervisor: config.supervisor };
              } else {
                 mapRotaFilial[String(d.id_rota).trim()] = { filial: d.filial, regional: d.regional, supervisor: d.supervisor };
              }
            }
          });
        }
      }

      let repairedInBatch = 0;
      for (const item of orphans) {
        if (!item.id_rota) continue;
        const opMatch = mapRotaFilial[String(item.id_rota).trim()];
        if (opMatch && opMatch.filial !== item.filial) {
          await s.from(table).update({
            filial: opMatch.filial,
            regional: opMatch.regional,
            supervisor: opMatch.supervisor
          }).eq('id', item.id);
          repairedInBatch++;
          totalRepaired++;
        }
      }
      
      console.log(`Reparados ${repairedInBatch} na tabela ${table}.`);
      
      if (repairedInBatch === 0) {
         // Se não reparou nada, precisamos pular esses órfãos senão loop infinito
         offset += 1000;
      } else {
         // Se reparou, os reparados não serão mais órfãos, então não aumentamos o offset
         // offset = offset; 
      }
    }
  }
  
  console.log(`Processo finalizado. Total reparado: ${totalRepaired}`);
  if (totalRepaired > 0) {
     console.log('Atualizando materialized views...');
     await s.rpc('rpc_refresh_materialized_views');
     console.log('Atualização concluída!');
  }
}
run();
