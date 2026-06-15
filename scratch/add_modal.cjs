const fs = require('fs');

let code = fs.readFileSync('src/App.jsx', 'utf8');

const stateCode = `  const [selectedOfensorFilial, setSelectedOfensorFilial] = useState(null);`;

code = code.replace(
  `const PenalidadesCockpit = ({ targetQuinzena, baseData, prevStats, isClosed }) => {`,
  `const PenalidadesCockpit = ({ targetQuinzena, baseData, prevStats, isClosed }) => {\n${stateCode}`
);

code = code.replace(
  /className="bg-slate-800\/80 border border-slate-700 p-4 rounded-xl flex flex-col hover:bg-slate-800 transition-colors shadow-sm"/g,
  `onClick={() => setSelectedOfensorFilial(filial.filial)} className="cursor-pointer bg-slate-800/80 border border-slate-700 p-4 rounded-xl flex flex-col hover:bg-slate-700 transition-colors shadow-sm"`
);

const modalCode = `
  const ofensoresModal = useMemo(() => {
    if (!selectedOfensorFilial) return [];
    const norm = (s) => (s || '').toLowerCase().trim();
    const fName = norm(selectedOfensorFilial);
    return baseData.filter(d => norm(d.filial) === fName && (d.pnr > 0 || d.lost > 0 || d.notVisited > 0))
      .sort((a, b) => b.penalidades - a.penalidades);
  }, [baseData, selectedOfensorFilial]);

  return (
    <div className="bg-white p-6 md:p-10 rounded-3xl shadow-sm border border-slate-200 mb-8 relative">
      {selectedOfensorFilial && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setSelectedOfensorFilial(null)}>
          <div className="bg-slate-900 w-full max-w-4xl max-h-[85vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-700 animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-800/50">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-3">
                  <AlertCircle className="w-6 h-6 text-red-400" /> 
                  Ofensores no Detalhe: <span className="text-blue-400">{selectedOfensorFilial}</span>
                </h3>
                <p className="text-slate-400 text-sm mt-1">Detalhamento dos motoristas e pacotes que impactaram a margem da filial.</p>
              </div>
              <button onClick={() => setSelectedOfensorFilial(null)} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-0 overflow-y-auto flex-1">
              {ofensoresModal.length === 0 ? (
                <div className="p-12 text-center text-slate-500 font-medium">Nenhum ofensor encontrado para esta filial nesta quinzena.</div>
              ) : (
                <table className="w-full text-left border-collapse min-w-[600px] text-xs">
                  <thead className="bg-slate-800/80 sticky top-0 z-10">
                    <tr className="text-[10px] uppercase tracking-wider text-slate-400">
                      <th className="py-3 px-4 font-bold border-b border-slate-700">Motorista</th>
                      <th className="py-3 px-4 font-bold border-b border-slate-700">Tipo</th>
                      <th className="py-3 px-4 font-bold border-b border-slate-700 text-right">Valor PNR (R$)</th>
                      <th className="py-3 px-4 font-bold border-b border-slate-700 text-right">Valor Lost (R$)</th>
                      <th className="py-3 px-4 font-bold border-b border-slate-700 text-right">Valor NV (R$)</th>
                      <th className="py-3 px-4 font-bold border-b border-slate-700 text-right text-red-400 bg-red-900/10">Total (R$)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {ofensoresModal.map((c, i) => (
                      <tr key={i} className="hover:bg-slate-800/50 transition-colors">
                        <td className="py-3 px-4 text-slate-300 font-medium">{c.motorista || 'N/A'}</td>
                        <td className="py-3 px-4 text-slate-400 font-semibold">{c.tipo || '-'}</td>
                        <td className="py-3 px-4 text-right text-slate-400">{c.pnr > 0 ? formatCurrency(c.pnr) : '-'}</td>
                        <td className="py-3 px-4 text-right text-slate-400">{c.lost > 0 ? formatCurrency(c.lost) : '-'}</td>
                        <td className="py-3 px-4 text-right text-slate-400">{c.notVisited > 0 ? formatCurrency(c.notVisited) : '-'}</td>
                        <td className="py-3 px-4 text-right font-bold text-red-400 bg-red-900/10">{formatCurrency(c.penalidades)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            
            <div className="p-4 border-t border-slate-800 bg-slate-900 flex justify-end">
              <button onClick={() => setSelectedOfensorFilial(null)} className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-sm font-bold rounded-xl transition-colors shadow-sm">
                Fechar Detalhamento
              </button>
            </div>
          </div>
        </div>
      )}`;

code = code.replace(
  `  return (\n    <div className="bg-white p-6 md:p-10 rounded-3xl shadow-sm border border-slate-200 mb-8">`,
  modalCode
);

fs.writeFileSync('src/App.jsx', code, 'utf8');
console.log('App.jsx modal applied');
