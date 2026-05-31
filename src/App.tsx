import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { 
  Lock, 
  LayoutDashboard, 
  AlertCircle, 
  TrendingUp, 
  TrendingDown,
  RefreshCw, 
  ArrowUpDown,
  ArrowDown,
  ArrowUp,
  Scale,
  Activity,
  PackageCheck,
  Database,
  Box,
  Check,
  Filter,
  Target,
  FileSpreadsheet,
  Calculator,
  ChevronDown,
  ChevronRight,
  DollarSign,
  GitCompare,
  PieChart,
  Moon,
  Sun
} from 'lucide-react';

// ============================================================================
// DADOS PRÉ-PROCESSADOS (MOCK VAZIO)
// ============================================================================
const initialParsedData = [];
const initialFaturamentoData = [];
const initialOperacionalData = [];
const initialBscData = [];

// ============================================================================
// FUNÇÕES AUXILIARES GLOBAIS
// ============================================================================
const parseCSVLine = (line, delimiter) => {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
};

const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
const formatQtd = (value) => value === undefined || value === null ? 0 : new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(Number(value));
const formatDS = (value) => value === undefined || value === null ? '0%' : (Number(value.toFixed(2)) + '%');
const normalizeText = (str) => String(str).trim().toUpperCase();
const normalizeHeader = (str) => (!str ? '' : str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim());

const normalizeQuinzena = (val) => {
  if (!val) return 'N/A';
  const cleanVal = String(val).trim();
  if (/^\d{4}\d{2}Q[12]$/i.test(cleanVal)) return cleanVal.toUpperCase();
  const dateMatchBR = cleanVal.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (dateMatchBR) {
    const day = parseInt(dateMatchBR[1], 10);
    const month = parseInt(dateMatchBR[2], 10).toString().padStart(2, '0');
    let year = parseInt(dateMatchBR[3], 10);
    if (year < 100) year += 2000;
    return `${year}${month}${day <= 15 ? 'Q1' : 'Q2'}`;
  }
  const dateMatchUS = cleanVal.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (dateMatchUS) {
    const year = parseInt(dateMatchUS[1], 10);
    const month = parseInt(dateMatchUS[2], 10).toString().padStart(2, '0');
    return `${year}${month}${parseInt(dateMatchUS[3], 10) <= 15 ? 'Q1' : 'Q2'}`;
  }
  return cleanVal;
};

const extractRegional = (val) => {
  if (!val) return 'N/A';
  const str = String(val).trim();
  const numMatch = str.match(/\b([1-5])\b/); 
  if (numMatch) return numMatch[1];
  const fallbackMatch = str.match(/[1-5]/);
  return fallbackMatch ? fallbackMatch[0] : str;
};

const loadScript = (src) => {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const script = document.createElement('script');
    script.src = src; script.onload = resolve; script.onerror = reject;
    document.head.appendChild(script);
  });
};

const verificarAcesso = () => {
  const tempoSalvo = localStorage.getItem('dashopAuthTime');
  if (!tempoSalvo) return false;
  const tempoPassado = Date.now() - parseInt(tempoSalvo, 10);
  const dezMinutos = 10 * 60 * 1000;
  if (tempoPassado > dezMinutos) {
    localStorage.removeItem('dashopAuthTime');
    return false;
  }
  return true; 
};

