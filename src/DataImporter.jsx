import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { UploadCloud, FileSpreadsheet, CheckCircle2, AlertTriangle, ArrowRight, Loader2, Database, Box, DollarSign, History, Calendar, LayoutList, Trash2, EyeOff } from 'lucide-react';
import { db, getCollectionName } from './firebase';
import { collection, writeBatch, doc, setDoc, getDocs, query, where, deleteDoc } from 'firebase/firestore';

export default function DataImporter({ onImportOperacional, onImportBilling, onImportCapCar, onImportOperacionalBSC, rawFaturamentoData = [], rawOperacionalData = [], mapeamentoFiliais = [] }) {
  const [logs, setLogs] = useState([]);
  const [activeStep, setActiveStep] = useState(1);

  const [baseFile, setBaseFile] = useState(null);
  const [quinzenaOp, setQuinzenaOp] = useState('');
  const [isOpMulti, setIsOpMulti] = useState(false);
  const [isProcessingOp, setIsProcessingOp] = useState(false);
  const [progressOp, setProgressOp] = useState('');

  const [billingFile, setBillingFile] = useState(null);
  const [quinzenaBilling, setQuinzenaBilling] = useState('');
  const [numeroFaturaBilling, setNumeroFaturaBilling] = useState('');
  const [isProcessingBilling, setIsProcessingBilling] = useState(false);
  const [progressBilling, setProgressBilling] = useState('');
  const [missingRoutesBilling, setMissingRoutesBilling] = useState(null);

  const [capcarFile, setCapcarFile] = useState(null);
  const [isProcessingCapCar, setIsProcessingCapCar] = useState(false);
  const [progressCapCar, setProgressCapCar] = useState('');

  const [bscFile, setBscFile] = useState(null);
  const [isProcessingBsc, setIsProcessingBsc] = useState(false);
  const [progressBsc, setProgressBsc] = useState('');

  const [historico, setHistorico] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const [rotasPendentes, setRotasPendentes] = useState([]);
  const [isLoadingPendentes, setIsLoadingPendentes] = useState(false);

  const [selectedPendentes, setSelectedPendentes] = useState(new Set());

  const fetchPendentes = async () => {
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
  };

  const deletePendente = async (idRota) => {
    try {
      await deleteDoc(doc(db, getCollectionName('rotas_pendentes_testes'), String(idRota)));
      setRotasPendentes(prev => prev.filter(r => r.id_rota !== idRota));
      addLog(`Rota pendente ${idRota} excluída com sucesso.`, 'success');
    } catch (e) {
      console.error("Erro ao excluir rota pendente", e);
      addLog(`Erro ao excluir rota: ${e.message}`, 'error');
    }
  };

  const ignorarRota = async (idRota) => {
    if(!window.confirm(`Tem certeza que deseja ocultar a rota ${idRota} do financeiro para sempre?`)) return;
    try {
      await setDoc(doc(db, getCollectionName('rotas_ignoradas_testes'), String(idRota)), {
        id_rota: idRota,
        data_ignorada: new Date().toISOString()
      });
      await deleteDoc(doc(db, getCollectionName('rotas_pendentes_testes'), String(idRota)));
      setRotasPendentes(prev => prev.filter(r => r.id_rota !== idRota));
      setSelectedPendentes(prev => { const next = new Set(prev); next.delete(idRota); return next; });
      addLog(`Rota ${idRota} ocultada do financeiro com sucesso. Atualize a base para aplicar.`, 'success');
    } catch (e) {
      console.error("Erro ao ignorar rota", e);
      addLog(`Erro ao ignorar rota: ${e.message}`, 'error');
    }
  };

  const handleBulkIgnorar = async () => {
    if(selectedPendentes.size === 0) return;
    if(!window.confirm(`Tem certeza que deseja ocultar ${selectedPendentes.size} rotas do financeiro para sempre?`)) return;
    try {
      const batch = writeBatch(db);
      for (const id of selectedPendentes) {
        batch.set(doc(db, getCollectionName('rotas_ignoradas_testes'), String(id)), { id_rota: id, data_ignorada: new Date().toISOString() });
        batch.delete(doc(db, getCollectionName('rotas_pendentes_testes'), String(id)));
      }
      await batch.commit();
      setRotasPendentes(prev => prev.filter(r => !selectedPendentes.has(r.id_rota)));
      setSelectedPendentes(new Set());
      addLog(`${selectedPendentes.size} rotas ocultadas com sucesso.`, 'success');
    } catch (e) {
      console.error("Erro ao ignorar rotas em massa", e);
      addLog(`Erro ao ignorar rotas em massa: ${e.message}`, 'error');
    }
  };

  const handleBulkDelete = async () => {
    if(selectedPendentes.size === 0) return;
    if(!window.confirm(`Tem certeza que deseja excluir ${selectedPendentes.size} alertas (elas não serão ocultadas)?`)) return;
    try {
      const batch = writeBatch(db);
      for (const id of selectedPendentes) {
        batch.delete(doc(db, getCollectionName('rotas_pendentes_testes'), String(id)));
      }
      await batch.commit();
      setRotasPendentes(prev => prev.filter(r => !selectedPendentes.has(r.id_rota)));
      setSelectedPendentes(new Set());
      addLog(`${selectedPendentes.size} alertas excluídos com sucesso.`, 'success');
    } catch (e) {
      console.error("Erro ao excluir alertas em massa", e);
      addLog(`Erro ao excluir alertas em massa: ${e.message}`, 'error');
    }
  };

  const toggleSelectAllPendentes = () => {
    if (selectedPendentes.size === rotasPendentes.length) {
      setSelectedPendentes(new Set());
    } else {
      setSelectedPendentes(new Set(rotasPendentes.map(r => r.id_rota)));
    }
  };

  const toggleSelectPendente = (idRota) => {
    setSelectedPendentes(prev => {
      const next = new Set(prev);
      if (next.has(idRota)) next.delete(idRota);
      else next.add(idRota);
      return next;
    });
  };

  const fetchHistorico = async () => {
    setIsLoadingHistory(true);
    try {
      const q = query(collection(db, getCollectionName('controle_importacoes_testes')));
      const snapshot = await getDocs(q);
      const data = [];
      snapshot.forEach(d => data.push({ id: d.id, ...d.data() }));
      data.sort((a, b) => new Date(b.data_atualizacao).getTime() - new Date(a.data_atualizacao).getTime());
      setHistorico(data);
    } catch(err) {
      console.error(err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (activeStep === 5) {
      fetchHistorico();
    } else if (activeStep === 6) {
      fetchPendentes();
    }
  }, [activeStep]);

  const addLog = (msg, type = 'info') => {
    setLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), msg, type }]);
  };

  const registrarImportacao = async (tipo, quinzena, totalLinhas) => {
    try {
      const q = quinzena || 'GERAL';
      const ref = doc(db, getCollectionName('controle_importacoes_testes'), `${tipo}_${q}`);
      await setDoc(ref, {
        quinzena: q,
        tipo_importacao: tipo,
        data_atualizacao: new Date().toISOString(),
        status: 'Sucesso',
        total_linhas: totalLinhas
      });
    } catch(err) {
      console.error('Erro ao registrar importação', err);
    }
  };

  const CHUNK_SIZE = 250;

  const cleanUndefined = (obj) => {
    if (obj === null || obj === undefined) return null;
    if (Array.isArray(obj)) return obj.map(cleanUndefined);
    if (typeof obj === 'object') {
      const copy = {};
      Object.keys(obj).forEach(key => {
        if (obj[key] !== undefined) {
          copy[key] = cleanUndefined(obj[key]);
        }
      });
      return copy;
    }
    return obj;
  };

  const saveInBuckets = async (collectionName, quinzena, dataArray, setProgress) => {
    try {
      const q = quinzena || 'GERAL';
      setProgress(`Apagando dados antigos da quinzena ${q}...`);
      
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
        setProgress(`Processando linhas ${savedCount} de ${dataArray.length}...`);
      }
    } catch (err) {
      console.error(`Erro em saveInBuckets (${collectionName}):`, err);
      throw err;
    }
  };

  // ============================================================================
  // ETAPA 1: OPERACIONAL
  // ============================================================================
  const handleProcessOperacional = async () => {
    if (!isOpMulti && !quinzenaOp.trim()) {
      alert("A Quinzena é obrigatória no modo Padrão.");
      return;
    }
    if (!baseFile) return;
    setIsProcessingOp(true);
    setLogs([]);
    addLog('[ETAPA 1] Iniciando processamento local...', 'info');
    setProgressOp('Lendo arquivo...');

    const processData = async (dataArray) => {
      let headerRowIdx = -1;
      let rotaColIdx = -1, xptColIdx = -1, saldoColIdx = -1, entreguesColIdx = -1, insucessosColIdx = -1, driverIdColIdx = -1, motoristaColIdx = -1, quinzenaColIdx = -1;

      for (let i = 0; i < Math.min(15, dataArray.length); i++) {
        const row = dataArray[i];
        if (!row) continue;
        const cRota = row.findIndex(c => String(c).toUpperCase().includes('ROTA'));
        const cXpt = row.findIndex(c => String(c).toUpperCase() === 'XPT' || String(c).toUpperCase() === 'FILIAL');
        const cSaldo = row.findIndex(c => String(c).toUpperCase() === 'SALDO');
        const cEntregues = row.findIndex(c => String(c).toUpperCase() === 'ENTREGUES');
        const cInsucessos = row.findIndex(c => String(c).toUpperCase() === 'INSUCESSOS');
        const cDriver = row.findIndex((c, idx) => String(c).toUpperCase() === 'DRIVER' || String(c).toUpperCase() === 'DRIVER ID' || (String(c).trim() === '#' && idx === 5));
        const cMotorista = row.findIndex(c => String(c).toUpperCase() === 'MOTORISTA' || String(c).toUpperCase() === 'DRIVER NAME' || String(c).toUpperCase() === 'NOME');
        const cQuinzena = row.findIndex(c => String(c).toUpperCase().includes('QUINZENA'));

        if (cRota !== -1 && cXpt !== -1) {
          headerRowIdx = i; rotaColIdx = cRota; xptColIdx = cXpt; saldoColIdx = cSaldo; entreguesColIdx = cEntregues;
          insucessosColIdx = cInsucessos; driverIdColIdx = cDriver; motoristaColIdx = cMotorista; 
          if (isOpMulti) quinzenaColIdx = cQuinzena;
          break;
        }
      }

      if (headerRowIdx === -1) {
        addLog('Erro: Colunas ROTA e FILIAL não encontradas.', 'error');
        setIsProcessingOp(false);
        return;
      }
      if (isOpMulti && quinzenaColIdx === -1) {
        addLog('Erro: Coluna QUINZENA não encontrada no modo Multi-Quinzena.', 'error');
        setIsProcessingOp(false);
        return;
      }

      const configMap = {};
      mapeamentoFiliais.forEach(m => configMap[String(m.filial).toUpperCase()] = m);

      const mapInsucessosOp = {
        'QTD BLOQUEADO': 'Bloqueado', 'QTD BLOQUEADO POR PALAVRA': 'Palavra Chave', 'QTD CANCELADO': 'Cancelado',
        'QTD COLETADO': 'Coleta', 'QTD COMÉRCIO FECHADO': 'Comercial', 'QTD COMPRADOR REJEITOU': 'Recusa',
        'QTD DANIFICADO': 'Avaria', 'QTD DESTINATÁRIO MUDOU': 'Mudou Endereco', 'QTD ENDEREÇO INACESSÍVEL': 'Area Inacessivel',
        'QTD ENDEREÇO NÃO VISITADO': 'Nao Visitado', 'QTD ENDEREÇO RUIM': 'Nao Localizado', 'QTD FALTANDO': 'Faltante',
        'QTD FORA DE ROTA': 'Fora de Rota', 'QTD NINGUÉM PRA RECEBER': 'Cliente Ausente', 'QTD TENTATIVA DE ROUBO': 'Tentativa Roubo',
        'BLOQUEADO': 'Bloqueado', 'PALAVRA CHAVE': 'Palavra Chave', 'CANCELADO': 'Cancelado', 'COLETA': 'Coleta',
        'COMERCIAL': 'Comercial', 'RECUSA': 'Recusa', 'AVARIA': 'Avaria', 'MUDOU ENDERECO': 'Mudou Endereco',
        'AREA INACESSIVEL': 'Area Inacessivel', 'NAO VISITADO': 'Nao Visitado', 'NAO LOCALIZADO': 'Nao Localizado',
        'FALTANTE': 'Faltante', 'FORA DE ROTA': 'Fora de Rota', 'CLIENTE AUSENTE': 'Cliente Ausente', 'TENTATIVA ROUBO': 'Tentativa Roubo'
      };

      const row = dataArray[headerRowIdx];
      const rawHeadersOp = row.map(h => String(h || '').trim());
      let insucessosHeaders = [];
      const normalizeText = (text) => String(text).normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toUpperCase();

      for (let j = 0; j < row.length; j++) {
        const colName = normalizeText(row[j]);
        if (mapInsucessosOp[colName]) insucessosHeaders.push({ index: j, name: mapInsucessosOp[colName] });
      }

      if (insucessosHeaders.length === 0 && insucessosColIdx !== -1) {
        for (let j = insucessosColIdx + 1; j < row.length; j++) {
          if (row[j] && String(row[j]).trim() !== '') insucessosHeaders.push({ index: j, name: String(row[j]).trim() });
        }
      }

      const invalidOpKeys = ['% evid micro', '% evid distância', 'não rateadas', 'contar % entregue', '% evidenciado', '% entregue', 'km percorrido', 'paradas com adicional', 'total da taxa de entrega', 'volume'];
      insucessosHeaders = insucessosHeaders.filter(h => !invalidOpKeys.some(inv => h.name.toLowerCase().includes(inv)));

      const newOperacionalData = [];
      setProgressOp('Compilando registros...');

      for (let i = headerRowIdx + 1; i < dataArray.length; i++) {
        const r = dataArray[i];
        if (!r) continue;
        const rota = String(r[rotaColIdx] || '').trim();
        const filial = String(r[xptColIdx] || '').trim();

        if (rota && filial && filial !== 'N/A') {
          const fKey = filial.toUpperCase();
          const config = configMap[fKey] || {};
          
          const saldo = saldoColIdx !== -1 ? (parseFloat(r[saldoColIdx]) || 0) : 0;
          const entregues = entreguesColIdx !== -1 ? (parseFloat(r[entreguesColIdx]) || 0) : 0;
          const driverId = driverIdColIdx !== -1 ? String(r[driverIdColIdx]).trim() : '';
          const motorista = motoristaColIdx !== -1 ? String(r[motoristaColIdx]).trim() : 'N/A';

          const dados_originais = {};
          rawHeadersOp.forEach((h, idx) => { if (h) dados_originais[h] = r[idx]; });

          const insucessosDetalhados = {};
          insucessosHeaders.forEach(h => {
            const v = parseFloat(r[h.index]) || 0;
            if (v > 0) insucessosDetalhados[h.name] = v;
          });

          const rawQuinzena = isOpMulti && quinzenaColIdx !== -1 ? String(r[quinzenaColIdx] || '').trim().toUpperCase() : quinzenaOp.trim();
          if (isOpMulti && !rawQuinzena) continue;

          newOperacionalData.push({
            id_rota: rota,
            filial,
            regional: config.regional || 'N/A',
            supervisor: config.supervisor || 'N/A',
            saldo,
            entregues,
            insucessosDetalhados,
            quinzena: rawQuinzena || 'GERAL',
            driver_id: driverId,
            motorista: motorista || 'N/A',
            dados_originais
          });
        }
      }

      try {
        const grouped = {};
        newOperacionalData.forEach(d => {
          if (!grouped[d.quinzena]) grouped[d.quinzena] = [];
          grouped[d.quinzena].push(d);
        });

        for (const [q, items] of Object.entries(grouped)) {
          await saveInBuckets('operacional_testes', q, items, setProgressOp);
        }
        
        setProgressOp('Verificando pendências de rotas antigas...');
        try {
          const pendentesSnapshot = await getDocs(collection(db, getCollectionName('rotas_pendentes_testes')));
          const pendentesAtuais = [];
          pendentesSnapshot.forEach(d => pendentesAtuais.push(d.data()));

          const rotasOperacionalMap = {};
          newOperacionalData.forEach(d => {
             if (d.id_rota) rotasOperacionalMap[d.id_rota] = { filial: d.filial, regional: d.regional, supervisor: d.supervisor };
          });

          const resolvedRoutes = [];
          pendentesAtuais.forEach(p => {
            if (rotasOperacionalMap[p.id_rota]) {
              resolvedRoutes.push({ ...p, ...rotasOperacionalMap[p.id_rota] });
            }
          });

          if (resolvedRoutes.length > 0) {
             setProgressOp(`Resolvendo ${resolvedRoutes.length} rotas pendentes automaticamente...`);
             addLog(`Resolvendo ${resolvedRoutes.length} rotas que antes estavam N/A...`, 'info');
             const collectionsToFix = ['faturamento_testes', 'penalidades_testes'];
             for (const colName of collectionsToFix) {
                const qs = await getDocs(collection(db, getCollectionName(colName)));
                const chunks = qs.docs;
                
                for (const chunkDoc of chunks) {
                   const data = chunkDoc.data();
                   if (!data.items) continue;
                   let changed = false;
                   
                   const newItems = data.items.map(item => {
                      const resolved = resolvedRoutes.find(r => r.id_rota === item.id_rota);
                      if (resolved && item.filial === 'N/A') {
                         changed = true;
                         return { ...item, filial: resolved.filial, regional: resolved.regional, supervisor: resolved.supervisor };
                      }
                      return item;
                   });

                   if (changed) {
                      await setDoc(chunkDoc.ref, { items: newItems }, { merge: true });
                   }
                }
             }

             for (let i = 0; i < resolvedRoutes.length; i += 400) {
                const deleteBatch = writeBatch(db);
                const chunk = resolvedRoutes.slice(i, i + 400);
                chunk.forEach(r => {
                   deleteBatch.delete(doc(db, getCollectionName('rotas_pendentes_testes'), r.id_rota));
                });
                await deleteBatch.commit();
             }
             addLog(`Pendências consolidadas nos faturamentos anteriores com sucesso!`, 'success');
          }
        } catch (e) {
          console.error("Erro na auto-resolução:", e);
          addLog("Aviso: Falha ao tentar auto-resolver pendências.", "error");
        }

        if (onImportOperacional) await onImportOperacional(newOperacionalData); // Optional trigger refresh

        const qTotal = Object.keys(grouped).length > 0 ? Object.keys(grouped)[0] : 'GERAL';
        await registrarImportacao('Operacional', isOpMulti ? 'Multi-Quinzena' : quinzenaOp.trim(), newOperacionalData.length);

        addLog('Salvo em buckets no Firebase com sucesso!', 'success');
        setBaseFile(null);
        setQuinzenaOp('');
        setIsOpMulti(false);
        setProgressOp('Concluído!');
        setTimeout(() => setIsProcessingOp(false), 2000);
      } catch (err) {
        addLog(`Erro ao salvar dados: ${err.message}`, 'error');
        setProgressOp(`Erro: ${err.message}`);
        setIsProcessingOp(false);
      }
    };

    if (baseFile.name.toLowerCase().endsWith('.csv')) {
      Papa.parse(baseFile, {
        skipEmptyLines: true,
        worker: true,
        complete: (results) => processData(results.data),
        error: (err) => { addLog(err.message, 'error'); setIsProcessingOp(false); }
      });
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const workbook = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
          const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1 });
          processData(jsonData);
        } catch (err) {
          addLog(err.message, 'error');
          setIsProcessingOp(false);
        }
      };
      reader.readAsArrayBuffer(baseFile);
    }
  };

  // ============================================================================
  // ETAPA 2: BILLING
  // ============================================================================
  const handleProcessBilling = () => {
    if (!quinzenaBilling.trim()) {
      alert("A Quinzena é obrigatória para o Billing.");
      return;
    }
    if (!numeroFaturaBilling.trim()) {
      alert("O Número da Fatura é obrigatório para o Billing.");
      return;
    }
    if (!billingFile) return;
    setIsProcessingBilling(true);
    setLogs([]);
    setMissingRoutesBilling(null);
    addLog('[ETAPA 2] Iniciando processamento local...', 'info');
    setProgressBilling('Lendo arquivo...');

    const processData = async (dataArray) => {
      const configMap = {};
      mapeamentoFiliais.forEach(m => configMap[String(m.filial).toUpperCase()] = m);
      const mapRotaFilial = {};
      rawOperacionalData.forEach(d => {
        if (d.id_rota && d.filial) {
          mapRotaFilial[d.id_rota] = { filial: d.filial, regional: d.regional, supervisor: d.supervisor, motorista: d.motorista || 'N/A' };
        }
      });

      let headerIdx = -1;
      let quinzenaStr = quinzenaBilling.trim() || 'GERAL';

      for (let i = 0; i < Math.min(20, dataArray.length); i++) {
        const row = dataArray[i];
        if (!quinzenaBilling && row.some(c => String(c).toUpperCase().includes('PERÍODO') || String(c).toUpperCase().includes('PERIODO'))) {
          if (dataArray[i+1] && dataArray[i+1].length > 5) quinzenaStr = String(dataArray[i+1][5] || dataArray[i+1][4] || '').trim();
        }
        if (row.findIndex(c => String(c).toUpperCase() === 'DESCRIÇÃO' || String(c).toUpperCase() === 'DESCRICAO') !== -1) {
          headerIdx = i; break;
        }
      }

      if (headerIdx === -1) {
        addLog('Erro: Coluna Descrição não encontrada.', 'error');
        setIsProcessingBilling(false); return;
      }

      const rawHeaders = dataArray[headerIdx].map(h => String(h || '').trim());
      
      let idxSubtotal = rawHeaders.findIndex(h => h.toUpperCase().includes('SUBTOTAL') || h.toUpperCase() === 'TOTAL' || h.toUpperCase().includes('TOTAL '));
      if (idxSubtotal === -1) idxSubtotal = 8;
      
      let idxPrecoUnitario = rawHeaders.findIndex(h => h.toUpperCase().includes('PREÇO UNIT') || h.toUpperCase().includes('PRECO UNIT') || h.toUpperCase().includes('UNIT PRICE'));
      if (idxPrecoUnitario === -1) idxPrecoUnitario = 7;
      
      let idxQuantidade = rawHeaders.findIndex(h => h.toUpperCase().includes('QUANT') || h.toUpperCase() === 'QTY');
      if (idxQuantidade === -1) idxQuantidade = 6;
      
      let idxDesc = rawHeaders.findIndex(h => h.toUpperCase().includes('DESCRI'));
      if (idxDesc === -1) idxDesc = 0;
      
      let idxRota = rawHeaders.findIndex(h => h.toUpperCase() === 'ID DA ROTA' || h.toUpperCase() === 'ROUTE ID' || h.toUpperCase() === 'ROTA');
      if (idxRota === -1) idxRota = 1;
      
      let idxPacote = rawHeaders.findIndex(h => h.toUpperCase().includes('PACOTE') || h.toUpperCase().includes('TRACKING') || h.toUpperCase().includes('AWB'));
      if (idxPacote === -1) idxPacote = 2;

      addLog(`Colunas mapeadas - Rota: [${idxRota}], Descrição: [${idxDesc}], Pacote: [${idxPacote}], Subtotal: [${idxSubtotal}], Unitário: [${idxPrecoUnitario}], Qtd: [${idxQuantidade}]`, 'info');

      const mapDiarias = {};
      const arrayPenalidades = [];
      let isPenalties = false;
      let currentIdRota = '';

      setProgressBilling('Compilando faturamento e penalidades...');

      for (let i = headerIdx + 1; i < dataArray.length; i++) {
        const row = dataArray[i];
        const rowText = row.join('').trim().toLowerCase();
        if (rowText === '' || rowText.includes('total') || rowText.includes('subtotal')) continue;

        const dados_originais = {};
        rawHeaders.forEach((h, idx) => { if (h) dados_originais[h] = row[idx]; });

        const parseCurrency = (str) => {
          let p = String(str || '0').toUpperCase().replace('R$', '').trim();
          if (p.includes('.') && p.includes(',')) p = p.lastIndexOf(',') > p.lastIndexOf('.') ? p.replace(/\./g, '').replace(',', '.') : p.replace(/,/g, '');
          else if (p.includes(',')) p = p.replace(',', '.');
          return parseFloat(p) || 0;
        };

        let desc = String(row[idxDesc] || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        let idRota = String(row[idxRota] || '').trim();
        
        if (!idRota || !/\d/.test(idRota)) {
          const rotaMatch = desc.match(/\d{5,}/);
          if (rotaMatch) {
            idRota = rotaMatch[0];
          } else if (currentIdRota && !isPenalties) {
            idRota = currentIdRota;
          }
        }
        
        if (idRota && /\d{5,}/.test(idRota)) {
          currentIdRota = idRota;
        }
        
        let valorTotal = parseCurrency(row[idxSubtotal]);
        let precoUnitario = parseCurrency(row[idxPrecoUnitario]);
        
        const routeObj = mapRotaFilial[idRota] || { filial: 'N/A', regional: 'N/A', supervisor: 'N/A' };

        if (desc.toLowerCase().includes('visited addresses') && !desc.toLowerCase().includes('not visited')) {
          isPenalties = true;
          if (!idRota) idRota = `sem_rota_${i}`;
          if (!mapDiarias[idRota]) mapDiarias[idRota] = { id_rota: idRota, faturamento: 0, faturamento_paradas: 0, dados_originais, ...routeObj, quinzena: quinzenaStr, numero_fatura: numeroFaturaBilling };
          mapDiarias[idRota].faturamento += precoUnitario; // Base route usually matches Preço Unitário
          continue;
        }

        if (!isPenalties) {
          if (!idRota) idRota = `sem_rota_${i}`;
          if (!mapDiarias[idRota]) mapDiarias[idRota] = { id_rota: idRota, faturamento: 0, faturamento_paradas: 0, dados_originais, ...routeObj, quinzena: quinzenaStr, numero_fatura: numeroFaturaBilling };
          
          if (desc.toUpperCase().includes("ADDSTOPS") || desc.toUpperCase().includes("PARADA")) {
            mapDiarias[idRota].faturamento_paradas = (mapDiarias[idRota].faturamento_paradas || 0) + valorTotal;
          } else {
            mapDiarias[idRota].faturamento += precoUnitario;
          }
        } else {
          let tipoFinal = 'Outros';
          if (desc.toLowerCase().includes('lost')) tipoFinal = 'Lost Packages';
          else if (desc.toLowerCase().includes('pnr')) tipoFinal = 'PNRs';
          else if (desc.toLowerCase().includes('not visited') || desc.toLowerCase().includes('nv')) tipoFinal = 'Not Visited';

          arrayPenalidades.push({
            id_rota: idRota,
            id_pacote: String(row[idxPacote] || '').trim(),
            descricao: desc,
            tipo: tipoFinal,
            valor: Math.abs(valorTotal),
            quinzena: quinzenaStr,
            dados_originais,
            ...routeObj
          });
        }
      }

      const arrDiarias = Object.values(mapDiarias);
      const rotasNaoEncontradas = new Map();
      const findDataInicial = (dados_originais) => {
         if (!dados_originais) return 'N/A';
         const possibleKeys = Object.keys(dados_originais).filter(k => k.toLowerCase().includes('data') || k.toLowerCase().includes('date'));
         if (possibleKeys.length > 0) return dados_originais[possibleKeys[0]];
         return 'N/A';
      };

      arrDiarias.filter(d => d.filial === 'N/A').forEach(d => { 
        if (d.id_rota && !rotasNaoEncontradas.has(d.id_rota)) rotasNaoEncontradas.set(d.id_rota, findDataInicial(d.dados_originais)); 
      });
      arrayPenalidades.filter(p => p.filial === 'N/A').forEach(p => { 
        if (p.id_rota && !rotasNaoEncontradas.has(p.id_rota)) rotasNaoEncontradas.set(p.id_rota, findDataInicial(p.dados_originais)); 
      });

      if (rotasNaoEncontradas.size > 0) {
        setMissingRoutesBilling(Array.from(rotasNaoEncontradas.keys()));
        addLog(`Atenção: ${rotasNaoEncontradas.size} rotas não encontradas no operacional!`, 'error');

        try {
          setProgressBilling('Registrando rotas pendentes...');
          const rotasArray = Array.from(rotasNaoEncontradas.entries());
          for (let i = 0; i < rotasArray.length; i += 400) {
            const batchPendentes = writeBatch(db);
            const chunk = rotasArray.slice(i, i + 400);
            chunk.forEach(([rota, dataInicial]) => {
              const docRef = doc(collection(db, getCollectionName('rotas_pendentes_testes')), rota);
              batchPendentes.set(docRef, {
                id_rota: rota,
                quinzena_origem: quinzenaStr,
                data_identificacao: new Date().toISOString(),
                data_inicial: dataInicial
              });
            });
            await batchPendentes.commit();
          }
        } catch (e) {
          console.error("Erro ao registrar pendencias", e);
        }
      }

      try {
        await saveInBuckets('faturamento_testes', quinzenaStr, arrDiarias, setProgressBilling);
        await saveInBuckets('penalidades_testes', quinzenaStr, arrayPenalidades, setProgressBilling);
        
        if (onImportBilling) await onImportBilling(arrDiarias, arrayPenalidades);

        await registrarImportacao('Billing', quinzenaStr, arrDiarias.length + arrayPenalidades.length);

        addLog('Salvo em buckets no Firebase com sucesso!', 'success');
        setBillingFile(null);
        setProgressBilling('Concluído!');
        setTimeout(() => setIsProcessingBilling(false), 2000);
      } catch (err) {
        addLog(`Erro ao salvar dados: ${err.message}`, 'error');
        setProgressBilling(`Erro: ${err.message}`);
        setIsProcessingBilling(false);
      }
    };

    if (billingFile.name.toLowerCase().endsWith('.csv')) {
      Papa.parse(billingFile, { skipEmptyLines: true, worker: true, complete: (res) => processData(res.data) });
    } else {
      const r = new FileReader();
      r.onload = (e) => {
        const wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
        processData(XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 }));
      };
      r.readAsArrayBuffer(billingFile);
    }
  };

  // ============================================================================
  // ETAPA 3: CAPCAR
  // ============================================================================
  const handleProcessCapCar = () => {
    if (!capcarFile) return;
    setIsProcessingCapCar(true);
    setProgressCapCar('Lendo arquivo...');

    const processData = async (dataArray) => {
      let headerRowIdx = -1;
      for (let i = 0; i < Math.min(15, dataArray.length); i++) {
        if (dataArray[i] && dataArray[i].some(c => String(c).toUpperCase().includes('VENCIMENTO') || String(c).toUpperCase().includes('VALOR'))) {
          headerRowIdx = i; break;
        }
      }

      if (headerRowIdx === -1) {
        setIsProcessingCapCar(false); return;
      }

      const enrichedData = [];

      setProgressCapCar('Compilando custos...');

      const normalizeText = (text) => String(text).normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toUpperCase();
      
      const parseValor = (valStr) => {
        if(!valStr) return 0;
        let str = valStr.toString().trim();
        const isNegative = str.includes('-') || (str.includes('(') && str.includes(')'));
        str = str.replace(/[^\d,.]/g, '');
        const hasComma = str.includes(',');
        const hasDot = str.includes('.');
        if (hasComma && hasDot) {
          const lastComma = str.lastIndexOf(',');
          const lastDot = str.lastIndexOf('.');
          if (lastComma > lastDot) {
            str = str.replace(/\./g, '').replace(',', '.');
          } else {
            str = str.replace(/,/g, '');
          }
        } else if (hasComma) {
          str = str.replace(',', '.');
        }
        let num = parseFloat(str);
        if(isNaN(num)) return 0;
        return isNegative ? -num : num;
      };

      for (let i = headerRowIdx + 1; i < dataArray.length; i++) {
        const row = dataArray[i];
        if (!row || row.length < 47) continue;

        const quinzena = row[4] ? String(row[4]).trim() : '';
        const filial = row[7] ? String(row[7]).trim() : '';
        
        // AU = 46, AV = 47, AZ = 51, BI = 60
        const valorPagoRaw = row[46] ? String(row[46]).trim() : '0';
        const valorDevidoRaw = row[47] ? String(row[47]).trim() : '0';
        
        if (!quinzena || !filial || quinzena === '#N/D') continue;

        const valorPago = parseValor(valorPagoRaw);
        const valorDevidoBase = parseValor(valorDevidoRaw);
        const receitaBase = parseValor(row[51]);
        const receitaParadas = parseValor(row[60]);

        const titleCase = (str) => str.toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

        enrichedData.push({
          quinzena,
          filial: normalizeText(filial),
          dia: row[8] ? String(row[8]).trim() : '',
          agregado: row[12] ? normalizeText(row[12]) : '',
          ciclo: row[21] ? String(row[21]).trim() : '',
          categoria: row[17] ? titleCase(String(row[17]).trim()) : 'Outros',
          range: row[36] ? String(row[36]).trim() : 'SEM FAIXA',
          tarifaBase: parseValor(row[37]),
          valorPago,
          receitaBaseRecebido: receitaBase,
          receitaBaseAReceber: valorDevidoBase,
          receitaParadas,
          receitaTotal: receitaBase + receitaParadas,
          valorDevido: valorDevidoBase + receitaParadas
        });
      }

      // Group by quinzena
      const grouped = {};
      enrichedData.forEach(d => {
        if (!grouped[d.quinzena]) grouped[d.quinzena] = [];
        grouped[d.quinzena].push(d);
      });

      try {
        for (const [q, items] of Object.entries(grouped)) {
          await saveInBuckets('capcar_testes', q, items, setProgressCapCar);
        }
        
        if (onImportCapCar) await onImportCapCar(enrichedData);

        const qTotal = Object.keys(grouped).length > 0 ? Object.keys(grouped)[0] : 'GERAL';
        await registrarImportacao('CAP', qTotal, enrichedData.length);

        setCapcarFile(null);
        setProgressCapCar('Concluído!');
        setTimeout(() => setIsProcessingCapCar(false), 2000);
      } catch (err) {
        console.error("Erro ao processar CAP:", err);
        setProgressCapCar(`Erro: ${err.message}`);
        setIsProcessingCapCar(false);
      }
    };

    if (capcarFile.name.toLowerCase().endsWith('.csv')) {
      Papa.parse(capcarFile, { skipEmptyLines: true, worker: true, complete: (res) => processData(res.data) });
    } else {
      const r = new FileReader();
      r.onload = (e) => {
        const wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
        processData(XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 }));
      };
      r.readAsArrayBuffer(capcarFile);
    }
  };

  // ============================================================================
  // ETAPA 4: BSC
  // ============================================================================
  const handleProcessBsc = () => {
    if (!bscFile) return;
    setIsProcessingBsc(true);
    setProgressBsc('Lendo arquivo...');

    const processData = async (dataArray) => {
      // Implementação similar ao operacional, omitido para brevidade
      setProgressBsc('Desativado temporariamente.');
      setTimeout(() => setIsProcessingBsc(false), 2000);
    };

    if (bscFile.name.toLowerCase().endsWith('.csv')) {
      Papa.parse(bscFile, { skipEmptyLines: true, worker: true, complete: (res) => processData(res.data) });
    } else {
      const r = new FileReader();
      r.onload = (e) => {
        const wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
        processData(XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 }));
      };
      r.readAsArrayBuffer(bscFile);
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 bg-slate-900 min-h-full">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="mb-8">
          <h1 className="text-2xl md:text-3xl font-black text-white flex items-center gap-3">
            <Database className="w-8 h-8 text-blue-500" />
            Importação em Memória (Buckets)
          </h1>
          <p className="text-slate-400 mt-2 text-sm">O processamento usará o navegador fragmentando grandes arquivos em blocos de 250 para não estourar a cota de 1MB por documento do Firebase.</p>
        </header>

        <div className="flex gap-2 mb-6 flex-wrap">
          <button onClick={() => setActiveStep(1)} className={`px-4 py-2 text-sm font-bold rounded-xl ${activeStep === 1 ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'}`}>1. Operacional</button>
          <button onClick={() => setActiveStep(2)} className={`px-4 py-2 text-sm font-bold rounded-xl ${activeStep === 2 ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'}`}>2. Billing</button>
          <button onClick={() => setActiveStep(3)} className={`px-4 py-2 text-sm font-bold rounded-xl ${activeStep === 3 ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'}`}>3. CAP</button>
          <button onClick={() => setActiveStep(4)} className={`px-4 py-2 text-sm font-bold rounded-xl ${activeStep === 4 ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'}`}>4. BSC</button>
          <button
            onClick={() => setActiveStep(5)}
            className={`px-4 py-2 font-bold whitespace-nowrap border-b-2 transition-colors ${activeStep === 5 ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-300'}`}
          >
            Histórico
          </button>
          <button
            onClick={() => setActiveStep(6)}
            className={`px-4 py-2 font-bold whitespace-nowrap border-b-2 transition-colors flex items-center gap-2 ${activeStep === 6 ? 'border-red-500 text-red-400' : 'border-transparent text-slate-400 hover:text-slate-300'}`}
          >
            <AlertTriangle className="w-4 h-4" /> Rotas Pendentes
          </button>
        </div>

        <div className="bg-slate-800 rounded-3xl p-6 border border-slate-700">
          {activeStep === 1 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-white"><Box className="inline mr-2" />Operacional</h2>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-white text-sm cursor-pointer hover:text-blue-400">
                    <input type="radio" checked={!isOpMulti} onChange={() => setIsOpMulti(false)} className="accent-blue-500" /> 
                    <span>Padrão (1 Quinzena)</span>
                  </label>
                  <label className="flex items-center gap-2 text-white text-sm cursor-pointer hover:text-blue-400" title="A planilha deve ter uma coluna com a palavra QUINZENA no cabeçalho">
                    <input type="radio" checked={isOpMulti} onChange={() => setIsOpMulti(true)} className="accent-blue-500" /> 
                    <span>Multi-Quinzena (Automático)</span>
                  </label>
                </div>
              </div>
              
              {!isOpMulti && (
                <input type="text" placeholder="Quinzena (Ex: 202603Q1)" value={quinzenaOp} onChange={e => setQuinzenaOp(e.target.value)} className="bg-slate-900 border border-slate-700 text-white rounded-xl px-4 py-2 w-full md:w-1/2" />
              )}
              <label className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-xl cursor-pointer w-fit transition-colors">
                <UploadCloud className="w-5 h-5" />
                <span className="font-medium">{baseFile ? baseFile.name : "Selecionar Planilha Operacional"}</span>
                <input type="file" accept=".csv, .xlsx" onChange={e => setBaseFile(e.target.files[0])} className="hidden" />
              </label>
              {progressOp && <p className="text-blue-400 font-bold">{progressOp}</p>}
              <button onClick={handleProcessOperacional} disabled={isProcessingOp} className="bg-blue-600 text-white px-6 py-2 rounded-xl">Iniciar Processamento</button>
            </div>
          )}
          {activeStep === 2 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-white"><DollarSign className="inline mr-2" />Billing</h2>
              <div className="flex flex-col sm:flex-row gap-4 w-full md:w-1/2">
                <input type="text" placeholder="Quinzena (Ex: 202603Q1)" value={quinzenaBilling} onChange={e => setQuinzenaBilling(e.target.value)} className="bg-slate-900 border border-slate-700 text-white rounded-xl px-4 py-2 flex-1" />
                <input type="text" placeholder="Número da Fatura" value={numeroFaturaBilling} onChange={e => setNumeroFaturaBilling(e.target.value)} className="bg-slate-900 border border-slate-700 text-white rounded-xl px-4 py-2 flex-1" />
              </div>
              <label className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-xl cursor-pointer w-fit transition-colors">
                <UploadCloud className="w-5 h-5" />
                <span className="font-medium">{billingFile ? billingFile.name : "Selecionar Planilha Billing"}</span>
                <input type="file" accept=".csv, .xlsx" onChange={e => setBillingFile(e.target.files[0])} className="hidden" />
              </label>
              {billingFile && (
                <div className="flex flex-col gap-4">
                  <button onClick={handleProcessBilling} disabled={isProcessingBilling} className="w-full bg-emerald-600 text-white font-bold py-4 rounded-xl disabled:opacity-50">
                    {isProcessingBilling ? 'Processando...' : 'Processar Billing'}
                  </button>
                  {progressBilling && (
                    <div className="p-4 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-200">
                      <p className="font-bold flex items-center gap-2 text-sm">{isProcessingBilling && <Loader2 className="w-4 h-4 animate-spin" />} {progressBilling}</p>
                    </div>
                  )}
                  {missingRoutesBilling && (
                    <div className="bg-red-50 p-6 rounded-2xl border border-red-200 mt-2 animate-in fade-in slide-in-from-bottom-2">
                      <h3 className="text-red-800 font-bold mb-3 flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5" />
                        Rotas não identificadas no Operacional ({missingRoutesBilling.length} IDs únicos)
                      </h3>
                      <p className="text-red-600 text-sm mb-4">
                        Estas rotas precisam ser cadastradas na planilha de Base Operacional. Você pode copiar a lista abaixo, corrigir e realizar a importação novamente:
                      </p>
                      <div className="bg-white rounded-xl p-4 border border-red-100 max-h-40 overflow-y-auto font-mono text-xs text-slate-700">
                        {missingRoutesBilling.join(', ')}
                      </div>
                      <button 
                        onClick={() => navigator.clipboard.writeText(missingRoutesBilling.join('\n'))}
                        className="mt-4 bg-red-100 hover:bg-red-200 text-red-700 px-4 py-2 rounded-lg text-sm font-bold transition-colors shadow-sm"
                      >
                        Copiar Lista de Rotas
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          {activeStep === 3 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-white">CAP</h2>
              <label className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-xl cursor-pointer w-fit transition-colors">
                <UploadCloud className="w-5 h-5" />
                <span className="font-medium">{capcarFile ? capcarFile.name : "Selecionar Planilha CAP"}</span>
                <input type="file" accept=".csv, .xlsx" onChange={e => setCapcarFile(e.target.files[0])} className="hidden" />
              </label>
              {progressCapCar && <p className="text-blue-400 font-bold">{progressCapCar}</p>}
              <button onClick={handleProcessCapCar} disabled={isProcessingCapCar} className="bg-blue-600 text-white px-6 py-2 rounded-xl">Iniciar Processamento</button>
            </div>
          )}
          {activeStep === 4 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-white">BSC</h2>
              <label className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-xl cursor-pointer w-fit transition-colors">
                <UploadCloud className="w-5 h-5" />
                <span className="font-medium">{bscFile ? bscFile.name : "Selecionar Planilha BSC"}</span>
                <input type="file" accept=".csv, .xlsx" onChange={e => setBscFile(e.target.files[0])} className="hidden" />
              </label>
              {progressBsc && <p className="text-blue-400 font-bold">{progressBsc}</p>}
              <button onClick={handleProcessBsc} disabled={isProcessingBsc} className="bg-blue-600 text-white px-6 py-2 rounded-xl">Iniciar Processamento</button>
            </div>
          )}
          {activeStep === 5 && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-white flex items-center gap-2"><History className="w-5 h-5 text-indigo-400" /> Histórico de Importações</h2>
                <button onClick={fetchHistorico} className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-1.5 rounded-lg text-sm font-bold transition-colors">Atualizar</button>
              </div>
              
              <div className="overflow-x-auto bg-slate-900/50 rounded-xl border border-slate-700 mt-4">
                <table className="w-full text-left border-collapse min-w-[600px] text-sm">
                  <thead className="bg-slate-800/80 border-b border-slate-700">
                    <tr>
                      <th className="py-3 px-4 font-bold text-slate-400 uppercase tracking-wider text-[10px]">Quinzena</th>
                      <th className="py-3 px-4 font-bold text-slate-400 uppercase tracking-wider text-[10px]">Tipo</th>
                      <th className="py-3 px-4 font-bold text-slate-400 uppercase tracking-wider text-[10px]">Data e Hora</th>
                      <th className="py-3 px-4 font-bold text-slate-400 uppercase tracking-wider text-[10px] text-right">Total Linhas</th>
                      <th className="py-3 px-4 font-bold text-slate-400 uppercase tracking-wider text-[10px] text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {isLoadingHistory ? (
                      <tr><td colSpan="5" className="py-12 text-center text-slate-500"><Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-indigo-500" /> Carregando histórico...</td></tr>
                    ) : historico.length === 0 ? (
                      <tr><td colSpan="5" className="py-12 text-center text-slate-500">Nenhuma importação registrada no momento.</td></tr>
                    ) : (
                      historico.map(h => (
                        <tr key={h.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-4 text-white font-bold">{h.quinzena}</td>
                          <td className="py-3 px-4 text-slate-300 font-medium">{h.tipo_importacao}</td>
                          <td className="py-3 px-4 text-slate-400">{new Date(h.data_atualizacao).toLocaleString('pt-BR')}</td>
                          <td className="py-3 px-4 text-slate-300 text-right font-mono font-bold">{new Intl.NumberFormat('pt-BR').format(h.total_linhas || 0)}</td>
                          <td className="py-3 px-4 text-center">
                            {h.status === 'Sucesso' ? (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Sucesso
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-500/10 text-slate-400 border border-slate-500/20">
                                {h.status}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {activeStep === 6 && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-red-400 flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-red-400" /> Rotas Pendentes ({rotasPendentes.length})</h2>
                <div className="flex gap-2">
                  {selectedPendentes.size > 0 && (
                    <>
                      <button onClick={handleBulkIgnorar} className="bg-orange-600 hover:bg-orange-500 text-white px-4 py-1.5 rounded-lg text-sm font-bold transition-colors flex items-center gap-2">
                        <EyeOff className="w-4 h-4" /> Ignorar ({selectedPendentes.size})
                      </button>
                      <button onClick={handleBulkDelete} className="bg-red-600 hover:bg-red-500 text-white px-4 py-1.5 rounded-lg text-sm font-bold transition-colors flex items-center gap-2">
                        <Trash2 className="w-4 h-4" /> Excluir Alertas ({selectedPendentes.size})
                      </button>
                    </>
                  )}
                  <button 
                    onClick={() => navigator.clipboard.writeText(rotasPendentes.map(r => r.id_rota).join('\n'))}
                    className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-1.5 rounded-lg text-sm font-bold transition-colors"
                  >
                    Copiar Todos
                  </button>
                  <button onClick={fetchPendentes} className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-1.5 rounded-lg text-sm font-bold transition-colors">
                    Atualizar
                  </button>
                </div>
              </div>
              
              <div className="overflow-x-auto bg-slate-900/50 rounded-xl border border-red-900/30 mt-4">
                <table className="w-full text-left border-collapse min-w-[600px] text-sm">
                  <thead className="bg-slate-800/80 border-b border-slate-700">
                    <tr>
                      <th className="py-3 px-4 w-10 text-center">
                        <input 
                          type="checkbox" 
                          checked={rotasPendentes.length > 0 && selectedPendentes.size === rotasPendentes.length}
                          onChange={toggleSelectAllPendentes}
                          className="w-4 h-4 rounded border-slate-600 text-red-500 focus:ring-red-500 bg-slate-700"
                        />
                      </th>
                      <th className="py-3 px-4 font-bold text-slate-400 uppercase tracking-wider text-[10px]">ID Rota</th>
                      <th className="py-3 px-4 font-bold text-slate-400 uppercase tracking-wider text-[10px]">Quinzena (Erro)</th>
                      <th className="py-3 px-4 font-bold text-slate-400 uppercase tracking-wider text-[10px]">Data Identificação</th>
                      <th className="py-3 px-4 font-bold text-slate-400 uppercase tracking-wider text-[10px]">Data Inicial</th>
                      <th className="py-3 px-4 font-bold text-slate-400 uppercase tracking-wider text-[10px] text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {isLoadingPendentes ? (
                      <tr><td colSpan="6" className="py-12 text-center text-slate-500"><Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-red-500" /> Carregando pendências...</td></tr>
                    ) : rotasPendentes.length === 0 ? (
                      <tr><td colSpan="6" className="py-12 text-center text-emerald-500 font-bold flex flex-col items-center gap-2"><CheckCircle2 className="w-8 h-8 text-emerald-500" /> Nenhuma rota pendente. Tudo certo!</td></tr>
                    ) : (
                      rotasPendentes.map(r => (
                        <tr key={r.id_rota} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-4 text-center">
                            <input 
                              type="checkbox" 
                              checked={selectedPendentes.has(r.id_rota)}
                              onChange={() => toggleSelectPendente(r.id_rota)}
                              className="w-4 h-4 rounded border-slate-600 text-red-500 focus:ring-red-500 bg-slate-700"
                            />
                          </td>
                          <td className="py-3 px-4 text-white font-mono font-bold">{r.id_rota}</td>
                          <td className="py-3 px-4 text-slate-300 font-medium">{r.quinzena_origem}</td>
                          <td className="py-3 px-4 text-slate-400">{new Date(r.data_identificacao).toLocaleString('pt-BR')}</td>
                          <td className="py-3 px-4 text-slate-300 font-medium">{r.data_inicial || 'N/A'}</td>
                          <td className="py-3 px-4 text-center flex items-center justify-center gap-2">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-500/10 text-red-400 border border-red-500/20">
                              Adicionar no Op.
                            </span>
                            <button onClick={() => ignorarRota(r.id_rota)} className="p-1.5 bg-slate-700/50 hover:bg-orange-500/20 text-slate-400 hover:text-orange-400 rounded-md transition-colors" title="Ocultar Rota do Financeiro (Ignorar)">
                               <EyeOff className="w-4 h-4" />
                            </button>
                            <button onClick={() => deletePendente(r.id_rota)} className="p-1.5 bg-slate-700/50 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded-md transition-colors" title="Excluir Alerta (Não oculta a rota)">
                               <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
