const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');
code = code.replace(
  `          targetQuinzena={targetQuinzena} `,
  `          targetQuinzena={targetQuinzenaRunRate} `
);
fs.writeFileSync('src/App.jsx', code, 'utf8');
console.log('Fixed targetQuinzena reference');
