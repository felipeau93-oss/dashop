const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');
code = code.replace(
  `dadosPlanilha={dadosPlanilha}`,
  `dadosPlanilha={rawData}`
);
fs.writeFileSync('src/App.jsx', code, 'utf8');
console.log('Fixed rawData reference');
