const fs = require('fs');
let code = fs.readFileSync('src/PainelDisponibilidade.jsx', 'utf8');

// 1. Remove Papa and XLSX imports
code = code.replace("import Papa from 'papaparse';\r\n", "");
code = code.replace("import * as XLSX from 'xlsx';\r\n", "");
code = code.replace("import Papa from 'papaparse';\n", "");
code = code.replace("import * as XLSX from 'xlsx';\n", "");

// 2. Remove states
code = code.replace("  const [file, setFile] = useState(null);\r\n", "");
code = code.replace("  const [isProcessing, setIsProcessing] = useState(false);\r\n", "");
code = code.replace("  const [progressText, setProgressText] = useState('');\r\n", "");
code = code.replace("  const [file, setFile] = useState(null);\n", "");
code = code.replace("  const [isProcessing, setIsProcessing] = useState(false);\n", "");
code = code.replace("  const [progressText, setProgressText] = useState('');\n", "");

// 3. Remove getInicioDaSemana
const getInicioStart = code.indexOf('const getInicioDaSemana');
if (getInicioStart !== -1) {
  const getInicioEndStr = '  return `${domingo.getDate().toString().padStart(2, \'0\')}/${(domingo.getMonth() + 1).toString().padStart(2, \'0\')}`;\r\n};\r\n';
  const getInicioEndStrLF = getInicioEndStr.replace(/\r\n/g, '\n');
  
  let endIdx = code.indexOf(getInicioEndStr, getInicioStart);
  let len = getInicioEndStr.length;
  if (endIdx === -1) {
      endIdx = code.indexOf(getInicioEndStrLF, getInicioStart);
      len = getInicioEndStrLF.length;
  }
  
  if (endIdx !== -1) {
    code = code.slice(0, getInicioStart) + code.slice(endIdx + len);
  }
}

// 4. Remove handleProcessFile
const handleProcessStart = code.indexOf('  const handleProcessFile = () => {');
if (handleProcessStart !== -1) {
  const endStr = '    setIsProcessing(false);\r\n  };\r\n';
  const endStrLF = '    setIsProcessing(false);\n  };\n';
  let endIdx = code.indexOf(endStr, handleProcessStart);
  let len = endStr.length;
  if (endIdx === -1) {
      endIdx = code.indexOf(endStrLF, handleProcessStart);
      len = endStrLF.length;
  }
  
  if (endIdx !== -1) {
      code = code.slice(0, handleProcessStart) + code.slice(endIdx + len);
  }
}

// 5. Remove the upload label and button from JSX
const labelStart = code.indexOf('<label className="flex items-center justify-center gap-2 bg-slate-50');
if (labelStart !== -1) {
  const buttonEndStr = '</button>';
  const buttonStart = code.indexOf('<button \n                onClick={handleProcessFile}', labelStart) || code.indexOf('<button', labelStart);
  if(buttonStart !== -1) {
     const buttonEnd = code.indexOf(buttonEndStr, buttonStart);
     if (buttonEnd !== -1) {
        code = code.slice(0, labelStart) + code.slice(buttonEnd + buttonEndStr.length);
     }
  } else {
     // Wait, if line endings are different
     const btnStart = code.indexOf('onClick={handleProcessFile}', labelStart);
     if (btnStart !== -1) {
         const btnEnd = code.indexOf('</button>', btnStart) + '</button>'.length;
         code = code.slice(0, labelStart) + code.slice(btnEnd);
     }
  }
}

// 6. Remove ANO_REFERENCIA
code = code.replace("const ANO_REFERENCIA = 2026;\r\n", "");
code = code.replace("const ANO_REFERENCIA = 2026;\n", "");

fs.writeFileSync('src/PainelDisponibilidade.jsx', code);
console.log('PainelDisponibilidade cleaned up successfully!');
