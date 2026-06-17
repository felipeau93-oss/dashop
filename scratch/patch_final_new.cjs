const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf-8');

// 1. Insert prevPrevQuinzenaName
code = code.replace(
  /const prevQuinzenaName = useMemo\(\(\) => \{[\s\S]*?\}, \[quinzenasDisponiveis, targetQuinzenaRunRate\]\);/,
  `const prevQuinzenaName = useMemo(() => {
    if (!targetQuinzenaRunRate || quinzenasDisponiveis.length < 2) return null;
    const currentIndex = quinzenasDisponiveis.indexOf(targetQuinzenaRunRate);
    if (currentIndex !== -1 && currentIndex + 1 < quinzenasDisponiveis.length) {
      return quinzenasDisponiveis[currentIndex + 1];
    }
    return null;
  }, [quinzenasDisponiveis, targetQuinzenaRunRate]);

  const prevPrevQuinzenaName = useMemo(() => {
    if (!targetQuinzenaRunRate || quinzenasDisponiveis.length < 3) return null;
    const currentIndex = quinzenasDisponiveis.indexOf(targetQuinzenaRunRate);
    if (currentIndex !== -1 && currentIndex + 2 < quinzenasDisponiveis.length) {
      return quinzenasDisponiveis[currentIndex + 2];
    }
    return null;
  }, [quinzenasDisponiveis, targetQuinzenaRunRate]);`
);

// 2. Insert prevPrevMargemBrutaMetrics and atualMargemBrutaMetrics
code = code.replace(
  /const prevMargemBrutaMetrics = useMemo\(\(\) => \{[\s\S]*?\}, \[prevCustosFiltrados, percentualImpostoFinanceiro, dadosFiltradosEvolucao, prevQuinzenaName\]\);/,
  `const prevMargemBrutaMetrics = useMemo(() => {
    if (!prevQuinzenaName) return null;
    const totalFat = prevCustosFiltrados.reduce((acc, curr) => acc + (curr.receitaTotal || 0), 0);
    const totalCustos = prevCustosFiltrados.reduce((acc, curr) => acc + (curr.valorPago || 0), 0);
    const impostoDescontado = totalFat * (percentualImpostoFinanceiro / 100);
    const margemErroDescontada = totalFat * 0.025;
    
    // Penalidades the previous quinzena (we can use prevQuinzenaStats or calculate again)
    const totalPenalidades = dadosFiltradosEvolucao.filter(d => d.quinzena === prevQuinzenaName).reduce((acc, curr) => acc + (curr.valor || 0), 0);
    
    const margemBase = totalFat - impostoDescontado - totalCustos - totalPenalidades;
    const margemPct = totalFat > 0 ? (margemBase / totalFat) * 100 : 0;
    
    return {
      faturamento: totalFat,
      custos: totalCustos,
      penalidades: totalPenalidades,
      margemRS: margemBase,
      margemPct: margemPct
    };
  }, [prevCustosFiltrados, percentualImpostoFinanceiro, dadosFiltradosEvolucao, prevQuinzenaName]);

  const prevPrevMargemBrutaMetrics = useMemo(() => {
    if (!prevPrevQuinzenaName) return null;
    const prevPrevFaturamento = faturamentoFiltradoEvolucao.filter(d => d.quinzena === prevPrevQuinzenaName);
    const validKeys = new Set(prevPrevFaturamento.map(f => \`\${f.filial}|\${f.quinzena}\`));
    const custos = rawCustosData.filter(c => validKeys.has(\`\${c.filial}|\${c.quinzena}\`));

    const totalFat = custos.reduce((acc, curr) => acc + (curr.receitaTotal || 0), 0);
    const totalCustos = custos.reduce((acc, curr) => acc + (curr.valorPago || 0), 0);
    const impostoDescontado = totalFat * (percentualImpostoFinanceiro / 100);
    
    const totalPenalidades = dadosFiltradosEvolucao.filter(d => d.quinzena === prevPrevQuinzenaName).reduce((acc, curr) => acc + (curr.valor || 0), 0);
    
    const margemBase = totalFat - impostoDescontado - totalCustos - totalPenalidades;
    const margemPct = totalFat > 0 ? (margemBase / totalFat) * 100 : 0;
    
    return {
      faturamento: totalFat,
      custos: totalCustos,
      penalidades: totalPenalidades,
      margemRS: margemBase,
      margemPct: margemPct
    };
  }, [rawCustosData, faturamentoFiltradoEvolucao, percentualImpostoFinanceiro, dadosFiltradosEvolucao, prevPrevQuinzenaName]);

  const atualMargemBrutaMetrics = useMemo(() => {
    if (!targetQuinzenaRunRate) return null;
    const atualFaturamento = faturamentoFiltradoEvolucao.filter(d => d.quinzena === targetQuinzenaRunRate);
    const validKeys = new Set(atualFaturamento.map(f => \`\${f.filial}|\${f.quinzena}\`));
    const custos = rawCustosData.filter(c => validKeys.has(\`\${c.filial}|\${c.quinzena}\`));

    const totalFat = custos.reduce((acc, curr) => acc + (curr.receitaTotal || 0), 0);
    const totalCustos = custos.reduce((acc, curr) => acc + (curr.valorPago || 0), 0);
    const impostoDescontado = totalFat * (percentualImpostoFinanceiro / 100);
    const margemErroDescontada = totalFat * 0.025;
    
    const totalPenalidades = dadosFiltradosEvolucao.filter(d => d.quinzena === targetQuinzenaRunRate).reduce((acc, curr) => acc + (curr.valor || 0), 0);
    
    const margemBase = totalFat - impostoDescontado - totalCustos - totalPenalidades;
    const margemPct = totalFat > 0 ? (margemBase / totalFat) * 100 : 0;
    
    return {
      faturamento: totalFat,
      custos: totalCustos,
      penalidades: totalPenalidades,
      margemErro: margemErroDescontada,
      imposto: impostoDescontado,
      margemRS: margemBase,
      margemPct: margemPct
    };
  }, [rawCustosData, faturamentoFiltradoEvolucao, percentualImpostoFinanceiro, dadosFiltradosEvolucao, targetQuinzenaRunRate]);`
);

