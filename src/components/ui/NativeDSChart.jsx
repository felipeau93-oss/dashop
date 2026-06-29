import React, { useState, useEffect } from 'react';
import { formatQtd, formatDS } from '../../lib/utils';

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
