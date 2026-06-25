const fs = require('fs');
let c = fs.readFileSync('src/DataImporter.jsx', 'utf8');
const startIdx = c.indexOf('const handleProcessDispFile = () => {');
const endIdx = c.indexOf('  const handleProcessBsc = () => {');
if (startIdx !== -1 && endIdx !== -1) {
    const fixDisp = fs.readFileSync('fix_disp.cjs', 'utf8');
    const newFunc = fixDisp.split('const newHandleProcessDispFile = `')[1].split('`;')[0];
    c = c.substring(0, startIdx) + newFunc + '\n\n' + c.substring(endIdx);
    fs.writeFileSync('src/DataImporter.jsx', c);
    console.log('Replaced by index safely!');
} else {
    console.log('Failed to find indexes.');
}
