import React, { useState } from 'react';
import { formatQtd, formatDS } from '../../lib/utils';

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
