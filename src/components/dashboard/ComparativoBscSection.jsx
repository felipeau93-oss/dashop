import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUpRight, ArrowDownRight, Activity, TrendingUp, TrendingDown, AlertTriangle, DollarSign, Package, ShieldAlert, Users, CheckCircle, Truck, Calculator, Filter, History, MapPin, Search, ChevronDown, ChevronUp, Download, Eye, EyeOff, Minus, FileSpreadsheet, ExternalLink, Navigation, ArrowUpDown, ArrowUp, ArrowDown, GitCompare, ChevronRight } from 'lucide-react';
import { formatCurrency, formatQtd, formatDS, normalizeText } from '../../lib/utils';
import { NativeRunRateChart } from '../ui/NativeRunRateChart';
import { NativeComboChart } from '../ui/NativeComboChart';
import { NativeDSChart } from '../ui/NativeDSChart';
import { Skeleton } from '../ui/Skeleton';

export const ComparativoBscSection = ({ dataOp, dataBsc }) => {
  const [sortConfig, setSortConfig] = useState({ key: 'absDiff', direction: 'desc' });
  const [selectedFilial, setSelectedFilial] = useState(null);
  const [selectedMotorista, setSelectedMotorista] = useState(null);

  const handleSort = (key) => {
    let direction = 'desc';
    if (sortConfig.key === key && sortConfig.direction === 'desc') direction = 'asc';
    setSortConfig({ key, direction });
  };

  const handleLevelUp = () => {
    if (selectedMotorista) { setSelectedMotorista(null); } else if (selectedFilial) { setSelectedFilial(null); }
    setSortConfig({ key: 'absDiff', direction: 'desc' });
  };

  const { mergedData, viewOp, viewBsc } = useMemo(() => {
    const map = {};
    let vOpSaldo = 0, vOpEntregues = 0, vBscSaldo = 0, vBscEntregues = 0;
    const vOpRotas = new Set(); const vBscRotas = new Set();

    let dataToGroupOp = dataOp; let dataToGroupBsc = dataBsc;
    if (selectedFilial) { dataToGroupOp = dataToGroupOp.filter(d => d.filial === selectedFilial); dataToGroupBsc = dataToGroupBsc.filter(d => d.filial === selectedFilial); }
    if (selectedMotorista) { dataToGroupOp = dataToGroupOp.filter(d => d.motorista === selectedMotorista); dataToGroupBsc = dataToGroupBsc.filter(d => d.motorista === selectedMotorista); }

    const getGroupingKey = (d) => {
      if (!selectedFilial) return normalizeText(d.filial);
      if (!selectedMotorista) return normalizeText(d.motorista);
      return normalizeText(d.id_rota && d.id_rota !== '-' ? d.id_rota : `${d.quinzena}-SemID`);
    };
    const getDisplayLabel = (d) => {
      if (!selectedFilial) return d.filial;
      if (!selectedMotorista) return d.motorista;
      return d.id_rota && d.id_rota !== '-' ? d.id_rota : 'Rota S/ ID';
    };

    dataToGroupOp.forEach(d => {
      const k = getGroupingKey(d);
      if (!map[k]) map[k] = { label: getDisplayLabel(d), opSaldo: 0, opEntregues: 0, bscSaldo: 0, bscEntregues: 0, opRotas: new Set(), bscRotas: new Set() };
      map[k].opSaldo += d.saldo; map[k].opEntregues += d.entregues;
      const routeId = d.id_rota && d.id_rota !== '-' ? d.id_rota : `${d.quinzena}-${d.motorista}`;
      map[k].opRotas.add(routeId);
      vOpSaldo += d.saldo; vOpEntregues += d.entregues; vOpRotas.add(routeId);
    });

    dataToGroupBsc.forEach(d => {
      const k = getGroupingKey(d);
      if (!map[k]) map[k] = { label: getDisplayLabel(d), opSaldo: 0, opEntregues: 0, bscSaldo: 0, bscEntregues: 0, opRotas: new Set(), bscRotas: new Set() };
      map[k].bscSaldo += d.saldo; map[k].bscEntregues += d.entregues;
      const routeId = d.id_rota && d.id_rota !== '-' ? d.id_rota : `${d.quinzena}-${d.motorista}`;
      map[k].bscRotas.add(routeId);
      vBscSaldo += d.saldo; vBscEntregues += d.entregues; vBscRotas.add(routeId);
    });

    const parsedData = Object.values(map).map(row => {
      const opRotasCount = row.opRotas.size; const bscRotasCount = row.bscRotas.size;
      const diffRotas = opRotasCount - bscRotasCount; const diffSaldo = row.opSaldo - row.bscSaldo; const diffEntregues = row.opEntregues - row.bscEntregues;
      const dsOp = Math.min(100, row.opSaldo > 0 ? (row.opEntregues / row.opSaldo) * 100 : 0);
      const dsBsc = Math.min(100, row.bscSaldo > 0 ? (row.bscEntregues / row.bscSaldo) * 100 : 0);
      return { ...row, opRotasCount, bscRotasCount, diffRotas, diffSaldo, diffEntregues, dsOp, dsBsc, diffDs: dsOp - dsBsc, absDiff: Math.abs(diffSaldo) + Math.abs(diffEntregues) + Math.abs(diffRotas) };
    });

    return {
      mergedData: parsedData,
      viewOp: { saldo: vOpSaldo, entregues: vOpEntregues, rotas: vOpRotas.size, ds: Math.min(100, vOpSaldo > 0 ? (vOpEntregues / vOpSaldo) * 100 : 0) },
      viewBsc: { saldo: vBscSaldo, entregues: vBscEntregues, rotas: vBscRotas.size, ds: Math.min(100, vBscSaldo > 0 ? (vBscEntregues / vBscSaldo) * 100 : 0) }
    };
  }, [dataOp, dataBsc, selectedFilial, selectedMotorista]);

  const sortedData = useMemo(() => {
    return [...mergedData].sort((a, b) => {
      let aVal = a[sortConfig.key]; let bVal = b[sortConfig.key];
      if (typeof aVal === 'string') { aVal = aVal.toLowerCase(); bVal = bVal.toLowerCase(); }
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [mergedData, sortConfig]);

  const renderBadge = (val, isPercent = false) => {
    if (Math.abs(val) < 0.01) return <span className="bg-slate-100 text-slate-500 font-bold px-2 py-0.5 rounded text-[10px]">OK</span>;
    const isPositive = val > 0;
    return <span className={`${isPositive ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'} font-bold px-2 py-0.5 rounded text-[10px] whitespace-nowrap`}>{isPositive ? '+' : ''}{isPercent ? val.toFixed(2) : formatQtd(val)}{isPercent ? '%' : ''}</span>;
  };

  const SortIcon = ({ columnKey }) => {
    if (sortConfig.key !== columnKey) return <ArrowUpDown className="w-3 h-3 inline-block ml-1 opacity-30" />;
    return sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 inline-block ml-1 text-blue-500" /> : <ArrowDown className="w-3 h-3 inline-block ml-1 text-blue-500" />;
  };

  return (
    <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200 mb-8 flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <GitCompare className="w-6 h-6 text-violet-500 shrink-0" />
          <div className="min-w-0">
            <h2 className="text-xl md:text-2xl font-bold text-slate-800 truncate">{selectedMotorista ? `Rotas do Motorista: ${selectedMotorista}` : selectedFilial ? `Motoristas: ${selectedFilial}` : 'Operacional vs BSC'}</h2>
          </div>
        </div>
        {(selectedFilial || selectedMotorista) && (<button onClick={handleLevelUp} className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2.5 rounded-xl text-sm font-bold shadow-sm shrink-0">← Voltar</button>)}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-2">
        <div className="bg-slate-50 border border-slate-200 p-4 xl:p-5 rounded-2xl flex flex-col items-center"><span className="text-[10px] xl:text-xs font-bold text-slate-500 uppercase mb-3 text-center">Diferença de Rotas</span><div className="flex gap-2 xl:gap-4 items-center"><div className="text-center"><span className="block text-[9px] xl:text-[10px] text-slate-400 font-bold">Operacional</span><span className="font-mono text-sm font-bold text-blue-600">{formatQtd(viewOp.rotas)}</span></div><span className="text-slate-300 font-black text-lg">/</span><div className="text-center"><span className="block text-[9px] xl:text-[10px] text-slate-400 font-bold">BSC Oficial</span><span className="font-mono text-sm font-bold text-blue-600">{formatQtd(viewBsc.rotas)}</span></div></div><div className="mt-3">{renderBadge(viewOp.rotas - viewBsc.rotas)}</div></div>
        <div className="bg-slate-50 border border-slate-200 p-4 xl:p-5 rounded-2xl flex flex-col items-center"><span className="text-[10px] xl:text-xs font-bold text-slate-500 uppercase mb-3 text-center">Diferença de Pacotes</span><div className="flex gap-2 xl:gap-4 items-center"><div className="text-center"><span className="block text-[9px] xl:text-[10px] text-slate-400 font-bold">Operacional</span><span className="font-mono text-sm font-bold">{formatQtd(viewOp.saldo)}</span></div><span className="text-slate-300 font-black text-lg">/</span><div className="text-center"><span className="block text-[9px] xl:text-[10px] text-slate-400 font-bold">BSC Oficial</span><span className="font-mono text-sm font-bold">{formatQtd(viewBsc.saldo)}</span></div></div><div className="mt-3">{renderBadge(viewOp.saldo - viewBsc.saldo)}</div></div>
        <div className="bg-slate-50 border border-slate-200 p-4 xl:p-5 rounded-2xl flex flex-col items-center"><span className="text-[10px] xl:text-xs font-bold text-slate-500 uppercase mb-3 text-center">Diferença de Entregues</span><div className="flex gap-2 xl:gap-4 items-center"><div className="text-center"><span className="block text-[9px] xl:text-[10px] text-slate-400 font-bold">Operacional</span><span className="font-mono text-sm font-bold text-emerald-600">{formatQtd(viewOp.entregues)}</span></div><span className="text-slate-300 font-black text-lg">/</span><div className="text-center"><span className="block text-[9px] xl:text-[10px] text-slate-400 font-bold">BSC Oficial</span><span className="font-mono text-sm font-bold text-emerald-600">{formatQtd(viewBsc.entregues)}</span></div></div><div className="mt-3">{renderBadge(viewOp.entregues - viewBsc.entregues)}</div></div>
        <div className="bg-slate-50 border border-slate-200 p-4 xl:p-5 rounded-2xl flex flex-col items-center"><span className="text-[10px] xl:text-xs font-bold text-slate-500 uppercase mb-3 text-center">Diferença do DS %</span><div className="flex gap-2 xl:gap-4 items-center"><div className="text-center"><span className="block text-[9px] xl:text-[10px] text-slate-400 font-bold">Operacional</span><span className="font-mono text-sm font-bold text-violet-600">{formatDS(viewOp.ds)}</span></div><span className="text-slate-300 font-black text-lg">/</span><div className="text-center"><span className="block text-[9px] xl:text-[10px] text-slate-400 font-bold">BSC Oficial</span><span className="font-mono text-sm font-bold text-violet-600">{formatDS(viewBsc.ds)}</span></div></div><div className="mt-3">{renderBadge(viewOp.ds - viewBsc.ds, true)}</div></div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm w-full">
        <table className="w-full text-left border-collapse min-w-[1000px]">
          <thead className="bg-slate-50 sticky top-0 z-20 shadow-sm">
            <tr className="text-[10px] uppercase tracking-wider text-slate-500 select-none">
              <th className="py-3 px-3 font-bold border-b border-r border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors bg-white z-30" rowSpan={2} onClick={() => handleSort('label')}>{selectedMotorista ? 'Rota (ID)' : selectedFilial ? 'Motorista' : 'Filial'} <SortIcon columnKey="label" /></th>
              <th className="py-2 px-3 font-bold border-b border-r border-slate-200 text-center bg-blue-50/30" colSpan={3}>Rotas Únicas</th>
              <th className="py-2 px-3 font-bold border-b border-r border-slate-200 text-center bg-slate-100/50" colSpan={3}>Total de Pacotes (Saldo)</th>
              <th className="py-2 px-3 font-bold border-b border-r border-slate-200 text-center bg-emerald-50/30" colSpan={3}>Pacotes Entregues</th>
              <th className="py-2 px-3 font-bold border-b border-slate-200 text-center bg-violet-50/30" colSpan={3}>Delivery Success (DS)</th>
            </tr>
            <tr className="text-[9px] uppercase tracking-wider text-slate-400 select-none">
              <th className="py-2 px-3 font-bold border-b border-slate-200 text-right cursor-pointer hover:bg-blue-50 transition-colors bg-blue-50/30 text-blue-700" onClick={() => handleSort('opRotasCount')}>Op. <SortIcon columnKey="opRotasCount" /></th>
              <th className="py-2 px-3 font-bold border-b border-slate-200 text-right cursor-pointer hover:bg-blue-50 transition-colors bg-blue-50/30 text-blue-700" onClick={() => handleSort('bscRotasCount')}>BSC <SortIcon columnKey="bscRotasCount" /></th>
              <th className="py-2 px-3 font-bold border-b border-r border-slate-200 text-center cursor-pointer hover:bg-blue-50 transition-colors bg-blue-100/50 text-blue-800" onClick={() => handleSort('diffRotas')}>Diff <SortIcon columnKey="diffRotas" /></th>
              <th className="py-2 px-3 font-bold border-b border-slate-200 text-right cursor-pointer hover:bg-slate-100 transition-colors bg-slate-100/50" onClick={() => handleSort('opSaldo')}>Op. <SortIcon columnKey="opSaldo" /></th>
              <th className="py-2 px-3 font-bold border-b border-slate-200 text-right cursor-pointer hover:bg-slate-100 transition-colors bg-slate-100/50" onClick={() => handleSort('bscSaldo')}>BSC <SortIcon columnKey="bscSaldo" /></th>
              <th className="py-2 px-3 font-bold border-b border-r border-slate-200 text-center cursor-pointer hover:bg-slate-100 transition-colors bg-slate-100/80" onClick={() => handleSort('diffSaldo')}>Diff <SortIcon columnKey="diffSaldo" /></th>
              <th className="py-2 px-3 font-bold border-b border-slate-200 text-right cursor-pointer hover:bg-emerald-50 transition-colors bg-emerald-50/30 text-emerald-700" onClick={() => handleSort('opEntregues')}>Op. <SortIcon columnKey="opEntregues" /></th>
              <th className="py-2 px-3 font-bold border-b border-slate-200 text-right cursor-pointer hover:bg-emerald-50 transition-colors bg-emerald-50/30 text-emerald-700" onClick={() => handleSort('bscEntregues')}>BSC <SortIcon columnKey="bscEntregues" /></th>
              <th className="py-2 px-3 font-bold border-b border-r border-slate-200 text-center cursor-pointer hover:bg-emerald-50 transition-colors bg-emerald-100/50 text-emerald-800" onClick={() => handleSort('diffEntregues')}>Diff <SortIcon columnKey="diffEntregues" /></th>
              <th className="py-2 px-3 font-bold border-b border-slate-200 text-right cursor-pointer hover:bg-violet-50 transition-colors bg-violet-50/30 text-violet-700" onClick={() => handleSort('dsOp')}>Op. <SortIcon columnKey="dsOp" /></th>
              <th className="py-2 px-3 font-bold border-b border-slate-200 text-right cursor-pointer hover:bg-violet-50 transition-colors bg-violet-50/30 text-violet-700" onClick={() => handleSort('dsBsc')}>BSC <SortIcon columnKey="dsBsc" /></th>
              <th className="py-2 px-3 font-bold border-b border-slate-200 text-center cursor-pointer hover:bg-violet-50 transition-colors bg-violet-100/50 text-violet-800" onClick={() => handleSort('diffDs')}>Diff <SortIcon columnKey="diffDs" /></th>
            </tr>
          </thead>
          <tbody>
            {sortedData.map((row, idx) => (
              <tr key={`comp-${idx}`} className={`border-b border-slate-100 transition-colors bg-white text-xs group ${selectedMotorista ? 'cursor-default hover:bg-white' : 'cursor-pointer hover:bg-slate-50'}`} onClick={() => { if (!selectedFilial) { setSelectedFilial(row.label); setSortConfig({ key: 'absDiff', direction: 'desc' }); } else if (!selectedMotorista) { setSelectedMotorista(row.label); setSortConfig({ key: 'absDiff', direction: 'desc' }); } }}>
                <td className="py-2.5 px-3 font-bold text-slate-700 border-r border-slate-100 bg-white sticky left-0 z-10 flex items-center gap-2">
                  {!selectedMotorista && (<div className="p-1 rounded transition-colors bg-slate-100 text-slate-400 group-hover:bg-blue-100 group-hover:text-blue-600 shrink-0"><ChevronRight className="w-4 h-4" /></div>)}
                  <span className="truncate">
                    {selectedMotorista && row.label !== 'Rota S/ ID' && !row.label.includes('SemID') ? (
                      <a href={`https://envios.adminml.com/logistics/monitoring-distribution/detail/${row.label}`} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline hover:text-blue-700" onClick={(e) => e.stopPropagation()}>
                        {row.label}
                      </a>
                    ) : (
                      row.label
                    )}
                  </span>
                </td>
                <td className="py-2.5 px-3 font-medium text-right text-blue-600 bg-blue-50/10">{formatQtd(row.opRotasCount)}</td>
                <td className="py-2.5 px-3 font-medium text-right text-blue-600 bg-blue-50/10">{formatQtd(row.bscRotasCount)}</td>
                <td className="py-2.5 px-3 text-center border-r border-slate-100 bg-blue-50/30">{renderBadge(row.diffRotas)}</td>
                <td className="py-2.5 px-3 font-medium text-right text-slate-500 bg-slate-50/10">{formatQtd(row.opSaldo)}</td>
                <td className="py-2.5 px-3 font-medium text-right text-slate-500 bg-slate-50/10">{formatQtd(row.bscSaldo)}</td>
                <td className="py-2.5 px-3 text-center border-r border-slate-100 bg-slate-50/40">{renderBadge(row.diffSaldo)}</td>
                <td className="py-2.5 px-3 font-medium text-right text-emerald-600 bg-emerald-50/10">{formatQtd(row.opEntregues)}</td>
                <td className="py-2.5 px-3 font-medium text-right text-emerald-600 bg-emerald-50/10">{formatQtd(row.bscEntregues)}</td>
                <td className="py-2.5 px-3 text-center border-r border-slate-100 bg-emerald-50/30">{renderBadge(row.diffEntregues)}</td>
                <td className="py-2.5 px-3 font-bold text-right text-violet-600 bg-violet-50/10">{formatDS(row.dsOp)}</td>
                <td className="py-2.5 px-3 font-bold text-right text-violet-600 bg-violet-50/10">{formatDS(row.dsBsc)}</td>
                <td className="py-2.5 px-3 text-center bg-violet-50/30">{renderBadge(row.diffDs, true)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
