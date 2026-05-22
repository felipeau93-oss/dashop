import React, { useState, useCallback, useMemo } from 'react';
import {
  Lock, 
  LayoutDashboard, 
  AlertCircle, 
  TrendingUp, 
  RefreshCw, 
  Building2, 
  Users,
  DollarSign,
  Hash,
  Calculator,
  FileSpreadsheet,
  ArrowUpDown,
  ArrowDown,
  ArrowUp,
  Scale,
  Activity
} from 'lucide-react';

// ============================================================================
// DADOS PRÉ-PROCESSADOS (MOCK)
// ============================================================================
const initialParsedData = [
  { quinzena: "202601Q1", regional: "1", supervisor: "Carlos Mendes", filial: "ERS16", motorista: "Iasmin da Silva Rodrigues", tipo: "Lost Packages", valor: 854.98 },
  { quinzena: "202601Q1", regional: "2", supervisor: "Ana Paula", filial: "ERS7", motorista: "Robinson Dorneles Cunha", tipo: "Lost Packages", valor: 20.95 },
  { quinzena: "202601Q1", regional: "1", supervisor: "Carlos Mendes", filial: "ESC5", motorista: "Gustavo Dias Chawiche", tipo: "Lost Packages", valor: 29.95 },
  { quinzena: "202601Q1", regional: "3", supervisor: "Roberto Justus", filial: "ESC9", motorista: "Bruno Gustavo Kunz da Silva", tipo: "Lost Packages", valor: 149.00 },
  { quinzena: "202601Q1", regional: "2", supervisor: "Ana Paula", filial: "ERS1", motorista: "Daniel Das Neves Souza", tipo: "Lost Packages", valor: 908.51 },
  { quinzena: "202601Q1", regional: "4", supervisor: "Juliana Silva", filial: "SSC4", motorista: "Elvis Magrinelli", tipo: "Lost Packages", valor: 4487.17 },
  { quinzena: "202601Q1", regional: "1", supervisor: "Carlos Mendes", filial: "ESC4", motorista: "Alice Edimar Zampieri", tipo: "Lost Packages", valor: 1613.03 },
  { quinzena: "202601Q1", regional: "3", supervisor: "Roberto Justus", filial: "ERS9", motorista: "Rosilaine Alves Fagundes", tipo: "Lost Packages", valor: 730.90 },
  { quinzena: "202601Q1", regional: "1", supervisor: "Carlos Mendes", filial: "ESC5", motorista: "Joel Vieira Gama", tipo: "PNRs", valor: 80.00 },
  { quinzena: "202601Q1", regional: "3", supervisor: "Roberto Justus", filial: "ESC9", motorista: "Valdecir Gottert", tipo: "PNRs", valor: 759.00 },
  { quinzena: "202601Q1", regional: "2", supervisor: "Ana Paula", filial: "SRS7", motorista: "Maiquel da Silva Dos Reis", tipo: "PNRs", valor: 713.00 },
  { quinzena: "202601Q1", regional: "3", supervisor: "Roberto Justus", filial: "ESC9", motorista: "Lilian Rezende", tipo: "PNRs", valor: 755.00 },
  { quinzena: "202601Q1", regional: "4", supervisor: "Juliana Silva", filial: "SRS8", motorista: "Maiki Cruz Teles", tipo: "PNRs", valor: 1148.00 },
  { quinzena: "202601Q1", regional: "1", supervisor: "Carlos Mendes", filial: "ERS16", motorista: "Jacques Ariel da Silva Rodrigues", tipo: "Not Visited", valor: 507.85 },
];

const initialFaturamentoData = [
  { quinzena: "202601Q1", regional: "1", supervisor: "Carlos Mendes", filial: "ERS16", motorista: "Iasmin da Silva Rodrigues", faturamento: 12450.50, id_rota: "R01", categoria: "Van" },
  { quinzena: "202601Q1", regional: "1", supervisor: "Carlos Mendes", filial: "ESC4", motorista: "Alice", faturamento: 8200.00, id_rota: "R02", categoria: "Fiorino" },
  { quinzena: "202601Q1", regional: "1", supervisor: "Carlos Mendes", filial: "ESC5", motorista: "Gustavo", faturamento: 15300.00, id_rota: "R03", categoria: "VUC" },
  { quinzena: "202601Q1", regional: "3", supervisor: "Roberto Justus", filial: "ESC9", motorista: "Bruno", faturamento: 11200.00, id_rota: "R04", categoria: "Van" },
  { quinzena: "202601Q1", regional: "4", supervisor: "Juliana Silva", filial: "SSC4", motorista: "Elvis", faturamento: 5000.00, id_rota: "R05", categoria: "Fiorino" },
];

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

const formatCurrency = (value) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

const formatQtd = (value) => {
  if (value === undefined || value === null) return 0;
  return Number.isInteger(value) ? value : Number(value).toFixed(2);
};

const loadScript = (src) => {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const script = document.createElement('script');
    script.src = src; script.onload = resolve; script.onerror = reject;
    document.head.appendChild(script);
  });
};

const columnLabelsMap = {
  quinzena: 'Quinzena',
  regional: 'Regional',
  supervisor: 'Supervisor',
  filial: 'Filial',
  motorista: 'Motorista'
};

