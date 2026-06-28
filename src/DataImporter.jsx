import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { UploadCloud, FileSpreadsheet, CheckCircle2, AlertTriangle, ArrowRight, Loader2, Database, Box, DollarSign, History, Calendar, LayoutList, Trash2, EyeOff, Copy, RefreshCw, CalendarDays, Truck, Download } from 'lucide-react';
import { supabase } from './supabase';
import GestaoDadosTab from './GestaoDadosTab';

const ANO_REFERENCIA = 2026;

const getInicioDaSemana = (dataString) => {
  if (!dataString) return '';
  const [dia, mes] = dataString.split('/');
  if (!dia || !mes) return '';
  const data = new Date(ANO_REFERENCIA, parseInt(mes) - 1, parseInt(dia));
  
  const dt = new Date(data.getTime());
  dt.setHours(0, 0, 0, 0);
  dt.setDate(dt.getDate() + 4 - (dt.getDay() || 7));
  const yearStart = new Date(dt.getFullYear(), 0, 1);
  const weekNo = Math.ceil((((dt - yearStart) / 86400000) + 1) / 7);
  return `W${weekNo}`;
};

export default function DataImporter({ onImportOperacional, onImportBilling, onImportCapCar, onImportOperacionalBSC, rawFaturamentoData = [], rawOperacionalData = [], mapeamentoFiliais = [], isImporter = false, isAdmin = false }) {
  const [logs, setLogs] = useState([]);
  const [activeStep, setActiveStep] = useState(1);

  const [baseFile, setBaseFile] = useState(null);
  const [quinzenaOp, setQuinzenaOp] = useState('');
  const [isOpMulti, setIsOpMulti] = useState(false);
  const [isOpPartial, setIsOpPartial] = useState(false);
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
  const [quinzenaBsc, setQuinzenaBsc] = useState('');
  const [isProcessingBsc, setIsProcessingBsc] = useState(false);
  const [progressBsc, setProgressBsc] = useState('');

  const [dispFile, setDispFile] = useState(null);
  const [isProcessingDisp, setIsProcessingDisp] = useState(false);
  const [progressDisp, setProgressDisp] = useState('');

  const [retaguardaFile, setRetaguardaFile] = useState(null);
  const [isProcessingRetaguarda, setIsProcessingRetaguarda] = useState(false);
  const [progressRetaguarda, setProgressRetaguarda] = useState('');
  
  const [isManualRetaguarda, setIsManualRetaguarda] = useState(false);
  const [retQuinzenaManual, setRetQuinzenaManual] = useState('');
  const [retFilialManual, setRetFilialManual] = useState('');
  const [retNomeManual, setRetNomeManual] = useState('');
  const [retDocManual, setRetDocManual] = useState('');
  const [retValorManual, setRetValorManual] = useState('');

  const [historico, setHistorico] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [currentPageHistorico, setCurrentPageHistorico] = useState(1);

  const [rotasPendentes, setRotasPendentes] = useState([]);
  const [isLoadingPendentes, setIsLoadingPendentes] = useState(false);

  const [selectedPendentes, setSelectedPendentes] = useState(new Set());
  const [currentPagePendentes, setCurrentPagePendentes] = useState(1);
  const itemsPerPage = 100;

  const fetchAllFromSupabase = async (tableName, orderBy) => {
    const { count, error: countError } = await supabase.from(tableName).select('*', { count: 'exact', head: true });
    if (countError || !count) return [];
    const limit = 1000;
    let allData = [];
    
    for (let start = 0; start < count; start += (limit * 3)) {
        const promises = [];
        for (let i = 0; i < 3; i++) {
            const currentStart = start + (i * limit);
            if (currentStart >= count) break;
            let query = supabase.from(tableName).select('*').range(currentStart, currentStart + limit - 1);
            if (orderBy) query = query.order(orderBy, { ascending: false });
            promises.push(query);
        }
        const results = await Promise.all(promises);
        for (const res of results) {
            if (res.data) allData = allData.concat(res.data);
        }
    }
    return allData;
  };

  const loadPendentes = async () => {
    setIsLoadingPendentes(true);
    setSelectedPendentes(new Set());
    try {
      const data = await fetchAllFromSupabase('rotas_pendentes', 'data_identificacao');
      setRotasPendentes(data || []);
      setCurrentPagePendentes(1);
    } catch(err) {
      console.error(err);
    } finally {
      setIsLoadingPendentes(false);
    }
  };

  const deletePendente = async (idRota) => {
    try {
      const { error } = await supabase.from('rotas_pendentes').delete().eq('id_rota', String(idRota));
      if (error) throw error;
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
      const { error: insertErr } = await supabase.from('rotas_ignoradas').insert([{ id_rota: idRota, data_ignorada: new Date().toISOString() }]);
      if (insertErr) throw insertErr;
      const { error: delErr } = await supabase.from('rotas_pendentes').delete().eq('id_rota', String(idRota));
      if (delErr) throw delErr;
      
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
      const ignoradas = Array.from(selectedPendentes).map(id => ({ id_rota: id, data_ignorada: new Date().toISOString() }));
      const { error: insErr } = await supabase.from('rotas_ignoradas').insert(ignoradas);
      if (insErr) throw insErr;
      
      const idsArray = Array.from(selectedPendentes).map(id => String(id));
      for (let i = 0; i < idsArray.length; i += 100) {
          const chunk = idsArray.slice(i, i + 100);
          await supabase.from('rotas_pendentes').delete().in('id_rota', chunk);
      }
      
      setRotasPendentes(prev => prev.filter(r => !selectedPendentes.has(r.id_rota)));
      setSelectedPendentes(new Set());
      addLog(`${selectedPendentes.size} rotas ocultadas com sucesso.`, 'success');
    } catch (e) {
      console.error("Erro ao ignorar rotas em massa", e);
      addLog(`Erro ao ignorar rotas: ${e.message}`, 'error');
    }
  };

  const handleBulkDelete = async () => {
    if(selectedPendentes.size === 0) return;
    if(!window.confirm(`Tem certeza que deseja excluir ${selectedPendentes.size} alertas (elas não serão ocultadas)?`)) return;
    try {
      const idsArray = Array.from(selectedPendentes).map(id => String(id));
      for (let i = 0; i < idsArray.length; i += 100) {
          const chunk = idsArray.slice(i, i + 100);
          await supabase.from('rotas_pendentes').delete().in('id_rota', chunk);
      }
      setRotasPendentes(prev => prev.filter(r => !selectedPendentes.has(r.id_rota)));
      setSelectedPendentes(new Set());
      addLog(`${selectedPendentes.size} alertas excluídos com sucesso.`, 'success');
    } catch (e) {
      console.error("Erro ao excluir alertas em massa", e);
      addLog(`Erro ao excluir alertas em massa: ${e.message}`, 'error');
    }
  };


  const handleBulkRetrySearch = async () => {
    if(selectedPendentes.size === 0) return;
    setIsLoadingPendentes(true);
    addLog(`Iniciando busca no operacional para ${selectedPendentes.size} rotas...`, 'info');
    try {
      const idsArray = Array.from(selectedPendentes).map(id => String(id));
      let rotasEncontradas = [];
      
      for (let i = 0; i < idsArray.length; i += 100) {
          const chunk = idsArray.slice(i, i + 100);
          const { data: opData } = await supabase.from('operacional').select('id_rota, filial, regional, supervisor, motorista').in('id_rota', chunk);
          if (opData && opData.length > 0) {
             rotasEncontradas = rotasEncontradas.concat(opData);
          }
      }
      
      if (rotasEncontradas.length > 0) {
         const map = new Map();
         rotasEncontradas.forEach(r => map.set(r.id_rota, r));
         const rotasUnicas = Array.from(map.values());
         
         addLog(`Sincronizando ${rotasUnicas.length} rotas encontradas no faturamento...`, 'info');
         
         for (const r of rotasUnicas) {
             await supabase.from('faturamento').update({
                filial: r.filial, regional: r.regional, supervisor: r.supervisor
             }).eq('id_rota', r.id_rota).eq('filial', 'N/A');
             
             await supabase.from('penalidades').update({
                filial: r.filial, regional: r.regional, supervisor: r.supervisor
             }).eq('id_rota', r.id_rota).eq('filial', 'N/A');
             
             await supabase.from('rotas_pendentes').delete().eq('id_rota', r.id_rota);
         }
         
         addLog(`Sucesso! ${rotasUnicas.length} rotas foram sincronizadas. Atualizando dashboard...`, 'success');
         await supabase.rpc('rpc_refresh_materialized_views');
      } else {
         addLog(`Nenhuma das ${selectedPendentes.size} rotas foi encontrada no operacional ainda.`, 'info');
      }
      
      setSelectedPendentes(new Set());
      await loadPendentes();
      
    } catch (e) {
      console.error("Erro ao refazer busca:", e);
      addLog(`Erro ao refazer busca: ${e.message}`, 'error');
    } finally {
      setIsLoadingPendentes(false);
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
      const data = await fetchAllFromSupabase('importacoes_history', 'data_importacao');
      setHistorico(data || []);
      setCurrentPageHistorico(1);
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
      loadPendentes();
    }
  }, [activeStep]);

  const addLog = (msg, type = 'info') => {
    setLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), msg, type }]);
  };

  const registrarImportacao = async (tipo, quinzena, totalLinhas) => {
    try {
      const historyEntry = {
        tipo,
        quinzena: quinzena || 'GERAL',
        qtd_registros: totalLinhas,
        data_importacao: new Date().toISOString()
      };
      const { error: insErr } = await supabase.from('importacoes_history').insert([historyEntry]);
      if (insErr) throw insErr;
      await fetchHistorico();
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

  const saveToSupabase = async (tableName, quinzena, dataArray, setProgress, isPartial = false) => {
    try {
      const q = quinzena || 'GERAL';
      setProgress(`Enviando dados da quinzena ${q} para o servidor em lote único...`);
      
      const payload = dataArray.map(cleanUndefined);
      
      const { error } = await supabase.rpc('rpc_import_dados', {
        p_table: tableName,
        p_quinzena: q,
        p_payload: payload,
        p_is_partial: isPartial
      });
      
      if (error) throw error;
      setProgress(`Dados inseridos e visualizações atualizadas com sucesso!`);
    } catch (err) {
      console.error(`Erro em saveToSupabase (${tableName}):`, err);
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
      let rotaColIdx = -1, xptColIdx = -1, saldoColIdx = -1, entreguesColIdx = -1, insucessosColIdx = -1, driverIdColIdx = -1, motoristaColIdx = -1, quinzenaColIdx = -1, regionalColIdx = -1, supervisorColIdx = -1;

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
        const cRegional = row.findIndex(c => String(c).toUpperCase().includes('REGIONAL') || String(c).toUpperCase() === 'REGIAO');
        const cSupervisor = row.findIndex(c => String(c).toUpperCase().includes('SUPERV') || String(c).toUpperCase().includes('GESTOR') || String(c).toUpperCase().includes('COORD'));

        if (cRota !== -1 && cXpt !== -1) {
          headerRowIdx = i; rotaColIdx = cRota; xptColIdx = cXpt; saldoColIdx = cSaldo; entreguesColIdx = cEntregues;
          insucessosColIdx = cInsucessos; driverIdColIdx = cDriver; motoristaColIdx = cMotorista; 
          regionalColIdx = cRegional; supervisorColIdx = cSupervisor;
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
          
          let fileRegional = regionalColIdx !== -1 ? String(r[regionalColIdx] || '').trim() : '';
          let fileSupervisor = supervisorColIdx !== -1 ? String(r[supervisorColIdx] || '').trim() : '';
          
          const finalRegional = (config.regional && config.regional !== 'N/A') ? config.regional : (fileRegional || 'N/A');
          const finalSupervisor = (config.supervisor && config.supervisor !== 'N/A') ? config.supervisor : (fileSupervisor || 'N/A');
          
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
            regional: finalRegional,
            supervisor: finalSupervisor,
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
          await saveToSupabase('operacional', q, items, setProgressOp, isOpPartial);
        }
        
        setProgressOp('Verificando pendências de rotas antigas...');
        try {
          const pendentesData = await fetchAllFromSupabase('rotas_pendentes');
          const pendentesAtuais = pendentesData || [];

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
             const collectionsToFix = ['faturamento', 'penalidades'];
             for (const colName of collectionsToFix) {
                // Ao invés de buscar a base inteira (causando timeout),
                // vamos apenas disparar o update direto para cada rota resolvida.
                for (const resolved of resolvedRoutes) {
                   await supabase.from(colName).update({
                     filial: resolved.filial,
                     regional: resolved.regional,
                     supervisor: resolved.supervisor
                   }).eq('id_rota', resolved.id_rota).eq('filial', 'N/A');
                }
             }

             const idsToDelete = resolvedRoutes.map(r => r.id_rota);
             for (let i = 0; i < idsToDelete.length; i += 100) {
                 const chunk = idsToDelete.slice(i, i + 100);
                 await supabase.from('rotas_pendentes').delete().in('id_rota', chunk);
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

        addLog('Salvo no Supabase com sucesso!', 'success');
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
        complete: (results) => {
          processData(results.data).catch(err => {
            addLog(`Erro interno no processamento: ${err.message}`, 'error');
            setProgressOp(`Erro: ${err.message}`);
            setIsProcessingOp(false);
          });
        },
        error: (err) => { addLog(err.message, 'error'); setIsProcessingOp(false); }
      });
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const workbook = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
          const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1 });
          processData(jsonData).catch(err => {
            addLog(`Erro interno no processamento: ${err.message}`, 'error');
            setProgressOp(`Erro: ${err.message}`);
            setIsProcessingOp(false);
          });
        } catch (err) {
          addLog(`Falha ao ler XLSX (talvez arquivo corrompido ou muito grande): ${err.message}`, 'error');
          setProgressOp(`Erro ao ler arquivo.`);
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
      // Validação do Número da Fatura
      const invoiceNumber = numeroFaturaBilling.trim();
      const inFileName = billingFile.name.includes(invoiceNumber);
      
      let inContent = false;
      // Procura o número da fatura nas primeiras 50 linhas
      for (let i = 0; i < Math.min(50, dataArray.length); i++) {
         const rowStr = (dataArray[i] || []).join(' ');
         if (rowStr.includes(invoiceNumber)) {
             inContent = true;
             break;
         }
      }

      if (!inFileName && !inContent) {
          alert(`O número da pré-fatura (${invoiceNumber}) não foi encontrado no nome do arquivo nem no conteúdo do documento. Verifique se o arquivo está correto e tente novamente.`);
          setIsProcessingBilling(false);
          setProgressBilling('');
          return;
      }

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

      // PASS 1: Collect unique rotas to fetch from Supabase
      const uniqueRotas = new Set();
      let currentIdRotaPass1 = '';
      let isPenaltiesPass1 = false;
      
      for (let i = headerIdx + 1; i < dataArray.length; i++) {
        const row = dataArray[i];
        if(!row) continue;
        const rowText = row.join('').trim().toLowerCase();
        if (rowText === '' || rowText.includes('total') || rowText.includes('subtotal')) continue;
        
        let desc = String(row[idxDesc] || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        let idRota = String(row[idxRota] || '').trim();
        
        if (!idRota || !/\d/.test(idRota)) {
          const rotaMatch = desc.match(/\d{5,}/);
          if (rotaMatch) idRota = rotaMatch[0];
          else if (currentIdRotaPass1 && !isPenaltiesPass1) idRota = currentIdRotaPass1;
        }
        if (idRota && /\d{5,}/.test(idRota)) currentIdRotaPass1 = idRota;
        if (desc.toLowerCase().includes('visited addresses') && !desc.toLowerCase().includes('not visited')) {
           isPenaltiesPass1 = true;
        }
        if (idRota) uniqueRotas.add(idRota);
      }

      setProgressBilling(`Buscando ${uniqueRotas.size} rotas no histórico Operacional...`);
      const rotasArrayToFetch = Array.from(uniqueRotas);
      for (let i = 0; i < rotasArrayToFetch.length; i += 500) {
        const chunk = rotasArrayToFetch.slice(i, i + 500);
        try {
          const { data } = await supabase.from('operacional').select('id_rota, filial, regional, supervisor, motorista').in('id_rota', chunk);
          if (data) {
            data.forEach(d => {
              if (d.filial && d.filial !== 'N/A') {
                mapRotaFilial[d.id_rota] = { filial: d.filial, regional: d.regional, supervisor: d.supervisor, motorista: d.motorista || 'N/A' };
              }
            });
          }
        } catch (e) {
          console.error("Erro ao buscar rotas do supabase na importação", e);
        }
      }

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
            filial: routeObj.filial,
            regional: routeObj.regional,
            supervisor: routeObj.supervisor
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
          for (let i = 0; i < rotasArray.length; i += 1000) {
            const chunk = rotasArray.slice(i, i + 1000);
            const upsertData = chunk.map(([rota, dataInicial]) => ({
              id_rota: rota,
              quinzena_origem: quinzenaStr,
              data_identificacao: new Date().toISOString(),
              data_inicial: dataInicial
            }));
            const { error: upsertErr } = await supabase.from('rotas_pendentes').upsert(upsertData, { onConflict: 'id_rota' });
            if (upsertErr) throw upsertErr;
          }
        } catch (e) {
          console.error("Erro ao registrar pendencias", e);
        }
      }

      try {
        await saveToSupabase('faturamento', quinzenaStr, arrDiarias, setProgressBilling);
        await saveToSupabase('penalidades', quinzenaStr, arrayPenalidades, setProgressBilling);
        
        if (onImportBilling) await onImportBilling(arrDiarias, arrayPenalidades);

        await registrarImportacao('Billing', quinzenaStr, arrDiarias.length + arrayPenalidades.length);
        await supabase.rpc('rpc_refresh_materialized_views');

        addLog('Salvo no Supabase com sucesso!', 'success');
        setBillingFile(null);
        setQuinzenaBilling('');
        setNumeroFaturaBilling('');
        setProgressBilling('Concluído!');
        setTimeout(() => {
           setIsProcessingBilling(false);
           setProgressBilling('');
        }, 2000);
      } catch (err) {
        addLog(`Erro ao salvar dados: ${err.message}`, 'error');
        setProgressBilling(`Erro: ${err.message}`);
        setIsProcessingBilling(false);
      }
    };

    if (billingFile.name.toLowerCase().endsWith('.csv')) {
      Papa.parse(billingFile, { skipEmptyLines: true, worker: true, complete: (res) => {
         processData(res.data).catch(err => {
            addLog(`Erro interno no processamento: ${err.message}`, 'error');
            setProgressBilling(`Erro: ${err.message}`);
            setIsProcessingBilling(false);
         });
      } });
    } else {
      const r = new FileReader();
      r.onload = (e) => {
        try {
          const wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
          processData(XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 })).catch(err => {
            addLog(`Erro interno no processamento: ${err.message}`, 'error');
            setProgressBilling(`Erro: ${err.message}`);
            setIsProcessingBilling(false);
          });
        } catch (err) {
          addLog(`Falha ao ler XLSX: ${err.message}`, 'error');
          setProgressBilling(`Erro ao ler arquivo.`);
          setIsProcessingBilling(false);
        }
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
        if (!row || row.length < 10) continue;

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
          await saveToSupabase('capcar', q, items, setProgressCapCar);
        }
        
        if (onImportCapCar) await onImportCapCar(enrichedData);

        const qTotal = Object.keys(grouped).length > 0 ? Object.keys(grouped)[0] : 'GERAL';
        await registrarImportacao('CAP', qTotal, enrichedData.length);
        await supabase.rpc('rpc_refresh_materialized_views');

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
      const headerRowIdx = 0;
      const idxData = 0;         // A
      const idxSvc = 2;          // C
      const idxFilial = 3;       // D
      const idxIdRota = 5;       // F
      const idxQuinzena = 7;     // H
      const idxCluster = 8;      // I
      const idxDriverId = 9;     // J
      
      const idxSaldo = 22;       // W
      const idxEntregues = 23;   // X
      
      const idxRegional = 38;
      const idxSupervisor = 39;
      const idxMotorista = 12;
      const idxDiaSemana = 40;

      if (headerRowIdx === -1) {
        addLog('Erro: Cabeçalhos obrigatórios não encontrados no BSC.', 'error');
        setIsProcessingBsc(false);
        return;
      }

      const row = dataArray[headerRowIdx];
      const insucessosHeaders = [];
      for (let j = 27; j <= 34; j++) {
        const headerName = (row && row[j] && String(row[j]).trim() !== '') ? String(row[j]).trim() : `Insucesso_${j}`;
        insucessosHeaders.push({ index: j, name: headerName });
      }

      const parsedData = [];
      setProgressBsc('Processando linhas do BSC...');

      const configMap = {};
      mapeamentoFiliais.forEach(m => configMap[String(m.filial).toUpperCase()] = m);

      const parseDateInfo = (dateStr) => {
        if (!dateStr) return { quinzena: null, dataPadrao: 'N/A', diaSemanaTexto: 'N/A' };
        let d;
        const txtMatch = String(dateStr).match(/^(\d{1,2})[\s\-de]+([a-zA-Z]{3,})/i);
        if (txtMatch) {
            const day = parseInt(txtMatch[1]);
            const monthStr = txtMatch[2].toLowerCase().substring(0, 3);
            const months = { jan:0, fev:1, mar:2, abr:3, mai:4, may:4, jun:5, jul:6, ago:7, aug:7, set:8, sep:8, out:9, oct:9, nov:10, dez:11, dec:11 };
            const m = months[monthStr];
            if (m !== undefined) {
               d = new Date(new Date().getFullYear(), m, day);
            }
        } else {
            const brMatch = String(dateStr).match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
            if (brMatch) {
              d = new Date(parseInt(brMatch[3]), parseInt(brMatch[2]) - 1, parseInt(brMatch[1]));
            } else {
              d = new Date(dateStr);
            }
        }
        
        if (!d || isNaN(d.getTime())) {
           const serial = Number(dateStr);
           if (!isNaN(serial) && serial > 10000) {
              d = new Date((serial - 25569) * 86400 * 1000);
              d.setMinutes(d.getMinutes() + d.getTimezoneOffset());
           }
        }

        if (!d || isNaN(d.getTime())) return { quinzena: null, dataPadrao: String(dateStr).trim(), diaSemanaTexto: 'N/A' };

        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const q = d.getDate() <= 15 ? 'Q1' : 'Q2';
        
        const dd = String(d.getDate()).padStart(2, '0');
        const dataPadrao = `${dd}/${m}/${y}`;
        
        const diasSemana = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
        const diaSemanaTexto = diasSemana[d.getDay()];

        return { quinzena: `${y}${m}${q}`, dataPadrao, diaSemanaTexto };
      };

      for (let i = headerRowIdx + 1; i < dataArray.length; i++) {
        const r = dataArray[i];
        if (!r) continue;
        
        const filialRaw = idxFilial !== -1 ? String(r[idxFilial] || '') : 'N/A';
        if (!filialRaw || filialRaw.trim().toUpperCase() === '#N/A' || filialRaw.trim() === '') continue;
        let filial = filialRaw.trim();

        let quinzena = 'GERAL';
        let dataPadrao = 'N/A';
        let parsedDiaSemana = 'N/A';
        
        if (idxData !== -1 && r[idxData]) {
           const info = parseDateInfo(String(r[idxData]).trim());
           if (info.quinzena) quinzena = info.quinzena;
           if (info.dataPadrao) dataPadrao = info.dataPadrao;
           if (info.diaSemanaTexto) parsedDiaSemana = info.diaSemanaTexto;
        }
        
        if (quinzenaBsc.trim()) quinzena = quinzenaBsc.trim();
        else if (quinzena === 'GERAL' && idxQuinzena !== -1 && r[idxQuinzena]) {
           quinzena = String(r[idxQuinzena]).trim();
        }
        
        const id_rota = idxIdRota !== -1 && r[idxIdRota] && String(r[idxIdRota]).trim() !== '' ? String(r[idxIdRota]).trim() : '-';

        let fKey = filial.toUpperCase();
        let config = configMap[fKey];
        
        if (!config && idxSvc !== -1) {
          const svcRaw = String(r[idxSvc] || '').trim();
          if (svcRaw && svcRaw.toUpperCase() !== '#N/A' && svcRaw !== '') {
            filial = svcRaw;
            fKey = filial.toUpperCase();
            config = configMap[fKey];
          }
        }
        
        let regional = config ? config.regional : (idxRegional !== -1 && r[idxRegional] ? String(r[idxRegional]).trim() : 'N/A');
        let supervisor = config ? config.supervisor : (idxSupervisor !== -1 && r[idxSupervisor] ? String(r[idxSupervisor]).trim() : 'N/A');

        if (!config && id_rota !== '-') {
          const opMatch = rawOperacionalData.find(op => op.id_rota === id_rota);
          if (opMatch && opMatch.filial && opMatch.filial !== 'N/A') {
            filial = opMatch.filial;
            regional = opMatch.regional;
            supervisor = opMatch.supervisor;
          }
        }
        
        const clusterRaw = idxCluster !== -1 && r[idxCluster] ? String(r[idxCluster]).trim() : '';
        const cluster = clusterRaw && clusterRaw !== '-' && clusterRaw.toUpperCase() !== 'N/A' ? clusterRaw : 'Ambulâncias';
        
        let motorista = idxMotorista !== -1 && r[idxMotorista] && String(r[idxMotorista]).trim() !== '' ? String(r[idxMotorista]).trim() : 'N/A';
        const driverId = idxDriverId !== -1 && r[idxDriverId] ? String(r[idxDriverId]).trim() : '';

        if (driverId && driverId !== '-' && driverId.toUpperCase() !== 'N/A') {
          const opMatch = rawOperacionalData.find(op => String(op.driver_id).trim() === driverId);
          if (opMatch && opMatch.motorista && opMatch.motorista !== 'N/A') {
            motorista = opMatch.motorista;
          }
        }

        const parseNum = (val) => {
          if (!val) return 0;
          let s = String(val).replace(/[^\d,.-]/g, '');
          if (s.includes(',') && s.includes('.')) {
            s = s.lastIndexOf(',') > s.lastIndexOf('.') ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
          } else if (s.includes(',')) s = s.replace(',', '.');
          return parseFloat(s) || 0;
        };

        const saldoOriginal = idxSaldo !== -1 ? parseNum(r[idxSaldo]) : 0;
        const entregues = idxEntregues !== -1 ? parseNum(r[idxEntregues]) : 0;

        const insucessosDetalhados = {};
        insucessosHeaders.forEach(h => {
          const v = parseNum(r[h.index]);
          if (v > 0) insucessosDetalhados[h.name] = v;
        });

        let saldo = Math.max(0, saldoOriginal);
        const dia_semana = parsedDiaSemana !== 'N/A' ? parsedDiaSemana : (idxDiaSemana !== -1 && r[idxDiaSemana] ? String(r[idxDiaSemana]).trim() : 'N/A');

        const somaIns = Object.values(insucessosDetalhados).reduce((a, b) => a + b, 0);
        if (saldo > 0 || entregues > 0 || somaIns > 0) {
          parsedData.push({ quinzena, dia_semana, regional, supervisor, filial, motorista, id_rota, saldo, entregues, insucessosDetalhados });
        }
      }

      try {
        const grouped = {};
        parsedData.forEach(d => {
          if (!grouped[d.quinzena]) grouped[d.quinzena] = [];
          grouped[d.quinzena].push(d);
        });

        for (const [q, items] of Object.entries(grouped)) {
          await saveToSupabase('bsc', q, items, setProgressBsc);
        }

        if (onImportOperacionalBSC) await onImportOperacionalBSC(parsedData);

        const qTotal = Object.keys(grouped).length > 0 ? Object.keys(grouped)[0] : 'GERAL';
        await registrarImportacao('BSC', qTotal, parsedData.length);
        await supabase.rpc('rpc_refresh_materialized_views');

        setBscFile(null);
        setProgressBsc('Concluído!');
        setTimeout(() => setIsProcessingBsc(false), 2000);
      } catch (err) {
        console.error("Erro ao processar BSC:", err);
        setProgressBsc(`Erro: ${err.message}`);
        setIsProcessingBsc(false);
      }
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

  // ============================================================================
  // ETAPA 7: DISPONIBILIDADE
  // ============================================================================
  const handleProcessDispFile = () => {
    if (!dispFile) return;
    
    setIsProcessingDisp(true);
    setProgressDisp('Lendo arquivo...');
    addLog(`Iniciando processamento da planilha de disponibilidade: ${dispFile.name}`, 'info');

    const processData = async (dataArray) => {
      try {
        let headerRowIdx = -1;
        for (let i = 0; i < Math.min(15, dataArray.length); i++) {
          if (dataArray[i] && dataArray[i].some(c => String(c).toUpperCase() === 'PLACA' || String(c).toUpperCase() === 'MODAL')) {
            headerRowIdx = i; break;
          }
        }

        if (headerRowIdx === -1) {
          addLog("Cabeçalho não encontrado na planilha de disponibilidade.", 'error');
          setIsProcessingDisp(false);
          return;
        }

        const rawHeaders = dataArray[headerRowIdx].map(h => {
          let text = String(h || '').trim();
          if (/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(text)) return text.substring(0, 5);
          return text;
        });
        
        const dates = rawHeaders.filter(h => /^\d{1,2}\/\d{1,2}$/.test(h));

        const wMap = new Map();
        dates.forEach(d => {
          const weekStart = getInicioDaSemana(d);
          if (weekStart) {
             if (!wMap.has(weekStart)) wMap.set(weekStart, []);
             wMap.get(weekStart).push(d);
          }
        });
        const weeksArray = Array.from(wMap.entries()).map(([inicio, dias]) => ({ inicio, dias }));

        const idxPlaca = rawHeaders.findIndex(h => h.toUpperCase() === 'PLACA');
        const idxModal = rawHeaders.findIndex(h => h.toUpperCase() === 'MODAL');
        const idxXPT = rawHeaders.findIndex(h => h.toUpperCase() === 'XPT' || h.toUpperCase() === 'FILIAL');

        const parsed = [];

        for (let i = headerRowIdx + 1; i < dataArray.length; i++) {
          const row = dataArray[i];
          if (!row || row.length === 0) continue;
          const placa = row[idxPlaca] ? String(row[idxPlaca]).trim() : '';
          if (!placa) continue;

          const modal = idxModal !== -1 && row[idxModal] ? String(row[idxModal]).trim() : 'N/A';
          const filial = idxXPT !== -1 && row[idxXPT] ? String(row[idxXPT]).trim() : 'N/A';

          let ociosoConsecutivo = 0;
          const timeline = dates.map(date => {
            const colIdx = rawHeaders.indexOf(date);
            const valor = String(row[colIdx] || '').trim();
            const rodou = valor !== '' && valor.toUpperCase() !== '-NÃO INFORMADO-' && valor.toUpperCase() !== '-NAO INFORMADO-' && valor !== '0';
            
            if (!rodou) ociosoConsecutivo++; else ociosoConsecutivo = 0;

            return { data: date, rodou, ociosoConsecutivo, valorOriginal: valor };
          });

          parsed.push({ placa, modal, filial, timeline });
        }

        const mergedMap = new Map();
        parsed.forEach(p => {
          if (mergedMap.has(p.placa)) {
             const existing = mergedMap.get(p.placa);
             if (p.filial && p.filial !== 'N/A') existing.filial = p.filial;
             if (p.modal && p.modal !== 'N/A') existing.modal = p.modal;
             p.timeline.forEach(t => existing.timelineMap.set(t.data, { data: t.data, rodou: t.rodou, valorOriginal: t.valorOriginal }));
          } else {
             mergedMap.set(p.placa, { ...p, timelineMap: new Map(p.timeline.map(t => [t.data, { data: t.data, rodou: t.rodou, valorOriginal: t.valorOriginal }])) });
          }
        });

        const allDatesSet = new Set();
        mergedMap.forEach(v => v.timelineMap.forEach((_, dateStr) => allDatesSet.add(dateStr)));
        const allDatesArray = Array.from(allDatesSet).sort((a, b) => {
           const [d1, m1] = a.split('/'); const [d2, m2] = b.split('/');
           const currentYear = ANO_REFERENCIA;
           return new Date(currentYear, parseInt(m1)-1, parseInt(d1)) - new Date(currentYear, parseInt(m2)-1, parseInt(d2));
        });

        const wMapGlobal = new Map();
        allDatesArray.forEach(d => {
          const weekStart = getInicioDaSemana(d);
          if (weekStart) {
             if (!wMapGlobal.has(weekStart)) wMapGlobal.set(weekStart, []);
             wMapGlobal.get(weekStart).push(d);
          }
        });
        const globalWeeksArray = Array.from(wMapGlobal.entries()).map(([inicio, dias]) => ({ inicio, dias }));
        
        let autoRef = 'Referência Desconhecida';
        if (globalWeeksArray.length > 0) {
           const sortedWeeks = globalWeeksArray.map(w => parseInt(w.inicio.replace('W', ''))).sort((a,b) => a - b);
           if (sortedWeeks.length === 1) autoRef = `Semana W${sortedWeeks[0]}`;
           else autoRef = `Semanas W${sortedWeeks[0]} a W${sortedWeeks[sortedWeeks.length - 1]}`;
        }

        const finalDataToSave = [];

        mergedMap.forEach(v => {
           let ocioso = 0;
           const newTimeline = allDatesArray.map(date => {
              const t = v.timelineMap.get(date);
              if (t) {
                 if (!t.rodou) ocioso++; else ocioso = 0;
                 return { ...t, ociosoConsecutivo: ocioso };
              } else {
                 ocioso++;
                 return { data: date, rodou: false, ociosoConsecutivo: ocioso, valorOriginal: '' };
              }
           });

           const newMetas = globalWeeksArray.map(w => {
             let diasRodados = 0;
             w.dias.forEach(d => {
               const info = newTimeline.find(t => t.data === d);
               if (info && info.rodou) diasRodados++;
             });
             return { semanaInicio: w.inicio, diasRodados, totalDiasAmostra: w.dias.length, bateuMeta: diasRodados >= 6 };
           });

           finalDataToSave.push({
             placa: v.placa,
             modal: v.modal,
             filial: v.filial,
             timeline: newTimeline,
             metas_semana: newMetas,
             dias_parado_atual: ocioso,
             bateu_todas_metas: newMetas.length > 0 ? newMetas.every(m => m.bateuMeta) : false,
             referencia: autoRef
           });
        });

        setProgressDisp('Salvando no banco de dados...');
        
        await supabase.from('disponibilidade_frota').delete().eq('referencia', autoRef);
        
        for (let i = 0; i < finalDataToSave.length; i += CHUNK_SIZE) {
          const chunk = finalDataToSave.slice(i, i + CHUNK_SIZE);
          await supabase.from('disponibilidade_frota').insert(chunk);
          setProgressDisp(`Processando linhas ${Math.min(i + CHUNK_SIZE, finalDataToSave.length)} de ${finalDataToSave.length}...`);
        }

        addLog('Registrando no histórico de importações...', 'info');
        await registrarImportacao('Disponibilidade de Frota', autoRef, finalDataToSave.length);
        addLog('Processamento da disponibilidade de frota concluído com sucesso!', 'success');
        
        setDispFile(null);
      } catch (err) {
        console.error("Erro ao salvar no Supabase", err);
        addLog(`Erro crítico ao processar: ${err.message}`, 'error');
      } finally {
        setIsProcessingDisp(false);
        setProgressDisp('');
      }
    };

    if (dispFile.name.toLowerCase().endsWith('.csv')) {
      Papa.parse(dispFile, { skipEmptyLines: true, worker: true, complete: (res) => processData(res.data), error: (err) => { addLog(err.message, 'error'); setIsProcessingDisp(false); } });
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const workbook = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
          const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1, raw: false, dateNF: 'dd/mm' });
          processData(jsonData);
        } catch (err) { addLog(err.message, 'error'); setIsProcessingDisp(false); }
      };
      reader.readAsArrayBuffer(dispFile);
    }
  };

  const downloadTemplateRetaguarda = () => {
    const ws = XLSX.utils.json_to_sheet([{
      Quinzena: "202610Q1",
      Filial: "SPO",
      "Nome do colaborador": "João Silva",
      Documento: "111.222.333-44",
      "Valor Pago": 1500.50
    }]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template_Retaguarda");
    XLSX.writeFile(wb, "template_retaguarda.xlsx");
  };

  const salvarRetaguardaManual = async (e) => {
    e.preventDefault();
    if (!retQuinzenaManual || !retFilialManual || !retValorManual) {
      addLog("Preencha ao menos Quinzena, Filial e Valor Pago.", 'error');
      return;
    }
    setIsProcessingRetaguarda(true);
    setProgressRetaguarda('Salvando...');

    try {
      let valorNum = parseFloat(retValorManual.toString().replace(',', '.'));
      if (isNaN(valorNum)) valorNum = 0;

      const dataToSave = {
        quinzena: retQuinzenaManual.trim().toUpperCase(),
        filial: retFilialManual.trim().toUpperCase(),
        nome_colaborador: retNomeManual.trim(),
        documento: retDocManual.trim(),
        valor_pago: valorNum,
        dados_originais: { manual_entry: true }
      };

      const { error } = await supabase.from('retaguarda').insert([dataToSave]);
      if (error) throw error;

      await registrarImportacao('Retaguarda (Manual)', dataToSave.quinzena, 1);
      
      addLog(`Registro manual salvo com sucesso para a filial ${dataToSave.filial}.`, 'success');
      
      setRetQuinzenaManual('');
      setRetFilialManual('');
      setRetNomeManual('');
      setRetDocManual('');
      setRetValorManual('');
    } catch (err) {
      console.error(err);
      addLog(`Erro ao salvar retaguarda manual: ${err.message}`, 'error');
    } finally {
      setIsProcessingRetaguarda(false);
      setProgressRetaguarda('');
    }
  };

  const parseRetaguarda = async () => {
    if (!retaguardaFile) {
      addLog("Selecione um arquivo de retaguarda.", 'error');
      return;
    }
    setIsProcessingRetaguarda(true);
    setProgressRetaguarda('Lendo arquivo...');
    addLog(`Lendo arquivo ${retaguardaFile.name}...`, 'info');

    const processData = async (data) => {
      try {
        if (!data || data.length < 2) throw new Error("Arquivo vazio ou sem dados.");
        
        const header = data[0].map(h => String(h || '').trim().toLowerCase());
        const quinzenaIdx = header.findIndex(h => h.includes('quinzena'));
        const filialIdx = header.findIndex(h => h === 'filial' || h.includes('centro') || h.includes('custo'));
        const nomeIdx = header.findIndex(h => h.includes('nome') || h.includes('colaborador'));
        const docIdx = header.findIndex(h => h.includes('documento') || h.includes('cpf') || h.includes('cnpj'));
        const valorIdx = header.findIndex(h => h.includes('valor'));

        if (quinzenaIdx === -1 || filialIdx === -1 || valorIdx === -1) {
            throw new Error(`Não encontramos as colunas necessárias (Quinzena, Filial, Valor Pago). Cabeçalho encontrado: ${header.join(', ')}`);
        }

        const validRows = data.slice(1).filter(r => r && r[quinzenaIdx] && r[valorIdx]);
        
        const finalDataToSave = validRows.map(row => {
          let valStr = String(row[valorIdx] || '0').replace('R$', '').replace(/\./g, '').replace(',', '.').trim();
          let valorNum = parseFloat(valStr);
          if (isNaN(valorNum)) valorNum = 0;

          return {
            quinzena: String(row[quinzenaIdx] || '').trim(),
            filial: String(row[filialIdx] || '').trim(),
            nome_colaborador: nomeIdx !== -1 ? String(row[nomeIdx] || '').trim() : '',
            documento: docIdx !== -1 ? String(row[docIdx] || '').trim() : '',
            valor_pago: valorNum,
            dados_originais: cleanUndefined(row)
          };
        });

        if (finalDataToSave.length === 0) throw new Error("Nenhum dado válido extraído.");

        setProgressRetaguarda('Salvando no Supabase...');
        addLog(`Inserindo ${finalDataToSave.length} registros de retaguarda no Supabase...`, 'info');

        for (let i = 0; i < finalDataToSave.length; i += CHUNK_SIZE) {
            const chunk = finalDataToSave.slice(i, i + CHUNK_SIZE);
            const { error } = await supabase.from('retaguarda').insert(chunk);
            if (error) throw error;
        }

        const quinzenaBase = finalDataToSave[0].quinzena;
        await registrarImportacao('Retaguarda', quinzenaBase, finalDataToSave.length);

        setProgressRetaguarda('');
        setRetaguardaFile(null);
        addLog(`Sucesso! ${finalDataToSave.length} despesas de retaguarda importadas.`, 'success');
      } catch (e) {
        console.error(e);
        addLog(`Erro ao importar retaguarda: ${e.message}`, 'error');
      } finally {
        setIsProcessingRetaguarda(false);
      }
    };

    if (retaguardaFile.name.endsWith('.csv')) {
      Papa.parse(retaguardaFile, {
        complete: (results) => processData(results.data),
        error: (err) => { addLog(`Erro ao ler CSV: ${err.message}`, 'error'); setIsProcessingRetaguarda(false); }
      });
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const workbook = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
          const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1, raw: false, dateNF: 'dd/mm' });
          processData(jsonData);
        } catch (err) { addLog(err.message, 'error'); setIsProcessingRetaguarda(false); }
      };
      reader.readAsArrayBuffer(retaguardaFile);
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 bg-slate-900 min-h-full">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="mb-8">
          <h1 className="text-2xl md:text-3xl font-black text-white flex items-center gap-3">
            <Database className="w-8 h-8 text-blue-500" />
            Importação PostgreSQL (Supabase)
          </h1>
          <p className="text-slate-400 mt-2 text-sm">O processamento usará o Bulk Insert para carregar dados massivos diretamente no banco relacional Supabase.</p>
        </header>

        <div className="flex gap-2 mb-6 flex-wrap">
          <button onClick={() => setActiveStep(1)} className={`px-4 py-2 text-sm font-bold rounded-xl ${activeStep === 1 ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'}`}>1. Operacional</button>
          {!isImporter && (
            <>
              <button onClick={() => setActiveStep(2)} className={`px-4 py-2 text-sm font-bold rounded-xl ${activeStep === 2 ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'}`}>2. Billing</button>
              <button onClick={() => setActiveStep(3)} className={`px-4 py-2 text-sm font-bold rounded-xl ${activeStep === 3 ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'}`}>3. CAP</button>
            </>
          )}
          <button onClick={() => setActiveStep(4)} className={`px-4 py-2 text-sm font-bold rounded-xl ${activeStep === 4 ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'}`}>4. BSC</button>
          <button onClick={() => setActiveStep(9)} className={`px-4 py-2 text-sm font-bold rounded-xl ${activeStep === 9 ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'}`}>5. Retaguarda</button>
          <button onClick={() => setActiveStep(7)} className={`px-4 py-2 text-sm font-bold rounded-xl ${activeStep === 7 ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'}`}>7. Disponibilidade</button>
          <button onClick={() => setActiveStep(5)} className={`px-4 py-2 text-sm font-bold rounded-xl flex items-center gap-2 ${activeStep === 5 ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
             Histórico
          </button>
          <button onClick={() => setActiveStep(6)} className={`px-4 py-2 text-sm font-bold rounded-xl flex items-center gap-2 ${activeStep === 6 ? 'bg-red-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
             <AlertTriangle className="w-4 h-4" /> Rotas Pendentes
          </button>
          {isAdmin && (
            <button
              onClick={() => setActiveStep(8)}
              className={`px-4 py-2 font-bold whitespace-nowrap border-b-2 transition-colors flex items-center gap-2 ${activeStep === 8 ? 'border-orange-500 text-orange-400' : 'border-transparent text-slate-400 hover:text-slate-300'}`}
            >
              <Database className="w-4 h-4" /> Gestão de Dados
            </button>
          )}
        </div>

        <div className="bg-slate-800 rounded-3xl p-6 border border-slate-700">
          {activeStep === 1 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-black text-white flex items-center gap-3"><Box className="w-6 h-6 text-blue-400" /> Operacional</h2>
              </div>
              
              <div className="bg-slate-900/50 p-5 rounded-2xl border border-slate-700/50 space-y-4">
                <div className="flex flex-col gap-3">
                  <div className="flex gap-4 p-1 bg-slate-800 rounded-xl w-fit">
                    <button onClick={() => setIsOpMulti(false)} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${!isOpMulti ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}>Padrão (1 Quinzena)</button>
                    <button onClick={() => setIsOpMulti(true)} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${isOpMulti ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`} title="A planilha deve ter uma coluna com a palavra QUINZENA">Multi-Quinzena</button>
                  </div>
                  
                  <label className="flex items-center gap-3 text-emerald-400 text-sm cursor-pointer hover:text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl w-fit">
                    <input type="checkbox" checked={isOpPartial} onChange={(e) => setIsOpPartial(e.target.checked)} className="w-4 h-4 accent-emerald-500 rounded" /> 
                    <span className="font-medium">Modo Arquivo Parcial (Apenas adicionar, sem apagar os existentes)</span>
                  </label>
                </div>
                
                {!isOpMulti && (
                  <div className="w-full md:w-1/2">
                    <label className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Quinzena</label>
                    <input type="text" placeholder="Ex: 202603Q1" value={quinzenaOp} onChange={e => setQuinzenaOp(e.target.value)} className="bg-slate-800 border border-slate-600 text-white rounded-xl px-4 py-3 w-full focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all" />
                  </div>
                )}
              </div>

              {!baseFile ? (
                <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-slate-700 border-dashed rounded-3xl cursor-pointer bg-slate-900/30 hover:bg-slate-800/50 hover:border-blue-500 transition-all group">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <div className="bg-blue-500/10 p-4 rounded-full mb-4 group-hover:scale-110 transition-transform">
                      <UploadCloud className="w-8 h-8 text-blue-400" />
                    </div>
                    <p className="mb-2 text-sm text-slate-300"><span className="font-bold text-white">Clique para fazer upload</span> ou arraste e solte</p>
                    <p className="text-xs text-slate-500 font-medium">CSV ou XLSX (Max. 50MB)</p>
                  </div>
                  <input type="file" accept=".csv, .xlsx" onChange={e => setBaseFile(e.target.files[0])} style={{ display: 'none' }} />
                </label>
              ) : (
                <div className="bg-slate-900/30 border border-slate-700 p-5 rounded-2xl">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="bg-blue-500/20 p-3 rounded-xl">
                        <FileSpreadsheet className="w-6 h-6 text-blue-400" />
                      </div>
                      <div>
                        <p className="text-white font-bold">{baseFile.name}</p>
                        <p className="text-slate-400 text-xs mt-1">Pronto para processar</p>
                      </div>
                    </div>
                    <button onClick={() => setBaseFile(null)} className="p-2 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded-lg transition-colors">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                  <button onClick={handleProcessOperacional} disabled={isProcessingOp} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20">
                    {isProcessingOp ? <><Loader2 className="w-5 h-5 animate-spin" /> Processando...</> : 'Iniciar Processamento'}
                  </button>
                  {progressOp && (
                    <div className="mt-4 p-3 bg-blue-500/10 rounded-lg border border-blue-500/20 flex items-center gap-3">
                       {isProcessingOp && <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />}
                       <span className="text-blue-400 text-sm font-medium">{progressOp}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          {activeStep === 2 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-black text-white flex items-center gap-3"><DollarSign className="w-6 h-6 text-emerald-400" /> Billing</h2>
              </div>
              
              <div className="bg-slate-900/50 p-5 rounded-2xl border border-slate-700/50 space-y-4">
                <div className="flex flex-col sm:flex-row gap-4 w-full">
                  <div className="flex-1">
                    <label className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Quinzena</label>
                    <input type="text" placeholder="Ex: 202603Q1" value={quinzenaBilling} onChange={e => setQuinzenaBilling(e.target.value)} className="bg-slate-800 border border-slate-600 text-white rounded-xl px-4 py-3 w-full focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all" />
                  </div>
                  <div className="flex-1">
                    <label className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Número da Fatura</label>
                    <input type="text" placeholder="Ex: 6288671" value={numeroFaturaBilling} onChange={e => setNumeroFaturaBilling(e.target.value)} className="bg-slate-800 border border-slate-600 text-white rounded-xl px-4 py-3 w-full focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all" />
                  </div>
                </div>
              </div>

              {!billingFile ? (
                <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-slate-700 border-dashed rounded-3xl cursor-pointer bg-slate-900/30 hover:bg-slate-800/50 hover:border-emerald-500 transition-all group">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <div className="bg-emerald-500/10 p-4 rounded-full mb-4 group-hover:scale-110 transition-transform">
                      <UploadCloud className="w-8 h-8 text-emerald-400" />
                    </div>
                    <p className="mb-2 text-sm text-slate-300"><span className="font-bold text-white">Clique para fazer upload</span> ou arraste e solte</p>
                    <p className="text-xs text-slate-500 font-medium">CSV ou XLSX (Max. 50MB)</p>
                  </div>
                  <input type="file" accept=".csv, .xlsx" onChange={e => {
                    const file = e.target.files[0];
                    setBillingFile(file);
                    if (file) {
                      const match = file.name.match(/#(\d+)/);
                      if (match) {
                        setNumeroFaturaBilling(match[1]);
                      }
                    }
                  }} style={{ display: 'none' }} />
                </label>
              ) : (
                <div className="bg-slate-900/30 border border-slate-700 p-5 rounded-2xl flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="bg-emerald-500/20 p-3 rounded-xl">
                        <FileSpreadsheet className="w-6 h-6 text-emerald-400" />
                      </div>
                      <div>
                        <p className="text-white font-bold">{billingFile.name}</p>
                        <p className="text-slate-400 text-xs mt-1">Pronto para processar</p>
                      </div>
                    </div>
                    <button onClick={() => setBillingFile(null)} className="p-2 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded-lg transition-colors">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                  
                  <button onClick={handleProcessBilling} disabled={isProcessingBilling} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20">
                    {isProcessingBilling ? <><Loader2 className="w-5 h-5 animate-spin" /> Processando...</> : 'Processar Billing'}
                  </button>
                  
                  {progressBilling && (
                    <div className="p-4 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20 flex items-center gap-3">
                      {isProcessingBilling && <Loader2 className="w-4 h-4 animate-spin" />}
                      <span className="text-sm font-medium">{progressBilling}</span>
                    </div>
                  )}
                  
                  {missingRoutesBilling && (
                    <div className="bg-red-500/10 p-6 rounded-2xl border border-red-500/20 mt-2 animate-in fade-in slide-in-from-bottom-2">
                      <h3 className="text-red-400 font-bold mb-3 flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5" />
                        Rotas não identificadas no Operacional ({missingRoutesBilling.length} IDs únicos)
                      </h3>
                      <p className="text-slate-300 text-sm mb-4">
                        Estas rotas precisam ser cadastradas na planilha de Base Operacional. Você pode copiar a lista abaixo, corrigir e realizar a importação novamente:
                      </p>
                      <div className="bg-slate-900 rounded-xl p-4 border border-slate-700 max-h-40 overflow-y-auto font-mono text-xs text-slate-400">
                        {missingRoutesBilling.join(', ')}
                      </div>
                      <button 
                        onClick={() => navigator.clipboard.writeText(missingRoutesBilling.join('\n'))}
                        className="mt-4 bg-red-500/20 hover:bg-red-500/30 text-red-400 px-4 py-2 rounded-lg text-sm font-bold transition-colors border border-red-500/30"
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
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-black text-white flex items-center gap-3"><LayoutList className="w-6 h-6 text-purple-400" /> CAP</h2>
              </div>
              
              {!capcarFile ? (
                <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-slate-700 border-dashed rounded-3xl cursor-pointer bg-slate-900/30 hover:bg-slate-800/50 hover:border-purple-500 transition-all group">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <div className="bg-purple-500/10 p-4 rounded-full mb-4 group-hover:scale-110 transition-transform">
                      <UploadCloud className="w-8 h-8 text-purple-400" />
                    </div>
                    <p className="mb-2 text-sm text-slate-300"><span className="font-bold text-white">Clique para fazer upload</span> ou arraste e solte</p>
                    <p className="text-xs text-slate-500 font-medium">CSV ou XLSX (Max. 50MB)</p>
                  </div>
                  <input type="file" accept=".csv, .xlsx" onChange={e => setCapcarFile(e.target.files[0])} style={{ display: 'none' }} />
                </label>
              ) : (
                <div className="bg-slate-900/30 border border-slate-700 p-5 rounded-2xl flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="bg-purple-500/20 p-3 rounded-xl">
                        <FileSpreadsheet className="w-6 h-6 text-purple-400" />
                      </div>
                      <div>
                        <p className="text-white font-bold">{capcarFile.name}</p>
                        <p className="text-slate-400 text-xs mt-1">Pronto para processar</p>
                      </div>
                    </div>
                    <button onClick={() => setCapcarFile(null)} className="p-2 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded-lg transition-colors">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                  
                  <button onClick={handleProcessCapCar} disabled={isProcessingCapCar} className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3.5 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-purple-500/20">
                    {isProcessingCapCar ? <><Loader2 className="w-5 h-5 animate-spin" /> Processando...</> : 'Iniciar Processamento'}
                  </button>
                  
                  {progressCapCar && (
                    <div className="p-4 bg-purple-500/10 text-purple-400 rounded-xl border border-purple-500/20 flex items-center gap-3">
                      {isProcessingCapCar && <Loader2 className="w-4 h-4 animate-spin" />}
                      <span className="text-sm font-medium">{progressCapCar}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          {activeStep === 4 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-black text-white flex items-center gap-3"><Box className="w-6 h-6 text-orange-400" /> BSC</h2>
              </div>
              
              <div className="bg-slate-900/50 p-5 rounded-2xl border border-slate-700/50 space-y-4">
                <div className="w-full md:w-1/2">
                  <label className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Quinzena (Opcional)</label>
                  <input type="text" placeholder="Deixe em branco para extrair da coluna Data" value={quinzenaBsc} onChange={e => setQuinzenaBsc(e.target.value)} className="bg-slate-800 border border-slate-600 text-white rounded-xl px-4 py-3 w-full focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition-all placeholder:text-slate-500" />
                  <p className="text-[10px] text-slate-500 mt-2 font-medium">Se houver uma coluna "Data", o sistema dividirá automaticamente o arquivo em YYYYMMQ1 e YYYYMMQ2. Preencha apenas se quiser forçar uma quinzena específica para todas as rotas do arquivo.</p>
                </div>
              </div>

              {!bscFile ? (
                <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-slate-700 border-dashed rounded-3xl cursor-pointer bg-slate-900/30 hover:bg-slate-800/50 hover:border-orange-500 transition-all group">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <div className="bg-orange-500/10 p-4 rounded-full mb-4 group-hover:scale-110 transition-transform">
                      <UploadCloud className="w-8 h-8 text-orange-400" />
                    </div>
                    <p className="mb-2 text-sm text-slate-300"><span className="font-bold text-white">Clique para fazer upload</span> ou arraste e solte</p>
                    <p className="text-xs text-slate-500 font-medium">CSV ou XLSX (Max. 50MB)</p>
                  </div>
                  <input type="file" accept=".csv, .xlsx" onChange={e => setBscFile(e.target.files[0])} style={{ display: 'none' }} />
                </label>
              ) : (
                <div className="bg-slate-900/30 border border-slate-700 p-5 rounded-2xl flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="bg-orange-500/20 p-3 rounded-xl">
                        <FileSpreadsheet className="w-6 h-6 text-orange-400" />
                      </div>
                      <div>
                        <p className="text-white font-bold">{bscFile.name}</p>
                        <p className="text-slate-400 text-xs mt-1">Pronto para processar</p>
                      </div>
                    </div>
                    <button onClick={() => setBscFile(null)} className="p-2 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded-lg transition-colors">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                  
                  <button onClick={handleProcessBsc} disabled={isProcessingBsc} className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold py-3.5 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20">
                    {isProcessingBsc ? <><Loader2 className="w-5 h-5 animate-spin" /> Processando...</> : 'Iniciar Processamento'}
                  </button>
                  
                  {progressBsc && (
                    <div className="p-4 bg-orange-500/10 text-orange-400 rounded-xl border border-orange-500/20 flex items-center gap-3">
                      {isProcessingBsc && <Loader2 className="w-4 h-4 animate-spin" />}
                      <span className="text-sm font-medium">{progressBsc}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          {activeStep === 9 && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h2 className="text-2xl font-black text-white flex items-center gap-3"><DollarSign className="w-6 h-6 text-emerald-500" /> Custos de Retaguarda</h2>
                <div className="flex flex-wrap items-center gap-2">
                  <button onClick={downloadTemplateRetaguarda} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-bold rounded-xl transition-colors flex items-center gap-2 border border-slate-700">
                    <Download className="w-4 h-4" /> Template
                  </button>
                  <button onClick={() => setIsManualRetaguarda(false)} className={`px-4 py-2 text-sm font-bold rounded-xl transition-colors border ${!isManualRetaguarda ? 'bg-emerald-600/20 text-emerald-400 border-emerald-500/30' : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'}`}>Upload</button>
                  <button onClick={() => setIsManualRetaguarda(true)} className={`px-4 py-2 text-sm font-bold rounded-xl transition-colors border ${isManualRetaguarda ? 'bg-emerald-600/20 text-emerald-400 border-emerald-500/30' : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'}`}>Manual</button>
                </div>
              </div>
              
              {!isManualRetaguarda ? (
                <>
                  {!retaguardaFile ? (
                    <div className="border-2 border-dashed border-slate-700/50 rounded-2xl p-10 text-center hover:bg-slate-800/50 transition-colors group cursor-pointer relative">
                      <input type="file" accept=".csv, .xlsx, .xls" onChange={(e) => setRetaguardaFile(e.target.files[0])} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <div className="bg-emerald-500/10 p-4 rounded-full mb-4 group-hover:scale-110 transition-transform">
                          <UploadCloud className="w-8 h-8 text-emerald-400" />
                        </div>
                        <p className="text-lg text-slate-300 font-medium mb-2">Arraste a planilha de Retaguarda ou clique</p>
                        <p className="text-sm text-slate-500 max-w-sm mx-auto">Colunas necessárias: Quinzena, Filial, Nome do colaborador, Documento, Valor Pago.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-slate-900/30 border border-slate-700 p-5 rounded-2xl flex flex-col gap-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="bg-emerald-500/20 p-3 rounded-xl">
                            <FileSpreadsheet className="w-6 h-6 text-emerald-400" />
                          </div>
                          <div>
                            <p className="text-white font-medium">{retaguardaFile.name}</p>
                            <p className="text-sm text-slate-500">{(retaguardaFile.size / 1024).toFixed(1)} KB</p>
                          </div>
                        </div>
                        {!isProcessingRetaguarda && (
                          <button onClick={() => setRetaguardaFile(null)} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors">
                            <Trash2 className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                      
                      {isProcessingRetaguarda ? (
                        <div className="p-4 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20 flex items-center gap-3">
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span className="font-medium">{progressRetaguarda}</span>
                        </div>
                      ) : (
                        <button onClick={parseRetaguarda} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white p-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors">
                          <Database className="w-5 h-5" /> Importar para o Supabase
                        </button>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <form onSubmit={salvarRetaguardaManual} className="bg-slate-900/50 border border-slate-700/50 p-6 rounded-2xl space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Quinzena *</label>
                      <input type="text" placeholder="Ex: 202610Q1" value={retQuinzenaManual} onChange={e => setRetQuinzenaManual(e.target.value)} required className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-emerald-500 focus:outline-none transition-colors" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Filial *</label>
                      <input type="text" placeholder="Ex: SPO (ou Regional 1)" value={retFilialManual} onChange={e => setRetFilialManual(e.target.value)} required className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-emerald-500 focus:outline-none transition-colors" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Valor Pago *</label>
                      <input type="number" step="0.01" placeholder="Ex: 1500.50" value={retValorManual} onChange={e => setRetValorManual(e.target.value)} required className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-emerald-500 focus:outline-none transition-colors" />
                    </div>
                    <div className="lg:col-span-1">
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Nome (Opcional)</label>
                      <input type="text" placeholder="Nome do colaborador" value={retNomeManual} onChange={e => setRetNomeManual(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-emerald-500 focus:outline-none transition-colors" />
                    </div>
                    <div className="lg:col-span-2">
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Documento (Opcional)</label>
                      <input type="text" placeholder="CPF/CNPJ" value={retDocManual} onChange={e => setRetDocManual(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-emerald-500 focus:outline-none transition-colors" />
                    </div>
                  </div>
                  <div className="pt-4 flex justify-end">
                    <button type="submit" disabled={isProcessingRetaguarda} className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl font-bold transition-colors flex items-center gap-2">
                      {isProcessingRetaguarda ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                      Salvar Registro
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
          {activeStep === 7 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-black text-white flex items-center gap-3"><Truck className="w-6 h-6 text-emerald-500" /> Disponibilidade de Frota</h2>
              </div>
              
              {!dispFile ? (
                <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-slate-700 border-dashed rounded-3xl cursor-pointer bg-slate-900/30 hover:bg-slate-800/50 hover:border-emerald-500 transition-all group">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <div className="bg-emerald-500/10 p-4 rounded-full mb-4 group-hover:scale-110 transition-transform">
                      <UploadCloud className="w-8 h-8 text-emerald-400" />
                    </div>
                    <p className="mb-2 text-sm text-slate-300"><span className="font-bold text-white">Clique para fazer upload</span> ou arraste e solte</p>
                    <p className="text-xs text-slate-500 font-medium">CSV ou XLSX (Max. 50MB)</p>
                  </div>
                  <input type="file" accept=".csv, .xlsx" onChange={e => setDispFile(e.target.files[0])} style={{ display: 'none' }} />
                </label>
              ) : (
                <div className="bg-slate-900/30 border border-slate-700 p-5 rounded-2xl flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="bg-emerald-500/20 p-3 rounded-xl">
                        <FileSpreadsheet className="w-6 h-6 text-emerald-400" />
                      </div>
                      <div>
                        <p className="text-white font-bold">{dispFile.name}</p>
                        <p className="text-slate-400 text-xs mt-1">Pronto para processar</p>
                      </div>
                    </div>
                    <button onClick={() => setDispFile(null)} className="p-2 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded-lg transition-colors">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                  
                  <button onClick={handleProcessDispFile} disabled={isProcessingDisp} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20">
                    {isProcessingDisp ? <><Loader2 className="w-5 h-5 animate-spin" /> Processando...</> : 'Iniciar Processamento'}
                  </button>
                  
                  {progressDisp && (
                    <div className="p-4 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20 flex items-center gap-3">
                      {isProcessingDisp && <Loader2 className="w-4 h-4 animate-spin" />}
                      <span className="text-sm font-medium">{progressDisp}</span>
                    </div>
                  )}
                </div>
              )}
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
                      historico.slice((currentPageHistorico - 1) * itemsPerPage, currentPageHistorico * itemsPerPage).map(h => (
                        <tr key={h.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-4 text-white font-bold">{h.quinzena}</td>
                          <td className="py-3 px-4 text-slate-300 font-medium">{h.tipo}</td>
                          <td className="py-3 px-4 text-slate-400">{new Date(h.data_importacao).toLocaleString('pt-BR')}</td>
                          <td className="py-3 px-4 text-slate-300 text-right font-mono font-bold">{new Intl.NumberFormat('pt-BR').format(h.qtd_registros || 0)}</td>
                          <td className="py-3 px-4 text-center">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Sucesso
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              {historico.length > itemsPerPage && (
                <div className="bg-slate-800/50 border border-slate-700/50 p-3 flex items-center justify-between text-sm mt-4 rounded-xl">
                  <span className="text-slate-400">
                    Mostrando {((currentPageHistorico - 1) * itemsPerPage) + 1} a {Math.min(currentPageHistorico * itemsPerPage, historico.length)} de <span className="font-bold text-white">{historico.length}</span> registros
                  </span>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setCurrentPageHistorico(p => Math.max(1, p - 1))}
                      disabled={currentPageHistorico === 1}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white font-medium rounded-lg border border-slate-700 transition-colors"
                    >
                      Anterior
                    </button>
                    <button 
                      onClick={() => setCurrentPageHistorico(p => p + 1)}
                      disabled={currentPageHistorico * itemsPerPage >= historico.length}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white font-medium rounded-lg border border-slate-700 transition-colors"
                    >
                      Próxima
                    </button>
                  </div>
                </div>
              )}
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
                      <button onClick={handleBulkRetrySearch} className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-1.5 rounded-lg text-sm font-bold transition-colors flex items-center gap-2">
                        <RefreshCw className="w-4 h-4" /> Refazer Busca ({selectedPendentes.size})
                      </button>
                    </>
                  )}
                  <button 
                    onClick={() => navigator.clipboard.writeText(rotasPendentes.map(r => r.id_rota).join('\n'))}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg text-sm transition-colors border border-slate-700 flex items-center gap-2"
                  >
                    <Copy className="w-4 h-4" /> Copiar IDs
                  </button>
                  <button onClick={loadPendentes} className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-1.5 rounded-lg text-sm font-bold transition-colors">
                    Atualizar
                  </button>
                </div>
              </div>

              <div className="bg-slate-900/50 rounded-xl border border-slate-800/60 overflow-hidden shadow-2xl relative">
                {isLoadingPendentes && (
                  <div className="absolute inset-0 z-10 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center">
                    <div className="text-center">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-indigo-500" />
                      <p className="text-slate-400 font-medium">Buscando pendências reais...</p>
                    </div>
                  </div>
                )}
                <div className="overflow-x-auto max-h-[600px]">
                  <table className="w-full min-w-[800px] text-left text-sm whitespace-nowrap">
                    <thead className="bg-slate-800/80 border-b border-slate-700 sticky top-0 z-20">
                      <tr>
                        <th className="py-3 px-4 w-12 text-center">
                          <input 
                            type="checkbox" 
                            checked={selectedPendentes.size === rotasPendentes.length && rotasPendentes.length > 0}
                            onChange={toggleSelectAllPendentes}
                            className="w-4 h-4 rounded border-slate-600 text-indigo-500 bg-slate-900 focus:ring-indigo-500 focus:ring-offset-slate-900"
                          />
                        </th>
                        <th className="py-3 px-4 font-bold text-slate-400 uppercase tracking-wider text-[10px]">ID Rota</th>
                        <th className="py-3 px-4 font-bold text-slate-400 uppercase tracking-wider text-[10px]">Quinzena Origem</th>
                        <th className="py-3 px-4 font-bold text-slate-400 uppercase tracking-wider text-[10px]">Data Identificação</th>
                        <th className="py-3 px-4 font-bold text-slate-400 uppercase tracking-wider text-[10px]">Data Inicial Rota</th>
                        <th className="py-3 px-4 font-bold text-slate-400 uppercase tracking-wider text-[10px] text-center">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {rotasPendentes.length === 0 && !isLoadingPendentes ? (
                        <tr>
                          <td colSpan="6" className="py-16">
                            <div className="flex flex-col items-center justify-center gap-3 text-emerald-500 w-full">
                              <div className="bg-emerald-500/10 p-4 rounded-full">
                                <CheckCircle2 className="w-8 h-8" />
                              </div>
                              <span className="font-bold text-lg">Nenhuma rota pendente!</span>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        rotasPendentes.slice((currentPagePendentes - 1) * itemsPerPage, currentPagePendentes * itemsPerPage).map(r => (
                          <tr key={r.id_rota} className={`transition-colors ${selectedPendentes.has(r.id_rota) ? 'bg-indigo-500/10' : 'hover:bg-slate-800/40'}`}>
                            <td className="py-3 px-4 text-center">
                              <input 
                                type="checkbox" 
                                checked={selectedPendentes.has(r.id_rota)}
                                onChange={() => toggleSelectPendente(r.id_rota)}
                                className="w-4 h-4 rounded border-slate-600 text-indigo-500 bg-slate-900 focus:ring-indigo-500 focus:ring-offset-slate-900"
                              />
                            </td>
                            <td className="py-3 px-4 text-white font-mono font-bold tracking-wide">{r.id_rota}</td>
                            <td className="py-3 px-4 text-slate-300"><span className="bg-slate-800 px-2 py-0.5 rounded text-xs border border-slate-700">{r.quinzena_origem}</span></td>
                            <td className="py-3 px-4 text-slate-400">{new Date(r.data_identificacao).toLocaleString('pt-BR')}</td>
                            <td className="py-3 px-4 text-slate-400">{r.data_inicial || 'N/A'}</td>
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
                {rotasPendentes.length > itemsPerPage && (
                  <div className="bg-slate-800/50 border-t border-slate-800 p-3 flex items-center justify-between text-sm">
                    <span className="text-slate-400">
                      Mostrando {((currentPagePendentes - 1) * itemsPerPage) + 1} a {Math.min(currentPagePendentes * itemsPerPage, rotasPendentes.length)} de <span className="font-bold text-white">{rotasPendentes.length}</span> rotas
                    </span>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setCurrentPagePendentes(p => Math.max(1, p - 1))}
                        disabled={currentPagePendentes === 1}
                        className="px-3 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white rounded border border-slate-700 transition-colors"
                      >
                        Anterior
                      </button>
                      <button 
                        onClick={() => setCurrentPagePendentes(p => p + 1)}
                        disabled={currentPagePendentes * itemsPerPage >= rotasPendentes.length}
                        className="px-3 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white rounded border border-slate-700 transition-colors"
                      >
                        Próxima
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeStep === 8 && (
            <GestaoDadosTab mapeamentoFiliais={mapeamentoFiliais} rawOperacionalData={rawOperacionalData} />
          )}
        </div>
      </div>
    </div>
  );
}
