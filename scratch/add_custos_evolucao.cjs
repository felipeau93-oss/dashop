const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');

const targetStrLF = '  }, [distributedDados, filtroFiliais, filtroRegionais, filtroSupervisores]);';
const targetStrCRLF = '  }, [distributedDados, filtroFiliais, filtroRegionais, filtroSupervisores]);\r\n';

const replacement = `  }, [distributedDados, filtroFiliais, filtroRegionais, filtroSupervisores]);

  const custosFiltradosEvolucao = useMemo(() => {
    const validKeys = new Set(faturamentoFiltradoEvolucao.map(f => \`\${f.filial}|\${f.quinzena}\`));
    return rawCustosData.filter(c => validKeys.has(\`\${c.filial}|\${c.quinzena}\`));
  }, [rawCustosData, faturamentoFiltradoEvolucao]);`;

if (code.includes(targetStrLF)) {
  code = code.replace(targetStrLF, replacement);
  fs.writeFileSync('src/App.jsx', code);
  console.log('Successfully added custosFiltradosEvolucao (LF)');
} else if (code.includes(targetStrCRLF)) {
  code = code.replace(targetStrCRLF, replacement + '\r\n');
  fs.writeFileSync('src/App.jsx', code);
  console.log('Successfully added custosFiltradosEvolucao (CRLF)');
} else {
  console.log('Target string not found!');
}
