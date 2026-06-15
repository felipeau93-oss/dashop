const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');

code = code.replace(
  /\{showLine && \(<svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible z-20" viewBox="0 0 100 100" preserveAspectRatio="none">/g,
  `<svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible z-20" viewBox="0 0 100 100" preserveAspectRatio="none">`
);

code = code.replace(
  /<\/svg>\)}\n            \{hoveredIndex !== null/g,
  `</svg>\n            {hoveredIndex !== null`
);

code = code.replace(
  /\{showLine && hoveredIndex !== null && safeData\[hoveredIndex\] && showFaturamento && \(/g,
  `{hoveredIndex !== null && safeData[hoveredIndex] && showFaturamento && (`
);

code = code.replace(
  /<span className="text-\[10px\] font-bold text-violet-500 bg-transparent pl-2 -translate-y-1\/2">\{showFaturamento && showLine \? `\$\{\(\(maxRep \* \(step \/ 4\)\)\)\.toFixed\(1\)\}%` : ''\}<\/span>/g,
  `<span className="text-[10px] font-bold text-violet-500 bg-transparent pl-2 -translate-y-1/2">{showFaturamento ? \`\${((maxRep * (step / 4))).toFixed(1)}%\` : ''}</span>`
);

fs.writeFileSync('src/App.jsx', code, 'utf8');
console.log('Reverted bad showLine logic');
