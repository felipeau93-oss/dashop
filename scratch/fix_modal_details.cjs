const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');

// Replace the Qtd Chart with a Table when motorista is selected.
// We will replace the whole div block.
const blockToReplace = `<div className="bg-slate-800/50 p-5 rounded-2xl border border-slate-700 shadow-sm flex flex-col relative">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Evoluǜo Operacional (Qtd Pacotes)</h4>
              {chartDataQtd.length === 0 ? (
                <div className="h-[200px] flex items-center justify-center text-slate-500 text-xs">Sem dados.</div>
              ) : (
                <div className="w-full h-[200px] flex flex-col relative pt-6">
                  <NativeComboChart data={chartDataQtd} labelKey="quinzena" dsKey="saldo" showFaturamento={false} heightClass="h-full" />
                </div>
              )}
            </div>`;

// Wait, the encoding issue: let's use a regex instead of string matching because of the encoding character.
code = code.replace(
  /<div className="bg-slate-800\/50 p-5 rounded-2xl border border-slate-700 shadow-sm flex flex-col relative">[\s\S]*?<h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Evolu.*?o Operacional \(Qtd Pacotes\)<\/h4>[\s\S]*?\{chartDataQtd\.length === 0 \? \([\s\S]*?<div className="h-\[200px\] flex items-center justify-center text-slate-500 text-xs">Sem dados\.<\/div>[\s\S]*?\) : \([\s\S]*?<div className="w-full h-\[200px\] flex flex-col relative pt-6">[\s\S]*?<NativeComboChart data=\{chartDataQtd\} labelKey="quinzena" dsKey="saldo" showFaturamento=\{false\} heightClass="h-full" \/>[\s\S]*?<\/div>[\s\S]*?\) ?\}[\s\S]*?<\/div>/,
  `{selectedMotorista ? (
              <div className="bg-slate-800/50 p-5 rounded-2xl border border-slate-700 shadow-sm flex flex-col relative flex-1 min-h-[300px] overflow-hidden">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">Detalhamento de Pacotes: <span className="text-orange-400">{selectedMotorista}</span></h4>
                  <button onClick={() => setSelectedMotorista(null)} className="text-xs font-bold bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"><ArrowUp className="w-3 h-3 -rotate-90" /> Voltar para Visão Geral</button>
                </div>
                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                  <table className="w-full text-left text-xs">
                    <thead className="sticky top-0 bg-slate-800/90 text-slate-400 uppercase tracking-wider z-10 backdrop-blur-sm">
                      <tr>
                        <th className="p-3 border-b border-slate-700 font-bold">Quinzena</th>
                        <th className="p-3 border-b border-slate-700 font-bold">Tipo Infração</th>
                        <th className="p-3 border-b border-slate-700 font-bold text-right">Valor</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50">
                      {casosFilial.filter(c => c.motorista === selectedMotorista).map((c, i) => (
                        <tr key={i} className="hover:bg-slate-700/30 transition-colors">
                          <td className="p-3 font-medium text-slate-300">{c.quinzena}</td>
                          <td className="p-3 text-slate-400">{c.tipo}</td>
                          <td className="p-3 text-right font-bold text-red-400">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(c.valor || 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="bg-slate-800/50 p-5 rounded-2xl border border-slate-700 shadow-sm flex flex-col relative">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Evolução Operacional (Qtd Pacotes)</h4>
                {chartDataQtd.length === 0 ? (
                  <div className="h-[200px] flex items-center justify-center text-slate-500 text-xs">Sem dados.</div>
                ) : (
                  <div className="w-full h-[200px] flex flex-col relative pt-6">
                    <NativeComboChart data={chartDataQtd} labelKey="quinzena" dsKey="saldo" showFaturamento={false} heightClass="h-full" />
                  </div>
                )}
              </div>
            )}`
);

// We need to remove the "Ir para Detalhamento" button, as the user requested:
// "Não precisa mais direcionar para a guia de detalhamento."
// So let's find the button and remove it.
code = code.replace(
  /<button onClick=\{\(\) => onNavigateToDetalhes && onNavigateToDetalhes\(selectedMotorista\)\} className="px-4 py-2\.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold shadow-lg transition-colors flex items-center gap-2">[\s\S]*?<ExternalLink className="w-4 h-4" \/>[\s\S]*?<span className="hidden sm:inline">Ir para Detalhamento<\/span>[\s\S]*?<span className="sm:hidden">Detalhes<\/span>[\s\S]*?<\/button>/,
  ''
);

fs.writeFileSync('src/App.jsx', code, 'utf8');
console.log('App.jsx modal fixed successfully!');
