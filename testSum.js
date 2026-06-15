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

  const parseValor = (valStr) => {
    if(!valStr) return 0;
    let str = valStr.toString().trim();
    const isNegative = str.includes('-') || (str.includes('(') && str.includes(')'));
    str = str.replace(/[^\d,.]/g, '');
    const hasComma = str.includes(',');
    const hasDot = str.includes('.');
    if (hasComma && hasDot) {
      const lastComma = str.lastIndexOf(',');
      const lastDot = str.lastIndexOf('.');
      if (lastComma > lastDot) {
        str = str.replace(/\./g, '').replace(',', '.');
      } else {
        str = str.replace(/,/g, '');
      }
    } else if (hasComma) {
      str = str.replace(',', '.');
    }
    let num = parseFloat(str);
    if(isNaN(num)) return 0;
    return isNegative ? -num : num;
  };

  let sumAZ = 0;
  let sumAV = 0;
  let countNaN_AZ = 0;
  let countNaN_AV = 0;

  for(let i=3; i<lines.length; i++) {
    if(!lines[i].trim()) continue;
    const cols = parseCSVLine(lines[i], delimiter);
    if (cols.length > 51) {
      const az = parseValor(cols[51]);
      const av = parseValor(cols[47]);
      if(isNaN(az)) countNaN_AZ++;
      if(isNaN(av)) countNaN_AV++;
      sumAZ += isNaN(az) ? 0 : az;
      sumAV += isNaN(av) ? 0 : av;
    }
  }

  console.log('Sum AZ:', sumAZ);
  console.log('Sum AV:', sumAV);
  console.log('NaN AZ:', countNaN_AZ);
  console.log('NaN AV:', countNaN_AV);
});
