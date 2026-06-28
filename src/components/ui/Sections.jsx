import React, { useState, useMemo, useEffect } from 'react';
import { AlertCircle, TrendingUp, TrendingDown, ArrowRight, ArrowLeft, Download, RefreshCw, X, ChevronDown, ChevronRight, Calculator, FileText, CheckCircle2, Search, FileUp, Filter, Activity, ArrowDown, ArrowUp, ArrowUpDown, DollarSign, FileSpreadsheet, GitCompare, PieChart, Scale, Box } from 'lucide-react';
import { NativeComboChart, NativeDSChart, NativeRunRateChart } from './Charts.jsx';
import { formatCurrency, formatQtd, formatDS, normalizeText, formatDiaSemana } from '../../lib/formatters.js';
import { supabase } from '../../supabase';
import { HeatmapPenalidades } from './HeatmapPenalidades';
// COMPONENTES DE SEÇÃO (PÁGINAS)
// ============================================================================
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

export const DetalheFinanceiroSection = ({ dadosFiltrados, onExport, isExporting, initialFilial, initialMotorista, returnToModalState, onReturnToModal }) => {
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

export const ComparativoBscSection = ({ dataOp, dataBsc }) => {
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

export const GapsOperacionaisSection = ({ dataOp, dataBsc }) => {
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