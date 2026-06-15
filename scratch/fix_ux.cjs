const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');

// 1. Scroll to top on menu change
if (!code.includes('const mainScrollRef = useRef(null);')) {
  code = code.replace(
    /const \[activeMenu, setActiveMenu\] = useState\('visao_geral'\);/,
    `const [activeMenu, setActiveMenu] = useState('visao_geral');\n  const mainScrollRef = useRef(null);\n  useEffect(() => { if (mainScrollRef.current) mainScrollRef.current.scrollTo({ top: 0, behavior: 'smooth' }); }, [activeMenu]);`
  );
  code = code.replace(
    /<div className="flex-1 overflow-y-auto p-4 md:p-8">/,
    `<div className="flex-1 overflow-y-auto p-4 md:p-8" ref={mainScrollRef}>`
  );
}

// 2. Return to Modal State
if (!code.includes('const [returnToModalState, setReturnToModalState]')) {
  code = code.replace(
    /const \[drilldownFilial, setDrilldownFilial\] = useState\(null\);/,
    `const [drilldownFilial, setDrilldownFilial] = useState(null);\n  const [returnToModalState, setReturnToModalState] = useState(null);`
  );
  
  // Pass to DetalheFinanceiroSection
  code = code.replace(
    /<DetalheFinanceiroSection dadosFiltrados=\{dadosFiltrados\} onExport=\{\(options\) => handleDownloadExcel\('penalidades', options\)\} isExporting=\{exportingType === 'excel-penalidades'\} initialFilial=\{drilldownFilial\} initialMotorista=\{drilldownMotorista\} \/>/,
    `<DetalheFinanceiroSection dadosFiltrados={dadosFiltrados} onExport={(options) => handleDownloadExcel('penalidades', options)} isExporting={exportingType === 'excel-penalidades'} initialFilial={drilldownFilial} initialMotorista={drilldownMotorista} returnToModalState={returnToModalState} onReturnToModal={() => { setActiveMenu(returnToModalState.menu); setModalEvolutivoFilial(returnToModalState.filial); setReturnToModalState(null); }} />`
  );
  
  // Set state in onNavigateToDetalhes
  code = code.replace(
    /setDrilldownFilial\(modalEvolutivoFilial\);/g,
    `setReturnToModalState({ menu: activeMenu, filial: modalEvolutivoFilial });\n            setDrilldownFilial(modalEvolutivoFilial);`
  );
}

// Modify DetalheFinanceiroSection definition and buttons
if (!code.includes('returnToModalState, onReturnToModal')) {
  code = code.replace(
    /const DetalheFinanceiroSection = \(\{ dadosFiltrados, onExport, isExporting, initialFilial, initialMotorista \}\) => \{/,
    `const DetalheFinanceiroSection = ({ dadosFiltrados, onExport, isExporting, initialFilial, initialMotorista, returnToModalState, onReturnToModal }) => {`
  );
  code = code.replace(
    /\{\(selectedFilial \|\| selectedMotorista\) && \(<button onClick=\{handleLevelUp\} className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2\.5 rounded-xl text-sm font-bold shadow-sm shrink-0">⬅ Voltar<\/button>\)\}/,
    `{returnToModalState && (<button onClick={onReturnToModal} className="bg-blue-100 hover:bg-blue-200 text-blue-700 px-4 py-2.5 rounded-xl text-sm font-bold shadow-sm shrink-0">⬅ Voltar para Análise Evolutiva</button>)}\n            {(selectedFilial || selectedMotorista) && !returnToModalState && (<button onClick={handleLevelUp} className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2.5 rounded-xl text-sm font-bold shadow-sm shrink-0">⬅ Voltar</button>)}`
  );
}

// 3. Export Excel for Modal cases
if (!code.includes('FileSpreadsheet className="w-4 h-4 text-emerald-400"')) {
  // Add button to FilialPenalidadesModal
  code = code.replace(
    /Ir para Detalhamento<\/span>\s*<span className="sm:hidden">Detalhes<\/span>\s*<\/button>/,
    `Ir para Detalhamento</span>\n                <span className="sm:hidden">Detalhes</span>\n              </button>\n              <button onClick={() => onExportExcel && onExportExcel(casosFilial)} className="px-3 py-2.5 bg-slate-800 hover:bg-emerald-900 border border-slate-700 hover:border-emerald-700 text-slate-300 hover:text-emerald-400 rounded-xl transition-colors shadow-lg flex items-center gap-2" title="Gerar Planilha desta Visão">\n                <FileSpreadsheet className="w-4 h-4" />\n                <span className="hidden sm:inline text-sm font-bold">Excel</span>\n              </button>`
  );
  
  // Pass onExportExcel to Modal
  code = code.replace(
    /onClose=\{\(\) => setModalEvolutivoFilial\(null\)\}/,
    `onClose={() => setModalEvolutivoFilial(null)}\n          onExportExcel={(casos) => handleDownloadExcel('evolutivo', { data: casos, filial: modalEvolutivoFilial })}`
  );
  
  // Modify handleDownloadExcel
  code = code.replace(
    /if \(type === 'penalidades'\) \{/,
    `if (type === 'evolutivo') {\n          const ws = XLSX.utils.json_to_sheet(options.data.map(c => ({\n            Filial: c.filial,\n            Regional: c.regional,\n            Quinzena: c.quinzena,\n            Motorista: c.motorista,\n            'Tipo Infração': c.tipo,\n            'Valor (R$)': c.valor\n          })));\n          XLSX.utils.book_append_sheet(wb, ws, "Casos Evolutivo");\n          XLSX.writeFile(wb, \`Evolutivo_\${options.filial}.xlsx\`);\n          setExportingType(null);\n          return;\n        }\n\n        if (type === 'penalidades') {`
  );
}

// Add FileSpreadsheet to Modal props
code = code.replace(
  /const FilialPenalidadesModal = \(\{ filial, targetQuinzena, dadosPlanilha, faturamentoPlanilha, onClose, onNavigateToDetalhes \}\) => \{/,
  `const FilialPenalidadesModal = ({ filial, targetQuinzena, dadosPlanilha, faturamentoPlanilha, onClose, onNavigateToDetalhes, onExportExcel }) => {`
);

fs.writeFileSync('src/App.jsx', code, 'utf8');
console.log('App.jsx modified with fixes');
