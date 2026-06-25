const fs = require('fs');
let c = fs.readFileSync('src/DataImporter.jsx', 'utf8');

const stts = `  const [bscFile, setBscFile] = useState(null);
  const [isProcessingBsc, setIsProcessingBsc] = useState(false);
  const [progressBsc, setProgressBsc] = useState('');
  const [quinzenaBsc, setQuinzenaBsc] = useState('');`;
const sttsNw = stts + `
  const [dispFile, setDispFile] = useState(null);
  const [isProcessingDisp, setIsProcessingDisp] = useState(false);
  const [progressDisp, setProgressDisp] = useState('');`;
c = c.replace(stts, sttsNw);

const dispLgc = fs.readFileSync('disp_logic.jsx', 'utf8');
c = c.replace('  const handleProcessBsc = () => {', dispLgc + '\n\n  const handleProcessBsc = () => {');

const tab = `              <button 
                onClick={() => setActiveStep(4)}
                className={\`px-4 py-2 font-bold whitespace-nowrap border-b-2 transition-colors flex items-center gap-2 \${activeStep === 4 ? 'border-orange-500 text-orange-400' : 'border-transparent text-slate-400 hover:text-slate-300'}\`}
              >
                <Box className="w-4 h-4" /> BSC
              </button>`;
const tabNw = tab + `
              <button 
                onClick={() => setActiveStep(8)}
                className={\`px-4 py-2 font-bold whitespace-nowrap border-b-2 transition-colors flex items-center gap-2 \${activeStep === 8 ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-300'}\`}
              >
                <Truck className="w-4 h-4" /> Disponibilidade
              </button>`;
c = c.replace(tab, tabNw);

const ui = `          {activeStep === 4 && (`
const uiNw = `          {activeStep === 8 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-white mb-1">Importar Disponibilidade de Frota</h3>
                  <p className="text-sm text-slate-400">Importe a planilha de disponibilidade para atualizar o painel Heatmap.</p>
                </div>
              </div>
              <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-700">
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="flex-1">
                    <label className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-4 py-8 rounded-xl font-bold cursor-pointer transition-colors border border-dashed border-slate-600">
                      <UploadCloud className="w-6 h-6" />
                      {dispFile ? dispFile.name : 'Selecionar Arquivo (CSV/XLSX)'}
                      <input
                        type="file"
                        accept=".csv, .xlsx, .xls"
                        className="hidden"
                        onChange={(e) => setDispFile(e.target.files[0])}
                      />
                    </label>
                  </div>
                </div>

                <div className="mt-6">
                  <button 
                    onClick={handleProcessDispFile}
                    disabled={!dispFile || isProcessingDisp}
                    className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white px-6 py-4 rounded-xl font-bold transition-colors"
                  >
                    {isProcessingDisp ? (
                      <><Loader2 className="w-5 h-5 animate-spin" /> {progressDisp || 'Processando...'}</>
                    ) : (
                      <><Database className="w-5 h-5" /> Processar e Salvar no Supabase</>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
` + ui;
c = c.replace(ui, uiNw);

fs.writeFileSync('src/DataImporter.jsx', c);
console.log('PATCH APPLIED');
