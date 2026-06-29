let chatInput = ''; let setChatInput = () => {}; let chatMessages = []; let setChatMessages = () => {}; let isChatLoading = false; let setIsChatLoading = () => {}; let GEMINI_API_KEY = '';
import React, { useState, useCallback, useMemo, useEffect, Fragment, useRef, Suspense, lazy } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';

const Simulador = lazy(() => import('./Simulador'));
const DreAnaliseCusto = lazy(() => import('./DreAnaliseCusto'));
const DreCustoLeve = lazy(() => import('./DreCustoLeve'));
const DreViabilidade = lazy(() => import('./DreViabilidade'));
const DreGerencial = lazy(() => import('./DreGerencial'));
const DataImporter = lazy(() => import('./DataImporter'));
const ConfigFiliais = lazy(() => import('./ConfigFiliais'));
const ConfigTarifas = lazy(() => import('./ConfigTarifas'));
const PainelTreinamentos = lazy(() => import('./PainelTreinamentos'));
const PainelDisponibilidade = lazy(() => import('./PainelDisponibilidade'));
const GestaoUsuarios = lazy(() => import('./GestaoUsuarios'));
const Configuracoes = lazy(() => import('./Configuracoes'));
const GestaoMotoristas = lazy(() => import('./GestaoMotoristas'));
const DatabaseExplorer = lazy(() => import('./DatabaseExplorer'));
import { supabase, isInitialRecoveryUrl } from './supabase';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import { Skeleton } from './components/ui/Skeleton';
import { HeatmapPenalidades } from './components/ui/HeatmapPenalidades';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calculator,
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
  Box,
  Check,
  Filter,
  Target,
  FileSpreadsheet,
  ChevronRight,
  DollarSign,
  GitCompare,
  PieChart,
  Moon,
  Sun,
  X,
  ChevronDown,
  BadgeDollarSign,
  Brain,
  Send,
  Bot,
  ExternalLink,
  Menu,
  Sparkles,
  Database,
  UploadCloud,
  Settings,
  GraduationCap,
  Users,
  Eye,
  EyeOff
} from 'lucide-react';

// ============================================================================
// DADOS PRÉ-PROCESSADOS
// ============================================================================
const initialParsedData = [];
const initialFaturamentoData = [];
const initialOperacionalData = [];
const initialBscData = [];
const initialCustosData = [];

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

const formatDiaSemana = (val) => {
  if (!val) return 'N/A';
  const str = String(val).trim();
  if (!str || str === '-' || str.toLowerCase() === 'n/a') return 'N/A';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

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
  return true; // Senha desabilitada permanentemente
};

const parseNumber = (val) => {
  if (!val) return 0;
  return parseFloat(val.replace(/R\$\s?/g, '').replace(/"/g, '').replace(/\./g, '').replace(',', '.')) || 0;
};

const useSessionStorage = (key, initialValue) => {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.sessionStorage.getItem(key);
      return item ? JSON.parse(item) : (initialValue instanceof Function ? initialValue() : initialValue);
    } catch (error) {
      console.error(error);
      return initialValue instanceof Function ? initialValue() : initialValue;
    }
  });

  const setValue = (value) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.sessionStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(error);
    }
  };

  return [storedValue, setValue];
};

// ============================================================================
// COMPONENTES AUXILIARES E GRÁFICOS
// ============================================================================


