const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');

// Revert 2nd:
const bad2 = `{showLine && (<svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible z-20" viewBox="0 0 100 100" preserveAspectRatio="none">
              <polyline points={safeData.map((d, i) => \`\${(i + 0.5) * (100 / safeData.length)},\${100 - Math.min(Math.max((((d.ds || 0) - 80) / 20) * 100, 0), 100)}\`).join(' ')} fill="none" stroke="#0f766e" strokeWidth="4" vectorEffect="non-scaling-stroke" />
            </svg>)}
              {hoveredIndex !== null && safeData[hoveredIndex] && (`;
const good2 = `<svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible z-20" viewBox="0 0 100 100" preserveAspectRatio="none">
              <polyline points={safeData.map((d, i) => \`\${(i + 0.5) * (100 / safeData.length)},\${100 - Math.min(Math.max((((d.ds || 0) - 80) / 20) * 100, 0), 100)}\`).join(' ')} fill="none" stroke="#0f766e" strokeWidth="4" vectorEffect="non-scaling-stroke" />
            </svg>
            {hoveredIndex !== null && safeData[hoveredIndex] && (`;

code = code.replace(bad2, good2);

// Revert 3rd:
const bad3 = `{showLine && (<svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible z-20" viewBox="0 0 100 100" preserveAspectRatio="none">
              <line x1="25" y1={100 - dsToY(currentDS)} x2="75" y2={100 - dsToY(projDS)} stroke="#0f766e" strokeWidth="4" strokeDasharray="6 4" vectorEffect="non-scaling-stroke" />
            </svg>
          )}`;
const good3 = `<svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible z-20" viewBox="0 0 100 100" preserveAspectRatio="none">
              <line x1="25" y1={100 - dsToY(currentDS)} x2="75" y2={100 - dsToY(projDS)} stroke="#0f766e" strokeWidth="4" strokeDasharray="6 4" vectorEffect="non-scaling-stroke" />
            </svg>`;

code = code.replace(bad3, good3);

// And wait! The hoveredIndex logic in the 2nd one was replaced with `{showLine && ...` as well?
// Let's check the previous `Get-Content`.
// In 2nd:
// `{showLine && hoveredIndex !== null && safeData[hoveredIndex] && showFaturamento && (` -> Oh, wait. `showFaturamento` was replaced in `NativeComboChart`. Did it replace in the 2nd one?
// In the 2nd one, the code was:
// `              {hoveredIndex !== null && safeData[hoveredIndex] && (` -> It was NOT replaced. It's safe!

fs.writeFileSync('src/App.jsx', code, 'utf8');
console.log('Fixed bad SVG replacements outside NativeComboChart');
