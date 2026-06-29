import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUpRight, ArrowDownRight, Activity, TrendingUp, TrendingDown, AlertTriangle, DollarSign, Package, ShieldAlert, Users, CheckCircle, Truck, Calculator, Filter, History, MapPin, Search, ChevronDown, ChevronUp, Download, Eye, EyeOff, Minus, FileSpreadsheet, ExternalLink, Navigation, ArrowUpDown, ArrowUp, ArrowDown, RefreshCw } from 'lucide-react';
import { formatCurrency, formatQtd, formatDS, normalizeText } from '../../lib/utils';
import { NativeRunRateChart } from '../ui/NativeRunRateChart';
import { NativeComboChart } from '../ui/NativeComboChart';
import { NativeDSChart } from '../ui/NativeDSChart';
import { Skeleton } from '../ui/Skeleton';
import { HeatmapPenalidades } from '../ui/HeatmapPenalidades';
import { supabase } from '../../supabase';

export const DetalheFinanceiroSection = ({ dadosFiltrados, onExport, isExporting, initialFilial, initialMotorista, returnToModalState, onReturnToModal }) => {
  const [sortConfig, setSortConfig] = useState({ key: 'totalValor', direction: 'desc' });
  const [selectedFilial, setSelectedFilial] = useState(initialFilial || null);
  React.useEffect(() => { if (initialFilial) setSelectedFilial(initialFilial); }, [initialFilial]);
  const [selectedMotorista, setSelectedMotorista] = useState(initialMotorista || null);
  React.useEffect(() => { if (initialMotorista) setSelectedMotorista(initialMotorista); else setSelectedMotorista(null); }, [initialMotorista]);

  const [detailedCasosMap, setDetailedCasosMap] = useState({});
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  React.useEffect(() => {
    if (selectedFilial && !detailedCasosMap[selectedFilial]) {
      setIsLoadingDetails(true);
      supabase.rpc('get_detalhes_penalidades_filial', { p_filial: selectedFilial })
        .then(({ data, error }) => {
          if (!error && data) {
            setDetailedCasosMap(prev => ({ ...prev, [selectedFilial]: data }));
          }
        })
        .finally(() => setIsLoadingDetails(false));
    }
  }, [selectedFilial, detailedCasosMap]);

  const handleSort = (key) => {
    let direction = 'desc';
    if (sortConfig.key === key && sortConfig.direction === 'desc') direction = 'asc';
    setSortConfig({ key, direction });
  };

  const handleLevelUp = () => {
    if (selectedMotorista) { setSelectedMotorista(null); setSortConfig({ key: 'totalValor', direction: 'desc' }); }
    else if (selectedFilial) { setSelectedFilial(null); setSortConfig({ key: 'totalValor', direction: 'desc' }); }
  };

  const dataAgrupada = useMemo(() => {
    const map = {};
    dadosFiltrados.forEach(d => {
      const fKey = normalizeText(d.filial);
      if (!map[fKey]) map[fKey] = { filial: d.filial, totalValor: 0, totalQtd: 0, pnrValor: 0, pnrQtd: 0, lostValor: 0, lostQtd: 0, nvValor: 0, nvQtd: 0, motoristasMap: {} };

      const mKey = normalizeText(d.motorista);
      if (!map[fKey].motoristasMap[mKey]) map[fKey].motoristasMap[mKey] = { motorista: d.motorista, totalValor: 0, totalQtd: 0, pnrValor: 0, pnrQtd: 0, lostValor: 0, lostQtd: 0, nvValor: 0, nvQtd: 0, casos: [] };

      const qtd = d._pesoQtd !== undefined ? d._pesoQtd : 1; const valor = d.valor || 0;

      map[fKey].totalValor += valor; map[fKey].totalQtd += qtd;
      if (d.tipo === 'PNRs') { map[fKey].pnrValor += valor; map[fKey].pnrQtd += qtd; }
      else if (d.tipo === 'Lost Packages') { map[fKey].lostValor += valor; map[fKey].lostQtd += qtd; }
      else if (d.tipo === 'Not Visited') { map[fKey].nvValor += valor; map[fKey].nvQtd += qtd; }

      map[fKey].motoristasMap[mKey].totalValor += valor; map[fKey].motoristasMap[mKey].totalQtd += qtd;
      if (d.tipo === 'PNRs') { map[fKey].motoristasMap[mKey].pnrValor += valor; map[fKey].motoristasMap[mKey].pnrQtd += qtd; }
      else if (d.tipo === 'Lost Packages') { map[fKey].motoristasMap[mKey].lostValor += valor; map[fKey].motoristasMap[mKey].lostQtd += qtd; }
      else if (d.tipo === 'Not Visited') { map[fKey].motoristasMap[mKey].nvValor += valor; map[fKey].motoristasMap[mKey].nvQtd += qtd; }

      map[fKey].motoristasMap[mKey].casos.push({ tipo: d.tipo, valor: valor, qtd: qtd, id_display: d.tipo === 'Not Visited' ? (d.id_rota || '-') : ((!d.id_pacote || d.id_pacote === '-' || d.id_pacote === 'N/A') ? (d.id_rota || '-') : d.id_pacote) });
    });
    return Object.values(map).map(f => ({ ...f, motoristas: Object.values(f.motoristasMap) }));
  }, [dadosFiltrados]);

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
    if (!selectedMotorista) return sortArray(filialData.motoristas);
    
    if (detailedCasosMap[selectedFilial]) {
      const validQuinzenas = new Set(dadosFiltrados.map(df => df.quinzena));
      const dbCasos = detailedCasosMap[selectedFilial]
        .filter(d => normalizeText(d.motorista) === normalizeText(selectedMotorista) && validQuinzenas.has(d.quinzena))
        .map(d => {
           let isRota = d.tipo === 'Not Visited';
           let idVal = isRota ? d.id_rota : d.id_pacote;

           if (!idVal || idVal === '-' || idVal === 'N/A') {
             idVal = d.id_rota;
             isRota = true;
           }

           return {
             tipo: d.tipo,
             valor: d.valor,
             qtd: d.qtd || 1,
             id_display: idVal || '-',
             isRota: isRota
           };
        });
      if (dbCasos.length > 0) return sortArray(dbCasos);
    }

    const motoristaData = filialData.motoristas.find(m => m.motorista === selectedMotorista);
    if (!motoristaData) return [];
    return sortArray(motoristaData.casos);
  }, [dataAgrupada, selectedFilial, selectedMotorista, sortConfig, detailedCasosMap]);

  const SortIcon = ({ columnKey }) => {
    if (sortConfig.key !== columnKey) return <ArrowUpDown className="w-3 h-3 inline-block ml-1 opacity-30" />;
    return sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 inline-block ml-1 text-blue-500" /> : <ArrowDown className="w-3 h-3 inline-block ml-1 text-blue-500" />;
  };

  return (
    <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200 mb-8 flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <DollarSign className="w-6 h-6 text-blue-500 shrink-0" />
          <div className="min-w-0">
            <h2 className="text-xl md:text-2xl font-bold text-slate-800 truncate">{selectedMotorista ? `Casos: ${selectedMotorista}` : selectedFilial ? `Motoristas: ${selectedFilial}` : 'Detalhamento Financeiro'}</h2>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto shrink-0">
          {(selectedFilial || selectedMotorista) && (<button onClick={handleLevelUp} className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2.5 rounded-xl text-sm font-bold shadow-sm">← Voltar</button>)}
          <button onClick={() => onExport({ filial: selectedFilial, motorista: selectedMotorista })} disabled={isExporting} className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-sm disabled:opacity-50">
            {isExporting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />} Gerar Planilha Excel
          </button>
        </div>
      </div>

      {selectedFilial && !selectedMotorista && (
        <div className="mb-4">
          <HeatmapPenalidades data={dadosFiltrados.filter(d => d.filial === selectedFilial)} />
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm w-full">
        <table className="w-full text-left border-collapse min-w-[1000px]">
          <thead className="bg-slate-50 sticky top-0 z-20 shadow-sm">
            {!selectedMotorista ? (
              <tr className="text-[10px] uppercase tracking-wider text-slate-500 select-none">
                <th className="py-3 px-3 font-bold border-b border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort(selectedFilial ? 'motorista' : 'filial')}>{selectedFilial ? 'Motorista' : 'Filial'} <SortIcon columnKey={selectedFilial ? 'motorista' : 'filial'} /></th>
                <th className="py-3 px-3 font-bold border-b border-slate-200 text-right cursor-pointer hover:bg-slate-100 transition-colors text-slate-800 bg-slate-100/50" onClick={() => handleSort('totalValor')}>Total (R$) <SortIcon columnKey="totalValor" /></th>
                <th className="py-3 px-3 font-bold border-b border-slate-200 text-right cursor-pointer hover:bg-slate-100 transition-colors text-slate-800 bg-slate-100/50" onClick={() => handleSort('totalQtd')}>Total (Qtd) <SortIcon columnKey="totalQtd" /></th>
                <th className="py-3 px-3 font-bold border-b border-slate-200 text-right cursor-pointer hover:bg-slate-100 transition-colors text-blue-600 bg-blue-50/30" onClick={() => handleSort('pnrValor')}>PNR (R$) <SortIcon columnKey="pnrValor" /></th>
                <th className="py-3 px-3 font-bold border-b border-slate-200 text-right cursor-pointer hover:bg-slate-100 transition-colors text-blue-600 bg-blue-50/30" onClick={() => handleSort('pnrQtd')}>PNR (Qtd) <SortIcon columnKey="pnrQtd" /></th>
                <th className="py-3 px-3 font-bold border-b border-slate-200 text-right cursor-pointer hover:bg-slate-100 transition-colors text-orange-600 bg-orange-50/30" onClick={() => handleSort('lostValor')}>Lost (R$) <SortIcon columnKey="lostValor" /></th>
                <th className="py-3 px-3 font-bold border-b border-slate-200 text-right cursor-pointer hover:bg-slate-100 transition-colors text-orange-600 bg-orange-50/30" onClick={() => handleSort('lostQtd')}>Lost (Qtd) <SortIcon columnKey="lostQtd" /></th>
                <th className="py-3 px-3 font-bold border-b border-slate-200 text-right cursor-pointer hover:bg-slate-100 transition-colors text-slate-600" onClick={() => handleSort('nvValor')}>NV (R$) <SortIcon columnKey="nvValor" /></th>
                <th className="py-3 px-3 font-bold border-b border-slate-200 text-right cursor-pointer hover:bg-slate-100 transition-colors text-slate-600" onClick={() => handleSort('nvQtd')}>NV (Qtd) <SortIcon columnKey="nvQtd" /></th>
              </tr>
            ) : (
              <tr className="text-[10px] uppercase tracking-wider text-slate-500 select-none">
                <th className="py-3 px-3 font-bold border-b border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('tipo')}>Tipo <SortIcon columnKey="tipo" /></th>
                <th className="py-3 px-3 font-bold border-b border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('id_display')}>ID <SortIcon columnKey="id_display" /></th>
                <th className="py-3 px-3 font-bold border-b border-slate-200 text-right cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('valor')}>Valor (R$) <SortIcon columnKey="valor" /></th>
              </tr>
            )}
          </thead>
          <tbody>
            {!selectedMotorista && currentViewData.map((row, idx) => (
              <tr key={idx} onClick={() => { if (!selectedFilial) { setSelectedFilial(row.filial); setSortConfig({ key: 'totalValor', direction: 'desc' }); } else { setSelectedMotorista(row.motorista); setSortConfig({ key: 'valor', direction: 'desc' }); } }} className="border-b border-slate-100 hover:bg-blue-50/50 cursor-pointer transition-colors bg-white text-xs">
                <td className="py-2.5 px-3 font-medium text-slate-700">{selectedFilial ? row.motorista : row.filial}</td>
                <td className="py-2.5 px-3 font-semibold text-right text-slate-800 bg-slate-50/30">{formatCurrency(row.totalValor)}</td>
                <td className="py-2.5 px-3 font-medium text-right text-slate-600 bg-slate-50/30">{formatQtd(row.totalQtd)}</td>
                <td className="py-2.5 px-3 font-medium text-right text-blue-700 bg-blue-50/10">{formatCurrency(row.pnrValor)}</td>
                <td className="py-2.5 px-3 font-medium text-right text-blue-600 bg-blue-50/10">{formatQtd(row.pnrQtd)}</td>
                <td className="py-2.5 px-3 font-medium text-right text-orange-700 bg-orange-50/10">{formatCurrency(row.lostValor)}</td>
                <td className="py-2.5 px-3 font-medium text-right text-orange-600 bg-orange-50/10">{formatQtd(row.lostQtd)}</td>
                <td className="py-2.5 px-3 font-medium text-right text-slate-700">{formatCurrency(row.nvValor)}</td>
                <td className="py-2.5 px-3 font-medium text-right text-slate-500">{formatQtd(row.nvQtd)}</td>
              </tr>
            ))}
            {selectedMotorista && currentViewData.map((caso, idx) => (
              <tr key={idx} className="border-b border-slate-100 bg-white hover:bg-slate-50 transition-colors text-xs">
                <td className="py-2 px-3 font-semibold uppercase">{caso.tipo}</td>
                <td className="py-2 px-3 font-mono text-[11px]">
                  {caso.id_display !== '-' && caso.id_display !== 'N/A' ? (
                    caso.isRota ? (
                      <a href={`https://envios.adminml.com/logistics/monitoring-distribution/detail/${caso.id_display}`} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline hover:text-blue-700" onClick={(e) => e.stopPropagation()}>
                        {caso.id_display}
                      </a>
                    ) : (
                      <a href={`https://envios.adminml.com/logistics/package-management/package/${caso.id_display}`} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline hover:text-blue-700" onClick={(e) => e.stopPropagation()}>
                        {caso.id_display}
                      </a>
                    )
                  ) : (
                    caso.id_display
                  )}
                </td>
                <td className="py-2 px-3 font-semibold text-right">{formatCurrency(caso.valor)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