const NativeComboChart = ({ data, labelKey = "name", onBarClick, heightClass = "h-[400px]", showFaturamento = true, isMarginChart = false, showLine = showFaturamento, tooltipSecondaryLabel, showMargemErro, legendSecondaryLabel, hideFaturamentoTooltip = false, showDSLine = false, dsKey = 'ds', dsLabel = 'DS', showTotalLine = false }) => {
  const [hoveredIndex, setHoveredIndex] = useState(null);
  useEffect(() => setHoveredIndex(null), [data]);
  const safeData = data ? data.filter(d => d !== undefined && d !== null) : [];
  if (safeData.length === 0) return <div className={`w-full ${heightClass} flex items-center justify-center text-slate-400`}>Nenhum dado disponível.</div>;

  const maxFat = Math.max(1, ...safeData.map(d => Math.max(showFaturamento ? (d.faturamento || 0) : 0, d.penalidades || 0, d.penAnterior || 0)));
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
      <div className="flex-1 flex relative mt-2">
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
          {yAxisSteps.map((step, idx) => {
            const valAtStep = isMarginChart ? (maxFat * (step / 4)) : (Math.pow(10, logMaxFat * (step / 4)) - 1);
            return (
              <div key={`y-axis-${idx}`} className="w-full border-t border-slate-100 flex items-center justify-between" style={{ height: step === 0 ? '0px' : 'auto', marginTop: step === 4 ? '-10px' : '0' }}>
                <span className="text-[10px] font-medium text-emerald-600 bg-transparent pr-2 -translate-y-1/2">{formatAxisVal(valAtStep)}</span>
                <span className="text-[10px] font-bold text-violet-500 bg-transparent pl-2 -translate-y-1/2">{showFaturamento ? `${((maxRep * (step / 4))).toFixed(1)}%` : ''}</span>
              </div>
            );
          })}
        </div>
        <div className="z-10 flex w-full h-full items-end justify-around gap-1 sm:gap-2 mx-10 sm:mx-12 border-b border-slate-300 relative">
          {showLine && (<svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible z-20" viewBox="0 0 100 100" preserveAspectRatio="none">
            <polyline points={safeData.map((d, i) => `${(i + 0.5) * (100 / safeData.length)},${100 - Math.min(Math.max(((d.representatividade || 0) / maxRep) * 100, 0), 100)}`).join(' ')} fill="none" stroke="#0ea5e9" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
          </svg>)}
          {showDSLine && (<svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible z-20" viewBox="0 0 100 100" preserveAspectRatio="none">
            <polyline points={safeData.map((d, i) => `${(i + 0.5) * (100 / safeData.length)},${100 - Math.min(Math.max((d[dsKey] || 0), 0), 100)}`).join(' ')} fill="none" stroke="#eab308" strokeWidth="2.5" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
          </svg>)}
          {showTotalLine && (<svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible z-20" viewBox="0 0 100 100" preserveAspectRatio="none">
            <polyline points={safeData.map((d, i) => {
              const valLine = d.penAnterior !== undefined ? Math.max(0, d.penAnterior) : (d.penalidades || 0);
              const yPct = isMarginChart ? (valLine / maxFat) * 100 : (log10(valLine) / logMaxFat) * 100;
              return `${(i + 0.5) * (100 / safeData.length)},${100 - Math.min(Math.max(yPct, 0), 100)}`;
            }).join(' ')} fill="none" stroke="#8b5cf6" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
          </svg>)}
          {showLine && hoveredIndex !== null && safeData[hoveredIndex] && showFaturamento && (
            <div className="absolute left-0 w-full border-t-2 border-dashed border-slate-800 opacity-80 z-10 pointer-events-none transition-all duration-200" style={{ bottom: `${Math.min(Math.max(((safeData[hoveredIndex].representatividade || 0) / maxRep) * 100, 0), 100)}%` }} />
          )}
          {safeData.map((d, i) => {
            const fatPct = showFaturamento ? (isMarginChart ? ((d.faturamento || 0) / maxFat) * 100 : (log10(d.faturamento || 0) / logMaxFat) * 100) : 0;
            const penPct = isMarginChart ? ((d.penalidades || 0) / maxFat) * 100 : (log10(d.penalidades || 0) / logMaxFat) * 100;
            const repPct = Math.min(Math.max(((d.representatividade || 0) / maxRep) * 100, 0), 100);
            const pnrRatio = d.penalidades > 0 ? ((d.pnr || 0) / d.penalidades) * 100 : 0;
            const lostRatio = d.penalidades > 0 ? ((d.lost || 0) / d.penalidades) * 100 : 0;
            const nvRatio = d.penalidades > 0 ? ((d.notVisited || 0) / d.penalidades) * 100 : 0;

            return (
              <div key={i} className="flex-1 flex flex-col justify-end h-full group relative max-w-[40px]" onMouseEnter={() => setHoveredIndex(i)} onMouseLeave={() => setHoveredIndex(null)} onClick={() => onBarClick && onBarClick(d[labelKey])} style={{ cursor: onBarClick ? 'pointer' : 'default' }}>
                <div className={`absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] sm:text-xs py-1.5 sm:py-2 px-2 sm:px-3 rounded-xl pointer-events-none whitespace-nowrap z-50 shadow-xl border border-slate-700 transition-all duration-200 ${hoveredIndex === i ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`}>
                  <div className="font-bold text-slate-300 mb-1.5 border-b border-slate-700 pb-1 w-full text-center">{d[labelKey]}</div>
                  {showFaturamento && !hideFaturamentoTooltip && <div className="flex justify-between gap-4 mb-0.5"><span className="text-emerald-400 font-bold">Faturamento</span><span className="font-mono font-bold">{formatCurrency(d.faturamento || 0)}</span></div>}
                  <div className={`flex justify-between gap-4 ${!isMarginChart ? 'border-b border-slate-700' : ''}`}><span className="text-slate-300 font-bold">{tooltipSecondaryLabel || (isMarginChart ? 'Total Pago' : 'Total Penalidades')}</span><span className="font-mono text-red-400 font-bold">{formatCurrency(d.penalidades || 0)}</span></div>
                  {isMarginChart && (showMargemErro !== false) && (
                    <div className="flex justify-between mb-1"><span className="text-orange-500 font-bold">Margem Erro (±)</span><span className="font-mono text-orange-500 font-bold">± {formatCurrency(d.margemErro || 0)}</span></div>
                  )}
                  {!isMarginChart && (
                    <>
                      <div className="flex justify-between mb-0.5 pl-2"><span className="text-blue-400 text-[10px]">└ PNRs</span><span className="font-mono text-[10px] text-white">{formatCurrency(d.pnr || 0)}</span></div>
                      <div className="flex justify-between mb-0.5 pl-2"><span className="text-orange-400 text-[10px]">└ Lost</span><span className="font-mono text-[10px] text-white">{formatCurrency(d.lost || 0)}</span></div>
                      <div className="flex justify-between mb-1.5 pl-2"><span className="text-slate-400 text-[10px]">└ Not Visited</span><span className="font-mono text-[10px] text-white">{formatCurrency(d.notVisited || 0)}</span></div>
                    </>
                  )}
                  {showTotalLine && d.penAnterior !== undefined && (
                    <div className="flex justify-between font-bold border-t border-slate-700 pt-2 mt-2">
                      <span className="text-violet-300">Q. Anterior</span>
                      <span className="text-violet-400">{formatCurrency(d.penAnterior)}</span>
                    </div>
                  )}
                  {showTotalLine && d.penAnterior !== undefined && (
                    <div className="flex justify-between font-bold border-slate-700 pt-1 mt-1">
                      <span className={d.penalidades > d.penAnterior ? "text-red-400" : "text-emerald-400"}>Evolução</span>
                      <span className={d.penalidades > d.penAnterior ? "text-red-400" : "text-emerald-400"}>
                        {d.penalidades > d.penAnterior ? '+' : ''}{d.penAnterior > 0 ? (((d.penalidades - d.penAnterior) / d.penAnterior) * 100).toFixed(1) : 0}%
                      </span>
                    </div>
                  )}
                  {showFaturamento && (
                    <div className="flex justify-between font-bold border-t border-slate-700 pt-2 mt-2">
                      <span className="text-violet-300">{isMarginChart ? 'Margem (%)' : 'Representatividade'}</span>
                      <span className="text-violet-400">{d.representatividade === Infinity || !d.representatividade ? 'S/ Fat.' : `${d.representatividade.toFixed(2)}%`}</span>
                    </div>
                  )}
                </div>
                <div className="w-full flex items-end justify-center h-full gap-[1px]">
                  {showFaturamento && <div className={`bg-emerald-600 ${isMarginChart ? 'w-1/2' : 'w-1/2'} rounded-t-sm hover:opacity-80 transition-opacity`} style={{ height: `${fatPct}%` }}></div>}
                  <div className={`${showFaturamento ? (isMarginChart ? 'w-1/2' : 'w-1/2') : 'w-3/4 max-w-[40px] mx-auto'} ${isMarginChart ? 'bg-rose-500' : ''} flex flex-col justify-end hover:opacity-80 transition-opacity rounded-t-sm`} style={{ height: `${penPct}%` }}>
                    {!isMarginChart && nvRatio > 0 && <div className={`bg-slate-400 w-full ${!showFaturamento && lostRatio === 0 && pnrRatio === 0 ? 'rounded-t-sm' : ''}`} style={{ height: `${nvRatio}%` }}></div>}
                    {!isMarginChart && lostRatio > 0 && <div className={`bg-orange-500 w-full ${!showFaturamento && pnrRatio === 0 ? 'rounded-t-sm' : ''}`} style={{ height: `${lostRatio}%` }}></div>}
                    {!isMarginChart && pnrRatio > 0 && <div className={`bg-blue-500 w-full ${!showFaturamento ? 'rounded-t-sm' : ''}`} style={{ height: `${pnrRatio}%` }}></div>}
                  </div>
                </div>
                {showFaturamento && (
                  <div className="absolute w-2 h-2 sm:w-2.5 sm:h-2.5 bg-slate-900 rounded-full border-2 border-violet-500 shadow-sm left-1/2 -translate-x-1/2 z-30 transition-all hover:scale-150 flex justify-center" style={{ bottom: `calc(${repPct}% - 4px)` }}>
                    <span className={`absolute ${i % 2 === 0 ? 'bottom-full mb-1' : 'top-full mt-1'} text-[9px] font-bold text-violet-300 bg-slate-800 px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap pointer-events-none`}>
                      {d[labelKey] && d[labelKey].length > 25 ? d[labelKey].substring(0, 25) + '...' : d[labelKey]}
                    </span>
                  </div>
                )}
                {showDSLine && (
                  <div className="absolute w-2 h-2 sm:w-2.5 sm:h-2.5 bg-slate-900 rounded-full border-2 border-yellow-500 shadow-sm left-1/2 -translate-x-1/2 z-30 transition-all hover:scale-150 flex justify-center" style={{ bottom: `calc(${Math.min(Math.max((d[dsKey] || 0), 0), 100)}% - 4px)` }}>
                    <span className={`absolute ${i % 2 === 0 ? 'bottom-full mb-1' : 'top-full mt-1'} text-[9px] font-bold text-yellow-300 bg-slate-800 px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap pointer-events-none`}>
                      {d[labelKey] && d[labelKey].length > 25 ? d[labelKey].substring(0, 25) + '...' : d[labelKey]}
                    </span>
                  </div>
                )}
                {showTotalLine && (
                  <div className="absolute w-2 h-2 sm:w-2.5 sm:h-2.5 bg-slate-900 rounded-full border-2 border-violet-500 shadow-sm left-1/2 -translate-x-1/2 z-30 transition-all hover:scale-150 flex justify-center" style={{ bottom: `calc(${Math.min(Math.max(d.penAnterior !== undefined ? (isMarginChart ? (Math.max(0, d.penAnterior) / maxFat) * 100 : (log10(Math.max(0, d.penAnterior)) / logMaxFat) * 100) : penPct, 0), 100)}% - 4px)` }}>
                    <span className={`absolute ${i % 2 === 0 ? 'bottom-full mb-1' : 'top-full mt-1'} text-[9px] font-bold text-violet-300 bg-slate-800 px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap pointer-events-none`}>
                      {d[labelKey] && d[labelKey].length > 25 ? d[labelKey].substring(0, 25) + '...' : d[labelKey]}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      <div className="absolute bottom-2 left-0 w-full flex justify-center gap-4 sm:gap-6 text-xs font-bold text-slate-400 flex-wrap">
        {showFaturamento && <span className="flex items-center gap-1.5"><div className="w-3 h-3 bg-emerald-500 rounded-sm"></div> Faturamento</span>}
        {showDSLine && <span className="flex items-center gap-1.5"><div className="w-3 h-3 bg-yellow-500 rounded-sm"></div> {dsLabel}</span>}
        {showTotalLine && <span className="flex items-center gap-1.5"><div className="w-3 h-3 bg-violet-500 rounded-sm"></div> Evolução</span>}
        <span className="flex items-center gap-1.5"><div className="w-3 h-3 bg-blue-500 rounded-sm"></div> {legendSecondaryLabel || (isMarginChart ? 'Pagamento de Agregados' : 'PNRs')}</span>
        {!isMarginChart && (
          <>
            <span className="flex items-center gap-1.5"><div className="w-3 h-3 bg-orange-500 rounded-sm"></div> Lost</span>
            <span className="flex items-center gap-1.5"><div className="w-3 h-3 bg-slate-400 rounded-sm"></div> Not Visited</span>
          </>
        )}
      </div>
    </div>
  );
};

const NativeDSChart = ({ data, labelKey = "name", onBarClick, heightClass = "h-[400px]", showLine = true }) => {
  const [hoveredIndex, setHoveredIndex] = useState(null);
  useEffect(() => setHoveredIndex(null), [data]);
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
      <div className="flex-1 flex relative mt-2">
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
          {yAxisSteps.map((step, idx) => {
            const valAtStep = Math.pow(10, logMaxVol * (step / 4)) - 1;
            return (
              <div key={`y-axis-${idx}`} className="w-full border-t border-slate-100 flex items-center justify-between" style={{ height: step === 0 ? '0px' : 'auto', marginTop: step === 4 ? '-10px' : '0' }}>
                <span className="text-[10px] font-medium text-slate-400 bg-transparent pr-2 -translate-y-1/2">{formatAxisVal(valAtStep)}</span>
                <span className="text-[10px] font-bold text-emerald-500 bg-transparent pl-2 -translate-y-1/2">{`${dsSteps[idx]}%`}</span>
              </div>
            );
          })}
        </div>
        <div className="z-10 flex w-full h-full items-end justify-around gap-1 sm:gap-2 mx-10 sm:mx-12 border-b border-slate-300 relative">
          <div className="absolute w-full border-t-[3px] border-dashed border-slate-600 z-10 pointer-events-none opacity-60 flex items-center" style={{ bottom: `${((98.5 - 80) / 20) * 100}%` }}>
            <span className="absolute left-0 -ml-12 text-[10px] font-black text-white bg-slate-700 px-1.5 py-0.5 rounded shadow-sm -translate-y-1/2">META</span>
          </div>
          {showLine && (<svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible z-20" viewBox="0 0 100 100" preserveAspectRatio="none">
            <polyline points={safeData.map((d, i) => `${(i + 0.5) * (100 / safeData.length)},${100 - Math.min(Math.max((((d.ds || 0) - 80) / 20) * 100, 0), 100)}`).join(' ')} fill="none" stroke="#0f766e" strokeWidth="4" vectorEffect="non-scaling-stroke" />
          </svg>)}
          {hoveredIndex !== null && safeData[hoveredIndex] && (
            <div className="absolute left-0 w-full border-t-2 border-dashed border-slate-600 opacity-80 z-10 pointer-events-none transition-all duration-200" style={{ bottom: `${Math.min(Math.max((((safeData[hoveredIndex].ds || 0) - 80) / 20) * 100, 0), 100)}%` }} />
          )}
          {safeData.map((d, i) => {
            const saldoPct = (log10(d.saldo || 0) / logMaxVol) * 85;
            const dsDisplayPct = Math.min(Math.max((((d.ds || 0) - 80) / 20) * 100, 0), 100);
            const entreguesRatio = d.saldo > 0 ? ((d.entregues || 0) / d.saldo) * 100 : 0;
            const insucessosTotais = Math.max(0, (d.saldo || 0) - (d.entregues || 0));
            const insucessosRatio = d.saldo > 0 ? (insucessosTotais / d.saldo) * 100 : 0;
            const dotColor = (d.ds || 0) >= 98.5 ? 'border-emerald-500' : ((d.ds || 0) >= 95 ? 'border-orange-500' : 'border-red-500');
            const insDetalhes = d.insucessosDetalhados || {};
            const sortedInsucessos = Object.entries(insDetalhes).sort((a, b) => b[1] - a[1]).filter(item => item[1] > 0);
            const topIns = sortedInsucessos.slice(0, 5);
            const outrosVal = sortedInsucessos.slice(5).reduce((acc, curr) => acc + curr[1], 0);

            return (
              <div key={`bar-ds-${i}`} className={`flex-1 flex flex-col justify-end h-full relative group max-w-[60px] ${onBarClick ? 'cursor-pointer' : ''}`} onClick={() => onBarClick && onBarClick(d[labelKey])} onMouseEnter={() => setHoveredIndex(i)} onMouseLeave={() => setHoveredIndex(null)}>
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 hidden group-hover:block z-50 w-64 bg-slate-800 text-white text-xs rounded-lg p-4 shadow-xl pointer-events-none">
                  <p className="font-bold border-b border-slate-700 pb-2 mb-3 text-center text-white">{d[labelKey]}</p>
                  <div className="flex justify-between mb-1.5"><span className="text-blue-400">Total Pacotes</span><span className="font-mono text-white">{formatQtd(d.saldo || 0)}</span></div>
                  <div className="flex justify-between mt-2 pt-2 border-t border-slate-700 mb-1"><span className="text-slate-300 font-bold">Operacional</span></div>
                  <div className="flex justify-between mb-0.5 pl-2"><span className="text-emerald-400 text-[10px]">↳ Entregues</span><span className="font-mono text-[10px] text-white">{formatQtd(d.entregues || 0)}</span></div>
                  <div className="flex justify-between mb-1.5 pl-2"><span className="text-red-400 text-[10px]">↳ Insucessos Totais</span><span className="font-mono text-[10px] font-bold text-red-200">{formatQtd(insucessosTotais)}</span></div>
                  {(topIns.length > 0) && (
                    <>
                      <div className="flex justify-between mt-2 pt-2 border-t border-slate-700 mb-1">
                        <span className="text-slate-400 font-bold text-[9px] uppercase tracking-wider">Detalhamento</span>
                      </div>
                      {topIns.map(([motivo, val], idx) => (
                        <div key={idx} className="flex justify-between mb-0.5 pl-2 gap-2">
                          <span className="text-red-300 text-[9px] truncate max-w-[140px]" title={motivo}>↳ {motivo}</span>
                          <span className="font-mono text-red-200 text-[9px]">{formatQtd(val)}</span>
                        </div>
                      ))}
                      {outrosVal > 0 && (
                        <div className="flex justify-between mb-0.5 pl-2 gap-2">
                          <span className="text-red-300 text-[9px] truncate max-w-[140px]">↳ Outros</span>
                          <span className="font-mono text-red-200 text-[9px]">{formatQtd(outrosVal)}</span>
                        </div>
                      )}
                    </>
                  )}
                  <div className="flex justify-between font-bold border-t border-slate-700 pt-2 mt-2">
                    <span className="text-emerald-300">DS %</span>
                    <span className={(d.ds || 0) >= 98.5 ? 'text-emerald-400' : ((d.ds || 0) >= 95 ? 'text-orange-400' : 'text-red-400')}>{formatDS(d.ds)}</span>
                  </div>
                </div>
                <div className="w-full flex items-end justify-center h-full gap-[1px]">
                  <div className="bg-blue-500 w-1/2 rounded-t-sm hover:opacity-80 transition-opacity" style={{ height: `${saldoPct}%` }}></div>
                  <div className="w-1/2 flex flex-col justify-end hover:opacity-80 transition-opacity" style={{ height: `${saldoPct}%` }}>
                    {insucessosRatio > 0 && <div className="bg-red-500 w-full" style={{ height: `${insucessosRatio}%` }}></div>}
                    {entreguesRatio > 0 && <div className="bg-emerald-500 w-full" style={{ height: `${entreguesRatio}%` }}></div>}
                  </div>
                </div>
                <div className={`absolute w-3 h-3 sm:w-3.5 sm:h-3.5 bg-slate-900 rounded-full border-[3px] shadow-md left-1/2 -translate-x-1/2 z-30 transition-all hover:scale-150 flex justify-center ${dotColor}`} style={{ bottom: `calc(${dsDisplayPct}% - 6px)` }}>
                  <span className="absolute bottom-full mb-1 text-[9px] font-bold text-slate-200 bg-slate-800 px-1 py-0.5 rounded shadow-sm border border-slate-700 pointer-events-none">{formatDS(d.ds)}</span>
                </div>
                <div className="absolute top-full mt-3 w-full text-center opacity-100 transition-opacity">
                  <p className="text-[9px] sm:text-[10px] text-slate-500 font-bold truncate">{d[labelKey]}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="absolute bottom-2 left-0 w-full flex justify-center gap-4 sm:gap-6 text-xs font-bold text-slate-400 flex-wrap">
        <span className="flex items-center gap-1.5"><div className="w-3 h-3 bg-blue-500 rounded-sm"></div> Total Pacotes</span>
        <span className="flex items-center gap-1.5"><div className="w-3 h-3 bg-emerald-500 rounded-sm"></div> Entregues</span>
        <span className="flex items-center gap-1.5"><div className="w-3 h-3 bg-red-500 rounded-sm"></div> Insucessos</span>
      </div>
    </div>
  );
};

const NativeRunRateChart = ({ diasOperados, totalDias, currentSaldo, currentEntregues, projSaldo, projEntregues, isClosed, heightClass = "h-[400px]" }) => {
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const currentInsucessos = Math.max(0, currentSaldo - currentEntregues);
  const projInsucessos = Math.max(0, projSaldo - projEntregues);
  const currentDS = currentSaldo > 0 ? (currentEntregues / currentSaldo) * 100 : 0;
  const projDS = projSaldo > 0 ? (projEntregues / projSaldo) * 100 : 0;

  const data = isClosed ? [
    { label: `Realizado (Consolidado)`, saldo: currentSaldo, entregues: currentEntregues, insucessos: currentInsucessos, ds: currentDS, isProj: false }
  ] : [
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
    <div className={`w-full ${heightClass} flex flex-col pt-24 pb-12 relative`}>
      <div className="flex-1 flex relative mt-2">
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
          {yAxisSteps.map((step, idx) => (
            <div key={`y-axis-${idx}`} className="w-full border-t border-slate-100 flex items-center justify-between" style={{ height: step === 0 ? '0px' : 'auto', marginTop: step === 4 ? '-10px' : '0' }}>
              <span className="text-[10px] font-medium text-slate-400 bg-transparent pr-2 -translate-y-1/2">{formatAxisVal(maxVol * (step / 4))}</span>
              <span className="text-[10px] font-bold text-emerald-500 bg-transparent pl-2 -translate-y-1/2">{`${dsSteps[idx]}%`}</span>
            </div>
          ))}
        </div>
        <div className="z-10 flex w-full h-full items-end justify-around gap-1 sm:gap-2 mx-10 sm:mx-12 border-b border-slate-300 relative">
          <div className="absolute w-full border-t-[3px] border-dashed border-slate-600 z-10 pointer-events-none opacity-60 flex items-center" style={{ bottom: `${dsToY(98.5)}%` }}>
            <span className="absolute left-0 -ml-12 text-[10px] font-black text-white bg-slate-700 px-1.5 py-0.5 rounded shadow-sm -translate-y-1/2">META</span>
          </div>
          {!isClosed && (
            <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible z-20" viewBox="0 0 100 100" preserveAspectRatio="none">
              <line x1="25" y1={100 - dsToY(currentDS)} x2="75" y2={100 - dsToY(projDS)} stroke="#0f766e" strokeWidth="4" strokeDasharray="6 4" vectorEffect="non-scaling-stroke" />
            </svg>
          )}
          {data.map((d, i) => {
            const saldoPct = (d.saldo / maxVol) * 100;
            const entreguesRatio = d.saldo > 0 ? (d.entregues / d.saldo) * 100 : 0;
            const insucessosRatio = d.saldo > 0 ? (d.insucessos / d.saldo) * 100 : 0;
            const dotColor = d.ds >= 98.5 ? 'border-emerald-500' : (d.ds >= 95 ? 'border-orange-500' : 'border-red-500');

            return (
              <div key={i} className="flex-1 flex flex-col justify-end h-full relative group max-w-[120px] cursor-pointer" onMouseEnter={() => setHoveredIndex(i)} onMouseLeave={() => setHoveredIndex(null)}>
                {hoveredIndex === i && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 z-50 w-56 bg-slate-800 text-white text-xs rounded-lg p-4 shadow-xl pointer-events-none">
                    <p className="font-bold border-b border-slate-700 pb-2 mb-3 text-center text-white">{d.label}</p>
                    <div className="flex justify-between mb-1.5"><span className="text-blue-400">Total Pacotes</span><span className="font-mono text-white">{formatQtd(d.saldo)}</span></div>
                    <div className="flex justify-between mb-0.5"><span className="text-emerald-400">↳ Entregues</span><span className="font-mono text-white">{formatQtd(d.entregues)}</span></div>
                    <div className="flex justify-between mb-3"><span className="text-red-400">↳ Insucessos</span><span className="font-mono text-white">{formatQtd(d.insucessos)}</span></div>
                    <div className="flex justify-between font-bold border-t border-slate-700 pt-2">
                      <span className="text-emerald-300">DS {d.isProj ? 'Projetado' : 'Consolidado'}</span>
                      <span className={d.ds >= 98.5 ? 'text-emerald-400' : (d.ds >= 95 ? 'text-orange-400' : 'text-red-400')}>{formatDS(d.ds)}</span>
                    </div>
                  </div>
                )}
                <div className={`w-full flex flex-col justify-end transition-opacity hover:opacity-100 ${d.isProj ? 'opacity-60' : 'opacity-90'}`} style={{ height: `${saldoPct}%` }}>
                  {insucessosRatio > 0 && <div className="bg-red-500 w-full" style={{ height: `${insucessosRatio}%` }}></div>}
                  {entreguesRatio > 0 && <div className="bg-emerald-500 w-full" style={{ height: `${entreguesRatio}%` }}></div>}
                </div>
                <div className={`absolute w-4 h-4 bg-slate-900 rounded-full border-[4px] shadow-lg left-1/2 -translate-x-1/2 z-30 transition-transform hover:scale-125 flex justify-center ${dotColor}`} style={{ bottom: `calc(${dsToY(d.ds)}% - 8px)` }}>
                  <span className="absolute bottom-full mb-1 text-[10px] font-bold text-slate-200 bg-slate-800 px-1.5 py-0.5 rounded shadow-sm border border-slate-700 pointer-events-none">{formatDS(d.ds)}</span>
                </div>
                <div className="absolute top-full mt-4 w-full text-center"><p className="text-[10px] sm:text-xs text-slate-400 font-bold truncate">{d.label}</p></div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// COMPONENTES DE SEÇÃO (PÁGINAS)
// ============================================================================
const RunRatePenalidadesSection = ({ baseData, targetQuinzena, prevStats, onDrilldown, isForecastMode, setIsForecastMode }) => {
  const [selectedOfensorFilial, setSelectedOfensorFilial] = useState(null);
  const { totalDias, diasOperados, isClosed } = useMemo(() => {
    if (!targetQuinzena || targetQuinzena === 'N/A') return { totalDias: 15, diasOperados: 15, isClosed: true };
    const year = parseInt(targetQuinzena.substring(0, 4));
    const month = parseInt(targetQuinzena.substring(4, 6)) - 1;
    const q = targetQuinzena.substring(6, 8);
    const now = new Date();
    const isCurrentMonth = (year === now.getFullYear() && month === now.getMonth());
    const isPastMonth = (year < now.getFullYear() || (year === now.getFullYear() && month < now.getMonth()));

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const total = q === 'Q1' ? 15 : (daysInMonth - 15);

    let operados = total;
    let closed = false;

    if (isPastMonth) {
      closed = true;
    } else if (isCurrentMonth) {
      if (q === 'Q1' && now.getDate() > 15) {
        closed = true;
      } else if (q === 'Q1' && now.getDate() <= 15) {
        operados = now.getDate() - 1;
      } else if (q === 'Q2' && now.getDate() > 15) {
        operados = (now.getDate() - 15) - 1;
      } else if (q === 'Q2' && now.getDate() <= 15) {
        operados = 1;
      }
    } else {
      operados = 1;
    }

    return { totalDias: total, diasOperados: Math.max(1, operados), isClosed: closed };
  }, [targetQuinzena]);

  const [selectedRegional, setSelectedRegional] = useState(null);

  if (!baseData || baseData.length === 0) {
    return (
      <div className="bg-slate-50 p-8 rounded-3xl shadow-sm border border-slate-200 mb-8 flex flex-col items-center justify-center text-center gap-3">
        <AlertCircle className="w-8 h-8 text-slate-400" />
        <p className="text-slate-500 font-medium max-w-md">Nenhuma informação de penalidade disponível para a quinzena <strong>{targetQuinzena}</strong>.</p>
      </div>
    );
  }

  const baseMult = isClosed ? 1 : (diasOperados > 0 ? totalDias / diasOperados : 1);
  const mult = isForecastMode ? baseMult : 1;

  let globalPen = 0, globalPnr = 0, globalLost = 0, globalNv = 0;
  baseData.forEach(d => { globalPen += d.penalidades; globalPnr += d.pnr; globalLost += d.lost; globalNv += d.notVisited; });

  const projFilialData = baseData.map(d => {
    const pPen = d.penalidades * mult;
    const forecastPenalidades = d.penalidades * baseMult;
    let penAnterior = undefined;
    if (prevStats && prevStats.filiaisMap) {
      const filialPassada = prevStats.filiaisMap[normalizeText(d.filial)];
      if (filialPassada) {
        penAnterior = filialPassada.pen || 0;
      }
    }
    return { ...d, faturamento: 0, penalidades: pPen, pnr: d.pnr * mult, lost: d.lost * mult, notVisited: d.notVisited * mult, representatividade: 0, penAnterior };
  }).sort((a, b) => b.penalidades - a.penalidades);

  const regionalMap = {};
  baseData.forEach(d => {
    const regName = d.regional && d.regional !== 'N/A' ? `Regional ${d.regional}` : 'Sem Regional';
    const supName = d.supervisor && d.supervisor !== 'N/A' ? d.supervisor : '';
    const r = supName && regName !== 'Sem Regional' ? `${regName} - ${supName}` : regName;
    if (!regionalMap[r]) regionalMap[r] = { name: r, faturamento: 0, penalidades: 0, pnr: 0, lost: 0, notVisited: 0, penAnterior: 0, hasPrev: false };
    regionalMap[r].penalidades += d.penalidades;
    regionalMap[r].pnr += d.pnr; regionalMap[r].lost += d.lost; regionalMap[r].notVisited += d.notVisited;

    if (prevStats && prevStats.filiaisMap) {
      const filialPassada = prevStats.filiaisMap[normalizeText(d.filial)];
      if (filialPassada) {
        regionalMap[r].penAnterior += (filialPassada.pen || 0);
        regionalMap[r].hasPrev = true;
      }
    }
  });

  const projRegionalData = Object.values(regionalMap).map(r => {
    const pPen = r.penalidades * mult;
    return { ...r, faturamento: 0, penalidades: pPen, pnr: r.pnr * mult, lost: r.lost * mult, notVisited: r.notVisited * mult, representatividade: 0, penAnterior: r.hasPrev ? r.penAnterior : undefined };
  }).sort((a, b) => b.penalidades - a.penalidades);

  const topOfensores = [...projFilialData].filter(d => d.penalidades > 0).sort((a, b) => b.penalidades - a.penalidades).slice(0, 6);
  const regionalDrilldownData = selectedRegional ? projFilialData.filter(d => {
    const regName = d.regional && d.regional !== 'N/A' ? `Regional ${d.regional}` : 'Sem Regional';
    const supName = d.supervisor && d.supervisor !== 'N/A' ? d.supervisor : '';
    return (supName && regName !== 'Sem Regional' ? `${regName} - ${supName}` : regName) === selectedRegional;
  }).sort((a, b) => b.penalidades - a.penalidades) : [];

  const projPenGlob = globalPen * mult;

  let penVar = 0;
  let topPiores = [];
  let topMelhores = [];

  if (prevStats) {
    penVar = prevStats.pen > 0 ? ((projPenGlob - prevStats.pen) / prevStats.pen) * 100 : 0;

    const todasFiliaisComparadas = [...projFilialData].map(filialAtual => {
      const filialPassada = prevStats.filiaisMap ? prevStats.filiaisMap[normalizeText(filialAtual.filial)] : null;
      if (!filialPassada) return null;

      const penAnterior = filialPassada.pen || 0;
      const penAtual = filialAtual.penalidades;

      return {
        ...filialAtual,
        varPen: penAtual - penAnterior,
        penAnterior: penAnterior,
        pnrAnterior: filialPassada.pnr || 0,
        lostAnterior: filialPassada.lost || 0,
        nvAnterior: filialPassada.nv || 0
      };
    }).filter(f => f !== null);

    topPiores = [...todasFiliaisComparadas].filter(f => f.varPen > 0).sort((a, b) => b.varPen - a.varPen).slice(0, 4);
    topMelhores = [...todasFiliaisComparadas].filter(f => f.varPen < 0).sort((a, b) => a.varPen - b.varPen).slice(0, 4);
  }

  const renderSetaOfensor = (atual, anterior) => {
    if (atual === anterior || !anterior) return <span className="text-slate-500 font-bold">-</span>;
    if (atual > anterior) return <ArrowUp className="w-3 h-3 text-red-500 inline" />;
    return <ArrowDown className="w-3 h-3 text-emerald-500 inline" />;
  };

  const getInsightTag = (variacao, isExpense = false) => {
    if (variacao === 0) return <span className="text-slate-400 font-bold">0.00%</span>;
    const isIncrease = variacao > 0;
    const isGood = isExpense ? !isIncrease : isIncrease;
    const colorClass = isGood ? 'text-emerald-500' : 'text-red-500';
    const Icon = isIncrease ? ArrowUp : ArrowDown;
    const bgClass = isGood ? 'bg-emerald-500/20' : 'bg-red-500/20';

    return (
      <span className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-black ${colorClass} ${bgClass}`}>
        <Icon className="w-3 h-3" />
        {isIncrease ? '+' : ''}{variacao.toFixed(1)}%
      </span>
    );
  };


  return (
    <div className="bg-white p-6 md:p-10 rounded-3xl shadow-sm border border-slate-200 mb-8 relative">
      {selectedOfensorFilial && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setSelectedOfensorFilial(null)}>
          <div className="bg-slate-900 w-full max-w-4xl max-h-[85vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-700 animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-800/50">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-3">
                  <AlertCircle className="w-6 h-6 text-red-400" />
                  Ofensores no Detalhe: <span className="text-blue-400">{selectedOfensorFilial}</span>
                </h3>
                <p className="text-slate-400 text-sm mt-1">Detalhamento dos motoristas e pacotes que impactaram a margem da filial.</p>
              </div>
              <button onClick={() => setSelectedOfensorFilial(null)} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-0 overflow-auto flex-1">
              {ofensoresModal.length === 0 ? (
                <div className="p-12 text-center text-slate-500 font-medium">Nenhum ofensor encontrado para esta filial nesta quinzena.</div>
              ) : (
                <table className="w-full text-left border-collapse min-w-[600px] text-xs">
                  <thead className="bg-slate-800/80 sticky top-0 z-10">
                    <tr className="text-[10px] uppercase tracking-wider text-slate-400">
                      <th className="py-3 px-4 font-bold border-b border-slate-700">Motorista</th>
                      <th className="py-3 px-4 font-bold border-b border-slate-700">Tipo</th>
                      <th className="py-3 px-4 font-bold border-b border-slate-700 text-right">Valor PNR (R$)</th>
                      <th className="py-3 px-4 font-bold border-b border-slate-700 text-right">Valor Lost (R$)</th>
                      <th className="py-3 px-4 font-bold border-b border-slate-700 text-right">Valor NV (R$)</th>
                      <th className="py-3 px-4 font-bold border-b border-slate-700 text-right text-red-400 bg-red-900/10">Total (R$)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {ofensoresModal.map((c, i) => (
                      <tr key={i} className="hover:bg-slate-800/50 transition-colors">
                        <td className="py-3 px-4 text-slate-300 font-medium">{c.motorista || 'N/A'}</td>
                        <td className="py-3 px-4 text-slate-400 font-semibold">{c.tipo || '-'}</td>
                        <td className="py-3 px-4 text-right text-slate-400">{c.pnr > 0 ? formatCurrency(c.pnr) : '-'}</td>
                        <td className="py-3 px-4 text-right text-slate-400">{c.lost > 0 ? formatCurrency(c.lost) : '-'}</td>
                        <td className="py-3 px-4 text-right text-slate-400">{c.notVisited > 0 ? formatCurrency(c.notVisited) : '-'}</td>
                        <td className="py-3 px-4 text-right font-bold text-red-400 bg-red-900/10">{formatCurrency(c.penalidades)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-900 flex justify-end">
              <button onClick={() => setSelectedOfensorFilial(null)} className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-sm font-bold rounded-xl transition-colors shadow-sm">
                Fechar Detalhamento
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-4">
        <div className="flex items-center gap-3">
          <Activity className="w-6 h-6 text-blue-500" />
          <div><h2 className="text-xl md:text-2xl font-bold text-slate-800">{isClosed ? 'Resultado de Penalidades (Consolidado)' : 'Desempenho de Penalidades'} - {targetQuinzena}</h2></div>
        {isClosed ? null : (
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl ml-4 shadow-sm cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => setIsForecastMode(!isForecastMode)}>
            <div className={`w-10 h-5 rounded-full relative transition-colors ${isForecastMode ? 'bg-orange-500' : 'bg-slate-300'}`}>
              <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${isForecastMode ? 'translate-x-5' : 'translate-x-0'}`} />
            </div>
            <span className="text-xs font-bold text-slate-600 uppercase">Modo Previsão</span>
          </div>
        )}

        </div>
        <div className="flex flex-col sm:flex-row gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 w-full lg:w-auto">
          {isClosed ? (
            <div className="flex flex-col gap-1 items-center justify-center px-4">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Status do Período</span>
              <span className="text-sm font-black text-slate-600 bg-slate-200 px-4 py-1.5 rounded-full border border-slate-300 shadow-sm">Fechado ({totalDias} dias)</span>
            </div>
          ) : (
            <div className="flex flex-col gap-1 items-center justify-center px-4">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Cálculo Automático</span>
              <span className="text-sm font-black text-blue-600 bg-blue-100/50 px-4 py-1.5 rounded-full border border-blue-200 shadow-sm">{diasOperados} / {totalDias} Dias Operados</span>
            </div>
          )}
        </div>
      </div>

      <div className="mb-8">
        <div className="bg-red-50 border border-red-100 p-5 rounded-2xl flex flex-col justify-center items-center text-center max-w-sm mx-auto">
          <span className="text-xs font-bold text-red-600 uppercase mb-1">Total de Penalidades {isClosed ? 'Finais' : 'Projetadas'}</span>
          <span className="text-3xl font-black text-red-600 mb-1">{formatCurrency(globalPen * mult)}</span>
        </div>
      </div>

      {topOfensores.length > 0 && (
        <div className="mb-8 p-6 bg-red-50/40 border border-red-100 rounded-2xl">
          <h3 className="text-sm font-black text-red-500 mb-4 uppercase tracking-wider flex items-center gap-2"><AlertCircle className="w-5 h-5" /> Top 6 Filiais com Maior Volume de Descontos</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {topOfensores.map((filial, idx) => (
              <div key={idx} className="bg-white p-5 rounded-xl border border-red-100 shadow-sm flex flex-col relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-red-500"></div>
                <div className="flex justify-between items-start mb-2"><div><span className="font-black text-slate-800 text-lg block">{filial.filial}</span><span className="text-xs font-bold text-slate-500">{filial.regional && filial.regional !== 'N/A' ? `Regional ${filial.regional}` : 'Sem Regional'}</span></div><span className="text-xs font-black text-white bg-red-500 px-2 py-0.5 rounded-full shadow-sm">#{idx + 1}</span></div>
                <div className="flex justify-between items-end mt-auto pt-3 border-t border-slate-100">
                  <div className="flex flex-col"><span className="text-[10px] text-slate-400 uppercase font-bold">Desconto PNR</span><span className="text-lg font-black text-blue-500">{formatCurrency(filial.pnr)}</span></div>
                  <div className="flex flex-col items-end"><span className="text-[10px] text-slate-400 uppercase font-bold">{isClosed ? 'Total Descontado' : 'Projeção (Total)'}</span><span className="text-lg font-black text-red-500">{formatCurrency(filial.penalidades)}</span></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col">
          <div className="flex items-center justify-between mb-4 px-2 pt-2"><h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">{selectedRegional ? `Filiais: ${selectedRegional}` : `Penalidades por Regional`}</h3>{selectedRegional && (<button onClick={() => setSelectedRegional(null)} className="text-[10px] sm:text-xs font-bold text-blue-500 bg-blue-50/50 px-2 py-1 rounded hover:bg-blue-100 transition-colors">← Voltar</button>)}</div>
          {!selectedRegional ? <NativeComboChart data={projRegionalData} labelKey="name" heightClass="h-[350px]" onBarClick={(r) => setSelectedRegional(r)} showFaturamento={false} showTotalLine={true} /> : <NativeComboChart data={regionalDrilldownData} labelKey="filial" heightClass="h-[350px]" showFaturamento={false} showTotalLine={true} />}
        </div>
        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col"><h3 className="text-sm font-bold text-slate-500 text-center mb-2 pt-2 uppercase tracking-wider">Penalidades por Filial</h3><NativeComboChart data={projFilialData.slice(0, 15)} labelKey="filial" heightClass="h-[350px]" showFaturamento={false} showTotalLine={true} /></div>
      </div>

      {prevStats && (
        <div className="mt-8 bg-slate-900 rounded-3xl p-6 md:p-8 text-slate-300 shadow-xl border border-slate-800 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <Scale className="w-32 h-32 text-white" />
          </div>
          <h3 className="text-white font-bold text-xl md:text-2xl mb-6 flex items-center gap-3 relative z-10">
            <Activity className="w-6 h-6 text-blue-400" />
            Quadro Comparativo de Custos: {isClosed ? 'Resultado Final' : 'Tendência Atual'} vs. {prevStats.name}
          </h3>

          <ul className="space-y-6 relative z-10">
            <li className="flex items-start gap-4">
              <div className="mt-1.5 w-3 h-3 bg-red-500 rounded-full shrink-0 shadow-[0_0_10px_rgba(239,68,68,0.5)]"></div>
              <div>
                <p className="text-base font-medium leading-relaxed">
                  <strong className="text-white tracking-wide">Volume Total Descontado:</strong> {isClosed ? 'O total apurado foi de' : 'A tendência aponta para'} <strong className="text-red-400">{formatCurrency(projPenGlob)}</strong> de descontos (PNR, Lost e NV), configurando uma variação de {getInsightTag(penVar, true)} ante a última quinzena ({formatCurrency(prevStats.pen)}).
                </p>
              </div>
            </li>
          </ul>

          {(topPiores.length > 0 || topMelhores.length > 0) && (
            <div className="mt-8 pt-8 border-t border-slate-800 relative z-10">
              {topPiores.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-bold text-red-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" /> Alertas: Maior Aumento de Custos (R$)
                  </h4>
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-4">
                    {topPiores.map((filial, idx) => (
                      <div key={`pior-${idx}`} onClick={() => onDrilldown && onDrilldown(filial.filial)} className="cursor-pointer bg-slate-800/80 border border-slate-700 p-4 rounded-xl flex flex-col hover:bg-slate-700 transition-colors shadow-sm">
                        <div className="flex justify-between items-start mb-3 border-b border-slate-700/50 pb-2">
                          <span className="font-bold text-white text-base truncate pr-2">{filial.filial}</span>
                          <div className="flex flex-col items-end">
                            <span className="text-xs font-black px-2 py-0.5 rounded bg-red-500/20 text-red-400">
                              +{formatCurrency(filial.varPen)}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col gap-1.5 text-[10px]">
                          <div className="flex justify-between items-center text-blue-400">
                            <span>PNR</span>
                            <div className="flex items-center gap-1.5">
                              <span>{renderSetaOfensor(filial.pnr, filial.pnrAnterior)}</span>
                              <span className="font-mono">{formatCurrency(filial.pnr)}</span>
                            </div>
                          </div>
                          <div className="flex justify-between items-center text-orange-400">
                            <span>Lost</span>
                            <div className="flex items-center gap-1.5">
                              <span>{renderSetaOfensor(filial.lost, filial.lostAnterior)}</span>
                              <span className="font-mono">{formatCurrency(filial.lost)}</span>
                            </div>
                          </div>
                          <div className="flex justify-between items-center text-slate-400">
                            <span>NV</span>
                            <div className="flex items-center gap-1.5">
                              <span>{renderSetaOfensor(filial.notVisited, filial.nvAnterior)}</span>
                              <span className="font-mono">{formatCurrency(filial.notVisited)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {topMelhores.length > 0 && (
                <div>
                  <h4 className="text-sm font-bold text-emerald-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <TrendingDown className="w-4 h-4" /> Destaques: Maiores Reduções de Custo (R$)
                  </h4>
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-4">
                    {topMelhores.map((filial, idx) => (
                      <div key={`melhor-${idx}`} onClick={() => onDrilldown && onDrilldown(filial.filial)} className="cursor-pointer bg-slate-800/80 border border-slate-700 p-4 rounded-xl flex flex-col hover:bg-slate-700 transition-colors shadow-sm">
                        <div className="flex justify-between items-start mb-3 border-b border-slate-700/50 pb-2">
                          <span className="font-bold text-white text-base truncate pr-2">{filial.filial}</span>
                          <div className="flex flex-col items-end">
                            <span className="text-xs font-black px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                              {formatCurrency(filial.varPen)}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col gap-1.5 text-[10px]">
                          <div className="flex justify-between items-center text-blue-400">
                            <span>PNR</span>
                            <div className="flex items-center gap-1.5">
                              <span>{renderSetaOfensor(filial.pnr, filial.pnrAnterior)}</span>
                              <span className="font-mono">{formatCurrency(filial.pnr)}</span>
                            </div>
                          </div>
                          <div className="flex justify-between items-center text-orange-400">
                            <span>Lost</span>
                            <div className="flex items-center gap-1.5">
                              <span>{renderSetaOfensor(filial.lost, filial.lostAnterior)}</span>
                              <span className="font-mono">{formatCurrency(filial.lost)}</span>
                            </div>
                          </div>
                          <div className="flex justify-between items-center text-slate-400">
                            <span>NV</span>
                            <div className="flex items-center gap-1.5">
                              <span>{renderSetaOfensor(filial.notVisited, filial.nvAnterior)}</span>
                              <span className="font-mono">{formatCurrency(filial.notVisited)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const RunRateFinanceiroSection = ({ baseData, targetQuinzena, prevStats, onDrilldown, isForecastMode, setIsForecastMode }) => {
  const [selectedOfensorFilial, setSelectedOfensorFilial] = useState(null);
  const { totalDias, diasOperados, isClosed } = useMemo(() => {
    if (!targetQuinzena || targetQuinzena === 'N/A') return { totalDias: 15, diasOperados: 15, isClosed: true };
    const year = parseInt(targetQuinzena.substring(0, 4));
    const month = parseInt(targetQuinzena.substring(4, 6)) - 1;
    const q = targetQuinzena.substring(6, 8);
    const now = new Date();
    const isCurrentMonth = (year === now.getFullYear() && month === now.getMonth());
    const isPastMonth = (year < now.getFullYear() || (year === now.getFullYear() && month < now.getMonth()));

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const total = q === 'Q1' ? 15 : (daysInMonth - 15);

    let operados = total;
    let closed = false;

    if (isPastMonth) {
      closed = true;
    } else if (isCurrentMonth) {
      if (q === 'Q1' && now.getDate() > 15) {
        closed = true;
      } else if (q === 'Q1' && now.getDate() <= 15) {
        operados = now.getDate() - 1;
      } else if (q === 'Q2' && now.getDate() > 15) {
        operados = (now.getDate() - 15) - 1;
      } else if (q === 'Q2' && now.getDate() <= 15) {
        operados = 1;
      }
    } else {
      operados = 1;
    }

    return { totalDias: total, diasOperados: Math.max(1, operados), isClosed: closed };
  }, [targetQuinzena]);

  const [selectedRegional, setSelectedRegional] = useState(null);

  if (!baseData || baseData.length === 0) {
    return (
      <div className="bg-slate-50 p-8 rounded-3xl shadow-sm border border-slate-200 mb-8 flex flex-col items-center justify-center text-center gap-3">
        <AlertCircle className="w-8 h-8 text-slate-400" />
        <p className="text-slate-500 font-medium max-w-md">Nenhuma informação financeira disponível para a quinzena <strong>{targetQuinzena}</strong>.</p>
      </div>
    );
  }

  const baseMult = isClosed ? 1 : (diasOperados > 0 ? totalDias / diasOperados : 1);
  const mult = isForecastMode ? baseMult : 1;

  let globalFat = 0, globalPen = 0, globalPnr = 0, globalLost = 0, globalNv = 0;
  baseData.forEach(d => { globalFat += d.faturamento; globalPen += d.penalidades; globalPnr += d.pnr; globalLost += d.lost; globalNv += d.notVisited; });

  const projFilialData = baseData.map(d => {
    const pFat = d.faturamento * mult;
    const pPen = d.penalidades * mult;
    const forecastFaturamento = d.faturamento * baseMult;
    const forecastPenalidades = d.penalidades * baseMult;
    return { ...d, faturamento: pFat, penalidades: pPen, forecastFaturamento, forecastPenalidades, pnr: d.pnr * mult, lost: d.lost * mult, notVisited: d.notVisited * mult, representatividade: pFat > 0 ? (pPen / pFat) * 100 : (pPen > 0 ? Infinity : 0) };
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
    const forecastFaturamento = r.faturamento * baseMult;
    const forecastPenalidades = r.penalidades * baseMult;
    return { ...r, faturamento: pFat, penalidades: pPen, forecastFaturamento, forecastPenalidades, pnr: r.pnr * mult, lost: r.lost * mult, notVisited: r.notVisited * mult, representatividade: pFat > 0 ? (pPen / pFat) * 100 : (pPen > 0 ? Infinity : 0) };
  }).sort((a, b) => b.penalidades - a.penalidades);

  const topOfensores = [...projFilialData].filter(d => d.penalidades > 0).sort((a, b) => (b.representatividade === Infinity ? 999999 : b.representatividade) - (a.representatividade === Infinity ? 999999 : a.representatividade)).slice(0, 6);
  const regionalDrilldownData = selectedRegional ? projFilialData.filter(d => {
    const regName = d.regional && d.regional !== 'N/A' ? `Regional ${d.regional}` : 'Sem Regional';
    const supName = d.supervisor && d.supervisor !== 'N/A' ? d.supervisor : '';
    return (supName && regName !== 'Sem Regional' ? `${regName} - ${supName}` : regName) === selectedRegional;
  }).sort((a, b) => (b.representatividade === Infinity ? 999999 : b.representatividade) - (a.representatividade === Infinity ? 999999 : a.representatividade)) : [];

  const getInsightTag = (variacao, isExpense = false) => {
    if (variacao === 0) return <span className="text-slate-400 font-bold">0.00%</span>;
    const isIncrease = variacao > 0;
    const isGood = isExpense ? !isIncrease : isIncrease;
    const colorClass = isGood ? 'text-emerald-500' : 'text-red-500';
    const Icon = isIncrease ? ArrowUp : ArrowDown;
    const bgClass = isGood ? 'bg-emerald-500/20' : 'bg-red-500/20';

    return (
      <span className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-black ${colorClass} ${bgClass}`}>
        <Icon className="w-3 h-3" />
        {isIncrease ? '+' : ''}{variacao.toFixed(1)}%
      </span>
    );
  };

  const projFatGlob = globalFat * mult;
  const projPenGlob = globalPen * mult;

  let fatVar = 0, penVar = 0, repVar = 0, repPrev = 0, repProj = 0;
  let topPiores = [];
  let topMelhores = [];

  if (prevStats) {
    fatVar = prevStats.fat > 0 ? ((projFatGlob - prevStats.fat) / prevStats.fat) * 100 : 0;
    penVar = prevStats.pen > 0 ? ((projPenGlob - prevStats.pen) / prevStats.pen) * 100 : 0;
    repPrev = prevStats.fat > 0 ? (prevStats.pen / prevStats.fat) * 100 : 0;
    repProj = projFatGlob > 0 ? (projPenGlob / projFatGlob) * 100 : 0;
    repVar = repProj - repPrev;

    const todasFiliaisComparadas = [...projFilialData].map(filialAtual => {
      const filialPassada = prevStats.filiaisMap ? prevStats.filiaisMap[normalizeText(filialAtual.filial)] : null;
      if (!filialPassada) return null;

      const repAnterior = filialPassada.fat > 0 ? (filialPassada.pen / filialPassada.fat) * 100 : 0;
      const repAtual = filialAtual.representatividade === Infinity ? 0 : filialAtual.representatividade;

      return {
        ...filialAtual,
        varRep: repAtual - repAnterior,
        pnrAnterior: filialPassada.pnr || 0,
        lostAnterior: filialPassada.lost || 0,
        nvAnterior: filialPassada.nv || 0,
        pnrQtdAnterior: filialPassada.pnrQtd || 0,
        lostQtdAnterior: filialPassada.lostQtd || 0,
        nvQtdAnterior: filialPassada.nvQtd || 0
      };
    }).filter(f => f !== null);

    topPiores = [...todasFiliaisComparadas].filter(f => f.varRep > 0).sort((a, b) => b.varRep - a.varRep).slice(0, 4);
    topMelhores = [...todasFiliaisComparadas].filter(f => f.varRep < 0).sort((a, b) => a.varRep - b.varRep).slice(0, 4);
  }

  const renderSetaOfensor = (atual, anterior) => {
    if (atual === anterior || !anterior) return <span className="text-slate-500 font-bold">-</span>;
    if (atual > anterior) return <ArrowUp className="w-3 h-3 text-red-500 inline" />;
    return <ArrowDown className="w-3 h-3 text-emerald-500 inline" />;
  };

  return (
    <div className="bg-white p-6 md:p-10 rounded-3xl shadow-sm border border-slate-200 mb-8">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-4">
        <div className="flex items-center gap-3">
          <Activity className="w-6 h-6 text-blue-500" />
          <div><h2 className="text-xl md:text-2xl font-bold text-slate-800">{isClosed ? 'Resultado Financeiro (Consolidado)' : 'Desempenho Financeiro'} - {targetQuinzena}</h2></div>
        {isClosed ? null : (
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl ml-4 shadow-sm cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => setIsForecastMode(!isForecastMode)}>
            <div className={`w-10 h-5 rounded-full relative transition-colors ${isForecastMode ? 'bg-orange-500' : 'bg-slate-300'}`}>
              <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${isForecastMode ? 'translate-x-5' : 'translate-x-0'}`} />
            </div>
            <span className="text-xs font-bold text-slate-600 uppercase">Modo Previsão</span>
          </div>
        )}

        </div>
        <div className="flex flex-col sm:flex-row gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 w-full lg:w-auto">
          {isClosed ? (
            <div className="flex flex-col gap-1 items-center justify-center px-4">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Status do Período</span>
              <span className="text-sm font-black text-slate-600 bg-slate-200 px-4 py-1.5 rounded-full border border-slate-300 shadow-sm">Fechado ({totalDias} dias)</span>
            </div>
          ) : (
            <div className="flex flex-col gap-1 items-center justify-center px-4">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Cálculo Automático</span>
              <span className="text-sm font-black text-blue-600 bg-blue-100/50 px-4 py-1.5 rounded-full border border-blue-200 shadow-sm">{diasOperados} / {totalDias} Dias Operados</span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-emerald-50 border border-emerald-100 p-5 rounded-2xl flex flex-col justify-center items-center"><span className="text-xs font-bold text-emerald-600 uppercase mb-1">Faturamento {isClosed ? 'Final' : 'Projetado'}</span><span className="text-2xl font-black text-emerald-600">{formatCurrency(globalFat * mult)}</span></div>
        <div className="bg-red-50 border border-red-100 p-5 rounded-2xl flex flex-col justify-center items-center text-center"><span className="text-xs font-bold text-red-600 uppercase mb-1">Penalidades {isClosed ? 'Finais' : 'Projetadas'}</span><span className="text-2xl font-black text-red-600 mb-1">{formatCurrency(globalPen * mult)}</span></div>
        <div className="bg-violet-50 border border-violet-100 p-5 rounded-2xl flex flex-col justify-center items-center"><span className="text-xs font-bold text-violet-600 uppercase mb-1">Representatividade {isClosed ? 'Final' : 'Estimada'}</span><span className="text-3xl font-black text-violet-600">{globalFat > 0 ? (((globalPen * mult) / (globalFat * mult)) * 100).toFixed(2) : 0}%</span></div>
      </div>

      {topOfensores.length > 0 && (
        <div className="mb-8 p-6 bg-red-50/40 border border-red-100 rounded-2xl">
          <h3 className="text-sm font-black text-red-500 mb-4 uppercase tracking-wider flex items-center gap-2"><AlertCircle className="w-5 h-5" /> Alerta de Risco Financeiro: Top 6 Maiores Impactos na Margem</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {topOfensores.map((filial, idx) => (
              <div key={idx} className="bg-white p-5 rounded-xl border border-red-100 shadow-sm flex flex-col relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-red-500"></div>
                <div className="flex justify-between items-start mb-2"><div><span className="font-black text-slate-800 text-lg block">{filial.filial}</span><span className="text-xs font-bold text-slate-500">{filial.regional && filial.regional !== 'N/A' ? `Regional ${filial.regional}` : 'Sem Regional'}</span></div><span className="text-xs font-black text-white bg-red-500 px-2 py-0.5 rounded-full shadow-sm">#{idx + 1}</span></div>
                <div className="flex justify-between items-end mt-auto pt-3 border-t border-slate-100">
                  <div className="flex flex-col"><span className="text-[10px] text-slate-400 uppercase font-bold">Margem Comprometida</span><span className="text-lg font-black text-red-500">{filial.representatividade === Infinity ? 'N/A' : `${filial.representatividade.toFixed(1)}%`}</span></div>
                  <div className="flex flex-col items-end"><span className="text-[10px] text-slate-400 uppercase font-bold">{isClosed ? 'Volume Final' : 'Projeção (Total)'}</span><span className="text-sm font-black text-violet-500">{formatCurrency(filial.penalidades)}</span></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col">
          <div className="flex items-center justify-between mb-4 px-2 pt-2"><h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">{selectedRegional ? `Filiais: ${selectedRegional}` : `Resultado por Regional`}</h3>{selectedRegional && (<button onClick={() => setSelectedRegional(null)} className="text-[10px] sm:text-xs font-bold text-blue-500 bg-blue-50/50 px-2 py-1 rounded hover:bg-blue-100 transition-colors">← Voltar</button>)}</div>
          {!selectedRegional ? <NativeComboChart data={projRegionalData} labelKey="name" heightClass="h-[350px]" onBarClick={(r) => setSelectedRegional(r)} /> : <NativeComboChart data={regionalDrilldownData} labelKey="filial" heightClass="h-[350px]" />}
        </div>
        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col"><h3 className="text-sm font-bold text-slate-500 text-center mb-2 pt-2 uppercase tracking-wider">Descontos por Filial</h3><NativeComboChart data={projFilialData.slice(0, 15)} labelKey="filial" heightClass="h-[350px]" /></div>
      </div>

      {prevStats && (
        <div className="mt-8 bg-slate-900 rounded-3xl p-6 md:p-8 text-slate-300 shadow-xl border border-slate-800 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <Scale className="w-32 h-32 text-white" />
          </div>
          <h3 className="text-white font-bold text-xl md:text-2xl mb-6 flex items-center gap-3 relative z-10">
            <Activity className="w-6 h-6 text-blue-400" />
            Quadro Comparativo: {isClosed ? 'Resultado Final' : 'Tendência Atual'} vs. {prevStats.name}
          </h3>

          <ul className="space-y-6 relative z-10">
            <li className="flex items-start gap-4">
              <div className="mt-1.5 w-3 h-3 bg-emerald-500 rounded-full shrink-0 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
              <div>
                <p className="text-base font-medium leading-relaxed">
                  <strong className="text-white tracking-wide">Faturamento:</strong> O {isClosed ? 'fechamento aponta' : 'projeção indica fechamento'} em <strong className="text-emerald-400">{formatCurrency(projFatGlob)}</strong>, o que representa uma variação de {getInsightTag(fatVar, false)} em relação à quinzena anterior ({formatCurrency(prevStats.fat)}).
                </p>
              </div>
            </li>
            <li className="flex items-start gap-4">
              <div className="mt-1.5 w-3 h-3 bg-red-500 rounded-full shrink-0 shadow-[0_0_10px_rgba(239,68,68,0.5)]"></div>
              <div>
                <p className="text-base font-medium leading-relaxed">
                  <strong className="text-white tracking-wide">Penalidades Globais:</strong> {isClosed ? 'O total apurado foi de' : 'A tendência aponta para'} <strong className="text-red-400">{formatCurrency(projPenGlob)}</strong> de descontos, configurando uma variação de {getInsightTag(penVar, true)} ante a última quinzena ({formatCurrency(prevStats.pen)}).
                </p>
              </div>
            </li>
            <li className="flex items-start gap-4">
              <div className="mt-1.5 w-3 h-3 bg-violet-500 rounded-full shrink-0 shadow-[0_0_10px_rgba(139,92,246,0.5)]"></div>
              <div>
                <p className="text-base font-medium leading-relaxed">
                  <strong className="text-white tracking-wide">Margem (Representatividade):</strong> A proporção de penalidades sobre o faturamento {isClosed ? 'fechou' : 'deve fechar'} em <strong className="text-violet-400">{repProj.toFixed(2)}%</strong>. Na quinzena passada, esse indicador foi de {repPrev.toFixed(2)}% (diferença de <span className="font-bold text-white">{repVar > 0 ? '+' : ''}{repVar.toFixed(2)} p.p.</span>).
                </p>
              </div>
            </li>
          </ul>

          {(topPiores.length > 0 || topMelhores.length > 0) && (
            <div className="mt-8 pt-8 border-t border-slate-800 relative z-10">

              {topPiores.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-bold text-red-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" /> Alertas: Aumento de Penalidades
                  </h4>
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-4">
                    {topPiores.map((filial, idx) => (
                      <div key={`pior-${idx}`} onClick={() => onDrilldown && onDrilldown(filial.filial)} className="cursor-pointer bg-slate-800/80 border border-slate-700 p-4 rounded-xl flex flex-col hover:bg-slate-700 transition-colors shadow-sm">
                        <div className="flex justify-between items-start mb-3 border-b border-slate-700/50 pb-2">
                          <span className="font-bold text-white text-base truncate pr-2">{filial.filial}</span>
                          <div className="flex flex-col items-end">
                            <span className="text-xs font-black px-2 py-0.5 rounded bg-red-500/20 text-red-400">
                              +{filial.varRep.toFixed(2)} p.p.
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col gap-1.5 text-[10px]">
                          <div className="flex justify-between items-center text-blue-400">
                            <span>PNR</span>
                            <div className="flex items-center gap-1.5">
                              <span>{renderSetaOfensor(filial.pnr, filial.pnrAnterior)}</span>
                              <span className="font-mono">{formatCurrency(filial.pnr)}</span>
                            </div>
                          </div>
                          <div className="flex justify-between items-center text-orange-400">
                            <span>Lost</span>
                            <div className="flex items-center gap-1.5">
                              <span>{renderSetaOfensor(filial.lost, filial.lostAnterior)}</span>
                              <span className="font-mono">{formatCurrency(filial.lost)}</span>
                            </div>
                          </div>
                          <div className="flex justify-between items-center text-slate-400">
                            <span>NV</span>
                            <div className="flex items-center gap-1.5">
                              <span>{renderSetaOfensor(filial.notVisited, filial.nvAnterior)}</span>
                              <span className="font-mono">{formatCurrency(filial.notVisited)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {topMelhores.length > 0 && (
                <div>
                  <h4 className="text-sm font-bold text-emerald-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <TrendingDown className="w-4 h-4" /> Destaques: Maiores Evoluções
                  </h4>
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-4">
                    {topMelhores.map((filial, idx) => (
                      <div key={`melhor-${idx}`} onClick={() => onDrilldown && onDrilldown(filial.filial)} className="cursor-pointer bg-slate-800/80 border border-slate-700 p-4 rounded-xl flex flex-col hover:bg-slate-700 transition-colors shadow-sm">
                        <div className="flex justify-between items-start mb-3 border-b border-slate-700/50 pb-2">
                          <span className="font-bold text-white text-base truncate pr-2">{filial.filial}</span>
                          <div className="flex flex-col items-end">
                            <span className="text-xs font-black px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                              {filial.varRep.toFixed(2)} p.p.
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col gap-1.5 text-[10px]">
                          <div className="flex justify-between items-center text-blue-400">
                            <span>PNR</span>
                            <div className="flex items-center gap-1.5">
                              <span>{renderSetaOfensor(filial.pnr, filial.pnrAnterior)}</span>
                              <span className="font-mono">{formatCurrency(filial.pnr)}</span>
                            </div>
                          </div>
                          <div className="flex justify-between items-center text-orange-400">
                            <span>Lost</span>
                            <div className="flex items-center gap-1.5">
                              <span>{renderSetaOfensor(filial.lost, filial.lostAnterior)}</span>
                              <span className="font-mono">{formatCurrency(filial.lost)}</span>
                            </div>
                          </div>
                          <div className="flex justify-between items-center text-slate-400">
                            <span>NV</span>
                            <div className="flex items-center gap-1.5">
                              <span>{renderSetaOfensor(filial.notVisited, filial.nvAnterior)}</span>
                              <span className="font-mono">{formatCurrency(filial.notVisited)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const RunRateOperacionalSection = ({ baseData, targetQuinzena, titlePrefix = "Operacional", isForecastMode, setIsForecastMode }) => {
  const { totalDias, diasOperados, isClosed } = useMemo(() => {
    if (!targetQuinzena || targetQuinzena === 'N/A') return { totalDias: 15, diasOperados: 15, isClosed: true };
    const year = parseInt(targetQuinzena.substring(0, 4));
    const month = parseInt(targetQuinzena.substring(4, 6)) - 1;
    const q = targetQuinzena.substring(6, 8);
    const now = new Date();
    const isCurrentMonth = (year === now.getFullYear() && month === now.getMonth());
    const isPastMonth = (year < now.getFullYear() || (year === now.getFullYear() && month < now.getMonth()));

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const total = q === 'Q1' ? 15 : (daysInMonth - 15);

    let operados = total;
    let closed = false;

    if (isPastMonth) {
      closed = true;
    } else if (isCurrentMonth) {
      if (q === 'Q1' && now.getDate() > 15) {
        closed = true;
      } else if (q === 'Q1' && now.getDate() <= 15) {
        operados = now.getDate() - 1;
      } else if (q === 'Q2' && now.getDate() > 15) {
        operados = (now.getDate() - 15) - 1;
      } else if (q === 'Q2' && now.getDate() <= 15) {
        operados = 1;
      }
    } else {
      operados = 1;
    }

    return { totalDias: total, diasOperados: Math.max(1, operados), isClosed: closed };
  }, [targetQuinzena]);

  const [selectedRegional, setSelectedRegional] = useState(null);
  if (!baseData || baseData.length === 0) return (<div className="bg-slate-50 p-8 rounded-3xl shadow-sm border border-slate-200 mb-8 flex flex-col items-center justify-center text-center gap-3"><AlertCircle className="w-8 h-8 text-slate-400" /><p className="text-slate-500 font-medium max-w-md">Nenhuma informação disponível para {targetQuinzena}.</p></div>);

  const baseMult = isClosed ? 1 : (diasOperados > 0 ? totalDias / diasOperados : 1);
  const mult = isForecastMode ? baseMult : 1;
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
    <div className="bg-white p-6 md:p-10 rounded-3xl shadow-sm border border-slate-200 mb-8">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-4">
        <div className="flex items-center gap-3"><Box className="w-6 h-6 text-emerald-500" /><div><h2 className="text-xl md:text-2xl font-bold text-slate-800">{isClosed ? 'Resultado' : 'Projeção'} {titlePrefix} - {targetQuinzena}</h2></div></div>
        <div className="flex flex-col sm:flex-row gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 w-full lg:w-auto">
          {isClosed ? (
            <div className="flex flex-col gap-1 items-center justify-center px-4">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Status do Período</span>
              <span className="text-sm font-black text-slate-600 bg-slate-200 px-4 py-1.5 rounded-full border border-slate-300 shadow-sm">Fechado ({totalDias} dias)</span>
            </div>
          ) : (
            <div className="flex flex-col gap-1 items-center justify-center px-4">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Cálculo Automático</span>
              <span className="text-sm font-black text-emerald-600 bg-emerald-100/50 px-4 py-1.5 rounded-full border border-emerald-200 shadow-sm">{diasOperados} / {totalDias} Dias</span>
            </div>
          )}
        </div>
      </div>
      <div className="mb-8 border border-slate-200 rounded-3xl bg-slate-50 p-6 md:p-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-2 gap-4">
          <div><h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2"><TrendingUp className="w-5 h-5" /> Evolução de Volume vs. {isClosed ? 'Resultado de DS' : 'Projeção de DS'}</h3><p className="text-3xl sm:text-4xl font-black text-slate-800 mt-2">{formatDS(dsGlobal)}</p></div>
        </div>
        <NativeRunRateChart diasOperados={diasOperados} totalDias={totalDias} currentSaldo={globalSaldo} currentEntregues={globalEntregues} projSaldo={projSaldoGlob} projEntregues={projEntreguesGlob} isClosed={isClosed} />
      </div>
      <div className={`mb-8 p-4 rounded-xl border flex items-center justify-between gap-4 ${atingiuMetaDS ? 'bg-emerald-50/50 border-emerald-200' : 'bg-red-50/50 border-red-200'}`}>
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-full ${atingiuMetaDS ? 'bg-emerald-100/50' : 'bg-red-100/50'}`}>{atingiuMetaDS ? <TrendingUp className="w-6 h-6 text-emerald-600" /> : <TrendingDown className="w-6 h-6 text-red-600" />}</div>
          <div><h4 className={`font-bold ${atingiuMetaDS ? 'text-emerald-700' : 'text-red-700'}`}>{isClosed ? 'Fechamento do Período' : 'Tendência de Fechamento'}: {atingiuMetaDS ? 'Positiva (Dentro da Meta)' : 'Negativa (Abaixo da Meta)'}</h4></div>
        </div>
      </div>
      {topOfensores.length > 0 && (
        <div className="mb-8 p-6 bg-orange-50/40 border border-orange-200 rounded-2xl">
          <h3 className="text-sm font-black text-orange-500 mb-4 uppercase tracking-wider flex items-center gap-2"><AlertCircle className="w-5 h-5" /> Alerta Crítico: Filiais com Menor DS {isClosed ? 'Apurado' : 'Previsto'} (Gargalos)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {topOfensores.map((filial, idx) => {
              const dsc = filial.ds >= 98.5 ? 'bg-emerald-500' : (filial.ds >= 95 ? 'bg-orange-500' : 'bg-red-500');
              const dscText = filial.ds >= 98.5 ? 'text-emerald-500' : (filial.ds >= 95 ? 'text-orange-500' : 'text-red-500');
              return (
                <div key={idx} className="bg-white p-5 rounded-xl border border-orange-100 shadow-sm flex flex-col relative overflow-hidden">
                  <div className={`absolute top-0 left-0 w-1 h-full ${dsc}`}></div>
                  <div className="flex justify-between items-start mb-2"><div><span className="font-black text-slate-800 text-lg block">{filial.filial}</span></div><span className={`text-xs font-black text-white ${dsc} px-2 py-0.5 rounded-full shadow-sm`}>#{idx + 1}</span></div>
                  <div className="flex justify-between items-end mt-auto pt-3 border-t border-slate-100">
                    <div className="flex flex-col items-start"><span className="text-[10px] text-slate-400 uppercase font-bold">Status</span><span className={`text-sm font-black ${dscText}`}>{filial.ds >= 98.5 ? 'Excelente' : (filial.ds >= 95 ? 'Atenção' : 'Crítico')}</span></div>
                    <div className="flex flex-col items-end"><span className="text-[10px] text-slate-400 uppercase font-bold">DS {isClosed ? 'Final' : 'Projetado'}</span><span className={`text-lg font-black ${dscText}`}>{formatDS(filial.ds)}</span></div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col xl:col-span-2">
          <div className="flex items-center justify-between mb-4 px-2 pt-2"><h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">{selectedRegional ? `Filiais: ${selectedRegional}` : `Resultado DS por Regional`}</h3>{selectedRegional && (<button onClick={() => setSelectedRegional(null)} className="text-[10px] sm:text-xs font-bold text-slate-500 bg-slate-200 px-2 py-1 rounded hover:bg-slate-300 transition-colors">← Voltar</button>)}</div>
          {!selectedRegional ? <NativeDSChart data={projRegionalData} labelKey="name" heightClass="h-[350px]" onBarClick={(r) => setSelectedRegional(r)} /> : <NativeDSChart data={regionalDrilldownData} labelKey="filial" heightClass="h-[350px]" />}
        </div>
        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col"><h3 className="text-sm font-bold text-slate-500 text-center mb-2 pt-2 uppercase tracking-wider">DS por Filial (Piores Resultados)</h3><NativeDSChart data={projFilialData.slice(0, 15)} labelKey="filial" heightClass="h-[350px]" /></div>
        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col"><h3 className="text-sm font-bold text-slate-500 text-center mb-2 pt-2 uppercase tracking-wider">DS por Filial (Melhores Resultados)</h3><NativeDSChart data={[...projFilialData].filter(d => d.saldo > 0).sort((a, b) => b.ds - a.ds).slice(0, 15)} labelKey="filial" heightClass="h-[350px]" /></div>
      </div>
    </div>
  );
};

const DetalheFinanceiroSection = ({ dadosFiltrados, onExport, isExporting, initialFilial, initialMotorista, returnToModalState, onReturnToModal }) => {
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

const GapsOperacionaisSection = ({ dataOp, dataBsc }) => {
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
      const fKey = normalizeText(d.filial);
      const cKey = normalizeText(d.cluster || 'Ambulâncias');
      const mKey = normalizeText(d.motorista);

      if (!map[fKey]) map[fKey] = { filial: d.filial, saldo: 0, entregues: 0, insucessos: 0, insDetalhes: {}, clustersMap: {} };
      if (!map[fKey].clustersMap[cKey]) map[fKey].clustersMap[cKey] = { cluster: d.cluster || 'Ambulâncias', saldo: 0, entregues: 0, insucessos: 0, insDetalhes: {}, motoristasMap: {} };
      if (!map[fKey].clustersMap[cKey].motoristasMap[mKey]) map[fKey].clustersMap[cKey].motoristasMap[mKey] = { motorista: d.motorista, saldo: 0, entregues: 0, insucessos: 0, insDetalhes: {}, rotasPorMotivo: {} };

      const insTotal = Math.max(0, d.saldo - d.entregues);
      globalSaldo += d.saldo; globalInsucessos += insTotal;

      map[fKey].saldo += d.saldo; map[fKey].entregues += d.entregues; map[fKey].insucessos += insTotal;
      map[fKey].clustersMap[cKey].saldo += d.saldo; map[fKey].clustersMap[cKey].entregues += d.entregues; map[fKey].clustersMap[cKey].insucessos += insTotal;
      map[fKey].clustersMap[cKey].motoristasMap[mKey].saldo += d.saldo; map[fKey].clustersMap[cKey].motoristasMap[mKey].entregues += d.entregues; map[fKey].clustersMap[cKey].motoristasMap[mKey].insucessos += insTotal;

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

  const SortIcon = ({ columnKey }) => {
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
            <span className="text-[10px] font-bold text-red-600 uppercase mb-1">Volume de Insucessos</span>
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
                <th className="py-3 px-3 font-bold border-b border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors bg-white z-30 sticky left-0" onClick={() => handleSort(selectedCluster ? 'motorista' : (!selectedFilial ? 'filial' : 'cluster'))}>{selectedCluster ? 'Motorista' : (!selectedFilial ? 'Filial' : 'Cluster')} <SortIcon columnKey={selectedCluster ? 'motorista' : (!selectedFilial ? 'filial' : 'cluster')} /></th>
                <th className="py-3 px-3 font-bold border-b border-slate-200 text-right cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('saldo')}>Total Pacotes <SortIcon columnKey="saldo" /></th>
                <th className="py-3 px-3 font-bold border-b border-slate-200 text-right cursor-pointer hover:bg-red-50 transition-colors text-red-700 bg-red-50/30" onClick={() => handleSort('insucessos')}>Insucessos (Total) <SortIcon columnKey="insucessos" /></th>
                {selectedMotivo && (<th className="py-3 px-3 font-bold border-b border-orange-200 text-right cursor-pointer hover:bg-orange-100 transition-colors text-orange-800 bg-orange-100/50" onClick={() => handleSort('motivoFilterQtd')}>Insucessos: {selectedMotivo} <SortIcon columnKey="motivoFilterQtd" /></th>)}
                <th className="py-3 px-3 font-bold border-b border-slate-200 text-right cursor-pointer hover:bg-emerald-50 transition-colors text-emerald-700 bg-emerald-50/30" onClick={() => handleSort('ds')}>DS <SortIcon columnKey="ds" /></th>
                <th className="py-3 px-3 font-bold border-b border-slate-200 text-center cursor-pointer hover:bg-orange-50 transition-colors text-orange-700 bg-orange-50/30" onClick={() => handleSort(!selectedFilial ? 'impactoGlobal' : (!selectedCluster ? 'impactoFilial' : 'impactoCluster'))}>Impacto no DS {!selectedFilial ? 'Geral (Empresa)' : (!selectedCluster ? 'da Filial' : 'do Cluster')} <SortIcon columnKey={!selectedFilial ? 'impactoGlobal' : (!selectedCluster ? 'impactoFilial' : 'impactoCluster')} /></th>
                <th className="py-3 px-3 font-bold border-b border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('topMotivo')}>Principal Motivo <SortIcon columnKey="topMotivo" /></th>
              </tr>
            ) : (
              <tr className="text-[10px] uppercase tracking-wider text-slate-500 select-none">
                <th className="py-3 px-3 font-bold border-b border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors bg-white z-30 sticky left-0 w-1/3" onClick={() => handleSort('motivo')}>Motivo de Insucesso <SortIcon columnKey="motivo" /></th>
                <th className="py-3 px-3 font-bold border-b border-slate-200 text-right cursor-pointer hover:bg-red-50 transition-colors text-red-700 bg-red-50/30 w-1/6" onClick={() => handleSort('qtd')}>Qtd Pacotes <SortIcon columnKey="qtd" /></th>
                <th className="py-3 px-3 font-bold border-b border-slate-200 text-right cursor-pointer hover:bg-orange-50 transition-colors text-orange-700 bg-orange-50/30 w-1/6" onClick={() => handleSort('representatividade')}>Representatividade <SortIcon columnKey="representatividade" /></th>
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
                <Fragment key={`motivo-${idx}`}>
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
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};


const FilialPenalidadesModal = ({ filial, targetQuinzena, dadosPlanilha, faturamentoPlanilha, onClose, onNavigateToDetalhes, onExportExcel, isOpMode }) => {
  const [selectedMotorista, setSelectedMotorista] = useState(null);

  const { chartDataValor, chartDataQtd, tableData, casosFilial } = useMemo(() => {
    const norm = (s) => (s || '').toLowerCase().trim();
    const fName = norm(filial);
    const mName = selectedMotorista ? norm(selectedMotorista) : null;

    const casosFilial = dadosPlanilha.filter(d =>
      norm(d.filial) === fName &&
      (d.valor > 0 || typeof d.tipo === 'string')
    );

    // Chart Data
    const mapEvolucao = {};
    const fatFilial = (faturamentoPlanilha || []).filter(f => norm(f.filial) === fName);
    fatFilial.forEach(f => {
      const faturamentoTotal = (f.faturamento || 0) + (f.faturamento_paradas || 0);
      if (faturamentoTotal === 0 && !isOpMode) return; // IGNORA quinzenas que zeraram faturamento (vieram do operacional)

      const q = f.quinzena;
      if (!mapEvolucao[q]) mapEvolucao[q] = { quinzena: q, valor: 0, faturamento: 0, pnrQtd: 0, lostQtd: 0, nvQtd: 0, totalQtd: 0, pnr: 0, lost: 0, notVisited: 0 };
      mapEvolucao[q].faturamento += faturamentoTotal;
    });

    casosFilial.forEach(c => {
      if (mName && norm(c.motorista) !== mName) return;
      const q = c.quinzena;
      if (!mapEvolucao[q]) {
        mapEvolucao[q] = { quinzena: q, valor: 0, faturamento: 0, pnrQtd: 0, lostQtd: 0, nvQtd: 0, totalQtd: 0, pnr: 0, lost: 0, notVisited: 0 };
      }
      mapEvolucao[q].valor += (c.valor || 0);
      const peso = c._pesoQtd || 1;
      const baseQtd = (c.qtd || 1) * peso;

      if (c.tipo === 'PNRs') {
        mapEvolucao[q].pnrQtd += baseQtd;
        mapEvolucao[q].pnr += (c.valor || 0);
      } else if (c.tipo === 'Lost Packages') {
        mapEvolucao[q].lostQtd += baseQtd;
        mapEvolucao[q].lost += (c.valor || 0);
      } else if (c.tipo === 'Not Visited') {
        mapEvolucao[q].nvQtd += baseQtd;
        mapEvolucao[q].notVisited += (c.valor || 0);
      }
    });

    let evolutionArray = Object.values(mapEvolucao).sort((a, b) => a.quinzena.localeCompare(b.quinzena));
    evolutionArray = evolutionArray.filter(e => e.quinzena <= targetQuinzena).slice(-3);

    evolutionArray.forEach(e => {
      e.totalQtd = Math.round((e.pnrQtd + e.lostQtd + e.nvQtd) * 10) / 10;
      e.penalidades = e.valor;
      e.representatividade = e.faturamento > 0 ? (e.penalidades / e.faturamento) * 100 : 0;
      if (!e.faturamento) e.faturamento = e.penalidades * 10; // Evita falha visual caso no haja faturamento
    });

    // Table Data
    const mapTable = {};
    casosFilial.filter(c => c.quinzena === targetQuinzena).forEach(c => {
      const mot = c.motorista || 'N/A';
      if (!mapTable[mot]) {
        mapTable[mot] = { motorista: mot, valor: 0, pnr: 0, lost: 0, nv: 0, qtd: 0 };
      }
      mapTable[mot].valor += (c.valor || 0);
      const peso = c._pesoQtd || 1;
      const baseQtd = (c.qtd || 1) * peso;
      mapTable[mot].qtd += baseQtd;

      if (c.tipo === 'PNRs') mapTable[mot].pnr += (c.valor || 0);
      else if (c.tipo === 'Lost Packages') mapTable[mot].lost += (c.valor || 0);
      else if (c.tipo === 'Not Visited') mapTable[mot].nv += (c.valor || 0);
    });

    const tableArray = Object.values(mapTable).sort((a, b) => b.valor - a.valor);
    tableArray.forEach(t => t.qtd = Math.round(t.qtd * 10) / 10);

    // Normalize totalQtd to 0-100 for the line chart
    const maxQtd = Math.max(...evolutionArray.map(d => d.totalQtd || 0), 1);
    const evolutionArrayWithNorm = evolutionArray.map(d => ({ ...d, qtdNormalizada: ((d.totalQtd || 0) / maxQtd) * 100 }));

    return { chartDataValor: evolutionArrayWithNorm, chartDataQtd: evolutionArray, tableData: tableArray, casosFilial };
  }, [dadosPlanilha, filial, targetQuinzena, selectedMotorista]);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-slate-900 w-full max-w-6xl max-h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-700 zoom-in-95" onClick={e => e.stopPropagation()}>

        {/* HEADER */}
        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-800/80">
          <div>
            <h3 className="text-xl md:text-2xl font-bold text-white flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-red-500" />
              Análise Evolutiva: <span className="text-blue-400">{filial}</span>
            </h3>
            <p className="text-slate-400 text-sm mt-1">
              Visão detalhada de penalidades {selectedMotorista ? <><span className="text-orange-400 font-bold">filtrada pelo motorista: {selectedMotorista}</span> <button onClick={() => setSelectedMotorista(null)} className="text-xs ml-2 bg-slate-700 hover:bg-slate-600 px-2 py-0.5 rounded text-white transition-colors">Limpar Filtro</button></> : 'para a filial em todas as quinzenas.'}
            </p>
          </div>
          <div className="flex gap-3 items-center">

            <button onClick={() => onExportExcel && onExportExcel(selectedMotorista ? casosFilial.filter(c => c.motorista === selectedMotorista) : casosFilial)} className="px-3 py-2.5 bg-slate-800 hover:bg-emerald-900 border border-slate-700 hover:border-emerald-700 text-slate-300 hover:text-emerald-400 rounded-xl transition-colors shadow-lg flex items-center gap-2" title="Gerar Planilha desta Visão">
              <FileSpreadsheet className="w-4 h-4" />
              <span className="hidden sm:inline text-sm font-bold">Excel</span>
            </button>
            <button onClick={onClose} className="p-2.5 bg-slate-800 hover:bg-red-500/20 hover:text-red-400 rounded-full text-slate-400 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* BODY */}
        <div className="p-6 overflow-y-auto overflow-x-hidden flex-1 flex flex-col xl:flex-row gap-6 custom-scrollbar">

          {/* CHARTS COLUMN */}
          <div className="flex-none xl:flex-1 flex flex-col gap-6">
            <div className="bg-slate-800/50 p-5 rounded-2xl border border-slate-700 shadow-sm flex flex-col relative shrink-0">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Evolução por Valor (R$)</h4>
              {chartDataValor.length === 0 ? (
                <div className="h-[200px] flex items-center justify-center text-slate-500 text-xs">Sem dados.</div>
              ) : (
                <div className="h-[260px] pt-10">
                  <NativeComboChart data={chartDataValor} labelKey="quinzena" heightClass="h-[220px]" isMarginChart={!isOpMode} showFaturamento={!isOpMode} showLine={!isOpMode} tooltipSecondaryLabel="Penalidades" legendSecondaryLabel="Penalidades" showMargemErro={false} hideFaturamentoTooltip={true} dsKey="qtdNormalizada" showDSLine={isOpMode} dsLabel="Qtd Pacotes" tooltipRender={(d) => (`${d.totalQtd} pacotes`)} />
                </div>
              )}
            </div>

            {selectedMotorista ? (
              <div className="bg-slate-800/50 p-5 rounded-2xl border border-slate-700 shadow-sm flex flex-col relative flex-none xl:flex-1 min-h-[400px] overflow-hidden">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">Detalhamento de Pacotes: <span className="text-orange-400">{selectedMotorista}</span></h4>
                  <button onClick={() => setSelectedMotorista(null)} className="text-xs font-bold bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"><ArrowUp className="w-3 h-3 -rotate-90" /> Voltar para Visão Geral</button>
                </div>
                <div className="flex-1 overflow-auto pr-2 custom-scrollbar">
                  <table className="w-full text-left text-xs min-w-[500px]">
                    <thead className="sticky top-0 bg-slate-800/90 text-slate-400 uppercase tracking-wider z-10 backdrop-blur-sm">
                      <tr>
                        <th className="p-3 border-b border-slate-700 font-bold">Quinzena</th>
                        <th className="p-3 border-b border-slate-700 font-bold">Tipo Infração</th>
                        <th className="p-3 border-b border-slate-700 font-bold">ID (Pacote/Rota)</th>
                        <th className="p-3 border-b border-slate-700 font-bold text-right">Valor</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50">
                      {casosFilial.filter(c => c.motorista === selectedMotorista && c.quinzena === targetQuinzena).map((c, i) => (
                        <tr key={i} className="hover:bg-slate-700/30 transition-colors">
                          <td className="p-3 font-medium text-slate-300">{c.quinzena}</td>
                          <td className="p-3 text-slate-400">{c.tipo}</td>
                          <td className="p-3 font-mono text-slate-400">
                            {(() => {
                              let isRota = c.tipo === 'Not Visited';
                              let idVal = isRota ? c.id_rota : c.id_pacote;

                              if (!idVal || idVal === '-' || idVal === 'N/A') {
                                idVal = c.id_rota;
                                isRota = true;
                              }

                              if (!idVal || idVal === '-' || idVal === 'N/A') return '-';
                              
                              if (isRota) return <a href={`https://envios.adminml.com/logistics/monitoring-distribution/detail/${idVal}`} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline hover:text-blue-300" onClick={(e) => e.stopPropagation()}>{idVal}</a>;
                              return <a href={`https://envios.adminml.com/logistics/package-management/package/${idVal}`} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline hover:text-blue-300" onClick={(e) => e.stopPropagation()}>{idVal}</a>;
                            })()}
                          </td>
                          <td className="p-3 text-right font-bold text-red-400">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(c.valor || 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="bg-slate-800/50 p-5 rounded-2xl border border-slate-700 shadow-sm flex flex-col relative">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Evolução Operacional (Qtd Pacotes)</h4>
                {chartDataQtd.length === 0 ? (
                  <div className="h-[200px] flex items-center justify-center text-slate-500 text-xs">Sem dados.</div>
                ) : (
                  <div className="h-[220px] relative flex flex-col justify-end pt-16 pb-8">
                    <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-8">
                      {[4, 3, 2, 1, 0].map((step, idx) => {
                        const maxQtd = Math.max(1, ...chartDataQtd.map(d => d.totalQtd));
                        return (
                          <div key={idx} className="w-full border-t border-slate-700/50 flex items-center justify-between" style={{ height: step === 0 ? '0px' : 'auto' }}>
                            <span className="text-[10px] text-slate-500 pr-2 -translate-y-1/2 bg-transparent">{Math.round(maxQtd * (step / 4))} un</span>
                          </div>
                        )
                      })}
                    </div>
                    <div className="z-10 flex w-full h-full items-end justify-around gap-1 sm:gap-2 mx-8 border-b border-slate-700">
                      {chartDataQtd.map((d, i) => {
                        const maxQtd = Math.max(1, ...chartDataQtd.map(d => d.totalQtd));
                        const pct = (d.totalQtd / maxQtd) * 100;
                        return (
                          <div key={i} className="flex-1 flex flex-col justify-end h-full group relative max-w-[40px]">
                            <span className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 text-[10px] font-bold text-blue-300">{d.totalQtd}</span>
                            <div className="w-full bg-blue-500/80 group-hover:bg-blue-400 transition-colors rounded-t-sm" style={{ height: `${pct}%` }}></div>
                            <span className="absolute top-full mt-2 left-1/2 -translate-x-1/2 text-[9px] text-slate-400 font-bold">{d.quinzena}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* TABLE COLUMN */}
          <div className="w-full xl:w-[450px] flex-none xl:flex-1 flex flex-col bg-slate-800/50 border border-slate-700 rounded-2xl overflow-hidden shadow-sm shrink-0 min-h-[400px]">
            <div className="p-4 border-b border-slate-700 bg-slate-800/80">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                <span>Motoristas da Quinzena ({targetQuinzena})</span>
                <span className="text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full">{tableData.length}</span>
              </h4>
            </div>
            <div className="flex-1 overflow-y-auto p-0">
              {tableData.length === 0 ? (
                <div className="p-10 text-center text-slate-500 text-sm">Nenhum motorista com penalidade nesta quinzena específica.</div>
              ) : (
                <div className="flex flex-col">
                  {tableData.map((m, idx) => (
                    <div
                      key={idx}
                      onClick={() => setSelectedMotorista(m.motorista === selectedMotorista ? null : m.motorista)}
                      className={`p-4 border-b border-slate-700/50 cursor-pointer transition-colors ${selectedMotorista === m.motorista ? 'bg-blue-500/10 border-l-4 border-l-blue-500' : 'hover:bg-slate-700/30 border-l-4 border-l-transparent'}`}
                    >
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-2 gap-1 sm:gap-0">
                        <div className="font-bold text-slate-200 text-sm truncate">{m.motorista}</div>
                        <div className="font-black text-red-400 text-sm shrink-0">{formatCurrency(m.valor)}</div>
                      </div>
                      <div className="flex gap-3 text-[10px] font-bold text-slate-400">
                        {m.pnr > 0 && <span className="bg-slate-700/50 px-1.5 py-0.5 rounded text-blue-300">PNR: {formatCurrency(m.pnr)}</span>}
                        {m.lost > 0 && <span className="bg-slate-700/50 px-1.5 py-0.5 rounded text-orange-300">Lost: {formatCurrency(m.lost)}</span>}
                        {m.nv > 0 && <span className="bg-slate-700/50 px-1.5 py-0.5 rounded text-slate-300">NV: {formatCurrency(m.nv)}</span>}
                        <span className="ml-auto text-slate-500">{m.qtd} pct(s)</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="p-3 bg-slate-800 text-[10px] text-slate-500 text-center border-t border-slate-700 italic">
              Clique em um motorista para filtrar a evolução nos gráficos.
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
const ofensoresModal = [];
export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const urlIsOpMode = new URLSearchParams(window.location.search).get('view') === 'operacao';
  const [currentUser, setCurrentUser] = useState(null);
  const [isForecastMode, setIsForecastMode] = useState(false);
  const [userRole, setUserRole] = useState(null); // 'admin', 'importer', 'operacao'
  const [userPermissions, setUserPermissions] = useState([]);
  const [isUrlOpMode, setIsUrlOpMode] = useState(false);

  const isUserAdmin = userRole === 'admin';
  const isUserGestao = userRole === 'gestao';
  const isImporter = userRole === 'importer';
  const isOpMode = urlIsOpMode || userRole === 'operacao';
  
  const [agentContext, setAgentContext] = useState(null);
  const [drilldownFilial, setDrilldownFilial] = useState(null);
  const [returnToModalState, setReturnToModalState] = useState(null);
  const [drilldownMotorista, setDrilldownMotorista] = useState(null);
  const [modalEvolutivoFilial, setModalEvolutivoFilial] = useState(null);
  const [isLoadingDetalhes, setIsLoadingDetalhes] = useState(false);
  const [detailedPenalidades, setDetailedPenalidades] = useState([]);

  const handleOpenEvolutivo = async (filialName) => {
    setIsLoadingDetalhes(true);
    try {
      const { data, error } = await supabase.rpc('get_detalhes_penalidades_filial', { p_filial: filialName });
      if (error) {
        console.error(error);
        setDetailedPenalidades(distributedDados.filter(d => d.filial === filialName));
      } else {
        setDetailedPenalidades(data || []);
      }
    } catch (e) {
      console.error(e);
      setDetailedPenalidades(distributedDados.filter(d => d.filial === filialName));
    } finally {
      setIsLoadingDetalhes(false);
      setModalEvolutivoFilial(filialName);
    }
  };

  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const [emailLogin, setEmailLogin] = useState('');
  const [senhaDigitada, setSenhaDigitada] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [erroLogin, setErroLogin] = useState(false);
  const [erroLoginMsg, setErroLoginMsg] = useState('');
  const [loginView, setLoginView] = useState('login'); // 'login', 'register', 'forgot'
  const [nomeRegister, setNomeRegister] = useState('');
  const [telefoneRegister, setTelefoneRegister] = useState('');
  const [loginSuccessMsg, setLoginSuccessMsg] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const isRecoveryRef = useRef(false);
  const hasCheckedInitialRecoveryRef = useRef(false);

  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('dashopTheme') === 'dark';
  });

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Logout automático por inatividade
  useEffect(() => {
    if (isAuthenticated !== true) return;

    let inactivityTimer;
    const INACTIVITY_TIMEOUT_MS = 60 * 60 * 1000; // 1 hora

    const resetTimer = () => {
      clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(async () => {
        try {
          console.log('Sessão encerrada por inatividade.');
          await supabase.auth.signOut();
        } catch (e) {
          console.error('Logout error:', e);
        }
      }, INACTIVITY_TIMEOUT_MS);
    };

    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    events.forEach(event => window.addEventListener(event, resetTimer));

    resetTimer();

    return () => {
      clearTimeout(inactivityTimer);
      events.forEach(event => window.removeEventListener(event, resetTimer));
    };
  }, [isAuthenticated]);

  useEffect(() => {
    const styleId = 'dark-mode-injector';
    let styleEl = document.getElementById(styleId);

    if (isDarkMode) {
      localStorage.setItem('dashopTheme', 'dark');
      if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = styleId;
        styleEl.innerHTML = `
          body, main { background-color: #000000 !important; color: #ffffff !important; }
          .bg-white, .bg-slate-50 { background-color: #0f0f11 !important; border-color: #27272a !important; }
          .text-slate-900, .text-slate-800, .text-slate-700, .text-slate-600, h1, h2, h3 { color: #ffffff !important; }
          .text-slate-500, .text-slate-400 { color: #a1a1aa !important; } 
          .bg-slate-100 { background-color: #18181b !important; border-color: #27272a !important; }
          .border-slate-200, .border-slate-100, .border-slate-300 { border-color: #27272a !important; }
          header { background-color: #000000 !important; border-bottom-color: #27272a !important; }
          td, th { border-color: #27272a !important; }
          tr { border-color: #27272a !important; }
          tr:hover td { background-color: #27272a !important; }
          input { background-color: #18181b !important; color: white !important; border-color: #3f3f46 !important; }
          table thead tr th { background-color: #18181b !important; color: #d4d4d8 !important; border-color: #27272a !important; }
          table tbody tr:hover { background-color: #27272a !important; }
          
          /* Alto contraste para cores semânticas no escuro */
          .bg-blue-50\\/50, .bg-blue-50\\/40, .bg-blue-50\\/30, .bg-blue-50\\/10, .bg-blue-50, .bg-blue-100, .bg-blue-100\\/50 { background-color: rgba(59, 130, 246, 0.15) !important; color: #60a5fa !important; border-color: rgba(59, 130, 246, 0.3) !important; }
          .bg-red-50\\/50, .bg-red-50\\/40, .bg-red-50\\/30, .bg-red-50\\/10, .bg-red-50, .bg-red-100, .bg-red-100\\/50 { background-color: rgba(239, 68, 68, 0.15) !important; color: #f87171 !important; border-color: rgba(239, 68, 68, 0.3) !important; }
          .bg-emerald-50\\/50, .bg-emerald-50\\/40, .bg-emerald-50\\/30, .bg-emerald-50\\/10, .bg-emerald-50, .bg-emerald-100, .bg-emerald-100\\/50 { background-color: rgba(16, 185, 129, 0.15) !important; color: #34d399 !important; border-color: rgba(16, 185, 129, 0.3) !important; }
          .bg-orange-50\\/50, .bg-orange-50\\/40, .bg-orange-50\\/30, .bg-orange-50\\/10, .bg-orange-50, .bg-orange-100, .bg-orange-100\\/50 { background-color: rgba(249, 115, 22, 0.15) !important; color: #fb923c !important; border-color: rgba(249, 115, 22, 0.3) !important; }
          .bg-violet-50\\/50, .bg-violet-50\\/40, .bg-violet-50\\/30, .bg-violet-50\\/10, .bg-violet-50, .bg-violet-100, .bg-violet-100\\/50 { background-color: rgba(139, 92, 246, 0.15) !important; color: #a78bfa !important; border-color: rgba(139, 92, 246, 0.3) !important; }
          .bg-indigo-50\\/50, .bg-indigo-50\\/40, .bg-indigo-50\\/30, .bg-indigo-50\\/10, .bg-indigo-50, .bg-indigo-100, .bg-indigo-100\\/50 { background-color: rgba(99, 102, 241, 0.15) !important; color: #818cf8 !important; border-color: rgba(99, 102, 241, 0.3) !important; }
          
          .text-blue-700, .text-blue-600, .text-blue-500 { color: #60a5fa !important; }
          .text-emerald-700, .text-emerald-600, .text-emerald-500 { color: #34d399 !important; }
          .text-red-700, .text-red-600, .text-red-500 { color: #f87171 !important; }
          .text-orange-800, .text-orange-700, .text-orange-600, .text-orange-500 { color: #fb923c !important; }
          .text-violet-800, .text-violet-700, .text-violet-600, .text-violet-500 { color: #a78bfa !important; }
          .text-indigo-800, .text-indigo-700, .text-indigo-600, .text-indigo-500 { color: #818cf8 !important; }
          
          .bg-slate-50\\/30, .bg-slate-50\\/10, .bg-slate-50\\/40, .bg-slate-50\\/80,
          .bg-slate-100\\/50, .bg-slate-100\\/80, .bg-white\\/5 { background-color: rgba(24, 24, 27, 0.6) !important; border-color: #27272a !important; }
          .bg-slate-200, .bg-slate-300 { background-color: #27272a !important; color: #ffffff !important; border-color: #3f3f46 !important; }
          
          /* Correções de Hover para não esconder letras (Branco no Branco) */
          .group:hover .group-hover\\:bg-blue-100 { background-color: rgba(59, 130, 246, 0.2) !important; color: #60a5fa !important; }
          .group:hover .group-hover\\:bg-slate-50 { background-color: #27272a !important; color: #ffffff !important; }
          .hover\\:bg-slate-50:hover, .hover\\:bg-slate-100:hover, .hover\\:bg-slate-100\\/50:hover, .hover\\:bg-white:hover {
            background-color: #27272a !important;
            color: #ffffff !important;
          }

          polyline[stroke="#0ea5e9"] { stroke: #38bdf8 !important; stroke-width: 3.5 !important; }
          polyline[stroke="#0f766e"] { stroke: #2dd4bf !important; stroke-width: 4.5 !important; }
          line[stroke="#0f766e"] { stroke: #2dd4bf !important; stroke-width: 4 !important; }
          .bg-slate-800 { background-color: #18181b !important; border: 1px solid #27272a !important; }
          .bg-slate-900 { background-color: #000000 !important; }
          .bg-slate-950 { background-color: #09090b !important; border-color: #27272a !important; }
          .border-slate-700, .border-slate-800 { border-color: #27272a !important; }
        `;
        document.head.appendChild(styleEl);
      }
    } else {
      localStorage.setItem('dashopTheme', 'light');
      if (styleEl) styleEl.remove();
    }
  }, [isDarkMode]);

  useEffect(() => {
    const checkUserRole = async (user, isRecoveryEvent = false) => {
      // Supabase pode já ter limpado o hash, então usamos a variável isInitialRecoveryUrl
      // Consumimos essa variável apenas UMA VEZ na primeira execução, para que
      // o login subsequente (após o usuário concluir o reset) funcione normalmente.
      let isUrlRecovery = false;
      if (!hasCheckedInitialRecoveryRef.current) {
        isUrlRecovery = isInitialRecoveryUrl;
        hasCheckedInitialRecoveryRef.current = true;
      }
      
      if (isRecoveryEvent || isUrlRecovery || isRecoveryRef.current) {
        isRecoveryRef.current = true;
        setLoginView('update_password');
        setErroLogin(false);
        setLoginSuccessMsg('Insira sua nova senha abaixo.');
        setIsAuthenticated(false);
        return;
      }

      console.log("=== INICIO DEBUG DE LOGIN ===");
      console.log("Usuário logado no Supabase Auth:", user.email);
      
      const { data, error } = await supabase
        .from('user_roles')
        .select('*')
        .eq('email', user.email)
        .maybeSingle();
        
      console.log("Resultado da busca no user_roles:", data);
      console.log("Erro da busca:", error);
      console.log("=== FIM DEBUG DE LOGIN ===");
      
      // Checagem de segurança pós-await
      if (isRecoveryRef.current) return;

      if (data && data.needs_password_change) {
        setLoginView('update_password');
        setErroLogin(false);
        setLoginSuccessMsg('Por motivos de segurança, você precisa definir sua nova senha antes de acessar o sistema.');
        setIsAuthenticated(false);
        return;
      }
        
      if (data && data.role && data.role !== 'pending') {
        setUserRole(data.role);
        const defaultOpPerms = ['gestao_penalidades', 'gestao_bsc', 'comparativo_bsc', 'gaps_operacionais', 'painel_treinamentos', 'disponibilidade_frota', 'gestao_motoristas'];
        const defaultImpPerms = ['importador'];
        setUserPermissions(data.permissoes || (data.role === 'operacao' ? defaultOpPerms : data.role === 'importer' ? defaultImpPerms : []));
        
        // Define o menu ativo de forma síncrona para evitar que o dashboard completo "pisque" na tela
        const isOp = new URLSearchParams(window.location.search).get('view') === 'operacao' || data.role === 'operacao';
        if (data.role === 'importer') {
          setActiveMenu('importador');
        } else if (isOp) {
          setActiveMenu('gestao_penalidades');
        }
        
        setIsAuthenticated(true);
      } else {
        setUserRole(null);
        setUserPermissions([]);
        setIsAuthenticated(false);
        if (data && data.role === 'pending') {
          setErroLoginMsg('Sua conta está em análise pelo Administrador.');
        } else {
          setErroLoginMsg('Necessário Permissão.');
        }
        setErroLogin(true);
        setLoginView('login');
        await supabase.auth.signOut();
      }
    };

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'PASSWORD_RECOVERY') {
          isRecoveryRef.current = true;
          setLoginView('update_password');
          setErroLogin(false);
          setLoginSuccessMsg('Insira sua nova senha abaixo.');
          setIsAuthenticated(false);
          return;
        }

        if (session) {
          setCurrentUser(session.user);
          await checkUserRole(session.user, event === 'PASSWORD_RECOVERY');
        } else {
          setIsAuthenticated(false);
          setUserRole(null);
          setUserPermissions([]);
        }
      }
    );
    
    // Initial session check
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        setIsAuthenticated(false);
      } else {
        setCurrentUser(session.user);
        await checkUserRole(session.user, false);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsAuthLoading(true);
    setErroLogin(false);
    setErroLoginMsg('');
    setLoginSuccessMsg('');
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: emailLogin,
        password: senhaDigitada,
      });
      if (error) throw error;
      setSenhaDigitada('');
    } catch (err) {
      setErroLogin(true);
      if (err.message && err.message.toLowerCase().includes('email not confirmed')) {
        setErroLoginMsg('');
        setLoginSuccessMsg('O seu e-mail ainda não foi verificado. Digite abaixo o código de segurança que enviamos para o seu e-mail.');
        setLoginView('verify_otp_signup');
      } else {
        setErroLoginMsg('E-mail ou senha incorretos. Tente novamente.');
      }
    } finally {
      setIsAuthLoading(false);
    }
  };

  const formatName = (str) => {
    return str.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setIsAuthLoading(true);
    setErroLogin(false);
    setErroLoginMsg('');
    setLoginSuccessMsg('');
    try {
      const { data, error } = await supabase.auth.signUp({
        email: emailLogin,
        password: senhaDigitada,
      });
      if (error) throw error;
      
      const { error: dbError } = await supabase.from('user_roles').insert([{
        email: emailLogin.trim().toLowerCase(),
        role: 'pending',
        nome: formatName(nomeRegister),
        telefone: telefoneRegister
      }]);
      
      // Se o erro for 23505 (já existe), significa que o usuário já tinha tentado
      // cadastrar mas não confirmou o OTP. O Supabase Auth já reenviou o e-mail,
      // então podemos apenas ignorar o erro do banco e ir para a tela de OTP.
      if (dbError && dbError.code !== '23505') {
        throw dbError;
      }

      setLoginSuccessMsg('Código de verificação enviado para seu e-mail!');
      setNomeRegister('');
      setTelefoneRegister('');
      setSenhaDigitada('');
      setLoginView('verify_otp_signup');
    } catch (err) {
      setErroLogin(true);
      if (err.message && err.message.toLowerCase().includes('user already registered')) {
        setErroLoginMsg('Este e-mail já possui um cadastro no sistema. Faça o login!');
      } else if (err.message && err.message.toLowerCase().includes('violates row-level security policy')) {
        setErroLoginMsg('Seu e-mail já está pré-cadastrado no sistema. Por favor, tente fazer o login com a senha que você acabou de criar, ou redefina sua senha.');
      } else {
        setErroLoginMsg(`Erro no cadastro: ${err.message}`);
      }
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setIsAuthLoading(true);
    setErroLogin(false);
    setErroLoginMsg('');
    setLoginSuccessMsg('');
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(emailLogin, {
        redirectTo: window.location.origin,
      });
      if (error) throw error;
      setLoginSuccessMsg('Código de recuperação enviado! Verifique seu e-mail (e caixa de spam).');
      setLoginView('verify_otp_reset');
    } catch (err) {
      setErroLogin(true);
      setErroLoginMsg(`Erro: ${err.message}`);
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setIsAuthLoading(true);
    setErroLogin(false);
    setErroLoginMsg('');
    try {
      const { error } = await supabase.auth.updateUser({ password: senhaDigitada });
      if (error) throw error;
      
      // Remove a flag de troca obrigatória, se existir
      const targetEmail = currentUser?.email || emailLogin;
      if (targetEmail) {
        await supabase.rpc('clear_needs_password_change', { p_email: targetEmail.trim().toLowerCase() });
      }

      setLoginSuccessMsg('Senha atualizada com sucesso! Faça login.');
      setSenhaDigitada('');
      isRecoveryRef.current = false;
      setLoginView('login');
      await supabase.auth.signOut();
    } catch (err) {
      setErroLogin(true);
      setErroLoginMsg(`Erro ao atualizar senha: ${err.message}`);
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleVerifyOtpSignup = async (e) => {
    e.preventDefault();
    setIsAuthLoading(true);
    setErroLogin(false);
    setErroLoginMsg('');
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: emailLogin,
        token: otpCode,
        type: 'signup'
      });
      if (error) throw error;
      setLoginSuccessMsg('E-mail verificado com sucesso! Aguarde a aprovação do administrador.');
      setOtpCode('');
      setLoginView('login');
      await supabase.auth.signOut();
    } catch (err) {
      setErroLogin(true);
      setErroLoginMsg(`Código inválido ou expirado. Verifique e tente novamente.`);
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleVerifyOtpReset = async (e) => {
    e.preventDefault();
    setIsAuthLoading(true);
    setErroLogin(false);
    setErroLoginMsg('');
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: emailLogin,
        token: otpCode,
        type: 'recovery'
      });
      if (error) throw error;
      setLoginSuccessMsg('Código validado! Crie sua nova senha abaixo.');
      setOtpCode('');
      setLoginView('update_password');
    } catch (err) {
      setErroLogin(true);
      setErroLoginMsg(`Código inválido ou expirado. Verifique e tente novamente.`);
    } finally {
      setIsAuthLoading(false);
    }
  };

  const [rawData, setRawData] = useState(initialParsedData);
  const rawDataRef = useRef([]);
  const rawFaturamentoDataRef = useRef([]);
  const rawOperacionalDataRef = useRef([]);
  const rawBscDataRef = useRef([]);
  const rawCustosDataRef = useRef([]);
  const [rawFaturamentoData, setRawFaturamentoData] = useState(initialFaturamentoData);
  const [rawOperacionalData, setRawOperacionalData] = useState(initialOperacionalData);
  const [rawBscData, setRawBscData] = useState(initialBscData);
  const [rawCustosData, setRawCustosData] = useState(initialCustosData);
  
  // Thin Client Views (Fase D)
  const [dreData, setDreData] = useState([]);
  const [gapsData, setGapsData] = useState([]);
  
  const [mapeamentoFiliais, setMapeamentoFiliais] = useState([]);
  const [tarifasMap, setTarifasMap] = useState([]);

  const [error, setError] = useState(null);

  const [sheetUrl, setSheetUrl] = useState('https://docs.google.com/spreadsheets/d/1BeuQJXcR0o9vVb-Xq5vZ4PWSnKE-_Uxf2bkQYylIwS0/edit?gid=0#gid=0');
  const [sheetUrlFaturamento, setSheetUrlFaturamento] = useState('https://docs.google.com/spreadsheets/d/1BeuQJXcR0o9vVb-Xq5vZ4PWSnKE-_Uxf2bkQYylIwS0/edit?gid=2143847273#gid=2143847273');
  const [sheetUrlBsc, setSheetUrlBsc] = useState('https://docs.google.com/spreadsheets/d/1TngDQ58wD8Zz43AHrrtJLGfB2Po_Wqc6LqUzrlTIytw/edit?gid=1433063454#gid=1433063454');
  const [sheetUrlCustos, setSheetUrlCustos] = useState('https://docs.google.com/spreadsheets/d/1zabomWsXNX1xwZbj0xNRx683re1QAYFcPYackB2kXU0/edit?gid=1452775904#gid=1452775904');

  const [percentualImpostoFinanceiro, setPercentualImpostoFinanceiro] = useState(6.56);

  const [isLoading, setIsLoading] = useState(false);
  const [filtroQuinzenas, setFiltroQuinzenas] = useSessionStorage('dashop_filtroQuinzenas', []);
  const [filtroRegionais, setFiltroRegionais] = useSessionStorage('dashop_filtroRegionais', []);
  const [filtroSupervisores, setFiltroSupervisores] = useSessionStorage('dashop_filtroSupervisores', []);
  const [filtroFiliais, setFiltroFiliais] = useSessionStorage('dashop_filtroFiliais', []);
  const [filtroDiasSemana, setFiltroDiasSemana] = useSessionStorage('dashop_filtroDiasSemana', []);
  const [insucessosExcluidos, setInsucessosExcluidos] = useSessionStorage('dashop_insucessosExcluidos', []);

  const activeMenu = useMemo(() => {
    const p = location.pathname;
    if (p === '/' || p === '/home') return 'home';
    if (p.startsWith('/financeiro/detalhes')) return 'detalhe_financeiro';
    if (p.startsWith('/financeiro/margem')) return 'gestao_margem';
    if (p.startsWith('/financeiro')) return 'gestao_financeira';
    if (p.startsWith('/operacional/penalidades')) return 'gestao_penalidades';
    if (p.startsWith('/operacional/bsc/comparativo')) return 'comparativo_bsc';
    if (p.startsWith('/operacional/bsc')) return 'gestao_bsc';
    if (p.startsWith('/operacional/gaps')) return 'gaps_operacionais';
    if (p.startsWith('/operacional')) return 'gestao_operacional';
    if (p.startsWith('/treinamentos')) return 'painel_treinamentos';
    if (p.startsWith('/frota')) return 'disponibilidade_frota';
    if (p.startsWith('/motoristas')) return 'gestao_motoristas';
    if (p.startsWith('/simulador')) return 'simulador';
    if (p.startsWith('/dre/custos')) return 'dre_custos';
    if (p.startsWith('/dre/leves')) return 'dre_leves';
    if (p.startsWith('/dre/viabilidade')) return 'dre_viabilidade';
    if (p.startsWith('/dre/gerencial')) return 'dre_gerencial';
    if (p.startsWith('/importador')) return 'importador';
    if (p.startsWith('/configuracoes/filiais')) return 'config_filiais';
    if (p.startsWith('/configuracoes/tarifas')) return 'config_tarifas';
    if (p.startsWith('/usuarios')) return 'gestao_usuarios';
    if (p.startsWith('/explorador')) return 'explorador_dados';
    if (p.startsWith('/configuracoes')) return 'configuracoes';
    return isOpMode ? 'gestao_penalidades' : 'gestao_financeira';
  }, [location.pathname, isOpMode]);

  useEffect(() => {
    const hasFinanceiro = isUserAdmin || (!isOpMode && !isImporter) || userPermissions?.includes('gestao_financeira');
    const hasPlanejamento = isUserAdmin || (!isOpMode && !isImporter) || userPermissions?.includes('planejamento');
    const hasOperacional = isUserAdmin || !isImporter || userPermissions?.includes('gestao_operacional');
    const hasImportador = isUserAdmin || isImporter || userPermissions?.includes('importador');
    const hasConfig = isUserAdmin || userPermissions?.includes('configuracoes');

    const financeiroMenus = ['gestao_financeira', 'detalhe_financeiro', 'gestao_margem', 'dre_gerencial'];
    const planejamentoMenus = ['analise_custos', 'dre_custos', 'dre_leves', 'dre_viabilidade', 'simulador'];
    
    if (isImporter && !hasFinanceiro && !hasPlanejamento && !hasOperacional && !hasConfig && activeMenu !== 'importador') {
      navigate('/importador', { replace: true });
    } else if (!hasFinanceiro && financeiroMenus.includes(activeMenu)) {
      navigate('/operacional/penalidades', { replace: true });
    } else if (!hasPlanejamento && planejamentoMenus.includes(activeMenu)) {
      navigate('/operacional/penalidades', { replace: true });
    }
  }, [isImporter, isOpMode, isUserAdmin, userPermissions, activeMenu, navigate]);
  const mainScrollRef = useRef(null);
  useEffect(() => { if (mainScrollRef.current) mainScrollRef.current.scrollTo({ top: 0, behavior: 'smooth' }); }, [activeMenu]);
  const [expandedMenus, setExpandedMenus] = useSessionStorage('dashop_expandedMenus', { financeiro: true, operacional: true, analise_custos: false, configuracoes: false });

  const toggleExpandedMenu = (menuKey, e) => {
    e.stopPropagation();
    setExpandedMenus(prev => ({ ...prev, [menuKey]: !prev[menuKey] }));
  };
  const [financeiroSubTab, setFinanceiroSubTab] = useSessionStorage('dashop_financeiroSubTab', 'resumo');
  const [exportingType, setExportingType] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'desc' });
  const [selectedQuinzenaPareto, setSelectedQuinzenaPareto] = useState(null);
  const [selectedQuinzenaDS, setSelectedQuinzenaDS] = useState(null);

  const [hasInitialSynced, setHasInitialSynced] = useState(false);
  // Fonte de Dados agora é exclusivamente Supabase
  const dataSource = 'supabase';

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
    let path = '/home';
    if (menu === 'home') path = '/home';
    else if (menu === 'detalhe_financeiro') path = '/financeiro/detalhes';
    else if (menu === 'gestao_margem') path = '/financeiro/margem';
    else if (menu === 'gestao_financeira') path = '/financeiro';
    else if (menu === 'gestao_penalidades') path = '/operacional/penalidades';
    else if (menu === 'comparativo_bsc') path = '/operacional/bsc/comparativo';
    else if (menu === 'gestao_bsc') path = '/operacional/bsc';
    else if (menu === 'gaps_operacionais') path = '/operacional/gaps';
    else if (menu === 'gestao_operacional') path = '/operacional';
    else if (menu === 'painel_treinamentos') path = '/treinamentos';
    else if (menu === 'disponibilidade_frota') path = '/frota';
    else if (menu === 'gestao_motoristas') path = '/motoristas';
    else if (menu === 'simulador') path = '/simulador';
    else if (menu === 'analise_custos') path = '/dre/custos';
    else if (menu === 'dre_custos') path = '/dre/custos';
    else if (menu === 'dre_leves') path = '/dre/leves';
    else if (menu === 'dre_viabilidade') path = '/dre/viabilidade';
    else if (menu === 'dre_gerencial') path = '/dre/gerencial';
    else if (menu === 'importador') path = '/importador';
    else if (menu === 'config_filiais') path = '/configuracoes/filiais';
    else if (menu === 'config_tarifas') path = '/configuracoes/tarifas';
    else if (menu === 'gestao_usuarios') path = '/usuarios';
    else if (menu === 'explorador_dados') path = '/explorador';
    else if (menu === 'configuracoes') path = '/configuracoes';

    navigate(path);
    setSortConfig({ key: null, direction: 'desc' });
    setIsMobileMenuOpen(false);
  };
  const setActiveMenu = handleMenuChange;

  const hasActiveFilters = filtroQuinzenas.length > 0 || filtroRegionais.length > 0 || filtroSupervisores.length > 0 || filtroFiliais.length > 0 || insucessosExcluidos.length > 0 || filtroDiasSemana.length > 0;

  const clearAllFilters = () => {
    setFiltroQuinzenas([]);
    setFiltroRegionais([]);
    setFiltroSupervisores([]);
    setFiltroFiliais([]);
    setFiltroDiasSemana([]);
    setInsucessosExcluidos([]);
  };

  const processRawCSV = useCallback((text) => {
    try {
      const lines = text.split('\n').filter(line => line.trim() !== '');
      if (lines.length < 2) return;
      const delimiter = lines[0].includes(';') ? ';' : ',';
      const rawHeaders = parseCSVLine(lines[0], delimiter).map(h => h.trim());
      const headers = rawHeaders.map(normalizeHeader);

      let idxQuinzena = headers.findIndex(h => h.includes('quinzena') || h.includes('data') || h.includes('periodo') || h.includes('mes') || h.includes('ciclo'));
      if (idxQuinzena === -1) idxQuinzena = 0;

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
        const quinzena = normalizeQuinzena(cols[idxQuinzena]);
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
          tipo: tipoFinal, valor, id_pacote, id_rota, dia_semana: 'N/A'
        });
      }
      setRawData(parsed);
      setError(null);
      return parsed;
    } catch (err) { setError('Erro ao processar Penalidades. Verifique a planilha.'); }
  }, []);

  const processFaturamentoData = useCallback((text) => {
    try {
      const lines = text.split('\n').filter(line => line.trim() !== '');
      if (lines.length < 2) return;
      const delimiter = lines[0].includes(';') ? ';' : ',';
      const rawHeaders = parseCSVLine(lines[0], delimiter).map(h => h.trim());
      const headers = rawHeaders.map(normalizeHeader);

      let idxQuinzena = headers.findIndex(h => h.includes('quinzena') || h.includes('data') || h.includes('periodo') || h.includes('mes') || h.includes('ciclo'));
      if (idxQuinzena === -1) idxQuinzena = 0;

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
        const quinzena = normalizeQuinzena(cols[idxQuinzena]);
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
          parsed.push({ quinzena, regional, supervisor, filial, motorista, id_rota, categoria, faturamento, dia_semana: 'N/A' });
        }
      }
      if (parsed.length > 0) setRawFaturamentoData(parsed);
      setError(null);
      return parsed;
    } catch (err) { setError('Erro ao processar Faturamento. Verifique a planilha.'); }
  }, []);


  const processBscData = useCallback((text) => {
    try {
      const lines = text.split('\n').filter(line => line.trim() !== '');
      if (lines.length < 2) return;
      const delimiter = lines[0].includes(';') ? ';' : ',';
      const rawHeaders = parseCSVLine(lines[0], delimiter).map(h => h.trim());
      const headers = rawHeaders.map(normalizeHeader);

      let idxQuinzena = headers.findIndex(h => h.includes('quinzena') || h.includes('data') || h.includes('periodo') || h.includes('mes') || h.includes('ciclo'));
      if (idxQuinzena === -1) idxQuinzena = 0;

      let idxRegional = 38;
      let idxSupervisor = 39;

      const idxFilial = headers.findIndex(h => h.includes('filial') || h.includes('operacao') || h.includes('base') || h.includes('unidade'));

      let idxCluster = headers.findIndex(h => h.includes('cluster'));
      if (idxCluster === -1) idxCluster = 10;

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

      let idxSaldo = headers.findIndex(h => (h === 'saldo' || h.includes('saldo') || h.includes('pacote') || h.includes('volume') || h.includes('envio')) && !h.includes('insucesso') && !h.includes('falha'));
      if (idxSaldo === -1) idxSaldo = headers.findIndex(h => h.startsWith('total') && !h.includes('insucesso') && !h.includes('desconto'));

      const idxEntregues = headers.findIndex(h => (h === 'entregues' || h.includes('entreg') || h.includes('sucesso') || h.includes('realizado')) && !h.includes('%') && !h.includes('taxa') && !h.includes('insucesso'));

      let idxDiaSemana = 40;

      const insucessosHeaders = [];
      for (let j = 29; j <= 37; j++) {
        if (rawHeaders[j] && rawHeaders[j].trim() !== '') {
          insucessosHeaders.push({ index: j, name: rawHeaders[j].trim() });
        }
      }

      const parsed = [];
      for (let i = 1; i < lines.length; i++) {
        let cols = parseCSVLine(lines[i], delimiter);
        const filialRaw = idxFilial !== -1 ? cols[idxFilial] : 'N/A';
        if (!filialRaw || filialRaw.trim().toUpperCase() === '#N/A') continue;
        const filial = filialRaw;

        const quinzena = normalizeQuinzena(cols[idxQuinzena]);
        const regional = cols[idxRegional] ? extractRegional(cols[idxRegional]) : 'N/A';
        const supervisor = cols[idxSupervisor] ? cols[idxSupervisor].trim() : 'N/A';
        const clusterRaw = cols[idxCluster] ? String(cols[idxCluster]).trim() : '';
        const cluster = clusterRaw && clusterRaw !== '-' && clusterRaw.toUpperCase() !== 'N/A' ? clusterRaw : 'Ambulâncias';
        const motorista = cols[idxMotorista] && String(cols[idxMotorista]).trim() !== '' ? String(cols[idxMotorista]).trim() : 'N/A';
        const id_rota = cols[idxIdRota] && String(cols[idxIdRota]).trim() !== '' ? String(cols[idxIdRota]).trim() : '-';

        const saldoRaw = idxSaldo !== -1 ? cols[idxSaldo] : cols[15];
        const entreguesRaw = idxEntregues !== -1 ? cols[idxEntregues] : cols[17];

        let saldoOriginal = parseNumber(saldoRaw);
        let entregues = parseNumber(entreguesRaw);

        const insucessosDetalhados = {};

        insucessosHeaders.forEach(h => {
          const v = parseNumber(cols[h.index]);
          if (v > 0) {
            insucessosDetalhados[h.name] = v;
          }
        });

        let saldo = Math.max(0, saldoOriginal);
        const dia_semana = cols[idxDiaSemana] ? formatDiaSemana(cols[idxDiaSemana]) : 'N/A';

        const somaIns = Object.values(insucessosDetalhados).reduce((a, b) => a + b, 0);
        if (saldo > 0 || entregues > 0 || somaIns > 0) {
          parsed.push({ quinzena, regional, supervisor, filial, cluster, motorista, id_rota, saldo, entregues, insucessosDetalhados, dia_semana });
        }
      }
      if (parsed.length > 0) setRawBscData(parsed);
      setError(null);
      return parsed;
    } catch (err) { setError('Erro ao processar Operacional BSC. Verifique a planilha.'); }
  }, []);

  const processCustosData = useCallback((text) => {
    try {
      const lines = text.split('\n').filter(line => line.trim() !== '');
      if (lines.length < 2) return;
      const delimiter = lines[0].includes(';') ? ';' : ',';

      const parsedData = [];
      for (let i = 1; i < lines.length; i++) {
        const row = parseCSVLine(lines[i], delimiter);
        if (row.length < 47) continue;

        const quinzena = row[4] ? row[4].trim() : '';
        const filial = row[7] ? row[7].trim() : '';
        const parseValor = (valStr) => {
          if (!valStr) return 0;
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
          if (isNaN(num)) return 0;
          return isNegative ? -num : num;
        };

        const valorPagoRaw = row[46] ? row[46].trim() : '0';

        if (!quinzena || !filial || quinzena === '#N/D') continue;

        const valorPago = parseValor(valorPagoRaw);
        const receitaBase = parseValor(row[51]);
        const receitaParadas = parseValor(row[60]);

        parsedData.push({
          quinzena,
          filial: normalizeText(filial),
          categoria: row[17] ? row[17].trim() : 'Outros',
          valorPago,
          receitaTotal: receitaBase + receitaParadas
        });
      }
      setRawCustosData(parsedData);
      return parsedData;
    } catch (err) {
      console.error("Erro ao processar custos", err);
    }
  }, []);


  const syncToSupabase = async (collectionName, dataArray) => {
    // A gravação pesada foi migrada para o DataImporter,
    // Este stub evita quebrar componentes legados que chamam syncTosupabase (agora syncToSupabase)
    console.log(`[Supabase] Gravação de ${collectionName} direcionada para o Backend.`);
  };
  // Helper para Cache no Navegador (IndexedDB)
  const idbPromise = useMemo(() => {
    return new Promise((resolve, reject) => {
      const request = window.indexedDB.open('DashopDB', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('cache');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }, []);

  const getCache = async (key) => {
    try {
      const db = await idbPromise;
      return new Promise((resolve) => {
        const tx = db.transaction('cache', 'readonly');
        const req = tx.objectStore('cache').get(key);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
      });
    } catch { return null; }
  };

  const setCache = async (key, val) => {
    try {
      const db = await idbPromise;
      return new Promise((resolve) => {
        const tx = db.transaction('cache', 'readwrite');
        tx.objectStore('cache').put(val, key);
        tx.oncomplete = () => resolve();
      });
    } catch {}
  };

  const clearCache = async () => {
    try {
      const db = await idbPromise;
      await new Promise((resolve) => {
        const tx = db.transaction('cache', 'readwrite');
        tx.objectStore('cache').clear();
        tx.oncomplete = () => resolve();
      });
      const { data: files } = await supabase.storage.from('dados_json').list();
      if (files && files.length > 0) {
        await supabase.storage.from('dados_json').remove(files.map(f => f.name));
        console.log('[Storage] JSON cache cleared from Supabase.');
      }
    } catch (e) {
      console.error('Error clearing cache:', e);
    }
  };

  const fetchFromSupabase = useCallback(async (forceRefresh = false) => {
    setIsLoading(true); setError(null);
    if (forceRefresh) {
      await clearCache();
      console.log('Cache limpo manualmente.');
    }
    
    try {
      const extractItems = async (tableName) => {
        const cacheKey = `supabase_${tableName}`;
        
        // 1. Tentar ler do IndexedDB (Cache Instantâneo Local)
        if (!forceRefresh) {
            const cached = await getCache(cacheKey);
            if (cached && (new Date().getTime() - cached.timestamp < 12 * 60 * 60 * 1000)) {
               console.log(`[IndexedDB] Carregado: ${tableName}`);
               return cached.data;
            }
        }

        // 2. Tentar baixar do Supabase Storage (Cache na Nuvem - Muito Rápido)
        if (!forceRefresh) {
            try {
              console.log(`[Storage] Tentando baixar ${tableName}.json...`);
              const { data: fileData, error: downloadError } = await supabase.storage.from('dados_json').download(`${tableName}.json`);
              if (!downloadError && fileData) {
                const text = await fileData.text();
                const jsonData = JSON.parse(text);
                console.log(`[Storage] Download concluído: ${tableName}`);
                await setCache(cacheKey, { timestamp: new Date().getTime(), data: jsonData });
                return jsonData;
              }
            } catch (e) {
              console.warn(`[Storage] Arquivo ${tableName}.json não encontrado, buscando do banco...`);
            }
        }

        // 3. Fallback: Baixar do Banco de Dados Linha por Linha (Lento - Primeira vez)
        console.log(`[Database] Baixando ${tableName} do banco (Lento)...`);
        const { count, error: countError } = await supabase.from(tableName).select('*', { count: 'exact', head: true });
        if (countError || !count) return [];

        const limit = 1000;
        let allData = [];

        for (let start = 0; start < count; start += (limit * 3)) {
          const promises = [];
          for (let i = 0; i < 3; i++) {
            const currentStart = start + (i * limit);
            if (currentStart >= count) break;
            promises.push(supabase.from(tableName).select('*').range(currentStart, currentStart + limit - 1));
          }
          const results = await Promise.all(promises);
          for (const res of results) {
            if (res.data) allData = allData.concat(res.data);
          }
        }
        
        // 4. Salvar no Storage para os próximos usuários
        try {
           const jsonString = JSON.stringify(allData);
           const blob = new Blob([jsonString], { type: 'application/json' });
           const { error: uploadError } = await supabase.storage.from('dados_json').upload(`${tableName}.json`, blob, {
             upsert: true,
             contentType: 'application/json'
           });
           if (uploadError) console.error(`[Storage] Erro ao salvar ${tableName}.json:`, uploadError);
           else console.log(`[Storage] Salvo com sucesso: ${tableName}.json`);
        } catch (e) { console.error(e); }

        // 5. Salvar no IndexedDB
        await setCache(cacheKey, { timestamp: new Date().getTime(), data: allData });
        return allData;
      };

      const [
        capcar,
        custosFinanceirosRaw,
        tarifasAtuais,
        viewDreDataRaw,
        viewGapsDataRaw
      ] = await Promise.all([
        extractItems('capcar'),
        extractItems('custos'),
        extractItems('tarifas'),
        extractItems('view_dre_custo_leve'),
        extractItems('view_gaps_operacionais_bsc')
      ]);

      const custosFinanceiros = custosFinanceirosRaw.filter(d => d.tipo === 'Financeiro');
      const mergedCustos = [...custosFinanceiros, ...capcar];

      const mapeamento = await extractItems('mapeamento_filiais');

      // Arrays Legados: Removidos Definitivamente (D4). Instanciamos como arrays vazios
      // para não quebrar componentes que ainda aguardam as props originais.
      setRawData([]);
      if (rawDataRef) rawDataRef.current = [];
      setRawFaturamentoData([]);
      if (rawFaturamentoDataRef) rawFaturamentoDataRef.current = [];
      setRawOperacionalData([]);
      if (rawOperacionalDataRef) rawOperacionalDataRef.current = [];
      setRawBscData([]);
      if (rawBscDataRef) rawBscDataRef.current = [];

      setRawCustosData(mergedCustos);
      if (rawCustosDataRef) rawCustosDataRef.current = mergedCustos;

      const getRegSup = (filial, d) => {
        const fKey = normalizeText(filial || '');
        const mapped = mapeamento.find(m => normalizeText(m.filial || '') === fKey);
        return mapped ? { regional: mapped.regional, supervisor: mapped.supervisor } : { regional: d.regional || 'Sem Regional', supervisor: d.supervisor || 'Sem Supervisor' };
      };

      // AUTO-REGISTRO DE NOVAS FILIAIS
      // Qualquer filial não mapeada descoberta nos dados ganha um registro no banco
      const allViewData = [...(viewDreDataRaw || []), ...(viewGapsDataRaw || [])];
      const unmapped = new Map();
      allViewData.forEach(d => {
         const fNorm = normalizeText(d.filial || '');
         if (fNorm && fNorm !== 'N/A' && fNorm !== 'SEM NOME' && fNorm !== 'N/D') {
            const isMapped = mapeamento.some(m => normalizeText(m.filial || '') === fNorm);
            if (!isMapped && !unmapped.has(fNorm)) {
               unmapped.set(fNorm, { 
                 filial: d.filial, 
                 regional: (d.regional && d.regional !== 'N/A') ? d.regional : '', 
                 supervisor: (d.supervisor && d.supervisor !== 'N/A') ? d.supervisor : '' 
               });
            }
         }
      });
      if (unmapped.size > 0) {
         const newFiliais = Array.from(unmapped.values());
         // Insere as filiais novatas sem bloquear a UI e sem duplicar (upsert)
         supabase.from('mapeamento_filiais').upsert(newFiliais, { onConflict: 'filial' })
            .then(({ error }) => { if (!error) console.log('[Auto-Save] Filiais registradas:', newFiliais.length); });
         // Aplica os novos mapeamentos à lista local na hora
         mapeamento.push(...newFiliais);
      }

      setDreData((viewDreDataRaw || []).map(d => ({ 
        ...d, 
        faturamento_total: Number(d.faturamento_total) || 0,
        faturamento_base: Number(d.faturamento_base) || 0,
        faturamento_paradas: Number(d.faturamento_paradas) || 0,
        penalidades: Number(d.penalidades) || 0,
        custo_capcar_pago: Number(d.custo_capcar_pago) || 0,
        custo_capcar_devido: Number(d.custo_capcar_devido) || 0,
        receita_capcar: Number(d.receita_capcar) || 0,
        faturamento: Number(d.faturamento_total) || 0, // Compatibilidade com código legado!
        ...getRegSup(d.filial, d) 
      })));
      setGapsData((viewGapsDataRaw || []).map(d => ({ ...d, ...getRegSup(d.filial, d) })));

      setMapeamentoFiliais(mapeamento);
      setTarifasMap(tarifasAtuais);

    } catch (err) {
      console.error(err);
      setError("Erro ao ler do supabase: " + String(err));
    } finally {
      setIsLoading(false);
    }
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
      const d1 = t1 ? processRawCSV(t1) : null;

      const t2 = await fetchCSV(sheetUrlFaturamento, 'Faturamento');
      const d2 = t2 ? processFaturamentoData(t2) : null;


      const t4 = await fetchCSV(sheetUrlBsc, 'BSC');
      const d4 = t4 ? processBscData(t4) : null;

      const t5 = await fetchCSV(sheetUrlCustos, 'Custos Financeiros');
      const d5 = t5 ? processCustosData(t5) : null;

      console.log('[Sheets] Dados carregados das planilhas (sem enviar ao supabase).');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
    finally { setIsLoading(false); }
  }, [sheetUrl, sheetUrlFaturamento, sheetUrlBsc, sheetUrlCustos, processRawCSV, processFaturamentoData, processBscData, processCustosData]);

  useEffect(() => {
    if (isAuthenticated && !hasInitialSynced) {
      if (dataSource === 'supabase') {
        fetchFromSupabase(false);
      } else {
        fetchFromGoogleSheets();
      }
      setHasInitialSynced(true);
    }
  }, [isAuthenticated, hasInitialSynced, fetchFromSupabase, fetchFromGoogleSheets, dataSource]);

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

  const getRegionalSupervisor = (filial, d) => {
    const fKey = normalizeText(filial);
    const mapped = mapeamentoFiliais.find(m => normalizeText(m.filial) === fKey);
    return mapped ? { regional: mapped.regional, supervisor: mapped.supervisor } : { regional: d.regional, supervisor: d.supervisor };
  };


  const [distributedDados, setDistributedDados] = useState([]);
  const [distributedFaturamento, setDistributedFaturamento] = useState([]);
  const [distributedOperacional, setDistributedOperacional] = useState([]);
  const [distributedBsc, setDistributedBsc] = useState([]);

  const [quinzenasDisponiveis, setQuinzenasDisponiveis] = useState([]);
  const [regionaisDisponiveis, setRegionaisDisponiveis] = useState([]);
  const [supervisoresDisponiveis, setSupervisoresDisponiveis] = useState([]);
  const [filiaisDisponiveis, setFiliaisDisponiveis] = useState([]);
  const [diasSemanaDisponiveis, setDiasSemanaDisponiveis] = useState([]);
  const [isCalculatingUI, setIsCalculatingUI] = useState(false);

  useEffect(() => {
    let isCancelled = false;
    const compute = async () => {
      // Thin Client: dropdowns are loaded directly from the ultra-fast aggregated views!
      if (dreData.length === 0 && gapsData.length === 0) return;
      setIsCalculatingUI(true);

      const getAllUnique = async (arrs, key) => {
        const set = new Set();
        for (const arr of arrs) {
          for (let i = 0; i < arr.length; i += 1000) {
            const chunk = arr.slice(i, i + 1000);
            for (const item of chunk) {
              if (item[key] && String(item[key]).trim() !== '') set.add(item[key]);
            }
            await new Promise(r => setTimeout(r, 0));
          }
        }
        return [...set];
      };

      const qList = await getAllUnique([dreData, gapsData], 'quinzena');
      if (isCancelled) return;
      setQuinzenasDisponiveis(qList.sort((a, b) => {
        if (a === 'N/A' || a === 'GERAL') return 1;
        if (b === 'N/A' || b === 'GERAL') return -1;
        return String(b).localeCompare(String(a));
      }));

      const rList = await getAllUnique([dreData, gapsData], 'regional');
      if (isCancelled) return;
      setRegionaisDisponiveis(rList.filter(r => r !== 'N/A').sort());

      setDiasSemanaDisponiveis([]); // O Thin Client consolida dias da semana no backend

      // Mock legacy distributed arrays so we don't break isolated components like DreAnaliseCusto
      setDistributedDados(gapsData.map(d => ({ ...d, motorista: d.motorista, valor: d.total_desconto_penalidades })));
      setDistributedFaturamento(dreData);
      setDistributedOperacional([]);
      setDistributedBsc([]);

      setIsCalculatingUI(false);
    };

    compute();
    return () => { isCancelled = true; };
  }, [dreData, gapsData]);

  // Dropdowns que dependem do filtro selecionado, calculados num useEffect separado e leve
  useEffect(() => {
    let isCancelled = false;
    const computeFilters = async () => {
      const matchReg = (r) => filtroRegionais.length === 0 || !filtroRegionais.includes(r);
      const matchSup = (s) => filtroSupervisores.length === 0 || !filtroSupervisores.includes(s);

      const sSet = new Set();
      const fSet = new Set();
      const arrays = [dreData, gapsData];

      for (const arr of arrays) {
        for (let i = 0; i < arr.length; i += 2000) {
          if (isCancelled) return;
          const chunk = arr.slice(i, i + 2000);
          for (const d of chunk) {
            if (matchReg(d.regional)) {
              if (d.supervisor && d.supervisor !== 'N/A') sSet.add(d.supervisor);
              if (matchSup(d.supervisor) && d.filial && d.filial !== 'N/A') fSet.add(d.filial);
            }
          }
          await new Promise(r => setTimeout(r, 0));
        }
      }

      setSupervisoresDisponiveis([...sSet].sort());
      setFiliaisDisponiveis([...fSet].sort());
    };
    computeFilters();
    return () => { isCancelled = true; };
  }, [dreData, gapsData, filtroRegionais, filtroSupervisores]);

  const matchFiltro = (val, arr) => !arr.includes(val);

  // Thin Client Views Filtradas
  const dreDataFiltrado = useMemo(() => {
    return dreData.filter(d =>
      matchFiltro(d.quinzena, filtroQuinzenas) &&
      matchFiltro(d.filial, filtroFiliais) &&
      matchFiltro(d.regional, filtroRegionais) &&
      matchFiltro(d.supervisor, filtroSupervisores)
    );
  }, [dreData, filtroQuinzenas, filtroFiliais, filtroRegionais, filtroSupervisores]);

  const gapsDataFiltrado = useMemo(() => {
    return gapsData.filter(d =>
      matchFiltro(d.quinzena, filtroQuinzenas) &&
      matchFiltro(d.filial, filtroFiliais) &&
      matchFiltro(d.regional, filtroRegionais) &&
      matchFiltro(d.supervisor, filtroSupervisores)
    );
  }, [gapsData, filtroQuinzenas, filtroFiliais, filtroRegionais, filtroSupervisores]);

  const gapsDataEvolucao = useMemo(() => {
    return gapsData.filter(d =>
      matchFiltro(d.filial, filtroFiliais) &&
      matchFiltro(d.regional, filtroRegionais) &&
      matchFiltro(d.supervisor, filtroSupervisores)
    );
  }, [gapsData, filtroFiliais, filtroRegionais, filtroSupervisores]);

  const dreDataEvolucao = useMemo(() => {
    return dreData.filter(d =>
      matchFiltro(d.filial, filtroFiliais) &&
      matchFiltro(d.regional, filtroRegionais) &&
      matchFiltro(d.supervisor, filtroSupervisores)
    );
  }, [dreData, filtroFiliais, filtroRegionais, filtroSupervisores]);

  // Mapeamentos para as variáveis legadas continuarem alimentando a UI (Thin Client)
  const dadosFiltrados = useMemo(() => {
    const result = [];
    gapsDataFiltrado.forEach(d => {
      const base = { quinzena: d.quinzena, filial: d.filial, regional: d.regional, supervisor: d.supervisor, motorista: d.motorista };
      if ((d.valor_not_visited || 0) > 0 || (d.qtd_not_visited || 0) > 0) result.push({ ...base, tipo: 'Not Visited', valor: d.valor_not_visited || 0, _pesoQtd: d.qtd_not_visited || 0 });
      if ((d.valor_pnr || 0) > 0 || (d.qtd_pnr || 0) > 0) result.push({ ...base, tipo: 'PNRs', valor: d.valor_pnr || 0, _pesoQtd: d.qtd_pnr || 0 });
      if ((d.valor_lost || 0) > 0 || (d.qtd_lost || 0) > 0) result.push({ ...base, tipo: 'Lost Packages', valor: d.valor_lost || 0, _pesoQtd: d.qtd_lost || 0 });
      if ((d.valor_outros || 0) > 0) result.push({ ...base, tipo: 'Outros', valor: d.valor_outros || 0, _pesoQtd: 0 });
    });
    return result;
  }, [gapsDataFiltrado]);

  const faturamentoFiltrado = dreDataFiltrado;

  const custosFiltrados = useMemo(() => {
    const validKeys = new Set(faturamentoFiltrado.map(f => `${f.filial}|${f.quinzena}`));
    return rawCustosData.filter(c => validKeys.has(`${c.filial}|${c.quinzena}`));
  }, [rawCustosData, faturamentoFiltrado]);

  const operacionalFiltrado = useMemo(() => {
    return dreDataFiltrado.map(d => ({
      quinzena: d.quinzena, filial: d.filial, regional: d.regional, supervisor: d.supervisor,
      entregues: d.pacotes_entregues, saldo: d.pacotes_saldo, insucessosDetalhados: {}
    }));
  }, [dreDataFiltrado]);

  const bscFiltrado = useMemo(() => {
    return gapsDataFiltrado.map(d => ({
      quinzena: d.quinzena, filial: d.filial, regional: d.regional, supervisor: d.supervisor, motorista: d.motorista,
      entregues: d.pacotes_entregues, saldo: d.pacotes_saldo,
      insucessosDetalhados: { 'Not Visited': d.qtd_not_visited, 'PNRs': d.qtd_pnr, 'Lost Packages': d.qtd_lost }
    }));
  }, [gapsDataFiltrado]);

  // NOVOS DATASETS DE EVOLUÇÃO (IGNORAM O FILTRO DE QUINZENA PARA PRESERVAR HISTÓRICO)
  const faturamentoFiltradoEvolucao = dreDataEvolucao;

  const dadosFiltradosEvolucao = useMemo(() => {
    const result = [];
    gapsDataEvolucao.forEach(d => {
      const base = { quinzena: d.quinzena, filial: d.filial, regional: d.regional, supervisor: d.supervisor, motorista: d.motorista };
      if ((d.valor_not_visited || 0) > 0 || (d.qtd_not_visited || 0) > 0) result.push({ ...base, tipo: 'Not Visited', valor: d.valor_not_visited || 0, _pesoQtd: d.qtd_not_visited || 0 });
      if ((d.valor_pnr || 0) > 0 || (d.qtd_pnr || 0) > 0) result.push({ ...base, tipo: 'PNRs', valor: d.valor_pnr || 0, _pesoQtd: d.qtd_pnr || 0 });
      if ((d.valor_lost || 0) > 0 || (d.qtd_lost || 0) > 0) result.push({ ...base, tipo: 'Lost Packages', valor: d.valor_lost || 0, _pesoQtd: d.qtd_lost || 0 });
      if ((d.valor_outros || 0) > 0) result.push({ ...base, tipo: 'Outros', valor: d.valor_outros || 0, _pesoQtd: 0 });
    });
    return result;
  }, [gapsDataEvolucao]);

  const operacionalFiltradoEvolucao = useMemo(() => {
    return dreDataEvolucao.map(d => ({
      quinzena: d.quinzena, filial: d.filial, regional: d.regional, supervisor: d.supervisor,
      entregues: d.pacotes_entregues, saldo: d.pacotes_saldo, insucessosDetalhados: {}
    }));
  }, [dreDataEvolucao]);

  const bscFiltradoEvolucao = useMemo(() => {
    return gapsDataEvolucao.map(d => ({
      quinzena: d.quinzena, filial: d.filial, regional: d.regional, supervisor: d.supervisor, motorista: d.motorista,
      entregues: d.pacotes_entregues, saldo: d.pacotes_saldo,
      insucessosDetalhados: { 'Not Visited': d.qtd_not_visited, 'PNRs': d.qtd_pnr, 'Lost Packages': d.qtd_lost }
    }));
  }, [gapsDataEvolucao]);

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

  const operacionalSimuladoEvolucao = useMemo(() => {
    return operacionalFiltradoEvolucao.map(d => {
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
      return { ...d, saldo: d.saldo - insucessosDesconsiderados, insucessosDetalhados: newInsucessosDetalhados };
    });
  }, [operacionalFiltradoEvolucao, insucessosExcluidos]);

  const bscSimuladoEvolucao = useMemo(() => {
    return bscFiltradoEvolucao.map(d => {
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
      return { ...d, saldo: d.saldo - insucessosDesconsiderados, insucessosDetalhados: newInsucessosDetalhados };
    });
  }, [bscFiltradoEvolucao, insucessosExcluidos]);

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
    return dreDataFiltrado.reduce((acc, curr) => acc + (curr.faturamento_total || 0), 0);
  }, [dreDataFiltrado]);

  const margemBrutaMetrics = useMemo(() => {
    const totalFat = dreDataFiltrado.reduce((acc, curr) => acc + (curr.faturamento_total || 0), 0);
    const totalCustos = dreDataFiltrado.reduce((acc, curr) => acc + (curr.custo_capcar_pago || 0), 0);
    const impostoDescontado = totalFat * (percentualImpostoFinanceiro / 100);
    const margemErroDescontada = totalFat * 0.025;
    const totalPenalidades = dreDataFiltrado.reduce((acc, curr) => acc + (curr.penalidades || 0), 0);

    const margemBase = totalFat - impostoDescontado - totalCustos - totalPenalidades;
    const margemR$ = margemBase;
    const margemPct = totalFat > 0 ? (margemR$ / totalFat) * 100 : 0;

    return {
      faturamento: totalFat,
      custos: totalCustos,
      imposto: impostoDescontado,
      margemErro: margemErroDescontada,
      penalidades: totalPenalidades,
      margemBase: margemBase,
      margemRS: margemR$,
      margemPct: margemPct
    };
  }, [dreDataFiltrado, percentualImpostoFinanceiro]);

  const [selectedRegionalForMargin, setSelectedRegionalForMargin] = useState(null);
  const [selectedFilialForMargin, setSelectedFilialForMargin] = useState(null);

  const filialToRegionalMap = useMemo(() => {
    const map = {};
    const extract = (data) => {
      data.forEach(d => {
        if (d.filial && d.regional && d.regional !== 'N/A') {
          map[normalizeText(d.filial)] = d.regional;
        }
      });
    };
    extract(dadosFiltrados);
    extract(faturamentoFiltrado);
    extract(operacionalFiltrado);
    extract(bscFiltrado);
    return map;
  }, [dadosFiltrados, faturamentoFiltrado, operacionalFiltrado, bscFiltrado]);

  const margemCategoriaData = useMemo(() => {
    if (!selectedFilialForMargin) return [];
    const map = {};
    const filtrados = custosFiltrados.filter(c => c.filial === selectedFilialForMargin);
    filtrados.forEach(c => {
      const key = normalizeText(c.categoria || 'Outros');
      if (!map[key]) map[key] = { categoria: c.categoria || 'Outros', faturamento: 0, custos: 0 };
      map[key].faturamento += (c.receitaTotal || 0);
      map[key].custos += (c.valorPago || 0);
    });

    return Object.values(map).map(item => {
      const imp = item.faturamento * (percentualImpostoFinanceiro / 100);
      const margemErro = item.faturamento * 0.025;
      const margemBase = item.faturamento - imp - item.custos;
      return {
        ...item,
        margemErro,
        penalidades: item.custos,
        pnr: item.custos,
        lost: 0,
        notVisited: 0,
        margemRS: margemBase,
        representatividade: item.faturamento > 0 ? (margemBase / item.faturamento) * 100 : 0
      };
    }).sort((a, b) => b.faturamento - a.faturamento);
  }, [custosFiltrados, percentualImpostoFinanceiro, selectedFilialForMargin]);

  const margemFilialData = useMemo(() => {
    const map = {};

    faturamentoFiltrado.forEach(f => {
      const fKey = normalizeText(f.filial);
      const reg = filialToRegionalMap[fKey] || 'N/A';
      if (selectedRegionalForMargin && normalizeText(reg) !== normalizeText(selectedRegionalForMargin)) return;

      if (!map[fKey]) map[fKey] = { filial: f.filial, faturamento: 0, custos: 0, penalidades: 0, pnr: 0, lost: 0, notVisited: 0 };
      map[fKey].faturamento += (f.faturamento || 0) + (f.faturamento_paradas || 0);
    });

    dadosFiltrados.forEach(p => {
      const fKey = normalizeText(p.filial);
      if (map[fKey]) {
        map[fKey].penalidades += (p.valor || 0);
        if (p.tipo === 'PNRs') map[fKey].pnr += (p.valor || 0);
        if (p.tipo === 'Lost Packages') map[fKey].lost += (p.valor || 0);
        if (p.tipo === 'Not Visited') map[fKey].notVisited += (p.valor || 0);
      }
    });

    custosFiltrados.forEach(c => {
      const fKey = normalizeText(c.filial);
      const reg = filialToRegionalMap[fKey] || 'N/A';
      if (selectedRegionalForMargin && normalizeText(reg) !== normalizeText(selectedRegionalForMargin)) return;

      if (!map[fKey]) map[fKey] = { filial: c.filial, faturamento: 0, custos: 0, penalidades: 0, pnr: 0, lost: 0, notVisited: 0 };
      map[fKey].custos += (c.valorPago || c.valor || 0);
    });

    return Object.values(map).map(item => {
      const imp = item.faturamento * (percentualImpostoFinanceiro / 100);
      const margemErro = item.faturamento * 0.025;
      const margemBase = item.faturamento - imp - item.custos - item.penalidades;
      return {
        ...item,
        margemErro,
        margemRS: margemBase,
        representatividade: item.faturamento > 0 ? (margemBase / item.faturamento) * 100 : 0
      };
    }).sort((a, b) => b.margemRS - a.margemRS);
  }, [faturamentoFiltrado, dadosFiltrados, custosFiltrados, percentualImpostoFinanceiro, selectedRegionalForMargin, filialToRegionalMap]);

  const margemRegionalDataGlobal = useMemo(() => {
    const map = {};

    faturamentoFiltrado.forEach(f => {
      const fKey = normalizeText(f.filial);
      const reg = filialToRegionalMap[fKey] || 'N/A';
      const key = normalizeText(reg);

      if (!map[key]) map[key] = { regional: reg === 'N/A' ? 'Sem Regional' : `Regional ${reg}`, rawRegional: reg, faturamento: 0, custos: 0, penalidades: 0, pnr: 0, lost: 0, notVisited: 0 };
      map[key].faturamento += (f.faturamento || 0) + (f.faturamento_paradas || 0);
    });

    dadosFiltrados.forEach(p => {
      const fKey = normalizeText(p.filial);
      const reg = filialToRegionalMap[fKey] || 'N/A';
      const key = normalizeText(reg);
      if (map[key]) {
        map[key].penalidades += (p.valor || 0);
        if (p.tipo === 'PNRs') map[key].pnr += (p.valor || 0);
        if (p.tipo === 'Lost Packages') map[key].lost += (p.valor || 0);
        if (p.tipo === 'Not Visited') map[key].notVisited += (p.valor || 0);
      }
    });

    custosFiltrados.forEach(c => {
      const fKey = normalizeText(c.filial);
      const reg = filialToRegionalMap[fKey] || 'N/A';
      const key = normalizeText(reg);

      if (!map[key]) map[key] = { regional: reg === 'N/A' ? 'Sem Regional' : `Regional ${reg}`, rawRegional: reg, faturamento: 0, custos: 0, penalidades: 0, pnr: 0, lost: 0, notVisited: 0 };
      map[key].custos += (c.valorPago || c.valor || 0);
    });

    return Object.values(map).map(item => {
      const imp = item.faturamento * (percentualImpostoFinanceiro / 100);
      const margemErro = item.faturamento * 0.025;
      const margemBase = item.faturamento - imp - item.custos - item.penalidades;
      return {
        ...item,
        margemErro,
        margemRS: margemBase,
        representatividade: item.faturamento > 0 ? (margemBase / item.faturamento) * 100 : 0
      };
    }).sort((a, b) => b.margemRS - a.margemRS);
  }, [faturamentoFiltrado, dadosFiltrados, custosFiltrados, percentualImpostoFinanceiro, filialToRegionalMap]);

  const margemCategoriaDataGlobal = useMemo(() => {
    const map = {};
    custosFiltrados.forEach(c => {
      const key = normalizeText(c.categoria || 'Outros');
      if (!map[key]) map[key] = { categoria: c.categoria || 'Outros', faturamento: 0, custos: 0 };
      map[key].faturamento += (c.receitaTotal || 0);
      map[key].custos += (c.valorPago || 0);
    });

    return Object.values(map).map(item => {
      const imp = item.faturamento * (percentualImpostoFinanceiro / 100);
      const margemBase = item.faturamento - imp - item.custos;
      return {
        ...item,
        margemRS: margemBase,
        representatividade: item.faturamento > 0 ? (margemBase / item.faturamento) * 100 : 0
      };
    }).sort((a, b) => b.margemRS - a.margemRS);
  }, [custosFiltrados, percentualImpostoFinanceiro]);

  const pnrTot = resumoMetrics.categories?.['PNRs'] || { valor: 0, qtd: 0 };
  const lostTot = resumoMetrics.categories?.['Lost Packages'] || { valor: 0, qtd: 0 };
  const nvTot = resumoMetrics.categories?.['Not Visited'] || { valor: 0, qtd: 0 };

  const targetQuinzenaRunRate = useMemo(() => {
    const includedQuinzenas = quinzenasDisponiveis.filter(q => !filtroQuinzenas.includes(q));
    if (includedQuinzenas.length === 1 && filtroQuinzenas.length > 0) return includedQuinzenas[0];

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

  const prevPrevQuinzenaName = useMemo(() => {
    if (!targetQuinzenaRunRate || quinzenasDisponiveis.length < 3) return null;
    const currentIndex = quinzenasDisponiveis.indexOf(targetQuinzenaRunRate);
    if (currentIndex !== -1 && currentIndex + 2 < quinzenasDisponiveis.length) {
      return quinzenasDisponiveis[currentIndex + 2];
    }
    return null;
  }, [quinzenasDisponiveis, targetQuinzenaRunRate]);

  const prevQuinzenaStats = useMemo(() => {
    if (!prevQuinzenaName) return null;
    let fat = 0, pen = 0, pnr = 0, lost = 0, nv = 0;
    const filiaisMap = {};

    faturamentoFiltradoEvolucao.filter(d => d.quinzena === prevQuinzenaName).forEach(d => {
      fat += d.faturamento;
      const key = normalizeText(d.filial);
      if (!filiaisMap[key]) filiaisMap[key] = { fat: 0, pen: 0, pnr: 0, lost: 0, nv: 0, pnrQtd: 0, lostQtd: 0, nvQtd: 0 };
      filiaisMap[key].fat += d.faturamento;
    });

    dadosFiltradosEvolucao.filter(d => d.quinzena === prevQuinzenaName).forEach(d => {
      pen += d.valor;
      if (d.tipo === 'PNRs') pnr += d.valor;
      else if (d.tipo === 'Lost Packages') lost += d.valor;
      else if (d.tipo === 'Not Visited') nv += d.valor;

      const key = normalizeText(d.filial);
      if (!filiaisMap[key]) filiaisMap[key] = { fat: 0, pen: 0, pnr: 0, lost: 0, nv: 0, pnrQtd: 0, lostQtd: 0, nvQtd: 0 };
      filiaisMap[key].pen += d.valor;

      const qtd = d._pesoQtd !== undefined ? d._pesoQtd : 1;
      if (d.tipo === 'PNRs') { filiaisMap[key].pnr += d.valor; filiaisMap[key].pnrQtd += qtd; }
      else if (d.tipo === 'Lost Packages') { filiaisMap[key].lost += d.valor; filiaisMap[key].lostQtd += qtd; }
      else if (d.tipo === 'Not Visited') { filiaisMap[key].nv += d.valor; filiaisMap[key].nvQtd += qtd; }
    });
    return { name: prevQuinzenaName, fat, pen, pnr, lost, nv, filiaisMap };
  }, [dadosFiltradosEvolucao, faturamentoFiltradoEvolucao, prevQuinzenaName]);

  const prevCustosFiltrados = useMemo(() => {
    if (!prevQuinzenaName) return [];
    const prevFaturamento = faturamentoFiltradoEvolucao.filter(d => d.quinzena === prevQuinzenaName);
    const validKeys = new Set(prevFaturamento.map(f => `${f.filial}|${f.quinzena}`));
    return rawCustosData.filter(c => validKeys.has(`${c.filial}|${c.quinzena}`));
  }, [rawCustosData, faturamentoFiltradoEvolucao, prevQuinzenaName]);

  const prevMargemBrutaMetrics = useMemo(() => {
    if (!prevQuinzenaName) return null;
    const prevFaturamento = faturamentoFiltradoEvolucao.filter(d => d.quinzena === prevQuinzenaName);
    const totalFat = prevFaturamento.reduce((acc, curr) => acc + (curr.faturamento || 0) + (curr.faturamento_paradas || 0), 0);
    const totalCustos = prevCustosFiltrados.reduce((acc, curr) => acc + (curr.valorPago || 0), 0);
    const impostoDescontado = totalFat * (percentualImpostoFinanceiro / 100);
    const margemErroDescontada = totalFat * 0.025;

    // Penalidades the previous quinzena (we can use prevQuinzenaStats or calculate again)
    const totalPenalidades = dadosFiltradosEvolucao.filter(d => d.quinzena === prevQuinzenaName).reduce((acc, curr) => acc + (curr.valor || 0), 0);

    const margemBase = totalFat - impostoDescontado - totalCustos - totalPenalidades;
    const margemPct = totalFat > 0 ? (margemBase / totalFat) * 100 : 0;

    return {
      faturamento: totalFat,
      custos: totalCustos,
      penalidades: totalPenalidades,
      margemRS: margemBase,
      margemPct: margemPct
    };
  }, [prevCustosFiltrados, percentualImpostoFinanceiro, dadosFiltradosEvolucao, prevQuinzenaName]);

  const prevPrevMargemBrutaMetrics = useMemo(() => {
    if (!prevPrevQuinzenaName) return null;
    const prevPrevFaturamento = faturamentoFiltradoEvolucao.filter(d => d.quinzena === prevPrevQuinzenaName);
    const validKeys = new Set(prevPrevFaturamento.map(f => `${f.filial}|${f.quinzena}`));
    const custos = rawCustosData.filter(c => validKeys.has(`${c.filial}|${c.quinzena}`));

    const totalFat = prevPrevFaturamento.reduce((acc, curr) => acc + (curr.faturamento || 0) + (curr.faturamento_paradas || 0), 0);
    const totalCustos = custos.reduce((acc, curr) => acc + (curr.valorPago || 0), 0);
    const impostoDescontado = totalFat * (percentualImpostoFinanceiro / 100);

    const totalPenalidades = dadosFiltradosEvolucao.filter(d => d.quinzena === prevPrevQuinzenaName).reduce((acc, curr) => acc + (curr.valor || 0), 0);

    const margemBase = totalFat - impostoDescontado - totalCustos - totalPenalidades;
    const margemPct = totalFat > 0 ? (margemBase / totalFat) * 100 : 0;

    return {
      faturamento: totalFat,
      custos: totalCustos,
      penalidades: totalPenalidades,
      margemRS: margemBase,
      margemPct: margemPct
    };
  }, [rawCustosData, faturamentoFiltradoEvolucao, percentualImpostoFinanceiro, dadosFiltradosEvolucao, prevPrevQuinzenaName]);

  const baseRunRateData = useMemo(() => {
    if (!targetQuinzenaRunRate) return [];
    const map = {};
    faturamentoFiltrado.filter(d => d.quinzena === targetQuinzenaRunRate).forEach(d => {
      const key = normalizeText(d.filial);
      if (!map[key]) map[key] = { filial: d.filial, regional: d.regional || 'N/A', supervisor: d.supervisor || 'N/A', faturamento: 0, penalidades: 0, pnr: 0, lost: 0, notVisited: 0 };
      if (d.regional && d.regional !== 'N/A') map[key].regional = d.regional;
      if (d.supervisor && d.supervisor !== 'N/A') map[key].supervisor = d.supervisor;
      map[key].faturamento += (d.faturamento || 0) + (d.faturamento_paradas || 0);
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
    faturamentoFiltradoEvolucao.forEach(d => {
      const key = d.quinzena || 'N/A';
      if (!map[key]) map[key] = { quinzena: key, faturamento: 0, penalidades: 0, pnr: 0, lost: 0, notVisited: 0 };
      map[key].faturamento += (d.faturamento || 0) + (d.faturamento_paradas || 0);
    });
    dadosFiltradosEvolucao.forEach(d => {
      const key = d.quinzena || 'N/A';
      if (!map[key]) map[key] = { quinzena: key, faturamento: 0, penalidades: 0, pnr: 0, lost: 0, notVisited: 0 };
      map[key].penalidades += d.valor;
      if (d.tipo === 'PNRs') map[key].pnr += d.valor;
      else if (d.tipo === 'Lost Packages') map[key].lost += d.valor;
      else if (d.tipo === 'Not Visited') map[key].notVisited += d.valor;
    });
    return Object.values(map)
      .filter(item => item.faturamento > 0 || item.penalidades > 0)
      .map(item => ({
        ...item,
        representatividade: item.faturamento > 0 ? (item.penalidades / item.faturamento) * 100 : (item.penalidades > 0 ? Infinity : 0)
      })).sort((a, b) => String(b.quinzena).localeCompare(String(a.quinzena)));
  }, [dadosFiltradosEvolucao, faturamentoFiltradoEvolucao]);

  const paretoFilialDrilldownData = useMemo(() => {
    if (!selectedQuinzenaPareto) return [];
    const map = {};
    faturamentoFiltradoEvolucao.filter(d => d.quinzena === selectedQuinzenaPareto).forEach(d => {
      const key = normalizeText(d.filial);
      if (!map[key]) map[key] = { filial: d.filial, faturamento: 0, penalidades: 0, pnr: 0, lost: 0, notVisited: 0 };
      map[key].faturamento += (d.faturamento || 0) + (d.faturamento_paradas || 0);
    });
    dadosFiltradosEvolucao.filter(d => d.quinzena === selectedQuinzenaPareto).forEach(d => {
      const key = normalizeText(d.filial);
      if (!map[key]) map[key] = { filial: d.filial, faturamento: 0, penalidades: 0, pnr: 0, lost: 0, notVisited: 0 };
      map[key].penalidades += d.valor;
      if (d.tipo === 'PNRs') map[key].pnr += d.valor;
      else if (d.tipo === 'Lost Packages') map[key].lost += d.valor;
      else if (d.tipo === 'Not Visited') map[key].notVisited += d.valor;
    });
    return Object.values(map)
      .filter(item => item.faturamento > 0 || item.penalidades > 0)
      .map(item => ({
        ...item,
        representatividade: item.faturamento > 0 ? (item.penalidades / item.faturamento) * 100 : (item.penalidades > 0 ? Infinity : 0)
      })).sort((a, b) => b.faturamento - a.faturamento);
  }, [dadosFiltradosEvolucao, faturamentoFiltradoEvolucao, selectedQuinzenaPareto]);

  const isBscView = activeMenu === 'gestao_bsc';
  const isOpOrBscView = activeMenu === 'gestao_operacional' || activeMenu === 'gestao_bsc';
  const showInsucessosFilter = ['gestao_operacional', 'gestao_bsc', 'gaps_operacionais', 'comparativo_bsc'].includes(activeMenu);

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
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [isBscView, bscSimulado, operacionalSimulado]);

  const dsQuinzenaData = useMemo(() => {
    const dataToUse = isBscView ? bscSimuladoEvolucao : operacionalSimuladoEvolucao;
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
  }, [isBscView, bscSimuladoEvolucao, operacionalSimuladoEvolucao]);

  const dsFilialDrilldownData = useMemo(() => {
    if (!selectedQuinzenaDS) return [];
    const dataToUse = isBscView ? bscSimuladoEvolucao : operacionalSimuladoEvolucao;
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
  }, [isBscView, bscSimuladoEvolucao, operacionalSimuladoEvolucao, selectedQuinzenaDS]);

  const handleDownloadExcel = async (type, options = {}) => {
    setExportingType(`excel-${type}`);
    try {
      await loadScript('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js');
      const XLSX = window.XLSX;
      const wb = XLSX.utils.book_new();

      if (type === 'evolutivo') {
        console.log('Exporting evolutivo', options);

        let exportData = options.data || [];

        const casosDetalhe = exportData.map(d => {
          const res = {
            "Filial": d.filial || options.filial,
            "Regional": d.regional || 'N/A',
            "Supervisor": d.supervisor || 'N/A',
            "Quinzena": d.quinzena || 'N/A',
            "Motorista": d.motorista || 'N/A',
            "Tipo Penalidade": d.tipo || 'N/A',
            "ID (Pacote/Rota)": d.tipo === 'Not Visited' ? (d.id_rota || '-') : ((!d.id_pacote || d.id_pacote === '-' || d.id_pacote === 'N/A') ? (d.id_rota || '-') : d.id_pacote),
            "Quantidade": 1
          };
          res["Valor (R$)"] = d.valor || 0;
          return res;
        }).sort((a, b) => b["Valor (R$)"] - a["Valor (R$)"]);

        const motoristasMap = {};
        exportData.forEach(d => {
          const mKey = d.motorista || 'N/A';
          if (!motoristasMap[mKey]) motoristasMap[mKey] = { "Motorista": mKey, "Pacotes Perdidos": 0, "Not Visited": 0 };

          if (motoristasMap[mKey]["Total (R$)"] === undefined) {
            motoristasMap[mKey]["Total (R$)"] = 0;
            motoristasMap[mKey]["Lost (R$)"] = 0;
            motoristasMap[mKey]["NV (R$)"] = 0;
          }
          motoristasMap[mKey]["Total (R$)"] += (d.valor || 0);

          if (d.tipo === 'Lost Packages') {
            motoristasMap[mKey]["Lost (R$)"] += (d.valor || 0);
            motoristasMap[mKey]["Pacotes Perdidos"] += 1;
          }
          else if (d.tipo === 'Not Visited') {
            motoristasMap[mKey]["NV (R$)"] += (d.valor || 0);
            motoristasMap[mKey]["Not Visited"] += 1;
          }
        });
        const motoristasData = Object.values(motoristasMap).sort((a, b) => b["Total (R$)"] - a["Total (R$)"]);

        if (motoristasData.length > 0) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(motoristasData), "Por Motorista");
        if (casosDetalhe.length > 0) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(casosDetalhe), "Casos Detalhados");

        if (casosDetalhe.length === 0 && motoristasData.length === 0) {
          const ws = XLSX.utils.json_to_sheet([{ Mensagem: "Nenhum caso encontrado para exportação" }]);
          XLSX.utils.book_append_sheet(wb, ws, "Vazio");
        }

        XLSX.writeFile(wb, `Evolutivo_${options.filial}.xlsx`);
        setExportingType(null);
        return;
      }

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
            "Quinzena": d.quinzena || 'N/A',
            "Filial": fKey,
            "Regional": reg,
            "Supervisor": sup,
            "Motorista": mKey,
            "Tipo Penalidade": d.tipo,
            "ID (Pacote/Rota)": d.tipo === 'Not Visited' ? (d.id_rota || '-') : ((!d.id_pacote || d.id_pacote === '-' || d.id_pacote === 'N/A') ? (d.id_rota || '-') : d.id_pacote),
            "Valor (R$)": valor,
            "Quantidade": qtd
          });
        });

        if (filial) {
           const { data: detalhes } = await supabase.rpc('get_detalhes_penalidades_filial', { p_filial: filial });
           if (detalhes && detalhes.length > 0) {
              const detFiltrados = detalhes.filter(d => 
                 filtroQuinzenas.length === 0 || filtroQuinzenas.includes(d.quinzena)
              );
              
              const regSupObj = exportData.length > 0 ? { reg: exportData[0].regional, sup: exportData[0].supervisor } : { reg: 'N/A', sup: 'N/A' };

              casosMap.length = 0; 
              detFiltrados.forEach(d => {
                 if (motorista && normalizeText(d.motorista) !== normalizeText(motorista)) return;
                 
                 let isRota = d.tipo === 'Not Visited';
                 let idVal = isRota ? d.id_rota : d.id_pacote;
                 if (!idVal || idVal === '-' || idVal === 'N/A') {
                   idVal = d.id_rota;
                   isRota = true;
                 }

                 casosMap.push({
                   "Quinzena": d.quinzena || 'N/A',
                   "Filial": d.filial,
                   "Regional": d.regional && d.regional !== 'N/A' ? d.regional : regSupObj.reg,
                   "Supervisor": d.supervisor && d.supervisor !== 'N/A' ? d.supervisor : regSupObj.sup,
                   "Motorista": d.motorista,
                   "Tipo Penalidade": d.tipo,
                   "ID (Pacote/Rota)": idVal || '-',
                   "Valor (R$)": d.valor,
                   "Quantidade": d.qtd || 1
                 });
              });
           }
        }

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

  useEffect(() => {
    // Apenas admins em visões estratégicas
    if (!isUserAdmin || !targetQuinzenaRunRate || !['gestao_financeira', 'gestao_margem'].includes(activeMenu)) return;

    // Evitar fetch se as métricas ainda não calcularam
    if (!margemBrutaMetrics) return;

    // IA Removida a pedido do usuário
  }, [targetQuinzenaRunRate, activeMenu, isUserAdmin, margemBrutaMetrics, prevMargemBrutaMetrics, prevQuinzenaName, prevPrevMargemBrutaMetrics, prevPrevQuinzenaName]);

  // Se logado e tentar ir pro login, redireciona pro inicio
  if (isAuthenticated === true && location.pathname === '/login') {
    return <Navigate to="/" replace />;
  }

  // TELA DE LOGIN
  if (isAuthenticated === null) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-900"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div></div>;
  }

  if (isAuthenticated === false) {
    if (location.pathname !== '/login') {
      return <Navigate to="/login" replace />;
    }
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4 font-sans text-slate-800">
        <div className="absolute top-6 right-6">
          <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 bg-slate-800 text-slate-300 rounded-full hover:bg-slate-700 transition-colors shadow-sm" title={isDarkMode ? 'Modo Claro' : 'Modo Escuro'}>
            {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </div>
        <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-xl border border-slate-200">
          {loginView === 'login' && (
            <>
              <div className="flex flex-col items-center gap-4 mb-8">
                <div className="bg-blue-600 p-4 rounded-2xl shadow-lg">
                  <Lock className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-2xl font-black text-slate-800 tracking-tight">DashOp Login</h1>
                <p className="text-slate-500 text-center text-sm font-medium">Acesso restrito. Faça login com sua conta.</p>
              </div>
              <form onSubmit={handleLogin} className="flex flex-col gap-4">
                <div>
                  <input
                    type="email"
                    value={emailLogin}
                    onChange={(e) => setEmailLogin(e.target.value)}
                    placeholder="E-mail"
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium bg-white text-slate-800 mb-3"
                    required
                  />
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={senhaDigitada}
                      onChange={(e) => setSenhaDigitada(e.target.value)}
                      placeholder="Senha"
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium bg-white text-slate-800 pr-12"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 focus:outline-none"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {erroLogin && <p className="text-red-500 text-xs font-bold mt-2 ml-1">{erroLoginMsg || 'E-mail ou senha incorretos. Tente novamente.'}</p>}
                  {loginSuccessMsg && <p className="text-emerald-500 text-xs font-bold mt-2 ml-1">{loginSuccessMsg}</p>}
                </div>
                <button type="submit" disabled={isAuthLoading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-all shadow-md hover:shadow-lg active:scale-[0.98] disabled:opacity-50">
                  {isAuthLoading ? 'Acessando...' : 'Acessar Dashboard'}
                </button>
                <div className="flex justify-between items-center mt-2">
                  <button type="button" onClick={() => { setLoginView('forgot'); setErroLogin(false); setLoginSuccessMsg(''); }} className="text-blue-600 text-sm font-bold hover:underline">
                    Esqueci minha senha
                  </button>
                  <button type="button" onClick={() => { setLoginView('register'); setErroLogin(false); setLoginSuccessMsg(''); }} className="text-slate-500 text-sm font-bold hover:text-blue-600 transition-colors">
                    Solicitar Acesso
                  </button>
                </div>
              </form>
            </>
          )}

          {loginView === 'register' && (
            <>
              <div className="flex flex-col items-center gap-4 mb-8">
                <div className="bg-emerald-500 p-4 rounded-2xl shadow-lg">
                  <Lock className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-2xl font-black text-slate-800 tracking-tight">Solicitar Acesso</h1>
                <p className="text-slate-500 text-center text-sm font-medium">Preencha seus dados para avaliação.</p>
              </div>
              <form onSubmit={handleRegister} className="flex flex-col gap-4">
                <div>
                  <input
                    type="text"
                    value={nomeRegister}
                    onChange={(e) => setNomeRegister(e.target.value)}
                    placeholder="Nome Completo"
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium bg-white text-slate-800 mb-3"
                    required
                  />
                  <input
                    type="tel"
                    value={telefoneRegister}
                    onChange={(e) => setTelefoneRegister(e.target.value)}
                    placeholder="Telefone (WhatsApp)"
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium bg-white text-slate-800 mb-3"
                    required
                  />
                  <input
                    type="email"
                    value={emailLogin}
                    onChange={(e) => setEmailLogin(e.target.value)}
                    placeholder="E-mail"
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium bg-white text-slate-800 mb-3"
                    required
                  />
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={senhaDigitada}
                      onChange={(e) => setSenhaDigitada(e.target.value)}
                      placeholder="Criar Senha"
                      minLength="6"
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium bg-white text-slate-800 pr-12"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 focus:outline-none"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {erroLogin && <p className="text-red-500 text-xs font-bold mt-2 ml-1">{erroLoginMsg}</p>}
                </div>
                <button type="submit" disabled={isAuthLoading} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-xl transition-all shadow-md hover:shadow-lg active:scale-[0.98] disabled:opacity-50">
                  {isAuthLoading ? 'Enviando...' : 'Enviar Solicitação'}
                </button>
                <div className="flex justify-center items-center mt-2">
                  <button type="button" onClick={() => { setLoginView('login'); setErroLogin(false); setLoginSuccessMsg(''); }} className="text-slate-500 text-sm font-bold hover:text-blue-600 transition-colors">
                    Voltar para o Login
                  </button>
                </div>
              </form>
            </>
          )}

          {loginView === 'forgot' && (
            <>
              <div className="flex flex-col items-center gap-4 mb-8">
                <div className="bg-purple-500 p-4 rounded-2xl shadow-lg">
                  <Lock className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-2xl font-black text-slate-800 tracking-tight">Recuperar Senha</h1>
                <p className="text-slate-500 text-center text-sm font-medium">Enviaremos um link de recuperação para seu e-mail.</p>
              </div>
              <form onSubmit={handleForgotPassword} className="flex flex-col gap-4">
                <div>
                  <input
                    type="email"
                    value={emailLogin}
                    onChange={(e) => setEmailLogin(e.target.value)}
                    placeholder="Seu E-mail Cadastrado"
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium bg-white text-slate-800"
                    required
                  />
                  {erroLogin && <p className="text-red-500 text-xs font-bold mt-2 ml-1">{erroLoginMsg}</p>}
                </div>
                <button type="submit" disabled={isAuthLoading} className="w-full bg-purple-500 hover:bg-purple-600 text-white font-bold py-3 rounded-xl transition-all shadow-md hover:shadow-lg active:scale-[0.98] disabled:opacity-50">
                  {isAuthLoading ? 'Enviando...' : 'Enviar Link'}
                </button>
                <div className="flex justify-center items-center mt-2">
                  <button type="button" onClick={() => { setLoginView('login'); setErroLogin(false); setLoginSuccessMsg(''); }} className="text-slate-500 text-sm font-bold hover:text-blue-600 transition-colors">
                    Voltar para o Login
                  </button>
                </div>
              </form>
            </>
          )}

          {loginView === 'update_password' && (
            <>
              <div className="flex flex-col items-center gap-4 mb-8">
                <div className="bg-orange-500 p-4 rounded-2xl shadow-lg">
                  <Lock className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-2xl font-black text-slate-800 tracking-tight">Atualizar Senha</h1>
                <p className="text-slate-500 text-center text-sm font-medium">Digite sua nova senha abaixo.</p>
              </div>
              <form onSubmit={handleUpdatePassword} className="flex flex-col gap-4">
                <div>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={senhaDigitada}
                      onChange={(e) => setSenhaDigitada(e.target.value)}
                      placeholder="Nova Senha"
                      minLength="6"
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium bg-white text-slate-800 pr-12"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 focus:outline-none"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {erroLogin && <p className="text-red-500 text-xs font-bold mt-2 ml-1">{erroLoginMsg}</p>}
                  {loginSuccessMsg && <p className="text-emerald-500 text-xs font-bold mt-2 ml-1">{loginSuccessMsg}</p>}
                </div>
                <button type="submit" disabled={isAuthLoading} className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl transition-all shadow-md hover:shadow-lg active:scale-[0.98] disabled:opacity-50">
                  {isAuthLoading ? 'Atualizando...' : 'Atualizar Senha'}
                </button>
                <div className="flex justify-center items-center mt-2">
                  <button type="button" onClick={() => { isRecoveryRef.current = false; setLoginView('login'); setErroLogin(false); setLoginSuccessMsg(''); supabase.auth.signOut(); }} className="text-slate-500 text-sm font-bold hover:text-blue-600 transition-colors">
                    Cancelar e Voltar
                  </button>
                </div>
              </form>
            </>
          )}

          {loginView === 'verify_otp_signup' && (
            <>
              <div className="flex flex-col items-center gap-4 mb-8">
                <div className="bg-emerald-500 p-4 rounded-2xl shadow-lg">
                  <Lock className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-2xl font-black text-slate-800 tracking-tight">Verificar E-mail</h1>
                <p className="text-slate-500 text-center text-sm font-medium">Digite o código enviado para o seu e-mail.</p>
              </div>
              <form onSubmit={handleVerifyOtpSignup} className="flex flex-col gap-4">
                <div>
                  <input
                    type="text"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    placeholder="Código de verificação"
                    maxLength="8"
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium bg-white text-slate-800 text-center tracking-widest text-lg"
                    required
                  />
                  {erroLogin && <p className="text-red-500 text-xs font-bold mt-2 ml-1">{erroLoginMsg}</p>}
                  {loginSuccessMsg && <p className="text-emerald-500 text-xs font-bold mt-2 ml-1">{loginSuccessMsg}</p>}
                </div>
                <button type="submit" disabled={isAuthLoading || otpCode.length < 6} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-xl transition-all shadow-md hover:shadow-lg active:scale-[0.98] disabled:opacity-50">
                  {isAuthLoading ? 'Verificando...' : 'Verificar E-mail'}
                </button>
                <div className="flex justify-center items-center mt-2">
                  <button type="button" onClick={() => { setLoginView('login'); setErroLogin(false); setLoginSuccessMsg(''); }} className="text-slate-500 text-sm font-bold hover:text-blue-600 transition-colors">
                    Voltar para o Login
                  </button>
                </div>
              </form>
            </>
          )}

          {loginView === 'verify_otp_reset' && (
            <>
              <div className="flex flex-col items-center gap-4 mb-8">
                <div className="bg-purple-500 p-4 rounded-2xl shadow-lg">
                  <Lock className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-2xl font-black text-slate-800 tracking-tight">Validar Código</h1>
                <p className="text-slate-500 text-center text-sm font-medium">Digite o código enviado para o seu e-mail.</p>
              </div>
              <form onSubmit={handleVerifyOtpReset} className="flex flex-col gap-4">
                <div>
                  <input
                    type="text"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    placeholder="Código de verificação"
                    maxLength="8"
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium bg-white text-slate-800 text-center tracking-widest text-lg"
                    required
                  />
                  {erroLogin && <p className="text-red-500 text-xs font-bold mt-2 ml-1">{erroLoginMsg}</p>}
                  {loginSuccessMsg && <p className="text-emerald-500 text-xs font-bold mt-2 ml-1">{loginSuccessMsg}</p>}
                </div>
                <button type="submit" disabled={isAuthLoading || otpCode.length < 6} className="w-full bg-purple-500 hover:bg-purple-600 text-white font-bold py-3 rounded-xl transition-all shadow-md hover:shadow-lg active:scale-[0.98] disabled:opacity-50">
                  {isAuthLoading ? 'Validando...' : 'Validar Código'}
                </button>
                <div className="flex justify-center items-center mt-2">
                  <button type="button" onClick={() => { setLoginView('login'); setErroLogin(false); setLoginSuccessMsg(''); }} className="text-slate-500 text-sm font-bold hover:text-blue-600 transition-colors">
                    Voltar para o Login
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    );
  }

  const handleSendChatMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    if (!GEMINI_API_KEY || GEMINI_API_KEY === "COLE_SUA_CHAVE_AQUI") {
      setChatMessages(prev => [...prev, { role: 'user', text: chatInput }]);
      setChatMessages(prev => [...prev, { role: 'ai', text: '⚠️ Chave da API ausente. Por favor, edite o código na variável GEMINI_API_KEY com a sua chave gerada no Google AI Studio.' }]);
      setChatInput('');
      return;
    }

    const newUserMsg = { role: 'user', text: chatInput };
    setChatMessages(prev => [...prev, newUserMsg]);
    setChatInput('');
    setIsChatLoading(true);

    const contexto = `
      Você é um CFO e Especialista Tributário Sênior de uma transportadora (Last Mile). 
      Você é direto, profissional e foca em resultados reais: redução de custos, margem de contribuição e aumento do Delivery Success (DS).
      Seja consiso, não escreva textos muito longos a menos que o usuário peça uma análise profunda.
      Formate suas respostas com marcadores (bullet points) para facilitar a leitura.
      
      DADOS ATUAIS DA OPERAÇÃO (${targetQuinzenaRunRate}):
      
      [FINANCEIRO]
      - Faturamento Bruto: ${formatCurrency(margemBrutaMetrics.faturamento)}
      - Impostos Configurados (${percentualImpostoFinanceiro}%): ${formatCurrency(margemBrutaMetrics.imposto)}
      - Custo (Agregados/Frota): ${formatCurrency(margemBrutaMetrics.custos)}
      - Penalidades (Multas): ${formatCurrency(margemBrutaMetrics.penalidades)}
      - Margem Líquida em R$: ${formatCurrency(margemBrutaMetrics.margemRS)}
      - Margem Líquida em %: ${margemBrutaMetrics.margemPct.toFixed(2)}%
      - Peso das Penalidades na Margem: ${(margemBrutaMetrics.margemBase > 0 ? (margemBrutaMetrics.penalidades / margemBrutaMetrics.margemBase) * 100 : 0).toFixed(2)}%
      
      [OPERACIONAL]
      - Delivery Success (DS) Global Atual: ${currentDsGlobalAtual.toFixed(2)}%
      - Meta Operacional Oficial: 98.5%
      
      [CONTEXTO DA TELA ATUAL: ${activeMenu.toUpperCase()}]
      ${agentContext || "O usuário está em uma visão geral sem foco em itens detalhados."}

      Responda de forma estratégica baseado exclusivamente nesses números se o usuário perguntar sobre o cenário atual.
    `;

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': GEMINI_API_KEY
        },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: contexto }] },
          contents: [
            ...chatMessages.filter(m => m.role !== 'system').map(m => ({
              role: m.role === 'ai' ? 'model' : 'user',
              parts: [{ text: m.text }]
            })),
            { role: 'user', parts: [{ text: newUserMsg.text }] }
          ]
        })
      });

      const data = await response.json();
      if (data.candidates && data.candidates[0].content.parts[0].text) {
        setChatMessages(prev => [...prev, { role: 'ai', text: data.candidates[0].content.parts[0].text }]);
      } else if (data.error) {
        setChatMessages(prev => [...prev, { role: 'ai', text: `Desculpe, o servidor da IA retornou um erro: ${data.error.message}` }]);
      } else {
        setChatMessages(prev => [...prev, { role: 'ai', text: 'Desculpe, não consegui processar a resposta. Tente formular a pergunta de outra forma.' }]);
      }
    } catch (err) {
      setChatMessages(prev => [...prev, { role: 'ai', text: `Ocorreu um erro de conexão com a API do Gemini: ${err.message}` }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  // TELA PRINCIPAL (DASHBOARD)
  return (
    <div className="flex h-screen w-full bg-slate-50 font-sans text-slate-800 overflow-hidden">

      {/* OVERLAY MOBILE */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <Sidebar 
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
        isOpMode={isOpMode}
        isImporter={isImporter}
        isUserAdmin={isUserAdmin}
        isUserGestao={isUserGestao}
        userPermissions={userPermissions}
        activeMenu={activeMenu}
        handleMenuChange={handleMenuChange}
        expandedMenus={expandedMenus}
        toggleExpandedMenu={toggleExpandedMenu}
        currentUser={currentUser}
        userRole={userRole}
      />

      {/* HEADER & MAIN */}
      <main className="flex-1 flex flex-col h-full relative overflow-hidden">
      <Header
        setIsMobileMenuOpen={setIsMobileMenuOpen}
        quinzenasDisponiveis={quinzenasDisponiveis}
        filtroQuinzenas={filtroQuinzenas}
        setFiltroQuinzenas={setFiltroQuinzenas}
        regionaisDisponiveis={regionaisDisponiveis}
        filtroRegionais={filtroRegionais}
        setFiltroRegionais={setFiltroRegionais}
        supervisoresDisponiveis={supervisoresDisponiveis}
        filtroSupervisores={filtroSupervisores}
        setFiltroSupervisores={setFiltroSupervisores}
        filiaisDisponiveis={filiaisDisponiveis}
        filtroFiliais={filtroFiliais}
        setFiltroFiliais={setFiltroFiliais}
        showInsucessosFilter={showInsucessosFilter}
        diasSemanaDisponiveis={diasSemanaDisponiveis}
        filtroDiasSemana={filtroDiasSemana}
        setFiltroDiasSemana={setFiltroDiasSemana}
        insucessosDisponiveis={insucessosDisponiveis}
        insucessosExcluidos={insucessosExcluidos}
        setInsucessosExcluidos={setInsucessosExcluidos}
        hasActiveFilters={hasActiveFilters}
        clearAllFilters={clearAllFilters}
        setActiveMenu={setActiveMenu}
        isDarkMode={isDarkMode}
        setIsDarkMode={setIsDarkMode}
      />

        {error && (
          <div className="mx-4 md:mx-6 mt-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3 shadow-sm z-40">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-red-800">Falha na Sincronização</h4>
              <p className="text-sm font-medium text-red-600">{error}</p>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 md:p-8" ref={mainScrollRef}>
          <div className="max-w-7xl mx-auto h-full flex flex-col gap-6">

            {/* IMPORTADOR INTELIGENTE */}
            {activeMenu === 'importador' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 h-full">
                <DataImporter
                  rawFaturamentoData={rawFaturamentoData}
                  rawOperacionalData={rawOperacionalData}
                  mapeamentoFiliais={mapeamentoFiliais}
                  isImporter={isImporter}
                  isAdmin={isUserAdmin}
                  onImportOperacional={async (novoOperacional) => {
                    if (!novoOperacional || novoOperacional.length === 0) return;
                    const operacionalMap = new Map();
                    rawOperacionalData.forEach(d => operacionalMap.set(`${d.id_rota}_${d.quinzena || 'GERAL'}`, d));
                    novoOperacional.forEach(d => operacionalMap.set(`${d.id_rota}_${d.quinzena || 'GERAL'}`, d));
                    const finalOperacional = Array.from(operacionalMap.values());
                    setRawOperacionalData(finalOperacional);
                    if (rawOperacionalDataRef) rawOperacionalDataRef.current = finalOperacional;
                    
                    try {
                      await supabase.rpc('rpc_refresh_materialized_views');
                    } catch (e) {
                      console.warn('Timeout ou erro no refresh das views (Operacional). O cache será limpo de qualquer forma.', e);
                    } finally {
                      await clearCache();
                      await fetchFromSupabase(true);
                    }
                  }}
                  onImportBilling={async (diarias, penalidades) => {
                    const importedQuinzena = diarias.length > 0 ? diarias[0].quinzena : (penalidades.length > 0 ? penalidades[0].quinzena : null);

                    let finalFaturamento = diarias;
                    let finalPenalidades = penalidades;

                    if (importedQuinzena && importedQuinzena !== 'N/A') {
                      const faturamentoMap = new Map();
                      rawFaturamentoData.forEach(d => faturamentoMap.set(d.id_rota || Math.random().toString(), d));
                      diarias.forEach(d => faturamentoMap.set(d.id_rota, d));
                      finalFaturamento = Array.from(faturamentoMap.values());

                      const penalidadesMap = new Map();
                      rawData.forEach(d => penalidadesMap.set(`${d.id_rota}_${d.id_pacote}`, d));
                      penalidades.forEach(d => penalidadesMap.set(`${d.id_rota}_${d.id_pacote}`, d));
                      finalPenalidades = Array.from(penalidadesMap.values());
                    }

                    setRawFaturamentoData(finalFaturamento);
                    setRawData(finalPenalidades);
                    
                    if (importedQuinzena && importedQuinzena !== 'N/A') {
                       await supabase.rpc('rpc_sincronizar_faturamento_operacional', { p_quinzena: importedQuinzena });
                    }
                    try {
                      await supabase.rpc('rpc_refresh_materialized_views');
                    } catch (e) {
                      console.warn('Timeout ou erro no refresh das views (Billing). O cache será limpo de qualquer forma.', e);
                    } finally {
                      await clearCache(); // Limpa o cache para carregar os novos dados na próxima
                      await fetchFromSupabase(true);
                    }
                  }}
                  onImportCapCar={async (dadosCapCar) => {
                    try {
                      await supabase.rpc('rpc_refresh_materialized_views');
                    } catch (e) {
                      console.warn('Timeout na view CapCar', e);
                    } finally {
                      await clearCache();
                      await fetchFromSupabase(true);
                    }
                  }}
                  onImportOperacionalBSC={async (dadosBSC) => {
                    try {
                      await supabase.rpc('rpc_refresh_materialized_views');
                    } catch (e) {
                      console.warn('Timeout na view BSC', e);
                    } finally {
                      await clearCache();
                      await fetchFromSupabase(true);
                    }
                  }}
                />
              </div>
            )}

            {/* CONFIGURAÇÕES DE FILIAIS */}
            {activeMenu === 'config_filiais' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 h-full">
                <ConfigFiliais
                  mapeamentoFiliais={mapeamentoFiliais}
                  rawData={rawData}
                  rawFaturamentoData={rawFaturamentoData}
                  rawOperacionalData={rawOperacionalData}
                  onSave={async (newMap) => {
                    try {
                      const cleanMap = newMap.map(({ id, created_at, ...rest }) => rest);
                      const { error: delErr } = await supabase.from('mapeamento_filiais').delete().neq('filial', 'dummy_impossivel_123');
                      if (delErr) throw delErr;
                      const { error: insErr } = await supabase.from('mapeamento_filiais').insert(cleanMap);
                      if (insErr) throw insErr;
                      try {
                        await supabase.rpc('rpc_refresh_materialized_views');
                      } catch (e) {
                        console.warn('Timeout na view', e);
                      } finally {
                        await clearCache();
                        await fetchFromSupabase(true);
                      }
                    } catch (err) {
                      console.error(err);
                      alert("Erro ao salvar configurações de filiais: " + (err.message || JSON.stringify(err)));
                    }
                  }}
                />
              </div>
            )}

            {/* CONFIGURAÇÕES DE TARIFAS */}
            {activeMenu === 'config_tarifas' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 h-full">
                <ConfigTarifas
                  tarifasAtuais={tarifasMap}
                  onSave={async (newMap) => {
                    try {
                      const cleanMap = newMap.map(({ id, created_at, ...rest }) => rest);
                      const { error: delErr } = await supabase.from('tarifas').delete().neq('tipo', 'dummy_impossivel_123');
                      if (delErr) throw delErr;
                      const { error: insErr } = await supabase.from('tarifas').insert(cleanMap);
                      if (insErr) throw insErr;
                      try {
                        await supabase.rpc('rpc_refresh_materialized_views');
                      } catch (e) {
                        console.warn('Timeout na view', e);
                      } finally {
                        await clearCache();
                        await fetchFromSupabase(true);
                      }
                    } catch (err) {
                      console.error(err);
                      alert("Erro ao salvar tarifas: " + (err.message || JSON.stringify(err)));
                    }
                  }}
                />
              </div>
            )}

            {/* GESTÃO DE USUÁRIOS */}
            {activeMenu === 'gestao_usuarios' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 h-full overflow-y-auto">
                <GestaoUsuarios />
              </div>
            )}

            {/* CONFIGURAÇÕES DA CONTA */}
            {activeMenu === 'configuracoes' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 h-full overflow-y-auto">
                <Configuracoes currentUser={currentUser} userRole={userRole} />
              </div>
            )}

            {/* PAINEL DE TREINAMENTOS */}
            {activeMenu === 'painel_treinamentos' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 h-full">
                <PainelTreinamentos rawOperacionalData={rawOperacionalData} mapeamentoFiliais={mapeamentoFiliais} />
              </div>
            )}

            {/* DISPONIBILIDADE DE FROTA */}
            {activeMenu === 'disponibilidade_frota' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 h-full">
                <PainelDisponibilidade rawOperacionalData={rawOperacionalData} mapeamentoFiliais={mapeamentoFiliais} />
              </div>
            )}

            {/* BASE DE MOTORISTAS */}
            {activeMenu === 'gestao_motoristas' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 h-full overflow-y-auto">
                <GestaoMotoristas />
              </div>
            )}

            {/* EXPLORADOR DE DADOS */}
            {activeMenu === 'explorador_dados' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 h-full overflow-y-auto">
                <DatabaseExplorer />
              </div>
            )}

            {/* HOME — PLACEHOLDER (Etapa 2) */}
            {activeMenu === 'home' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 p-8 flex flex-col items-center justify-center min-h-[60vh]">
                <div className="text-center max-w-md">
                  <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <LayoutDashboard className="w-8 h-8 text-blue-600" />
                  </div>
                  <h1 className="text-2xl font-bold text-slate-800 mb-2">Página Inicial</h1>
                  <p className="text-slate-500">O painel executivo com KPIs e visão consolidada será implementado em breve.</p>
                  <p className="text-sm text-slate-400 mt-4">Utilize o menu lateral para navegar pelos módulos disponíveis.</p>
                </div>
              </div>
            )}

            {/* SIMULADOR DE CENÁRIOS */}
            {activeMenu === 'simulador' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <Simulador setAgentContext={setAgentContext} capcarData={rawCustosData} />
              </div>
            )}

            {/* DRE ANÁLISE DE CUSTO PESADOS */}
            {activeMenu === 'dre_custos' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 h-full">
                <DreAnaliseCusto setAgentContext={setAgentContext} />
              </div>
            )}

            {/* DRE VIABILIDADE DE PROJETO */}
            {activeMenu === 'dre_viabilidade' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 h-full">
                <DreViabilidade setAgentContext={setAgentContext} />
              </div>
            )}

            {/* DRE GERENCIAL */}
            {activeMenu === 'dre_gerencial' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 h-full">
                <DreGerencial setAgentContext={setAgentContext} />
              </div>
            )}

            {/* DRE CUSTO LEVE SIMULADOR */}
            {activeMenu === 'dre_custo_leve' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 h-full">
                <DreCustoLeve setAgentContext={setAgentContext} dynamicTarifas={tarifasMap} />
              </div>
            )}

            {/* DRE ANÁLISE DE CUSTO LEVES */}
            {activeMenu === 'dre_leves' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 h-full">
                <DreCustoLeve setAgentContext={setAgentContext} />
              </div>
            )}

            {/* GESTÃO FINANCEIRA (COM FATURAMENTO) */}
            {activeMenu === 'gestao_financeira' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="h-full"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1, duration: 0.4 }}
                    className="md:col-span-2 bg-white dark:bg-slate-900 p-8 rounded-[2rem] shadow-sm border border-slate-200 dark:border-slate-800 relative overflow-hidden flex flex-col justify-between group hover:shadow-md transition-shadow"
                  >
                    <div className="absolute -right-8 -top-8 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity duration-500">
                      <TrendingUp className="w-64 h-64 text-red-500" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-2 z-10 uppercase tracking-widest flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-red-500" /> Penalidades vs Faturamento
                      </h2>
                      <div className="flex flex-col mb-6 z-10">
                        <span className="text-4xl lg:text-5xl font-black leading-tight tracking-tight text-slate-800 dark:text-white flex items-center gap-3">
                          {formatCurrency(resumoMetrics.total)}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400 mt-2 font-medium bg-slate-100 dark:bg-slate-800 self-start px-3 py-1 rounded-full border border-slate-200 dark:border-slate-700">
                          Total Descontado ({formatQtd(resumoMetrics.qtdTotal)} infrações)
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-3 text-sm z-10 pt-5 border-t border-slate-100 dark:border-slate-800/50">
                      <div className="flex justify-between items-center"><span className="text-slate-500 dark:text-slate-400 font-semibold">PNRs</span> <span className="font-bold text-slate-700 dark:text-slate-300">{formatCurrency(pnrTot.valor)}</span></div>
                      <div className="flex justify-between items-center"><span className="text-slate-500 dark:text-slate-400 font-semibold">Lost Packages</span> <span className="font-bold text-slate-700 dark:text-slate-300">{formatCurrency(lostTot.valor)}</span></div>
                      <div className="flex justify-between items-center"><span className="text-slate-500 dark:text-slate-400 font-semibold">Not Visited</span> <span className="font-bold text-slate-700 dark:text-slate-300">{formatCurrency(nvTot.valor)}</span></div>
                      <div className="flex justify-between items-center mt-2 pt-3 border-t border-slate-100 dark:border-slate-800/50">
                        <span className="text-emerald-500 dark:text-emerald-400 font-bold">Faturamento Total</span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold text-base">{formatCurrency(faturamentoTotalMetrics)}</span>
                      </div>
                      <div className="flex justify-between items-center"><span className="text-violet-500 dark:text-violet-400 font-bold">% de Representatividade</span> <span className="text-slate-800 dark:text-white font-bold">{faturamentoTotalMetrics > 0 ? ((resumoMetrics.total / faturamentoTotalMetrics) * 100).toFixed(2) + '%' : '0%'}</span></div>
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2, duration: 0.4 }}
                    className="md:col-span-2 bg-gradient-to-br from-emerald-500 to-teal-600 dark:from-emerald-900 dark:to-teal-900 p-8 rounded-[2rem] shadow-md text-white relative overflow-hidden flex flex-col justify-between group hover:shadow-lg transition-shadow"
                  >
                    <div className="absolute -right-8 -top-8 opacity-10 group-hover:opacity-20 transition-opacity duration-500">
                      <BadgeDollarSign className="w-64 h-64" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-emerald-100 mb-2 z-10 uppercase tracking-widest flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" /> Resumo de Margem (Global)
                      </h2>
                      <div className="flex flex-col mb-6 z-10">
                        <span className={`text-4xl lg:text-5xl font-black leading-tight tracking-tight ${margemBrutaMetrics.margemRS >= 0 ? 'text-white' : 'text-red-200'}`}>
                          {formatCurrency(margemBrutaMetrics.margemRS)}
                        </span>
                        <span className="text-xs text-emerald-100 mt-2 font-medium bg-white/10 self-start px-3 py-1 rounded-full border border-white/20 backdrop-blur-sm">
                          Rentabilidade: {margemBrutaMetrics.margemPct.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-3 text-sm z-10 pt-5 border-t border-white/10">
                      <div className="flex justify-between items-center"><span className="text-emerald-100 font-semibold">Faturamento</span> <span className="font-bold">{formatCurrency(margemBrutaMetrics.faturamento)}</span></div>
                      <div className="flex justify-between items-center"><span className="text-orange-200 font-semibold">Custos Operacionais</span> <span className="font-bold">- {formatCurrency(margemBrutaMetrics.custos)}</span></div>
                      <button onClick={() => setActiveMenu('gestao_margem')} className="mt-3 text-center text-xs font-bold text-emerald-900 bg-emerald-100 py-2.5 rounded-xl hover:bg-white transition-colors w-full shadow-sm">
                        Ver Detalhamento Completo →
                      </button>
                    </div>
                  </motion.div>
                </div>

                {prevMargemBrutaMetrics && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.4 }}
                  >
                    <h3 className="text-lg font-bold text-slate-700 dark:text-blue-100 mb-4 mt-8 flex items-center gap-2">
                      Comparativo: Quinzena Anterior ({prevQuinzenaName})
                    </h3>
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
                      <div className="bg-white dark:bg-slate-800/80 p-8 md:p-10 rounded-[2rem] shadow-sm hover:shadow-md transition-shadow text-slate-700 dark:text-slate-300 relative overflow-hidden flex flex-col justify-between border border-slate-200 dark:border-slate-700/50 group">
                        <div className="absolute -right-8 -top-8 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity duration-500"><TrendingUp className="w-64 h-64 text-slate-500" /></div>
                        <div>
                          <h2 className="text-sm md:text-base font-bold text-slate-500 dark:text-blue-400/70 mb-2 z-10 tracking-widest uppercase">Penalidades vs Faturamento</h2>
                          <div className="flex flex-col z-10 h-full justify-between">
                            <div className="flex flex-col mb-4">
                              <span className="text-4xl font-black leading-tight tracking-tight text-slate-800 dark:text-red-400/70 flex items-center gap-3">
                                {formatCurrency(prevMargemBrutaMetrics.penalidades)}
                              </span>
                              <span className="text-xs text-slate-500 dark:text-slate-400/70 mt-2 font-medium bg-slate-100 dark:bg-slate-800/50 self-start px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700/50">Penalidades na quinzena</span>
                            </div>
                            <div className="flex flex-col gap-2 text-sm pt-4 border-t border-slate-100 dark:border-slate-700/50">
                              <div className="flex justify-between items-center"><span className="text-emerald-600 dark:text-emerald-400/70 font-bold">Faturamento Total</span> <span className="text-emerald-600 dark:text-emerald-400/70 font-bold">{formatCurrency(prevMargemBrutaMetrics.faturamento)}</span></div>
                              <div className="flex justify-between items-center"><span className="text-violet-600 dark:text-violet-400/70 font-bold">% de Representatividade</span> <span className="text-slate-800 dark:text-slate-300 font-bold">{prevMargemBrutaMetrics.faturamento > 0 ? ((prevMargemBrutaMetrics.penalidades / prevMargemBrutaMetrics.faturamento) * 100).toFixed(2) + '%' : '0%'}</span></div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white dark:bg-slate-800/80 p-8 md:p-10 rounded-[2rem] shadow-sm hover:shadow-md transition-shadow text-slate-700 dark:text-slate-300 relative overflow-hidden flex flex-col justify-between border border-slate-200 dark:border-slate-700/50 group">
                        <div className="absolute -right-8 -top-8 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity duration-500"><TrendingUp className="w-64 h-64 text-slate-500" /></div>
                        <div>
                          <h2 className="text-sm md:text-base font-bold text-slate-500 dark:text-emerald-400/70 mb-2 z-10 tracking-widest uppercase">Resumo de Margem (Global)</h2>
                          <div className="flex flex-col mb-8 z-10">
                            <span className={`text-4xl font-black leading-tight tracking-tight flex items-center gap-3 ${(prevMargemBrutaMetrics.margemRS || 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400/70' : 'text-red-600 dark:text-red-400/70'}`}>
                              {formatCurrency(prevMargemBrutaMetrics.margemRS || 0)}
                            </span>
                            <span className="text-xs text-slate-500 dark:text-slate-400/70 mt-2 font-medium bg-slate-100 dark:bg-slate-800/50 self-start px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700/50">Rentabilidade: {(prevMargemBrutaMetrics.margemPct || 0).toFixed(1)}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                <div className="mb-8 relative group">
                  {isLoadingDetalhes && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/60 dark:bg-slate-900/60 backdrop-blur-md rounded-[2rem] transition-all">
                      <div className="flex flex-col items-center">
                        <div className="relative mb-4">
                          <Skeleton className="w-16 h-16 rounded-full" />
                          <div className="absolute inset-0 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
                        </div>
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-200 tracking-wide">Buscando detalhes da operação...</span>
                      </div>
                    </div>
                  )}
                  <RunRateFinanceiroSection baseData={baseRunRateData} targetQuinzena={targetQuinzenaRunRate} prevStats={prevQuinzenaStats} onDrilldown={(f) => { handleOpenEvolutivo(f); }} isForecastMode={isForecastMode} setIsForecastMode={setIsForecastMode} />
                </div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4, duration: 0.4 }}
                  className="bg-white dark:bg-slate-900 p-6 md:p-10 rounded-[2rem] shadow-sm hover:shadow-md transition-shadow border border-slate-200 dark:border-slate-800 mb-8 group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-900/20 flex items-center justify-center border border-violet-100 dark:border-violet-500/20">
                        <Scale className="w-5 h-5 text-violet-500" />
                      </div>
                      <h2 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">
                        {selectedQuinzenaPareto ? `Detalhamento de Filiais Financeiro - ${selectedQuinzenaPareto}` : 'Evolução Financeira por Quinzena'}
                      </h2>
                    </div>
                    {selectedQuinzenaPareto && (
                      <button onClick={() => setSelectedQuinzenaPareto(null)} className="text-xs md:text-sm font-bold text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/30 px-4 py-2 rounded-full border border-violet-200 dark:border-violet-500/30 hover:bg-violet-100 dark:hover:bg-violet-900/50 transition-all shadow-sm">
                        ← Voltar para Visão Geral
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mb-8 pl-13">
                    {selectedQuinzenaPareto ? 'Detalhamento do período selecionado.' : 'Clique sobre a barra de uma quinzena para abrir o detalhamento das filiais que compõem o resultado financeiro (Drill-down).'}
                  </p>
                  <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 rounded-2xl p-4">
                    {!selectedQuinzenaPareto ? (
                      <NativeComboChart data={paretoQuinzenaData} labelKey="quinzena" heightClass="h-[400px]" onBarClick={(q) => setSelectedQuinzenaPareto(q)} />
                    ) : (
                      <NativeComboChart data={paretoFilialDrilldownData} labelKey="filial" heightClass="h-[400px]" />
                    )}
                  </div>
                </motion.div>
              </motion.div>
            )}

            {/* GESTÃO DE MARGEM DE CONTRIBUIÇÃO */}
            {activeMenu === 'gestao_margem' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">

                {/* AI SUMMARY TEMPORARILY DISABLED 
                {isUserAdmin && (executiveSummary || isSummaryLoading) && (
                  <div className="mb-8 bg-gradient-to-r from-blue-900 to-indigo-900 p-6 md:p-8 rounded-3xl shadow-xl text-white relative overflow-hidden">
                    <div className="flex items-center gap-3 mb-3 relative z-10">
                      <Sparkles className="w-5 h-5 text-blue-300" />
                      <h3 className="text-lg font-bold text-blue-100">Resumo Executivo ({targetQuinzenaRunRate})</h3>
                    </div>
                    {isSummaryLoading ? (
                      <div className="animate-pulse flex space-x-4 relative z-10">
                        <div className="flex-1 space-y-4 py-2">
                          <div className="h-2 bg-blue-400/30 rounded w-3/4"></div>
                          <div className="h-2 bg-blue-400/30 rounded w-full"></div>
                          <div className="h-2 bg-blue-400/30 rounded w-5/6"></div>
                        </div>
                      </div>
                    ) : (
                      <div className="relative z-10 text-sm md:text-base text-blue-50 leading-relaxed space-y-2 whitespace-pre-wrap">{executiveSummary}</div>
                    )}
                  </div>
                )}
                */}

                <div className="mb-6 flex flex-col gap-2 bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
                  <div className="flex items-center gap-4 w-full">
                    <div className="flex-1">
                      <h3 className="text-sm font-bold text-slate-700">Imposto sobre Faturamento (%)</h3>
                      <p className="text-xs text-slate-500">Defina o percentual a ser descontado no cálculo da Margem de Contribuição.</p>
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        value={percentualImpostoFinanceiro}
                        onChange={e => setPercentualImpostoFinanceiro(parseFloat(e.target.value) || 0)}
                        className="w-24 px-3 py-2 text-right border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-bold text-slate-700"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">%</span>
                    </div>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-2 p-2 bg-slate-50 rounded-lg border border-slate-100 flex flex-wrap gap-x-4 gap-y-1">
                    <span><strong className="text-slate-600">PIS e Cofins:</strong> 3,5%</span>
                    <span><strong className="text-slate-600">ISS:</strong> 0,5%</span>
                    <span><strong className="text-slate-600">IRPJ:</strong> 1,32%</span>
                    <span><strong className="text-slate-600">CSLL:</strong> 1,19%</span>
                    <span><strong className="text-orange-600">Margem de erro:</strong> 2,5%</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1, duration: 0.4 }}
                    className="md:col-span-2 lg:col-span-4 bg-gradient-to-br from-emerald-500 to-teal-600 dark:from-emerald-900 dark:to-teal-900 p-8 md:p-10 rounded-[2rem] shadow-md text-white relative overflow-hidden flex flex-col justify-between group hover:shadow-lg transition-shadow"
                  >
                    <div className="absolute -right-10 -top-10 opacity-10 group-hover:opacity-20 transition-opacity duration-500"><BadgeDollarSign className="w-64 h-64" /></div>
                    <div>
                      <h2 className="text-sm md:text-base font-bold text-emerald-100 mb-2 z-10 tracking-widest uppercase flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" /> Margem de Contribuição
                      </h2>
                      <div className="flex flex-col mb-8 z-10">
                        <span className={`text-4xl lg:text-5xl font-black leading-tight tracking-tight flex items-center gap-3 ${margemBrutaMetrics.margemRS >= 0 ? 'text-white' : 'text-red-200'}`}>
                          {formatCurrency(margemBrutaMetrics.margemRS)}
                        </span>
                        <span className="text-xs text-emerald-100 mt-2 font-medium bg-white/10 self-start px-4 py-1.5 rounded-full border border-white/20 backdrop-blur-sm">Margem global de {margemBrutaMetrics.margemPct.toFixed(1)}%</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-sm z-10 pt-6 border-t border-white/10">
                      <div className="flex justify-between items-center"><span className="text-emerald-100 font-semibold">Faturamento Bruto</span> <span className="font-bold">{formatCurrency(margemBrutaMetrics.faturamento)}</span></div>
                      <div className="flex justify-between items-center"><span className="text-rose-200 font-semibold">Impostos ({percentualImpostoFinanceiro}%)</span> <span className="font-bold">- {formatCurrency(margemBrutaMetrics.imposto)}</span></div>
                      <div className="flex justify-between items-center"><span className="text-orange-200 font-semibold">Agregados + Frota</span> <span className="font-bold">- {formatCurrency(margemBrutaMetrics.custos)}</span></div>
                      <div className="flex justify-between items-center"><span className="text-orange-300 font-semibold">Margem de erro (±2,5%)</span> <span className="font-bold">± {formatCurrency(margemBrutaMetrics.margemErro)}</span></div>
                      <div className="flex justify-between items-center mt-2 pt-2 border-t border-white/10 md:col-span-2">
                        <span className="text-white font-bold text-base">Margem Líquida</span>
                        <div className="flex flex-col items-end">
                          <span className={`font-black text-xl ${margemBrutaMetrics.margemRS >= 0 ? 'text-white' : 'text-red-200'}`}>{formatCurrency(margemBrutaMetrics.margemRS)}</span>
                          <span className="text-[10px] text-emerald-100 font-medium opacity-80 mt-0.5">({formatCurrency(margemBrutaMetrics.margemRS - margemBrutaMetrics.margemErro)} a {formatCurrency(margemBrutaMetrics.margemRS + margemBrutaMetrics.margemErro)})</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </div>

                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.4 }}
                  className="bg-white dark:bg-slate-900 p-6 md:p-10 rounded-[2rem] shadow-sm hover:shadow-md transition-shadow border border-slate-200 dark:border-slate-800 flex flex-col mb-8 group"
                >
                  <div className="flex justify-between items-center mb-6 px-2">
                    <h3 className="text-lg md:text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">
                      {selectedFilialForMargin
                        ? `Margem por Categoria (${selectedFilialForMargin})`
                        : selectedRegionalForMargin
                          ? `Margem por Filial (${selectedRegionalForMargin})`
                          : 'Margem de Contribuição por Regional'}
                    </h3>
                    <div className="flex gap-2">
                      {selectedFilialForMargin && (
                        <button onClick={() => setSelectedFilialForMargin(null)} className="text-xs font-bold text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/30 px-4 py-2 rounded-full border border-violet-200 dark:border-violet-500/30 hover:bg-violet-100 dark:hover:bg-violet-900/50 transition-all flex items-center gap-1 shadow-sm">
                          <ArrowUp className="w-3 h-3 -rotate-90" /> Voltar para Filiais
                        </button>
                      )}
                      {selectedRegionalForMargin && !selectedFilialForMargin && (
                        <button onClick={() => setSelectedRegionalForMargin(null)} className="text-xs font-bold text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/30 px-4 py-2 rounded-full border border-violet-200 dark:border-violet-500/30 hover:bg-violet-100 dark:hover:bg-violet-900/50 transition-all flex items-center gap-1 shadow-sm">
                          <ArrowUp className="w-3 h-3 -rotate-90" /> Voltar para Regionais
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 rounded-2xl p-4">
                    {selectedFilialForMargin ? (
                      <NativeComboChart data={margemCategoriaData.slice(0, 15)} labelKey="categoria" heightClass="h-[350px]" isMarginChart={true} />
                    ) : selectedRegionalForMargin ? (
                      <NativeComboChart data={margemFilialData.slice(0, 15)} labelKey="filial" onBarClick={(item) => setSelectedFilialForMargin(item)} heightClass="h-[350px]" isMarginChart={true} />
                    ) : (
                      <NativeComboChart data={margemRegionalDataGlobal} labelKey="regional" onBarClick={(item) => setSelectedRegionalForMargin(item.replace('Regional ', ''))} heightClass="h-[350px]" isMarginChart={true} />
                    )}
                  </div>
                  {!selectedFilialForMargin && !selectedRegionalForMargin && <p className="text-center text-[11px] text-slate-500 dark:text-slate-400 mt-4 italic flex items-center justify-center gap-1"><Check className="w-3 h-3 text-emerald-500" /> Dica: Clique na barra de uma regional para ver a margem detalhada por filial.</p>}
                  {selectedRegionalForMargin && !selectedFilialForMargin && <p className="text-center text-[11px] text-slate-500 dark:text-slate-400 mt-4 italic flex items-center justify-center gap-1"><Check className="w-3 h-3 text-emerald-500" /> Dica: Clique na barra de uma filial para ver a margem detalhada por categoria de veículo.</p>}
                </motion.div>

                {/* CARDS DINÂMICOS */}
                {(() => {
                  let dataSource = [];
                  let titleEntity = "";
                  let entityKey = "";
                  if (selectedFilialForMargin) {
                    dataSource = margemCategoriaData;
                    titleEntity = "Categorias";
                    entityKey = "categoria";
                  } else if (selectedRegionalForMargin) {
                    dataSource = margemFilialData;
                    titleEntity = "Filiais";
                    entityKey = "filial";
                  } else {
                    dataSource = margemRegionalDataGlobal;
                    titleEntity = "Regionais";
                    entityKey = "regional";
                  }

                  if (!dataSource || dataSource.length === 0) return null;

                  return (
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
                      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                        <h3 className="text-sm font-black text-emerald-500 mb-4 uppercase tracking-wider flex items-center gap-2"><TrendingUp className="w-5 h-5" /> Top 4 Melhores {titleEntity}</h3>
                        <div className="flex flex-col gap-3">
                          {dataSource.slice(0, 4).map((item, idx) => (
                            <div key={`melhor-${idx}`} className="flex justify-between items-center p-3 rounded-xl bg-emerald-50/50 border border-emerald-100/50">
                              <div className="flex items-center gap-3">
                                <span className="text-xs font-black text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full shadow-sm">#{idx + 1}</span>
                                <span className="font-bold text-slate-700">{item[entityKey]}</span>
                              </div>
                              <div className="flex flex-col items-end">
                                <span className="font-black text-emerald-600">{formatCurrency(item.margemRS)}</span>
                                <span className="text-[10px] font-bold text-slate-400">Margem: {item.representatividade.toFixed(1)}%</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                        <h3 className="text-sm font-black text-red-500 mb-4 uppercase tracking-wider flex items-center gap-2"><TrendingDown className="w-5 h-5" /> Top 4 Piores {titleEntity} (Ofensoras)</h3>
                        <div className="flex flex-col gap-3">
                          {dataSource.slice(-4).reverse().map((item, idx) => (
                            <div key={`pior-${idx}`} className="flex justify-between items-center p-3 rounded-xl bg-red-50/50 border border-red-100/50">
                              <div className="flex items-center gap-3">
                                <span className="text-xs font-black text-red-600 bg-red-100 px-2 py-0.5 rounded-full shadow-sm">#{idx + 1}</span>
                                <span className="font-bold text-slate-700">{item[entityKey]}</span>
                              </div>
                              <div className="flex flex-col items-end">
                                <span className="font-black text-red-600">{formatCurrency(item.margemRS)}</span>
                                <span className="text-[10px] font-bold text-slate-400">Margem: {item.representatividade.toFixed(1)}%</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* GESTÃO DE PENALIDADES (SEM FATURAMENTO) */}
            {activeMenu === 'gestao_penalidades' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="h-full"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1, duration: 0.4 }}
                    className="md:col-span-2 lg:col-span-4 bg-white dark:bg-slate-900 p-8 md:p-10 rounded-[2rem] shadow-sm hover:shadow-md transition-shadow border border-slate-200 dark:border-slate-800 relative overflow-hidden flex flex-col justify-between group"
                  >
                    <div className="absolute -right-8 -top-8 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity duration-500"><AlertCircle className="w-64 h-64 text-red-500" /></div>
                    <div>
                      <h2 className="text-sm md:text-base font-bold text-slate-500 dark:text-slate-400 mb-2 z-10 tracking-widest uppercase flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-red-500" /> Penalidades Globais
                      </h2>
                      <div className="flex flex-col mb-8 z-10">
                        <span className="text-4xl lg:text-5xl font-black leading-tight tracking-tight text-slate-800 dark:text-white flex items-center gap-3">
                          {formatCurrency(resumoMetrics.total)}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400 mt-2 font-medium bg-slate-100 dark:bg-slate-800 self-start px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700">Total Descontado ({formatQtd(resumoMetrics.qtdTotal)} infrações)</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm z-10 pt-6 border-t border-slate-100 dark:border-slate-800/50">
                      <div className="flex justify-between md:flex-col md:justify-center md:items-start md:gap-1 items-center"><span className="text-slate-500 dark:text-slate-400 font-semibold">PNRs</span> <span className="font-bold text-slate-700 dark:text-slate-300 md:text-lg">{formatCurrency(pnrTot.valor)}</span></div>
                      <div className="flex justify-between md:flex-col md:justify-center md:items-start md:gap-1 items-center"><span className="text-slate-500 dark:text-slate-400 font-semibold">Lost Packages</span> <span className="font-bold text-slate-700 dark:text-slate-300 md:text-lg">{formatCurrency(lostTot.valor)}</span></div>
                      <div className="flex justify-between md:flex-col md:justify-center md:items-start md:gap-1 items-center"><span className="text-slate-500 dark:text-slate-400 font-semibold">Not Visited</span> <span className="font-bold text-slate-700 dark:text-slate-300 md:text-lg">{formatCurrency(nvTot.valor)}</span></div>
                    </div>
                  </motion.div>
                </div>

                <div className="relative group">
                  {isLoadingDetalhes && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/60 dark:bg-slate-900/60 backdrop-blur-md rounded-[2rem] transition-all">
                      <div className="flex flex-col items-center">
                        <div className="relative mb-4">
                          <Skeleton className="w-16 h-16 rounded-full" />
                          <div className="absolute inset-0 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
                        </div>
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-200 tracking-wide">Buscando detalhes da operação...</span>
                      </div>
                    </div>
                  )}
                  <RunRatePenalidadesSection baseData={baseRunRateData} targetQuinzena={targetQuinzenaRunRate} prevStats={prevQuinzenaStats} onDrilldown={(f) => { handleOpenEvolutivo(f); }} isForecastMode={isForecastMode} setIsForecastMode={setIsForecastMode} />
                </div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.4 }}
                  className="bg-white dark:bg-slate-900 p-6 md:p-10 rounded-[2rem] shadow-sm hover:shadow-md transition-shadow border border-slate-200 dark:border-slate-800 mt-8 group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-900/20 flex items-center justify-center border border-violet-100 dark:border-violet-500/20">
                        <Scale className="w-5 h-5 text-violet-500" />
                      </div>
                      <h2 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">
                        {selectedQuinzenaPareto ? `Detalhamento de Filiais - ${selectedQuinzenaPareto}` : 'Evolução de Penalidades por Quinzena'}
                      </h2>
                    </div>
                    {selectedQuinzenaPareto && (
                      <button onClick={() => setSelectedQuinzenaPareto(null)} className="text-xs md:text-sm font-bold text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/30 px-4 py-2 rounded-full border border-violet-200 dark:border-violet-500/30 hover:bg-violet-100 dark:hover:bg-violet-900/50 transition-all shadow-sm">
                        ← Voltar para Visão Geral
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mb-8 pl-13">
                    {selectedQuinzenaPareto ? 'Detalhamento das infrações no período selecionado.' : 'Clique sobre a barra de uma quinzena para abrir o detalhamento das filiais (Drill-down).'}
                  </p>
                  <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 rounded-2xl p-4">
                    {!selectedQuinzenaPareto ? (
                      <NativeComboChart data={paretoQuinzenaData} labelKey="quinzena" heightClass="h-[400px]" onBarClick={(q) => setSelectedQuinzenaPareto(q)} showFaturamento={false} showTotalLine={true} />
                    ) : (
                      <NativeComboChart data={paretoFilialDrilldownData} labelKey="filial" heightClass="h-[400px]" showFaturamento={false} showTotalLine={true} />
                    )}
                  </div>
                </motion.div>
              </motion.div>
            )}

            {/* DETALHE FINANCEIRO */}
            {activeMenu === 'detalhe_financeiro' && (
              <DetalheFinanceiroSection dadosFiltrados={dadosFiltrados} onExport={(options) => handleDownloadExcel('penalidades', options)} isExporting={exportingType === 'excel-penalidades'} initialFilial={drilldownFilial} initialMotorista={drilldownMotorista} returnToModalState={returnToModalState} onReturnToModal={() => { setActiveMenu(returnToModalState.menu); handleOpenEvolutivo(returnToModalState.filial); setReturnToModalState(null); setFiltroQuinzenas([]); }} />
            )}


            {/* COMPARATIVO BSC */}
            {activeMenu === 'comparativo_bsc' && (
              <ComparativoBscSection dataOp={operacionalSimulado} dataBsc={bscSimulado} />
            )}

            {/* GAPS OPERACIONAIS */}
            {activeMenu === 'gaps_operacionais' && (
              <GapsOperacionaisSection dataOp={operacionalSimulado} dataBsc={bscSimulado}
                onCardClick={(type, value) => {
                  if (type === 'filial') setFiltroFiliais(filiaisDisponiveis.filter(f => f !== value));
                  if (type === 'motorista') {
                    const found = distributedDados.find(d => d.motorista === value);
                    if (found) {
                      setFiltroFiliais(filiaisDisponiveis.filter(f => f !== found.filial));
                    }
                  }
                  if (type === 'motivo') {
                    setInsucessosExcluidos(insucessosDisponiveis.filter(i => i !== value));
                  }
                }}
              />
            )}

            {/* GESTÃO OPERACIONAL E BSC (VISÃO UNIFICADA E DINÂMICA) */}
            {isOpOrBscView && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="h-full"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1, duration: 0.4 }}
                    className="md:col-span-2 lg:col-span-4 bg-white dark:bg-slate-900 p-8 md:p-10 rounded-[2rem] shadow-sm hover:shadow-md transition-shadow border border-slate-200 dark:border-slate-800 relative overflow-hidden flex flex-col justify-between group"
                  >
                    <div className="absolute -right-8 -top-8 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity duration-500"><IconOverview className="w-64 h-64 text-emerald-500" /></div>
                    <div>
                      <h2 className="text-sm md:text-base font-bold text-slate-500 dark:text-slate-400 mb-2 z-10 tracking-widest uppercase flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500" /> Overview {titlePrefix} (DS)
                      </h2>
                      <div className="flex flex-col mb-8 z-10">
                        <span className={`text-4xl lg:text-5xl font-black leading-tight tracking-tight ${currentDsGlobalAtual >= 98.5 ? 'text-emerald-600 dark:text-emerald-400' : (currentDsGlobalAtual >= 95 ? 'text-orange-600 dark:text-orange-400' : 'text-red-600 dark:text-red-400')}`}>{formatDS(currentDsGlobalAtual)}</span>
                        <span className="text-xs text-slate-500 dark:text-slate-400 mt-2 font-medium bg-slate-100 dark:bg-slate-800 self-start px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700">Delivery Success Atual (Meta: 98.5%)</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm z-10 pt-6 border-t border-slate-100 dark:border-slate-800/50">
                      <div className="flex justify-between md:flex-col md:justify-center md:items-start md:gap-1 items-center"><span className="text-slate-500 dark:text-slate-400 font-semibold">Total de Pacotes</span> <span className="font-mono font-bold text-slate-700 dark:text-slate-300 md:text-lg">{formatQtd(currentGlobalSaldo)} un.</span></div>
                      <div className="flex justify-between md:flex-col md:justify-center md:items-start md:gap-1 items-center"><span className="text-emerald-600 dark:text-emerald-400 font-semibold">Pacotes Entregues</span> <span className="font-mono font-bold text-emerald-700 dark:text-emerald-300 md:text-lg">{formatQtd(currentGlobalEntregues)} un.</span></div>
                      <div className="flex justify-between md:flex-col md:justify-center md:items-start md:gap-1 items-center"><span className="text-red-600 dark:text-red-400 font-semibold">Total de Insucessos</span> <span className="font-mono font-bold text-red-700 dark:text-red-300 md:text-lg">{formatQtd(currentGlobalSaldo - currentGlobalEntregues)} un.</span></div>
                    </div>

                    {globalInsucessosArray.length > 0 && (
                      <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800/50 relative z-10">
                        <span className="text-slate-500 dark:text-slate-400 font-bold text-xs uppercase tracking-wider mb-4 block flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-slate-400" /> Detalhamento dos Insucessos Globais
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-3">
                          {globalInsucessosArray.slice(0, 8).map(([motivo, qtd], idx) => (
                            <div key={idx} className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 px-3 py-2 rounded-xl border border-slate-100 dark:border-slate-700/50 hover:border-red-200 dark:hover:border-red-900/50 transition-colors group/item">
                              <span className="text-slate-600 dark:text-slate-300 text-xs font-medium truncate pr-2 group-hover/item:text-red-600 dark:group-hover/item:text-red-400 transition-colors" title={motivo}>{motivo}</span>
                              <span className="font-mono text-red-600 dark:text-red-400 text-xs font-bold bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded-md">{formatQtd(qtd)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </motion.div>
                </div>

                <RunRateOperacionalSection baseData={currentOpRunRateData} targetQuinzena={targetQuinzenaRunRate} titlePrefix={titlePrefix} isForecastMode={isForecastMode} setIsForecastMode={setIsForecastMode} />

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.4 }}
                  className="bg-white dark:bg-slate-900 p-6 md:p-10 rounded-[2rem] shadow-sm hover:shadow-md transition-shadow border border-slate-200 dark:border-slate-800 mt-8 group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center border border-emerald-100 dark:border-emerald-500/20">
                        <IconOverview className="w-5 h-5 text-emerald-500" />
                      </div>
                      <h2 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">
                        {selectedQuinzenaDS ? `Detalhamento de Filiais ${titlePrefix} - ${selectedQuinzenaDS}` : `Evolução de DS ${titlePrefix} por Quinzena`}
                      </h2>
                    </div>
                    {selectedQuinzenaDS && (
                      <button onClick={() => setSelectedQuinzenaDS(null)} className="text-xs md:text-sm font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-4 py-2 rounded-full border border-emerald-200 dark:border-emerald-500/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-all shadow-sm">
                        ← Voltar para Visão Geral
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mb-8 pl-13">
                    {selectedQuinzenaDS ? 'Detalhamento operacional do período selecionado.' : 'Clique sobre a barra de uma quinzena para abrir o detalhamento das filiais (Drill-down).'}
                  </p>

                  <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 rounded-2xl p-4">
                    {!selectedQuinzenaDS ? (
                      <NativeDSChart data={dsQuinzenaData} labelKey="quinzena" heightClass="h-[400px]" onBarClick={(q) => setSelectedQuinzenaDS(q)} />
                    ) : (
                      <NativeDSChart data={dsFilialDrilldownData} labelKey="filial" heightClass="h-[400px]" />
                    )}
                  </div>
                </motion.div>
              </motion.div>
            )}
          </div>
        </div>



      </main>

      {modalEvolutivoFilial && (
        <FilialPenalidadesModal
          isOpMode={isOpMode}
          filial={modalEvolutivoFilial}
          targetQuinzena={targetQuinzenaRunRate}
          dadosPlanilha={detailedPenalidades.length > 0 ? detailedPenalidades : distributedDados}
          faturamentoPlanilha={distributedFaturamento}
          onClose={() => setModalEvolutivoFilial(null)}

          onExportExcel={(casos) => handleDownloadExcel('evolutivo', { data: casos, filial: modalEvolutivoFilial, isOpMode })}
          onNavigateToDetalhes={(motorista) => {
            setActiveMenu('detalhe_financeiro');
            setReturnToModalState({ menu: activeMenu, filial: modalEvolutivoFilial });
            setDrilldownFilial(modalEvolutivoFilial);
            setDrilldownMotorista(motorista);
            setFiltroQuinzenas(quinzenasDisponiveis.filter(q => q !== targetQuinzenaRunRate));
            setModalEvolutivoFilial(null);
          }}
        />
      )}
    </div>
  );
}