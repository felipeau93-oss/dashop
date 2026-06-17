const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');

// Regex to find the start of the grid
const gridRegex = /<div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-8">([\s\S]*?)<\/div>\s*<\/div>\s*\)\}/;

const match = code.match(gridRegex);
if (match) {
  const originalGrid = match[0];
  
  // We need to insert a second grid for the previous quinzena.
  // The first grid uses `margemBrutaMetrics` and `targetQuinzenaRunRate`.
  // The second grid should use `prevMargemBrutaMetrics` and `prevQuinzenaName`.
  
  // Wait, let's look at how the user wanted the second grid!
  // In `patch_final_new.cjs`, the replacement was:
  const replacementGrid = `
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-8">
                  <div className="bg-slate-900 p-8 md:p-10 rounded-3xl shadow-xl text-white relative overflow-hidden flex flex-col justify-between">
                    <div className="absolute -right-10 -top-10 opacity-5"><TrendingUp className="w-64 h-64" /></div>
                    <div>
                      <h2 className="text-sm md:text-base font-bold text-blue-400 mb-2 z-10 tracking-widest uppercase">Penalidades vs Faturamento</h2>
                      <div className="flex flex-col mb-8 z-10">
                        <span className="text-5xl font-black leading-tight tracking-tight text-red-400 flex items-center gap-3">
                          {formatCurrency(margemBrutaMetrics.penalidades)}
                        </span>
                        <span className="text-sm text-slate-400 mt-2 font-medium bg-slate-800 self-start px-4 py-1.5 rounded-lg border border-slate-700">Penalidades na quinzena</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-900 p-8 md:p-10 rounded-3xl shadow-xl text-white relative overflow-hidden flex flex-col justify-between">
                    <div className="absolute -right-10 -top-10 opacity-5"><TrendingUp className="w-64 h-64" /></div>
                    <div>
                      <h2 className="text-sm md:text-base font-bold text-emerald-400 mb-2 z-10 tracking-widest uppercase">Margem Operacional</h2>
                      <div className="flex flex-col mb-8 z-10">
                        <span className={\`text-5xl font-black leading-tight tracking-tight flex items-center gap-3 \${margemBrutaMetrics.margemRS >= 0 ? 'text-emerald-400' : 'text-red-400'}\`}>
                          {formatCurrency(margemBrutaMetrics.margemRS)}
                        </span>
                        <span className="text-sm text-slate-400 mt-2 font-medium bg-slate-800 self-start px-4 py-1.5 rounded-lg border border-slate-700">Margem global de {margemBrutaMetrics.margemPct.toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>
                </div>

                {prevMargemBrutaMetrics && (
                  <>
                    <h3 className="text-lg font-bold text-blue-100 mb-4 mt-8">Comparativo: Quinzena Anterior ({prevQuinzenaName})</h3>
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-8">
                      <div className="bg-slate-800/50 p-8 md:p-10 rounded-3xl shadow-xl text-slate-300 relative overflow-hidden flex flex-col justify-between border border-slate-700/50">
                        <div className="absolute -right-10 -top-10 opacity-5"><TrendingUp className="w-64 h-64" /></div>
                        <div>
                          <h2 className="text-sm md:text-base font-bold text-blue-400/70 mb-2 z-10 tracking-widest uppercase">Penalidades vs Faturamento</h2>
                          <div className="flex flex-col mb-8 z-10">
                            <span className="text-4xl font-black leading-tight tracking-tight text-red-400/70 flex items-center gap-3">
                              {formatCurrency(prevMargemBrutaMetrics.penalidades)}
                            </span>
                            <span className="text-sm text-slate-400/70 mt-2 font-medium bg-slate-800/50 self-start px-4 py-1.5 rounded-lg border border-slate-700/50">Penalidades na quinzena</span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-slate-800/50 p-8 md:p-10 rounded-3xl shadow-xl text-slate-300 relative overflow-hidden flex flex-col justify-between border border-slate-700/50">
                        <div className="absolute -right-10 -top-10 opacity-5"><TrendingUp className="w-64 h-64" /></div>
                        <div>
                          <h2 className="text-sm md:text-base font-bold text-emerald-400/70 mb-2 z-10 tracking-widest uppercase">Margem Operacional</h2>
                          <div className="flex flex-col mb-8 z-10">
                            <span className={\`text-4xl font-black leading-tight tracking-tight flex items-center gap-3 \${(prevMargemBrutaMetrics.margemRS || 0) >= 0 ? 'text-emerald-400/70' : 'text-red-400/70'}\`}>
                              {formatCurrency(prevMargemBrutaMetrics.margemRS || 0)}
                            </span>
                            <span className="text-sm text-slate-400/70 mt-2 font-medium bg-slate-800/50 self-start px-4 py-1.5 rounded-lg border border-slate-700/50">Margem global de {(prevMargemBrutaMetrics.margemPct || 0).toFixed(1)}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}
`;

  // Actually, wait! The original grid is much more complex!
  // It has a LOT of details like "Faturamento Bruto", "Impostos", "Agregados + Frota", etc.
  // My replacementGrid above is missing all those details!
}
