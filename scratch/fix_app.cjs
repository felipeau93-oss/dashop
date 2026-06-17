const fs = require("fs");
let code = fs.readFileSync("src/App.jsx", "utf8");

// 1. Replace the Executive Summary Prompt
code = code.replace(
  /const prompt = \`Você é um Analista Executivo Sênior de uma transportadora\.[\s\S]*?Escreva um resumo executivo direto e inspirador \(máximo 2 parágrafos\) analisando a quinzena atual \\(\$\{targetQuinzenaRunRate\}\\) em relação à anterior \\(\$\{prevQuinzenaName \|\| \x27N\/A\x27\}\\)\.[\s\S]*?FOCO: Margem de Contribuição, Custos\/Penalidades e Delivery Success\.[\s\S]*?DADOS DA QUINZENA ATUAL:[\s\S]*?\`;/,
  `const currentIndexForAI = quinzenasDisponiveis.indexOf(targetQuinzenaRunRate);
        const localPrevPrevQuinzenaName = currentIndexForAI !== -1 && currentIndexForAI + 2 < quinzenasDisponiveis.length ? quinzenasDisponiveis[currentIndexForAI + 2] : null;
        const prevPrevFaturamento = localPrevPrevQuinzenaName ? faturamentoFiltradoEvolucao.filter(d => d.quinzena === localPrevPrevQuinzenaName).reduce((a,c)=>a+c.faturamento,0) : 0;
        const prevPrevCustos = localPrevPrevQuinzenaName ? custosFiltradosEvolucao.filter(d => d.quinzena === localPrevPrevQuinzenaName).reduce((a,c)=>a+c.valorPago,0) : 0;
        const prevPrevPen = localPrevPrevQuinzenaName ? dadosFiltradosEvolucao.filter(d => d.quinzena === localPrevPrevQuinzenaName).reduce((a,c)=>a+(c.valor||0),0) : 0;
        const impPrevPrev = prevPrevFaturamento * (percentualImpostoFinanceiro / 100);
        const prevPrevMargemRS = prevPrevFaturamento - impPrevPrev - prevPrevCustos;

        const prompt = \\\`Você é um Analista Executivo Sênior de uma transportadora.
Escreva um resumo executivo extremamente sucinto e direto (máximo 1 parágrafo) analisando a quinzena atual (\${targetQuinzenaRunRate}) e comparando-a com as duas anteriores (\${prevQuinzenaName || \\\`N/A\\\`} e \${localPrevPrevQuinzenaName || \\\`N/A\\\`}).

FOCO: Evolução da Margem de Contribuição (R$) e Redução de Custos/Penalidades.

DADOS DA QUINZENA ATUAL (\${targetQuinzenaRunRate}):
Faturamento: R$ \${(window.atualMargemBrutaMetrics?.faturamento || faturamentoTotalMetrics).toFixed(2)}
Margem R$: R$ \${(window.atualMargemBrutaMetrics?.margemRS || margemBrutaMetrics.margemRS).toFixed(2)}
Total Penalidades: R$ \${(window.atualResumoMetrics?.total || resumoMetrics.total).toFixed(2)}

DADOS DA QUINZENA ANTERIOR (\${prevQuinzenaName || "N/A"}):
Faturamento: R$ \${(prevMargemBrutaMetrics?.faturamento || 0).toFixed(2)}
Margem R$: R$ \${(prevMargemBrutaMetrics?.margemRS || 0).toFixed(2)}
Total Penalidades: R$ \${(prevMargemBrutaMetrics?.penalidades || 0).toFixed(2)}

DADOS DA QUINZENA ANTERIOR 2 (\${localPrevPrevQuinzenaName || "N/A"}):
Faturamento: R$ \${prevPrevFaturamento.toFixed(2)}
Margem R$: R$ \${prevPrevMargemRS.toFixed(2)}
Total Penalidades: R$ \${prevPrevPen.toFixed(2)}

Faça uma análise com os números absolutos de Margem e Penalidades e destaque se estamos melhorando ou piorando num tom direto e objetivo.\\\`;`
);

