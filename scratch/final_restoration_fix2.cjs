const fs = require('fs');
let lines = fs.readFileSync('src/App.jsx', 'utf8').split('\n');

// 1. Insert prevPrevQuinzenaName
let idx1 = lines.findIndex(l => l.includes('const prevQuinzenaName = useMemo(() => {'));
if (idx1 !== -1) {
  let endIdx1 = idx1;
  while (!lines[endIdx1].includes('}, [quinzenasDisponiveis, targetQuinzenaRunRate]);')) {
    endIdx1++;
  }
  lines.splice(idx1, endIdx1 - idx1 + 1, `  const prevQuinzenaName = useMemo(() => {
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
  }, [quinzenasDisponiveis, targetQuinzenaRunRate]);`);
}

// 2. Insert prevPrevMargemBrutaMetrics
let idx2 = lines.findIndex(l => l.includes('const prevMargemBrutaMetrics = useMemo(() => {'));
if (idx2 !== -1) {
  let endIdx2 = idx2;
  while (!lines[endIdx2].includes('}, [prevCustosFiltrados, percentualImpostoFinanceiro, dadosFiltradosEvolucao, prevQuinzenaName]);')) {
    endIdx2++;
  }
  lines.splice(idx2, endIdx2 - idx2 + 1, `  const prevMargemBrutaMetrics = useMemo(() => {
    if (!prevQuinzenaName) return null;
    const totalFat = prevCustosFiltrados.reduce((acc, curr) => acc + (curr.receitaTotal || 0), 0);
    const totalCustos = prevCustosFiltrados.reduce((acc, curr) => acc + (curr.valorPago || 0), 0);
    const impostoDescontado = totalFat * (percentualImpostoFinanceiro / 100);
    const margemErroDescontada = totalFat * 0.025;
    
    // Penalidades the previous quinzena
    const totalPenalidades = dadosFiltradosEvolucao.filter(d => d.quinzena === prevQuinzenaName).reduce((acc, curr) => acc + (curr.valor || 0), 0);
    
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
  }, [rawCustosData, faturamentoFiltradoEvolucao, percentualImpostoFinanceiro, dadosFiltradosEvolucao, prevPrevQuinzenaName]);`);
}

// 3. Update fetchExecutiveSummary prompt
let idx3 = lines.findIndex(l => l.includes('const prompt = `Você é um Analista Executivo Sênior de uma transportadora.'));
if (idx3 !== -1) {
  let endIdx3 = idx3;
  while (!lines[endIdx3].includes('Comece direto na análise.`;')) {
    endIdx3++;
  }
  lines.splice(idx3, endIdx3 - idx3 + 1, `      const prompt = \`Você é um Analista Executivo Sênior de uma transportadora.
Escreva um resumo executivo extremamente sucinto e direto (máximo 1 parágrafo) analisando a quinzena atual (\${targetQuinzenaRunRate}) e comparando-a com as duas anteriores (\${prevQuinzenaName || 'N/A'} e \${prevPrevQuinzenaName || 'N/A'}).
FOCO PRINCIPAL: Evolução da Rentabilidade Final (Margem Operacional), e variação percentual dos custos operacionais e faturamento.
DADOS DA QUINZENA ATUAL (\${targetQuinzenaRunRate}):
Rentabilidade Final: R$ \${margemBrutaMetrics.margemRS.toFixed(2)} (\${margemBrutaMetrics.margemPct.toFixed(1)}%)
Custos Operacionais: R$ \${margemBrutaMetrics.custos.toFixed(2)}
Faturamento Bruto: R$ \${margemBrutaMetrics.faturamento.toFixed(2)}
DADOS DA QUINZENA ANTERIOR 1 (\${prevQuinzenaName || 'N/A'}):
Rentabilidade Final: R$ \${prevMargemBrutaMetrics?.margemRS?.toFixed(2) || 0} (\${prevMargemBrutaMetrics?.margemPct?.toFixed(1) || 0}%)
Custos Operacionais: R$ \${prevMargemBrutaMetrics?.custos?.toFixed(2) || 0}
Faturamento Bruto: R$ \${prevMargemBrutaMetrics?.faturamento?.toFixed(2) || 0}
DADOS DA QUINZENA ANTERIOR 2 (\${prevPrevQuinzenaName || 'N/A'}):
Rentabilidade Final: R$ \${prevPrevMargemBrutaMetrics?.margemRS?.toFixed(2) || 0} (\${prevPrevMargemBrutaMetrics?.margemPct?.toFixed(1) || 0}%)
Custos Operacionais: R$ \${prevPrevMargemBrutaMetrics?.custos?.toFixed(2) || 0}
Faturamento Bruto: R$ \${prevPrevMargemBrutaMetrics?.faturamento?.toFixed(2) || 0}
Diretrizes: 
- Use linguagem estritamente corporativa e de fácil entendimento. 
- Aponte a tendência clara de melhora, piora ou estabilidade. 
- Sem introduções ou fechamentos, foque 100% no insight dos números.\`;`);
}

