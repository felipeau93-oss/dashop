const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'DataImporter.jsx');
let content = fs.readFileSync(filePath, 'utf-8');

// 1. Substituir os imports do Firebase pelo Supabase
content = content.replace(
  "import { db, getCollectionName } from './firebase';",
  "import { supabase } from './supabase';"
);
content = content.replace(
  "import { collection, writeBatch, doc, setDoc, getDocs, query, where, deleteDoc } from 'firebase/firestore';",
  ""
);

// 2. Mapear nomes antigos de coleções para novas tabelas do Supabase
const mapTable = (firebaseName) => {
  if (firebaseName.includes('operacional')) return 'operacional';
  if (firebaseName.includes('faturamento')) return 'faturamento';
  if (firebaseName.includes('penalidades')) return 'penalidades';
  if (firebaseName.includes('bsc')) return 'bsc';
  if (firebaseName.includes('custos')) return 'custos';
  if (firebaseName.includes('rotas_pendentes')) return 'rotas_pendentes';
  if (firebaseName.includes('rotas_ignoradas')) return 'rotas_ignoradas';
  if (firebaseName.includes('importacoes_history')) return 'importacoes_history';
  return firebaseName.replace('_testes', '');
};

// 3. Substituir saveInBuckets por saveToSupabase
const saveInBucketsBlock = `const saveInBuckets = async (collectionName, quinzena, dataArray, setProgress) => {
    try {
      const q = quinzena || 'GERAL';
      setProgress(\`Apagando dados antigos da quinzena \${q}...\`);
      
      // Apagar dados antigos
      const colRef = collection(db, getCollectionName(collectionName));
      const qOld = query(colRef, where("quinzena", "==", q));
      const snapshot = await getDocs(qOld);
      
      const docs = snapshot.docs;
      for (let i = 0; i < docs.length; i += 400) {
        const chunk = docs.slice(i, i + 400);
        const deleteBatch = writeBatch(db);
        chunk.forEach(d => deleteBatch.delete(d.ref));
        await deleteBatch.commit();
      }

      // Salvar novos dados em buckets
      let savedCount = 0;
      for (let i = 0; i < dataArray.length; i += CHUNK_SIZE) {
        const chunk = dataArray.slice(i, i + CHUNK_SIZE);
        const batch = writeBatch(db);
        const docRef = doc(colRef);
        
        const cleanedChunk = cleanUndefined(chunk);
        batch.set(docRef, {
          quinzena: q,
          part: (i / CHUNK_SIZE) + 1,
          items: cleanedChunk
        });
        
        await batch.commit();
        savedCount += chunk.length;
        setProgress(\`Processando linhas \${savedCount} de \${dataArray.length}...\`);
      }
    } catch (err) {
      console.error(\`Erro em saveInBuckets (\${collectionName}):\`, err);
      throw err;
    }
  };`;

const saveToSupabaseBlock = `const saveToSupabase = async (tableName, quinzena, dataArray, setProgress) => {
    try {
      const q = quinzena || 'GERAL';
      setProgress(\`Apagando dados antigos da quinzena \${q}...\`);
      
      const { error: deleteError } = await supabase
        .from(tableName)
        .delete()
        .eq('quinzena', q);
        
      if (deleteError) throw deleteError;

      let savedCount = 0;
      const CHUNK_SIZE = 1000;
      
      for (let i = 0; i < dataArray.length; i += CHUNK_SIZE) {
        const chunk = dataArray.slice(i, i + CHUNK_SIZE);
        const cleanedChunk = chunk.map(cleanUndefined);
        
        const { error: insertError } = await supabase
          .from(tableName)
          .insert(cleanedChunk);
          
        if (insertError) throw insertError;
        
        savedCount += chunk.length;
        setProgress(\`Processando linhas \${savedCount} de \${dataArray.length}...\`);
      }
    } catch (err) {
      console.error(\`Erro em saveToSupabase (\${tableName}):\`, err);
      throw err;
    }
  };`;

content = content.replace(saveInBucketsBlock, saveToSupabaseBlock);