const normalizeText = (str) => String(str).trim().toUpperCase();

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
    const q = day <= 15 ? 'Q1' : 'Q2';
    return `${year}${month}${q}`;
  }

  const dateMatchUS = cleanVal.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (dateMatchUS) {
    const year = parseInt(dateMatchUS[1], 10);
    const month = parseInt(dateMatchUS[2], 10).toString().padStart(2, '0');
    const day = parseInt(dateMatchUS[3], 10);
    const q = day <= 15 ? 'Q1' : 'Q2';
    return `${year}${month}${q}`;
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

const getThemeColors = (color) => {
  const maps = {
    blue: { bg: 'bg-blue-50', border: 'border-blue-100', text: 'text-blue-900', high: 'text-blue-600', tableHead: 'border-blue-200' },
    orange: { bg: 'bg-orange-50', border: 'border-orange-100', text: 'text-orange-900', high: 'text-orange-600', tableHead: 'border-orange-200' },
    emerald: { bg: 'bg-emerald-50', border: 'border-emerald-100', text: 'text-emerald-900', high: 'text-emerald-600', tableHead: 'border-emerald-200' },
    red: { bg: 'bg-red-50', border: 'border-red-100', text: 'text-red-900', high: 'text-red-600', tableHead: 'border-red-200' },
    rose: { bg: 'bg-rose-50', border: 'border-rose-100', text: 'text-rose-900', high: 'text-rose-600', tableHead: 'border-rose-200' },
    purple: { bg: 'bg-purple-50', border: 'border-purple-100', text: 'text-purple-900', high: 'text-purple-600', tableHead: 'border-purple-200' },
    indigo: { bg: 'bg-indigo-50', border: 'border-indigo-100', text: 'text-indigo-900', high: 'text-indigo-600', tableHead: 'border-indigo-200' },
    violet: { bg: 'bg-violet-50', border: 'border-violet-100', text: 'text-violet-900', high: 'text-violet-600', tableHead: 'border-violet-200' }
  };
  return maps[color] || maps.blue;
};

const BreakdownLabels = ({ raw, isQtd, isTM, sizeClass = "text-xs px-2 py-0.5 rounded" }) => {
  const getVal = (cat) => {
    const catData = raw[cat] || { valor: 0, qtd: 0 };
    if (isTM) return formatCurrency(catData.qtd ? catData.valor / catData.qtd : 0);
    if (isQtd) return formatQtd(catData.qtd);
    return formatCurrency(catData.valor);
  };
  return (
    <div className="flex gap-2 font-medium text-slate-500 justify-center flex-wrap">
      <span className={`bg-blue-50 text-blue-700 border border-blue-100 whitespace-nowrap ${sizeClass}`}>PNR: {getVal('PNRs')}</span>
      <span className={`bg-orange-50 text-orange-700 border border-orange-100 whitespace-nowrap ${sizeClass}`}>Lost: {getVal('Lost Packages')}</span>
      {!isTM && <span className={`bg-slate-100 text-slate-600 border border-slate-200 whitespace-nowrap ${sizeClass}`}>NV: {getVal('Not Visited')}</span>}
    </div>
  );
};

// ============================================================================
// COMPONENTES DE GRÁFICOS (NATIVOS)
// ============================================================================

const NativeBarChart = ({ data, metricType, heightClass = "h-[450px]" }) => {
  if (!data || data.length === 0) return <div className={`w-full ${heightClass} flex items-center justify-center text-slate-400`}>Nenhum dado disponível.</div>;
  const maxTotal = Math.max(...data.map(d => d.total)) || 1;
  const yAxisSteps = [4, 3, 2, 1, 0];
  const isCurrency = metricType === 'valor' || metricType === 'tm';
  const excludeNV = metricType === 'tm';

  return (
    <div className={`w-full ${heightClass} flex flex-col pt-4 pb-28 relative`}>
      <div className="flex-1 flex relative">
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
          {yAxisSteps.map((step, idx) => (
            <div key={`y-axis-${idx}`} className="w-full border-t border-slate-200 flex items-center" style={{ height: step === 0 ? '0px' : 'auto', marginTop: step === 4 ? '-10px' : '0' }}>
              <span className="text-[10px] text-slate-400 bg-white pr-2 -translate-y-1/2">
                {isCurrency ? `R$ ${((maxTotal * (step / 4)) / 1000).toFixed(1)}k` : Math.round(maxTotal * (step / 4))}
              </span>
            </div>
          ))}
        </div>
        <div className="z-10 flex w-full h-full items-end gap-1 sm:gap-2 ml-12 pr-2 border-b border-slate-300">
          {data.map((d, i) => {
            const hPct = Math.max((d.total / maxTotal) * 100, 1);
            let pnrPct = 0, lostPct = 0, notVPct = 0;

            const pnrData = d.raw.PNRs || { valor: 0, qtd: 0 };
            const lostData = d.raw['Lost Packages'] || { valor: 0, qtd: 0 };
            const nvData = d.raw['Not Visited'] || { valor: 0, qtd: 0 };
            const totalData = d.raw.total || { valor: 1, qtd: 1 };

            if (metricType === 'qtd') {
                pnrPct = (pnrData.qtd / totalData.qtd) * 100 || 0;
                lostPct = (lostData.qtd / totalData.qtd) * 100 || 0;
                notVPct = excludeNV ? 0 : ((nvData.qtd / totalData.qtd) * 100 || 0);
            } else if (metricType === 'tm') {
                const totalVal = pnrData.valor + lostData.valor;
                pnrPct = totalVal ? (pnrData.valor / totalVal) * 100 : 0;
                lostPct = totalVal ? (lostData.valor / totalVal) * 100 : 0;
                notVPct = 0;
            } else {
                pnrPct = (pnrData.valor / totalData.valor) * 100 || 0;
                lostPct = (lostData.valor / totalData.valor) * 100 || 0;
                notVPct = excludeNV ? 0 : ((nvData.valor / totalData.valor) * 100 || 0);
            }
            const formatTooltipVal = (cat) => {
                const catData = d.raw[cat] || { valor: 0, qtd: 0 };
                if (metricType === 'tm') return formatCurrency(catData.qtd ? catData.valor / catData.qtd : 0);
                if (metricType === 'qtd') return formatQtd(catData.qtd);
                return formatCurrency(catData.valor);
            };
            return (
              <div key={`bar-${i}`} className="flex-1 flex flex-col justify-end h-full relative group cursor-pointer">
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50 w-52 bg-slate-900 text-white text-xs rounded-lg p-3 shadow-xl pointer-events-none">
                  <p className="font-bold border-b border-slate-700 pb-1 mb-2">{d.name}</p>
                  <div className="flex justify-between mb-1"><span className="text-blue-400">PNRs</span><span>{formatTooltipVal('PNRs')}</span></div>
                  <div className="flex justify-between mb-1"><span className="text-orange-400">Lost Packages</span><span>{formatTooltipVal('Lost Packages')}</span></div>
                  {!excludeNV && (<div className="flex justify-between mb-2"><span className="text-slate-300">Not Visited</span><span>{formatTooltipVal('Not Visited')}</span></div>)}
                  <div className="flex justify-between font-bold border-t border-slate-700 pt-2 mt-1"><span>{metricType === 'tm' ? 'Ticket Médio' : 'Total'}</span><span>{isCurrency ? formatCurrency(d.total) : formatQtd(d.total)}</span></div>
                </div>
                <div className="w-full flex flex-col hover:opacity-80 transition-opacity" style={{ height: `${hPct}%` }}>
                  {!excludeNV && <div style={{height: `${notVPct}%`}} className="bg-slate-300 rounded-t-sm w-full" />}
                  <div style={{height: `${lostPct}%`}} className={`bg-orange-500 w-full ${excludeNV ? 'rounded-t-sm' : ''}`} />
                  <div style={{height: `${pnrPct}%`}} className="bg-blue-500 w-full" />
                </div>
                <div className="absolute top-full mt-3 w-full h-28 pointer-events-none">
                  <p className="text-[9px] sm:text-[10px] text-slate-600 font-medium whitespace-nowrap truncate" style={{ transform: 'rotate(-45deg)', transformOrigin: 'top left' }}>{d.name}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="absolute bottom-2 left-0 w-full flex justify-center gap-6 text-xs font-medium text-slate-600">
        <span className="flex items-center gap-2"><div className="w-3 h-3 bg-blue-500 rounded-sm"></div> PNRs</span>
        <span className="flex items-center gap-2"><div className="w-3 h-3 bg-orange-500 rounded-sm"></div> Lost Packages</span>
        {!excludeNV && <span className="flex items-center gap-2"><div className="w-3 h-3 bg-slate-300 rounded-sm"></div> Not Visited</span>}
      </div>
    </div>
  );
};

const NativeComboChart = ({ data, labelKey = "name", onBarClick, heightClass = "h-[400px]" }) => {
  const [hoveredIndex, setHoveredIndex] = useState(null);

  React.useEffect(() => {
    setHoveredIndex(null);
  }, [data]);

  if (!data || data.length === 0) return <div className={`w-full ${heightClass} flex items-center justify-center text-slate-400`}>Nenhum dado disponível.</div>;
  
  const maxFat = Math.max(1, ...data.map(d => Math.max(d.faturamento || 0, d.penalidades || 0)));
  const maxRep = Math.max(10, ...data.map(d => d.representatividade !== Infinity && d.representatividade ? d.representatividade : 0)); 
  
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
              <div key={`y-axis-${idx}`} className="w-full border-t border-slate-100 flex items-center justify-between" style={{ height: step === 0 ? '0px' : 'auto', marginTop: step === 4 ? '-10px' : '0' }}>
                <span className="text-[10px] font-medium text-emerald-600 bg-white pr-2 -translate-y-1/2">
                  {formatAxisVal(valAtStep)}
                </span>
                <span className="text-[10px] font-bold text-violet-500 bg-white pl-2 -translate-y-1/2">
                  {`${((maxRep * (step / 4))).toFixed(1)}%`}
                </span>
              </div>
            );
          })}
        </div>

        <div className="z-10 flex w-full h-full items-end justify-around gap-1 sm:gap-2 ml-12 mr-10 border-b border-slate-300 relative">
          
          <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible z-20" viewBox="0 0 100 100" preserveAspectRatio="none">
            <polyline 
              points={data.map((d, i) => `${(i + 0.5) * (100 / data.length)},${100 - Math.min(Math.max(((d.representatividade || 0) / maxRep) * 100, 0), 100)}`).join(' ')} 
              fill="none" 
              stroke="#7c3aed" 
              strokeWidth="2.5" 
              vectorEffect="non-scaling-stroke" 
            />
          </svg>

          {hoveredIndex !== null && data[hoveredIndex] && (
            <div 
              className="absolute left-0 w-full border-t-2 border-dashed border-slate-800 opacity-80 z-10 pointer-events-none transition-all duration-200" 
              style={{ 
                bottom: `${Math.min(Math.max(((data[hoveredIndex].representatividade || 0) / maxRep) * 100, 0), 100)}%` 
              }}
            />
          )}

          {data.map((d, i) => {
            const fatPct = (log10(d.faturamento || 0) / logMaxFat) * 100;
            const penPct = (log10(d.penalidades || 0) / logMaxFat) * 100;
            const repPct = Math.min(Math.max(((d.representatividade || 0) / maxRep) * 100, 0), 100);

            // Proporções para a barra empilhada (Breakdown)
            const pnrRatio = d.penalidades > 0 ? ((d.pnr || 0) / d.penalidades) * 100 : 0;
            const lostRatio = d.penalidades > 0 ? ((d.lost || 0) / d.penalidades) * 100 : 0;
            const nvRatio = d.penalidades > 0 ? ((d.notVisited || 0) / d.penalidades) * 100 : 0;

            return (
              <div 
                key={`bar-${i}`} 
                className={`flex-1 flex flex-col justify-end h-full relative group max-w-[60px] ${onBarClick ? 'cursor-pointer' : ''}`} 
                onClick={() => onBarClick && onBarClick(d[labelKey])}
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 hidden group-hover:block z-50 w-60 bg-slate-900 text-white text-xs rounded-lg p-4 shadow-xl pointer-events-none">
                  <p className="font-bold border-b border-slate-700 pb-2 mb-3 text-center">{d[labelKey]}</p>
                  <div className="flex justify-between mb-1.5"><span className="text-emerald-400">Faturamento</span><span className="font-mono">{formatCurrency(d.faturamento || 0)}</span></div>
                  
                  <div className="flex justify-between mt-2 pt-2 border-t border-slate-700 mb-1"><span className="text-slate-300 font-bold">Total Penalidades</span><span className="font-mono text-red-400 font-bold">{formatCurrency(d.penalidades || 0)}</span></div>
                  <div className="flex justify-between mb-0.5 pl-2"><span className="text-blue-400 text-[10px]">↳ PNRs</span><span className="font-mono text-[10px]">{formatCurrency(d.pnr || 0)}</span></div>
                  <div className="flex justify-between mb-0.5 pl-2"><span className="text-orange-400 text-[10px]">↳ Lost Packages</span><span className="font-mono text-[10px]">{formatCurrency(d.lost || 0)}</span></div>
                  <div className="flex justify-between mb-1.5 pl-2"><span className="text-slate-400 text-[10px]">↳ Not Visited</span><span className="font-mono text-[10px]">{formatCurrency(d.notVisited || 0)}</span></div>

                  <div className="flex justify-between font-bold border-t border-slate-700 pt-2 mt-2">
                     <span className="text-violet-300">Representatividade</span>
                     <span className="text-violet-400">{d.representatividade === Infinity || !d.representatividade ? 'S/ Fat.' : `${d.representatividade.toFixed(2)}%`}</span>
                  </div>
                </div>

                <div className="w-full flex items-end justify-center h-full gap-[1px]">
                  <div className="bg-emerald-400 w-1/2 rounded-t-sm hover:opacity-80 transition-opacity" style={{ height: `${fatPct}%` }}></div>
                  <div className="w-1/2 flex flex-col justify-end hover:opacity-80 transition-opacity" style={{ height: `${penPct}%` }}>
                    {nvRatio > 0 && <div className="bg-slate-300 w-full" style={{ height: `${nvRatio}%`, borderTopLeftRadius: nvRatio > 0 ? '0.125rem' : '0', borderTopRightRadius: nvRatio > 0 ? '0.125rem' : '0' }}></div>}
                    {lostRatio > 0 && <div className="bg-orange-500 w-full" style={{ height: `${lostRatio}%`, borderTopLeftRadius: nvRatio === 0 && lostRatio > 0 ? '0.125rem' : '0', borderTopRightRadius: nvRatio === 0 && lostRatio > 0 ? '0.125rem' : '0' }}></div>}
                    {pnrRatio > 0 && <div className="bg-blue-500 w-full" style={{ height: `${pnrRatio}%`, borderTopLeftRadius: nvRatio === 0 && lostRatio === 0 ? '0.125rem' : '0', borderTopRightRadius: nvRatio === 0 && lostRatio === 0 ? '0.125rem' : '0' }}></div>}
                  </div>
                </div>

                <div className="absolute w-2 h-2 sm:w-2.5 sm:h-2.5 bg-white rounded-full border-2 border-violet-600 shadow-sm left-1/2 -translate-x-1/2 z-30 transition-all group-hover:scale-150 flex justify-center" style={{ bottom: `calc(${repPct}% - 4px)` }}>
                  <span className="absolute bottom-full mb-1 text-[9px] font-bold text-violet-700 bg-white/90 px-1 py-0.5 rounded shadow-sm whitespace-nowrap pointer-events-none">
                    {d[labelKey]}
                  </span>
                </div>

                <div className="absolute top-full mt-3 w-full text-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-[9px] sm:text-[10px] text-slate-600 font-bold truncate">{d[labelKey]}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      <div className="absolute bottom-2 left-0 w-full flex justify-center gap-4 sm:gap-6 text-xs font-bold text-slate-600 flex-wrap">
        <span className="flex items-center gap-1.5"><div className="w-3 h-3 bg-emerald-400 rounded-sm"></div> Faturamento</span>
        <span className="flex items-center gap-1.5"><div className="w-3 h-3 bg-blue-500 rounded-sm"></div> PNRs</span>
        <span className="flex items-center gap-1.5"><div className="w-3 h-3 bg-orange-500 rounded-sm"></div> Lost Packages</span>
        <span className="flex items-center gap-1.5"><div className="w-3 h-3 bg-slate-300 rounded-sm"></div> Not Visited</span>
        <span className="flex items-center gap-1.5 ml-2">
          <div className="flex items-center justify-center w-5 relative">
            <div className="w-full h-0.5 bg-violet-600 absolute"></div>
            <div className="w-2.5 h-2.5 bg-white border-2 border-violet-600 rounded-full z-10"></div>
          </div> 
          % Representatividade
        </span>
      </div>
    </div>
  );
};

// ============================================================================
// COMPONENTE: PROJEÇÃO (RUN RATE)
// ============================================================================
const RunRateSection = ({ baseData, targetQuinzena, prevStats }) => {
  const [totalDias, setTotalDias] = useState(15);
  const [diasOperados, setDiasOperados] = useState(8);
  const [selectedRegional, setSelectedRegional] = useState(null);

  React.useEffect(() => {
    if (diasOperados > totalDias) setDiasOperados(totalDias);
  }, [totalDias, diasOperados]);

  if (!baseData || baseData.length === 0) return null;

  const mult = diasOperados > 0 ? totalDias / diasOperados : 1;

  let globalFat = 0, globalPen = 0, globalPnr = 0, globalLost = 0, globalNv = 0;
  baseData.forEach(d => {
    globalFat += d.faturamento;
    globalPen += d.penalidades;
    globalPnr += d.pnr;
    globalLost += d.lost;
    globalNv += d.notVisited;
  });

  const projFilialData = baseData.map(d => {
    const pFat = d.faturamento * mult;
    const pPen = d.penalidades * mult;
    return {
      ...d,
      faturamento: pFat,
      penalidades: pPen,
      pnr: d.pnr * mult,
      lost: d.lost * mult,
      notVisited: d.notVisited * mult,
      representatividade: pFat > 0 ? (pPen / pFat) * 100 : (pPen > 0 ? Infinity : 0)
    };
  }).sort((a, b) => b.penalidades - a.penalidades); 

  // Agregação para Projeção por Regional
  const regionalMap = {};
  baseData.forEach(d => {
    const regName = d.regional && d.regional !== 'N/A' ? `Regional ${d.regional}` : 'Sem Regional';
    const supName = d.supervisor && d.supervisor !== 'N/A' ? d.supervisor : '';
    const r = supName && regName !== 'Sem Regional' ? `${regName} - ${supName}` : regName;
    if (!regionalMap[r]) regionalMap[r] = { name: r, faturamento: 0, penalidades: 0, pnr: 0, lost: 0, notVisited: 0 };
    regionalMap[r].faturamento += d.faturamento;
    regionalMap[r].penalidades += d.penalidades;
    regionalMap[r].pnr += d.pnr;
    regionalMap[r].lost += d.lost;
    regionalMap[r].notVisited += d.notVisited;
  });

  const projRegionalData = Object.values(regionalMap).map(r => {
    const pFat = r.faturamento * mult;
    const pPen = r.penalidades * mult;
    return {
      ...r,
      faturamento: pFat,
      penalidades: pPen,
      pnr: r.pnr * mult,
      lost: r.lost * mult,
      notVisited: r.notVisited * mult,
      representatividade: pFat > 0 ? (pPen / pFat) * 100 : (pPen > 0 ? Infinity : 0)
    };
  }).sort((a, b) => b.penalidades - a.penalidades);

  const projFatGlob = globalFat * mult;
  const projPenGlob = globalPen * mult;

  // Pegando o Top 6 para alertas baseado na REPRESENTATIVIDADE (Pareto)
  const topOfensores = [...projFilialData]
    .filter(d => d.penalidades > 0)
    .sort((a, b) => b.representatividade - a.representatividade)
    .slice(0, 6);
    
  const regionalDrilldownData = selectedRegional 
    ? projFilialData.filter(d => {
        const regName = d.regional && d.regional !== 'N/A' ? `Regional ${d.regional}` : 'Sem Regional';
        const supName = d.supervisor && d.supervisor !== 'N/A' ? d.supervisor : '';
        const rName = supName && regName !== 'Sem Regional' ? `${regName} - ${supName}` : regName;
        return rName === selectedRegional;
      }).sort((a, b) => b.representatividade - a.representatividade)
    : [];

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
    <div className="bg-white p-6 md:p-10 rounded-3xl shadow-sm border border-slate-200 mb-8">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-4">
        <div className="flex items-center gap-3">
          <Activity className="w-6 h-6 text-blue-600" />
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-slate-800">
              Projeção de Fechamento (Run Rate) - {targetQuinzena}
            </h2>
            <p className="text-sm text-slate-500 font-medium mt-1">
              Simule o resultado final ajustando o total de dias da quinzena atual.
            </p>
          </div>
        </div>

        {/* Controles de Dias */}
        <div className="flex flex-col sm:flex-row gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 w-full lg:w-auto">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-bold text-slate-500 uppercase">Dias na Quinzena:</span>
            <input 
              type="number" min="1" max="31" 
              value={totalDias} 
              onChange={(e) => setTotalDias(Math.max(1, Number(e.target.value)))}
              className="w-24 border border-slate-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-700 bg-white"
            />
          </div>
          <div className="flex flex-col gap-1 flex-1 sm:w-48">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-slate-500 uppercase">Dias Operados:</span>
              <span className="text-xs font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded">{diasOperados}</span>
            </div>
            <input 
              type="range" min="1" max={totalDias} value={diasOperados} 
              onChange={(e) => setDiasOperados(Number(e.target.value))} 
              className="w-full h-2 mt-2 bg-slate-300 rounded-lg appearance-none cursor-pointer accent-blue-600" 
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-emerald-50 border border-emerald-100 p-5 rounded-2xl flex flex-col justify-center items-center">
          <span className="text-xs font-bold text-emerald-600 uppercase mb-1">Faturamento Projetado</span>
          <span className="text-2xl font-black text-emerald-700">{formatCurrency(projFatGlob)}</span>
        </div>
        <div className="bg-red-50 border border-red-100 p-5 rounded-2xl flex flex-col justify-center items-center text-center">
          <span className="text-xs font-bold text-red-600 uppercase mb-1">Penalidades Projetadas</span>
          <span className="text-2xl font-black text-red-700 mb-1">{formatCurrency(projPenGlob)}</span>
          <div className="flex gap-2 text-[10px] font-bold text-slate-500 justify-center flex-wrap">
            <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">PNR: {formatCurrency(globalPnr * mult)}</span>
            <span className="bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded">Lost: {formatCurrency(globalLost * mult)}</span>
          </div>
        </div>
        <div className="bg-violet-50 border border-violet-100 p-5 rounded-2xl flex flex-col justify-center items-center">
          <span className="text-xs font-bold text-violet-600 uppercase mb-1">Representatividade Estimada</span>
          <span className="text-3xl font-black text-violet-700">{projFatGlob > 0 ? ((projPenGlob / projFatGlob) * 100).toFixed(2) : 0}%</span>
        </div>
      </div>

      {/* NOVO: Alerta de Risco Operacional */}
      {topOfensores.length > 0 && (
        <div className="mb-8 p-6 bg-red-50/40 border border-red-100 rounded-2xl">
          <h3 className="text-sm font-black text-red-600 mb-4 uppercase tracking-wider flex items-center gap-2">
            <AlertCircle className="w-5 h-5" /> Alerta de Risco Operacional: Top 6 Maiores Impactos na Margem (Pareto)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {topOfensores.map((filial, idx) => (
              <div key={idx} className="bg-white p-5 rounded-xl border border-red-100 shadow-sm flex flex-col relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-red-500"></div>
                <div className="flex justify-between items-start mb-2">
                   <div>
                     <span className="font-black text-slate-800 text-lg block">{filial.filial}</span>
                     <span className="text-xs font-bold text-slate-500">{filial.regional && filial.regional !== 'N/A' ? `Regional ${filial.regional}` : 'Sem Regional'}</span>
                   </div>
                   <span className="text-xs font-black text-white bg-red-500 px-2 py-0.5 rounded-full shadow-sm">#{idx + 1}</span>
                </div>
                
                <div className="flex flex-col gap-1.5 my-3 px-3 py-2.5 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="flex justify-between items-center text-[10px] font-bold"><span className="text-blue-500 uppercase">PNRs</span><span className="text-slate-700">{formatCurrency(filial.pnr)}</span></div>
                    <div className="flex justify-between items-center text-[10px] font-bold"><span className="text-orange-500 uppercase">Lost Packages</span><span className="text-slate-700">{formatCurrency(filial.lost)}</span></div>
                    <div className="flex justify-between items-center text-[10px] font-bold"><span className="text-slate-400 uppercase">Not Visited</span><span className="text-slate-700">{formatCurrency(filial.notVisited)}</span></div>
                </div>

                <div className="flex justify-between items-end mt-auto pt-3 border-t border-slate-100">
                  <div className="flex flex-col">
                     <span className="text-[10px] text-slate-400 uppercase font-bold">Margem Comprometida</span>
                     <span className="text-lg font-black text-red-600">{filial.representatividade === Infinity ? 'N/A' : `${filial.representatividade.toFixed(1)}%`}</span>
                  </div>
                  <div className="flex flex-col items-end">
                     <span className="text-[10px] text-slate-400 uppercase font-bold">Projeção (Total)</span>
                     <span className="text-sm font-black text-violet-600">{formatCurrency(filial.penalidades)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* NOVO: Gráficos lado a lado Regional e Filial */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col">
          <div className="flex items-center justify-between mb-4 px-2 pt-2">
            <h3 className="text-sm font-bold text-slate-600 uppercase tracking-wider">
              {selectedRegional ? `Filiais: ${selectedRegional}` : 'Projeção por Regional'}
            </h3>
            {selectedRegional && (
              <button 
                onClick={() => setSelectedRegional(null)}
                className="text-[10px] sm:text-xs font-bold text-blue-600 bg-blue-100 px-2 py-1 rounded hover:bg-blue-200 transition-colors"
              >
                ← Voltar
              </button>
            )}
          </div>
          {!selectedRegional ? (
            <NativeComboChart 
              data={projRegionalData} 
              labelKey="name" 
              heightClass="h-[350px]" 
              onBarClick={(r) => setSelectedRegional(r)}
            />
          ) : (
            <NativeComboChart 
              data={regionalDrilldownData} 
              labelKey="filial" 
              heightClass="h-[350px]" 
            />
          )}
        </div>
        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col">
          <h3 className="text-sm font-bold text-slate-600 text-center mb-2 pt-2 uppercase tracking-wider">Projeção por Filial (Maiores Descontos)</h3>
          <NativeComboChart 
            data={projFilialData.slice(0, 15)} 
            labelKey="filial" 
            heightClass="h-[350px]" 
          />
        </div>
      </div>

      {prevStats && (
        <div className="mt-8 bg-slate-900 rounded-3xl p-6 md:p-8 text-slate-300 shadow-xl border border-slate-800 relative overflow-hidden">
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
                
                <li className="flex flex-col gap-3 mt-6 pt-6 border-t border-slate-800">
                    <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Comportamento por Tipo de Infração</p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                            <span className="text-blue-400 text-xs font-bold tracking-wider uppercase">PNRs</span>
                            <div className="flex justify-between items-center mt-2">
                                <span className="text-white font-mono text-base font-bold">{formatCurrency(globalPnr * mult)}</span>
                                {getInsightTag(pnrVar, true)}
                            </div>
                        </div>
                        <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                            <span className="text-orange-400 text-xs font-bold tracking-wider uppercase">Lost Packages</span>
                            <div className="flex justify-between items-center mt-2">
                                <span className="text-white font-mono text-base font-bold">{formatCurrency(globalLost * mult)}</span>
                                {getInsightTag(lostVar, true)}
                            </div>
                        </div>
                        <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                            <span className="text-slate-400 text-xs font-bold tracking-wider uppercase">Not Visited</span>
                            <div className="flex justify-between items-center mt-2">
                                <span className="text-white font-mono text-base font-bold">{formatCurrency(globalNv * mult)}</span>
                                {getInsightTag(nvVar, true)}
                            </div>
                        </div>
                    </div>
                </li>
            </ul>
        </div>
      )}
    </div>
  );
};


// ============================================================================
// APP PRINCIPAL
// ============================================================================
export default function App() {
  // === SISTEMA DE LOGIN ===
  const [isAuthenticated, setIsAuthenticated] = useState(() => localStorage.getItem('dashopAuth') === 'true');
  const [senhaDigitada, setSenhaDigitada] = useState('');
  const [erroLogin, setErroLogin] = useState(false);

  const SENHA_CORRETA = 'operacao2026'; // ⚠️ MUDE AQUI PARA A SENHA QUE VOCÊ QUISER!

  const handleLogin = (e) => {
    e.preventDefault();
    if (senhaDigitada === SENHA_CORRETA) {
      localStorage.setItem('dashopAuth', 'true'); // Salva no navegador para não pedir senha toda vez
      setIsAuthenticated(true);
      setErroLogin(false);
    } else {
      setErroLogin(true);
    }
  };
  // ========================
  const [rawData, setRawData] = useState(initialParsedData);
  const [rawFaturamentoData, setRawFaturamentoData] = useState(initialFaturamentoData);
  
  const [error, setError] = useState(null);
  const [sheetUrl, setSheetUrl] = useState('https://docs.google.com/spreadsheets/d/1BeuQJXcR0o9vVb-Xq5vZ4PWSnKE-_Uxf2bkQYylIwS0/edit?gid=0#gid=0');
  const [sheetUrlFaturamento, setSheetUrlFaturamento] = useState('https://docs.google.com/spreadsheets/d/1BeuQJXcR0o9vVb-Xq5vZ4PWSnKE-_Uxf2bkQYylIwS0/edit?gid=2143847273#gid=2143847273');
  
  const [isLoading, setIsLoading] = useState(false);
  const [filtroQuinzena, setFiltroQuinzena] = useState('Todas');
  const [filtroRegional, setFiltroRegional] = useState('Todas');
  const [filtroSupervisor, setFiltroSupervisor] = useState('Todas');
  const [filtroFilial, setFiltroFilial] = useState('Todas');
  
  const [activeMenu, setActiveMenu] = useState('resumo');
  const [exportingType, setExportingType] = useState(null);

  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'desc' });
  const [selectedQuinzenaPareto, setSelectedQuinzenaPareto] = useState(null);

  React.useEffect(() => {
    setSelectedQuinzenaPareto(null);
  }, [filtroQuinzena, filtroFilial, filtroRegional, filtroSupervisor, activeMenu]);

  React.useEffect(() => {
    setFiltroSupervisor('Todas');
    setFiltroFilial('Todas');
  }, [filtroRegional]);

  React.useEffect(() => {
    setFiltroFilial('Todas');
  }, [filtroSupervisor]);

  const handleMenuChange = (menu) => {
    setActiveMenu(menu);
    setSortConfig({ key: null, direction: 'desc' }); 
  };

  const handleSort = (key) => {
    let direction = 'desc';
    if (sortConfig.key === key && sortConfig.direction === 'desc') { direction = 'asc'; }
    setSortConfig({ key, direction });
  };

  const getSortedData = (data) => {
    if (!sortConfig.key || !data) return data;
    return [...data].sort((a, b) => {
      let aValue = a[sortConfig.key];
      let bValue = b[sortConfig.key];
      if (typeof aValue === 'string') { aValue = aValue.toLowerCase(); bValue = bValue.toLowerCase(); }
      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const SortIcon = ({ columnKey }) => {
    if (sortConfig.key !== columnKey) return <ArrowUpDown className="w-3 h-3 inline-block ml-1 opacity-30" />;
    return sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 inline-block ml-1 text-blue-600" /> : <ArrowDown className="w-3 h-3 inline-block ml-1 text-blue-600" />;
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
      const headers = parseCSVLine(lines[0], delimiter).map(h => h.trim().toLowerCase());
      
      const idxQuinzena = headers.findIndex(h => h.includes('quinzena') || h.includes('data') || h.includes('período') || h.includes('periodo'));
      const idxRegional = 12; // Mapeamento fixo para a Coluna M da planilha de Penalidades
      const idxSupervisor = headers.findIndex(h => h.includes('superv') || h.includes('gestor') || h.includes('coord'));
      const idxFilial = headers.findIndex(h => h.includes('filial') || h.includes('base'));
      const idxMotorista = headers.findIndex(h => h.includes('motorista') || h.includes('nome'));
      
      let idxTipo = headers.findIndex(h => h.includes('tipo') || h.includes('motivo') || h.includes('categoria') || h.includes('descri') || h.includes('infração') || h.includes('infracao') || h.includes('ocorr'));
      let idxValor = headers.findIndex(h => h.includes('valor') || h.includes('desconto') || h.includes('total') || h.includes('penalidade') || h.includes('custo') || h.includes('r$'));

      const parsed = [];
      for (let i = 1; i < lines.length; i++) {
        let cols = parseCSVLine(lines[i], delimiter);
        
        const quinzena = idxQuinzena !== -1 ? normalizeQuinzena(cols[idxQuinzena]) : 'N/A';
        const regional = idxRegional !== -1 ? extractRegional(cols[idxRegional]) : 'N/A';
        const supervisor = idxSupervisor !== -1 ? cols[idxSupervisor] : 'N/A';
        const filial = idxFilial !== -1 ? cols[idxFilial] : 'N/A';
        const motorista = idxMotorista !== -1 ? cols[idxMotorista] : 'N/A';
        
        let rawTipo = idxTipo !== -1 ? cols[idxTipo] : ''; 
        let rawValor = idxValor !== -1 ? cols[idxValor] : ''; 
        
        // Fallback
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

        parsed.push({ quinzena, regional, supervisor, filial, motorista, tipo: tipoFinal, valor });
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
      const headers = parseCSVLine(lines[0], delimiter).map(h => h.trim().toLowerCase());
      
      const idxQuinzena = headers.findIndex(h => h.includes('quinzena') || h.includes('data') || h.includes('período') || h.includes('periodo'));
      const idxRegional = 6; // Mapeamento fixo para a Coluna G da planilha de Faturamento
      const idxSupervisor = headers.findIndex(h => h.includes('superv') || h.includes('gestor') || h.includes('coord'));
      const idxFilial = headers.findIndex(h => h.includes('filial') || h.includes('operacao') || h.includes('base'));
      const idxMotorista = headers.findIndex(h => h.includes('motorista') || h.includes('nome'));
      const idxIdRota = headers.findIndex(h => h.includes('rota') || h.includes('id'));
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
        
        // Fallback
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

  const fetchFromGoogleSheets = async () => {
    setIsLoading(true); setError(null);
    try {
      if (sheetUrl) {
          let url1 = sheetUrl;
          if (url1.includes('/edit')) {
              const docId = url1.match(/\/d\/([a-zA-Z0-9-_]+)/);
              const gid = url1.match(/gid=([0-9]+)/);
              if (docId) url1 = `https://docs.google.com/spreadsheets/d/${docId[1]}/export?format=csv&gid=${gid ? gid[1] : '0'}`;
          }
          const res1 = await fetch(url1);
          if (res1.ok) processRawCSV(await res1.text());
      }
      if (sheetUrlFaturamento) {
          let url3 = sheetUrlFaturamento;
          if (url3.includes('/edit')) {
              const docId3 = url3.match(/\/d\/([a-zA-Z0-9-_]+)/);
              const gid3 = url3.match(/gid=([0-9]+)/);
              if (docId3) url3 = `https://docs.google.com/spreadsheets/d/${docId3[1]}/export?format=csv&gid=${gid3 ? gid3[1] : '0'}`;
          }
          const res3 = await fetch(url3);
          if (res3.ok) processFaturamentoData(await res3.text());
      }
    } catch (err) { setError('Falha no download das planilhas. Verifique os links.'); } 
    finally { setIsLoading(false); }
  };

  // ============================================================================
  // MOTOR DE RATEIO SSC4
  // ============================================================================
  
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
                    if (ratios[target] > 0) {
                        result.push({ ...d, filial: target, valor: d.valor * ratios[target], _pesoQtd: ratios[target] });
                    }
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
                    if (ratios[target] > 0) {
                        result.push({ ...d, filial: target, faturamento: d.faturamento * ratios[target] });
                    }
                });
            } else { result.push(d); }
        } else { result.push(d); }
    });
    return result;
  }, [rawFaturamentoData, ssc4RatiosPerQuinzena]);


  // ============================================================================
  // CÁLCULOS E AGREGAÇÕES GERAIS 
  // ============================================================================
  const quinzenasDisponiveis = useMemo(() => {
    const q1 = distributedDados.map(d => d.quinzena);
    const q3 = distributedFaturamento.map(d => d.quinzena);
    return [...new Set([...q1, ...q3])].sort().reverse();
  }, [distributedDados, distributedFaturamento]);
  
  const regionaisDisponiveis = useMemo(() => {
    const r1 = distributedDados.map(d => d.regional);
    const r2 = distributedFaturamento.map(d => d.regional);
    return [...new Set([...r1, ...r2].filter(r => r && r !== 'N/A'))].sort();
  }, [distributedDados, distributedFaturamento]);

  const supervisoresDisponiveis = useMemo(() => {
    const s1 = distributedDados.filter(d => filtroRegional === 'Todas' || d.regional === filtroRegional).map(d => d.supervisor);
    const s2 = distributedFaturamento.filter(d => filtroRegional === 'Todas' || d.regional === filtroRegional).map(d => d.supervisor);
    return [...new Set([...s1, ...s2].filter(s => s && s !== 'N/A'))].sort();
  }, [distributedDados, distributedFaturamento, filtroRegional]);

  const filiaisDisponiveis = useMemo(() => {
    const f1 = distributedDados.filter(d => 
      (filtroRegional === 'Todas' || d.regional === filtroRegional) &&
      (filtroSupervisor === 'Todas' || d.supervisor === filtroSupervisor)
    ).map(d => d.filial);
    const f2 = distributedFaturamento.filter(d => 
      (filtroRegional === 'Todas' || d.regional === filtroRegional) &&
      (filtroSupervisor === 'Todas' || d.supervisor === filtroSupervisor)
    ).map(d => d.filial);
    return [...new Set([...f1, ...f2].filter(f => f && f !== 'N/A'))].sort();
  }, [distributedDados, distributedFaturamento, filtroRegional, filtroSupervisor]);

  const dadosFiltrados = useMemo(() => {
    return distributedDados.filter(d => 
      (filtroQuinzena === 'Todas' || d.quinzena === filtroQuinzena) && 
      (filtroFilial === 'Todas' || d.filial === filtroFilial) &&
      (filtroRegional === 'Todas' || d.regional === filtroRegional) &&
      (filtroSupervisor === 'Todas' || d.supervisor === filtroSupervisor)
    );
  }, [distributedDados, filtroQuinzena, filtroFilial, filtroRegional, filtroSupervisor]);

  const faturamentoFiltrado = useMemo(() => {
    return distributedFaturamento.filter(d => 
      (filtroQuinzena === 'Todas' || d.quinzena === filtroQuinzena) && 
      (filtroFilial === 'Todas' || d.filial === filtroFilial) &&
      (filtroRegional === 'Todas' || d.regional === filtroRegional) &&
      (filtroSupervisor === 'Todas' || d.supervisor === filtroSupervisor)
    );
  }, [distributedFaturamento, filtroQuinzena, filtroFilial, filtroRegional, filtroSupervisor]);

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

  // ============================================================================
  // BASE PARA O RUN RATE E QUINZENA ANTERIOR
  // ============================================================================
  const targetQuinzenaRunRate = filtroQuinzena !== 'Todas' ? filtroQuinzena : quinzenasDisponiveis[0];

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


  // ============================================================================
  // DADOS PARA O GRÁFICO DE PARETO (RESUMO OPERACIONAL - DRILL DOWN)
  // ============================================================================
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


  // ============================================================================
  // HIERARQUIA PARA PENALIDADES
  // ============================================================================
  const aggregatePenaltiesHierarchical = useCallback((data, keys, nameKey) => {
    const agrupado = {};
    data.forEach(d => {
      const key = keys.map(k => d[k]).join('|');
      if (!agrupado[key]) {
          agrupado[key] = {
              name: d[nameKey],
              regional: d.regional || 'N/A',
              supervisor: d.supervisor || 'N/A',
              PNRs: { valor: 0, qtd: 0 },
              'Lost Packages': { valor: 0, qtd: 0 },
              'Not Visited': { valor: 0, qtd: 0 },
              total: { valor: 0, qtd: 0 }
          };
          keys.forEach(k => agrupado[key][k] = d[k]);
      }
      agrupado[key].regional = agrupado[key].regional !== 'N/A' ? agrupado[key].regional : (d.regional || 'N/A');
      agrupado[key].supervisor = agrupado[key].supervisor !== 'N/A' ? agrupado[key].supervisor : (d.supervisor || 'N/A');

      if (!agrupado[key][d.tipo]) {
          agrupado[key][d.tipo] = { valor: 0, qtd: 0 };
      }
      
      agrupado[key][d.tipo].valor += (d.valor || 0);
      agrupado[key][d.tipo].qtd += (d._pesoQtd !== undefined ? d._pesoQtd : 1);
      agrupado[key].total.valor += (d.valor || 0);
      agrupado[key].total.qtd += (d._pesoQtd !== undefined ? d._pesoQtd : 1);
    });
    return Object.values(agrupado);
  }, []);

  const getChartData = useCallback((base, metric) => {
    return base.map(item => {
      let pnr = 0, lost = 0, nv = 0, total = 0;
      
      const pnrData = item.PNRs || { valor: 0, qtd: 0 };
      const lostData = item['Lost Packages'] || { valor: 0, qtd: 0 };
      const nvData = item['Not Visited'] || { valor: 0, qtd: 0 };
      const totalData = item.total || { valor: 0, qtd: 0 };

      if (metric === 'valor') {
        pnr = pnrData.valor; lost = lostData.valor; nv = nvData.valor; total = totalData.valor;
      } else if (metric === 'qtd') {
        pnr = pnrData.qtd; lost = lostData.qtd; nv = nvData.qtd; total = totalData.qtd;
      } else if (metric === 'tm') {
        pnr = pnrData.qtd ? pnrData.valor / pnrData.qtd : 0;
        lost = lostData.qtd ? lostData.valor / lostData.qtd : 0;
        nv = 0; 
        const totalVal = pnrData.valor + lostData.valor;
        const totalQtd = pnrData.qtd + lostData.qtd;
        total = totalQtd ? totalVal / totalQtd : 0;
      }
      return { ...item, name: item.name, 'PNRs': pnr, 'Lost Packages': lost, 'Not Visited': nv, total: total, raw: item };
    }).sort((a, b) => {
      if (a.quinzena && b.quinzena && a.quinzena !== b.quinzena) {
          return String(b.quinzena).localeCompare(String(a.quinzena));
      }
      return b.total - a.total;
    });
  }, []);

  const penFilialHierarchicalBase = useMemo(() => aggregatePenaltiesHierarchical(dadosFiltrados, ['quinzena', 'regional', 'supervisor', 'filial'], 'filial'), [dadosFiltrados, aggregatePenaltiesHierarchical]);
  const penMotoristaHierarchicalBase = useMemo(() => aggregatePenaltiesHierarchical(dadosFiltrados, ['quinzena', 'regional', 'supervisor', 'filial', 'motorista'], 'motorista'), [dadosFiltrados, aggregatePenaltiesHierarchical]);

  const chartFiliaisValor = useMemo(() => getChartData(penFilialHierarchicalBase, 'valor').slice(0, 50), [penFilialHierarchicalBase, getChartData]);
  const chartFiliaisQtd = useMemo(() => getChartData(penFilialHierarchicalBase, 'qtd').slice(0, 50), [penFilialHierarchicalBase, getChartData]);
  const chartFiliaisTM = useMemo(() => getChartData(penFilialHierarchicalBase, 'tm').slice(0, 50), [penFilialHierarchicalBase, getChartData]);
  const chartPenMotoristaValor = useMemo(() => getChartData(penMotoristaHierarchicalBase, 'valor').slice(0, 50), [penMotoristaHierarchicalBase, getChartData]);

  const crossFilialData = useMemo(() => {
    const map = {};
    faturamentoFiltrado.forEach(d => {
        const key = `${d.quinzena}|${normalizeText(d.filial)}`;
        if (!map[key]) map[key] = { quinzena: d.quinzena, regional: d.regional || 'N/A', supervisor: d.supervisor || 'N/A', filial: d.filial, faturamento: 0, penalidades: 0, pnr: 0, lost: 0, notVisited: 0 };
        map[key].faturamento += d.faturamento;
    });
    dadosFiltrados.forEach(d => {
        const key = `${d.quinzena}|${normalizeText(d.filial)}`;
        if (!map[key]) map[key] = { quinzena: d.quinzena, regional: d.regional || 'N/A', supervisor: d.supervisor || 'N/A', filial: d.filial, faturamento: 0, penalidades: 0, pnr: 0, lost: 0, notVisited: 0 };
        map[key].penalidades += d.valor;
        if (d.tipo === 'PNRs') map[key].pnr += d.valor;
        else if (d.tipo === 'Lost Packages') map[key].lost += d.valor;
        else if (d.tipo === 'Not Visited') map[key].notVisited += d.valor;
    });

    return Object.values(map).map(item => ({
        ...item,
        representatividade: item.faturamento > 0 ? (item.penalidades / item.faturamento) * 100 : (item.penalidades > 0 ? Infinity : 0)
    })).sort((a, b) => {
        if (a.quinzena !== b.quinzena) return String(b.quinzena).localeCompare(String(a.quinzena));
        return b.representatividade - a.representatividade;
    });
  }, [dadosFiltrados, faturamentoFiltrado]);

  // ============================================================================
  // COMPONENTES DE SEÇÕES ESPECÍFICAS (ALOCADOS INTERNAMENTE PARA ACESSO AOS HOOKS DE SORT)
  // ============================================================================

  const PenaltiesHierarchicalSection = ({ title, listData, groupBy, metricType, themeColor }) => {
    const isQtd = metricType === 'qtd';
    const isTM = metricType === 'tm';
    const theme = getThemeColors(themeColor);
    const sortedListData = getSortedData(listData);

    return (
      <div className="flex flex-col gap-6 lg:gap-8 h-full">
        <div className={`w-full rounded-3xl p-6 lg:p-8 border flex flex-col shrink-0 ${theme.bg} ${theme.border}`}>
          <div className="flex items-center gap-3 mb-4">
              <h3 className={`text-xl lg:text-2xl font-bold ${theme.text}`}>{title}</h3>
              <span className="text-xs font-bold bg-white text-slate-500 px-3 py-1 rounded-full border border-slate-200 shadow-sm">Hierarquia Ativa</span>
          </div>
          <div className="overflow-x-auto bg-white rounded-2xl border border-slate-100 shadow-sm">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className={`border-b-2 ${theme.tableHead} text-slate-500 text-xs sm:text-sm uppercase tracking-wider bg-slate-50/50 select-none`}>
                  <th className="py-3 px-4 font-bold w-12 text-center">#</th>
                  {groupBy.map((key, idx) => (
                    <th key={`th-pen-${key}-${idx}`} className="py-3 px-4 font-bold cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort(key)}>
                      {columnLabelsMap[key]} <SortIcon columnKey={key} />
                    </th>
                  ))}
                  <th className="py-3 px-4 font-bold text-center">Detalhamento (PNR / Lost / NV)</th>
                  <th className="py-3 px-4 font-bold text-right w-32 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('total')}>Total <SortIcon columnKey="total" /></th>
                </tr>
              </thead>
              <tbody>
                {sortedListData.map((item, i) => (
                  <tr key={`pen-row-${i}`} className="border-b border-slate-100 hover:bg-slate-50 transition-colors last:border-0">
                    <td className="py-3 px-4 font-bold text-slate-400 text-center">{i + 1}</td>
                    {groupBy.map((key, kIdx) => (
                      <td key={`td-pen-${key}-${kIdx}`} className="py-3 px-4 font-bold text-slate-800">{item[key]}</td>
                    ))}
                    <td className="py-3 px-4"><BreakdownLabels raw={item.raw} isQtd={isQtd} isTM={isTM} /></td>
                    <td className={`py-3 px-4 font-black text-right ${theme.high}`}>
                      {isQtd ? `${formatQtd(item.total)} un.` : formatCurrency(item.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="w-full border border-slate-200 rounded-3xl p-6 lg:p-8 bg-white flex flex-col flex-1 min-h-[500px]">
          <NativeBarChart data={sortedListData} metricType={metricType} heightClass="flex-1" />
        </div>
      </div>
    );
  };

  const CrossReportSection = ({ title, listData, themeColor = 'violet' }) => {
    const theme = getThemeColors(themeColor);
    const sortedListData = getSortedData(listData);

    return (
      <div className="flex flex-col gap-6 lg:gap-8 h-full">
        <div className={`w-full rounded-3xl p-6 lg:p-8 border flex flex-col shrink-0 ${theme.bg} ${theme.border} h-full overflow-hidden`}>
          <div className="flex items-center gap-3 mb-6">
              <Scale className={`w-6 h-6 ${theme.high}`} />
              <h3 className={`text-xl lg:text-2xl font-bold ${theme.text}`}>{title}</h3>
          </div>
          <div className="overflow-x-auto bg-white rounded-2xl border border-slate-100 shadow-sm flex-1">
            <table className="w-full text-left border-collapse min-w-[1100px]">
              <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur select-none">
                <tr className={`border-b-2 ${theme.tableHead} text-slate-500 text-xs sm:text-sm uppercase tracking-wider`}>
                  <th className="py-4 px-4 font-bold w-12 text-center">#</th>
                  <th className="py-4 px-4 font-bold cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('quinzena')}>Quinzena <SortIcon columnKey="quinzena" /></th>
                  <th className="py-4 px-4 font-bold cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('regional')}>Regional <SortIcon columnKey="regional" /></th>
                  <th className="py-4 px-4 font-bold cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('supervisor')}>Supervisor <SortIcon columnKey="supervisor" /></th>
                  <th className="py-4 px-4 font-bold cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('filial')}>Filial <SortIcon columnKey="filial" /></th>
                  
                  <th className="py-4 px-4 font-bold text-center border-l border-slate-200">Detalhamento (PNR / Lost / NV)</th>
                  <th className="py-4 px-4 font-bold text-right border-l border-slate-200 bg-emerald-50/30 text-emerald-700 cursor-pointer hover:bg-emerald-100/50 transition-colors" onClick={() => handleSort('faturamento')}>Faturamento (R$) <SortIcon columnKey="faturamento" /></th>
                  <th className="py-4 px-4 font-bold text-right bg-red-50/30 text-red-700 cursor-pointer hover:bg-red-100/50 transition-colors" onClick={() => handleSort('penalidades')}>Penalidades (R$) <SortIcon columnKey="penalidades" /></th>
                  <th className="py-4 px-4 font-bold text-right bg-violet-50/30 text-violet-700 cursor-pointer hover:bg-violet-100/50 transition-colors" onClick={() => handleSort('representatividade')}>% Representatividade <SortIcon columnKey="representatividade" /></th>
                </tr>
              </thead>
              <tbody>
                {sortedListData.length === 0 && <tr><td colSpan="9" className="py-10 text-center text-slate-400 font-medium">Nenhum dado cruzado encontrado.</td></tr>}
                {sortedListData.map((item, i) => (
                  <tr key={`cross-row-${i}`} className="border-b border-slate-100 hover:bg-slate-50 transition-colors last:border-0">
                    <td className="py-3 px-4 font-bold text-slate-400 text-center">{i + 1}</td>
                    <td className="py-3 px-4 font-bold text-slate-800">{item.quinzena}</td>
                    <td className="py-3 px-4 font-bold text-slate-800">{item.regional}</td>
                    <td className="py-3 px-4 font-bold text-slate-800">{item.supervisor}</td>
                    <td className="py-3 px-4 font-bold text-slate-800">{item.filial}</td>
                    
                    <td className="py-3 px-4 border-l border-slate-50 bg-slate-50/10">
                      <BreakdownLabels raw={{ 'PNRs': {valor: item.pnr}, 'Lost Packages': {valor: item.lost}, 'Not Visited': {valor: item.notVisited} }} isQtd={false} isTM={false} />
                    </td>

                    <td className="py-3 px-4 text-emerald-600 font-bold text-right border-l border-slate-50 bg-emerald-50/10">
                      {formatCurrency(item.faturamento)}
                    </td>
                    <td className="py-3 px-4 text-red-600 font-bold text-right bg-red-50/10">
                      {formatCurrency(item.penalidades)}
                    </td>
                    <td className={`py-3 px-4 font-black text-right bg-violet-50/10 ${item.representatividade > 5 ? 'text-red-500' : 'text-violet-600'}`}>
                      {item.representatividade === Infinity ? 'N/A (S/ Fat.)' : `${item.representatividade.toFixed(2)}%`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };


  // ============================================================================
  // EXPORTAÇÕES (EXCEL APENAS)
  // ============================================================================

  const handleDownloadExcel = async (type) => {
    setExportingType(`excel-${type}`);
    try {
      await loadScript('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js');
      const XLSX = window.XLSX;
      const wb = XLSX.utils.book_new();

      if (type === 'penalidades') {
        const pnrTot = resumoMetrics.categories['PNRs'] || { valor: 0, qtd: 0 };
        const lostTot = resumoMetrics.categories['Lost Packages'] || { valor: 0, qtd: 0 };
        const nvTot = resumoMetrics.categories['Not Visited'] || { valor: 0, qtd: 0 };
        
        const resumoData = [
          { Metrica: "Total Geral", Valor_Reais: resumoMetrics.total, Quantidade: formatQtd(resumoMetrics.qtdTotal) },
          { Metrica: "Total Faturamento", Valor_Reais: faturamentoTotalMetrics, Quantidade: faturamentoFiltrado.length },
          { Metrica: "PNRs", Valor_Reais: pnrTot.valor, Quantidade: formatQtd(pnrTot.qtd) },
          { Metrica: "Lost Packages", Valor_Reais: lostTot.valor, Quantidade: formatQtd(lostTot.qtd) },
          { Metrica: "Not Visited", Valor_Reais: nvTot.valor, Quantidade: formatQtd(nvTot.qtd) }
        ];
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(resumoData), "Resumo Penalidades");

        const formatDetailedSheet = (baseData, hasQuinzena = false) => {
          return baseData.map(item => {
            const row = {};
            if (hasQuinzena) row['Quinzena'] = item.quinzena || '-';
            row['Regional'] = item.regional || '-';
            row['Supervisor'] = item.supervisor || '-';
            row['Nome'] = item.name;
            row['Filial'] = item.filial;
            
            const pnrVal = (item.PNRs && item.PNRs.valor) || 0;
            const pnrQtd = (item.PNRs && item.PNRs.qtd) || 0;
            const lostVal = (item['Lost Packages'] && item['Lost Packages'].valor) || 0;
            const lostQtd = (item['Lost Packages'] && item['Lost Packages'].qtd) || 0;
            const nvVal = (item['Not Visited'] && item['Not Visited'].valor) || 0;
            const nvQtd = (item['Not Visited'] && item['Not Visited'].qtd) || 0;
            const totVal = (item.total && item.total.valor) || 0;
            const totQtd = (item.total && item.total.qtd) || 0;

            row['Total_Reais'] = totVal;
            row['Total_Qtd'] = formatQtd(totQtd);
            row['Ticket_Medio_Reais_PNR_Lost'] = (pnrQtd + lostQtd) > 0 ? (pnrVal + lostVal) / (pnrQtd + lostQtd) : 0;
            row['PNR_Reais'] = pnrVal;
            row['PNR_Qtd'] = formatQtd(pnrQtd);
            row['Lost_Reais'] = lostVal;
            row['Lost_Qtd'] = formatQtd(lostQtd);
            row['Not_Visited_Reais'] = nvVal;
            row['Not_Visited_Qtd'] = formatQtd(nvQtd);
            return row;
          }).sort((a, b) => {
            if (hasQuinzena && a.Quinzena !== b.Quinzena) {
              return String(b.Quinzena).localeCompare(String(a.Quinzena));
            }
            return b.Total_Reais - a.Total_Reais;
          });
        };
        
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(formatDetailedSheet(penFilialHierarchicalBase, true)), "Base Filiais (Penalidades)");
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(formatDetailedSheet(penMotoristaHierarchicalBase, true)), "Motoristas Ofensores");

        if (crossFilialData.length > 0) {
          const crossF = crossFilialData.map(item => ({
             Quinzena: item.quinzena, Regional: item.regional, Supervisor: item.supervisor, Filial: item.filial,
             "Faturamento_R$": item.faturamento, "Penalidades_R$": item.penalidades,
             "%_Representatividade": item.representatividade === Infinity ? "S/ Faturamento" : item.representatividade
          }));
          XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(crossF), "Cruzamento Filial");
        }

        const acumuladoQuinzenaMap = {};
        distributedDados.forEach(d => {
          if (!acumuladoQuinzenaMap[d.quinzena]) acumuladoQuinzenaMap[d.quinzena] = { Quinzena: d.quinzena, "Penalidades (R$)": 0, "Qtd Infrações": 0, "Faturamento (R$)": 0 };
          acumuladoQuinzenaMap[d.quinzena]["Penalidades (R$)"] += d.valor;
          acumuladoQuinzenaMap[d.quinzena]["Qtd Infrações"] += d._pesoQtd;
        });
        distributedFaturamento.forEach(d => {
          if (!acumuladoQuinzenaMap[d.quinzena]) acumuladoQuinzenaMap[d.quinzena] = { Quinzena: d.quinzena, "Penalidades (R$)": 0, "Qtd Infrações": 0, "Faturamento (R$)": 0 };
          acumuladoQuinzenaMap[d.quinzena]["Faturamento (R$)"] += d.faturamento;
        });
        
        const acumuladoQuinzenaArray = Object.values(acumuladoQuinzenaMap).sort((a, b) => String(b.Quinzena).localeCompare(String(a.Quinzena)));
        if (acumuladoQuinzenaArray.length > 0) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(acumuladoQuinzenaArray), "Acumulado Histórico");

        XLSX.writeFile(wb, `Relatorio_Penalidades_Faturamento_${filtroQuinzena}.xlsx`);

      }

    } catch (err) { 
      console.error("Erro na exportação Excel:", err);
      setError('Ocorreu um erro ao gerar o Excel.'); 
    } 
    finally { setExportingType(null); }
  };

  const pnrTot = resumoMetrics.categories && resumoMetrics.categories['PNRs'] ? resumoMetrics.categories['PNRs'] : { valor: 0, qtd: 0 };
  const lostTot = resumoMetrics.categories && resumoMetrics.categories['Lost Packages'] ? resumoMetrics.categories['Lost Packages'] : { valor: 0, qtd: 0 };
  const nvTot = resumoMetrics.categories && resumoMetrics.categories['Not Visited'] ? resumoMetrics.categories['Not Visited'] : { valor: 0, qtd: 0 };

// === TELA DE LOGIN (Mostra isso se a pessoa não tiver a senha) ===
  if (!isAuthenticated) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-900 px-4">
        <form onSubmit={handleLogin} className="bg-white p-8 rounded-3xl shadow-xl max-w-sm w-full flex flex-col items-center animate-in fade-in zoom-in duration-500">
          <div className="bg-blue-100 p-4 rounded-full mb-6">
            <Lock className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-black text-slate-800 mb-2">Acesso Restrito</h1>
          <p className="text-sm text-slate-500 text-center mb-6">Digite a senha da operação para acessar o DashOp.</p>

          <input
            type="password"
            value={senhaDigitada}
            onChange={(e) => setSenhaDigitada(e.target.value)}
            placeholder="Sua senha..."
            className="w-full border border-slate-300 rounded-xl px-4 py-3 mb-4 focus:ring-2 focus:ring-blue-500 outline-none font-medium text-slate-700"
          />

          {erroLogin && <p className="text-xs text-red-500 font-bold mb-4 bg-red-50 px-3 py-1.5 rounded-lg w-full text-center">Senha incorreta. Tente novamente.</p>}

          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-colors shadow-md">
            Entrar no Dashboard
          </button>
        </form>
      </div>
    );
  }
  // ==================================================================

  // Adicionado para carregar os dados automaticamente ao abrir o site
  React.useEffect(() => {
    fetchFromGoogleSheets();
    // Utilizamos o array vazio [] para garantir que ele rode apenas 1x na inicialização
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex h-screen w-full bg-slate-50 font-sans text-slate-800 overflow-hidden">
      
      {/* SIDEBAR */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 overflow-y-auto hidden md:flex border-r border-slate-800">
        <div className="p-6 bg-slate-950 border-b border-slate-800 sticky top-0 z-10">
          <h1 className="text-xl font-black text-white flex items-center gap-3 tracking-tight">
            <div className="bg-blue-600 p-2 rounded-lg"><TrendingUp className="w-5 h-5 text-white"/></div>
            DashOp
          </h1>
        </div>
        <nav className="flex-1 py-6 flex flex-col gap-6 px-4">
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3 px-2">Visão Geral</p>
            <button onClick={() => handleMenuChange('resumo')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors ${activeMenu === 'resumo' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 hover:text-white'}`}><LayoutDashboard className="w-4 h-4"/> Resumo Operacional</button>
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3 px-2">Penalidades</p>
            <button onClick={() => handleMenuChange('filiais_valor')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors ${activeMenu === 'filiais_valor' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 hover:text-white'}`}><DollarSign className="w-4 h-4"/> Impacto (R$) por Filial</button>
            <button onClick={() => handleMenuChange('filiais_qtd')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors mt-1 ${activeMenu === 'filiais_qtd' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 hover:text-white'}`}><Hash className="w-4 h-4"/> Volume (Qtd) por Filial</button>
            <button onClick={() => handleMenuChange('filiais_tm')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors mt-1 ${activeMenu === 'filiais_tm' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 hover:text-white'}`}><Calculator className="w-4 h-4"/> Ticket Médio</button>
            <button onClick={() => handleMenuChange('pen_motorista')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors mt-1 ${activeMenu === 'pen_motorista' ? 'bg-red-600 text-white' : 'hover:bg-slate-800 hover:text-white'}`}><Users className="w-4 h-4"/> Motoristas Ofensores</button>
          </div>
          <div>
            <p className="text-[11px] font-bold text-violet-400 uppercase tracking-wider mb-3 px-2 bg-violet-900/30 py-1 rounded inline-block">Fat. vs Penalidades</p>
            <button onClick={() => handleMenuChange('cross_filial')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors mt-1 ${activeMenu === 'cross_filial' ? 'bg-violet-600 text-white' : 'hover:bg-slate-800 hover:text-white'}`}><Building2 className="w-4 h-4"/> Visão por Filial</button>
          </div>
        </nav>
      </aside>

      {/* HEADER & MAIN */}
      <main className="flex-1 flex flex-col h-full relative overflow-hidden">
        <header className="bg-white border-b border-slate-200 p-4 md:px-8 flex flex-col xl:flex-row justify-between items-center gap-4 shrink-0 shadow-sm z-20">
          <div className="flex flex-wrap items-center gap-4 w-full xl:w-auto">
            <div className="flex items-center gap-2 w-full sm:w-auto bg-slate-50 p-1.5 rounded-xl border border-slate-200">
              <span className="text-xs font-bold text-slate-500 uppercase px-2">Quinzena:</span>
              <select value={filtroQuinzena} onChange={(e) => setFiltroQuinzena(e.target.value)} className="bg-white border border-slate-300 text-slate-800 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2 outline-none font-bold cursor-pointer shadow-sm max-w-[150px]">
                <option value="Todas">Todas</option>
                {quinzenasDisponiveis.map((q, idx) => <option key={`q-${idx}`} value={q}>{q}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto bg-slate-50 p-1.5 rounded-xl border border-slate-200">
              <span className="text-xs font-bold text-slate-500 uppercase px-2">Regional:</span>
              <select value={filtroRegional} onChange={(e) => setFiltroRegional(e.target.value)} className="bg-white border border-slate-300 text-slate-800 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2 outline-none font-bold cursor-pointer shadow-sm max-w-[150px]">
                <option value="Todas">Todas</option>
                {regionaisDisponiveis.map((r, idx) => <option key={`r-${idx}`} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto bg-slate-50 p-1.5 rounded-xl border border-slate-200">
              <span className="text-xs font-bold text-slate-500 uppercase px-2">Supervisor:</span>
              <select value={filtroSupervisor} onChange={(e) => setFiltroSupervisor(e.target.value)} className="bg-white border border-slate-300 text-slate-800 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2 outline-none font-bold cursor-pointer shadow-sm max-w-[200px]">
                <option value="Todas">Todos</option>
                {supervisoresDisponiveis.map((s, idx) => <option key={`s-${idx}`} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto bg-slate-50 p-1.5 rounded-xl border border-slate-200">
              <span className="text-xs font-bold text-slate-500 uppercase px-2">Filial:</span>
              <select value={filtroFilial} onChange={(e) => setFiltroFilial(e.target.value)} className="bg-white border border-slate-300 text-slate-800 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2 outline-none font-bold cursor-pointer shadow-sm max-w-[150px]">
                <option value="Todas">Todas</option>
                {filiaisDisponiveis.map((f, idx) => <option key={`f-${idx}`} value={f}>{f}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-4 w-full xl:w-auto overflow-x-auto pb-2 xl:pb-0">
            <div className="flex flex-col gap-1 shrink-0">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Exportar Penalidades e Fat.</span>
              <div className="flex gap-2">
                <button onClick={() => handleDownloadExcel('penalidades')} disabled={exportingType !== null} className="flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors disabled:opacity-50 shadow-sm w-full">
                  {exportingType === 'excel-penalidades' ? <RefreshCw className="w-3 h-3 animate-spin" /> : <FileSpreadsheet className="w-3 h-3" />} Gerar Excel
                </button>
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto h-full flex flex-col gap-6">
            
            {activeMenu === 'resumo' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200 mb-8 flex flex-col gap-4">
                  <h2 className="text-xl font-bold text-slate-800">Bases de Dados (Nuvem)</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-bold text-slate-500 uppercase">Penalidades Base (R$)</span>
                      <input type="text" value={sheetUrl} onChange={(e) => setSheetUrl(e.target.value)} placeholder="Link plan. Penalidades..." className="border border-slate-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 bg-slate-50"/>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-bold text-slate-500 uppercase">Faturamento (R$)</span>
                      <input type="text" value={sheetUrlFaturamento} onChange={(e) => setSheetUrlFaturamento(e.target.value)} placeholder="Link plan. Faturamento..." className="border border-slate-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-violet-500 bg-slate-50"/>
                    </div>
                  </div>
                  
                  <div className="mt-2 flex justify-end">
                    <button onClick={fetchFromGoogleSheets} disabled={isLoading} className="bg-slate-900 hover:bg-slate-800 text-white px-8 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50">
                        {isLoading ? <RefreshCw className="w-5 h-5 animate-spin" /> : 'Sincronizar Todas as Bases'}
                    </button>
                  </div>
                  {error && <p className="text-sm text-red-600 mt-2 flex items-center gap-2 bg-red-50 p-3 rounded-lg border border-red-100"><AlertCircle className="w-4 h-4 shrink-0"/>{error}</p>}
                </div>

                <div className="grid grid-cols-1 gap-8 mb-8">
                  {/* CARD PENALIDADES */}
                  <div className="bg-slate-900 p-8 md:p-10 rounded-3xl shadow-xl text-white relative overflow-hidden flex flex-col justify-between">
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
                
                {/* PROJEÇÃO DE FECHAMENTO E ANÁLISE */}
                <RunRateSection baseData={baseRunRateData} targetQuinzena={targetQuinzenaRunRate} prevStats={prevQuinzenaStats} />

                <div className="bg-white p-6 md:p-10 rounded-3xl shadow-sm border border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <Scale className="w-6 h-6 text-violet-600" />
                      <h2 className="text-xl md:text-2xl font-bold text-slate-800">
                        {selectedQuinzenaPareto 
                          ? `Detalhamento de Filiais - ${selectedQuinzenaPareto}` 
                          : 'Evolução por Quinzena'}
                      </h2>
                    </div>
                    {selectedQuinzenaPareto && (
                      <button 
                        onClick={() => setSelectedQuinzenaPareto(null)}
                        className="text-xs md:text-sm font-bold text-violet-600 bg-violet-50 px-3 py-1.5 rounded-lg hover:bg-violet-100 transition-colors"
                      >
                        ← Voltar para Visão Geral
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-slate-500 font-medium mb-8">
                    {selectedQuinzenaPareto 
                      ? 'Detalhamento do período selecionado.' 
                      : 'Clique sobre a barra de uma quinzena para abrir o detalhamento das filiais que compõem o resultado (Drill-down).'}
                  </p>
                  
                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
                    {!selectedQuinzenaPareto ? (
                      <NativeComboChart 
                        data={paretoQuinzenaData} 
                        labelKey="quinzena" 
                        heightClass="h-[400px]" 
                        onBarClick={(q) => setSelectedQuinzenaPareto(q)}
                      />
                    ) : (
                      <NativeComboChart 
                        data={paretoFilialDrilldownData} 
                        labelKey="filial" 
                        heightClass="h-[400px]" 
                      />
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* VIEWS DE PENALIDADES */}
            {activeMenu === 'filiais_valor' && <div className="animate-in fade-in h-full"><PenaltiesHierarchicalSection title="Filiais Ofensoras em R$" listData={chartFiliaisValor} groupBy={['quinzena', 'regional', 'supervisor', 'filial']} metricType="valor" themeColor="blue" /></div>}
            {activeMenu === 'filiais_qtd' && <div className="animate-in fade-in h-full"><PenaltiesHierarchicalSection title="Filiais com mais Ocorrências" listData={chartFiliaisQtd} groupBy={['quinzena', 'regional', 'supervisor', 'filial']} metricType="qtd" themeColor="orange" /></div>}
            {activeMenu === 'filiais_tm' && <div className="animate-in fade-in h-full"><PenaltiesHierarchicalSection title="Ticket Médio (R$/un) por Filial" listData={chartFiliaisTM} groupBy={['quinzena', 'regional', 'supervisor', 'filial']} metricType="tm" themeColor="emerald" /></div>}
            {activeMenu === 'pen_motorista' && <div className="animate-in fade-in h-full"><PenaltiesHierarchicalSection title="Ranking de Motoristas Ofensores" listData={chartPenMotoristaValor} groupBy={['quinzena', 'regional', 'supervisor', 'filial', 'motorista']} metricType="valor" themeColor="red" /></div>}

            {/* VIEWS CRUZAMENTO (FATURAMENTO VS PENALIDADES) */}
            {activeMenu === 'cross_filial' && <div className="animate-in fade-in h-full"><CrossReportSection title="Faturamento vs Penalidades por Filial" listData={crossFilialData} themeColor="violet" /></div>}

          </div>
        </div>
      </main>
    </div>
  );
}