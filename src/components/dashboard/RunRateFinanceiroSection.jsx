import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUpRight, ArrowDownRight, Activity, TrendingUp, TrendingDown, AlertTriangle, DollarSign, Package, ShieldAlert, Users, CheckCircle, Truck, Calculator, Filter, History, MapPin, Search, ChevronDown, ChevronUp, Download, Eye, EyeOff, Minus, FileSpreadsheet, ExternalLink, Navigation, AlertCircle, ArrowUp, ArrowDown, Scale } from 'lucide-react';
import { formatCurrency, formatQtd, formatDS, normalizeText } from '../../lib/utils';
import { NativeRunRateChart } from '../ui/NativeRunRateChart';
import { NativeComboChart } from '../ui/NativeComboChart';
import { NativeDSChart } from '../ui/NativeDSChart';
import { Skeleton } from '../ui/Skeleton';

export const RunRateFinanceiroSection = ({ baseData, targetQuinzena, prevStats, onDrilldown, isForecastMode, setIsForecastMode }) => {
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
                  <div className="flex flex-col items-end"><span className="text-[10px] text-slate-400 uppercase font-bold">{isClosed ? 'QTD Final' : 'Projeção (Total)'}</span><span className="text-sm font-black text-violet-500">{formatCurrency(filial.penalidades)}</span></div>
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