// 2. Replace the Grid JSX
const oldGrid = `                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-8">
                    <div className="bg-slate-900 p-8 md:p-10 rounded-3xl shadow-xl text-white relative overflow-hidden flex flex-col justify-between">
                      <div className="absolute -right-10 -top-10 opacity-5"><TrendingUp className="w-64 h-64" /></div>
                      <div>
                        <h2 className="text-sm md:text-base font-bold text-blue-400 mb-2 z-10 tracking-widest uppercase">Penalidades vs Faturamento</h2>
                        <div className="flex flex-col mb-8 z-10">
                          <span className="text-5xl font-black leading-tight tracking-tight text-red-400 flex items-center gap-3">
                            {formatCurrency(resumoMetrics.total)}
                            {prevMargemBrutaMetrics && (
                              <span className={\`text-sm px-2 py-1 rounded-lg flex items-center font-bold \${resumoMetrics.total <= prevMargemBrutaMetrics.penalidades ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}\`}>
                                {resumoMetrics.total <= prevMargemBrutaMetrics.penalidades ? "⬇" : "⬆"} {Math.abs(((resumoMetrics.total - prevMargemBrutaMetrics.penalidades) / (prevMargemBrutaMetrics.penalidades || 1)) * 100).toFixed(1)}% vs anterior
                              </span>
                            )}
                          </span>
                          <span className="text-sm text-slate-400 mt-2 font-medium bg-slate-800 self-start px-4 py-1.5 rounded-lg border border-slate-700">Total Descontado ({formatQtd(resumoMetrics.qtdTotal)} infrações)</span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-4 text-sm z-10 pt-6 border-t border-slate-800">
                        <div className="flex justify-between items-center"><span className="text-blue-400 font-bold">PNRs</span> <span>{formatCurrency(pnrTot.valor)}</span></div>
                        <div className="flex justify-between items-center"><span className="text-orange-400 font-bold">Lost Packages</span> <span>{formatCurrency(lostTot.valor)}</span></div>
                        <div className="flex justify-between items-center"><span className="text-slate-400 font-bold">Not Visited</span> <span>{formatCurrency(nvTot.valor)}</span></div>
                        <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-700">
                          <span className="text-emerald-400 font-bold">Faturamento Total</span> 
                          <div className="flex flex-col items-end">
                            <span className="text-emerald-400 font-bold text-base">{formatCurrency(faturamentoTotalMetrics)}</span>
                            {prevMargemBrutaMetrics && prevMargemBrutaMetrics.faturamento > 0 && (
                              <span className={\`text-[10px] font-bold \${faturamentoTotalMetrics >= prevMargemBrutaMetrics.faturamento ? "text-emerald-500" : "text-red-400"}\`}>
                                {faturamentoTotalMetrics >= prevMargemBrutaMetrics.faturamento ? "⬆" : "⬇"} {Math.abs(((faturamentoTotalMetrics - prevMargemBrutaMetrics.faturamento) / prevMargemBrutaMetrics.faturamento) * 100).toFixed(1)}% vs ant.
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex justify-between items-center"><span className="text-violet-400 font-bold">% de Representatividade</span> <span className="text-white font-bold">{faturamentoTotalMetrics > 0 ? ((resumoMetrics.total / faturamentoTotalMetrics) * 100).toFixed(2) + "%" : "0%"}</span></div>
                      </div>
                    </div>
                  
                  {isUserAdmin && (executiveSummary || isSummaryLoading) && (`;

