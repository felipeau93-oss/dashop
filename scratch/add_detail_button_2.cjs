const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');

if (!code.includes('ExternalLink,')) {
  code = code.replace(/import\s*\{([^}]*)\}\s*from\s*'lucide-react';/g, (match, p1) => {
    return `import {${p1}, ExternalLink} from 'lucide-react';`;
  });
}

code = code.replace(
  /<DetalheFinanceiroSection dadosFiltrados=\{dadosFiltrados\} onExport=\{\(options\) => handleDownloadExcel\('penalidades', options\)\} isExporting=\{exportingType === 'excel-penalidades'\} initialFilial=\{drilldownFilial\} \/>/g,
  `<DetalheFinanceiroSection dadosFiltrados={dadosFiltrados} onExport={(options) => handleDownloadExcel('penalidades', options)} isExporting={exportingType === 'excel-penalidades'} initialFilial={drilldownFilial} initialMotorista={drilldownMotorista} />`
);

code = code.replace(
  /const FilialPenalidadesModal = \(\{ filial, onClose, faturamentoData, operacionalData \}\) => \{/g,
  `const FilialPenalidadesModal = ({ filial, onClose, faturamentoData, operacionalData, onNavigateToDetalhes }) => {`
);

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
  /\{modalEvolutivoFilial && \(\s*<FilialPenalidadesModal \s*filial=\{modalEvolutivoFilial\} \s*onClose=\{\(\) => setModalEvolutivoFilial\(null\)\} \s*faturamentoData=\{faturamentoBaseData\} \s*operacionalData=\{operacionalBaseData\} \s*\/>\s*\)\}/g,
  modalCallReplacement
);

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
console.log('Fixed missing replacements');
