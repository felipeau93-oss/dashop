const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');

// 1. Add showLine prop to NativeComboChart
code = code.replace(
  /const NativeComboChart = \(\{ data, labelKey = "name", onBarClick, heightClass = "h-\[400px\]", showFaturamento = true, isMarginChart = false \}\) => \{/g,
  `const NativeComboChart = ({ data, labelKey = "name", onBarClick, heightClass = "h-[400px]", showFaturamento = true, isMarginChart = false, showLine = true }) => {`
);

// 2. Hide the line SVG if showLine is false
code = code.replace(
  /<svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible z-20" viewBox="0 0 100 100" preserveAspectRatio="none">/g,
  `{showLine && (<svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible z-20" viewBox="0 0 100 100" preserveAspectRatio="none">`
);

code = code.replace(
  /<\/svg>\s*\{hoveredIndex !== null/g,
  `</svg>)}\n            {hoveredIndex !== null`
);

// 3. Hide the dashed line
code = code.replace(
  /\{hoveredIndex !== null && safeData\[hoveredIndex\] && showFaturamento && \(/g,
  `{showLine && hoveredIndex !== null && safeData[hoveredIndex] && showFaturamento && (`
);

// 4. Hide the secondary Y-axis percentage labels
code = code.replace(
  /<span className="text-\[10px\] font-bold text-violet-500 bg-transparent pl-2 -translate-y-1\/2">\{showFaturamento \? \`\$\{\(\(maxRep \* \(step \/ 4\)\)\)\.toFixed\(1\)\\}%\` : ''\}<\/span>/g,
  `<span className="text-[10px] font-bold text-violet-500 bg-transparent pl-2 -translate-y-1/2">{showFaturamento && showLine ? \`\${((maxRep * (step / 4))).toFixed(1)}%\` : ''}</span>`
);

// 5. Update FilialPenalidadesModal to pass showLine={false}
code = code.replace(
  /<NativeComboChart data=\{chartDataValor\} labelKey="quinzena" heightClass="h-\[220px\]" isMarginChart=\{true\} showFaturamento=\{true\} \/>/g,
  `<NativeComboChart data={chartDataValor} labelKey="quinzena" heightClass="h-[220px]" isMarginChart={true} showFaturamento={true} showLine={false} />`
);

fs.writeFileSync('src/App.jsx', code, 'utf8');
console.log('Fixed showLine logic in NativeComboChart');
