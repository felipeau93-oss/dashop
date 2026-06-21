const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'DataImporter.jsx');
let content = fs.readFileSync(filePath, 'utf-8');

// fetchPendentes
const pendentesRegex = /const fetchPendentes = async \(\) => {[\s\S]*?setIsLoadingPendentes\(false\);\s*\n\s*};/m;
content = content.replace(pendentesRegex, `const fetchPendentes = async () => {
    setIsLoadingPendentes(true);
    setSelectedPendentes(new Set());
    try {
      const { data, error } = await supabase.from('rotas_pendentes').select('*').order('data_identificacao', { ascending: false });
      if (error) throw error;
      setRotasPendentes(data || []);
    } catch(err) {
      console.error(err);
    } finally {
      setIsLoadingPendentes(false);
    }
  };`);

// deletePendente
const deleteRegex = /const deletePendente = async \(idRota\) => {[\s\S]*?addLog\(\`Erro ao excluir rota.*?`, 'error'\);\s*\n\s*}/m;
content = content.replace(deleteRegex, `const deletePendente = async (idRota) => {
    try {
      const { error } = await supabase.from('rotas_pendentes').delete().eq('id_rota', String(idRota));
      if (error) throw error;
      setRotasPendentes(prev => prev.filter(r => r.id_rota !== idRota));
      addLog(\`Rota pendente \${idRota} excluída com sucesso.\`, 'success');
    } catch (e) {
      console.error("Erro ao excluir rota pendente", e);
      addLog(\`Erro ao excluir rota: \${e.message}\`, 'error');
    }
  };`);

// ignorarRota
const ignorarRegex = /const ignorarRota = async \(idRota\) => {[\s\S]*?addLog\(\`Erro ao ignorar rota.*?`, 'error'\);\s*\n\s*}/m;
content = content.replace(ignorarRegex, `const ignorarRota = async (idRota) => {
    if(!window.confirm(\`Tem certeza que deseja ocultar a rota \${idRota} do financeiro para sempre?\`)) return;
    try {
      const { error: insertErr } = await supabase.from('rotas_ignoradas').insert([{ id_rota: idRota, data_ignorada: new Date().toISOString() }]);
      if (insertErr) throw insertErr;
      const { error: delErr } = await supabase.from('rotas_pendentes').delete().eq('id_rota', String(idRota));
      if (delErr) throw delErr;
      
      setRotasPendentes(prev => prev.filter(r => r.id_rota !== idRota));
      setSelectedPendentes(prev => { const next = new Set(prev); next.delete(idRota); return next; });
      addLog(\`Rota \${idRota} ocultada do financeiro com sucesso. Atualize a base para aplicar.\`, 'success');
    } catch (e) {
      console.error("Erro ao ignorar rota", e);
      addLog(\`Erro ao ignorar rota: \${e.message}\`, 'error');
    }
  };`);

// handleBulkIgnorar
const bulkIgnorarRegex = /const handleBulkIgnorar = async \(\) => {[\s\S]*?addLog\(\`Erro ao ignorar rotas.*?`, 'error'\);\s*\n\s*}/m;
content = content.replace(bulkIgnorarRegex, `const handleBulkIgnorar = async () => {
    if(selectedPendentes.size === 0) return;
    if(!window.confirm(\`Tem certeza que deseja ocultar \${selectedPendentes.size} rotas do financeiro para sempre?\`)) return;
    try {
      const ignoradas = Array.from(selectedPendentes).map(id => ({ id_rota: id, data_ignorada: new Date().toISOString() }));
      const { error: insErr } = await supabase.from('rotas_ignoradas').insert(ignoradas);
      if (insErr) throw insErr;
      
      for (const id of selectedPendentes) {
         await supabase.from('rotas_pendentes').delete().eq('id_rota', String(id));
      }
      
      setRotasPendentes(prev => prev.filter(r => !selectedPendentes.has(r.id_rota)));
      setSelectedPendentes(new Set());
      addLog(\`\${selectedPendentes.size} rotas ocultadas com sucesso.\`, 'success');
    } catch (e) {
      console.error("Erro ao ignorar rotas em massa", e);
      addLog(\`Erro ao ignorar rotas: \${e.message}\`, 'error');
    }
  };`);

