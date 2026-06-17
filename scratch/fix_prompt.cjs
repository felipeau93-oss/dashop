const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');

// Insert prevPrevQuinzenaName
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

// Insert prevPrevMargemBrutaMetrics
code = code.replace(
  /const prevMargemBrutaMetrics = useMemo\(\(\) => \{[\s\S]*?\}, \[prevCustosFiltrados, percentualImpostoFinanceiro, dadosFiltradosEvolucao, prevQuinzenaName\]\);/,
  `const prevMargemBrutaMetrics = useMemo(() => {
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
  }, [rawCustosData, faturamentoFiltradoEvolucao, percentualImpostoFinanceiro, dadosFiltradosEvolucao, prevPrevQuinzenaName]);`
);

// Update fetchExecutiveSummary prompt
code = code.replace(
  /const prompt = \`Você é um Analista Executivo Sênior de uma transportadora\.[\s\S]*?Comece direto na análise\.\`;/,
  `const prompt = \`Você é um Analista Executivo Sênior de uma transportadora.
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
- Sem introduções ou fechamentos, foque 100% no insight dos números.\`;`
);

// Add dependencies to useEffect
code = code.replace(
  /}, \[targetQuinzenaRunRate, activeMenu, isUserAdmin, margemBrutaMetrics, prevMargemBrutaMetrics, prevQuinzenaName, faturamentoTotalMetrics, resumoMetrics, quinzenasDisponiveis, faturamentoFiltradoEvolucao, custosFiltradosEvolucao, dadosFiltradosEvolucao, percentualImpostoFinanceiro, atualMargemBrutaMetrics, atualResumoMetrics\]\);/g,
  `}, [targetQuinzenaRunRate, activeMenu, isUserAdmin, margemBrutaMetrics, prevMargemBrutaMetrics, prevQuinzenaName, prevPrevMargemBrutaMetrics, prevPrevQuinzenaName, faturamentoTotalMetrics, resumoMetrics, quinzenasDisponiveis, faturamentoFiltradoEvolucao, custosFiltradosEvolucao, dadosFiltradosEvolucao, percentualImpostoFinanceiro, atualMargemBrutaMetrics, atualResumoMetrics]);`
);

fs.writeFileSync('src/App.jsx', code);
console.log("Successfully fixed the prompt and data logic!");