const newGrid = `                  {/* Computação Local das Métricas da Quinzena (Bypass de Hook p/ HMR Seguro) */}
                  {(() => {
                    let total = 0, pnr = 0, lost = 0, nv = 0;
                    dadosFiltradosEvolucao.filter(d => d.quinzena === targetQuinzenaRunRate).forEach(d => {
                      total += d.valor;
                      if (d.tipo === 'PNRs') pnr += d.valor;
                      else if (d.tipo === 'Lost Packages') lost += d.valor;
                      else if (d.tipo === 'Not Visited') nv += d.valor;
                    });
                    const atualResumoMetrics = { total, pnr, lost, nv };

                    let faturamento = 0;
                    faturamentoFiltradoEvolucao.filter(d => d.quinzena === targetQuinzenaRunRate).forEach(d => {
                      faturamento += d.faturamento;
                    });
                    let custos = 0;
                    custosFiltradosEvolucao.filter(d => d.quinzena === targetQuinzenaRunRate).forEach(d => {
                      custos += d.valorPago;
                    });
                    const imp = faturamento * (percentualImpostoFinanceiro / 100);
                    const margemRS = faturamento - imp - custos;
                    const atualMargemBrutaMetrics = { faturamento, custos, margemRS };

                    // Expondo temporariamente no window para o fetchExecutiveSummary usar
                    window.atualResumoMetrics = atualResumoMetrics;
                    window.atualMargemBrutaMetrics = atualMargemBrutaMetrics;

                    return (
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
                              <span className="text-sm text-slate-300 mt-2 font-medium bg-blue-900/50 text-blue-200 self-start px-4 py-1.5 rounded-lg border border-blue-800">Quinzena mais recente ({targetQuinzenaRunRate})</span>
                            </div>
                          </div>
                          <div className="flex flex-col gap-4 text-sm z-10 pt-6 border-t border-slate-800">
                            <div className="flex justify-between items-center"><span className="text-blue-400 font-bold">PNRs</span> <span>{formatCurrency(atualResumoMetrics.pnr)}</span></div>
                            <div className="flex justify-between items-center"><span className="text-orange-400 font-bold">Lost Packages</span> <span>{formatCurrency(atualResumoMetrics.lost)}</span></div>
                            <div className="flex justify-between items-center"><span className="text-slate-400 font-bold">Not Visited</span> <span>{formatCurrency(atualResumoMetrics.nv)}</span></div>
                            <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-700">
                              <span className="text-emerald-400 font-bold">Faturamento Total</span> 
                              <div className="flex flex-col items-end">
                                <span className="text-emerald-400 font-bold text-base">{formatCurrency(atualMargemBrutaMetrics.faturamento)}</span>
                              </div>
                            </div>
                            <div className="flex justify-between items-center"><span className="text-violet-400 font-bold">% de Representatividade</span> <span className="text-white font-bold">{atualMargemBrutaMetrics.faturamento > 0 ? ((atualResumoMetrics.total / atualMargemBrutaMetrics.faturamento) * 100).toFixed(2) + '%' : '0%'}</span></div>
                          </div>
                        </div>

                        <div className="bg-gradient-to-br from-emerald-900 to-slate-900 p-8 md:p-10 rounded-3xl shadow-xl text-white relative overflow-hidden flex flex-col justify-between border-2 border-emerald-900/50">
                          <div className="absolute -right-10 -top-10 opacity-5"><BadgeDollarSign className="w-64 h-64" /></div>
                          <div>
                            <h2 className="text-sm md:text-base font-bold text-emerald-400 mb-2 z-10 tracking-widest uppercase">Resumo de Margem (Recente)</h2>
                            <div className="flex flex-col mb-8 z-10">
                              <span className={\`text-5xl font-black leading-tight tracking-tight \${atualMargemBrutaMetrics.margemRS >= 0 ? 'text-emerald-400' : 'text-red-400'}\`}>{formatCurrency(atualMargemBrutaMetrics.margemRS)}</span>
                              <span className="text-sm mt-2 font-medium bg-emerald-900/50 text-emerald-200 self-start px-4 py-1.5 rounded-lg border border-emerald-800">Quinzena mais recente ({targetQuinzenaRunRate})</span>
                            </div>
                          </div>
                          <div className="flex flex-col gap-4 text-sm z-10 pt-6 border-t border-slate-800">
                            <div className="flex justify-between items-center"><span className="text-slate-300 font-bold">Faturamento</span> <span>{formatCurrency(atualMargemBrutaMetrics.faturamento)}</span></div>
                            <div className="flex justify-between items-center"><span className="text-orange-400 font-bold">Custos Operacionais</span> <span>- {formatCurrency(atualMargemBrutaMetrics.custos)}</span></div>
                            <button onClick={() => setActiveMenu("gestao_margem")} className="mt-2 text-center text-xs font-bold text-emerald-300 bg-emerald-900/50 py-2 rounded-xl hover:bg-emerald-800/50 transition-colors">Ver Detalhamento Completo →</button>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                  
                  {isUserAdmin && (executiveSummary || isSummaryLoading) && (`;

code = code.replace(oldGrid, newGrid);

fs.writeFileSync("src/App.jsx", code, "utf8");
console.log("App.jsx fixed securely without hooks!");
