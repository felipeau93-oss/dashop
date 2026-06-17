const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');

// 1. Inserir os hooks ANTES de `const fetchExecutiveSummary`
const hooksCode = `
  const atualResumoMetrics = useMemo(() => {
    let total = 0, pnr = 0, lost = 0, nv = 0;
    dadosFiltradosEvolucao.filter(d => d.quinzena === targetQuinzenaRunRate).forEach(d => {
      total += d.valor;
      if (d.tipo === 'PNRs') pnr += d.valor;
      else if (d.tipo === 'Lost Packages') lost += d.valor;
      else if (d.tipo === 'Not Visited') nv += d.valor;
    });
    return { total, pnr, lost, nv };
  }, [dadosFiltradosEvolucao, targetQuinzenaRunRate]);

  const atualMargemBrutaMetrics = useMemo(() => {
    let faturamento = 0;
    faturamentoFiltradoEvolucao.filter(d => d.quinzena === targetQuinzenaRunRate).forEach(d => {
      faturamento += d.faturamento;
    });
    let custos = 0;
    custosFiltradosEvolucao.filter(d => d.quinzena === targetQuinzenaRunRate).forEach(d => {
      custos += d.valorPago;
    });
    const impostoFinanceiro = faturamento * (percentualImpostoFinanceiro / 100);
    const margemRS = faturamento - impostoFinanceiro - custos;
    const margemPct = faturamento > 0 ? (margemRS / faturamento) * 100 : 0;
    const penalidades = atualResumoMetrics.total;
    return { faturamento, custos, impostoFinanceiro, penalidades, margemRS, margemPct };
  }, [faturamentoFiltradoEvolucao, custosFiltradosEvolucao, targetQuinzenaRunRate, percentualImpostoFinanceiro, atualResumoMetrics.total]);

  // Expor no window para uso
  window.atualResumoMetrics = atualResumoMetrics;
  window.atualMargemBrutaMetrics = atualMargemBrutaMetrics;

  const fetchExecutiveSummary = async () => {`;

code = code.replace(/const fetchExecutiveSummary = async \(\) => \{/, hooksCode);

// 2. Substituir o bloco IIFE pelo JSX sem o wrap da função
const iifeRegex = /\{\/\* Computação Local das Métricas da Quinzena \(Bypass de Hook p\/ HMR Seguro\) \*\/\}\s*\{\(\(\) => \{\s*let total = 0, pnr = 0, lost = 0, nv = 0;[\s\S]*?return \([\s\S]*?<div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-8\">([\s\S]*?)<\/div>\s*<\/div>\s*\);\s*\}\)\(\)\}/;

const jsxCode = `<div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-8">$1</div></div>`;

if (iifeRegex.test(code)) {
  code = code.replace(iifeRegex, jsxCode);
  fs.writeFileSync('src/App.jsx', code);
  console.log("SUCESSO: Substituiu com regex IIFE.");
} else {
  console.log("FALHA: Não encontrou o regex do IIFE!");
}
