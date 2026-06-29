import React from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, Scale } from 'lucide-react';
import { RunRatePenalidadesSection } from '../dashboard/RunRatePenalidadesSection';
import { NativeComboChart } from '../ui/NativeComboChart';
import { Skeleton } from '../ui/Skeleton';
import { formatCurrency, formatQtd } from '../../lib/utils';

export default function GestaoOperacional({
  resumoMetrics,
  pnrTot,
  lostTot,
  nvTot,
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
                    className="md:col-span-2 lg:col-span-4 bg-white dark:bg-slate-900 p-8 md:p-10 rounded-[2rem] shadow-sm hover:shadow-md transition-shadow border border-slate-200 dark:border-slate-800 relative overflow-hidden flex flex-col justify-between group"
                  >
                    <div className="absolute -right-8 -top-8 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity duration-500"><AlertCircle className="w-64 h-64 text-red-500" /></div>
                    <div>
                      <h2 className="text-sm md:text-base font-bold text-slate-500 dark:text-slate-400 mb-2 z-10 tracking-widest uppercase flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-red-500" /> Penalidades Globais
                      </h2>
                      <div className="flex flex-col mb-8 z-10">
                        <span className="text-4xl lg:text-5xl font-black leading-tight tracking-tight text-slate-800 dark:text-white flex items-center gap-3">
                          {formatCurrency(resumoMetrics.total)}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400 mt-2 font-medium bg-slate-100 dark:bg-slate-800 self-start px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700">Total Descontado ({formatQtd(resumoMetrics.qtdTotal)} infrações)</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm z-10 pt-6 border-t border-slate-100 dark:border-slate-800/50">
                      <div className="flex justify-between md:flex-col md:justify-center md:items-start md:gap-1 items-center"><span className="text-slate-500 dark:text-slate-400 font-semibold">PNRs</span> <span className="font-bold text-slate-700 dark:text-slate-300 md:text-lg">{formatCurrency(pnrTot.valor)}</span></div>
                      <div className="flex justify-between md:flex-col md:justify-center md:items-start md:gap-1 items-center"><span className="text-slate-500 dark:text-slate-400 font-semibold">Lost Packages</span> <span className="font-bold text-slate-700 dark:text-slate-300 md:text-lg">{formatCurrency(lostTot.valor)}</span></div>
                      <div className="flex justify-between md:flex-col md:justify-center md:items-start md:gap-1 items-center"><span className="text-slate-500 dark:text-slate-400 font-semibold">Not Visited</span> <span className="font-bold text-slate-700 dark:text-slate-300 md:text-lg">{formatCurrency(nvTot.valor)}</span></div>
                    </div>
                  </motion.div>
                </div>

                <div className="relative group">
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
                  <RunRatePenalidadesSection baseData={baseRunRateData} targetQuinzena={targetQuinzenaRunRate} prevStats={prevQuinzenaStats} onDrilldown={(f) => { handleOpenEvolutivo(f); }} isForecastMode={isForecastMode} setIsForecastMode={setIsForecastMode} />
                </div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.4 }}
                  className="bg-white dark:bg-slate-900 p-6 md:p-10 rounded-[2rem] shadow-sm hover:shadow-md transition-shadow border border-slate-200 dark:border-slate-800 mt-8 group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-900/20 flex items-center justify-center border border-violet-100 dark:border-violet-500/20">
                        <Scale className="w-5 h-5 text-violet-500" />
                      </div>
                      <h2 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">
                        {selectedQuinzenaPareto ? `Detalhamento de Filiais - ${selectedQuinzenaPareto}` : 'Evolução de Penalidades por Quinzena'}
                      </h2>
                    </div>
                    {selectedQuinzenaPareto && (
                      <button onClick={() => setSelectedQuinzenaPareto(null)} className="text-xs md:text-sm font-bold text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/30 px-4 py-2 rounded-full border border-violet-200 dark:border-violet-500/30 hover:bg-violet-100 dark:hover:bg-violet-900/50 transition-all shadow-sm">
                        ← Voltar para Visão Geral
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mb-8 pl-13">
                    {selectedQuinzenaPareto ? 'Detalhamento das infrações no período selecionado.' : 'Clique sobre a barra de uma quinzena para abrir o detalhamento das filiais (Drill-down).'}
                  </p>
                  <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 rounded-2xl p-4">
                    {!selectedQuinzenaPareto ? (
                      <NativeComboChart data={paretoQuinzenaData} labelKey="quinzena" heightClass="h-[400px]" onBarClick={(q) => setSelectedQuinzenaPareto(q)} showFaturamento={false} showTotalLine={true} />
                    ) : (
                      <NativeComboChart data={paretoFilialDrilldownData} labelKey="filial" heightClass="h-[400px]" showFaturamento={false} showTotalLine={true} />
                    )}
                  </div>
                </motion.div>
              </motion.div>
            )}

            {/* DETALHE FINANCEIRO */}
