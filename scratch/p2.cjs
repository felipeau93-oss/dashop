const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf-8');

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

fs.writeFileSync('src/App.jsx', code, 'utf-8');
console.log('Patch 2 complete.');
