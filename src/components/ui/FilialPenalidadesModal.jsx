import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUpRight, ArrowDownRight, Activity, TrendingUp, TrendingDown, AlertTriangle, DollarSign, Package, ShieldAlert, Users, CheckCircle, Truck, Calculator, Filter, History, MapPin, Search, ChevronDown, ChevronUp, Download, Eye, EyeOff, Minus, FileSpreadsheet, ExternalLink, X, Navigation, AlertCircle, ArrowUp } from 'lucide-react';
import { formatCurrency, formatQtd, formatDS } from '../../lib/utils';
import { NativeRunRateChart } from '../ui/NativeRunRateChart';
import { NativeComboChart } from '../ui/NativeComboChart';
import { NativeDSChart } from '../ui/NativeDSChart';
import { Skeleton } from '../ui/Skeleton';

export const FilialPenalidadesModal = ({ filial, targetQuinzena, dadosPlanilha, faturamentoPlanilha, onClose, onNavigateToDetalhes, onExportExcel, isOpMode }) => {
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
