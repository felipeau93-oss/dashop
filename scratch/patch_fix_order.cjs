const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf-8');

const targetQuinzenaStr = `  const targetQuinzenaRunRate = useMemo(() => {
    const includedQuinzenas = quinzenasDisponiveis.filter(q => !filtroQuinzenas.includes(q));
    if (includedQuinzenas.length === 1 && filtroQuinzenas.length > 0) return includedQuinzenas[0];

    let relevantData = [];
    if (activeMenu === 'gestao_financeira') relevantData = faturamentoFiltrado;
    else if (activeMenu === 'gestao_bsc' || activeMenu === 'comparativo_bsc' || activeMenu === 'gaps_operacionais') relevantData = bscFiltrado;
    else relevantData = operacionalFiltrado;

    if (relevantData.length > 0) {
      const qs = [...new Set(relevantData.map(d => d.quinzena))].sort().reverse();
      if (qs.length > 0) return qs[0];
    }
    return quinzenasDisponiveis.length > 0 ? quinzenasDisponiveis[0] : 'N/A';
  }, [filtroQuinzenas, activeMenu, faturamentoFiltrado, bscFiltrado, operacionalFiltrado, quinzenasDisponiveis]);`;

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

// 1. Remove metricsHelper from its current spot
code = code.replace(metricsHelper, "");

// 2. Insert it right after targetQuinzenaRunRate
code = code.replace(targetQuinzenaStr, targetQuinzenaStr + "\n\n" + metricsHelper);

fs.writeFileSync('src/App.jsx', code);
console.log('Fixed reference error');
