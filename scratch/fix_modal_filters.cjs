const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');

// 1. Change rawData to distributedDados when passing to the modal
code = code.replace(
  `dadosPlanilha={rawData}`,
  `dadosPlanilha={distributedDados}`
);

// 2. Fix the filter condition inside FilialPenalidadesModal
code = code.replace(
  /\(d\.pnr > 0 \|\| d\.lost > 0 \|\| d\.notVisited > 0 \|\| d\.penalidades > 0\)/g,
  `(d.valor > 0 || typeof d.tipo === 'string')`
);

// 3. Make sure table mapping correctly grabs the value from d.valor, not d.penalidades
// Inside the table mapping: mapTable[mot].valor += (c.penalidades || c.valor || 0); is already safe because it falls back to c.valor.

// 4. Make sure the chart data correctly grabs value
// mapEvolucao[q].valor += (c.penalidades || c.valor || 0); is also safe.
// Wait, the weight for SSC4 split! c._pesoQtd needs to be applied!
// mapEvolucao[q].pnrQtd += (c.qtd || 1) * (c._pesoQtd || 1);
// Let's replace the whole useMemo of the modal to be 100% correct and clean!

const newUseMemoCode = `  const { chartDataValor, chartDataQtd, tableData } = useMemo(() => {
    const norm = (s) => (s || '').toLowerCase().trim();
    const fName = norm(filial);
    const mName = selectedMotorista ? norm(selectedMotorista) : null;

    const casosFilial = dadosPlanilha.filter(d => 
      norm(d.filial) === fName && 
      (d.valor > 0 || typeof d.tipo === 'string')
    );

    // Chart Data
    const mapEvolucao = {};
    casosFilial.forEach(c => {
      if (mName && norm(c.motorista) !== mName) return;
      const q = c.quinzena;
      if (!mapEvolucao[q]) {
        mapEvolucao[q] = { quinzena: q, valor: 0, pnrQtd: 0, lostQtd: 0, nvQtd: 0, totalQtd: 0 };
      }
      mapEvolucao[q].valor += (c.valor || 0);
      const peso = c._pesoQtd || 1;
      const baseQtd = (c.qtd || 1) * peso;
      
      if (c.tipo === 'PNRs') mapEvolucao[q].pnrQtd += baseQtd;
      else if (c.tipo === 'Lost Packages') mapEvolucao[q].lostQtd += baseQtd;
      else if (c.tipo === 'Not Visited') mapEvolucao[q].nvQtd += baseQtd;
    });

    const evolutionArray = Object.values(mapEvolucao).sort((a, b) => a.quinzena.localeCompare(b.quinzena));
    evolutionArray.forEach(e => { 
      e.totalQtd = Math.round((e.pnrQtd + e.lostQtd + e.nvQtd) * 10) / 10; 
      e.faturamento = e.valor; 
      e.penalidades = 0; 
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

    return { chartDataValor: evolutionArray, chartDataQtd: evolutionArray, tableData: tableArray };
  }, [dadosPlanilha, filial, targetQuinzena, selectedMotorista]);`;

code = code.replace(
  /const \{ chartDataValor, chartDataQtd, tableData \} = useMemo\(\(\) => \{[\s\S]*?return \{ chartDataValor: evolutionArray, chartDataQtd: evolutionArray, tableData: tableArray \};\s*\}, \[dadosPlanilha, filial, targetQuinzena, selectedMotorista\]\);/,
  newUseMemoCode
);

fs.writeFileSync('src/App.jsx', code, 'utf8');
console.log('Fixed Modal filtering and mapped SSC4 correctly');
