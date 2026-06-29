import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUpRight, ArrowDownRight, Activity, TrendingUp, TrendingDown, AlertTriangle, DollarSign, Package, ShieldAlert, Users, CheckCircle, Truck, Calculator, Filter, History, MapPin, Search, ChevronDown, ChevronUp, Download, Eye, EyeOff, Minus, FileSpreadsheet, ExternalLink, Navigation, AlertCircle, ArrowUp, ArrowDown, Scale, X } from 'lucide-react';
import { formatCurrency, formatQtd, formatDS, normalizeText } from '../../lib/utils';
import { NativeRunRateChart } from '../ui/NativeRunRateChart';
import { NativeComboChart } from '../ui/NativeComboChart';
import { NativeDSChart } from '../ui/NativeDSChart';
import { Skeleton } from '../ui/Skeleton';

export const RunRatePenalidadesSection = ({ baseData, targetQuinzena, prevStats, onDrilldown, isForecastMode, setIsForecastMode }) => {
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

  const ofensoresModal = useMemo(() => {
    if (!selectedOfensorFilial || !baseData) return [];
    return baseData
      .filter(d => d.filial === selectedOfensorFilial && (d.pnr > 0 || d.lost > 0 || d.notVisited > 0))
      .sort((a, b) => (b.pnr + b.lost + b.notVisited) - (a.pnr + a.lost + a.notVisited));
  }, [selectedOfensorFilial, baseData]);

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
          <h3 className="text-sm font-black text-red-500 mb-4 uppercase tracking-wider flex items-center gap-2"><AlertCircle className="w-5 h-5" /> Top 6 Filiais com Maior QTD de Descontos</h3>
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
                  <strong className="text-white tracking-wide">QTD Total Descontada:</strong> {isClosed ? 'O total apurado foi de' : 'A tendência aponta para'} <strong className="text-red-400">{formatCurrency(projPenGlob)}</strong> de descontos (PNR, Lost e NV), configurando uma variação de {getInsightTag(penVar, true)} ante a última quinzena ({formatCurrency(prevStats.pen)}).
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
