const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');

// 1. Add new props to NativeComboChart
code = code.replace(
  /const NativeComboChart = \(\{ data, labelKey = "name", onBarClick, heightClass = "h-\[400px\]", showFaturamento = true, isMarginChart = false, showLine = true \}\) => \{/g,
  `const NativeComboChart = ({ data, labelKey = "name", onBarClick, heightClass = "h-[400px]", showFaturamento = true, isMarginChart = false, showLine = true, tooltipSecondaryLabel, showMargemErro, legendSecondaryLabel }) => {`
);

// 2. Fix the tooltip text
code = code.replace(
  /\{isMarginChart \? 'Total Pago' : 'Total Penalidades'\}/g,
  `{tooltipSecondaryLabel || (isMarginChart ? 'Total Pago' : 'Total Penalidades')}`
);

// 3. Fix the margem erro visibility
code = code.replace(
  /\{isMarginChart && \(/g,
  `{isMarginChart && (showMargemErro !== false) && (`
);

// 4. Fix the legend text
code = code.replace(
  /\{isMarginChart \? 'Pagamento de Agregados' : 'PNRs'\}/g,
  `{legendSecondaryLabel || (isMarginChart ? 'Pagamento de Agregados' : 'PNRs')}`
);

// 5. Update FilialPenalidadesModal call
// Remove showLine={false} (it defaults to true now), and add the new props
code = code.replace(
  /<NativeComboChart data=\{chartDataValor\} labelKey="quinzena" heightClass="h-\[220px\]" isMarginChart=\{true\} showFaturamento=\{true\} showLine=\{false\} \/>/g,
  `<NativeComboChart data={chartDataValor} labelKey="quinzena" heightClass="h-[220px]" isMarginChart={true} showFaturamento={true} tooltipSecondaryLabel="Penalidades" legendSecondaryLabel="Penalidades" showMargemErro={false} />`
);

fs.writeFileSync('src/App.jsx', code, 'utf8');
console.log('Fixed modal tooltip text and restored line');
