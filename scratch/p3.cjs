const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf-8');

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

fs.writeFileSync('src/App.jsx', code, 'utf-8');
console.log('Patch 3 complete.');
