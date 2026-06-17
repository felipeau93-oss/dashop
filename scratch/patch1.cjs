const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf-8');

// 1. Insert prevPrevQuinzenaName
code = code.replace(
  /const prevQuinzenaName = useMemo\(\(\) => \{[\s\S]*?\}, \[quinzenasDisponiveis, targetQuinzenaRunRate\]\);/,
  `$&

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
  `$&

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
  }, [rawCustosData, faturamentoFiltradoEvolucao, percentualImpostoFinanceiro, dadosFiltradosEvolucao, targetQuinzenaRunRate]);
`
);

fs.writeFileSync('src/App.jsx', code);
console.log('done');
