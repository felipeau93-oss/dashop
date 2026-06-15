const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');

// Fix NativeComboChart tooltip clipping by increasing top padding
code = code.replace(
  /<div className="w-full h-\[320px\] flex flex-col pt-6 pb-12 relative">/g,
  `<div className={\`w-full \${heightClass} flex flex-col pt-24 pb-12 relative\`}>`
);

// Fix Evolução Operacional inline chart tooltip clipping by increasing top padding
code = code.replace(
  /<div className="h-\[220px\] relative flex flex-col justify-end pt-4 pb-8">/g,
  `<div className="h-[220px] relative flex flex-col justify-end pt-16 pb-8">`
);

// Add prop to hide Faturamento text in tooltip but keep the bar
code = code.replace(
  /const NativeComboChart = \(\{ data, labelKey = "name", onBarClick, heightClass = "h-\[400px\]", showFaturamento = true, isMarginChart = false, showLine = true, tooltipSecondaryLabel, showMargemErro, legendSecondaryLabel \}\) => \{/g,
  `const NativeComboChart = ({ data, labelKey = "name", onBarClick, heightClass = "h-[400px]", showFaturamento = true, isMarginChart = false, showLine = true, tooltipSecondaryLabel, showMargemErro, legendSecondaryLabel, hideFaturamentoTooltip = false }) => {`
);

code = code.replace(
  /\{showFaturamento && <div className="flex justify-between mb-1\.5"><span className="text-emerald-400">Faturamento<\/span><span className="font-mono text-white">\{formatCurrency\(d\.faturamento \|\| 0\)\}<\/span><\/div>\}/g,
  `{showFaturamento && !hideFaturamentoTooltip && <div className="flex justify-between mb-1.5"><span className="text-emerald-400">Faturamento</span><span className="font-mono text-white">{formatCurrency(d.faturamento || 0)}</span></div>}`
);

// Pass hideFaturamentoTooltip to FilialPenalidadesModal's NativeComboChart
code = code.replace(
  /<NativeComboChart data=\{chartDataValor\} labelKey="quinzena" heightClass="h-\[220px\]" isMarginChart=\{true\} showFaturamento=\{true\} tooltipSecondaryLabel="Penalidades" legendSecondaryLabel="Penalidades" showMargemErro=\{false\} \/>/g,
  `<NativeComboChart data={chartDataValor} labelKey="quinzena" heightClass="h-[220px]" isMarginChart={true} showFaturamento={true} tooltipSecondaryLabel="Penalidades" legendSecondaryLabel="Penalidades" showMargemErro={false} hideFaturamentoTooltip={true} />`
);

// In paretoQuinzenaData under "Penalidades (Operação)", hide the Faturamento tooltip too?
// It already has showFaturamento={false}, which completely removes Faturamento from the chart (bars and tooltips).

fs.writeFileSync('src/App.jsx', code, 'utf8');
console.log('Fixed clipping and tooltip');