// 3. Insert atualResumoMetrics BEFORE targetQuinzenaRunRate? NO, AFTER!
code = code.replace(
  /const pnrTot = resumoMetrics\.categories\?\.\['PNRs'\] \|\| \{ valor: 0, qtd: 0 \};\n\s*const lostTot = resumoMetrics\.categories\?\.\['Lost Packages'\] \|\| \{ valor: 0, qtd: 0 \};\n\s*const nvTot = resumoMetrics\.categories\?\.\['Not Visited'\] \|\| \{ valor: 0, qtd: 0 \};/,
  `const pnrTot = resumoMetrics.categories?.['PNRs'] || { valor: 0, qtd: 0 };
    const lostTot = resumoMetrics.categories?.['Lost Packages'] || { valor: 0, qtd: 0 };
    const nvTot = resumoMetrics.categories?.['Not Visited'] || { valor: 0, qtd: 0 };

  const atualResumoMetrics = useMemo(() => {
    if (!targetQuinzenaRunRate) return { total: 0, pnr: 0, lost: 0, nv: 0 };
    let total = 0, pnr = 0, lost = 0, nv = 0;
    dadosFiltradosEvolucao.filter(d => d.quinzena === targetQuinzenaRunRate).forEach(d => {
      total += d.valor;
      if (d.tipo === 'PNRs') pnr += d.valor;
      else if (d.tipo === 'Lost Packages') lost += d.valor;
      else if (d.tipo === 'Not Visited') nv += d.valor;
    });
    return { total, pnr, lost, nv };
  }, [dadosFiltradosEvolucao, targetQuinzenaRunRate]);`
);


// 4. Update the prompt
code = code.replace(
  /Escreva um resumo executivo direto e inspirador[\s\S]*?DADOS DA QUINZENA ANTERIOR:[\s\S]*?Faturamento: R\$ \$\{prevMargemBrutaMetrics\?\.faturamento\?\.toFixed\(2\) \|\| 0\}/,
  `Escreva um resumo executivo extremamente sucinto e direto (máximo 1 parágrafo) analisando a quinzena atual (\${targetQuinzenaRunRate}) e comparando-a com as duas anteriores (\${prevQuinzenaName || 'N/A'} e \${prevPrevQuinzenaName || 'N/A'}).
FOCO: Evolução da Margem de Contribuição e Controle de Custos/Penalidades.
DADOS DA QUINZENA ATUAL (\${targetQuinzenaRunRate}):
Margem: R$ \${atualMargemBrutaMetrics?.margemRS?.toFixed(2) || 0} (\${atualMargemBrutaMetrics?.margemPct?.toFixed(1) || 0}%)
Penalidades: R$ \${atualMargemBrutaMetrics?.penalidades?.toFixed(2) || 0}
Faturamento: R$ \${atualMargemBrutaMetrics?.faturamento?.toFixed(2) || 0}

DADOS DA QUINZENA ANTERIOR 1 (\${prevQuinzenaName || 'N/A'}):
Margem: R$ \${prevMargemBrutaMetrics?.margemRS?.toFixed(2) || 0} (\${prevMargemBrutaMetrics?.margemPct?.toFixed(1) || 0}%)
Penalidades: R$ \${prevMargemBrutaMetrics?.penalidades?.toFixed(2) || 0}
Faturamento: R$ \${prevMargemBrutaMetrics?.faturamento?.toFixed(2) || 0}

DADOS DA QUINZENA ANTERIOR 2 (\${prevPrevQuinzenaName || 'N/A'}):
Margem: R$ \${prevPrevMargemBrutaMetrics?.margemRS?.toFixed(2) || 0} (\${prevPrevMargemBrutaMetrics?.margemPct?.toFixed(1) || 0}%)
Penalidades: R$ \${prevPrevMargemBrutaMetrics?.penalidades?.toFixed(2) || 0}
Faturamento: R$ \${prevPrevMargemBrutaMetrics?.faturamento?.toFixed(2) || 0}`
);

