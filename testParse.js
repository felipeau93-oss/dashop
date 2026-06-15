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

console.log('AV:', parseValor('R$419,71'));
console.log('AZ:', parseValor('R$ 419,71'));
console.log('AV Neg:', parseValor('R$-419,71'));
console.log('AV Parens:', parseValor('(R$419,71)'));
