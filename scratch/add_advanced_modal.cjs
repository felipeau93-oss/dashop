const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');

const modalComponentCode = `
const FilialPenalidadesModal = ({ filial, targetQuinzena, dadosPlanilha, onClose }) => {
  const [selectedMotorista, setSelectedMotorista] = useState(null);

  const { chartDataValor, chartDataQtd, tableData } = useMemo(() => {
    const norm = (s) => (s || '').toLowerCase().trim();
    const fName = norm(filial);
    const mName = selectedMotorista ? norm(selectedMotorista) : null;

    const casosFilial = dadosPlanilha.filter(d => 
      norm(d.filial) === fName && 
      (d.pnr > 0 || d.lost > 0 || d.notVisited > 0 || d.penalidades > 0)
    );

    // Chart Data
    const mapEvolucao = {};
    casosFilial.forEach(c => {
      if (mName && norm(c.motorista) !== mName) return;
      const q = c.quinzena;
      if (!mapEvolucao[q]) {
        mapEvolucao[q] = { quinzena: q, valor: 0, pnrQtd: 0, lostQtd: 0, nvQtd: 0, totalQtd: 0 };
      }
      mapEvolucao[q].valor += (c.penalidades || c.valor || 0);
      mapEvolucao[q].pnrQtd += (c.pnrQtd || c.qtd || 0); // fallback qtd se disponivel
      if (c.tipo === 'PNRs') mapEvolucao[q].pnrQtd += (c.qtd || 1);
      if (c.tipo === 'Lost Packages') mapEvolucao[q].lostQtd += (c.qtd || 1);
      if (c.tipo === 'Not Visited') mapEvolucao[q].nvQtd += (c.qtd || 1);
    });

    const evolutionArray = Object.values(mapEvolucao).sort((a, b) => a.quinzena.localeCompare(b.quinzena));
    evolutionArray.forEach(e => e.totalQtd = e.pnrQtd + e.lostQtd + e.nvQtd);

    // Table Data
    const mapTable = {};
    casosFilial.filter(c => c.quinzena === targetQuinzena).forEach(c => {
      const mot = c.motorista || 'N/A';
      if (!mapTable[mot]) {
        mapTable[mot] = { motorista: mot, valor: 0, pnr: 0, lost: 0, nv: 0, qtd: 0 };
      }
      mapTable[mot].valor += (c.penalidades || c.valor || 0);
      mapTable[mot].qtd += (c.qtd || 1);
      if (c.tipo === 'PNRs') mapTable[mot].pnr += (c.valor || c.pnr || 0);
      if (c.tipo === 'Lost Packages') mapTable[mot].lost += (c.valor || c.lost || 0);
      if (c.tipo === 'Not Visited') mapTable[mot].nv += (c.valor || c.notVisited || 0);
    });

    const tableArray = Object.values(mapTable).sort((a, b) => b.valor - a.valor);

    return { chartDataValor: evolutionArray, chartDataQtd: evolutionArray, tableData: tableArray };
  }, [dadosPlanilha, filial, targetQuinzena, selectedMotorista]);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-slate-900 w-full max-w-6xl max-h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-700 zoom-in-95" onClick={e => e.stopPropagation()}>
        
        {/* HEADER */}
        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-800/80">
          <div>
            <h3 className="text-xl md:text-2xl font-bold text-white flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-red-500" /> 
              Análise Evolutiva: <span className="text-blue-400">{filial}</span>
            </h3>
            <p className="text-slate-400 text-sm mt-1">
              Visão detalhada de penalidades {selectedMotorista ? <><span className="text-orange-400 font-bold">filtrada pelo motorista: {selectedMotorista}</span> <button onClick={() => setSelectedMotorista(null)} className="text-xs ml-2 bg-slate-700 hover:bg-slate-600 px-2 py-0.5 rounded text-white transition-colors">Limpar Filtro</button></> : 'para a filial em todas as quinzenas.'}
            </p>
          </div>
          <button onClick={onClose} className="p-2.5 bg-slate-800 hover:bg-red-500/20 hover:text-red-400 rounded-full text-slate-400 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* BODY */}
        <div className="p-6 overflow-y-auto flex-1 flex flex-col xl:flex-row gap-6">
          
          {/* CHARTS COLUMN */}
          <div className="flex-1 flex flex-col gap-6">
            <div className="bg-slate-800/50 p-5 rounded-2xl border border-slate-700 shadow-sm flex flex-col relative">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Evolução por Valor (R$)</h4>
              {chartDataValor.length === 0 ? (
                <div className="h-[200px] flex items-center justify-center text-slate-500 text-xs">Sem dados.</div>
              ) : (
                <div className="h-[220px]">
                  <NativeComboChart data={chartDataValor} labelKey="quinzena" heightClass="h-[220px]" isMarginChart={true} showFaturamento={true} />
                </div>
              )}
            </div>
            
            <div className="bg-slate-800/50 p-5 rounded-2xl border border-slate-700 shadow-sm flex flex-col relative">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Evolução Operacional (Qtd Pacotes)</h4>
              {chartDataQtd.length === 0 ? (
                <div className="h-[200px] flex items-center justify-center text-slate-500 text-xs">Sem dados.</div>
              ) : (
                <div className="h-[220px] relative flex flex-col justify-end pt-4 pb-8">
                   <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-8">
                     {[4,3,2,1,0].map((step, idx) => {
                       const maxQtd = Math.max(1, ...chartDataQtd.map(d => d.totalQtd));
                       return (
                         <div key={idx} className="w-full border-t border-slate-700/50 flex items-center justify-between" style={{ height: step === 0 ? '0px' : 'auto' }}>
                           <span className="text-[10px] text-slate-500 pr-2 -translate-y-1/2 bg-transparent">{Math.round(maxQtd * (step/4))} un</span>
                         </div>
                       )
                     })}
                   </div>
                   <div className="z-10 flex w-full h-full items-end justify-around gap-1 sm:gap-2 mx-8 border-b border-slate-700">
                     {chartDataQtd.map((d, i) => {
                       const maxQtd = Math.max(1, ...chartDataQtd.map(d => d.totalQtd));
                       const pct = (d.totalQtd / maxQtd) * 100;
                       return (
                         <div key={i} className="flex-1 flex flex-col justify-end h-full group relative max-w-[40px]">
                           <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50 bg-slate-700 text-white text-[10px] p-2 rounded shadow-xl whitespace-nowrap">
                             <div className="font-bold text-blue-300 mb-1">{d.quinzena}</div>
                             <div>Total: {d.totalQtd} un</div>
                           </div>
                           <div className="w-full bg-blue-500/80 group-hover:bg-blue-400 transition-colors rounded-t-sm" style={{ height: \`\${pct}%\` }}></div>
                           <span className="absolute top-full mt-2 left-1/2 -translate-x-1/2 text-[9px] text-slate-400 font-bold">{d.quinzena}</span>
                         </div>
                       )
                     })}
                   </div>
                </div>
              )}
            </div>
          </div>

          {/* TABLE COLUMN */}
          <div className="xl:w-[450px] flex flex-col bg-slate-800/50 border border-slate-700 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-700 bg-slate-800/80">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                <span>Motoristas da Quinzena ({targetQuinzena})</span>
                <span className="text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full">{tableData.length}</span>
              </h4>
            </div>
            <div className="flex-1 overflow-y-auto p-0">
              {tableData.length === 0 ? (
                <div className="p-10 text-center text-slate-500 text-sm">Nenhum motorista com penalidade nesta quinzena específica.</div>
              ) : (
                <div className="flex flex-col">
                  {tableData.map((m, idx) => (
                    <div 
                      key={idx} 
                      onClick={() => setSelectedMotorista(m.motorista === selectedMotorista ? null : m.motorista)}
                      className={\`p-4 border-b border-slate-700/50 cursor-pointer transition-colors \${selectedMotorista === m.motorista ? 'bg-blue-500/10 border-l-4 border-l-blue-500' : 'hover:bg-slate-700/30 border-l-4 border-l-transparent'}\`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="font-bold text-slate-200 text-sm">{m.motorista}</div>
                        <div className="font-black text-red-400 text-sm">{formatCurrency(m.valor)}</div>
                      </div>
                      <div className="flex gap-3 text-[10px] font-bold text-slate-400">
                        {m.pnr > 0 && <span className="bg-slate-700/50 px-1.5 py-0.5 rounded text-blue-300">PNR: {formatCurrency(m.pnr)}</span>}
                        {m.lost > 0 && <span className="bg-slate-700/50 px-1.5 py-0.5 rounded text-orange-300">Lost: {formatCurrency(m.lost)}</span>}
                        {m.nv > 0 && <span className="bg-slate-700/50 px-1.5 py-0.5 rounded text-slate-300">NV: {formatCurrency(m.nv)}</span>}
                        <span className="ml-auto text-slate-500">{m.qtd} pct(s)</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="p-3 bg-slate-800 text-[10px] text-slate-500 text-center border-t border-slate-700 italic">
              Clique em um motorista para filtrar a evolução nos gráficos.
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
};
`;