// handleBulkDelete
const bulkDeleteRegex = /const handleBulkDelete = async \(\) => {[\s\S]*?addLog\(\`Erro ao excluir alertas em massa.*?`, 'error'\);\s*\n\s*}/m;
content = content.replace(bulkDeleteRegex, `const handleBulkDelete = async () => {
    if(selectedPendentes.size === 0) return;
    if(!window.confirm(\`Tem certeza que deseja excluir \${selectedPendentes.size} alertas (elas não serão ocultadas)?\`)) return;
    try {
      for (const id of selectedPendentes) {
        await supabase.from('rotas_pendentes').delete().eq('id_rota', String(id));
      }
      setRotasPendentes(prev => prev.filter(r => !selectedPendentes.has(r.id_rota)));
      setSelectedPendentes(new Set());
      addLog(\`\${selectedPendentes.size} alertas excluídos com sucesso.\`, 'success');
    } catch (e) {
      console.error("Erro ao excluir alertas em massa", e);
      addLog(\`Erro ao excluir alertas em massa: \${e.message}\`, 'error');
    }
  };`);

// fetchHistorico
const historicoRegex = /const fetchHistorico = async \(\) => {[\s\S]*?setIsLoadingHistory\(false\);\s*\n\s*};/m;
content = content.replace(historicoRegex, `const fetchHistorico = async () => {
    setIsLoadingHistory(true);
    try {
      const { data, error } = await supabase.from('importacoes_history').select('*').order('data_importacao', { ascending: false });
      if (error) throw error;
      setHistorico(data || []);
    } catch(err) {
      console.error(err);
    } finally {
      setIsLoadingHistory(false);
    }
  };`);

// registrarImportacao
const registrarRegex = /const registrarImportacao = async \(tipo, quinzena, totalLinhas\) => {[\s\S]*?console\.error\('Erro ao registrar importação', err\);\s*\n\s*};/m;
content = content.replace(registrarRegex, `const registrarImportacao = async (tipo, quinzena, totalLinhas) => {
    try {
      const historyEntry = {
        tipo,
        quinzena: quinzena || 'GERAL',
        qtd_registros: totalLinhas,
        data_importacao: new Date().toISOString()
      };
      await supabase.from('importacoes_history').insert([historyEntry]);
      await fetchHistorico();
    } catch(err) {
      console.error('Erro ao registrar importação', err);
    }
  };`);

// Fix pendentesSnapshot
content = content.replace(/const pendentesSnapshot = await getDocs\(collection\(db, getCollectionName\('rotas_pendentes_testes'\)\)\);[\s\n]*const pendentesAtuais = \[\];[\s\n]*pendentesSnapshot\.forEach\(d => pendentesAtuais\.push\(d\.data\(\)\)\);/g, `const { data: pendentesData } = await supabase.from('rotas_pendentes').select('*');
          const pendentesAtuais = pendentesData || [];`);

// Fix opPendentesBatch
const opPendentesBatchRegex = /const pendentesBatch = writeBatch\(db\);[\s\S]*?await pendentesBatch\.commit\(\);/g;
content = content.replace(opPendentesBatchRegex, `if (Array.from(rotasNaoEncontradas.keys()).length > 0) {
            const upsertData = Array.from(rotasNaoEncontradas.keys()).map(rota => ({
              id_rota: rota,
              data_identificacao: new Date().toISOString()
            }));
            await supabase.from('rotas_pendentes').upsert(upsertData, { onConflict: 'id_rota' });
          }`);

fs.writeFileSync(filePath, content, 'utf-8');
console.log('Rotas Pendentes e Historico migrados com sucesso!');
