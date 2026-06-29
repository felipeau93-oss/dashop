import React, { useState, useEffect } from 'react';
import { formatCurrency } from '../../lib/utils';

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
