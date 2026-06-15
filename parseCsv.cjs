const fs = require('fs');
const path = require('path');
const csvContent = fs.readFileSync('C:/Users/felip/.gemini/antigravity-ide/brain/2e53450f-82a7-48cf-8e0d-fc1ec75d4cf5/.system_generated/steps/1708/content.md', 'utf8');

const lines = csvContent.split('\n');
const headerIdx = lines.findIndex(l => l.includes('UF,Categoria,Range,DiaSem,Ciclo,Tarifa'));

if (headerIdx === -1) {
  console.log('CSV header not found');
  process.exit(1);
}

const csvLines = lines.slice(headerIdx);
const result = [];
for (let i = 1; i < csvLines.length; i++) {
  const line = csvLines[i].trim();
  if (!line) continue;
  
  const regex = /([^,]+),([^,]+),([^,]+),([^,]+),([^,]+),\"R\$ ([^\"]+)\"/;
  const match = line.match(regex);
  if (match) {
    let tarifa = parseFloat(match[6].replace(/\./g, '').replace(',', '.'));
    result.push({
      uf: match[1],
      categoria: match[2],
      range: match[3],
      diaSem: match[4],
      ciclo: match[5],
      tarifa: tarifa
    });
  } else {
    const parts = line.split(',');
    if (parts.length >= 6) {
      let tarifaStr = parts[5].replace('\"', '').replace('R$ ', '').replace(/\./g, '').replace(',', '.');
      result.push({
        uf: parts[0],
        categoria: parts[1],
        range: parts[2],
        diaSem: parts[3],
        ciclo: parts[4],
        tarifa: parseFloat(tarifaStr)
      });
    }
  }
}

const jsContent = 'export const tarifas = ' + JSON.stringify(result, null, 2) + ';\n';
fs.mkdirSync(path.join('c:/Users/felip/OneDrive/Desktop/Antigravity Projects/src/data'), { recursive: true });
fs.writeFileSync('c:/Users/felip/OneDrive/Desktop/Antigravity Projects/src/data/tarifas.js', jsContent);
console.log('Written ' + result.length + ' records to tarifas.js');
