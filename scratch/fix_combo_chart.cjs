const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');

// Replace the chart container and the NativeComboChart to include the line chart for QTD
code = code.replace(
  /<div className="h-\[220px\]">[\s\S]*?<NativeComboChart data=\{chartDataValor\} labelKey="quinzena" heightClass="h-\[220px\]" isMarginChart=\{true\} showFaturamento=\{true\} tooltipSecondaryLabel="Penalidades" legendSecondaryLabel="Penalidades" showMargemErro=\{false\} hideFaturamentoTooltip=\{true\} \/>[\s\S]*?<\/div>/,
  `<div className="h-[260px] pt-10">
                    <NativeComboChart data={chartDataValor} labelKey="quinzena" heightClass="h-[220px]" isMarginChart={true} showFaturamento={true} tooltipSecondaryLabel="Penalidades" legendSecondaryLabel="Penalidades" showMargemErro={false} hideFaturamentoTooltip={true} dsKey="qtdNormalizada" showDSLine={true} dsLabel="Quantidade" tooltipRender={(d) => (\`\${d.totalQtd} pacotes\`)} />
                  </div>`
);

fs.writeFileSync('src/App.jsx', code, 'utf8');
console.log('App.jsx fixed combo chart!');
