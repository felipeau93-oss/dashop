const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');

// 1. Add isOpMode in App component
code = code.replace(
  /export default function App\(\) \{/,
  `export default function App() {\n  const isOpMode = new URLSearchParams(window.location.search).get('view') === 'operacao';`
);

// 2. Adjust activeMenu initial state
code = code.replace(
  /const \[activeMenu, setActiveMenu\] = useState\('gestao_financeira'\);/,
  `const [activeMenu, setActiveMenu] = useState(isOpMode ? 'gestao_penalidades' : 'gestao_financeira');`
);

// 3. Hide Financeiro and Planejamento blocks in sidebar
// We need to wrap them in {!isOpMode && (...)}
// Find the div with Gestão Financeira
code = code.replace(
  /<div onClick=\{\(e\) => toggleExpandedMenu\('financeiro', e\)\} className="p-1 hover:bg-slate-700 rounded-md transition-colors text-slate-500 hover:text-slate-300">[\s\S]*?<div className={`overflow-hidden transition-all duration-300 \$\{expandedMenus\['financeiro'\] \? 'max-h-96' : 'max-h-0'\}`}>[\s\S]*?<\/div>\s*<\/div>/,
  match => `{!isOpMode && (\n${match}\n)}`
);

// Find the div with Planejamento
code = code.replace(
  /<div onClick=\{\(e\) => toggleExpandedMenu\('planejamento', e\)\} className="p-1 hover:bg-slate-700 rounded-md transition-colors text-slate-500 hover:text-slate-300">[\s\S]*?<div className={`overflow-hidden transition-all duration-300 \$\{expandedMenus\['planejamento'\] \? 'max-h-96' : 'max-h-0'\}`}>[\s\S]*?<\/div>\s*<\/div>/,
  match => `{!isOpMode && (\n${match}\n)}`
);

// 4. In FilialPenalidadesModal component signature, add isOpMode
code = code.replace(
  /const FilialPenalidadesModal = \(\{ filial, targetQuinzena, dadosPlanilha, faturamentoPlanilha, onClose, onNavigateToDetalhes, onExportExcel \}\) => \{/,
  `const FilialPenalidadesModal = ({ filial, targetQuinzena, dadosPlanilha, faturamentoPlanilha, onClose, onNavigateToDetalhes, onExportExcel, isOpMode }) => {`
);

// 5. In App component rendering FilialPenalidadesModal, pass isOpMode={isOpMode}
code = code.replace(
  /<FilialPenalidadesModal\s*filial=\{modalEvolutivoFilial\}/,
  `<FilialPenalidadesModal \n            isOpMode={isOpMode}\n            filial={modalEvolutivoFilial}`
);

// 6. Inside FilialPenalidadesModal, hide the Evolução por Valor (R$) chart
code = code.replace(
  /<div className="bg-slate-800\/50 p-5 rounded-2xl border border-slate-700 shadow-sm flex flex-col relative">[\s\S]*?<h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Evolução por Valor \(R\$\)<\/h4>[\s\S]*?<\/div>\s*<\/div>/,
  match => `{!isOpMode && (\n${match}\n)}`
);

// 7. Inside FilialPenalidadesModal, Motoristas table, hide Valor (R$) column and cells
// The table is an iterated flex div:
// <div className="font-black text-red-400 text-sm">{formatCurrency(m.valor)}</div>
// We can wrap the {formatCurrency(m.valor)} in {!isOpMode && ...}
code = code.replace(
  /<div className="font-black text-red-400 text-sm">\{formatCurrency\(m\.valor\)\}<\/div>/,
  `{!isOpMode && <div className="font-black text-red-400 text-sm">{formatCurrency(m.valor)}</div>}`
);

// 8. In FilialPenalidadesModal detailed packages table (when selectedMotorista is set)
// Replace <th className="p-3 border-b border-slate-700 font-bold text-right">Valor</th>
code = code.replace(
  /<th className="p-3 border-b border-slate-700 font-bold text-right">Valor<\/th>/,
  `{!isOpMode && <th className="p-3 border-b border-slate-700 font-bold text-right">Valor</th>}`
);
// Replace <td className="p-3 text-right font-bold text-red-400">{new Intl.NumberFormat...}</td>
code = code.replace(
  /<td className="p-3 text-right font-bold text-red-400">\{new Intl\.NumberFormat\('pt-BR', \{ style: 'currency', currency: 'BRL' \}\)\.format\(c\.valor \|\| 0\)\}<\/td>/,
  `{!isOpMode && <td className="p-3 text-right font-bold text-red-400">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(c.valor || 0)}</td>}`
);

// 9. Excel export
// Replace handleDownloadExcel's mapping to respect options.isOpMode
code = code.replace(
  /const casosDetalhe = exportData\.map\(d => \(\{[\s\S]*?\}\)\)/,
  `const casosDetalhe = exportData.map(d => {
            const res = {
              "Filial": d.filial || options.filial,
              "Regional": d.regional || 'N/A',
              "Supervisor": d.supervisor || 'N/A',
              "Quinzena": d.quinzena || 'N/A',
              "Motorista": d.motorista || 'N/A',
              "Tipo Penalidade": d.tipo || 'N/A',
              "ID (Pacote/Rota)": d.tipo === 'Not Visited' ? (d.id_rota || '-') : (d.id_pacote || '-'),
              "Quantidade": 1
            };
            if (!options.isOpMode) {
              res["Valor (R$)"] = d.valor || 0;
            }
            return res;
          })`
);

code = code.replace(
  /const motoristasMap = \{\};[\s\S]*?const motoristasData = Object\.values\(motoristasMap\)\.sort\(\(a, b\) => b\["Total \(R\$\)"\] - a\["Total \(R\$\)"\]\);/,
  `const motoristasMap = {};
          exportData.forEach(d => {
            const mKey = d.motorista || 'N/A';
            if (!motoristasMap[mKey]) motoristasMap[mKey] = { "Motorista": mKey, "Pacotes Perdidos": 0, "Not Visited": 0 };
            
            if (!options.isOpMode) {
              if (motoristasMap[mKey]["Total (R$)"] === undefined) {
                motoristasMap[mKey]["Total (R$)"] = 0;
                motoristasMap[mKey]["Lost (R$)"] = 0;
                motoristasMap[mKey]["NV (R$)"] = 0;
              }
              motoristasMap[mKey]["Total (R$)"] += (d.valor || 0);
            }

            if (d.tipo === 'Lost Packages') { 
              if (!options.isOpMode) motoristasMap[mKey]["Lost (R$)"] += (d.valor || 0); 
              motoristasMap[mKey]["Pacotes Perdidos"] += 1; 
            }
            else if (d.tipo === 'Not Visited') { 
              if (!options.isOpMode) motoristasMap[mKey]["NV (R$)"] += (d.valor || 0); 
              motoristasMap[mKey]["Not Visited"] += 1; 
            }
          });
          const motoristasData = Object.values(motoristasMap).sort((a, b) => options.isOpMode ? b["Pacotes Perdidos"] - a["Pacotes Perdidos"] : b["Total (R$)"] - a["Total (R$)"]);`
);

// Update handleDownloadExcel call to pass isOpMode:
code = code.replace(
  /onExportExcel=\{\(casos\) => handleDownloadExcel\('evolutivo', \{ data: casos, filial: modalEvolutivoFilial \}\)\}/,
  `onExportExcel={(casos) => handleDownloadExcel('evolutivo', { data: casos, filial: modalEvolutivoFilial, isOpMode })}`
);


fs.writeFileSync('src/App.jsx', code, 'utf8');
console.log('Operational view implemented!');
