const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf-8');

const metricsHelper = `  const atualResumoMetrics = useMemo(() => {
    if (!targetQuinzenaRunRate) return { total: 0, pnr: 0, lost: 0, nv: 0 };
    let total = 0, pnr = 0, lost = 0, nv = 0;
    dadosFiltradosEvolucao.filter(d => d.quinzena === targetQuinzenaRunRate).forEach(d => {
      total += d.valor;
      if (d.tipo === 'PNRs') pnr += d.valor;
      else if (d.tipo === 'Lost Packages') lost += d.valor;
      else if (d.tipo === 'Not Visited') nv += d.valor;
    });
    return { total, pnr, lost, nv };
  }, [dadosFiltradosEvolucao, targetQuinzenaRunRate]);
`;

code = code.replace(
  /const pnrTot = resumoMetrics\.categories\?\.\['PNRs'\] \|\| \{ valor: 0, qtd: 0 \};/,
  `${metricsHelper}
  const pnrTot = resumoMetrics.categories?.['PNRs'] || { valor: 0, qtd: 0 };`
);

const newGrid = `
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-8">
                  <div className="bg-slate-900 p-8 md:p-10 rounded-3xl shadow-xl text-white relative overflow-hidden flex flex-col justify-between border-2 border-slate-800">
                    <div className="absolute -right-10 -top-10 opacity-5"><TrendingUp className="w-64 h-64" /></div>
                    <div>
                      <h2 className="text-sm md:text-base font-bold text-blue-400 mb-2 z-10 tracking-widest uppercase">Penalidades vs Faturamento</h2>
                      <div className="flex flex-col mb-8 z-10">
                        <span className="text-5xl font-black leading-tight tracking-tight text-red-400 flex items-center gap-3">
                          {formatCurrency(atualResumoMetrics.total)}
                          {prevMargemBrutaMetrics && (
                            <span className={\`text-sm px-2 py-1 rounded-lg flex items-center font-bold \${atualResumoMetrics.total <= prevMargemBrutaMetrics.penalidades ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}\`}>
                              {atualResumoMetrics.total <= prevMargemBrutaMetrics.penalidades ? '⬇' : '⬆'} {Math.abs(((atualResumoMetrics.total - prevMargemBrutaMetrics.penalidades) / (prevMargemBrutaMetrics.penalidades || 1)) * 100).toFixed(1)}% vs anterior
                            </span>
                          )}
                        </span>
                        <span className="text-sm text-slate-300 mt-2 font-medium bg-blue-900/50 text-blue-200 self-start px-4 py-1.5 rounded-lg border border-blue-800">Quinzena mais recente (\${targetQuinzenaRunRate})</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-4 text-sm z-10 pt-6 border-t border-slate-800">
                      <div className="flex justify-between items-center"><span className="text-blue-400 font-bold">PNRs</span> <span>{formatCurrency(atualResumoMetrics.pnr)}</span></div>
                      <div className="flex justify-between items-center"><span className="text-orange-400 font-bold">Lost Packages</span> <span>{formatCurrency(atualResumoMetrics.lost)}</span></div>
                      <div className="flex justify-between items-center"><span className="text-slate-400 font-bold">Not Visited</span> <span>{formatCurrency(atualResumoMetrics.nv)}</span></div>
                      <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-700">
                        <span className="text-emerald-400 font-bold">Faturamento Total</span> 
                        <div className="flex flex-col items-end">
                          <span className="text-emerald-400 font-bold text-base">{formatCurrency(atualMargemBrutaMetrics?.faturamento || 0)}</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center"><span className="text-violet-400 font-bold">% de Representatividade</span> <span className="text-white font-bold">{atualMargemBrutaMetrics?.faturamento > 0 ? ((atualResumoMetrics.total / atualMargemBrutaMetrics.faturamento) * 100).toFixed(2) + '%' : '0%'}</span></div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-emerald-900 to-slate-900 p-8 md:p-10 rounded-3xl shadow-xl text-white relative overflow-hidden flex flex-col justify-between border-2 border-emerald-900/50">
                    <div className="absolute -right-10 -top-10 opacity-5"><BadgeDollarSign className="w-64 h-64" /></div>
                    <div>
                      <h2 className="text-sm md:text-base font-bold text-emerald-400 mb-2 z-10 tracking-widest uppercase">Resumo de Margem (Recente)</h2>
                      <div className="flex flex-col mb-8 z-10">
                        <span className={\`text-5xl font-black leading-tight tracking-tight \${atualMargemBrutaMetrics?.margemRS >= 0 ? 'text-emerald-400' : 'text-red-400'}\`}>{formatCurrency(atualMargemBrutaMetrics?.margemRS || 0)}</span>
                        <span className="text-sm mt-2 font-medium bg-emerald-900/50 text-emerald-200 self-start px-4 py-1.5 rounded-lg border border-emerald-800">Quinzena mais recente (\${targetQuinzenaRunRate})</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-4 text-sm z-10 pt-6 border-t border-slate-800">
                      <div className="flex justify-between items-center"><span className="text-slate-300 font-bold">Faturamento</span> <span>{formatCurrency(atualMargemBrutaMetrics?.faturamento || 0)}</span></div>
                      <div className="flex justify-between items-center"><span className="text-orange-400 font-bold">Custos Operacionais</span> <span>- {formatCurrency(atualMargemBrutaMetrics?.custos || 0)}</span></div>
                      <button onClick={() => setActiveMenu('gestao_margem')} className="mt-2 text-center text-xs font-bold text-emerald-300 bg-emerald-900/50 py-2 rounded-xl hover:bg-emerald-800/50 transition-colors">Ver Detalhamento Completo →</button>
                    </div>
                  </div>
                </div>
`;

code = code.replace(
  /<div className="bg-white p-6 md:p-10 rounded-3xl shadow-sm border border-slate-200 mb-8">/,
  `${newGrid}
                <div className="bg-white p-6 md:p-10 rounded-3xl shadow-sm border border-slate-200 mb-8">`
);

fs.writeFileSync('src/App.jsx', code);
console.log('patched cards');
