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
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current);
    return result;
  };
  const row = parseCSVLine(lines[5], delimiter);
  console.log('RAW AU:', row[46]);
  console.log('RAW AV:', row[47]);
  console.log('RAW AZ:', row[51]);
  console.log('RAW BI:', row[60]);
});
