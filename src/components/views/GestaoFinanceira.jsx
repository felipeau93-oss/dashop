import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Scale, Target, BadgeDollarSign } from 'lucide-react';
import { Skeleton } from '../ui/Skeleton';
import { RunRateFinanceiroSection } from '../dashboard/RunRateFinanceiroSection';
import { NativeComboChart } from '../ui/NativeComboChart';
import { formatCurrency, formatQtd } from '../../lib/utils';

export default function GestaoFinanceira({
  resumoMetrics,
  pnrTot,
  lostTot,
  nvTot,
  faturamentoTotalMetrics,
  margemBrutaMetrics,
  setActiveMenu,
  prevMargemBrutaMetrics,
  prevQuinzenaName,
  isLoadingDetalhes,
  baseRunRateData,
  targetQuinzenaRunRate,
  prevQuinzenaStats,
  handleOpenEvolutivo,
  isForecastMode,
  setIsForecastMode,
  selectedQuinzenaPareto,
  setSelectedQuinzenaPareto,
  paretoQuinzenaData,
  paretoFilialDrilldownData
}) {
  return (
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

