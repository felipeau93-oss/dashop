import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUpRight, ArrowDownRight, Activity, TrendingUp, TrendingDown, AlertTriangle, DollarSign, Package, ShieldAlert, Users, CheckCircle, Truck, Calculator, Filter, History, MapPin, Search, ChevronDown, ChevronUp, Download, Eye, EyeOff, Minus, FileSpreadsheet, ExternalLink, Navigation, AlertCircle, Box } from 'lucide-react';
import { formatCurrency, formatQtd, formatDS } from '../../lib/utils';
import { NativeRunRateChart } from '../ui/NativeRunRateChart';
import { NativeComboChart } from '../ui/NativeComboChart';
import { NativeDSChart } from '../ui/NativeDSChart';
import { Skeleton } from '../ui/Skeleton';

export const RunRateOperacionalSection = ({ baseData, targetQuinzena, titlePrefix = "Operacional", isForecastMode, setIsForecastMode }) => {
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
          <div><h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2"><TrendingUp className="w-5 h-5" /> Evolução de QTD vs. {isClosed ? 'Resultado de DS' : 'Projeção de DS'}</h3><p className="text-3xl sm:text-4xl font-black text-slate-800 mt-2">{formatDS(dsGlobal)}</p></div>
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
