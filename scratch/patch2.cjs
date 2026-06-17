const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf-8');

code = code.replace(
  /const prompt = `Você é um Analista Executivo Sênior[\s\S]*?Comece direto na análise\.`;/,
  `const prompt = \`Você é um Analista Executivo Sênior de uma transportadora.
Escreva um resumo executivo extremamente sucinto e direto (máximo 1 parágrafo) analisando a quinzena atual (\${targetQuinzenaRunRate}) e comparando-a com as duas anteriores (\${prevQuinzenaName || 'N/A'} e \${prevPrevQuinzenaName || 'N/A'}).
FOCO: Evolução da Margem de Contribuição e Controle de Custos/Penalidades.
DADOS DA QUINZENA ATUAL (\${targetQuinzenaRunRate}):
Margem: R$ \${atualMargemBrutaMetrics?.margemRS?.toFixed(2) || 0} (\${atualMargemBrutaMetrics?.margemPct?.toFixed(1) || 0}%)
Penalidades: R$ \${atualMargemBrutaMetrics?.penalidades?.toFixed(2) || 0}
Faturamento: R$ \${atualMargemBrutaMetrics?.faturamento?.toFixed(2) || 0}

DADOS DA QUINZENA ANTERIOR 1 (\${prevQuinzenaName || 'N/A'}):
Margem: R$ \${prevMargemBrutaMetrics?.margemRS?.toFixed(2) || 0} (\${prevMargemBrutaMetrics?.margemPct?.toFixed(1) || 0}%)
Penalidades: R$ \${prevMargemBrutaMetrics?.penalidades?.toFixed(2) || 0}
Faturamento: R$ \${prevMargemBrutaMetrics?.faturamento?.toFixed(2) || 0}

DADOS DA QUINZENA ANTERIOR 2 (\${prevPrevQuinzenaName || 'N/A'}):
Margem: R$ \${prevPrevMargemBrutaMetrics?.margemRS?.toFixed(2) || 0} (\${prevPrevMargemBrutaMetrics?.margemPct?.toFixed(1) || 0}%)
Penalidades: R$ \${prevPrevMargemBrutaMetrics?.penalidades?.toFixed(2) || 0}
Faturamento: R$ \${prevPrevMargemBrutaMetrics?.faturamento?.toFixed(2) || 0}

Diretrizes: 
- Use emojis profissionais. 
- Seja muito breve (direto ao ponto), focado na tendência das 3 quinzenas. 
- NÃO escreva "Olá" nem despedidas. Comece direto na análise.\`;`
);

code = code.replace(
  /fetchExecutiveSummary\(\);\n    \}, \[targetQuinzenaRunRate, activeMenu, isUserAdmin, margemBrutaMetrics, prevMargemBrutaMetrics, prevQuinzenaName\]\);/,
  `fetchExecutiveSummary();
    }, [targetQuinzenaRunRate, activeMenu, isUserAdmin, atualMargemBrutaMetrics, prevMargemBrutaMetrics, prevPrevMargemBrutaMetrics, prevQuinzenaName, prevPrevQuinzenaName]);`
);

fs.writeFileSync('src/App.jsx', code);
console.log('patched prompt');
