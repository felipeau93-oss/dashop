const fs = require('fs');
let code = fs.readFileSync('src/DataImporter.jsx', 'utf8');

if (!code.includes('getInicioDaSemana')) {
  const importStr = "import { supabase } from './supabase';";
  const getInicioDaSemanaStr = `\nconst ANO_REFERENCIA = 2026;

const getInicioDaSemana = (dataString) => {
  const [dia, mes] = dataString.split('/');
  const data = new Date(ANO_REFERENCIA, parseInt(mes) - 1, parseInt(dia));
  const diaDaSemana = data.getDay(); 
  const domingo = new Date(data);
  domingo.setDate(data.getDate() - diaDaSemana);
  return \`\${domingo.getDate().toString().padStart(2, '0')}/\${(domingo.getMonth() + 1).toString().padStart(2, '0')}\`;
};
`;

  code = code.replace(importStr, importStr + "\n" + getInicioDaSemanaStr);
}

fs.writeFileSync('src/DataImporter.jsx', code);
console.log('Added getInicioDaSemana to DataImporter.jsx');
