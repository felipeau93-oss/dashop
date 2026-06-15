const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');

code = code.replace(
  /const \{ chartDataValor, chartDataQtd, tableData \} = useMemo\(\(\) => \{/,
  `const { chartDataValor, chartDataQtd, tableData, casosFilial } = useMemo(() => {`
);

code = code.replace(
  /return \{ chartDataValor: evolutionArray, chartDataQtd: evolutionArray, tableData: tableArray \};\n    \}, \[dadosPlanilha, filial, targetQuinzena, selectedMotorista\]\);/,
  `    // Normalize totalQtd to 0-100 for the line chart
    const maxQtd = Math.max(...evolutionArray.map(d => d.totalQtd || 0), 1);
    const evolutionArrayWithNorm = evolutionArray.map(d => ({ ...d, qtdNormalizada: ((d.totalQtd || 0) / maxQtd) * 100 }));

    return { chartDataValor: evolutionArrayWithNorm, chartDataQtd: evolutionArray, tableData: tableArray, casosFilial };
  }, [dadosPlanilha, filial, targetQuinzena, selectedMotorista]);`
);

fs.writeFileSync('src/App.jsx', code, 'utf8');
console.log('App.jsx fixed casosFilial export');
