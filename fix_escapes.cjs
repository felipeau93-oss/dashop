const fs = require('fs');
let c = fs.readFileSync('src/DataImporter.jsx', 'utf8');
c = c.replace(/\\\`/g, '`');
c = c.replace(/\\\$\{/g, '${');
c = c.replace(/\\\\d/g, '\\d');
fs.writeFileSync('src/DataImporter.jsx', c);
console.log('Fixed escapes');