// Replace saveInBuckets calls
content = content.replace(/saveInBuckets\('operacional_testes'/g, "saveToSupabase('operacional'");
content = content.replace(/saveInBuckets\('faturamento_testes'/g, "saveToSupabase('faturamento'");
content = content.replace(/saveInBuckets\('penalidades_testes'/g, "saveToSupabase('penalidades'");
content = content.replace(/saveInBuckets\('operacional_bsc_testes'/g, "saveToSupabase('bsc'");
content = content.replace(/saveInBuckets\('custosFinanceiros_testes'/g, "saveToSupabase('custos'");

// 4. Refatorar fetchPendentes
const fetchPendentesBlock = `const fetchPendentes = async () => {
    setIsLoadingPendentes(true);
    setSelectedPendentes(new Set());
    try {
      const q = query(collection(db, getCollectionName('rotas_pendentes_testes')));
      const snapshot = await getDocs(q);
      const data = [];
      snapshot.forEach(d => data.push({ id: d.id, ...d.data() }));
      data.sort((a, b) => new Date(b.data_identificacao).getTime() - new Date(a.data_identificacao).getTime());
      setRotasPendentes(data);
    } catch(err) {
      console.error(err);
    } finally {
      setIsLoadingPendentes(false);
    }
  };`;

const newFetchPendentes = `const fetchPendentes = async () => {
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
  };`;
content = content.replace(fetchPendentesBlock, newFetchPendentes);

// 5. Refatorar fetchHistorico
const fetchHistoricoBlock = `const fetchHistorico = async () => {
    setIsLoadingHistory(true);
    try {
      const q = query(collection(db, getCollectionName('importacoes_history')));
      const snapshot = await getDocs(q);
      const data = [];
      snapshot.forEach(d => data.push({ id: d.id, ...d.data() }));
      data.sort((a, b) => new Date(b.data_importacao).getTime() - new Date(a.data_importacao).getTime());
      setHistorico(data);
    } catch(err) {
      console.error(err);
    } finally {
      setIsLoadingHistory(false);
    }
  };`;

const newFetchHistorico = `const fetchHistorico = async () => {
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
  };`;
content = content.replace(fetchHistoricoBlock, newFetchHistorico);

// 6. Fix logging history save
content = content.replace(
  /await setDoc\(doc\(collection\(db,\s*getCollectionName\('importacoes_history'\)\)\),\s*historyEntry\);/g,
  "await supabase.from('importacoes_history').insert([historyEntry]);"
);

// 7. Refactor deletePendente, ignorarRota, handleBulkIgnorar
const oldDeletePendente = `const deletePendente = async (idRota) => {
    try {
      await deleteDoc(doc(db, getCollectionName('rotas_pendentes_testes'), String(idRota)));
      setRotasPendentes(prev => prev.filter(r => r.id_rota !== idRota));
      addLog(\`Rota pendente \${idRota} excluída com sucesso.\`, 'success');
    } catch (e) {
      console.error("Erro ao excluir rota pendente", e);
      addLog(\`Erro ao excluir rota: \${e.message}\`, 'error');
    }
  };`;
const newDeletePendente = `const deletePendente = async (idRota) => {
    try {
      const { error } = await supabase.from('rotas_pendentes').delete().eq('id_rota', String(idRota));
      if (error) throw error;
      setRotasPendentes(prev => prev.filter(r => r.id_rota !== idRota));
      addLog(\`Rota pendente \${idRota} excluída com sucesso.\`, 'success');
    } catch (e) {
      console.error("Erro ao excluir rota pendente", e);
      addLog(\`Erro ao excluir rota: \${e.message}\`, 'error');
    }
  };`;
content = content.replace(oldDeletePendente, newDeletePendente);

const oldIgnorarRota = `const ignorarRota = async (idRota) => {
    if(!window.confirm(\`Tem certeza que deseja ocultar a rota \${idRota} do financeiro para sempre?\`)) return;
    try {
      await setDoc(doc(db, getCollectionName('rotas_ignoradas_testes'), String(idRota)), {
        id_rota: idRota,
        data_ignorada: new Date().toISOString()
      });
      await deleteDoc(doc(db, getCollectionName('rotas_pendentes_testes'), String(idRota)));
      setRotasPendentes(prev => prev.filter(r => r.id_rota !== idRota));
      setSelectedPendentes(prev => { const next = new Set(prev); next.delete(idRota); return next; });
      addLog(\`Rota \${idRota} ocultada do financeiro com sucesso. Atualize a base para aplicar.\`, 'success');
    } catch (e) {
      console.error("Erro ao ignorar rota", e);
      addLog(\`Erro ao ignorar rota: \${e.message}\`, 'error');
    }
  };`;
const newIgnorarRota = `const ignorarRota = async (idRota) => {
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
  };`;
content = content.replace(oldIgnorarRota, newIgnorarRota);

const oldHandleBulkIgnorar = `const handleBulkIgnorar = async () => {
    if(selectedPendentes.size === 0) return;
    if(!window.confirm(\`Tem certeza que deseja ocultar \${selectedPendentes.size} rotas do financeiro para sempre?\`)) return;
    try {
      const batch = writeBatch(db);
      for (const id of selectedPendentes) {
        batch.set(doc(db, getCollectionName('rotas_ignoradas_testes'), String(id)), { id_rota: id, data_ignorada: new Date().toISOString() });
        batch.delete(doc(db, getCollectionName('rotas_pendentes_testes'), String(id)));
      }
      await batch.commit();
      setRotasPendentes(prev => prev.filter(r => !selectedPendentes.has(r.id_rota)));
      setSelectedPendentes(new Set());
      addLog(\`\${selectedPendentes.size} rotas ocultadas com sucesso.\`, 'success');
    } catch (e) {
      console.error("Erro ao ignorar rotas em massa", e);
      addLog(\`Erro ao ignorar rotas: \${e.message}\`, 'error');
    }
  };`;
const newHandleBulkIgnorar = `const handleBulkIgnorar = async () => {
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
  };`;
content = content.replace(oldHandleBulkIgnorar, newHandleBulkIgnorar);

fs.writeFileSync(filePath, content, 'utf-8');
console.log('DataImporter migrado para Supabase com sucesso!');
