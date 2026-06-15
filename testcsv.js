const url = 'https://docs.google.com/spreadsheets/d/1zabomWsXNX1xwZbj0xNRx683re1QAYFcPYackB2kXU0/export?format=csv&gid=1452775904';
fetch(url).then(r => r.text()).then(t => {
  const lines = t.split('\n');
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

  const header = parseCSVLine(lines[0], delimiter);
  const idxRegional = header.findIndex(h => h.toLowerCase().includes('regi'));
  console.log('Index Regional:', idxRegional, header[idxRegional]);

  const row = parseCSVLine(lines[5], delimiter);
  console.log('Val 46 (AU):', row[46]);
  console.log('Val 47 (AV):', row[47]);
  console.log('Val 51 (AZ):', row[51]);
  console.log('Val 60 (BI):', row[60]);
});