// ============================================================================
// COMPONENTES AUXILIARES E GRÁFICOS
// ============================================================================
const MultiSelectDropdown = ({ label, options, selected, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleOption = (opt) => selected.includes(opt) ? onChange(selected.filter(i => i !== opt)) : onChange([...selected, opt]);
  const selectAll = () => onChange([]);
  const displayText = selected.length === 0 ? 'Todas' : (selected.length === 1 ? selected[0] : `${selected.length} selecionadas`);

  return (
    <div className="relative shrink-0 flex items-center z-50">
      <span className="text-[10px] font-bold text-slate-500 uppercase px-2 hidden sm:block dark:text-slate-400">{label}:</span>
      <button onClick={() => setIsOpen(!isOpen)} className={`bg-white border text-sm rounded-xl px-3 py-1.5 outline-none font-bold cursor-pointer shadow-sm flex items-center justify-between min-w-[120px] max-w-[180px] transition-all duration-200 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 ${isOpen ? 'border-blue-500 ring-2 ring-blue-500/20 text-blue-700 dark:ring-blue-500/50' : 'border-slate-300 text-slate-700 hover:border-blue-400'}`}>
        <span className="truncate">{displayText}</span>
        <ArrowDown className={`w-3 h-3 ml-2 shrink-0 transition-transform ${isOpen ? 'rotate-180 text-blue-500' : 'text-slate-400'}`} />
      </button>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)}></div>
          <div className="absolute top-full mt-2 w-64 max-h-72 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-2 flex flex-col gap-1 animate-in fade-in zoom-in-95 duration-100 dark:bg-slate-800 dark:border-slate-700">
            <button onClick={selectAll} className={`text-left px-3 py-2.5 rounded-lg text-sm font-bold transition-colors ${selected.length === 0 ? 'bg-blue-50 text-blue-700 dark:bg-slate-700/50 dark:text-blue-400' : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700/50'}`}>
              {selected.length === 0 ? '✓ Todas Selecionadas' : 'Selecionar Todas'}
            </button>
            <div className="h-px bg-slate-100 my-1 dark:bg-slate-700"></div>
            {options.map((opt, idx) => (
              <div key={idx} onClick={() => toggleOption(opt)} className="flex items-center gap-3 px-3 py-2 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors group dark:hover:bg-slate-700/50">
                <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0 ${selected.includes(opt) ? 'bg-blue-600 border-blue-600' : 'border-slate-300 dark:border-slate-600 group-hover:border-blue-400'}`}>
                  {selected.includes(opt) && <Check className="w-3 h-3 text-white" />}
                </div>
                <span className={`text-sm truncate ${selected.includes(opt) ? 'font-bold text-slate-800 dark:text-white' : 'font-medium text-slate-600 dark:text-slate-300'}`} title={opt}>{opt}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

const NativeComboChart = ({ data, labelKey = "name", onBarClick, heightClass = "h-[400px]" }) => {
  const [hoveredIndex, setHoveredIndex] = useState(null);
  React.useEffect(() => setHoveredIndex(null), [data]);
  const safeData = data ? data.filter(d => d !== undefined && d !== null) : [];
  if (safeData.length === 0) return <div className={`w-full ${heightClass} flex items-center justify-center text-slate-400`}>Nenhum dado disponível.</div>;
  
  const maxFat = Math.max(1, ...safeData.map(d => Math.max(d.faturamento || 0, d.penalidades || 0)));
  const maxRep = Math.max(10, ...safeData.map(d => d.representatividade !== Infinity && d.representatividade ? d.representatividade : 0)); 
  const log10 = (val) => Math.log10(Math.max(val, 0) + 1);
  const logMaxFat = log10(maxFat);

  const formatAxisVal = (val) => {
    if (val < 1) return 'R$ 0';
    if (val >= 1000) return `R$ ${(val / 1000).toFixed(1)}k`;
    return `R$ ${Math.round(val)}`;
  };

  const yAxisSteps = [4, 3, 2, 1, 0];

  return (
    <div className={`w-full ${heightClass} flex flex-col pt-6 pb-20 relative`}>
      <div className="absolute top-0 left-0 text-[9px] text-slate-400 font-bold uppercase tracking-wider">Escala Logarítmica (R$)</div>
      <div className="absolute top-0 right-0 text-[9px] text-slate-400 font-bold uppercase tracking-wider">Linear (%)</div>
      <div className="flex-1 flex relative mt-2">
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
          {yAxisSteps.map((step, idx) => {
            const valAtStep = Math.pow(10, logMaxFat * (step / 4)) - 1;
            return (
              <div key={`y-axis-${idx}`} className="w-full border-t border-slate-100 dark:border-slate-700/50 flex items-center justify-between" style={{ height: step === 0 ? '0px' : 'auto', marginTop: step === 4 ? '-10px' : '0' }}>
                <span className="text-[10px] font-medium text-emerald-600 bg-white dark:bg-slate-800 pr-2 -translate-y-1/2">{formatAxisVal(valAtStep)}</span>
                <span className="text-[10px] font-bold text-violet-500 bg-white dark:bg-slate-800 pl-2 -translate-y-1/2">{`${((maxRep * (step / 4))).toFixed(1)}%`}</span>
              </div>
            );
          })}
        </div>
        <div className="z-10 flex w-full h-full items-end justify-around gap-1 sm:gap-2 ml-12 mr-10 border-b border-slate-300 dark:border-slate-700 relative">
          <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible z-20" viewBox="0 0 100 100" preserveAspectRatio="none">
            <polyline points={safeData.map((d, i) => `${(i + 0.5) * (100 / safeData.length)},${100 - Math.min(Math.max(((d.representatividade || 0) / maxRep) * 100, 0), 100)}`).join(' ')} fill="none" stroke="#7c3aed" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
          </svg>
          {hoveredIndex !== null && safeData[hoveredIndex] && (
            <div className="absolute left-0 w-full border-t-2 border-dashed border-slate-800 dark:border-white opacity-80 z-10 pointer-events-none transition-all duration-200" style={{ bottom: `${Math.min(Math.max(((safeData[hoveredIndex].representatividade || 0) / maxRep) * 100, 0), 100)}%` }} />
          )}
          {safeData.map((d, i) => {
            const fatPct = (log10(d.faturamento || 0) / logMaxFat) * 100;
            const penPct = (log10(d.penalidades || 0) / logMaxFat) * 100;
            const repPct = Math.min(Math.max(((d.representatividade || 0) / maxRep) * 100, 0), 100);
            const pnrRatio = d.penalidades > 0 ? ((d.pnr || 0) / d.penalidades) * 100 : 0;
            const lostRatio = d.penalidades > 0 ? ((d.lost || 0) / d.penalidades) * 100 : 0;
            const nvRatio = d.penalidades > 0 ? ((d.notVisited || 0) / d.penalidades) * 100 : 0;

            return (
              <div key={`bar-${i}`} className={`flex-1 flex flex-col justify-end h-full relative group max-w-[60px] ${onBarClick ? 'cursor-pointer' : ''}`} onClick={() => onBarClick && onBarClick(d[labelKey])} onMouseEnter={() => setHoveredIndex(i)} onMouseLeave={() => setHoveredIndex(null)}>
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 hidden group-hover:block z-50 w-60 bg-slate-900 text-white text-xs rounded-lg p-4 shadow-xl pointer-events-none">
                  <p className="font-bold border-b border-slate-700 pb-2 mb-3 text-center">{d[labelKey]}</p>
                  <div className="flex justify-between mb-1.5"><span className="text-emerald-400">Faturamento</span><span className="font-mono">{formatCurrency(d.faturamento || 0)}</span></div>
                  <div className="flex justify-between mt-2 pt-2 border-t border-slate-700 mb-1"><span className="text-slate-300 font-bold">Total Penalidades</span><span className="font-mono text-red-400 font-bold">{formatCurrency(d.penalidades || 0)}</span></div>
                  <div className="flex justify-between mb-0.5 pl-2"><span className="text-blue-400 text-[10px]">↳ PNRs</span><span className="font-mono text-[10px]">{formatCurrency(d.pnr || 0)}</span></div>
                  <div className="flex justify-between mb-0.5 pl-2"><span className="text-orange-400 text-[10px]">↳ Lost</span><span className="font-mono text-[10px]">{formatCurrency(d.lost || 0)}</span></div>
                  <div className="flex justify-between mb-1.5 pl-2"><span className="text-slate-400 text-[10px]">↳ Not Visited</span><span className="font-mono text-[10px]">{formatCurrency(d.notVisited || 0)}</span></div>
                  <div className="flex justify-between font-bold border-t border-slate-700 pt-2 mt-2">
                     <span className="text-violet-300">Representatividade</span>
                     <span className="text-violet-400">{d.representatividade === Infinity || !d.representatividade ? 'S/ Fat.' : `${d.representatividade.toFixed(2)}%`}</span>
                  </div>
                </div>
                <div className="w-full flex items-end justify-center h-full gap-[1px]">
                  <div className="bg-emerald-400 w-1/2 rounded-t-sm hover:opacity-80 transition-opacity" style={{ height: `${fatPct}%` }}></div>
                  <div className="w-1/2 flex flex-col justify-end hover:opacity-80 transition-opacity" style={{ height: `${penPct}%` }}>
                    {nvRatio > 0 && <div className="bg-slate-300 w-full" style={{ height: `${nvRatio}%` }}></div>}
                    {lostRatio > 0 && <div className="bg-orange-500 w-full" style={{ height: `${lostRatio}%` }}></div>}
                    {pnrRatio > 0 && <div className="bg-blue-500 w-full" style={{ height: `${pnrRatio}%` }}></div>}
                  </div>
                </div>
                <div className="absolute w-2 h-2 sm:w-2.5 sm:h-2.5 bg-white rounded-full border-2 border-violet-600 shadow-sm left-1/2 -translate-x-1/2 z-30 transition-all group-hover:scale-150 flex justify-center" style={{ bottom: `calc(${repPct}% - 4px)` }}>
                  <span className="absolute bottom-full mb-1 text-[9px] font-bold text-violet-700 bg-white/90 px-1 py-0.5 rounded shadow-sm whitespace-nowrap pointer-events-none">{d[labelKey]}</span>
                </div>
                <div className="absolute top-full mt-3 w-full text-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-[9px] sm:text-[10px] text-slate-600 dark:text-slate-400 font-bold truncate">{d[labelKey]}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="absolute bottom-2 left-0 w-full flex justify-center gap-4 sm:gap-6 text-xs font-bold text-slate-600 dark:text-slate-400 flex-wrap">
        <span className="flex items-center gap-1.5"><div className="w-3 h-3 bg-emerald-400 rounded-sm"></div> Faturamento</span>
        <span className="flex items-center gap-1.5"><div className="w-3 h-3 bg-blue-500 rounded-sm"></div> PNRs</span>
        <span className="flex items-center gap-1.5"><div className="w-3 h-3 bg-orange-500 rounded-sm"></div> Lost Packages</span>
        <span className="flex items-center gap-1.5"><div className="w-3 h-3 bg-slate-300 rounded-sm"></div> Not Visited</span>
      </div>
    </div>
  );
};

const NativeDSChart = ({ data, labelKey = "name", onBarClick, heightClass = "h-[400px]" }) => {
  const [hoveredIndex, setHoveredIndex] = useState(null);
  React.useEffect(() => setHoveredIndex(null), [data]);
  const safeData = data ? data.filter(d => d !== undefined && d !== null) : [];
  if (safeData.length === 0) return <div className={`w-full ${heightClass} flex items-center justify-center text-slate-400`}>Nenhum dado disponível.</div>;

  const maxVol = Math.max(1, ...safeData.map(d => d.saldo || 0));
  const log10 = (val) => Math.log10(Math.max(val, 0) + 1);
  const logMaxVol = log10(maxVol);
  const formatAxisVal = (val) => {
    if (val < 1) return '0';
    if (val >= 1000) return `${(val / 1000).toFixed(1)}k`;
    return `${Math.round(val)}`;
  };
  const yAxisSteps = [4, 3, 2, 1, 0];
  const dsSteps = [100, 95, 90, 85, 80];

  return (
    <div className={`w-full ${heightClass} flex flex-col pt-6 pb-20 relative`}>
      <div className="absolute top-0 left-0 text-[9px] text-slate-400 font-bold uppercase tracking-wider">Escala Logarítmica (Vol.)</div>
      <div className="absolute top-0 right-0 text-[9px] text-slate-400 font-bold uppercase tracking-wider">Linear (DS %)</div>
      <div className="flex-1 flex relative mt-2">
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
          {yAxisSteps.map((step, idx) => {
            const valAtStep = Math.pow(10, logMaxVol * (step / 4)) - 1;
            const dsAtStep = dsSteps[idx];
            return (
              <div key={`y-axis-${idx}`} className="w-full border-t border-slate-100 dark:border-slate-700/50 flex items-center justify-between" style={{ height: step === 0 ? '0px' : 'auto', marginTop: step === 4 ? '-10px' : '0' }}>
                <span className="text-[10px] font-medium text-slate-500 bg-white dark:bg-slate-800 pr-2 -translate-y-1/2">{formatAxisVal(valAtStep)}</span>
                <span className="text-[10px] font-bold text-emerald-600 bg-white dark:bg-slate-800 pl-2 -translate-y-1/2">{`${dsAtStep}%`}</span>
              </div>
            );
          })}
        </div>
        <div className="z-10 flex w-full h-full items-end justify-around gap-1 sm:gap-2 ml-12 mr-10 border-b border-slate-300 dark:border-slate-700 relative">
          <div className="absolute w-full border-t-[3px] border-dashed border-slate-800 dark:border-slate-500 z-10 pointer-events-none opacity-60 flex items-center" style={{ bottom: `${((98.5 - 80) / 20) * 100}%` }}>
             <span className="absolute left-0 -ml-12 text-[10px] font-black text-white bg-slate-800 dark:bg-slate-600 px-1.5 py-0.5 rounded shadow-sm">META</span>
          </div>
          <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible z-20" viewBox="0 0 100 100" preserveAspectRatio="none">
            <polyline points={safeData.map((d, i) => `${(i + 0.5) * (100 / safeData.length)},${100 - Math.min(Math.max((((d.ds || 0) - 80) / 20) * 100, 0), 100)}`).join(' ')} fill="none" stroke="#0f766e" strokeWidth="4" vectorEffect="non-scaling-stroke" />
          </svg>
          {hoveredIndex !== null && safeData[hoveredIndex] && (
            <div className="absolute left-0 w-full border-t-2 border-dashed border-slate-800 dark:border-white opacity-80 z-10 pointer-events-none transition-all duration-200" style={{ bottom: `${Math.min(Math.max((((safeData[hoveredIndex].ds || 0) - 80) / 20) * 100, 0), 100)}%` }} />
          )}
          {safeData.map((d, i) => {
            const saldoPct = (log10(d.saldo || 0) / logMaxVol) * 85;
            const dsDisplayPct = Math.min(Math.max((((d.ds || 0) - 80) / 20) * 100, 0), 100);
            const entreguesRatio = d.saldo > 0 ? ((d.entregues || 0) / d.saldo) * 100 : 0;
            const insucessosTotais = Math.max(0, (d.saldo || 0) - (d.entregues || 0));
            const insucessosRatio = d.saldo > 0 ? (insucessosTotais / d.saldo) * 100 : 0;
            const dotColor = (d.ds || 0) >= 98.5 ? 'border-emerald-500' : ((d.ds || 0) >= 95 ? 'border-orange-500' : 'border-red-500');
            const insDetalhes = d.insucessosDetalhados || {};
            const sortedInsucessos = Object.entries(insDetalhes).sort((a,b) => b[1] - a[1]).filter(item => item[1] > 0);
            const topIns = sortedInsucessos.slice(0, 5);
            const outrosVal = sortedInsucessos.slice(5).reduce((acc, curr) => acc + curr[1], 0);

            return (
              <div key={`bar-ds-${i}`} className={`flex-1 flex flex-col justify-end h-full relative group max-w-[60px] ${onBarClick ? 'cursor-pointer' : ''}`} onClick={() => onBarClick && onBarClick(d[labelKey])} onMouseEnter={() => setHoveredIndex(i)} onMouseLeave={() => setHoveredIndex(null)}>
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 hidden group-hover:block z-50 w-64 bg-slate-900 text-white text-xs rounded-lg p-4 shadow-xl pointer-events-none">
                  <p className="font-bold border-b border-slate-700 pb-2 mb-3 text-center">{d[labelKey]}</p>
                  <div className="flex justify-between mb-1.5"><span className="text-blue-400">Total de Pacotes</span><span className="font-mono">{formatQtd(d.saldo || 0)}</span></div>
                  <div className="flex justify-between mt-2 pt-2 border-t border-slate-700 mb-1"><span className="text-slate-300 font-bold">Composição Operacional</span></div>
                  <div className="flex justify-between mb-0.5 pl-2"><span className="text-emerald-400 text-[10px]">↳ Entregues</span><span className="font-mono text-[10px]">{formatQtd(d.entregues || 0)}</span></div>
                  <div className="flex justify-between mb-1.5 pl-2"><span className="text-red-400 text-[10px]">↳ Insucessos Totais</span><span className="font-mono text-[10px] font-bold">{formatQtd(insucessosTotais)}</span></div>
                  {(topIns.length > 0) && (
                    <>
                      <div className="flex justify-between mt-2 pt-2 border-t border-slate-700 mb-1">
                         <span className="text-slate-400 font-bold text-[9px] uppercase tracking-wider">Detalhamento de Insucessos</span>
                      </div>
                      {topIns.map(([motivo, val], idx) => (
                        <div key={idx} className="flex justify-between mb-0.5 pl-2 gap-2">
                           <span className="text-red-300 text-[9px] truncate max-w-[140px]" title={motivo}>↳ {motivo}</span>
                           <span className="font-mono text-red-200 text-[9px]">{formatQtd(val)}</span>
                        </div>
                      ))}
                      {outrosVal > 0 && (
                        <div className="flex justify-between mb-0.5 pl-2 gap-2">
                           <span className="text-red-300 text-[9px] truncate max-w-[140px]" title="Outros Classificados">↳ Outros (Classificados)</span>
                           <span className="font-mono text-red-200 text-[9px]">{formatQtd(outrosVal)}</span>
                        </div>
                      )}
                    </>
                  )}
                  <div className="flex justify-between font-bold border-t border-slate-700 pt-2 mt-2">
                     <span className="text-emerald-300">Delivery Success (DS)</span>
                     <span className={(d.ds||0) >= 98.5 ? 'text-emerald-400' : ((d.ds||0) >= 95 ? 'text-orange-400' : 'text-red-400')}>{formatDS(d.ds)}</span>
                  </div>
                </div>
                <div className="w-full flex items-end justify-center h-full gap-[1px]">
                  <div className="bg-blue-400 w-1/2 rounded-t-sm hover:opacity-80 transition-opacity" style={{ height: `${saldoPct}%` }}></div>
                  <div className="w-1/2 flex flex-col justify-end hover:opacity-80 transition-opacity" style={{ height: `${saldoPct}%` }}>
                    {insucessosRatio > 0 && <div className="bg-red-500 w-full" style={{ height: `${insucessosRatio}%` }}></div>}
                    {entreguesRatio > 0 && <div className="bg-emerald-500 w-full" style={{ height: `${entreguesRatio}%` }}></div>}
                  </div>
                </div>
                <div className={`absolute w-3 h-3 sm:w-3.5 sm:h-3.5 bg-white rounded-full border-[3px] shadow-md left-1/2 -translate-x-1/2 z-30 transition-all group-hover:scale-150 flex justify-center ${dotColor}`} style={{ bottom: `calc(${dsDisplayPct}% - 6px)` }}>
                  <span className="absolute bottom-full mb-1 text-[9px] font-bold text-slate-700 bg-white/95 px-1 py-0.5 rounded shadow-sm border border-slate-200 pointer-events-none">{d[labelKey]}</span>
                </div>
                <div className="absolute top-full mt-3 w-full text-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-[9px] sm:text-[10px] text-slate-600 dark:text-slate-400 font-bold truncate">{d[labelKey]}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="absolute bottom-2 left-0 w-full flex justify-center gap-4 sm:gap-6 text-xs font-bold text-slate-600 dark:text-slate-400 flex-wrap">
        <span className="flex items-center gap-1.5"><div className="w-3 h-3 bg-blue-400 rounded-sm"></div> Total de Pacotes</span>
        <span className="flex items-center gap-1.5"><div className="w-3 h-3 bg-emerald-500 rounded-sm"></div> Entregues</span>
        <span className="flex items-center gap-1.5"><div className="w-3 h-3 bg-red-500 rounded-sm"></div> Insucessos</span>
      </div>
    </div>
  );
};

const NativeRunRateChart = ({ diasOperados, totalDias, currentSaldo, currentEntregues, projSaldo, projEntregues }) => {
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const currentInsucessos = Math.max(0, currentSaldo - currentEntregues);
  const projInsucessos = Math.max(0, projSaldo - projEntregues);
  const currentDS = currentSaldo > 0 ? (currentEntregues / currentSaldo) * 100 : 0;
  const projDS = projSaldo > 0 ? (projEntregues / projSaldo) * 100 : 0;

  const data = [
    { label: `Realizado (D-${diasOperados})`, saldo: currentSaldo, entregues: currentEntregues, insucessos: currentInsucessos, ds: currentDS, isProj: false },
    { label: `Projeção (D-${totalDias})`, saldo: projSaldo, entregues: projEntregues, insucessos: projInsucessos, ds: projDS, isProj: true }
  ];

  const maxVol = Math.max(1, projSaldo) * 1.2;
  const yAxisSteps = [4, 3, 2, 1, 0];
  const dsSteps = [100, 95, 90, 85, 80];

  const formatAxisVal = (val) => {
    if (val < 1) return '0';
    if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `${(val / 1000).toFixed(1)}k`;
    return `${Math.round(val)}`;
  };

  const dsToY = (ds) => Math.min(Math.max((((ds || 0) - 80) / 20) * 100, 0), 100);

  return (
    <div className="w-full h-[320px] flex flex-col pt-6 pb-12 relative">
      <div className="absolute top-0 left-0 text-[9px] text-slate-400 font-bold uppercase tracking-wider">Linear (Volume)</div>
      <div className="absolute top-0 right-0 text-[9px] text-slate-400 font-bold uppercase tracking-wider">Linear (DS %)</div>
      <div className="flex-1 flex relative mt-2">
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
          {yAxisSteps.map((step, idx) => (
              <div key={`y-axis-${idx}`} className="w-full border-t border-slate-100 dark:border-slate-700/50 flex items-center justify-between" style={{ height: step === 0 ? '0px' : 'auto', marginTop: step === 4 ? '-10px' : '0' }}>
                <span className="text-[10px] font-medium text-slate-500 bg-slate-50/40 dark:bg-slate-800 pr-2 -translate-y-1/2">{formatAxisVal(maxVol * (step / 4))}</span>
                <span className="text-[10px] font-bold text-emerald-600 bg-slate-50/40 dark:bg-slate-800 pl-2 -translate-y-1/2">{`${dsSteps[idx]}%`}</span>
              </div>
          ))}
        </div>
        <div className="z-10 flex w-full h-full items-end justify-around gap-1 sm:gap-2 ml-12 mr-10 border-b border-slate-300 dark:border-slate-700 relative">
          <div className="absolute w-full border-t-[3px] border-dashed border-slate-800 dark:border-slate-500 z-10 pointer-events-none opacity-60 flex items-center" style={{ bottom: `${dsToY(98.5)}%` }}>
             <span className="absolute left-0 -ml-12 text-[10px] font-black text-white bg-slate-800 dark:bg-slate-600 px-1.5 py-0.5 rounded shadow-sm">META</span>
          </div>
          <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible z-20" viewBox="0 0 100 100" preserveAspectRatio="none">
            <line x1="25" y1={100 - dsToY(currentDS)} x2="75" y2={100 - dsToY(projDS)} stroke="#0f766e" strokeWidth="4" strokeDasharray="6 4" vectorEffect="non-scaling-stroke" />
          </svg>
          {data.map((d, i) => {
            const saldoPct = (d.saldo / maxVol) * 100;
            const entreguesRatio = d.saldo > 0 ? (d.entregues / d.saldo) * 100 : 0;
            const insucessosRatio = d.saldo > 0 ? (d.insucessos / d.saldo) * 100 : 0;
            const dotColor = d.ds >= 98.5 ? 'border-emerald-500' : (d.ds >= 95 ? 'border-orange-500' : 'border-red-500');

            return (
              <div key={i} className="flex-1 flex flex-col justify-end h-full relative group max-w-[120px] cursor-pointer" onMouseEnter={() => setHoveredIndex(i)} onMouseLeave={() => setHoveredIndex(null)}>
                {hoveredIndex === i && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 z-50 w-56 bg-slate-900 text-white text-xs rounded-lg p-4 shadow-xl pointer-events-none">
                    <p className="font-bold border-b border-slate-700 pb-2 mb-3 text-center">{d.label}</p>
                    <div className="flex justify-between mb-1.5"><span className="text-blue-400">Total Pacotes</span><span className="font-mono">{formatQtd(d.saldo)}</span></div>
                    <div className="flex justify-between mb-0.5"><span className="text-emerald-400">↳ Entregues</span><span className="font-mono">{formatQtd(d.entregues)}</span></div>
                    <div className="flex justify-between mb-3"><span className="text-red-400">↳ Insucessos</span><span className="font-mono">{formatQtd(d.insucessos)}</span></div>
                    <div className="flex justify-between font-bold border-t border-slate-700 pt-2">
                       <span className="text-emerald-300">DS Projetado</span>
                       <span className={d.ds >= 98.5 ? 'text-emerald-400' : (d.ds >= 95 ? 'text-orange-400' : 'text-red-400')}>{formatDS(d.ds)}</span>
                    </div>
                  </div>
                )}
                <div className={`w-full flex flex-col justify-end transition-opacity hover:opacity-100 ${d.isProj ? 'opacity-60' : 'opacity-90'}`} style={{ height: `${saldoPct}%` }}>
                  {insucessosRatio > 0 && <div className="bg-red-500 w-full" style={{ height: `${insucessosRatio}%` }}></div>}
                  {entreguesRatio > 0 && <div className="bg-emerald-500 w-full" style={{ height: `${entreguesRatio}%` }}></div>}
                </div>
                <div className={`absolute w-4 h-4 bg-white rounded-full border-[4px] shadow-lg left-1/2 -translate-x-1/2 z-30 transition-transform group-hover:scale-125 flex justify-center ${dotColor}`} style={{ bottom: `calc(${dsToY(d.ds)}% - 8px)` }}>
                  <span className="absolute bottom-full mb-1 text-[10px] font-bold text-slate-700 bg-white/95 px-1.5 py-0.5 rounded shadow-sm border border-slate-200 pointer-events-none">{formatDS(d.ds)}</span>
                </div>
                <div className="absolute top-full mt-4 w-full text-center"><p className="text-[10px] sm:text-xs text-slate-600 dark:text-slate-400 font-bold truncate">{d.label}</p></div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// COMPONENTE: PROJEÇÃO FINANCEIRA
// ============================================================================
const RunRateFinanceiroSection = ({ baseData, targetQuinzena, prevStats }) => {
  const { totalDias, diasOperados } = useMemo(() => {
    if (!targetQuinzena || targetQuinzena === 'N/A') return { totalDias: 15, diasOperados: 15 };
    const year = parseInt(targetQuinzena.substring(0, 4));
    const month = parseInt(targetQuinzena.substring(4, 6)) - 1;
    const q = targetQuinzena.substring(6, 8);
    const now = new Date();
    const isCurrentMonth = (year === now.getFullYear() && month === now.getMonth());
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const total = q === 'Q1' ? 15 : (daysInMonth - 15);
    let operados = total;

    if (isCurrentMonth) {
      if (q === 'Q1' && now.getDate() <= 15) operados = now.getDate() - 1; 
      else if (q === 'Q2' && now.getDate() > 15) operados = (now.getDate() - 15) - 1;
      else if (q === 'Q1' && now.getDate() > 15) operados = 15;
      else if (q === 'Q2' && now.getDate() <= 15) operados = 1;
    } else if (now < new Date(year, month, 1)) {
      operados = 1;
    }
    return { totalDias: total, diasOperados: Math.max(1, operados) };
  }, [targetQuinzena]);

  const [selectedRegional, setSelectedRegional] = useState(null);

  if (!baseData || baseData.length === 0) {
    return (
      <div className="bg-slate-50 dark:bg-slate-800 p-8 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 mb-8 flex flex-col items-center justify-center text-center gap-3">
        <AlertCircle className="w-8 h-8 text-slate-400" />
        <p className="text-slate-500 dark:text-slate-400 font-medium max-w-md">Nenhuma informação financeira disponível para a quinzena <strong>{targetQuinzena}</strong>.</p>
      </div>
    );
  }

  const mult = diasOperados > 0 ? totalDias / diasOperados : 1;

  let globalFat = 0, globalPen = 0, globalPnr = 0, globalLost = 0, globalNv = 0;
  baseData.forEach(d => { globalFat += d.faturamento; globalPen += d.penalidades; globalPnr += d.pnr; globalLost += d.lost; globalNv += d.notVisited; });

  const projFilialData = baseData.map(d => {
    const pFat = d.faturamento * mult;
    const pPen = d.penalidades * mult;
    return { ...d, faturamento: pFat, penalidades: pPen, pnr: d.pnr * mult, lost: d.lost * mult, notVisited: d.notVisited * mult, representatividade: pFat > 0 ? (pPen / pFat) * 100 : (pPen > 0 ? Infinity : 0) };
  }).sort((a, b) => b.penalidades - a.penalidades); 

  const regionalMap = {};
  baseData.forEach(d => {
    const regName = d.regional && d.regional !== 'N/A' ? `Regional ${d.regional}` : 'Sem Regional';
    const supName = d.supervisor && d.supervisor !== 'N/A' ? d.supervisor : '';
    const r = supName && regName !== 'Sem Regional' ? `${regName} - ${supName}` : regName;
    if (!regionalMap[r]) regionalMap[r] = { name: r, faturamento: 0, penalidades: 0, pnr: 0, lost: 0, notVisited: 0 };
    regionalMap[r].faturamento += d.faturamento; regionalMap[r].penalidades += d.penalidades;
    regionalMap[r].pnr += d.pnr; regionalMap[r].lost += d.lost; regionalMap[r].notVisited += d.notVisited;
  });

  const projRegionalData = Object.values(regionalMap).map(r => {
    const pFat = r.faturamento * mult; const pPen = r.penalidades * mult;
    return { ...r, faturamento: pFat, penalidades: pPen, pnr: r.pnr * mult, lost: r.lost * mult, notVisited: r.notVisited * mult, representatividade: pFat > 0 ? (pPen / pFat) * 100 : (pPen > 0 ? Infinity : 0) };
  }).sort((a, b) => b.penalidades - a.penalidades);

  const topOfensores = [...projFilialData].filter(d => d.penalidades > 0).sort((a, b) => b.representatividade - a.representatividade).slice(0, 6);
  const regionalDrilldownData = selectedRegional ? projFilialData.filter(d => {
        const regName = d.regional && d.regional !== 'N/A' ? `Regional ${d.regional}` : 'Sem Regional';
        const supName = d.supervisor && d.supervisor !== 'N/A' ? d.supervisor : '';
        return (supName && regName !== 'Sem Regional' ? `${regName} - ${supName}` : regName) === selectedRegional;
      }).sort((a, b) => b.representatividade - a.representatividade) : [];

  const getInsightTag = (variacao, isExpense = false) => {
    if (variacao === 0) return <span className="text-slate-400 font-bold">0.00%</span>;
    const isIncrease = variacao > 0;
    const isGood = isExpense ? !isIncrease : isIncrease;
    const colorClass = isGood ? 'text-emerald-400' : 'text-red-400';
    const Icon = isIncrease ? ArrowUp : ArrowDown;
    const bgClass = isGood ? 'bg-emerald-400/10' : 'bg-red-400/10';
    
    return (
        <span className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-black ${colorClass} ${bgClass}`}>
            <Icon className="w-3 h-3" />
            {isIncrease ? '+' : ''}{variacao.toFixed(1)}%
        </span>
    );
  };

  const projFatGlob = globalFat * mult;
  const projPenGlob = globalPen * mult;

  let fatVar = 0, penVar = 0, pnrVar = 0, lostVar = 0, nvVar = 0, repVar = 0, repPrev = 0, repProj = 0;
  
  if (prevStats) {
      fatVar = prevStats.fat > 0 ? ((projFatGlob - prevStats.fat) / prevStats.fat) * 100 : 0;
      penVar = prevStats.pen > 0 ? ((projPenGlob - prevStats.pen) / prevStats.pen) * 100 : 0;
      pnrVar = prevStats.pnr > 0 ? ((globalPnr * mult - prevStats.pnr) / prevStats.pnr) * 100 : 0;
      lostVar = prevStats.lost > 0 ? ((globalLost * mult - prevStats.lost) / prevStats.lost) * 100 : 0;
      nvVar = prevStats.nv > 0 ? ((globalNv * mult - prevStats.nv) / prevStats.nv) * 100 : 0;
      repPrev = prevStats.fat > 0 ? (prevStats.pen / prevStats.fat) * 100 : 0;
      repProj = projFatGlob > 0 ? (projPenGlob / projFatGlob) * 100 : 0;
      repVar = repProj - repPrev;
  }

  return (
    <div className="bg-white dark:bg-slate-800 p-6 md:p-10 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 mb-8 transition-colors">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-4">
        <div className="flex items-center gap-3">
          <Activity className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          <div><h2 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-white">Projeção de Fechamento Financeiro (Run Rate) - {targetQuinzena}</h2></div>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700 w-full lg:w-auto">
          <div className="flex flex-col gap-1 items-center justify-center px-4">
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Cálculo Automático</span>
            <span className="text-sm font-black text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/40 px-4 py-1.5 rounded-full border border-blue-200 dark:border-blue-800 shadow-sm">{diasOperados} / {totalDias} Dias Operados</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/30 p-5 rounded-2xl flex flex-col justify-center items-center"><span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase mb-1">Faturamento Projetado</span><span className="text-2xl font-black text-emerald-700 dark:text-emerald-500">{formatCurrency(globalFat * mult)}</span></div>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/30 p-5 rounded-2xl flex flex-col justify-center items-center text-center"><span className="text-xs font-bold text-red-600 dark:text-red-400 uppercase mb-1">Penalidades Projetadas</span><span className="text-2xl font-black text-red-700 dark:text-red-500 mb-1">{formatCurrency(globalPen * mult)}</span></div>
        <div className="bg-violet-50 dark:bg-violet-900/20 border border-violet-100 dark:border-violet-800/30 p-5 rounded-2xl flex flex-col justify-center items-center"><span className="text-xs font-bold text-violet-600 dark:text-violet-400 uppercase mb-1">Representatividade Estimada</span><span className="text-3xl font-black text-violet-700 dark:text-violet-400">{globalFat > 0 ? (((globalPen * mult) / (globalFat * mult)) * 100).toFixed(2) : 0}%</span></div>
      </div>

      {topOfensores.length > 0 && (
        <div className="mb-8 p-6 bg-red-50/40 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-2xl">
          <h3 className="text-sm font-black text-red-600 dark:text-red-400 mb-4 uppercase tracking-wider flex items-center gap-2"><AlertCircle className="w-5 h-5" /> Alerta de Risco Financeiro: Top 6 Maiores Impactos na Margem</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {topOfensores.map((filial, idx) => (
              <div key={idx} className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-red-100 dark:border-red-900/30 shadow-sm flex flex-col relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-red-500"></div>
                <div className="flex justify-between items-start mb-2"><div><span className="font-black text-slate-800 dark:text-white text-lg block">{filial.filial}</span><span className="text-xs font-bold text-slate-500 dark:text-slate-400">{filial.regional && filial.regional !== 'N/A' ? `Regional ${filial.regional}` : 'Sem Regional'}</span></div><span className="text-xs font-black text-white bg-red-500 px-2 py-0.5 rounded-full shadow-sm">#{idx + 1}</span></div>
                <div className="flex justify-between items-end mt-auto pt-3 border-t border-slate-100 dark:border-slate-700">
                  <div className="flex flex-col"><span className="text-[10px] text-slate-400 uppercase font-bold">Margem Comprometida</span><span className="text-lg font-black text-red-600 dark:text-red-400">{filial.representatividade === Infinity ? 'N/A' : `${filial.representatividade.toFixed(1)}%`}</span></div>
                  <div className="flex flex-col items-end"><span className="text-[10px] text-slate-400 uppercase font-bold">Projeção (Total)</span><span className="text-sm font-black text-violet-600 dark:text-violet-400">{formatCurrency(filial.penalidades)}</span></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700 rounded-2xl p-4 flex flex-col">
          <div className="flex items-center justify-between mb-4 px-2 pt-2"><h3 className="text-sm font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">{selectedRegional ? `Filiais: ${selectedRegional}` : 'Projeção por Regional'}</h3>{selectedRegional && (<button onClick={() => setSelectedRegional(null)} className="text-[10px] sm:text-xs font-bold text-blue-600 bg-blue-100 dark:bg-blue-900/40 dark:text-blue-400 px-2 py-1 rounded hover:bg-blue-200 transition-colors">← Voltar</button>)}</div>
          {!selectedRegional ? <NativeComboChart data={projRegionalData} labelKey="name" heightClass="h-[350px]" onBarClick={(r) => setSelectedRegional(r)} /> : <NativeComboChart data={regionalDrilldownData} labelKey="filial" heightClass="h-[350px]" />}
        </div>
        <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700 rounded-2xl p-4 flex flex-col"><h3 className="text-sm font-bold text-slate-600 dark:text-slate-300 text-center mb-2 pt-2 uppercase tracking-wider">Projeção por Filial (Maiores Descontos)</h3><NativeComboChart data={projFilialData.slice(0, 15)} labelKey="filial" heightClass="h-[350px]" /></div>
      </div>

      {prevStats && (
        <div className="mt-8 bg-slate-900 dark:bg-slate-950 rounded-3xl p-6 md:p-8 text-slate-300 shadow-xl border border-slate-800 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5">
                <Scale className="w-32 h-32 text-white" />
            </div>
            <h3 className="text-white font-bold text-xl md:text-2xl mb-6 flex items-center gap-3 relative z-10">
                <Activity className="w-6 h-6 text-blue-400" />
                Quadro Comparativo: Tendência Atual vs. {prevStats.name}
            </h3>
            
            <ul className="space-y-6 relative z-10">
                <li className="flex items-start gap-4">
                    <div className="mt-1.5 w-3 h-3 bg-emerald-500 rounded-full shrink-0 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                    <div>
                        <p className="text-base font-medium leading-relaxed">
                            <strong className="text-white tracking-wide">Faturamento:</strong> A projeção indica fechamento em <strong className="text-emerald-400">{formatCurrency(projFatGlob)}</strong>, o que representa uma variação de {getInsightTag(fatVar, false)} em relação à quinzena anterior ({formatCurrency(prevStats.fat)}).
                        </p>
                    </div>
                </li>
                <li className="flex items-start gap-4">
                    <div className="mt-1.5 w-3 h-3 bg-red-500 rounded-full shrink-0 shadow-[0_0_10px_rgba(239,68,68,0.5)]"></div>
                    <div>
                        <p className="text-base font-medium leading-relaxed">
                            <strong className="text-white tracking-wide">Penalidades Globais:</strong> A tendência aponta para <strong className="text-red-400">{formatCurrency(projPenGlob)}</strong> de descontos, configurando uma variação de {getInsightTag(penVar, true)} ante a última quinzena ({formatCurrency(prevStats.pen)}).
                        </p>
                    </div>
                </li>
                <li className="flex items-start gap-4">
                    <div className="mt-1.5 w-3 h-3 bg-violet-500 rounded-full shrink-0 shadow-[0_0_10px_rgba(139,92,246,0.5)]"></div>
                    <div>
                        <p className="text-base font-medium leading-relaxed">
                            <strong className="text-white tracking-wide">Margem (Representatividade):</strong> A proporção de penalidades sobre o faturamento deve fechar em <strong className="text-violet-400">{repProj.toFixed(2)}%</strong>. Na quinzena passada, esse indicador foi de {repPrev.toFixed(2)}% (diferença de <span className="font-bold text-white">{repVar > 0 ? '+' : ''}{repVar.toFixed(2)} p.p.</span>).
                        </p>
                    </div>
                </li>
            </ul>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// COMPONENTE: PROJEÇÃO OPERACIONAL E SIMULADOR
// ============================================================================
const RunRateOperacionalSection = ({ baseData, targetQuinzena, titlePrefix = "Operacional" }) => {
  const { totalDias, diasOperados } = useMemo(() => {
    if (!targetQuinzena || targetQuinzena === 'N/A') return { totalDias: 15, diasOperados: 15 };
    const year = parseInt(targetQuinzena.substring(0, 4));
    const month = parseInt(targetQuinzena.substring(4, 6)) - 1;
    const q = targetQuinzena.substring(6, 8);
    const now = new Date();
    const isCurrentMonth = (year === now.getFullYear() && month === now.getMonth());
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const total = q === 'Q1' ? 15 : (daysInMonth - 15);
    let operados = total;
    if (isCurrentMonth) {
      if (q === 'Q1' && now.getDate() <= 15) operados = now.getDate() - 1; 
      else if (q === 'Q2' && now.getDate() > 15) operados = (now.getDate() - 15) - 1;
      else if (q === 'Q1' && now.getDate() > 15) operados = 15;
      else if (q === 'Q2' && now.getDate() <= 15) operados = 1;
    } else if (now < new Date(year, month, 1)) {
      operados = 1;
    }
    return { totalDias: total, diasOperados: Math.max(1, operados) };
  }, [targetQuinzena]);

  const [selectedRegional, setSelectedRegional] = useState(null);
  if (!baseData || baseData.length === 0) return (<div className="bg-slate-50 dark:bg-slate-800 p-8 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 mb-8 flex flex-col items-center justify-center text-center gap-3"><AlertCircle className="w-8 h-8 text-slate-400" /><p className="text-slate-500 font-medium max-w-md dark:text-slate-400">Nenhuma informação disponível para {targetQuinzena}.</p></div>);

  const mult = diasOperados > 0 ? totalDias / diasOperados : 1;
  let globalSaldo = 0, globalEntregues = 0;
  baseData.forEach(d => { globalSaldo += d.saldo; globalEntregues += d.entregues; });

  const projFilialData = baseData.map(d => {
    const pSaldo = d.saldo * mult; const pEntregues = d.entregues * mult;
    const pIns = {}; if (d.insucessosDetalhados) { Object.entries(d.insucessosDetalhados).forEach(([k, v]) => pIns[k] = v * mult); }
    return { ...d, saldo: pSaldo, entregues: pEntregues, ds: Math.min(100, pSaldo > 0 ? (pEntregues / pSaldo) * 100 : 0), insucessosDetalhados: pIns };
  }).sort((a, b) => a.ds - b.ds); 

  const regionalMap = {};
  baseData.forEach(d => {
    const regName = d.regional && d.regional !== 'N/A' ? `Regional ${d.regional}` : 'Sem Regional';
    const supName = d.supervisor && d.supervisor !== 'N/A' ? d.supervisor : '';
    const r = supName && regName !== 'Sem Regional' ? `${regName} - ${supName}` : regName;
    if (!regionalMap[r]) regionalMap[r] = { name: r, saldo: 0, entregues: 0, insucessosDetalhados: {} };
    regionalMap[r].saldo += d.saldo; regionalMap[r].entregues += d.entregues;
    if (d.insucessosDetalhados) { Object.entries(d.insucessosDetalhados).forEach(([k, v]) => { regionalMap[r].insucessosDetalhados[k] = (regionalMap[r].insucessosDetalhados[k] || 0) + v; }); }
  });

  const projRegionalData = Object.values(regionalMap).map(r => {
    const pSaldo = r.saldo * mult; const pEntregues = r.entregues * mult;
    const pIns = {}; if (r.insucessosDetalhados) { Object.entries(r.insucessosDetalhados).forEach(([k, v]) => pIns[k] = v * mult); }
    return { ...r, saldo: pSaldo, entregues: pEntregues, ds: Math.min(100, pSaldo > 0 ? (pEntregues / pSaldo) * 100 : 0), insucessosDetalhados: pIns };
  }).sort((a, b) => a.ds - b.ds);

  const projSaldoGlob = globalSaldo * mult; const projEntreguesGlob = globalEntregues * mult;
  const dsGlobal = Math.min(100, projSaldoGlob > 0 ? (projEntreguesGlob / projSaldoGlob) * 100 : 0);
  const atingiuMetaDS = dsGlobal >= 98.5;
  const topOfensores = [...projFilialData].filter(d => d.saldo > 0).slice(0, 6);
    
  const regionalDrilldownData = selectedRegional ? projFilialData.filter(d => {
        const regName = d.regional && d.regional !== 'N/A' ? `Regional ${d.regional}` : 'Sem Regional';
        const supName = d.supervisor && d.supervisor !== 'N/A' ? d.supervisor : '';
        return (supName && regName !== 'Sem Regional' ? `${regName} - ${supName}` : regName) === selectedRegional;
      }) : [];

  return (
    <div className="bg-white dark:bg-slate-800 p-6 md:p-10 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 mb-8 transition-colors">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-4">
        <div className="flex items-center gap-3"><Box className="w-6 h-6 text-emerald-600 dark:text-emerald-400" /><div><h2 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-white">Projeção {titlePrefix} (Run Rate) - {targetQuinzena}</h2></div></div>
        <div className="flex flex-col sm:flex-row gap-4 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700 w-full lg:w-auto"><div className="flex flex-col gap-1 items-center justify-center px-4"><span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Cálculo Automático</span><span className="text-sm font-black text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/40 px-4 py-1.5 rounded-full border border-emerald-200 dark:border-emerald-800 shadow-sm">{diasOperados} / {totalDias} Dias</span></div></div>
      </div>
      <div className="mb-8 border border-slate-200 dark:border-slate-700 rounded-3xl bg-slate-50/40 dark:bg-slate-900/50 p-6 md:p-8">
         <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-2 gap-4">
            <div><h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2"><TrendingUp className="w-5 h-5" /> Evolução de Volume vs. Projeção de DS</h3><p className="text-3xl sm:text-4xl font-black text-slate-800 dark:text-white mt-2">{formatDS(dsGlobal)}</p></div>
         </div>
         <NativeRunRateChart diasOperados={diasOperados} totalDias={totalDias} currentSaldo={globalSaldo} currentEntregues={globalEntregues} projSaldo={projSaldoGlob} projEntregues={projEntreguesGlob} />
      </div>
      <div className={`mb-8 p-4 rounded-xl border flex items-center justify-between gap-4 ${atingiuMetaDS ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800/30' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/30'}`}>
          <div className="flex items-center gap-4">
              <div className={`p-3 rounded-full ${atingiuMetaDS ? 'bg-emerald-100 dark:bg-emerald-900/40' : 'bg-red-100 dark:bg-red-900/40'}`}>{atingiuMetaDS ? <TrendingUp className="w-6 h-6 text-emerald-600 dark:text-emerald-400" /> : <TrendingDown className="w-6 h-6 text-red-600 dark:text-red-400" />}</div>
              <div><h4 className={`font-bold ${atingiuMetaDS ? 'text-emerald-800 dark:text-emerald-500' : 'text-red-800 dark:text-red-500'}`}>Tendência de Fechamento: {atingiuMetaDS ? 'Positiva (Dentro da Meta)' : 'Negativa (Abaixo da Meta)'}</h4></div>
          </div>
      </div>
      {topOfensores.length > 0 && (
        <div className="mb-8 p-6 bg-orange-50/40 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-900/30 rounded-2xl">
          <h3 className="text-sm font-black text-orange-600 dark:text-orange-400 mb-4 uppercase tracking-wider flex items-center gap-2"><AlertCircle className="w-5 h-5" /> Alerta Crítico: Filiais com Menor DS Previsto (Gargalos)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {topOfensores.map((filial, idx) => {
              const dsc = filial.ds >= 98.5 ? 'bg-emerald-500' : (filial.ds >= 95 ? 'bg-orange-500' : 'bg-red-500');
              const dscText = filial.ds >= 98.5 ? 'text-emerald-600 dark:text-emerald-400' : (filial.ds >= 95 ? 'text-orange-600 dark:text-orange-400' : 'text-red-600 dark:text-red-400');
              return (
              <div key={idx} className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-orange-100 dark:border-orange-900/30 shadow-sm flex flex-col relative overflow-hidden">
                <div className={`absolute top-0 left-0 w-1 h-full ${dsc}`}></div>
                <div className="flex justify-between items-start mb-2"><div><span className="font-black text-slate-800 dark:text-white text-lg block">{filial.filial}</span></div><span className={`text-xs font-black text-white ${dsc} px-2 py-0.5 rounded-full shadow-sm`}>#{idx + 1}</span></div>
                <div className="flex justify-between items-end mt-auto pt-3 border-t border-slate-100 dark:border-slate-700">
                  <div className="flex flex-col items-start"><span className="text-[10px] text-slate-400 uppercase font-bold">Status</span><span className={`text-sm font-black ${dscText}`}>{filial.ds >= 98.5 ? 'Excelente' : (filial.ds >= 95 ? 'Atenção' : 'Crítico')}</span></div>
                  <div className="flex flex-col items-end"><span className="text-[10px] text-slate-400 uppercase font-bold">DS Projetado</span><span className={`text-lg font-black ${dscText}`}>{formatDS(filial.ds)}</span></div>
                </div>
              </div>
            )})}
          </div>
        </div>
      )}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700 rounded-2xl p-4 flex flex-col xl:col-span-2">
          <div className="flex items-center justify-between mb-4 px-2 pt-2"><h3 className="text-sm font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">{selectedRegional ? `Filiais: ${selectedRegional}` : 'Projeção DS por Regional'}</h3>{selectedRegional && (<button onClick={() => setSelectedRegional(null)} className="text-[10px] sm:text-xs font-bold text-slate-600 bg-slate-200 dark:bg-slate-700 dark:text-slate-300 px-2 py-1 rounded hover:bg-slate-300 transition-colors">← Voltar</button>)}</div>
          {!selectedRegional ? <NativeDSChart data={projRegionalData} labelKey="name" heightClass="h-[350px]" onBarClick={(r) => setSelectedRegional(r)} /> : <NativeDSChart data={regionalDrilldownData} labelKey="filial" heightClass="h-[350px]" />}
        </div>
        <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700 rounded-2xl p-4 flex flex-col"><h3 className="text-sm font-bold text-slate-600 dark:text-slate-300 text-center mb-2 pt-2 uppercase tracking-wider">DS por Filial (Piores Resultados)</h3><NativeDSChart data={projFilialData.slice(0, 15)} labelKey="filial" heightClass="h-[350px]" /></div>
        <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700 rounded-2xl p-4 flex flex-col"><h3 className="text-sm font-bold text-slate-600 dark:text-slate-300 text-center mb-2 pt-2 uppercase tracking-wider">DS por Filial (Melhores Resultados)</h3><NativeDSChart data={[...projFilialData].filter(d => d.saldo > 0).sort((a,b) => b.ds - a.ds).slice(0, 15)} labelKey="filial" heightClass="h-[350px]" /></div>
      </div>
    </div>
  );
};

// ============================================================================
// COMPONENTE: DETALHE FINANCEIRO
// ============================================================================
const DetalheFinanceiroSection = ({ dadosFiltrados, onExport, isExporting }) => {
  const [sortConfig, setSortConfig] = useState({ key: 'totalValor', direction: 'desc' });
  const [selectedFilial, setSelectedFilial] = useState(null);
  const [selectedMotorista, setSelectedMotorista] = useState(null);

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

      map[fKey].motoristasMap[mKey].casos.push({ tipo: d.tipo, valor: valor, qtd: qtd, id_display: d.tipo === 'Not Visited' ? (d.id_rota || '-') : (d.id_pacote || '-') });
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
    const motoristaData = filialData.motoristas.find(m => m.motorista === selectedMotorista);
    if (!motoristaData) return [];
    return sortArray(motoristaData.casos);
  }, [dataAgrupada, selectedFilial, selectedMotorista, sortConfig]);

  const SortIcon = ({ columnKey }) => {
    if (sortConfig.key !== columnKey) return <ArrowUpDown className="w-3 h-3 inline-block ml-1 opacity-30" />;
    return sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 inline-block ml-1 text-blue-600 dark:text-blue-400" /> : <ArrowDown className="w-3 h-3 inline-block ml-1 text-blue-600 dark:text-blue-400" />;
  };

  return (
    <div className="bg-white dark:bg-slate-800 p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 mb-8 flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 transition-colors">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 dark:border-slate-700 pb-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <DollarSign className="w-6 h-6 text-blue-600 dark:text-blue-400 shrink-0" />
          <div className="min-w-0">
             <h2 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-white truncate">{selectedMotorista ? `Casos: ${selectedMotorista}` : selectedFilial ? `Motoristas: ${selectedFilial}` : 'Detalhamento Financeiro'}</h2>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto shrink-0">
          {(selectedFilial || selectedMotorista) && (<button onClick={handleLevelUp} className="bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 px-4 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-colors">← Voltar</button>)}
          <button onClick={() => onExport({ filial: selectedFilial, motorista: selectedMotorista })} disabled={isExporting} className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-sm disabled:opacity-50 transition-colors">
            {isExporting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />} Gerar Planilha Excel
          </button>
        </div>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm w-full">
        <table className="w-full text-left border-collapse min-w-[1000px]">
          <thead className="bg-slate-50 dark:bg-slate-900 sticky top-0 z-20 shadow-sm">
            {!selectedMotorista ? (
              <tr className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 select-none">
                <th className="py-3 px-3 font-bold border-b border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" onClick={() => handleSort(selectedFilial ? 'motorista' : 'filial')}>{selectedFilial ? 'Motorista' : 'Filial'} <SortIcon columnKey={selectedFilial ? 'motorista' : 'filial'} /></th>
                <th className="py-3 px-3 font-bold border-b border-slate-200 dark:border-slate-700 text-right cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-800 dark:text-slate-200 bg-slate-100/50 dark:bg-slate-800/50" onClick={() => handleSort('totalValor')}>Total (R$) <SortIcon columnKey="totalValor" /></th>
                <th className="py-3 px-3 font-bold border-b border-slate-200 dark:border-slate-700 text-right cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-800 dark:text-slate-200 bg-slate-100/50 dark:bg-slate-800/50" onClick={() => handleSort('totalQtd')}>Total (Qtd) <SortIcon columnKey="totalQtd" /></th>
                <th className="py-3 px-3 font-bold border-b border-slate-200 dark:border-slate-700 text-right cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-blue-600 dark:text-blue-400 bg-blue-50/30 dark:bg-blue-900/20" onClick={() => handleSort('pnrValor')}>PNR (R$) <SortIcon columnKey="pnrValor" /></th>
                <th className="py-3 px-3 font-bold border-b border-slate-200 dark:border-slate-700 text-right cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-blue-600 dark:text-blue-400 bg-blue-50/30 dark:bg-blue-900/20" onClick={() => handleSort('pnrQtd')}>PNR (Qtd) <SortIcon columnKey="pnrQtd" /></th>
                <th className="py-3 px-3 font-bold border-b border-slate-200 dark:border-slate-700 text-right cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-orange-600 dark:text-orange-400 bg-orange-50/30 dark:bg-orange-900/20" onClick={() => handleSort('lostValor')}>Lost (R$) <SortIcon columnKey="lostValor" /></th>
                <th className="py-3 px-3 font-bold border-b border-slate-200 dark:border-slate-700 text-right cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-orange-600 dark:text-orange-400 bg-orange-50/30 dark:bg-orange-900/20" onClick={() => handleSort('lostQtd')}>Lost (Qtd) <SortIcon columnKey="lostQtd" /></th>
                <th className="py-3 px-3 font-bold border-b border-slate-200 dark:border-slate-700 text-right cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" onClick={() => handleSort('nvValor')}>NV (R$) <SortIcon columnKey="nvValor" /></th>
                <th className="py-3 px-3 font-bold border-b border-slate-200 dark:border-slate-700 text-right cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" onClick={() => handleSort('nvQtd')}>NV (Qtd) <SortIcon columnKey="nvQtd" /></th>
              </tr>
            ) : (
              <tr className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 select-none">
                <th className="py-3 px-3 font-bold border-b border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" onClick={() => handleSort('tipo')}>Tipo <SortIcon columnKey="tipo" /></th>
                <th className="py-3 px-3 font-bold border-b border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" onClick={() => handleSort('id_display')}>ID <SortIcon columnKey="id_display" /></th>
                <th className="py-3 px-3 font-bold border-b border-slate-200 dark:border-slate-700 text-right cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" onClick={() => handleSort('valor')}>Valor (R$) <SortIcon columnKey="valor" /></th>
              </tr>
            )}
          </thead>
          <tbody>
            {!selectedMotorista && currentViewData.map((row, idx) => (
              <tr key={idx} onClick={() => { if (!selectedFilial) { setSelectedFilial(row.filial); setSortConfig({ key: 'totalValor', direction: 'desc' }); } else { setSelectedMotorista(row.motorista); setSortConfig({ key: 'valor', direction: 'desc' }); } }} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-blue-50/50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors bg-white dark:bg-slate-800 text-xs">
                <td className="py-2.5 px-3 font-medium text-slate-700 dark:text-slate-300">{selectedFilial ? row.motorista : row.filial}</td>
                <td className="py-2.5 px-3 font-semibold text-right text-slate-800 dark:text-slate-200 bg-slate-50/30 dark:bg-slate-800/50">{formatCurrency(row.totalValor)}</td>
                <td className="py-2.5 px-3 font-medium text-right text-slate-600 dark:text-slate-400 bg-slate-50/30 dark:bg-slate-800/50">{formatQtd(row.totalQtd)}</td>
                <td className="py-2.5 px-3 font-medium text-right text-blue-700 dark:text-blue-400 bg-blue-50/10 dark:bg-blue-900/10">{formatCurrency(row.pnrValor)}</td>
                <td className="py-2.5 px-3 font-medium text-right text-blue-600 dark:text-blue-500 bg-blue-50/10 dark:bg-blue-900/10">{formatQtd(row.pnrQtd)}</td>
                <td className="py-2.5 px-3 font-medium text-right text-orange-700 dark:text-orange-400 bg-orange-50/10 dark:bg-orange-900/10">{formatCurrency(row.lostValor)}</td>
                <td className="py-2.5 px-3 font-medium text-right text-orange-600 dark:text-orange-500 bg-orange-50/10 dark:bg-orange-900/10">{formatQtd(row.lostQtd)}</td>
                <td className="py-2.5 px-3 font-medium text-right text-slate-700 dark:text-slate-300">{formatCurrency(row.nvValor)}</td>
                <td className="py-2.5 px-3 font-medium text-right text-slate-500 dark:text-slate-400">{formatQtd(row.nvQtd)}</td>
              </tr>
            ))}
            {selectedMotorista && currentViewData.map((caso, idx) => (
              <tr key={idx} className="border-b border-slate-100 dark:border-slate-700/50 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors text-xs">
                <td className="py-2 px-3 font-semibold uppercase dark:text-slate-300">{caso.tipo}</td>
                <td className="py-2 px-3 font-mono text-[11px] dark:text-slate-400">{caso.id_display}</td>
                <td className="py-2 px-3 font-semibold text-right dark:text-slate-200">{formatCurrency(caso.valor)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ============================================================================
// COMPONENTE: COMPARATIVO BSC (DIVERGÊNCIAS)
// ============================================================================
const ComparativoBscSection = ({ dataOp, dataBsc }) => {
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
    if (Math.abs(val) < 0.01) return <span className="bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400 font-bold px-2 py-0.5 rounded text-[10px]">OK</span>;
    const isPositive = val > 0;
    return <span className={`${isPositive ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400' : 'bg-orange-50 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400'} font-bold px-2 py-0.5 rounded text-[10px] whitespace-nowrap`}>{isPositive ? '+' : ''}{isPercent ? val.toFixed(2) : formatQtd(val)}{isPercent ? '%' : ''}</span>;
  };

  const SortIcon = ({ columnKey }) => {
    if (sortConfig.key !== columnKey) return <ArrowUpDown className="w-3 h-3 inline-block ml-1 opacity-30" />;
    return sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 inline-block ml-1 text-blue-600 dark:text-blue-400" /> : <ArrowDown className="w-3 h-3 inline-block ml-1 text-blue-600 dark:text-blue-400" />;
  };

  return (
    <div className="bg-white dark:bg-slate-800 p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 mb-8 flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 transition-colors">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 dark:border-slate-700 pb-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <GitCompare className="w-6 h-6 text-violet-600 dark:text-violet-400 shrink-0" />
          <div className="min-w-0">
             <h2 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-white truncate">{selectedMotorista ? `Rotas do Motorista: ${selectedMotorista}` : selectedFilial ? `Motoristas: ${selectedFilial}` : 'Operacional vs BSC'}</h2>
          </div>
        </div>
        {(selectedFilial || selectedMotorista) && (<button onClick={handleLevelUp} className="bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 px-4 py-2.5 rounded-xl text-sm font-bold shadow-sm shrink-0 transition-colors">← Voltar</button>)}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-2">
        <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 p-4 xl:p-5 rounded-2xl flex flex-col items-center"><span className="text-[10px] xl:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-3 text-center">Diferença de Rotas</span><div className="flex gap-2 xl:gap-4 items-center"><div className="text-center"><span className="block text-[9px] xl:text-[10px] text-slate-400 font-bold">Operacional</span><span className="font-mono text-sm font-bold text-blue-600 dark:text-blue-400">{formatQtd(viewOp.rotas)}</span></div><span className="text-slate-300 dark:text-slate-600 font-black text-lg">/</span><div className="text-center"><span className="block text-[9px] xl:text-[10px] text-slate-400 font-bold">BSC Oficial</span><span className="font-mono text-sm font-bold text-blue-600 dark:text-blue-400">{formatQtd(viewBsc.rotas)}</span></div></div><div className="mt-3">{renderBadge(viewOp.rotas - viewBsc.rotas)}</div></div>
        <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 p-4 xl:p-5 rounded-2xl flex flex-col items-center"><span className="text-[10px] xl:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-3 text-center">Diferença de Pacotes</span><div className="flex gap-2 xl:gap-4 items-center"><div className="text-center"><span className="block text-[9px] xl:text-[10px] text-slate-400 font-bold">Operacional</span><span className="font-mono text-sm font-bold dark:text-white">{formatQtd(viewOp.saldo)}</span></div><span className="text-slate-300 dark:text-slate-600 font-black text-lg">/</span><div className="text-center"><span className="block text-[9px] xl:text-[10px] text-slate-400 font-bold">BSC Oficial</span><span className="font-mono text-sm font-bold dark:text-white">{formatQtd(viewBsc.saldo)}</span></div></div><div className="mt-3">{renderBadge(viewOp.saldo - viewBsc.saldo)}</div></div>
        <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 p-4 xl:p-5 rounded-2xl flex flex-col items-center"><span className="text-[10px] xl:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-3 text-center">Diferença de Entregues</span><div className="flex gap-2 xl:gap-4 items-center"><div className="text-center"><span className="block text-[9px] xl:text-[10px] text-slate-400 font-bold">Operacional</span><span className="font-mono text-sm font-bold text-emerald-600 dark:text-emerald-400">{formatQtd(viewOp.entregues)}</span></div><span className="text-slate-300 dark:text-slate-600 font-black text-lg">/</span><div className="text-center"><span className="block text-[9px] xl:text-[10px] text-slate-400 font-bold">BSC Oficial</span><span className="font-mono text-sm font-bold text-emerald-600 dark:text-emerald-400">{formatQtd(viewBsc.entregues)}</span></div></div><div className="mt-3">{renderBadge(viewOp.entregues - viewBsc.entregues)}</div></div>
        <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 p-4 xl:p-5 rounded-2xl flex flex-col items-center"><span className="text-[10px] xl:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-3 text-center">Diferença do DS %</span><div className="flex gap-2 xl:gap-4 items-center"><div className="text-center"><span className="block text-[9px] xl:text-[10px] text-slate-400 font-bold">Operacional</span><span className="font-mono text-sm font-bold text-violet-600 dark:text-violet-400">{formatDS(viewOp.ds)}</span></div><span className="text-slate-300 dark:text-slate-600 font-black text-lg">/</span><div className="text-center"><span className="block text-[9px] xl:text-[10px] text-slate-400 font-bold">BSC Oficial</span><span className="font-mono text-sm font-bold text-violet-600 dark:text-violet-400">{formatDS(viewBsc.ds)}</span></div></div><div className="mt-3">{renderBadge(viewOp.ds - viewBsc.ds, true)}</div></div>
      </div>
      
      <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm w-full">
        <table className="w-full text-left border-collapse min-w-[1000px]">
          <thead className="bg-slate-50 dark:bg-slate-900 sticky top-0 z-20 shadow-sm">
             <tr className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 select-none">
                <th className="py-3 px-3 font-bold border-b border-r border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors bg-white dark:bg-slate-900 z-30" rowSpan={2} onClick={() => handleSort('label')}>{selectedMotorista ? 'Rota (ID)' : selectedFilial ? 'Motorista' : 'Filial'} <SortIcon columnKey="label" /></th>
                <th className="py-2 px-3 font-bold border-b border-r border-slate-200 dark:border-slate-700 text-center bg-blue-50/30 dark:bg-blue-900/20" colSpan={3}>Rotas Únicas</th>
                <th className="py-2 px-3 font-bold border-b border-r border-slate-200 dark:border-slate-700 text-center bg-slate-100/50 dark:bg-slate-800/50" colSpan={3}>Total de Pacotes (Saldo)</th>
                <th className="py-2 px-3 font-bold border-b border-r border-slate-200 dark:border-slate-700 text-center bg-emerald-50/30 dark:bg-emerald-900/20" colSpan={3}>Pacotes Entregues</th>
                <th className="py-2 px-3 font-bold border-b border-slate-200 dark:border-slate-700 text-center bg-violet-50/30 dark:bg-violet-900/20" colSpan={3}>Delivery Success (DS)</th>
             </tr>
             <tr className="text-[9px] uppercase tracking-wider text-slate-400 select-none">
                <th className="py-2 px-3 font-bold border-b border-slate-200 dark:border-slate-700 text-right cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors bg-blue-50/30 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400" onClick={() => handleSort('opRotasCount')}>Op. <SortIcon columnKey="opRotasCount" /></th>
                <th className="py-2 px-3 font-bold border-b border-slate-200 dark:border-slate-700 text-right cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors bg-blue-50/30 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400" onClick={() => handleSort('bscRotasCount')}>BSC <SortIcon columnKey="bscRotasCount" /></th>
                <th className="py-2 px-3 font-bold border-b border-r border-slate-200 dark:border-slate-700 text-center cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors bg-blue-100/50 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300" onClick={() => handleSort('diffRotas')}>Diff <SortIcon columnKey="diffRotas" /></th>
                <th className="py-2 px-3 font-bold border-b border-slate-200 dark:border-slate-700 text-right cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors bg-slate-100/50 dark:bg-slate-800/50" onClick={() => handleSort('opSaldo')}>Op. <SortIcon columnKey="opSaldo" /></th>
                <th className="py-2 px-3 font-bold border-b border-slate-200 dark:border-slate-700 text-right cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors bg-slate-100/50 dark:bg-slate-800/50" onClick={() => handleSort('bscSaldo')}>BSC <SortIcon columnKey="bscSaldo" /></th>
                <th className="py-2 px-3 font-bold border-b border-r border-slate-200 dark:border-slate-700 text-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors bg-slate-100/80 dark:bg-slate-700/50" onClick={() => handleSort('diffSaldo')}>Diff <SortIcon columnKey="diffSaldo" /></th>
                <th className="py-2 px-3 font-bold border-b border-slate-200 dark:border-slate-700 text-right cursor-pointer hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-colors bg-emerald-50/30 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400" onClick={() => handleSort('opEntregues')}>Op. <SortIcon columnKey="opEntregues" /></th>
                <th className="py-2 px-3 font-bold border-b border-slate-200 dark:border-slate-700 text-right cursor-pointer hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-colors bg-emerald-50/30 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400" onClick={() => handleSort('bscEntregues')}>BSC <SortIcon columnKey="bscEntregues" /></th>
                <th className="py-2 px-3 font-bold border-b border-r border-slate-200 dark:border-slate-700 text-center cursor-pointer hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-colors bg-emerald-100/50 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300" onClick={() => handleSort('diffEntregues')}>Diff <SortIcon columnKey="diffEntregues" /></th>
                <th className="py-2 px-3 font-bold border-b border-slate-200 dark:border-slate-700 text-right cursor-pointer hover:bg-violet-50 dark:hover:bg-violet-900/30 transition-colors bg-violet-50/30 dark:bg-violet-900/20 text-violet-700 dark:text-violet-400" onClick={() => handleSort('dsOp')}>Op. <SortIcon columnKey="dsOp" /></th>
                <th className="py-2 px-3 font-bold border-b border-slate-200 dark:border-slate-700 text-right cursor-pointer hover:bg-violet-50 dark:hover:bg-violet-900/30 transition-colors bg-violet-50/30 dark:bg-violet-900/20 text-violet-700 dark:text-violet-400" onClick={() => handleSort('dsBsc')}>BSC <SortIcon columnKey="dsBsc" /></th>
                <th className="py-2 px-3 font-bold border-b border-slate-200 dark:border-slate-700 text-center cursor-pointer hover:bg-violet-50 dark:hover:bg-violet-900/30 transition-colors bg-violet-100/50 dark:bg-violet-900/40 text-violet-800 dark:text-violet-300" onClick={() => handleSort('diffDs')}>Diff <SortIcon columnKey="diffDs" /></th>
             </tr>
          </thead>
          <tbody>
            {sortedData.map((row, idx) => (
              <tr key={`comp-${idx}`} className={`border-b border-slate-100 dark:border-slate-700/50 transition-colors bg-white dark:bg-slate-800 text-xs group ${selectedMotorista ? 'cursor-default hover:bg-white dark:hover:bg-slate-800' : 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50'}`} onClick={() => { if (!selectedFilial) { setSelectedFilial(row.label); setSortConfig({ key: 'absDiff', direction: 'desc' }); } else if (!selectedMotorista) { setSelectedMotorista(row.label); setSortConfig({ key: 'absDiff', direction: 'desc' }); } }}>
                <td className="py-2.5 px-3 font-bold text-slate-700 dark:text-slate-300 border-r border-slate-100 dark:border-slate-700/50 bg-white dark:bg-slate-800 sticky left-0 z-10 flex items-center gap-2">
                   {!selectedMotorista && (<div className="p-1 rounded transition-colors bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/50 group-hover:text-blue-600 dark:group-hover:text-blue-400 shrink-0"><ChevronRight className="w-4 h-4" /></div>)}
                   <span className="truncate">{row.label}</span>
                </td>
                <td className="py-2.5 px-3 font-medium text-right text-blue-600 dark:text-blue-400 bg-blue-50/10 dark:bg-blue-900/10">{formatQtd(row.opRotasCount)}</td>
                <td className="py-2.5 px-3 font-medium text-right text-blue-600 dark:text-blue-400 bg-blue-50/10 dark:bg-blue-900/10">{formatQtd(row.bscRotasCount)}</td>
                <td className="py-2.5 px-3 text-center border-r border-slate-100 dark:border-slate-700/50 bg-blue-50/30 dark:bg-blue-900/20">{renderBadge(row.diffRotas)}</td>
                <td className="py-2.5 px-3 font-medium text-right text-slate-500 dark:text-slate-400 bg-slate-50/10 dark:bg-slate-800/50">{formatQtd(row.opSaldo)}</td>
                <td className="py-2.5 px-3 font-medium text-right text-slate-500 dark:text-slate-400 bg-slate-50/10 dark:bg-slate-800/50">{formatQtd(row.bscSaldo)}</td>
                <td className="py-2.5 px-3 text-center border-r border-slate-100 dark:border-slate-700/50 bg-slate-50/40 dark:bg-slate-800">{renderBadge(row.diffSaldo)}</td>
                <td className="py-2.5 px-3 font-medium text-right text-emerald-600 dark:text-emerald-400 bg-emerald-50/10 dark:bg-emerald-900/10">{formatQtd(row.opEntregues)}</td>
                <td className="py-2.5 px-3 font-medium text-right text-emerald-600 dark:text-emerald-400 bg-emerald-50/10 dark:bg-emerald-900/10">{formatQtd(row.bscEntregues)}</td>
                <td className="py-2.5 px-3 text-center border-r border-slate-100 dark:border-slate-700/50 bg-emerald-50/30 dark:bg-emerald-900/20">{renderBadge(row.diffEntregues)}</td>
                <td className="py-2.5 px-3 font-bold text-right text-violet-600 dark:text-violet-400 bg-violet-50/10 dark:bg-violet-900/10">{formatDS(row.dsOp)}</td>
                <td className="py-2.5 px-3 font-bold text-right text-violet-600 dark:text-violet-400 bg-violet-50/10 dark:bg-violet-900/10">{formatDS(row.dsBsc)}</td>
                <td className="py-2.5 px-3 text-center bg-violet-50/30 dark:bg-violet-900/20">{renderBadge(row.diffDs, true)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ============================================================================
// COMPONENTE: GAPS OPERACIONAIS (ANÁLISE DE OFENSORES)
// ============================================================================
const GapsOperacionaisSection = ({ dataOp, dataBsc }) => {
  const [dataSource, setDataSource] = useState('operacional');
  const [sortConfig, setSortConfig] = useState({ key: 'insucessos', direction: 'desc' });
  const [selectedFilial, setSelectedFilial] = useState(null);
  const [selectedMotorista, setSelectedMotorista] = useState(null);
  const [selectedMotivo, setSelectedMotivo] = useState(null);

  const handleSort = (key) => {
    let direction = 'desc';
    if (sortConfig.key === key && sortConfig.direction === 'desc') direction = 'asc';
    setSortConfig({ key, direction });
  };

  const handleLevelUp = () => {
    if (selectedMotorista) {
      setSelectedMotorista(null);
      setSortConfig({ key: selectedMotivo ? 'motivoFilterQtd' : 'insucessos', direction: 'desc' });
    } else if (selectedMotivo) {
      setSelectedMotivo(null);
      setSortConfig({ key: 'insucessos', direction: 'desc' });
    } else if (selectedFilial) {
      setSelectedFilial(null);
      setSortConfig({ key: 'insucessos', direction: 'desc' });
    }
  };

  const activeData = dataSource === 'bsc' ? dataBsc : dataOp;

  const { dataAgrupada, topCards } = useMemo(() => {
    const map = {};
    let globalSaldo = 0; let globalInsucessos = 0;
    const globalMotivos = {};

    activeData.forEach(d => {
      const fKey = normalizeText(d.filial);
      const mKey = normalizeText(d.motorista);

      if (!map[fKey]) map[fKey] = { filial: d.filial, saldo: 0, entregues: 0, insucessos: 0, insDetalhes: {}, motoristasMap: {} };
      if (!map[fKey].motoristasMap[mKey]) map[fKey].motoristasMap[mKey] = { motorista: d.motorista, saldo: 0, entregues: 0, insucessos: 0, insDetalhes: {} };

      const insTotal = Math.max(0, d.saldo - d.entregues);
      globalSaldo += d.saldo; globalInsucessos += insTotal;
      map[fKey].saldo += d.saldo; map[fKey].entregues += d.entregues; map[fKey].insucessos += insTotal;
      map[fKey].motoristasMap[mKey].saldo += d.saldo; map[fKey].motoristasMap[mKey].entregues += d.entregues; map[fKey].motoristasMap[mKey].insucessos += insTotal;

      if (d.insucessosDetalhados) {
        Object.entries(d.insucessosDetalhados).forEach(([k, v]) => {
          map[fKey].insDetalhes[k] = (map[fKey].insDetalhes[k] || 0) + v;
          map[fKey].motoristasMap[mKey].insDetalhes[k] = (map[fKey].motoristasMap[mKey].insDetalhes[k] || 0) + v;
          globalMotivos[k] = (globalMotivos[k] || 0) + v;
        });
      }
    });

    const filiaisList = Object.values(map).map(f => {
      const topMotivoKey = Object.keys(f.insDetalhes).sort((a,b) => f.insDetalhes[b] - f.insDetalhes[a])[0] || 'N/A';
      const impactoGlobal = globalSaldo > 0 ? (f.insucessos / globalSaldo) * 100 : 0;
      const repInsucessosGerais = globalInsucessos > 0 ? (f.insucessos / globalInsucessos) * 100 : 0;

      const motoristasList = Object.values(f.motoristasMap).map(m => {
        const mTopMotivo = Object.keys(m.insDetalhes).sort((a,b) => m.insDetalhes[b] - m.insDetalhes[a])[0] || 'N/A';
        const impactoFilial = f.saldo > 0 ? (m.insucessos / f.saldo) * 100 : 0;
        const repInsucessosFilial = f.insucessos > 0 ? (m.insucessos / f.insucessos) * 100 : 0;
        const motivos = Object.entries(m.insDetalhes).filter(([_, v]) => v > 0).map(([motivo, qtd]) => ({ motivo, qtd, representatividade: m.insucessos > 0 ? (qtd / m.insucessos) * 100 : 0 }));
        return { ...m, ds: Math.min(100, m.saldo > 0 ? (m.entregues / m.saldo) * 100 : 0), impactoFilial, repInsucessosFilial, topMotivo: mTopMotivo, insDetalhes: m.insDetalhes, motivos };
      });

      return { ...f, ds: Math.min(100, f.saldo > 0 ? (f.entregues / f.saldo) * 100 : 0), impactoGlobal, repInsucessosGerais, topMotivo: topMotivoKey, motoristas: motoristasList };
    });

    const filialCritica = [...filiaisList].sort((a,b) => b.insucessos - a.insucessos)[0] || { filial: 'N/A', insucessos: 0 };
    let allMotoristas = []; filiaisList.forEach(f => allMotoristas = allMotoristas.concat(f.motoristas));
    const motCritico = allMotoristas.sort((a,b) => b.insucessos - a.insucessos)[0] || { motorista: 'N/A', insucessos: 0 };
    const topMotivoGeral = Object.entries(globalMotivos).sort((a,b) => b[1] - a[1])[0] || ['N/A', 0];

    return { 
      dataAgrupada: filiaisList,
      topCards: { totalGaps: globalInsucessos, filial: filialCritica, motorista: motCritico, motivo: { nome: topMotivoGeral[0], qtd: topMotivoGeral[1] } }
    };
  }, [activeData]);

  const filialMotivosBreakdown = useMemo(() => {
    if (!selectedFilial) return [];
    const filial = dataAgrupada.find(f => f.filial === selectedFilial);
    if (!filial || !filial.insDetalhes) return [];
    return Object.entries(filial.insDetalhes).filter(([_, qtd]) => qtd > 0).map(([nome, qtd]) => ({ nome, qtd, rep: filial.insucessos > 0 ? (qtd / filial.insucessos) * 100 : 0 })).sort((a,b) => b.qtd - a.qtd);
  }, [dataAgrupada, selectedFilial]);

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
    if (!selectedMotorista) {
      let motoristasList = filialData.motoristas;
      if (selectedMotivo) motoristasList = motoristasList.filter(m => m.insDetalhes && m.insDetalhes[selectedMotivo] > 0).map(m => ({ ...m, motivoFilterQtd: m.insDetalhes[selectedMotivo] || 0 }));
      return sortArray(motoristasList);
    }
    const motoristaData = filialData.motoristas.find(m => m.motorista === selectedMotorista);
    if (!motoristaData) return [];
    return sortArray(motoristaData.motivos);
  }, [dataAgrupada, selectedFilial, selectedMotorista, selectedMotivo, sortConfig]);

  const SortIcon = ({ columnKey }) => {
    if (sortConfig.key !== columnKey) return <ArrowUpDown className="w-3 h-3 inline-block ml-1 opacity-30" />;
    return sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 inline-block ml-1 text-blue-600 dark:text-blue-400" /> : <ArrowDown className="w-3 h-3 inline-block ml-1 text-blue-600 dark:text-blue-400" />;
  };

  return (
    <div className="bg-white dark:bg-slate-800 p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 mb-8 flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 transition-colors">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 dark:border-slate-700 pb-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <PieChart className="w-6 h-6 text-orange-600 dark:text-orange-400 shrink-0" />
          <div className="min-w-0">
             <h2 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-white truncate">{selectedMotorista ? `Insucessos: ${selectedMotorista}` : selectedMotivo ? `Ofensores por Motivo: ${selectedMotivo}` : selectedFilial ? `Motoristas: ${selectedFilial}` : 'Gaps Operacionais (Ofensores)'}</h2>
             <p className="text-sm text-slate-500 dark:text-slate-400 font-medium truncate">Análise de causa raiz para quebra de Delivery Success.</p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto shrink-0">
          <div className="flex bg-slate-100 dark:bg-slate-900/50 p-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-inner">
             <button onClick={() => { setDataSource('operacional'); setSelectedFilial(null); setSelectedMotorista(null); setSelectedMotivo(null); }} className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-colors ${dataSource === 'operacional' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}>Gestão Operacional</button>
             <button onClick={() => { setDataSource('bsc'); setSelectedFilial(null); setSelectedMotorista(null); setSelectedMotivo(null); }} className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-colors ${dataSource === 'bsc' ? 'bg-white dark:bg-slate-700 text-teal-600 dark:text-teal-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}>Base BSC</button>
          </div>
          {(selectedFilial || selectedMotorista || selectedMotivo) && (<button onClick={handleLevelUp} className="flex items-center justify-center gap-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 px-4 py-2 rounded-xl text-sm font-bold transition-colors shadow-sm shrink-0 w-full sm:w-auto">← Voltar</button>)}
        </div>
      </div>

      {!selectedMotorista && !selectedFilial && (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-2">
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/30 p-4 rounded-2xl flex flex-col items-center justify-center text-center"><span className="text-xs font-bold text-red-600 dark:text-red-400 uppercase mb-1">Volume de Insucessos</span><span className="text-2xl font-black text-red-700 dark:text-red-500">{formatQtd(topCards.totalGaps)}</span></div>
            <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 p-4 rounded-2xl flex flex-col items-center justify-center text-center"><span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Filial Mais Crítica</span><span className="text-lg font-black text-slate-800 dark:text-white truncate w-full px-2">{topCards.filial.filial}</span><span className="text-xs font-bold text-red-500">{formatQtd(topCards.filial.insucessos)} insucessos</span></div>
            <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 p-4 rounded-2xl flex flex-col items-center justify-center text-center"><span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Motorista Mais Crítico</span><span className="text-lg font-black text-slate-800 dark:text-white truncate w-full px-2">{topCards.motorista.motorista}</span><span className="text-xs font-bold text-red-500">{formatQtd(topCards.motorista.insucessos)} insucessos</span></div>
            <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800/30 p-4 rounded-2xl flex flex-col items-center justify-center text-center"><span className="text-[10px] font-bold text-orange-600 dark:text-orange-400 uppercase mb-1">Motivo Recorrente</span><span className="text-sm font-black text-orange-800 dark:text-orange-500 truncate w-full px-2" title={topCards.motivo.nome}>{topCards.motivo.nome}</span><span className="text-xs font-bold text-orange-600 dark:text-orange-400 mt-1">{formatQtd(topCards.motivo.qtd)} pacotes</span></div>
          </div>
      )}

      {selectedFilial && !selectedMotorista && filialMotivosBreakdown.length > 0 && (
        <div className="mb-4 bg-slate-50 dark:bg-slate-900/50 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-inner">
           <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
             <h3 className="text-sm font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2"><PieChart className="w-4 h-4 text-orange-500" /> Representatividade dos Motivos: {selectedFilial}</h3>
             <span className="text-[10px] text-slate-400 font-bold bg-white dark:bg-slate-800 px-2 py-1 rounded border border-slate-200 dark:border-slate-700">CLIQUE NUM MOTIVO PARA FILTRAR OS MOTORISTAS</span>
           </div>
           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
             {filialMotivosBreakdown.map((m, idx) => {
               const isSelected = selectedMotivo === m.nome;
               return (
                 <div key={idx} onClick={() => { if (isSelected) { setSelectedMotivo(null); setSortConfig({ key: 'insucessos', direction: 'desc' }); } else { setSelectedMotivo(m.nome); setSortConfig({ key: 'motivoFilterQtd', direction: 'desc' }); } }} className={`p-3 rounded-xl border flex justify-between items-center shadow-sm cursor-pointer transition-all ${isSelected ? 'bg-orange-50 dark:bg-orange-900/30 border-orange-400 dark:border-orange-500 ring-2 ring-orange-400/20 dark:ring-orange-500/20' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-orange-300 dark:hover:border-orange-700 hover:bg-orange-50/50 dark:hover:bg-slate-700/50'}`}>
                   <div className="flex flex-col min-w-0 pr-3"><span className={`text-[10px] font-bold uppercase tracking-wider truncate w-[140px] ${isSelected ? 'text-orange-700 dark:text-orange-400' : 'text-slate-500 dark:text-slate-400'}`} title={m.nome}>{m.nome}</span><span className={`text-base font-black leading-tight mt-0.5 ${isSelected ? 'text-orange-800 dark:text-orange-500' : 'text-slate-800 dark:text-slate-200'}`}>{formatQtd(m.qtd)} <span className={`text-[10px] font-medium lowercase ${isSelected ? 'text-orange-600 dark:text-orange-400' : 'text-slate-400 dark:text-slate-500'}`}>pacotes</span></span></div>
                   <div className={`px-2 py-1 rounded-lg font-black text-xs shrink-0 border ${isSelected ? 'bg-orange-100 dark:bg-orange-900/50 text-orange-800 dark:text-orange-400 border-orange-200 dark:border-orange-800/50' : 'bg-orange-50 dark:bg-slate-700 text-orange-700 dark:text-orange-400 border-orange-100 dark:border-slate-600'}`}>{m.rep.toFixed(1)}%</div>
                 </div>
               );
             })}
           </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm w-full">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead className="bg-slate-50 dark:bg-slate-900 sticky top-0 z-20 shadow-sm">
            {!selectedMotorista ? (
              <tr className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 select-none">
                <th className="py-3 px-3 font-bold border-b border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors bg-white dark:bg-slate-900 z-30 sticky left-0" onClick={() => handleSort(selectedFilial ? 'motorista' : 'filial')}>{selectedFilial ? 'Motorista' : 'Filial'} <SortIcon columnKey={selectedFilial ? 'motorista' : 'filial'} /></th>
                <th className="py-3 px-3 font-bold border-b border-slate-200 dark:border-slate-700 text-right cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" onClick={() => handleSort('saldo')}>Total Pacotes <SortIcon columnKey="saldo" /></th>
                <th className="py-3 px-3 font-bold border-b border-slate-200 dark:border-slate-700 text-right cursor-pointer hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors text-red-700 dark:text-red-400 bg-red-50/30 dark:bg-red-900/20" onClick={() => handleSort('insucessos')}>Insucessos (Total) <SortIcon columnKey="insucessos" /></th>
                {selectedMotivo && (<th className="py-3 px-3 font-bold border-b border-orange-200 dark:border-orange-800 text-right cursor-pointer hover:bg-orange-100 dark:hover:bg-orange-900/50 transition-colors text-orange-800 dark:text-orange-400 bg-orange-100/50 dark:bg-orange-900/30" onClick={() => handleSort('motivoFilterQtd')}>Gaps: {selectedMotivo} <SortIcon columnKey="motivoFilterQtd" /></th>)}
                <th className="py-3 px-3 font-bold border-b border-slate-200 dark:border-slate-700 text-right cursor-pointer hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-colors text-emerald-700 dark:text-emerald-400 bg-emerald-50/30 dark:bg-emerald-900/20" onClick={() => handleSort('ds')}>DS <SortIcon columnKey="ds" /></th>
                <th className="py-3 px-3 font-bold border-b border-slate-200 dark:border-slate-700 text-center cursor-pointer hover:bg-orange-50 dark:hover:bg-orange-900/30 transition-colors text-orange-700 dark:text-orange-400 bg-orange-50/30 dark:bg-orange-900/20" onClick={() => handleSort(selectedFilial ? 'impactoFilial' : 'impactoGlobal')}>Impacto no DS {selectedFilial ? 'da Filial' : 'Geral (Empresa)'} <SortIcon columnKey={selectedFilial ? 'impactoFilial' : 'impactoGlobal'} /></th>
                <th className="py-3 px-3 font-bold border-b border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" onClick={() => handleSort('topMotivo')}>Principal Motivo <SortIcon columnKey="topMotivo" /></th>
              </tr>
            ) : (
              <tr className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 select-none">
                <th className="py-3 px-3 font-bold border-b border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors bg-white dark:bg-slate-900 z-30 sticky left-0 w-1/2" onClick={() => handleSort('motivo')}>Motivo de Insucesso <SortIcon columnKey="motivo" /></th>
                <th className="py-3 px-3 font-bold border-b border-slate-200 dark:border-slate-700 text-right cursor-pointer hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors text-red-700 dark:text-red-400 bg-red-50/30 dark:bg-red-900/20 w-1/4" onClick={() => handleSort('qtd')}>Quantidade de Pacotes <SortIcon columnKey="qtd" /></th>
                <th className="py-3 px-3 font-bold border-b border-slate-200 dark:border-slate-700 text-right cursor-pointer hover:bg-orange-50 dark:hover:bg-orange-900/30 transition-colors text-orange-700 dark:text-orange-400 bg-orange-50/30 dark:bg-orange-900/20 w-1/4" onClick={() => handleSort('representatividade')}>Representatividade no Motorista <SortIcon columnKey="representatividade" /></th>
              </tr>
            )}
          </thead>
          <tbody>
            {currentViewData.length === 0 && (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-400 font-medium text-xs bg-white dark:bg-slate-800">
                  Nenhum gap encontrado para os filtros atuais.
                </td>
              </tr>
            )}
            
            {!selectedMotorista && currentViewData.map((row, idx) => {
              const impactoStr = selectedFilial ? row.impactoFilial : row.impactoGlobal;
              const repGaps = selectedFilial ? row.repInsucessosFilial : row.repInsucessosGerais;
              return (
                <tr key={`drill-${idx}`} onClick={() => { if (!selectedFilial) { setSelectedFilial(row.filial); setSortConfig({ key: 'insucessos', direction: 'desc' }); } else { setSelectedMotorista(row.motorista); setSortConfig({ key: 'qtd', direction: 'desc' }); } }} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors group bg-white dark:bg-slate-800 text-xs">
                  <td className="py-2.5 px-3 font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 sticky left-0 z-10 flex items-center gap-2 border-r border-slate-100 dark:border-slate-700/50"><div className="p-1 rounded transition-colors bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/50 group-hover:text-blue-600 dark:group-hover:text-blue-400 shrink-0"><ChevronRight className="w-4 h-4" /></div><span className="truncate">{selectedFilial ? row.motorista : row.filial}</span></td>
                  <td className="py-2.5 px-3 font-medium text-right text-slate-500 dark:text-slate-400">{formatQtd(row.saldo)}</td>
                  <td className="py-2.5 px-3 font-bold text-right text-red-600 dark:text-red-400 bg-red-50/10 dark:bg-red-900/10">{formatQtd(row.insucessos)}</td>
                  {selectedMotivo && (<td className="py-2.5 px-3 font-bold text-right text-orange-700 dark:text-orange-400 bg-orange-50/40 dark:bg-orange-900/20">{formatQtd(row.motivoFilterQtd)}</td>)}
                  <td className="py-2.5 px-3 font-bold text-right text-emerald-600 dark:text-emerald-400 bg-emerald-50/10 dark:bg-emerald-900/10">{formatDS(row.ds)}</td>
                  <td className="py-2.5 px-3 text-center bg-orange-50/10 dark:bg-orange-900/10"><div className="flex flex-col items-center justify-center"><span className={`px-2 py-0.5 rounded text-[10px] font-bold ${impactoStr > 2 ? 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-400' : (impactoStr > 0.5 ? 'bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-400' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300')}`}>-{impactoStr.toFixed(2)}%</span><span className="text-[9px] text-slate-500 mt-1 font-medium">({repGaps.toFixed(1)}% dos insucessos)</span></div></td>
                  <td className="py-2.5 px-3 font-medium text-slate-500 dark:text-slate-400 truncate max-w-[200px]" title={row.topMotivo}>{row.topMotivo}</td>
                </tr>
              );
            })}
            {selectedMotorista && currentViewData.map((row, idx) => (
              <tr key={`motivo-${idx}`} className="border-b border-slate-100 dark:border-slate-700/50 bg-white dark:bg-slate-800 text-xs hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                <td className="py-3 px-3 font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 sticky left-0 z-10 border-r border-slate-100 dark:border-slate-700/50">{row.motivo}</td>
                <td className="py-3 px-3 font-bold text-right text-red-600 dark:text-red-400 bg-red-50/10 dark:bg-red-900/10">{formatQtd(row.qtd)}</td>
                <td className="py-3 px-3 font-bold text-right text-orange-600 dark:text-orange-400 bg-orange-50/10 dark:bg-orange-900/10">{row.representatividade.toFixed(2)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ============================================================================
// APP PRINCIPAL
// ============================================================================
export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(verificarAcesso);
  const [senhaDigitada, setSenhaDigitada] = useState('');
  const [erroLogin, setErroLogin] = useState(false);

  // MODO NOTURNO
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('dashopTheme') === 'dark';
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('dashopTheme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('dashopTheme', 'light');
    }
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  const SENHA_CORRETA = 'operacao2026';

  useEffect(() => {
    let interval;
    if (isAuthenticated) {
      interval = setInterval(() => {
        if (!verificarAcesso()) {
          setIsAuthenticated(false);
        }
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  const handleLogin = (e) => {
    e.preventDefault();
    if (senhaDigitada === SENHA_CORRETA) {
      localStorage.setItem('dashopAuthTime', Date.now().toString());
      setIsAuthenticated(true);
      setErroLogin(false);
      setSenhaDigitada('');
    } else {
      setErroLogin(true);
    }
  };

  const [rawData, setRawData] = useState(initialParsedData);
  const [rawFaturamentoData, setRawFaturamentoData] = useState(initialFaturamentoData);
  const [rawOperacionalData, setRawOperacionalData] = useState(initialOperacionalData);
  const [rawBscData, setRawBscData] = useState(initialBscData);
  
  const [error, setError] = useState(null);
  
  // ==========================================================================
  // CONFIGURAÇÃO DAS URLs DE FONTES DE DADOS
  // ==========================================================================
  const [sheetUrl, setSheetUrl] = useState('https://docs.google.com/spreadsheets/d/1BeuQJXcR0o9vVb-Xq5vZ4PWSnKE-_Uxf2bkQYylIwS0/edit?gid=0#gid=0');
  const [sheetUrlFaturamento, setSheetUrlFaturamento] = useState('https://docs.google.com/spreadsheets/d/1BeuQJXcR0o9vVb-Xq5vZ4PWSnKE-_Uxf2bkQYylIwS0/edit?gid=2143847273#gid=2143847273');
  // URL ATUALIZADA: Gestão Operacional
  const [sheetUrlOperacional, setSheetUrlOperacional] = useState('https://docs.google.com/spreadsheets/d/1yi_-uvB744ShPzratm_aO09Mm9rFWyvCqHXgxJcZOW4/edit?gid=1256508653#gid=1256508653');
  // URL ATUALIZADA: Gestão Operacional BSC
  const [sheetUrlBsc, setSheetUrlBsc] = useState('https://docs.google.com/spreadsheets/d/1TngDQ58wD8Zz43AHrrtJLGfB2Po_Wqc6LqUzrlTIytw/edit?gid=1433063454#gid=1433063454');
  
  const [isLoading, setIsLoading] = useState(false);
  const [filtroQuinzenas, setFiltroQuinzenas] = useState([]);
  const [filtroRegionais, setFiltroRegionais] = useState([]);
  const [filtroSupervisores, setFiltroSupervisores] = useState([]);
  const [filtroFiliais, setFiltroFiliais] = useState([]);
  const [insucessosExcluidos, setInsucessosExcluidos] = useState([]);
  
  const [activeMenu, setActiveMenu] = useState('gestao_financeira');
  const [exportingType, setExportingType] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'desc' });
  const [selectedQuinzenaPareto, setSelectedQuinzenaPareto] = useState(null);
  const [selectedQuinzenaDS, setSelectedQuinzenaDS] = useState(null);

  const [hasInitialSynced, setHasInitialSynced] = useState(false);

  useEffect(() => {
    setSelectedQuinzenaPareto(null);
    setSelectedQuinzenaDS(null);
  }, [filtroQuinzenas, filtroFiliais, filtroRegionais, filtroSupervisores, activeMenu]);

  useEffect(() => {
    setFiltroSupervisores([]);
    setFiltroFiliais([]);
  }, [filtroRegionais]);

  useEffect(() => {
    setFiltroFiliais([]);
  }, [filtroSupervisores]);

  const handleMenuChange = (menu) => {
    setActiveMenu(menu);
    setSortConfig({ key: null, direction: 'desc' }); 
  };

  const parseNumber = (val) => {
    if (!val) return 0;
    return parseFloat(val.replace(/R\$\s?/g, '').replace(/"/g, '').replace(/\./g, '').replace(',', '.')) || 0;
  };

  const processRawCSV = useCallback((text) => {
    try {
      const lines = text.split('\n').filter(line => line.trim() !== '');
      if (lines.length < 2) return;
      const delimiter = lines[0].includes(';') ? ';' : ',';
      const rawHeaders = parseCSVLine(lines[0], delimiter).map(h => h.trim());
      const headers = rawHeaders.map(normalizeHeader);
      
      const idxQuinzena = headers.findIndex(h => h.includes('quinzena') || h.includes('data') || h.includes('periodo'));
      const idxRegional = headers.findIndex(h => h === 'regional' || h === 'regiao' || h.includes('regional')); 
      const idxSupervisor = headers.findIndex(h => h === 'supervisor' || h.includes('superv') || h.includes('gestor') || h.includes('coord'));
      const idxFilial = headers.findIndex(h => h.includes('filial') || h.includes('operacao') || h.includes('base') || h.includes('unidade'));
      const idxMotorista = headers.findIndex(h => h.includes('motorista') || h.includes('nome') || h.includes('entregador'));
      
      const idxIdPacote = headers.findIndex(h => h.includes('pacote') || h.includes('tracking') || h.includes('awb') || h === 'id' || h.includes('pedido'));
      const idxIdRota = headers.findIndex(h => h.includes('rota') || h.includes('route'));

      let idxTipo = headers.findIndex(h => h.includes('tipo') || h.includes('motivo') || h.includes('categoria') || h.includes('descri') || h.includes('infracao') || h.includes('ocorr'));
      let idxValor = headers.findIndex(h => h.includes('valor') || h.includes('desconto') || h.includes('total') || h.includes('penalidade') || h.includes('custo') || h.includes('r$'));

      const parsed = [];
      for (let i = 1; i < lines.length; i++) {
        let cols = parseCSVLine(lines[i], delimiter);
        const quinzena = idxQuinzena !== -1 ? normalizeQuinzena(cols[idxQuinzena]) : 'N/A';
        const regional = idxRegional !== -1 ? extractRegional(cols[idxRegional]) : 'N/A';
        const supervisor = idxSupervisor !== -1 ? cols[idxSupervisor] : 'N/A';
        const filial = idxFilial !== -1 ? cols[idxFilial] : 'N/A';
        const motorista = idxMotorista !== -1 ? cols[idxMotorista] : 'N/A';
        const id_pacote = idxIdPacote !== -1 ? cols[idxIdPacote] : '-';
        const id_rota = idxIdRota !== -1 ? cols[idxIdRota] : '-';

        let rawTipo = idxTipo !== -1 ? cols[idxTipo] : ''; 
        let rawValor = idxValor !== -1 ? cols[idxValor] : ''; 
        
        if (!rawValor) {
          const foundValCol = cols.find(c => String(c).includes('R$'));
          if (foundValCol) rawValor = foundValCol;
        }
        if (!rawTipo) {
          const foundTipoCol = cols.find(c => String(c).toLowerCase().includes('lost') || String(c).toLowerCase().includes('pnr') || String(c).toLowerCase().includes('visited'));
          if (foundTipoCol) rawTipo = foundTipoCol;
        }
        
        if (!quinzena || !rawTipo) continue;
        let valor = parseNumber(rawValor);
        let tipoFinal = 'Outros';
        if (rawTipo.toLowerCase().includes('lost')) tipoFinal = 'Lost Packages';
        else if (rawTipo.toLowerCase().includes('pnr')) tipoFinal = 'PNRs';
        else if (rawTipo.toLowerCase().includes('not visited') || rawTipo.toLowerCase().includes('nv')) tipoFinal = 'Not Visited';
        
        parsed.push({ 
          quinzena, regional, supervisor, filial, motorista, 
          tipo: tipoFinal, valor, id_pacote, id_rota 
        });
      }
      setRawData(parsed);
      setError(null);
    } catch (err) { setError('Erro ao processar Penalidades. Verifique a planilha.'); }
  }, []);

  const processFaturamentoData = useCallback((text) => {
    try {
      const lines = text.split('\n').filter(line => line.trim() !== '');
      if (lines.length < 2) return;
      const delimiter = lines[0].includes(';') ? ';' : ',';
      const rawHeaders = parseCSVLine(lines[0], delimiter).map(h => h.trim());
      const headers = rawHeaders.map(normalizeHeader);
      
      const idxQuinzena = headers.findIndex(h => h.includes('quinzena') || h.includes('data') || h.includes('periodo'));
      const idxRegional = headers.findIndex(h => h === 'regional' || h === 'regiao' || h.includes('regional'));
      const idxSupervisor = headers.findIndex(h => h === 'supervisor' || h.includes('superv') || h.includes('gestor') || h.includes('coord'));
      const idxFilial = headers.findIndex(h => h.includes('filial') || h.includes('operacao') || h.includes('base') || h.includes('unidade'));
      const idxMotorista = headers.findIndex(h => h.includes('motorista') || h.includes('nome') || h.includes('entregador'));
      
      const idxIdRota = headers.findIndex(h => h.includes('rota') || h.includes('route') || h.includes('viagem'));
      
      const idxCategoria = headers.findIndex(h => h.includes('categoria') || h.includes('veiculo'));
      let idxValor = headers.findIndex(h => h.includes('faturamento') || h.includes('valor') || h.includes('total') || h.includes('pagamento') || h.includes('r$'));

      const parsed = [];
      for (let i = 1; i < lines.length; i++) {
        let cols = parseCSVLine(lines[i], delimiter);
        const quinzena = idxQuinzena !== -1 ? normalizeQuinzena(cols[idxQuinzena]) : 'N/A';
        const regional = idxRegional !== -1 ? extractRegional(cols[idxRegional]) : 'N/A';
        const supervisor = idxSupervisor !== -1 ? cols[idxSupervisor] : 'N/A';
        const filial = idxFilial !== -1 ? cols[idxFilial] : 'N/A';
        const motorista = idxMotorista !== -1 ? cols[idxMotorista] : 'N/A';
        const id_rota = idxIdRota !== -1 ? cols[idxIdRota] : '-';
        const categoria = idxCategoria !== -1 ? cols[idxCategoria] : '-';
        let faturamentoRaw = idxValor !== -1 ? cols[idxValor] : '';
        if (!faturamentoRaw) {
          const foundValCol = cols.find(c => String(c).includes('R$'));
          if (foundValCol) faturamentoRaw = foundValCol;
        }
        let faturamento = parseNumber(faturamentoRaw);
        if (faturamento > 0) {
            parsed.push({ quinzena, regional, supervisor, filial, motorista, id_rota, categoria, faturamento });
        }
      }
      if(parsed.length > 0) setRawFaturamentoData(parsed);
      setError(null);
    } catch (err) { setError('Erro ao processar Faturamento. Verifique a planilha.'); }
  }, []);

  const processOperacionalData = useCallback((text) => {
    try {
      const lines = text.split('\n').filter(line => line.trim() !== '');
      if (lines.length < 2) return;
      const delimiter = lines[0].includes(';') ? ';' : ',';
      const rawHeaders = parseCSVLine(lines[0], delimiter).map(h => h.trim());
      const headers = rawHeaders.map(normalizeHeader);
      
      let idxRegional = -1;
      let idxSupervisor = -1;
      for (let j = headers.length - 1; j >= 0; j--) {
          if (idxRegional === -1 && (headers[j] === 'regional' || headers[j] === 'regiao' || headers[j].includes('regional'))) idxRegional = j;
          if (idxSupervisor === -1 && (headers[j] === 'supervisor' || headers[j].includes('superv') || headers[j].includes('gestor') || headers[j].includes('coord'))) idxSupervisor = j;
      }

      const idxQuinzena = headers.findIndex(h => h.includes('quinzena') || h.includes('data') || h.includes('periodo'));
      const idxFilial = headers.findIndex(h => h.includes('filial') || h.includes('operacao') || h.includes('base') || h.includes('unidade'));
      const idxMotorista = headers.findIndex(h => h.includes('motorista') || h.includes('nome') || h.includes('entregador'));
      
      let idxIdRota = 1;
      if (headers[1] && !headers[1].includes('rota') && !headers[1].includes('route')) {
          const found = headers.findIndex(h => h.includes('rota') || h.includes('route'));
          if (found !== -1) idxIdRota = found;
      }

      const idxSaldo = headers.findIndex(h => h === 'saldo' || h.includes('saldo') || h.includes('pacote') || h.includes('volume') || h.includes('total') || h.includes('envio'));
      const idxEntregues = headers.findIndex(h => h === 'entregues' || h.includes('entreg') || h.includes('sucesso') || h.includes('realizado'));

      const insucessosHeaders = [];
      // Mapeamento exato: Coluna CL (índice 89) até CZ (índice 103), ignorando CN (índice 91)
      for (let j = 89; j <= 103; j++) {
          if (rawHeaders[j] && rawHeaders[j].trim() !== '') {
              const h = normalizeHeader(rawHeaders[j]);
              // Ignorar colunas de totalizadores que possam entrar na margem
              if (!h.includes('%') && h !== 'ds' && !h.includes('meta') && h !== 'total insucessos' && h !== 'insucessos') {
                  insucessosHeaders.push({ index: j, name: rawHeaders[j].trim() });
              }
          }
      }
      if (insucessosHeaders.length === 0 && idxEntregues !== -1) {
          for (let j = idxEntregues + 1; j < headers.length; j++) {
              if (rawHeaders[j] && rawHeaders[j].trim() !== '') {
                  const h = normalizeHeader(rawHeaders[j]);
                  if (!h.includes('%') && h !== 'ds' && !h.includes('meta') && h !== 'total insucessos' && h !== 'insucessos') {
                      insucessosHeaders.push({ index: j, name: rawHeaders[j].trim() });
                  }
              }
          }
      }

      const parsed = [];
      for (let i = 1; i < lines.length; i++) {
        let cols = parseCSVLine(lines[i], delimiter);
        const filialRaw = idxFilial !== -1 ? cols[idxFilial] : 'N/A';
        if (!filialRaw || filialRaw.trim().toUpperCase() === '#N/A') continue;
        const filial = filialRaw;
        
        const quinzena = idxQuinzena !== -1 ? normalizeQuinzena(cols[idxQuinzena]) : 'N/A';
        const regional = idxRegional !== -1 && cols[idxRegional] ? extractRegional(cols[idxRegional]) : 'N/A';
        const supervisor = idxSupervisor !== -1 && cols[idxSupervisor] ? cols[idxSupervisor].trim() : 'N/A';
        const motorista = idxMotorista !== -1 ? cols[idxMotorista] : 'N/A';
        const id_rota = cols[idxIdRota] && String(cols[idxIdRota]).trim() !== '' ? String(cols[idxIdRota]).trim() : '-';
        
        const saldoRaw = idxSaldo !== -1 ? cols[idxSaldo] : cols[15];
        const entreguesRaw = idxEntregues !== -1 ? cols[idxEntregues] : cols[17];
        
        let saldoOriginal = parseNumber(saldoRaw);
        let entregues = parseNumber(entreguesRaw);

        const insucessosDetalhados = {};
        let qtdCancelados = 0;

        insucessosHeaders.forEach(h => {
            const v = parseNumber(cols[h.index]);
            if (v > 0) {
                // A coluna CN (índice 91) não deve ser considerada no cálculo do DS, então deduzimos do saldo original junto com os cancelados
                if (h.index === 91 || normalizeHeader(h.name).includes('cancelado')) {
                    qtdCancelados += v;
                } else {
                    insucessosDetalhados[h.name] = v;
                }
            }
        });

        let saldo = saldoOriginal - qtdCancelados;

        const somaIns = Object.values(insucessosDetalhados).reduce((a,b) => a + b, 0);
        if (saldo > 0 || entregues > 0 || somaIns > 0) {
            parsed.push({ quinzena, regional, supervisor, filial, motorista, id_rota, saldo, entregues, insucessosDetalhados });
        }
      }
      if(parsed.length > 0) setRawOperacionalData(parsed);
      setError(null);
    } catch (err) { setError('Erro ao processar Operacional. Verifique a planilha.'); }
  }, []);

  const processBscData = useCallback((text) => {
    try {
      const lines = text.split('\n').filter(line => line.trim() !== '');
      if (lines.length < 2) return;
      const delimiter = lines[0].includes(';') ? ';' : ',';
      const rawHeaders = parseCSVLine(lines[0], delimiter).map(h => h.trim());
      const headers = rawHeaders.map(normalizeHeader);
      
      const idxQuinzena = headers.findIndex(h => h.includes('quinzena') || h.includes('data') || h.includes('periodo'));
      
      let idxRegional = 38; 
      let idxSupervisor = 39; 
      
      const idxFilial = headers.findIndex(h => h.includes('filial') || h.includes('operacao') || h.includes('base') || h.includes('unidade'));
      
      let idxMotorista = 12; 
      let idxIdRota = 7;

      if (headers[38] && !headers[38].includes('regional') && !headers[38].includes('regiao')) {
          const found = headers.findIndex(h => h.includes('regional') || h === 'regiao');
          if (found !== -1) idxRegional = found;
      }
      if (headers[39] && !headers[39].includes('superv') && !headers[39].includes('gestor')) {
          const found = headers.findIndex(h => h.includes('superv') || h.includes('gestor') || h.includes('coord'));
          if (found !== -1) idxSupervisor = found;
      }
      if (headers[12] && !headers[12].includes('motorista') && !headers[12].includes('nome')) {
          const found = headers.findIndex(h => h.includes('motorista') || h.includes('nome') || h.includes('entregador'));
          if (found !== -1) idxMotorista = found;
      }
      if (headers[7] && !headers[7].includes('rota') && !headers[7].includes('route')) {
          const found = headers.findIndex(h => h.includes('rota') || h.includes('route'));
          if (found !== -1) idxIdRota = found;
      }
      
      const idxSaldo = headers.findIndex(h => h === 'saldo' || h.includes('saldo') || h.includes('pacote') || h.includes('volume') || h.includes('total') || h.includes('envio'));
      const idxEntregues = headers.findIndex(h => h === 'entregues' || h.includes('entreg') || h.includes('sucesso') || h.includes('realizado'));

      const ignoreIndices = [idxQuinzena, idxRegional, idxSupervisor, idxFilial, idxMotorista, idxIdRota, idxSaldo, idxEntregues].filter(i => i !== -1);
      const insucessosHeaders = [];
      
      // Mapeamento exato BSC: Coluna AD (índice 29) até AL (índice 37)
      // A coluna AB (índice 27) é automaticamente ignorada por estar fora deste range
      for (let j = 29; j <= 37; j++) {
          if (rawHeaders[j] && rawHeaders[j].trim() !== '') {
              const h = normalizeHeader(rawHeaders[j]);
              const isInvalid = h.includes('%') || h === 'ds' || h.includes('meta') || h.includes('taxa') || h.includes('atingimento') || h.includes('farol') || h.includes('status') || h.includes('performance') || h.includes('sla') || h === 'insucessos' || h === 'insucesso' || h === 'total insucessos' || h === 'total de insucessos';
              
              if (!isInvalid && !h.includes('regional') && !h.includes('supervisor') && !h.includes('quinzena') && !h.includes('filial') && !h.includes('motorista')) {
                  insucessosHeaders.push({ index: j, name: rawHeaders[j].trim() });
              }
          }
      }

      const parsed = [];
      for (let i = 1; i < lines.length; i++) {
        let cols = parseCSVLine(lines[i], delimiter);
        const filialRaw = idxFilial !== -1 ? cols[idxFilial] : 'N/A';
        if (!filialRaw || filialRaw.trim().toUpperCase() === '#N/A') continue; 
        const filial = filialRaw;
        
        const quinzena = idxQuinzena !== -1 ? normalizeQuinzena(cols[idxQuinzena]) : 'N/A';
        const regional = cols[idxRegional] ? extractRegional(cols[idxRegional]) : 'N/A';
        const supervisor = cols[idxSupervisor] ? cols[idxSupervisor].trim() : 'N/A';
        const motorista = cols[idxMotorista] && String(cols[idxMotorista]).trim() !== '' ? String(cols[idxMotorista]).trim() : 'N/A';
        const id_rota = cols[idxIdRota] && String(cols[idxIdRota]).trim() !== '' ? String(cols[idxIdRota]).trim() : '-';
        
        const saldoRaw = idxSaldo !== -1 ? cols[idxSaldo] : cols[15];
        const entreguesRaw = idxEntregues !== -1 ? cols[idxEntregues] : cols[17];
        
        let saldoOriginal = parseNumber(saldoRaw);
        let entregues = parseNumber(entreguesRaw);

        const insucessosDetalhados = {};
        let qtdCancelados = 0;

        insucessosHeaders.forEach(h => {
            const v = parseNumber(cols[h.index]);
            if (v > 0) {
                if (normalizeHeader(h.name).includes('cancelado')) {
                    qtdCancelados += v;
                } else {
                    insucessosDetalhados[h.name] = v;
                }
            }
        });

        let saldo = saldoOriginal - qtdCancelados;

        const somaIns = Object.values(insucessosDetalhados).reduce((a,b) => a + b, 0);
        if (saldo > 0 || entregues > 0 || somaIns > 0) {
            parsed.push({ quinzena, regional, supervisor, filial, motorista, id_rota, saldo, entregues, insucessosDetalhados });
        }
      }
      if(parsed.length > 0) setRawBscData(parsed);
      setError(null);
    } catch (err) { setError('Erro ao processar Operacional BSC. Verifique a planilha.'); }
  }, []);

  const fetchFromGoogleSheets = useCallback(async () => {
    setIsLoading(true); setError(null);
    
    const fetchCSV = async (url, nomeBase) => {
      if (!url) return null;
      let exportUrl = url;
      if (url.includes('/edit')) {
        const docId = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
        const gid = url.match(/gid=([0-9]+)/);
        if (docId) exportUrl = `https://docs.google.com/spreadsheets/d/${docId[1]}/export?format=csv&gid=${gid ? gid[1] : '0'}`;
      }
      try {
        const res = await fetch(exportUrl);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const text = await res.text();
        if (text.trim().toLowerCase().startsWith('<!doctype html>') || text.includes('<html')) {
          throw new Error("PRIVADA");
        }
        return text;
      } catch (err) {
        if (err.message === "PRIVADA") {
          throw new Error(`Acesso Negado: A base "${nomeBase}" parece estar Privada. Mude o acesso no Google Sheets para "Qualquer pessoa com o link".`);
        }
        throw new Error(`Erro ao baixar a base "${nomeBase}". Verifique o link.`);
      }
    };

    try {
      const t1 = await fetchCSV(sheetUrl, 'Penalidades');
      if (t1) processRawCSV(t1);

      const t2 = await fetchCSV(sheetUrlFaturamento, 'Faturamento');
      if (t2) processFaturamentoData(t2);

      const t3 = await fetchCSV(sheetUrlOperacional, 'Operacional');
      if (t3) processOperacionalData(t3);

      const t4 = await fetchCSV(sheetUrlBsc, 'BSC');
      if (t4) processBscData(t4);

    } catch (err) { 
      setError(err instanceof Error ? err.message : String(err)); 
    } 
    finally { setIsLoading(false); }
  }, [sheetUrl, sheetUrlFaturamento, sheetUrlOperacional, sheetUrlBsc, processRawCSV, processFaturamentoData, processOperacionalData, processBscData]);

  useEffect(() => {
    if (isAuthenticated && !hasInitialSynced) {
      fetchFromGoogleSheets();
      setHasInitialSynced(true);
    }
  }, [isAuthenticated, hasInitialSynced, fetchFromGoogleSheets]);

  const ssc4RatiosPerQuinzena = useMemo(() => {
    const ratios = {};
    const quinzenas = [...new Set(rawFaturamentoData.map(d => d.quinzena))];
    quinzenas.forEach(q => {
        const fat4 = rawFaturamentoData.filter(d => d.quinzena === q && normalizeText(d.filial) === 'ESC4').reduce((a, b) => a + b.faturamento, 0);
        const fat5 = rawFaturamentoData.filter(d => d.quinzena === q && normalizeText(d.filial) === 'ESC5').reduce((a, b) => a + b.faturamento, 0);
        const fat9 = rawFaturamentoData.filter(d => d.quinzena === q && normalizeText(d.filial) === 'ESC9').reduce((a, b) => a + b.faturamento, 0);
        const total = fat4 + fat5 + fat9;
        if (total > 0) {
            ratios[q] = { ESC4: fat4 / total, ESC5: fat5 / total, ESC9: fat9 / total };
        }
    });
    return ratios;
  }, [rawFaturamentoData]);

  const distributedDados = useMemo(() => {
    const result = [];
    rawData.forEach(d => {
        if (normalizeText(d.filial) === 'SSC4') {
            const ratios = ssc4RatiosPerQuinzena[d.quinzena];
            if (ratios) {
                ['ESC4', 'ESC5', 'ESC9'].forEach(target => {
                    if (ratios[target] > 0) result.push({ ...d, filial: target, valor: d.valor * ratios[target], _pesoQtd: ratios[target] });
                });
            } else { result.push({ ...d, _pesoQtd: 1 }); }
        } else { result.push({ ...d, _pesoQtd: 1 }); }
    });
    return result;
  }, [rawData, ssc4RatiosPerQuinzena]);

  const distributedFaturamento = useMemo(() => {
    const result = [];
    rawFaturamentoData.forEach(d => {
        if (normalizeText(d.filial) === 'SSC4') {
            const ratios = ssc4RatiosPerQuinzena[d.quinzena];
            if (ratios) {
                ['ESC4', 'ESC5', 'ESC9'].forEach(target => {
                    if (ratios[target] > 0) result.push({ ...d, filial: target, faturamento: d.faturamento * ratios[target] });
                });
            } else { result.push(d); }
        } else { result.push(d); }
    });
    return result;
  }, [rawFaturamentoData, ssc4RatiosPerQuinzena]);

  const distributedOperacional = useMemo(() => {
    const result = [];
    rawOperacionalData.forEach(d => {
        if (normalizeText(d.filial) === 'SSC4') {
            const ratios = ssc4RatiosPerQuinzena[d.quinzena];
            if (ratios) {
                ['ESC4', 'ESC5', 'ESC9'].forEach(target => {
                    if (ratios[target] > 0) {
                        const newIns = {};
                        if (d.insucessosDetalhados) {
                            Object.entries(d.insucessosDetalhados).forEach(([k, v]) => newIns[k] = v * ratios[target]);
                        }
                        result.push({ ...d, filial: target, saldo: d.saldo * ratios[target], entregues: d.entregues * ratios[target], insucessosDetalhados: newIns });
                    }
                });
            } else { result.push(d); }
        } else { result.push(d); }
    });
    return result;
  }, [rawOperacionalData, ssc4RatiosPerQuinzena]);

  const distributedBsc = useMemo(() => {
    const result = [];
    rawBscData.forEach(d => {
        if (normalizeText(d.filial) === 'SSC4') {
            const ratios = ssc4RatiosPerQuinzena[d.quinzena];
            if (ratios) {
                ['ESC4', 'ESC5', 'ESC9'].forEach(target => {
                    if (ratios[target] > 0) {
                        const newIns = {};
                        if (d.insucessosDetalhados) {
                            Object.entries(d.insucessosDetalhados).forEach(([k, v]) => newIns[k] = v * ratios[target]);
                        }
                        result.push({ ...d, filial: target, saldo: d.saldo * ratios[target], entregues: d.entregues * ratios[target], insucessosDetalhados: newIns });
                    }
                });
            } else { result.push(d); }
        } else { result.push(d); }
    });
    return result;
  }, [rawBscData, ssc4RatiosPerQuinzena]);

  const quinzenasDisponiveis = useMemo(() => {
    const q1 = distributedDados.map(d => d.quinzena);
    const q3 = distributedFaturamento.map(d => d.quinzena);
    const q4 = distributedOperacional.map(d => d.quinzena);
    const q5 = distributedBsc.map(d => d.quinzena);
    return [...new Set([...q1, ...q3, ...q4, ...q5])].sort().reverse();
  }, [distributedDados, distributedFaturamento, distributedOperacional, distributedBsc]);
  
  const regionaisDisponiveis = useMemo(() => {
    const r1 = distributedDados.map(d => d.regional);
    const r2 = distributedFaturamento.map(d => d.regional);
    const r3 = distributedOperacional.map(d => d.regional);
    const r4 = distributedBsc.map(d => d.regional);
    return [...new Set([...r1, ...r2, ...r3, ...r4].filter(r => r && r !== 'N/A'))].sort();
  }, [distributedDados, distributedFaturamento, distributedOperacional, distributedBsc]);

  const supervisoresDisponiveis = useMemo(() => {
    const matchReg = (r) => filtroRegionais.length === 0 || filtroRegionais.includes(r);
    const s1 = distributedDados.filter(d => matchReg(d.regional)).map(d => d.supervisor);
    const s2 = distributedFaturamento.filter(d => matchReg(d.regional)).map(d => d.supervisor);
    const s3 = distributedOperacional.filter(d => matchReg(d.regional)).map(d => d.supervisor);
    const s4 = distributedBsc.filter(d => matchReg(d.regional)).map(d => d.supervisor);
    return [...new Set([...s1, ...s2, ...s3, ...s4].filter(s => s && s !== 'N/A'))].sort();
  }, [distributedDados, distributedFaturamento, distributedOperacional, distributedBsc, filtroRegionais]);

  const filiaisDisponiveis = useMemo(() => {
    const matchReg = (r) => filtroRegionais.length === 0 || filtroRegionais.includes(r);
    const matchSup = (s) => filtroSupervisores.length === 0 || filtroSupervisores.includes(s);
    
    const f1 = distributedDados.filter(d => matchReg(d.regional) && matchSup(d.supervisor)).map(d => d.filial);
    const f2 = distributedFaturamento.filter(d => matchReg(d.regional) && matchSup(d.supervisor)).map(d => d.filial);
    const f3 = distributedOperacional.filter(d => matchReg(d.regional) && matchSup(d.supervisor)).map(d => d.filial);
    const f4 = distributedBsc.filter(d => matchReg(d.regional) && matchSup(d.supervisor)).map(d => d.filial);
    return [...new Set([...f1, ...f2, ...f3, ...f4].filter(f => f && f !== 'N/A'))].sort();
  }, [distributedDados, distributedFaturamento, distributedOperacional, distributedBsc, filtroRegionais, filtroSupervisores]);

  const matchFiltro = (val, arr) => arr.length === 0 || arr.includes(val);

  const dadosFiltrados = useMemo(() => {
    return distributedDados.filter(d => 
      matchFiltro(d.quinzena, filtroQuinzenas) && 
      matchFiltro(d.filial, filtroFiliais) &&
      matchFiltro(d.regional, filtroRegionais) &&
      matchFiltro(d.supervisor, filtroSupervisores)
    );
  }, [distributedDados, filtroQuinzenas, filtroFiliais, filtroRegionais, filtroSupervisores]);

  const faturamentoFiltrado = useMemo(() => {
    return distributedFaturamento.filter(d => 
      matchFiltro(d.quinzena, filtroQuinzenas) && 
      matchFiltro(d.filial, filtroFiliais) &&
      matchFiltro(d.regional, filtroRegionais) &&
      matchFiltro(d.supervisor, filtroSupervisores)
    );
  }, [distributedFaturamento, filtroQuinzenas, filtroFiliais, filtroRegionais, filtroSupervisores]);

  const operacionalFiltrado = useMemo(() => {
    return distributedOperacional.filter(d => 
      matchFiltro(d.quinzena, filtroQuinzenas) && 
      matchFiltro(d.filial, filtroFiliais) &&
      matchFiltro(d.regional, filtroRegionais) &&
      matchFiltro(d.supervisor, filtroSupervisores)
    );
  }, [distributedOperacional, filtroQuinzenas, filtroFiliais, filtroRegionais, filtroSupervisores]);

  const bscFiltrado = useMemo(() => {
    return distributedBsc.filter(d => 
      matchFiltro(d.quinzena, filtroQuinzenas) && 
      matchFiltro(d.filial, filtroFiliais) &&
      matchFiltro(d.regional, filtroRegionais) &&
      matchFiltro(d.supervisor, filtroSupervisores)
    );
  }, [distributedBsc, filtroQuinzenas, filtroFiliais, filtroRegionais, filtroSupervisores]);

  const insucessosDisponiveis = useMemo(() => {
    const keys = new Set();
    if (activeMenu === 'gestao_bsc' || activeMenu === 'comparativo_bsc' || activeMenu === 'gaps_operacionais') {
      bscFiltrado.forEach(d => {
        if (d.insucessosDetalhados) {
          Object.keys(d.insucessosDetalhados).forEach(k => keys.add(k));
        }
      });
    } else {
      operacionalFiltrado.forEach(d => {
        if (d.insucessosDetalhados) {
          Object.keys(d.insucessosDetalhados).forEach(k => keys.add(k));
        }
      });
    }
    return Array.from(keys).sort();
  }, [operacionalFiltrado, bscFiltrado, activeMenu]);

  const operacionalSimulado = useMemo(() => {
    return operacionalFiltrado.map(d => {
        let insucessosDesconsiderados = 0;
        const newInsucessosDetalhados = {};

        if (d.insucessosDetalhados) {
            Object.entries(d.insucessosDetalhados).forEach(([k, v]) => {
                if (insucessosExcluidos.includes(k)) {
                    insucessosDesconsiderados += v;
                } else {
                    newInsucessosDetalhados[k] = v;
                }
            });
        }
        
        const saldoReconciliado = d.saldo - insucessosDesconsiderados;

        return {
            ...d,
            saldoOriginal: d.saldo,
            saldo: saldoReconciliado,
            insucessosDesconsiderados,
            insucessosDetalhados: newInsucessosDetalhados
        };
    });
  }, [operacionalFiltrado, insucessosExcluidos]);

  const bscSimulado = useMemo(() => {
    return bscFiltrado.map(d => {
        let insucessosDesconsiderados = 0;
        const newInsucessosDetalhados = {};

        if (d.insucessosDetalhados) {
            Object.entries(d.insucessosDetalhados).forEach(([k, v]) => {
                if (insucessosExcluidos.includes(k)) {
                    insucessosDesconsiderados += v;
                } else {
                    newInsucessosDetalhados[k] = v;
                }
            });
        }
        
        const saldoReconciliado = d.saldo - insucessosDesconsiderados;

        return {
            ...d,
            saldoOriginal: d.saldo,
            saldo: saldoReconciliado,
            insucessosDesconsiderados,
            insucessosDetalhados: newInsucessosDetalhados
        };
    });
  }, [bscFiltrado, insucessosExcluidos]);

  const resumoMetrics = useMemo(() => {
    return dadosFiltrados.reduce((acc, curr) => {
      const category = curr.tipo || 'Outros';
      if (!acc.categories[category]) {
        acc.categories[category] = { valor: 0, qtd: 0 };
      }
      acc.categories[category].valor += (curr.valor || 0);
      acc.categories[category].qtd += (curr._pesoQtd !== undefined ? curr._pesoQtd : 1);
      acc.total += (curr.valor || 0);
      acc.qtdTotal += (curr._pesoQtd !== undefined ? curr._pesoQtd : 1);
      return acc;
    }, { categories: {}, total: 0, qtdTotal: 0 });
  }, [dadosFiltrados]);

  const faturamentoTotalMetrics = useMemo(() => {
      return faturamentoFiltrado.reduce((acc, curr) => acc + (curr.faturamento || 0), 0);
  }, [faturamentoFiltrado]);

  const pnrTot = resumoMetrics.categories?.['PNRs'] || { valor: 0, qtd: 0 };
  const lostTot = resumoMetrics.categories?.['Lost Packages'] || { valor: 0, qtd: 0 };
  const nvTot = resumoMetrics.categories?.['Not Visited'] || { valor: 0, qtd: 0 };

  const targetQuinzenaRunRate = useMemo(() => {
    if (filtroQuinzenas.length > 0) return filtroQuinzenas[0];
    
    let relevantData = [];
    if (activeMenu === 'gestao_financeira') relevantData = faturamentoFiltrado;
    else if (activeMenu === 'gestao_bsc' || activeMenu === 'comparativo_bsc' || activeMenu === 'gaps_operacionais') relevantData = bscFiltrado;
    else relevantData = operacionalFiltrado;
    
    if (relevantData.length > 0) {
      const qs = [...new Set(relevantData.map(d => d.quinzena))].sort().reverse();
      if (qs.length > 0) return qs[0];
    }
    return quinzenasDisponiveis.length > 0 ? quinzenasDisponiveis[0] : 'N/A';
  }, [filtroQuinzenas, activeMenu, faturamentoFiltrado, bscFiltrado, operacionalFiltrado, quinzenasDisponiveis]);

  const prevQuinzenaName = useMemo(() => {
    if (!targetQuinzenaRunRate || quinzenasDisponiveis.length < 2) return null;
    const currentIndex = quinzenasDisponiveis.indexOf(targetQuinzenaRunRate);
    if (currentIndex !== -1 && currentIndex + 1 < quinzenasDisponiveis.length) {
      return quinzenasDisponiveis[currentIndex + 1];
    }
    return null;
  }, [quinzenasDisponiveis, targetQuinzenaRunRate]);

  const prevQuinzenaStats = useMemo(() => {
    if (!prevQuinzenaName) return null;
    let fat = 0, pen = 0, pnr = 0, lost = 0, nv = 0;
    faturamentoFiltrado.filter(d => d.quinzena === prevQuinzenaName).forEach(d => fat += d.faturamento);
    dadosFiltrados.filter(d => d.quinzena === prevQuinzenaName).forEach(d => {
        pen += d.valor;
        if (d.tipo === 'PNRs') pnr += d.valor;
        else if (d.tipo === 'Lost Packages') lost += d.valor;
        else if (d.tipo === 'Not Visited') nv += d.valor;
    });
    return { name: prevQuinzenaName, fat, pen, pnr, lost, nv };
  }, [dadosFiltrados, faturamentoFiltrado, prevQuinzenaName]);

  const baseRunRateData = useMemo(() => {
    if (!targetQuinzenaRunRate) return [];
    const map = {};
    faturamentoFiltrado.filter(d => d.quinzena === targetQuinzenaRunRate).forEach(d => {
        const key = normalizeText(d.filial);
        if (!map[key]) map[key] = { filial: d.filial, regional: d.regional || 'N/A', supervisor: d.supervisor || 'N/A', faturamento: 0, penalidades: 0, pnr: 0, lost: 0, notVisited: 0 };
        if (d.regional && d.regional !== 'N/A') map[key].regional = d.regional;
        if (d.supervisor && d.supervisor !== 'N/A') map[key].supervisor = d.supervisor;
        map[key].faturamento += d.faturamento;
    });
    dadosFiltrados.filter(d => d.quinzena === targetQuinzenaRunRate).forEach(d => {
        const key = normalizeText(d.filial);
        if (!map[key]) map[key] = { filial: d.filial, regional: d.regional || 'N/A', supervisor: d.supervisor || 'N/A', faturamento: 0, penalidades: 0, pnr: 0, lost: 0, notVisited: 0 };
        if (d.regional && d.regional !== 'N/A') map[key].regional = d.regional;
        if (d.supervisor && d.supervisor !== 'N/A') map[key].supervisor = d.supervisor;
        map[key].penalidades += d.valor;
        if (d.tipo === 'PNRs') map[key].pnr += d.valor;
        else if (d.tipo === 'Lost Packages') map[key].lost += d.valor;
        else if (d.tipo === 'Not Visited') map[key].notVisited += d.valor;
    });
    return Object.values(map);
  }, [dadosFiltrados, faturamentoFiltrado, targetQuinzenaRunRate]);

  const baseBscRunRateData = useMemo(() => {
    if (!targetQuinzenaRunRate) return [];
    const map = {};
    bscSimulado.filter(d => d.quinzena === targetQuinzenaRunRate).forEach(d => {
        const key = normalizeText(d.filial);
        if (!map[key]) map[key] = { filial: d.filial, regional: d.regional || 'N/A', supervisor: d.supervisor || 'N/A', saldo: 0, entregues: 0, insucessosDetalhados: {} };
        if (d.regional && d.regional !== 'N/A') map[key].regional = d.regional;
        if (d.supervisor && d.supervisor !== 'N/A') map[key].supervisor = d.supervisor;
        map[key].saldo += d.saldo;
        map[key].entregues += d.entregues;
        if (d.insucessosDetalhados) {
            Object.entries(d.insucessosDetalhados).forEach(([k, v]) => {
                map[key].insucessosDetalhados[k] = (map[key].insucessosDetalhados[k] || 0) + v;
            });
        }
    });
    return Object.values(map);
  }, [bscSimulado, targetQuinzenaRunRate]);

  const baseOperacionalRunRateData = useMemo(() => {
    if (!targetQuinzenaRunRate) return [];
    const map = {};
    operacionalSimulado.filter(d => d.quinzena === targetQuinzenaRunRate).forEach(d => {
        const key = normalizeText(d.filial);
        if (!map[key]) map[key] = { filial: d.filial, regional: d.regional || 'N/A', supervisor: d.supervisor || 'N/A', saldo: 0, entregues: 0, insucessosDetalhados: {} };
        if (d.regional && d.regional !== 'N/A') map[key].regional = d.regional;
        if (d.supervisor && d.supervisor !== 'N/A') map[key].supervisor = d.supervisor;
        map[key].saldo += d.saldo;
        map[key].entregues += d.entregues;
        if (d.insucessosDetalhados) {
            Object.entries(d.insucessosDetalhados).forEach(([k, v]) => {
                map[key].insucessosDetalhados[k] = (map[key].insucessosDetalhados[k] || 0) + v;
            });
        }
    });
    return Object.values(map);
  }, [operacionalSimulado, targetQuinzenaRunRate]);

  const paretoQuinzenaData = useMemo(() => {
    const map = {};
    faturamentoFiltrado.forEach(d => {
        const key = d.quinzena || 'N/A';
        if (!map[key]) map[key] = { quinzena: key, faturamento: 0, penalidades: 0, pnr: 0, lost: 0, notVisited: 0 };
        map[key].faturamento += d.faturamento;
    });
    dadosFiltrados.forEach(d => {
        const key = d.quinzena || 'N/A';
        if (!map[key]) map[key] = { quinzena: key, faturamento: 0, penalidades: 0, pnr: 0, lost: 0, notVisited: 0 };
        map[key].penalidades += d.valor;
        if (d.tipo === 'PNRs') map[key].pnr += d.valor;
        else if (d.tipo === 'Lost Packages') map[key].lost += d.valor;
        else if (d.tipo === 'Not Visited') map[key].notVisited += d.valor;
    });
    return Object.values(map).map(item => ({
        ...item,
        representatividade: item.faturamento > 0 ? (item.penalidades / item.faturamento) * 100 : (item.penalidades > 0 ? Infinity : 0)
    })).sort((a, b) => String(b.quinzena).localeCompare(String(a.quinzena))); 
  }, [dadosFiltrados, faturamentoFiltrado]);

  const paretoFilialDrilldownData = useMemo(() => {
    if (!selectedQuinzenaPareto) return [];
    const map = {};
    faturamentoFiltrado.filter(d => d.quinzena === selectedQuinzenaPareto).forEach(d => {
        const key = normalizeText(d.filial);
        if (!map[key]) map[key] = { filial: d.filial, faturamento: 0, penalidades: 0, pnr: 0, lost: 0, notVisited: 0 };
        map[key].faturamento += d.faturamento;
    });
    dadosFiltrados.filter(d => d.quinzena === selectedQuinzenaPareto).forEach(d => {
        const key = normalizeText(d.filial);
        if (!map[key]) map[key] = { filial: d.filial, faturamento: 0, penalidades: 0, pnr: 0, lost: 0, notVisited: 0 };
        map[key].penalidades += d.valor;
        if (d.tipo === 'PNRs') map[key].pnr += d.valor;
        else if (d.tipo === 'Lost Packages') map[key].lost += d.valor;
        else if (d.tipo === 'Not Visited') map[key].notVisited += d.valor;
    });
    return Object.values(map).map(item => ({
        ...item,
        representatividade: item.faturamento > 0 ? (item.penalidades / item.faturamento) * 100 : (item.penalidades > 0 ? Infinity : 0)
    })).sort((a, b) => b.faturamento - a.faturamento); 
  }, [dadosFiltrados, faturamentoFiltrado, selectedQuinzenaPareto]);

  const isBscView = activeMenu === 'gestao_bsc';
  const isOpOrBscView = activeMenu === 'gestao_operacional' || activeMenu === 'gestao_bsc';
  
  let globalBscSaldo = 0;
  let globalBscEntregues = 0;
  bscSimulado.forEach(d => {
    globalBscSaldo += d.saldo;
    globalBscEntregues += d.entregues;
  });
  const dsGlobalBscAtual = globalBscSaldo > 0 ? (globalBscEntregues / globalBscSaldo) * 100 : 0;

  let globalOperacionalSaldo = 0;
  let globalOperacionalEntregues = 0;
  operacionalSimulado.forEach(d => {
    globalOperacionalSaldo += d.saldo;
    globalOperacionalEntregues += d.entregues;
  });
  const dsGlobalAtual = globalOperacionalSaldo > 0 ? (globalOperacionalEntregues / globalOperacionalSaldo) * 100 : 0;

  const currentGlobalSaldo = isBscView ? globalBscSaldo : globalOperacionalSaldo;
  const currentGlobalEntregues = isBscView ? globalBscEntregues : globalOperacionalEntregues;
  const currentDsGlobalAtual = isBscView ? dsGlobalBscAtual : dsGlobalAtual;
  
  const currentOpRunRateData = isBscView ? baseBscRunRateData : baseOperacionalRunRateData;
  const titlePrefix = isBscView ? 'BSC' : 'Operacional';
  const IconOverview = isBscView ? Target : PackageCheck;

  const globalInsucessosArray = useMemo(() => {
    const map = {};
    const dataToUse = isBscView ? bscSimulado : operacionalSimulado;
    dataToUse.forEach(d => {
      if (d.insucessosDetalhados) {
        Object.entries(d.insucessosDetalhados).forEach(([k, v]) => {
          map[k] = (map[k] || 0) + v;
        });
      }
    });
    return Object.entries(map).sort((a,b) => b[1] - a[1]);
  }, [isBscView, bscSimulado, operacionalSimulado]);

  const dsQuinzenaData = useMemo(() => {
    const dataToUse = isBscView ? bscSimulado : operacionalSimulado;
    const map = {};
    dataToUse.forEach(d => {
        const key = d.quinzena || 'N/A';
        if (!map[key]) map[key] = { name: key, quinzena: key, saldo: 0, entregues: 0, insucessosDetalhados: {} };
        map[key].saldo += d.saldo;
        map[key].entregues += d.entregues;
        if (d.insucessosDetalhados) {
            Object.entries(d.insucessosDetalhados).forEach(([k, v]) => {
                map[key].insucessosDetalhados[k] = (map[key].insucessosDetalhados[k] || 0) + v;
            });
        }
    });
    return Object.values(map).map(item => ({
        ...item,
        ds: item.saldo > 0 ? (item.entregues / item.saldo) * 100 : 0
    })).sort((a, b) => String(b.quinzena).localeCompare(String(a.quinzena))); 
  }, [isBscView, bscSimulado, operacionalSimulado]);

  const dsFilialDrilldownData = useMemo(() => {
    if (!selectedQuinzenaDS) return [];
    const dataToUse = isBscView ? bscSimulado : operacionalSimulado;
    const map = {};
    dataToUse.filter(d => d.quinzena === selectedQuinzenaDS).forEach(d => {
        const key = normalizeText(d.filial);
        if (!map[key]) map[key] = { name: d.filial, filial: d.filial, saldo: 0, entregues: 0, insucessosDetalhados: {} };
        map[key].saldo += d.saldo;
        map[key].entregues += d.entregues;
        if (d.insucessosDetalhados) {
            Object.entries(d.insucessosDetalhados).forEach(([k, v]) => {
                map[key].insucessosDetalhados[k] = (map[key].insucessosDetalhados[k] || 0) + v;
            });
        }
    });
    return Object.values(map).map(item => ({
        ...item,
        ds: item.saldo > 0 ? (item.entregues / item.saldo) * 100 : 0
    })).sort((a, b) => a.ds - b.ds); 
  }, [isBscView, bscSimulado, operacionalSimulado, selectedQuinzenaDS]);

  const handleDownloadExcel = async (type, options = {}) => {
    setExportingType(`excel-${type}`);
    try {
      await loadScript('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js');
      const XLSX = window.XLSX;
      const wb = XLSX.utils.book_new();

      if (type === 'penalidades') {
        const isEvent = options && (options.nativeEvent || options._reactName);
        const { filial, motorista } = isEvent ? {} : (options || {});
        
        const filiaisMap = {};
        const motoristasMap = {};
        const casosMap = [];

        let exportData = dadosFiltrados;
        if (filial) exportData = exportData.filter(d => normalizeText(d.filial) === normalizeText(filial));
        if (motorista) exportData = exportData.filter(d => normalizeText(d.motorista) === normalizeText(motorista));

        exportData.forEach(d => {
          const fKey = d.filial || 'N/A';
          const mKey = d.motorista || 'N/A';
          const reg = d.regional || 'N/A';
          const sup = d.supervisor || 'N/A';
          const qtd = d._pesoQtd !== undefined ? d._pesoQtd : 1;
          const valor = d.valor || 0;

          if (!filiaisMap[fKey]) {
            filiaisMap[fKey] = {
              "Filial": fKey, "Regional": reg, "Supervisor": sup,
              "Total (R$)": 0, "Total (Qtd)": 0,
              "PNR (R$)": 0, "PNR (Qtd)": 0,
              "Lost (R$)": 0, "Lost (Qtd)": 0,
              "NV (R$)": 0, "NV (Qtd)": 0
            };
          }
          filiaisMap[fKey]["Total (R$)"] += valor;
          filiaisMap[fKey]["Total (Qtd)"] += qtd;
          if (d.tipo === 'PNRs') { filiaisMap[fKey]["PNR (R$)"] += valor; filiaisMap[fKey]["PNR (Qtd)"] += qtd; }
          else if (d.tipo === 'Lost Packages') { filiaisMap[fKey]["Lost (R$)"] += valor; filiaisMap[fKey]["Lost (Qtd)"] += qtd; }
          else if (d.tipo === 'Not Visited') { filiaisMap[fKey]["NV (R$)"] += valor; filiaisMap[fKey]["NV (Qtd)"] += qtd; }

          const mUniqueKey = `${fKey}-${mKey}`;
          if (!motoristasMap[mUniqueKey]) {
            motoristasMap[mUniqueKey] = {
              "Motorista": mKey, "Filial": fKey, "Regional": reg, "Supervisor": sup,
              "Total (R$)": 0, "Total (Qtd)": 0,
              "PNR (R$)": 0, "PNR (Qtd)": 0,
              "Lost (R$)": 0, "Lost (Qtd)": 0,
              "NV (R$)": 0, "NV (Qtd)": 0
            };
          }
          motoristasMap[mUniqueKey]["Total (R$)"] += valor;
          motoristasMap[mUniqueKey]["Total (Qtd)"] += qtd;
          if (d.tipo === 'PNRs') { motoristasMap[mUniqueKey]["PNR (R$)"] += valor; motoristasMap[mUniqueKey]["PNR (Qtd)"] += qtd; }
          else if (d.tipo === 'Lost Packages') { motoristasMap[mUniqueKey]["Lost (R$)"] += valor; motoristasMap[mUniqueKey]["Lost (Qtd)"] += qtd; }
          else if (d.tipo === 'Not Visited') { motoristasMap[mUniqueKey]["NV (R$)"] += valor; motoristasMap[mUniqueKey]["NV (Qtd)"] += qtd; }

          casosMap.push({
            "Filial": fKey, 
            "Regional": reg, 
            "Supervisor": sup, 
            "Motorista": mKey,
            "Tipo Penalidade": d.tipo,
            "ID (Pacote/Rota)": d.tipo === 'Not Visited' ? (d.id_rota || '-') : (d.id_pacote || '-'),
            "Valor (R$)": valor,
            "Quantidade": qtd
          });
        });

        const filiaisData = Object.values(filiaisMap).sort((a, b) => b["Total (R$)"] - a["Total (R$)"]);
        const motoristasData = Object.values(motoristasMap).sort((a, b) => b["Total (R$)"] - a["Total (R$)"]);
        const casosData = casosMap.sort((a, b) => b["Valor (R$)"] - a["Valor (R$)"]);

        if (!filial && !motorista) {
            if (filiaisData.length > 0) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(filiaisData), "Por Filial");
            if (motoristasData.length > 0) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(motoristasData), "Por Motorista");
        } else if (filial && !motorista) {
            if (motoristasData.length > 0) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(motoristasData), "Por Motorista");
            if (casosData.length > 0) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(casosData), "Detalhamento Casos");
        } else if (motorista) {
            if (casosData.length > 0) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(casosData), "Detalhamento Casos");
        }

        const baseNameLabel = filtroQuinzenas.length === 1 ? filtroQuinzenas[0] : (filtroQuinzenas.length > 0 ? 'Filtrado' : 'Todas');
        let fileName = `Detalhamento_Financeiro_${baseNameLabel}.xlsx`;
        
        if (motorista) fileName = `Casos_${motorista.replace(/[^a-zA-Z0-9]/g, '_')}_${baseNameLabel}.xlsx`;
        else if (filial) fileName = `Motoristas_${filial.replace(/[^a-zA-Z0-9]/g, '_')}_${baseNameLabel}.xlsx`;

        XLSX.writeFile(wb, fileName);
      }
    } catch (err) { 
      console.error("Erro na exportação Excel:", err);
      setError('Ocorreu um erro ao gerar o Excel.'); 
    } 
    finally { setExportingType(null); }
  };

  // TELA DE LOGIN
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 transition-colors duration-500 p-4 font-sans text-slate-800">
        <button 
          onClick={toggleTheme} 
          className="absolute top-6 right-6 bg-slate-800 p-3 rounded-full text-slate-300 hover:text-white hover:bg-slate-700 transition-colors shadow-lg"
          title="Alternar Tema"
        >
          {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
        <div className="max-w-md w-full bg-slate-800 p-8 rounded-3xl shadow-2xl border border-slate-700">
          <div className="flex flex-col items-center gap-4 mb-8">
            <div className="bg-blue-600 p-4 rounded-2xl shadow-lg">
              <Lock className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">DashOp Login</h1>
            <p className="text-slate-400 text-center text-sm font-medium">Acesso restrito. Insira a senha operacional.</p>
          </div>
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div>
              <input
                type="password"
                value={senhaDigitada}
                onChange={(e) => setSenhaDigitada(e.target.value)}
                placeholder="Digite a senha..."
                className="w-full px-4 py-3 rounded-xl border border-slate-600 bg-slate-900 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium"
              />
              {erroLogin && <p className="text-red-400 text-xs font-bold mt-2 ml-1">Senha incorreta. Tente novamente.</p>}
            </div>
            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg hover:shadow-blue-500/20 active:scale-[0.98]">
              Acessar Dashboard
            </button>
          </form>
        </div>
      </div>
    );
  }

  // TELA PRINCIPAL (DASHBOARD)
  return (
    <div className={`flex h-screen w-full bg-slate-50 dark:bg-slate-900 font-sans text-slate-800 dark:text-slate-200 overflow-hidden transition-colors duration-300`}>
      {/* SIDEBAR */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 overflow-y-auto hidden md:flex border-r border-slate-800">
        <div className="p-6 bg-slate-950 border-b border-slate-800 sticky top-0 z-10 flex justify-between items-center">
          <h1 className="text-xl font-black text-white flex items-center gap-3 tracking-tight">
            <div className="bg-blue-600 p-2 rounded-lg"><TrendingUp className="w-5 h-5 text-white"/></div>
            DashOp
          </h1>
        </div>
        <nav className="flex-1 py-6 flex flex-col gap-6 px-4">
          <div className="flex flex-col gap-1">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 px-3">Visão Geral</p>
            <button onClick={() => handleMenuChange('gestao_financeira')} className={`w-full flex items-center justify-start text-left gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors ${activeMenu === 'gestao_financeira' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
              <LayoutDashboard className="w-4 h-4 shrink-0"/> 
              <span className="truncate">Gestão Financeira</span>
            </button>
            <button onClick={() => handleMenuChange('gestao_operacional')} className={`w-full flex items-center justify-start text-left gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors ${activeMenu === 'gestao_operacional' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
              <Box className="w-4 h-4 shrink-0"/> 
              <span className="truncate">Gestão Operacional</span>
            </button>
            <button onClick={() => handleMenuChange('gestao_bsc')} className={`w-full flex items-center justify-start text-left gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors ${activeMenu === 'gestao_bsc' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
              <Target className="w-4 h-4 shrink-0"/> 
              <span className="truncate">Gestão Operacional BSC</span>
            </button>
          </div>
          
          <div className="flex flex-col gap-1">
            <p className="text-[11px] font-bold text-blue-400 uppercase tracking-wider mb-2 px-3 bg-blue-900/30 py-1 rounded inline-block mx-3">Detalhamento</p>
            <button onClick={() => handleMenuChange('detalhe_financeiro')} className={`w-full flex items-center justify-start text-left gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors ${activeMenu === 'detalhe_financeiro' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
              <DollarSign className="w-4 h-4 shrink-0"/> 
              <span className="truncate">Detalhe Financeiro</span>
            </button>
            <button onClick={() => handleMenuChange('comparativo_bsc')} className={`w-full flex items-center justify-start text-left gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors ${activeMenu === 'comparativo_bsc' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
              <GitCompare className="w-4 h-4 shrink-0"/> 
              <span className="truncate">Comparativo BSC</span>
            </button>
            <button onClick={() => handleMenuChange('gaps_operacionais')} className={`w-full flex items-center justify-start text-left gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors ${activeMenu === 'gaps_operacionais' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
              <PieChart className="w-4 h-4 shrink-0"/> 
              <span className="truncate">Gaps Operacionais</span>
            </button>
          </div>
        </nav>
      </aside>

      {/* HEADER & MAIN */}
      <main className="flex-1 flex flex-col h-full relative overflow-hidden">
        <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-4 md:px-6 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 shrink-0 shadow-sm z-50 transition-colors duration-300">
          
          <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
              <Filter className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider hidden sm:block">Filtros</span>
            </div>
            
            <div className="flex flex-wrap items-center gap-2 bg-slate-50 dark:bg-slate-900/50 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700">
              <MultiSelectDropdown label="Quinzena" options={quinzenasDisponiveis} selected={filtroQuinzenas} onChange={setFiltroQuinzenas} />
              <div className="hidden sm:block w-px h-6 bg-slate-300 dark:bg-slate-700 mx-1"></div>
              <MultiSelectDropdown label="Regional" options={regionaisDisponiveis} selected={filtroRegionais} onChange={setFiltroRegionais} />
              <div className="hidden sm:block w-px h-6 bg-slate-300 dark:bg-slate-700 mx-1"></div>
              <MultiSelectDropdown label="Supervisor" options={supervisoresDisponiveis} selected={filtroSupervisores} onChange={setFiltroSupervisores} />
              <div className="hidden sm:block w-px h-6 bg-slate-300 dark:bg-slate-700 mx-1"></div>
              <MultiSelectDropdown label="Filial" options={filiaisDisponiveis} selected={filtroFiliais} onChange={setFiltroFiliais} />
              
              {isOpOrBscView && (
                <>
                  <div className="hidden sm:block w-px h-6 bg-slate-300 dark:bg-slate-700 mx-1"></div>
                  <MultiSelectDropdown label="Ignorar Insucesso" options={insucessosDisponiveis} selected={insucessosExcluidos} onChange={setInsucessosExcluidos} />
                </>
              )}
            </div>
          </div>

          <div className="flex items-center shrink-0 w-full xl:w-auto mt-2 xl:mt-0 justify-end gap-3">
             <button 
                onClick={toggleTheme} 
                className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700 transition-colors border border-transparent dark:border-slate-700 shadow-sm"
                title="Alternar Tema"
              >
                {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
             </button>
             <button onClick={fetchFromGoogleSheets} disabled={isLoading} className="flex items-center justify-center gap-2 bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50 px-4 py-2 rounded-xl text-sm font-bold transition-colors disabled:opacity-50 shadow-sm w-full sm:w-auto">
               <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} /> 
               {isLoading ? 'Sincronizando...' : 'Sincronizar Dados'}
             </button>
          </div>
        </header>

        {error && (
          <div className="mx-4 md:mx-6 mt-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 rounded-2xl flex items-start gap-3 shadow-sm z-40">
             <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
             <div>
                <h4 className="font-bold text-red-800 dark:text-red-400">Falha na Sincronização</h4>
                <p className="text-sm font-medium text-red-600 dark:text-red-300">{error}</p>
             </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto h-full flex flex-col gap-6">
            
            {/* GESTÃO FINANCEIRA */}
            {activeMenu === 'gestao_financeira' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="grid grid-cols-1 gap-8 mb-8">
                  <div className="bg-slate-900 dark:bg-slate-950 p-8 md:p-10 rounded-3xl shadow-xl text-white relative overflow-hidden flex flex-col justify-between border border-slate-800">
                    <div className="absolute -right-10 -top-10 opacity-5"><TrendingUp className="w-64 h-64" /></div>
                    <div>
                      <h2 className="text-sm md:text-base font-bold text-blue-400 mb-2 z-10 tracking-widest uppercase">Penalidades vs Faturamento</h2>
                      <div className="flex flex-col mb-8 z-10">
                        <span className="text-5xl font-black leading-tight tracking-tight text-red-400">{formatCurrency(resumoMetrics.total)}</span>
                        <span className="text-sm text-slate-400 mt-2 font-medium bg-slate-800 self-start px-4 py-1.5 rounded-lg border border-slate-700">Total Descontado ({formatQtd(resumoMetrics.qtdTotal)} infrações)</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-4 text-sm z-10 pt-6 border-t border-slate-800">
                      <div className="flex justify-between items-center"><span className="text-blue-400 font-bold">PNRs</span> <span>{formatCurrency(pnrTot.valor)}</span></div>
                      <div className="flex justify-between items-center"><span className="text-orange-400 font-bold">Lost Packages</span> <span>{formatCurrency(lostTot.valor)}</span></div>
                      <div className="flex justify-between items-center"><span className="text-slate-400 font-bold">Not Visited</span> <span>{formatCurrency(nvTot.valor)}</span></div>
                      <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-700"><span className="text-emerald-400 font-bold">Faturamento Total</span> <span className="text-emerald-400 font-bold text-base">{formatCurrency(faturamentoTotalMetrics)}</span></div>
                      <div className="flex justify-between items-center"><span className="text-violet-400 font-bold">% de Representatividade</span> <span className="text-white font-bold">{faturamentoTotalMetrics > 0 ? ((resumoMetrics.total / faturamentoTotalMetrics) * 100).toFixed(2) + '%' : '0%'}</span></div>
                    </div>
                  </div>
                </div>
                <RunRateFinanceiroSection baseData={baseRunRateData} targetQuinzena={targetQuinzenaRunRate} prevStats={prevQuinzenaStats} />
                <div className="bg-white dark:bg-slate-800 p-6 md:p-10 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <Scale className="w-6 h-6 text-violet-600 dark:text-violet-400" />
                      <h2 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-white">
                        {selectedQuinzenaPareto ? `Detalhamento de Filiais Financeiro - ${selectedQuinzenaPareto}` : 'Evolução Financeira por Quinzena'}
                      </h2>
                    </div>
                    {selectedQuinzenaPareto && (
                      <button onClick={() => setSelectedQuinzenaPareto(null)} className="text-xs md:text-sm font-bold text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/30 px-3 py-1.5 rounded-lg hover:bg-violet-100 dark:hover:bg-violet-900/50 transition-colors">
                        ← Voltar para Visão Geral
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mb-8">
                    {selectedQuinzenaPareto ? 'Detalhamento do período selecionado.' : 'Clique sobre a barra de uma quinzena para abrir o detalhamento das filiais que compõem o resultado financeiro (Drill-down).'}
                  </p>
                  <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700 rounded-2xl p-4">
                    {!selectedQuinzenaPareto ? (
                      <NativeComboChart data={paretoQuinzenaData} labelKey="quinzena" heightClass="h-[400px]" onBarClick={(q) => setSelectedQuinzenaPareto(q)} />
                    ) : (
                      <NativeComboChart data={paretoFilialDrilldownData} labelKey="filial" heightClass="h-[400px]" />
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* DETALHE FINANCEIRO */}
            {activeMenu === 'detalhe_financeiro' && (
               <DetalheFinanceiroSection dadosFiltrados={dadosFiltrados} onExport={(options) => handleDownloadExcel('penalidades', options)} isExporting={exportingType === 'excel-penalidades'} />
            )}

            {/* COMPARATIVO BSC */}
            {activeMenu === 'comparativo_bsc' && (
               <ComparativoBscSection dataOp={operacionalSimulado} dataBsc={bscSimulado} />
            )}

            {/* GAPS OPERACIONAIS */}
            {activeMenu === 'gaps_operacionais' && (
               <GapsOperacionaisSection dataOp={operacionalSimulado} dataBsc={bscSimulado} />
            )}

            {/* GESTÃO OPERACIONAL E BSC (VISÃO UNIFICADA E DINÂMICA) */}
            {isOpOrBscView && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="grid grid-cols-1 gap-8 mb-8">
                  <div className="bg-slate-900 dark:bg-slate-950 p-8 md:p-10 rounded-3xl shadow-xl text-white relative overflow-hidden flex flex-col justify-between border border-slate-800">
                    <div className="absolute -right-10 -top-10 opacity-5"><IconOverview className="w-64 h-64" /></div>
                    <div>
                      <h2 className="text-sm md:text-base font-bold text-emerald-400 mb-2 z-10 tracking-widest uppercase">Overview {titlePrefix} (DS)</h2>
                      <div className="flex flex-col mb-8 z-10">
                        <span className={`text-5xl font-black leading-tight tracking-tight ${currentDsGlobalAtual >= 98.5 ? 'text-emerald-400' : (currentDsGlobalAtual >= 95 ? 'text-orange-400' : 'text-red-400')}`}>{formatDS(currentDsGlobalAtual)}</span>
                        <span className="text-sm text-slate-400 mt-2 font-medium bg-slate-800 self-start px-4 py-1.5 rounded-lg border border-slate-700">Delivery Success Atual (Meta: 98.5%)</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-4 text-sm z-10 pt-6 border-t border-slate-800">
                      <div className="flex justify-between items-center"><span className="text-slate-400 font-bold">Total de Pacotes</span> <span className="font-mono">{formatQtd(currentGlobalSaldo)} un.</span></div>
                      <div className="flex justify-between items-center"><span className="text-emerald-400 font-bold">Pacotes Entregues</span> <span className="font-mono text-emerald-400">{formatQtd(currentGlobalEntregues)} un.</span></div>
                      <div className="flex justify-between items-center"><span className="text-red-400 font-bold">Total de Insucessos</span> <span className="font-mono text-red-400">{formatQtd(currentGlobalSaldo - currentGlobalEntregues)} un.</span></div>
                      
                      {globalInsucessosArray.length > 0 && (
                         <div className="mt-2 pt-4 border-t border-slate-700/50">
                            <span className="text-slate-400 font-bold text-[10px] uppercase tracking-wider mb-3 block">Detalhamento dos Insucessos Globais</span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
                               {globalInsucessosArray.slice(0, 8).map(([motivo, qtd], idx) => (
                                  <div key={idx} className="flex justify-between items-center bg-slate-800/50 px-3 py-1.5 rounded-lg border border-slate-700/50">
                                     <span className="text-red-300 text-[10px] font-medium truncate pr-2" title={motivo}>{motivo}</span>
                                     <span className="font-mono text-red-400 text-[10px] font-bold">{formatQtd(qtd)}</span>
                                  </div>
                               ))}
                            </div>
                         </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <RunRateOperacionalSection baseData={currentOpRunRateData} targetQuinzena={targetQuinzenaRunRate} titlePrefix={titlePrefix} />

                <div className="bg-white dark:bg-slate-800 p-6 md:p-10 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <IconOverview className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                      <h2 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-white">
                        {selectedQuinzenaDS ? `Detalhamento de Filiais ${titlePrefix} - ${selectedQuinzenaDS}` : `Evolução de DS ${titlePrefix} por Quinzena`}
                      </h2>
                    </div>
                    {selectedQuinzenaDS && (
                      <button onClick={() => setSelectedQuinzenaDS(null)} className="text-xs md:text-sm font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-3 py-1.5 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors">
                        ← Voltar para Visão Geral
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mb-8">
                    {selectedQuinzenaDS ? 'Detalhamento operacional do período selecionado.' : 'Clique sobre a barra de uma quinzena para abrir o detalhamento das filiais (Drill-down).'}
                  </p>
                  
                  <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700 rounded-2xl p-4">
                    {!selectedQuinzenaDS ? (
                      <NativeDSChart data={dsQuinzenaData} labelKey="quinzena" heightClass="h-[400px]" onBarClick={(q) => setSelectedQuinzenaDS(q)} />
                    ) : (
                      <NativeDSChart data={dsFilialDrilldownData} labelKey="filial" heightClass="h-[400px]" />
                    )}
                  </div>
                </div>
              </div>
            )}
            
          </div>
        </div>
      </main>
    </div>
  );
}