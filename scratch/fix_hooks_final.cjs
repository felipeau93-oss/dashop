const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');

// Find start and end of useEffect
const startStr = '  useEffect(() => {\r\n    // Apenas admins em visões estratégicas';
const endStr = 'fetchExecutiveSummary();\r\n  }, [targetQuinzenaRunRate, activeMenu, isUserAdmin, margemBrutaMetrics, prevMargemBrutaMetrics, prevQuinzenaName]);';

let startIndex = code.indexOf(startStr);
let endIndex = code.indexOf(endStr);

if (startIndex === -1 || endIndex === -1) {
  // Try without \r
  const startStrUnix = '  useEffect(() => {\n    // Apenas admins em visões estratégicas';
  const endStrUnix = 'fetchExecutiveSummary();\n  }, [targetQuinzenaRunRate, activeMenu, isUserAdmin, margemBrutaMetrics, prevMargemBrutaMetrics, prevQuinzenaName]);';
  startIndex = code.indexOf(startStrUnix);
  endIndex = code.indexOf(endStrUnix);
  if (endIndex !== -1) endIndex += endStrUnix.length;
} else {
  endIndex += endStr.length;
}

if (startIndex === -1 || endIndex === -1) {
  console.log('Failed to find useEffect block!');
  console.log(startIndex, endIndex);
  process.exit(1);
}

let useEffectBlock = code.substring(startIndex, endIndex);
code = code.substring(0, startIndex) + code.substring(endIndex);

// Replace window. variables in useEffectBlock
useEffectBlock = useEffectBlock.replace(/window\.atualMargemBrutaMetrics\?/g, 'atualMargemBrutaMetrics?');
useEffectBlock = useEffectBlock.replace(/window\.atualResumoMetrics\?/g, 'atualResumoMetrics?');

// Change dependency array of useEffect
useEffectBlock = useEffectBlock.replace(
  'prevQuinzenaName]);',
  'prevQuinzenaName, faturamentoTotalMetrics, resumoMetrics, quinzenasDisponiveis, faturamentoFiltradoEvolucao, custosFiltradosEvolucao, dadosFiltradosEvolucao, percentualImpostoFinanceiro, atualMargemBrutaMetrics, atualResumoMetrics]);'
);

const hooksToAdd = `
  const atualResumoMetrics = useMemo(() => {
    if (!targetQuinzenaRunRate) return { total: 0, multas: 0, avarias: 0 };
    return resumoMetrics;
  }, [targetQuinzenaRunRate, resumoMetrics]);

  const atualMargemBrutaMetrics = useMemo(() => {
    if (!targetQuinzenaRunRate) return {
      faturamento: 0,
      imposto: 0,
      custos: 0,
      penalidades: 0,
      margemRS: 0,
      margemPct: 0,
      margemBase: 0
    };
    return margemBrutaMetrics;
  }, [targetQuinzenaRunRate, margemBrutaMetrics]);

`;

let insertionPoint = '  // TELA DE LOGIN\r\n  if (isAuthenticated === null) {';
let insertionIndex = code.indexOf(insertionPoint);

if (insertionIndex === -1) {
  insertionPoint = '  // TELA DE LOGIN\n  if (isAuthenticated === null) {';
  insertionIndex = code.indexOf(insertionPoint);
}

if (insertionIndex === -1) {
  console.log('Failed to find insertion point!');
  process.exit(1);
}

code = code.substring(0, insertionIndex) + hooksToAdd + useEffectBlock + '\n\n' + code.substring(insertionIndex);

fs.writeFileSync('src/App.jsx', code);
console.log('Successfully moved hooks and injected useMemos!');
