const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');

// 1. Add drilldownMotorista state
if (!code.includes('const [drilldownMotorista, setDrilldownMotorista] = useState(null);')) {
  code = code.replace(
    /const \[drilldownFilial, setDrilldownFilial\] = useState\(null\);/g,
    `const [drilldownFilial, setDrilldownFilial] = useState(null);\n  const [drilldownMotorista, setDrilldownMotorista] = useState(null);`
  );
}

// 2. Pass initialMotorista to DetalheFinanceiroSection call
code = code.replace(
  /<DetalheFinanceiroSection dadosFiltrados=\{dadosFiltrados\} onExport=\{\(options\) => handleDownloadExcel\('penalidades', options\)\} isExporting=\{exportingType === 'excel-penalidades'\} initialFilial=\{drilldownFilial\} \/>/g,
  `<DetalheFinanceiroSection dadosFiltrados={dadosFiltrados} onExport={(options) => handleDownloadExcel('penalidades', options)} isExporting={exportingType === 'excel-penalidades'} initialFilial={drilldownFilial} initialMotorista={drilldownMotorista} />`
);

// 3. Update DetalheFinanceiroSection component definition
code = code.replace(
  /const DetalheFinanceiroSection = \(\{ dadosFiltrados, onExport, isExporting, initialFilial \}\) => \{/g,
  `const DetalheFinanceiroSection = ({ dadosFiltrados, onExport, isExporting, initialFilial, initialMotorista }) => {`
);

// 4. Set selectedMotorista from initialMotorista
code = code.replace(
  /const \[selectedMotorista, setSelectedMotorista\] = useState\(null\);/g,
  `const [selectedMotorista, setSelectedMotorista] = useState(initialMotorista || null);\n    React.useEffect(() => { if (initialMotorista) setSelectedMotorista(initialMotorista); else setSelectedMotorista(null); }, [initialMotorista]);`
);

// 5. Update FilialPenalidadesModal call
const modalCallReplacement = `{modalEvolutivoFilial && (
              <FilialPenalidadesModal 
                filial={modalEvolutivoFilial} 
                onClose={() => setModalEvolutivoFilial(null)} 
                faturamentoData={faturamentoBaseData} 
                operacionalData={operacionalBaseData} 
                onNavigateToDetalhes={(motorista) => {
                  setActiveMenu('detalhe_financeiro');
                  setDrilldownFilial(modalEvolutivoFilial);
                  setDrilldownMotorista(motorista);
                  setFiltroQuinzenas(quinzenasDisponiveis.filter(q => q !== targetQuinzenaRunRate));
                  setModalEvolutivoFilial(null);
                }}
              />
            )}`;

code = code.replace(
  /\{modalEvolutivoFilial && \(\s*<FilialPenalidadesModal\s*filial=\{modalEvolutivoFilial\}\s*onClose=\{\(\) => setModalEvolutivoFilial\(null\)\}\s*faturamentoData=\{faturamentoBaseData\}\s*operacionalData=\{operacionalBaseData\}\s*\/>\s*\)\}/g,
  modalCallReplacement
);

// 6. Update FilialPenalidadesModal definition
code = code.replace(
  /const FilialPenalidadesModal = \(\{ filial, onClose, faturamentoData, operacionalData \}\) => \{/g,
  `const FilialPenalidadesModal = ({ filial, onClose, faturamentoData, operacionalData, onNavigateToDetalhes }) => {`
);

// 7. Add button in FilialPenalidadesModal
const buttonReplacement = `<div className="flex gap-3">
            <button onClick={() => onNavigateToDetalhes && onNavigateToDetalhes(selectedMotorista)} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-bold shadow-lg transition-colors flex items-center gap-2">
              <ExternalLink className="w-4 h-4" />
              <span className="hidden sm:inline">Ir para Detalhamento</span>
              <span className="sm:hidden">Detalhes</span>
            </button>
            <button onClick={onClose} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white transition-colors border border-slate-600">
              <X className="w-5 h-5" />
            </button>
          </div>`;

code = code.replace(
  /<button onClick=\{onClose\} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white transition-colors border border-slate-600">\s*<X className="w-5 h-5" \/>\s*<\/button>/g,
  buttonReplacement
);

fs.writeFileSync('src/App.jsx', code, 'utf8');
console.log('Added drilldown button functionality');
