const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');

const gridRegex = /<div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-8">([\s\S]*?)<\/div>\s*<\/div>/;
const match = code.match(gridRegex);

if (match) {
  let firstGrid = match[0];
  
  // Create second grid by replacing variable names
  let secondGrid = firstGrid
    .replace(/margemBrutaMetrics/g, 'prevMargemBrutaMetrics')
    .replace(/formatCurrency\(prevMargemBrutaMetrics\.margemRS\)/g, 'formatCurrency(prevMargemBrutaMetrics.margemRS || 0)')
    .replace(/prevMargemBrutaMetrics\.margemPct\.toFixed/g, '(prevMargemBrutaMetrics.margemPct || 0).toFixed')
    .replace(/prevMargemBrutaMetrics\.margemRS >= 0/g, '(prevMargemBrutaMetrics.margemRS || 0) >= 0');
    
  const comparativoHeader = `\n                {prevMargemBrutaMetrics && (\n                  <>\n                    <h3 className="text-lg font-bold text-blue-100 mb-4 mt-8">Comparativo: Quinzena Anterior ({prevQuinzenaName})</h3>\n                    <div className="opacity-80 scale-95 origin-top">\n                      ${secondGrid}\n                    </div>\n                  </>\n                )}\n`;
  
  const finalCode = code.replace(firstGrid, firstGrid + comparativoHeader);
  fs.writeFileSync('src/App.jsx', finalCode);
  console.log("Successfully duplicated the grid cards without breaking syntax!");
} else {
  console.log("Failed to find the grid block.");
}