// Insert the component before the default export
code = code.replace(/export default function App\(\) \{/, modalComponentCode + '\nexport default function App() {');

// Inject the state for modal in App
code = code.replace(
  /export default function App\(\) \{\n  const \[drilldownFilial, setDrilldownFilial\] = useState\(null\);/,
  "export default function App() {\n  const [drilldownFilial, setDrilldownFilial] = useState(null);\n  const [modalEvolutivoFilial, setModalEvolutivoFilial] = useState(null);"
);

// We need to revert the drilldown logic from the sections back to opening our new modal!
// Find the previous onDrilldown calls and change them.
// In App:
code = code.replace(
  /onDrilldown=\{\(f\) => \{ setDrilldownFilial\(f\); setActiveMenu\('detalhe_financeiro'\); window\.scrollTo\(0,0\); \}\}/g,
  `onDrilldown={(f) => { setModalEvolutivoFilial(f); }}`
);

// Render the modal inside App.
// Just before the very last closing div. Let's find a good spot.
// `return (\n    <div className="min-h-screen...`
// Wait, the end of App is near line 4300.
// We can just append it inside the return of App.
const renderModalCode = `
      {modalEvolutivoFilial && (
        <FilialPenalidadesModal 
          filial={modalEvolutivoFilial} 
          targetQuinzena={targetQuinzena} 
          dadosPlanilha={dadosPlanilha} 
          onClose={() => setModalEvolutivoFilial(null)} 
        />
      )}
    </div>
  );
}`;

code = code.replace(/    <\/div>\s*\);\s*}\s*$/, renderModalCode);

// Wait, the NativeComboChart needs 'faturamento' to work as a generic bar chart when showFaturamento=true, but we set 'valor'.
// In the modal we mapped 'valor' instead of 'faturamento'. Let's fix that.
// We used `isMarginChart=true` and `showFaturamento=true` but `isMarginChart=true` means `faturamento` is the total bar and `penalidades` is the inner bar.
// Actually, to just show a simple bar for "Valor", we can map `faturamento: e.valor, penalidades: 0`.
// Let's replace that in our code block above.
code = code.replace(/evolutionArray\.forEach\(e => e\.totalQtd = e\.pnrQtd \+ e\.lostQtd \+ e\.nvQtd\);/, `evolutionArray.forEach(e => { e.totalQtd = e.pnrQtd + e.lostQtd + e.nvQtd; e.faturamento = e.valor; e.penalidades = 0; });`);

fs.writeFileSync('src/App.jsx', code, 'utf8');
console.log('FilialPenalidadesModal added');
