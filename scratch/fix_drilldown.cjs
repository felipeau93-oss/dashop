const fs = require('fs');

let code = fs.readFileSync('src/App.jsx', 'utf8');

// 1. Remove the modal logic from RunRateFinanceiroSection and RunRatePenalidadesSection
// We will replace the entire modal block with nothing.
code = code.replace(/<div className="fixed inset-0 z-\[100\][\s\S]*?<\/div>\s*<\/div>\s*}\s*/g, '');
code = code.replace(/const ofensoresModal = useMemo\(\(\) => \{[\s\S]*?\}, \[baseData, selectedOfensorFilial\]\);\s*/g, '');

// 2. Change their signatures to accept onDrilldown
code = code.replace(/const RunRateFinanceiroSection = \({ baseData, targetQuinzena, prevStats }\) => {/g, 'const RunRateFinanceiroSection = ({ baseData, targetQuinzena, prevStats, onDrilldown }) => {');
code = code.replace(/const RunRatePenalidadesSection = \({ baseData, targetQuinzena, prevStats }\) => {/g, 'const RunRatePenalidadesSection = ({ baseData, targetQuinzena, prevStats, onDrilldown }) => {');

// 3. Change onClick in both components to use onDrilldown instead of setSelectedOfensorFilial
code = code.replace(/onClick=\{\(\) => setSelectedOfensorFilial\(filial\.filial\)\}/g, 'onClick={() => onDrilldown && onDrilldown(filial.filial)}');

// 4. Update DetalheFinanceiroSection
code = code.replace(/const DetalheFinanceiroSection = \({ dadosFiltrados, onExport, isExporting }\) => {/, 'const DetalheFinanceiroSection = ({ dadosFiltrados, onExport, isExporting, initialFilial }) => {');
code = code.replace(/const \[selectedFilial, setSelectedFilial\] = useState\(null\);/, 'const [selectedFilial, setSelectedFilial] = useState(initialFilial || null);\n  React.useEffect(() => { if (initialFilial) setSelectedFilial(initialFilial); }, [initialFilial]);');

// 5. Add state to App component
code = code.replace(/export default function App\(\) {/, "export default function App() {\n  const [drilldownFilial, setDrilldownFilial] = useState(null);");

// 6. Update usage of DetalheFinanceiroSection
code = code.replace(/<DetalheFinanceiroSection dadosFiltrados=\{dadosFiltrados\} onExport=\{\(options\) => handleDownloadExcel\('penalidades', options\)\} isExporting=\{exportingType === 'excel-penalidades'\} \/>/, `<DetalheFinanceiroSection dadosFiltrados={dadosFiltrados} onExport={(options) => handleDownloadExcel('penalidades', options)} isExporting={exportingType === 'excel-penalidades'} initialFilial={drilldownFilial} />`);

// 7. Pass onDrilldown to RunRateFinanceiroSection and RunRatePenalidadesSection in App
code = code.replace(/<RunRateFinanceiroSection baseData=\{baseRunRateData\} targetQuinzena=\{targetQuinzenaRunRate\} prevStats=\{prevQuinzenaStats\} \/>/, `<RunRateFinanceiroSection baseData={baseRunRateData} targetQuinzena={targetQuinzenaRunRate} prevStats={prevQuinzenaStats} onDrilldown={(f) => { setDrilldownFilial(f); setActiveMenu('detalhe_financeiro'); window.scrollTo(0,0); }} />`);
code = code.replace(/<RunRatePenalidadesSection baseData=\{baseRunRateData\} targetQuinzena=\{targetQuinzenaRunRate\} prevStats=\{prevQuinzenaStats\} \/>/, `<RunRatePenalidadesSection baseData={baseRunRateData} targetQuinzena={targetQuinzenaRunRate} prevStats={prevQuinzenaStats} onDrilldown={(f) => { setDrilldownFilial(f); setActiveMenu('detalhe_financeiro'); window.scrollTo(0,0); }} />`);


fs.writeFileSync('src/App.jsx', code, 'utf8');
console.log('App.jsx updated for drilldown to aba de penalidades detalhadas');