// 4. Update useEffect dependencies
let idx4 = lines.findIndex(l => l.includes('}, [targetQuinzenaRunRate, activeMenu, isUserAdmin, margemBrutaMetrics, prevMargemBrutaMetrics, prevQuinzenaName, faturamentoTotalMetrics, resumoMetrics, quinzenasDisponiveis, faturamentoFiltradoEvolucao, custosFiltradosEvolucao, dadosFiltradosEvolucao, percentualImpostoFinanceiro, atualMargemBrutaMetrics, atualResumoMetrics]);'));
if (idx4 !== -1) {
  lines[idx4] = `  }, [targetQuinzenaRunRate, activeMenu, isUserAdmin, margemBrutaMetrics, prevMargemBrutaMetrics, prevQuinzenaName, prevPrevMargemBrutaMetrics, prevPrevQuinzenaName, faturamentoTotalMetrics, resumoMetrics, quinzenasDisponiveis, faturamentoFiltradoEvolucao, custosFiltradosEvolucao, dadosFiltradosEvolucao, percentualImpostoFinanceiro, atualMargemBrutaMetrics, atualResumoMetrics]);`;
}

// 5. Add the duplicate grid
let idx5 = lines.findIndex(l => l.includes('<div className="absolute -right-10 -top-10 opacity-5"><TrendingUp className="w-64 h-64" /></div>'));
if (idx5 !== -1) {
  let gridStart = lines.findIndex((l, i) => i > 4000 && l.includes('grid grid-cols-1 xl:grid-cols-2 gap-8 mb-8'));
  let found = false;
  while (gridStart !== -1 && !found) {
    if (lines[gridStart + 4] && lines[gridStart + 4].includes('Penalidades vs Faturamento')) {
      found = true;
      break;
    }
    gridStart = lines.findIndex((l, i) => i > gridStart && l.includes('grid grid-cols-1 xl:grid-cols-2 gap-8 mb-8'));
  }
  
  if (found) {
    let endGrid = gridStart + 1;
    let divCount = 1; 
    while (divCount > 0 && endGrid < lines.length) {
      if (lines[endGrid].includes('<div')) {
        let matchCount = lines[endGrid].split('<div').length - 1;
        divCount += matchCount;
      }
      if (lines[endGrid].includes('</div')) {
        let matchCount = lines[endGrid].split('</div').length - 1;
        divCount -= matchCount;
      }
      endGrid++;
    }
    
    const originalGridLines = lines.slice(gridStart, endGrid);
    const originalGridStr = originalGridLines.join('\\n');
    let secondGridStr = originalGridStr
      .replace(/margemBrutaMetrics/g, 'prevMargemBrutaMetrics')
      .replace(/formatCurrency\\(prevMargemBrutaMetrics\\.margemRS\\)/g, 'formatCurrency(prevMargemBrutaMetrics.margemRS || 0)')
      .replace(/prevMargemBrutaMetrics\\.margemPct\\.toFixed/g, '(prevMargemBrutaMetrics.margemPct || 0).toFixed')
      .replace(/prevMargemBrutaMetrics\\.margemRS >= 0/g, '(prevMargemBrutaMetrics.margemRS || 0) >= 0');
      
    const comparativoBlock = [
      '                {prevMargemBrutaMetrics && (',
      '                  <>',
      '                    <h3 className="text-lg font-bold text-blue-100 mb-4 mt-8">Comparativo: Quinzena Anterior ({prevQuinzenaName})</h3>',
      '                    <div className="opacity-80 scale-95 origin-top">',
      ...secondGridStr.split('\\n').map(l => '                      ' + l.trimStart()),
      '                    </div>',
      '                  </>',
      '                )}'
    ].join('\\n');
    
    lines.splice(endGrid, 0, ...comparativoBlock.split('\\n'));
  }
}

fs.writeFileSync('src/App.jsx', lines.join('\\n'));
console.log("ALL RESTORATIONS DONE WITHOUT REGEX ERROR.");
