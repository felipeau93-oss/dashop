const fs = require('fs');
const lines = fs.readFileSync('planilha_teste.csv', 'utf8').split('\n');
const delimiter = lines[0].includes(';') ? ';' : ',';
const parseCSVLine = (line, delimiter) => {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
};
const header = parseCSVLine(lines[1], delimiter);
for (let i=0; i<header.length; i++) {
  console.log(i + ': ' + header[i]);
}