code = code.replace(
  /- Seja muito breve, focado em insights e variação percentual\. \n- Se a quinzena anterior for N\/A ou não tiver dados, analise apenas a atual\./,
  `- Seja muito breve (direto ao ponto), focado na tendência das 3 quinzenas. `
);

// 5. Replace grid BEFORE RunRateFinanceiroSection
const newGrid = `                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-8">
                  <div className="bg-slate-900 p-8 md:p-10 rounded-3xl shadow-xl text-white relative overflow-hidden flex flex-col justify-between border-2 border-slate-800">
                    <div className="absolute -right-10 -top-10 opacity-5"><TrendingUp className="w-64 h-64" /></div>
                    <div>
                      <h2 className="text-sm md:text-base font-bold text-blue-400 mb-2 z-10 tracking-widest uppercase">Penalidades vs Faturamento</h2>
                      <div className="flex flex-col mb-8 z-10">
                        <span className="text-5xl font-black leading-tight tracking-tight text-red-400 flex items-center gap-3">
                          {formatCurrency(atualResumoMetrics.total)}
                          {prevMargemBrutaMetrics && (
                            <span className={\\\`text-sm px-2 py-1 rounded-lg flex items-center font-bold \\\${atualResumoMetrics.total <= prevMargemBrutaMetrics.penalidades ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}\\\`}>
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
                        <span className={\\\`text-5xl font-black leading-tight tracking-tight \\\${atualMargemBrutaMetrics?.margemRS >= 0 ? 'text-emerald-400' : 'text-red-400'}\\\`}>{formatCurrency(atualMargemBrutaMetrics?.margemRS || 0)}</span>
                        <span className="text-sm mt-2 font-medium bg-emerald-900/50 text-emerald-200 self-start px-4 py-1.5 rounded-lg border border-emerald-800">Quinzena mais recente ({targetQuinzenaRunRate})</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-4 text-sm z-10 pt-6 border-t border-slate-800">
                      <div className="flex justify-between items-center"><span className="text-slate-300 font-bold">Faturamento</span> <span>{formatCurrency(atualMargemBrutaMetrics?.faturamento || 0)}</span></div>
                      <div className="flex justify-between items-center"><span className="text-orange-400 font-bold">Custos Operacionais</span> <span>- {formatCurrency(atualMargemBrutaMetrics?.custos || 0)}</span></div>
                      <button onClick={() => setActiveMenu('gestao_margem')} className="mt-2 text-center text-xs font-bold text-emerald-300 bg-emerald-900/50 py-2 rounded-xl hover:bg-emerald-800/50 transition-colors">Ver Detalhamento Completo →</button>
                    </div>
                  </div>
                </div>`;

const searchStr = '<div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-8">\\n                  <div className="bg-slate-900 p-8 md:p-10 rounded-3xl shadow-xl text-white relative overflow-hidden flex flex-col justify-between">\\n                    <div className="absolute -right-10 -top-10 opacity-5"><TrendingUp className="w-64 h-64" /></div>';

const startIdx = code.indexOf(searchStr);
if (startIdx !== -1) {
  const endStr = '                  <div className="mb-8">\\n                  <RunRateFinanceiroSection baseData={baseRunRateData}';
  const endIdx = code.indexOf(endStr, startIdx);
  if (endIdx !== -1) {
    code = code.substring(0, startIdx) + newGrid + '\\n\\n' + code.substring(endIdx);
  } else {
    console.log("Could not find endStr");
  }
} else {
  console.log("Could not find searchStr");
}

fs.writeFileSync('src/App.jsx', code, 'utf-8');
console.log('Patch complete.');
