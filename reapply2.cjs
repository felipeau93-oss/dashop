const fs = require('fs');

let code = fs.readFileSync('src/PainelDisponibilidade.jsx', 'utf8');

const oldSearch = `<div className="relative w-full xl:w-80">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Search className="h-4 w-4 text-slate-500" /></div>
                    <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="block w-full pl-10 pr-3 py-2.5 border border-slate-700 rounded-xl leading-5 bg-[#13131a] placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium text-white shadow-inner" placeholder="Buscar placa, filial, regional..." />
                  </div>`;
const newSearch = `<div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <div className="relative w-full xl:w-80">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Search className="h-4 w-4 text-slate-500" /></div>
                    <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="block w-full pl-10 pr-3 py-2.5 border border-slate-700 rounded-xl leading-5 bg-[#1e1e24] placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium text-white shadow-inner transition-colors" placeholder="Buscar placa, filial, regional..." />
                  </div>
                  <button
                    onClick={() => setShowOnlyDivergent(!showOnlyDivergent)}
                    className={\`px-4 py-2.5 rounded-xl font-bold text-sm transition-colors border flex items-center justify-center gap-2 \${showOnlyDivergent ? 'bg-red-900/40 border-red-500 text-red-400' : 'bg-[#1e1e24] border-slate-700 text-slate-400 hover:text-slate-300'}\`}
                  >
                    <AlertTriangle className="w-4 h-4" /> Somente Divergentes
                  </button>
                </div>`;

code = code.replace(oldSearch, newSearch);

// Also replace the Legend bg-[#13131a] with bg-[#1e1e24]
code = code.replace('bg-[#13131a] px-4 py-2.5 rounded-xl border border-slate-800', 'bg-[#1e1e24] px-4 py-2.5 rounded-xl border border-slate-800');

fs.writeFileSync('src/PainelDisponibilidade.jsx', code);
console.log('Search patch completed');
