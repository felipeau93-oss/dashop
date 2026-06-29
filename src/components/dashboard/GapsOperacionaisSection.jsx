import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUpRight, ArrowDownRight, Activity, TrendingUp, TrendingDown, AlertTriangle, DollarSign, Package, ShieldAlert, Users, CheckCircle, Truck, Calculator, Filter, History, MapPin, Search, ChevronDown, ChevronUp, Download, Eye, EyeOff, Minus, FileSpreadsheet, ExternalLink, Navigation, ArrowUpDown, ArrowUp, ArrowDown, PieChart, ChevronRight, Target } from 'lucide-react';
import { formatCurrency, formatQtd, formatDS, normalizeText } from '../../lib/utils';
import { NativeRunRateChart } from '../ui/NativeRunRateChart';
import { NativeComboChart } from '../ui/NativeComboChart';
import { NativeDSChart } from '../ui/NativeDSChart';
import { Skeleton } from '../ui/Skeleton';

export const GapsOperacionaisSection = ({ dataOp, dataBsc }) => {
  const [dataSource, setDataSource] = useState('operacional');
  const [sortConfig, setSortConfig] = useState({ key: 'insucessos', direction: 'desc' });
  const [selectedFilial, setSelectedFilial] = useState(null);
  const [selectedCluster, setSelectedCluster] = useState(null);
  const [selectedMotorista, setSelectedMotorista] = useState(null);
  const [selectedMotivo, setSelectedMotivo] = useState(null);
  const [expandedMotivo, setExpandedMotivo] = useState(null);

  const handleSort = (key) => {
    let direction = 'desc';
    if (sortConfig.key === key && sortConfig.direction === 'desc') direction = 'asc';
    setSortConfig({ key, direction });
  };

  const handleLevelUp = () => {
    if (selectedMotorista) {
      setSelectedMotorista(null);
      setSortConfig({ key: selectedMotivo ? 'motivoFilterQtd' : 'insucessos', direction: 'desc' });
    } else if (selectedCluster) {
      setSelectedCluster(null);
      setSortConfig({ key: 'insucessos', direction: 'desc' });
    } else if (selectedMotivo) {
      setSelectedMotivo(null);
      setSortConfig({ key: 'insucessos', direction: 'desc' });
    } else if (selectedFilial) {
      setSelectedFilial(null);
      setSortConfig({ key: 'insucessos', direction: 'desc' });
    }
    setExpandedMotivo(null);
  };

  const activeData = dataSource === 'bsc' ? dataBsc : dataOp;

  const { dataAgrupada, topCards } = useMemo(() => {
    const map = {};
    let globalSaldo = 0; let globalInsucessos = 0;
    const globalMotivos = {};
    const globalDias = {};

    activeData.forEach(d => {
      const fKey = normalizeText(d.filial || 'N/A');
      const rawCluster = (d.cluster && String(d.cluster).trim() !== '' && String(d.cluster).trim() !== '-') ? d.cluster : 'N/A';
      const rawMotorista = (d.motorista && String(d.motorista).trim() !== '' && String(d.motorista).trim() !== '-') ? d.motorista : 'N/A';
      
      const cKey = normalizeText(rawCluster);
      const mKey = normalizeText(rawMotorista);

      if (!map[fKey]) map[fKey] = { filial: d.filial || 'N/A', saldo: 0, entregues: 0, insucessos: 0, insDetalhes: {}, clustersMap: {} };
      if (!map[fKey].clustersMap[cKey]) map[fKey].clustersMap[cKey] = { cluster: rawCluster, saldo: 0, entregues: 0, insucessos: 0, insDetalhes: {}, motoristasMap: {} };
      if (!map[fKey].clustersMap[cKey].motoristasMap[mKey]) map[fKey].clustersMap[cKey].motoristasMap[mKey] = { motorista: rawMotorista, saldo: 0, entregues: 0, insucessos: 0, insDetalhes: {}, rotasPorMotivo: {} };

      const insTotal = Math.max(0, (d.saldo || 0) - (d.entregues || 0));
      globalSaldo += (d.saldo || 0); globalInsucessos += insTotal;

      map[fKey].saldo += (d.saldo || 0); map[fKey].entregues += (d.entregues || 0); map[fKey].insucessos += insTotal;
      map[fKey].clustersMap[cKey].saldo += (d.saldo || 0); map[fKey].clustersMap[cKey].entregues += (d.entregues || 0); map[fKey].clustersMap[cKey].insucessos += insTotal;
      map[fKey].clustersMap[cKey].motoristasMap[mKey].saldo += (d.saldo || 0); map[fKey].clustersMap[cKey].motoristasMap[mKey].entregues += (d.entregues || 0); map[fKey].clustersMap[cKey].motoristasMap[mKey].insucessos += insTotal;

      if (d.dia_semana && d.dia_semana !== 'N/A') {
        globalDias[d.dia_semana] = (globalDias[d.dia_semana] || 0) + insTotal;
      }

      if (d.insucessosDetalhados) {
        Object.entries(d.insucessosDetalhados).forEach(([k, v]) => {
          map[fKey].insDetalhes[k] = (map[fKey].insDetalhes[k] || 0) + v;
          map[fKey].clustersMap[cKey].insDetalhes[k] = (map[fKey].clustersMap[cKey].insDetalhes[k] || 0) + v;
          map[fKey].clustersMap[cKey].motoristasMap[mKey].insDetalhes[k] = (map[fKey].clustersMap[cKey].motoristasMap[mKey].insDetalhes[k] || 0) + v;
          globalMotivos[k] = (globalMotivos[k] || 0) + v;

          if (!map[fKey].clustersMap[cKey].motoristasMap[mKey].rotasPorMotivo[k]) {
            map[fKey].clustersMap[cKey].motoristasMap[mKey].rotasPorMotivo[k] = new Set();
          }
          if (d.id_rota && d.id_rota !== '-' && d.id_rota !== 'N/A') {
            map[fKey].clustersMap[cKey].motoristasMap[mKey].rotasPorMotivo[k].add(d.id_rota);
          }
        });
      }
    });

    const filiaisList = Object.values(map).map(f => {
      const topMotivoKey = Object.keys(f.insDetalhes).sort((a, b) => f.insDetalhes[b] - f.insDetalhes[a])[0] || 'N/A';
      const impactoGlobal = globalSaldo > 0 ? (f.insucessos / globalSaldo) * 100 : 0;
      const repInsucessosGerais = globalInsucessos > 0 ? (f.insucessos / globalInsucessos) * 100 : 0;

      const clustersList = Object.values(f.clustersMap).map(c => {
        const cTopMotivo = Object.keys(c.insDetalhes).sort((a, b) => c.insDetalhes[b] - c.insDetalhes[a])[0] || 'N/A';
        const impactoFilial = f.saldo > 0 ? (c.insucessos / f.saldo) * 100 : 0;
        const repInsucessosFilial = f.insucessos > 0 ? (c.insucessos / f.insucessos) * 100 : 0;

        const motoristasList = Object.values(c.motoristasMap).map(m => {
          const mTopMotivo = Object.keys(m.insDetalhes).sort((a, b) => m.insDetalhes[b] - m.insDetalhes[a])[0] || 'N/A';
          const impactoCluster = c.saldo > 0 ? (m.insucessos / c.saldo) * 100 : 0;
          const repInsucessosCluster = c.insucessos > 0 ? (m.insucessos / c.insucessos) * 100 : 0;
          const motivos = Object.entries(m.insDetalhes).filter(([_, v]) => v > 0).map(([motivo, qtd]) => ({
            motivo,
            qtd,
            representatividade: m.insucessos > 0 ? (qtd / m.insucessos) * 100 : 0,
            rotas: Array.from(m.rotasPorMotivo[motivo] || [])
          }));
          return { ...m, ds: Math.min(100, m.saldo > 0 ? (m.entregues / m.saldo) * 100 : 0), impactoCluster, repInsucessosCluster, topMotivo: mTopMotivo, insDetalhes: m.insDetalhes, motivos };
        });

        return { ...c, ds: Math.min(100, c.saldo > 0 ? (c.entregues / c.saldo) * 100 : 0), impactoFilial, repInsucessosFilial, topMotivo: cTopMotivo, motoristas: motoristasList };
      });

      return { ...f, ds: Math.min(100, f.saldo > 0 ? (f.entregues / f.saldo) * 100 : 0), impactoGlobal, repInsucessosGerais, topMotivo: topMotivoKey, clusters: clustersList };
    });

    const filialCritica = [...filiaisList].sort((a, b) => b.insucessos - a.insucessos)[0] || { filial: 'N/A', insucessos: 0 };

    let allClusters = [];
    filiaisList.forEach(f => allClusters = allClusters.concat(f.clusters));
    const clusterCritico = allClusters.sort((a, b) => b.insucessos - a.insucessos)[0] || { cluster: 'N/A', insucessos: 0 };

    let allMotoristas = [];
    allClusters.forEach(c => allMotoristas = allMotoristas.concat(c.motoristas));
    const motCritico = allMotoristas.sort((a, b) => b.insucessos - a.insucessos)[0] || { motorista: 'N/A', insucessos: 0 };

    const topMotivoGeral = Object.entries(globalMotivos).sort((a, b) => b[1] - a[1])[0] || ['N/A', 0];
    const topDiaGeral = Object.entries(globalDias).sort((a, b) => b[1] - a[1])[0] || ['N/A', 0];

    return {
      dataAgrupada: filiaisList,
      topCards: { totalGaps: globalInsucessos, filial: filialCritica, cluster: clusterCritico, motorista: motCritico, motivo: { nome: topMotivoGeral[0], qtd: topMotivoGeral[1] }, dia: { nome: topDiaGeral[0], qtd: topDiaGeral[1] } }
    };
  }, [activeData]);

  const cardsBreakdown = useMemo(() => {
    if (selectedCluster) {
      const filial = dataAgrupada.find(f => f.filial === selectedFilial);
      if (!filial) return [];
      const cluster = filial.clusters.find(c => c.cluster === selectedCluster);
      if (!cluster || !cluster.insDetalhes) return [];
      return Object.entries(cluster.insDetalhes).filter(([_, qtd]) => qtd > 0).map(([nome, qtd]) => ({ nome, qtd, rep: cluster.insucessos > 0 ? (qtd / cluster.insucessos) * 100 : 0 })).sort((a, b) => b.qtd - a.qtd);
    } else if (selectedFilial) {
      const filial = dataAgrupada.find(f => f.filial === selectedFilial);
      if (!filial || !filial.insDetalhes) return [];
      return Object.entries(filial.insDetalhes).filter(([_, qtd]) => qtd > 0).map(([nome, qtd]) => ({ nome, qtd, rep: filial.insucessos > 0 ? (qtd / filial.insucessos) * 100 : 0 })).sort((a, b) => b.qtd - a.qtd);
    }
    return [];
  }, [dataAgrupada, selectedFilial, selectedCluster]);

  const currentViewData = useMemo(() => {
    const sortArray = (arr) => [...arr].sort((a, b) => {
      let aVal = a[sortConfig.key] !== undefined ? a[sortConfig.key] : ''; let bVal = b[sortConfig.key] !== undefined ? b[sortConfig.key] : '';
      if (typeof aVal === 'string') { aVal = aVal.toLowerCase(); bVal = bVal.toLowerCase(); }
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    if (!selectedFilial) return sortArray(dataAgrupada);

    const filialData = dataAgrupada.find(f => f.filial === selectedFilial);
    if (!filialData) return [];

    if (!selectedCluster) {
      let clustersList = filialData.clusters;
      if (selectedMotivo) clustersList = clustersList.filter(c => c.insDetalhes && c.insDetalhes[selectedMotivo] > 0).map(c => ({ ...c, motivoFilterQtd: c.insDetalhes[selectedMotivo] || 0 }));
      return sortArray(clustersList);
    }

    const clusterData = filialData.clusters.find(c => c.cluster === selectedCluster);
    if (!clusterData) return [];

    if (!selectedMotorista) {
      let motoristasList = clusterData.motoristas;
      if (selectedMotivo) motoristasList = motoristasList.filter(m => m.insDetalhes && m.insDetalhes[selectedMotivo] > 0).map(m => ({ ...m, motivoFilterQtd: m.insDetalhes[selectedMotivo] || 0 }));
      return sortArray(motoristasList);
    }

    const motoristaData = clusterData.motoristas.find(m => m.motorista === selectedMotorista);
    if (!motoristaData) return [];
    return sortArray(motoristaData.motivos);
  }, [dataAgrupada, selectedFilial, selectedCluster, selectedMotorista, selectedMotivo, sortConfig]);

  const renderSortIcon = (columnKey) => {
    if (sortConfig.key !== columnKey) return <ArrowUpDown className="w-3 h-3 inline-block ml-1 opacity-30" />;
    return sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 inline-block ml-1 text-blue-500" /> : <ArrowDown className="w-3 h-3 inline-block ml-1 text-blue-500" />;
  };

  return (
    <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200 mb-8 flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <PieChart className="w-6 h-6 text-orange-500 shrink-0" />
          <div className="min-w-0">
            <h2 className="text-xl md:text-2xl font-bold text-slate-800 truncate">{selectedMotorista ? `Insucessos: ${selectedMotorista}` : selectedCluster ? `Motoristas do Cluster: ${selectedCluster}` : selectedMotivo ? `Ofensores por Motivo: ${selectedMotivo}` : selectedFilial ? `Clusters da Filial: ${selectedFilial}` : 'Gaps Operacionais (Ofensores)'}</h2>
            <p className="text-sm text-slate-500 font-medium truncate">Análise de causa raiz para quebra de Delivery Success.</p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto shrink-0">
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-inner">
            <button onClick={() => { setDataSource('operacional'); setSelectedFilial(null); setSelectedCluster(null); setSelectedMotorista(null); setSelectedMotivo(null); setExpandedMotivo(null); }} className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-colors ${dataSource === 'operacional' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Gestão Operacional</button>
            <button onClick={() => { setDataSource('bsc'); setSelectedFilial(null); setSelectedCluster(null); setSelectedMotorista(null); setSelectedMotivo(null); setExpandedMotivo(null); }} className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-colors ${dataSource === 'bsc' ? 'bg-white text-teal-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Base BSC</button>
          </div>
          {(selectedFilial || selectedMotorista || selectedMotivo || selectedCluster) && (<button onClick={handleLevelUp} className="flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2 rounded-xl text-sm font-bold transition-colors shadow-sm shrink-0 w-full sm:w-auto">← Voltar</button>)}
        </div>
      </div>

      {!selectedMotorista && !selectedCluster && !selectedFilial && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-2">
          <div className="bg-red-50 border border-red-100 p-4 rounded-2xl flex flex-col items-center justify-center text-center transition-all">
            <span className="text-[10px] font-bold text-red-600 uppercase mb-1">QTD de Insucessos</span>
            <span className="text-2xl font-black text-red-600">{formatQtd(topCards.totalGaps)}</span>
          </div>

          <div onClick={() => setSelectedFilial(topCards.filial.filial)} className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer hover:-translate-y-1 hover:shadow-md transition-all group">
            <span className="text-[10px] font-bold text-slate-500 uppercase mb-1 flex items-center gap-1 group-hover:text-blue-500">Filial Mais Crítica <Filter className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" /></span>
            <span className="text-lg font-black text-slate-800 line-clamp-2 w-full px-2 break-words" title={topCards.filial.filial}>{topCards.filial.filial}</span>
            <span className="text-xs font-bold text-red-500 mt-auto pt-1">{formatQtd(topCards.filial.insucessos)} insucessos</span>
          </div>

          <div onClick={() => { setSelectedFilial(topCards.filial.filial); setSelectedCluster(topCards.cluster.cluster); }} className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer hover:-translate-y-1 hover:shadow-md transition-all group">
            <span className="text-[10px] font-bold text-slate-500 uppercase mb-1 flex items-center gap-1 group-hover:text-blue-500">Cluster Mais Crítico <Filter className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" /></span>
            <span className="text-lg font-black text-slate-800 line-clamp-2 w-full px-2 break-words" title={topCards.cluster.cluster}>{topCards.cluster.cluster}</span>
            <span className="text-xs font-bold text-red-500 mt-auto pt-1">{formatQtd(topCards.cluster.insucessos)} insucessos</span>
          </div>

          <div onClick={() => { setSelectedFilial(topCards.filial.filial); setSelectedCluster(topCards.cluster.cluster); setSelectedMotorista(topCards.motorista.motorista); }} className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer hover:-translate-y-1 hover:shadow-md transition-all group">
            <span className="text-[10px] font-bold text-slate-500 uppercase mb-1 flex items-center gap-1 group-hover:text-blue-500">Motorista Mais Crítico <Filter className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" /></span>
            <span className="text-lg font-black text-slate-800 line-clamp-2 w-full px-2 break-words" title={topCards.motorista.motorista}>{topCards.motorista.motorista}</span>
            <span className="text-xs font-bold text-red-500 mt-auto pt-1">{formatQtd(topCards.motorista.insucessos)} insucessos</span>
          </div>

          <div onClick={() => setSelectedMotivo(topCards.motivo.nome)} className="bg-orange-50 border border-orange-100 p-4 rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer hover:-translate-y-1 hover:shadow-md transition-all group">
            <span className="text-[10px] font-bold text-orange-600 uppercase mb-1 flex items-center gap-1 group-hover:text-orange-800">Motivo Recorrente <Filter className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" /></span>
            <span className="text-sm font-black text-orange-600 line-clamp-2 w-full px-2 break-words" title={topCards.motivo.nome}>{topCards.motivo.nome}</span>
            <span className="text-xs font-bold text-orange-500 mt-auto pt-1">{formatQtd(topCards.motivo.qtd)} pacotes</span>
          </div>

          <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl flex flex-col items-center justify-center text-center transition-all">
            <span className="text-[10px] font-bold text-blue-600 uppercase mb-1">Dia Mais Crítico</span>
            <span className="text-sm font-black text-blue-600 line-clamp-2 w-full px-2 break-words" title={topCards.dia.nome}>{topCards.dia.nome}</span>
            <span className="text-xs font-bold text-blue-500 mt-auto pt-1">{formatQtd(topCards.dia.qtd)} insucessos</span>
          </div>
        </div>
      )}

      {(selectedFilial || selectedCluster) && !selectedMotorista && cardsBreakdown.length > 0 && (
        <div className="mb-4 bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-inner">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
            <h3 className="text-sm font-black text-slate-700 uppercase tracking-wider flex items-center gap-2"><PieChart className="w-4 h-4 text-orange-500" /> Representatividade dos Motivos: {selectedCluster ? selectedCluster : selectedFilial}</h3>
            <span className="text-[10px] text-slate-400 font-bold bg-white px-2 py-1 rounded border border-slate-200">CLIQUE NUM MOTIVO PARA FILTRAR ABAIXO</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {cardsBreakdown.map((m, idx) => {
              const isSelected = selectedMotivo === m.nome;
              return (
                <div key={idx} onClick={() => { if (isSelected) { setSelectedMotivo(null); setSortConfig({ key: 'insucessos', direction: 'desc' }); } else { setSelectedMotivo(m.nome); setSortConfig({ key: 'motivoFilterQtd', direction: 'desc' }); } }} className={`p-3 rounded-xl border flex justify-between items-center shadow-sm cursor-pointer transition-all ${isSelected ? 'bg-orange-50 border-orange-400 ring-2 ring-orange-400/20' : 'bg-white border-slate-200 hover:border-orange-300 hover:bg-orange-50/50'}`}>
                  <div className="flex flex-col min-w-0 pr-3"><span className={`text-[10px] font-bold uppercase tracking-wider truncate w-[140px] ${isSelected ? 'text-orange-700' : 'text-slate-500'}`} title={m.nome}>{m.nome}</span><span className={`text-base font-black leading-tight mt-0.5 ${isSelected ? 'text-orange-800' : 'text-slate-800'}`}>{formatQtd(m.qtd)} <span className={`text-[10px] font-medium lowercase ${isSelected ? 'text-orange-600' : 'text-slate-400'}`}>pacotes</span></span></div>
                  <div className={`px-2 py-1 rounded-lg font-black text-xs shrink-0 border ${isSelected ? 'bg-orange-100 text-orange-800 border-orange-200' : 'bg-orange-50 text-orange-700 border-orange-100'}`}>{m.rep.toFixed(1)}%</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm w-full">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead className="bg-slate-50 sticky top-0 z-20 shadow-sm">
            {!selectedMotorista ? (
              <tr className="text-[10px] uppercase tracking-wider text-slate-500 select-none">
                <th className="py-3 px-3 font-bold border-b border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors bg-white z-30 sticky left-0" onClick={() => handleSort(selectedCluster ? 'motorista' : (!selectedFilial ? 'filial' : 'cluster'))}>{selectedCluster ? 'Motorista' : (!selectedFilial ? 'Filial' : 'Cluster')} {renderSortIcon()}</th>
                <th className="py-3 px-3 font-bold border-b border-slate-200 text-right cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('saldo')}>Total Pacotes {renderSortIcon('saldo')}</th>
                <th className="py-3 px-3 font-bold border-b border-slate-200 text-right cursor-pointer hover:bg-red-50 transition-colors text-red-700 bg-red-50/30" onClick={() => handleSort('insucessos')}>Insucessos (Total) {renderSortIcon('insucessos')}</th>
                {selectedMotivo && (<th className="py-3 px-3 font-bold border-b border-orange-200 text-right cursor-pointer hover:bg-orange-100 transition-colors text-orange-800 bg-orange-100/50" onClick={() => handleSort('motivoFilterQtd')}>Insucessos: {selectedMotivo} {renderSortIcon('motivoFilterQtd')}</th>)}
                <th className="py-3 px-3 font-bold border-b border-slate-200 text-right cursor-pointer hover:bg-emerald-50 transition-colors text-emerald-700 bg-emerald-50/30" onClick={() => handleSort('ds')}>DS {renderSortIcon('ds')}</th>
                <th className="py-3 px-3 font-bold border-b border-slate-200 text-center cursor-pointer hover:bg-orange-50 transition-colors text-orange-700 bg-orange-50/30" onClick={() => handleSort(!selectedFilial ? 'impactoGlobal' : (!selectedCluster ? 'impactoFilial' : 'impactoCluster'))}>Impacto no DS {!selectedFilial ? 'Geral (Empresa)' : (!selectedCluster ? 'da Filial' : 'do Cluster')} {renderSortIcon()}</th>
                <th className="py-3 px-3 font-bold border-b border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('topMotivo')}>Principal Motivo {renderSortIcon('topMotivo')}</th>
              </tr>
            ) : (
              <tr className="text-[10px] uppercase tracking-wider text-slate-500 select-none">
                <th className="py-3 px-3 font-bold border-b border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors bg-white z-30 sticky left-0 w-1/3" onClick={() => handleSort('motivo')}>Motivo de Insucesso {renderSortIcon('motivo')}</th>
                <th className="py-3 px-3 font-bold border-b border-slate-200 text-right cursor-pointer hover:bg-red-50 transition-colors text-red-700 bg-red-50/30 w-1/6" onClick={() => handleSort('qtd')}>Qtd Pacotes {renderSortIcon('qtd')}</th>
                <th className="py-3 px-3 font-bold border-b border-slate-200 text-right cursor-pointer hover:bg-orange-50 transition-colors text-orange-700 bg-orange-50/30 w-1/6" onClick={() => handleSort('representatividade')}>Representatividade {renderSortIcon('representatividade')}</th>
                <th className="py-3 px-3 font-bold border-b border-slate-200 text-left bg-slate-50/30 w-1/3">Rotas Afetadas (Link)</th>
              </tr>
            )}
          </thead>
          <tbody>
            {currentViewData.length === 0 && (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-400 font-medium text-xs bg-white">
                  Nenhum insucesso encontrado para os filtros atuais.
                </td>
              </tr>
            )}

            {!selectedMotorista && currentViewData.map((row, idx) => {
              const impactoStr = !selectedFilial ? row.impactoGlobal : (!selectedCluster ? row.impactoFilial : row.impactoCluster);
              const repGaps = !selectedFilial ? row.repInsucessosGerais : (!selectedCluster ? row.repInsucessosFilial : row.repInsucessosCluster);
              return (
                <tr key={`drill-${idx}`} onClick={() => { if (!selectedFilial) { setSelectedFilial(row.filial); setSortConfig({ key: 'insucessos', direction: 'desc' }); } else if (!selectedCluster) { setSelectedCluster(row.cluster); setSortConfig({ key: 'insucessos', direction: 'desc' }); } else { setSelectedMotorista(row.motorista); setSortConfig({ key: 'qtd', direction: 'desc' }); } }} className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors group bg-white text-xs">
                  <td className="py-2.5 px-3 font-bold text-slate-700 bg-white sticky left-0 z-10 flex items-center gap-2 border-r border-slate-100"><div className="p-1 rounded transition-colors bg-slate-100 text-slate-400 group-hover:bg-blue-100 group-hover:text-blue-600 shrink-0"><ChevronRight className="w-4 h-4" /></div><span className="truncate">{selectedCluster ? row.motorista : (!selectedFilial ? row.filial : row.cluster)}</span></td>
                  <td className="py-2.5 px-3 font-medium text-right text-slate-500">{formatQtd(row.saldo)}</td>
                  <td className="py-2.5 px-3 font-bold text-right text-red-600 bg-red-50/10">{formatQtd(row.insucessos)}</td>
                  {selectedMotivo && (<td className="py-2.5 px-3 font-bold text-right text-orange-700 bg-orange-50/40">{formatQtd(row.motivoFilterQtd)}</td>)}
                  <td className="py-2.5 px-3 font-bold text-right text-emerald-600 bg-emerald-50/10">{formatDS(row.ds)}</td>
                  <td className="py-2.5 px-3 text-center bg-orange-50/10"><div className="flex flex-col items-center justify-center"><span className={`px-2 py-0.5 rounded text-[10px] font-bold ${impactoStr > 2 ? 'bg-red-100 text-red-700' : (impactoStr > 0.5 ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-600')}`}>-{impactoStr.toFixed(2)}%</span><span className="text-[9px] text-slate-500 mt-1 font-medium">({repGaps.toFixed(1)}% dos insucessos)</span></div></td>
                  <td className="py-2.5 px-3 font-medium text-slate-500 truncate max-w-[200px]" title={row.topMotivo}>{row.topMotivo}</td>
                </tr>
              );
            })}

            {selectedMotorista && currentViewData.map((row, idx) => {
              const isExpanded = expandedMotivo === row.motivo;
              return (
                <React.Fragment key={`motivo-${idx}`}>
                  <tr onClick={() => setExpandedMotivo(isExpanded ? null : row.motivo)} className={`border-b border-slate-100 text-xs transition-colors cursor-pointer ${isExpanded ? 'bg-blue-50/40' : 'bg-white hover:bg-slate-50'}`}>
                    <td className="py-3 px-3 font-bold text-slate-700 sticky left-0 z-10 border-r border-slate-100 bg-inherit">
                      <div className="flex items-center gap-2">
                        <div className="p-1 rounded text-slate-400 shrink-0"><ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180 text-blue-600' : ''}`} /></div>
                        <span className="truncate">{row.motivo}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 font-bold text-right text-red-600 bg-red-50/10">{formatQtd(row.qtd)}</td>
                    <td className="py-3 px-3 font-bold text-right text-orange-600 bg-orange-50/10">{row.representatividade.toFixed(2)}%</td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-blue-600 bg-blue-100 px-2 py-1 rounded">Ver {row.rotas ? row.rotas.length : 0} Rotas</span>
                      </div>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr className="bg-slate-50/80 border-b border-slate-200 shadow-inner">
                      <td colSpan={4} className="p-4">
                        <div className="text-[10px] uppercase font-bold text-slate-500 mb-2 tracking-wider flex items-center gap-2"><Target className="w-3.5 h-3.5" /> Lista de Rotas Afetadas (Link para Monitoramento)</div>
                        <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto bg-white p-3 rounded-xl border border-slate-200">
                          {row.rotas && row.rotas.length > 0 ? row.rotas.map((rota, i) => (
                            <a key={i} href={`https://envios.adminml.com/logistics/monitoring-distribution/detail/${rota}`} target="_blank" rel="noopener noreferrer" className="text-xs font-mono font-bold bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white px-2 py-1.5 rounded-lg border border-blue-200 transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer" onClick={(e) => e.stopPropagation()}>
                              {rota} <ChevronRight className="w-3 h-3" />
                            </a>
                          )) : <span className="text-slate-400 text-xs font-medium italic">Nenhuma rota especificada.</span>}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
