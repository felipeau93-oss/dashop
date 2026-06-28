import React, { useState, useEffect } from 'react';
import { formatCurrency, formatQtd, formatDS } from '../../lib/formatters.js';

export const NativeComboChart = ({ data, labelKey = "name", onBarClick, heightClass = "h-[400px]", showFaturamento = true, isMarginChart = false, showLine = showFaturamento, tooltipSecondaryLabel, showMargemErro, legendSecondaryLabel, hideFaturamentoTooltip = false, showDSLine = false, dsKey = 'ds', dsLabel = 'DS', showTotalLine = false }) => {
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

export const NativeDSChart = ({ data, labelKey = "name", onBarClick, heightClass = "h-[400px]", showLine = true }) => {
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

export const NativeRunRateChart = ({ diasOperados, totalDias, currentSaldo, currentEntregues, projSaldo, projEntregues, isClosed, heightClass = "h-[400px]" }) => {
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