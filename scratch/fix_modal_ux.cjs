const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');

// 1. Fix Voltar Behavior
// - In onReturnToModal, clear filtroQuinzenas
code = code.replace(
  /onReturnToModal=\{\(\) => \{ setActiveMenu\(returnToModalState\.menu\); setModalEvolutivoFilial\(returnToModalState\.filial\); setReturnToModalState\(null\); \}\}/,
  `onReturnToModal={() => { setActiveMenu(returnToModalState.menu); setModalEvolutivoFilial(returnToModalState.filial); setReturnToModalState(null); setFiltroQuinzenas([]); }}`
);

// - Replace the Voltar button in DetalheFinanceiroSection
code = code.replace(
  /\{\(selectedFilial \|\| selectedMotorista\) && \(!returnToModalState\) && \(<button onClick=\{handleLevelUp\} className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2\.5 rounded-xl text-sm font-bold shadow-sm">⬅ Voltar<\/button>\)\}/g,
  ''
); // remove if previously added erroneously
code = code.replace(
  /\{\(selectedFilial \|\| selectedMotorista\) && \(<button onClick=\{handleLevelUp\} className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2\.5 rounded-xl text-sm font-bold shadow-sm">⬅ Voltar<\/button>\)\}/,
  `{returnToModalState ? (<button onClick={onReturnToModal} className="bg-blue-100 hover:bg-blue-200 text-blue-700 px-4 py-2.5 rounded-xl text-sm font-bold shadow-sm">⬅ Voltar para Análise Evolutiva</button>) : (selectedFilial || selectedMotorista) ? (<button onClick={handleLevelUp} className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2.5 rounded-xl text-sm font-bold shadow-sm">⬅ Voltar</button>) : null}`
);


// 2. Fix Excel Button
// The issue is likely that XLSX.utils.json_to_sheet is failing or options.data is empty.
// Actually, `handleDownloadExcel('evolutivo')` had an issue:
// `setExportingType('excel-evolutivo')` wasn't set, because the first line of `handleDownloadExcel` is `setExportingType(\`excel-\${type}\`)`.
// Then we load script, then we create `wb`.
// Wait, the user said "O excel quando clico não baixa nada"
// Let's add console logs and make sure we use a default array if `options.data` is missing.
code = code.replace(
  /if \(type === 'evolutivo'\) \{[\s\S]*?return;\n        \}/,
  `if (type === 'evolutivo') {
          console.log('Exporting evolutivo', options);
          const exportData = (options.data || []).map(c => ({
            Filial: c.filial || options.filial,
            Regional: c.regional || 'N/A',
            Quinzena: c.quinzena || 'N/A',
            Motorista: c.motorista || 'N/A',
            'Tipo Infração': c.tipo || 'N/A',
            'Valor (R$)': c.valor || 0
          }));
          const ws = XLSX.utils.json_to_sheet(exportData);
          XLSX.utils.book_append_sheet(wb, ws, "Casos Evolutivo");
          XLSX.writeFile(wb, \`Evolutivo_\${options.filial}.xlsx\`);
          setExportingType(null);
          return;
        }`
);

// 3. Modal Updates for Selected Motorista
// Add Voltar button when motorista is selected
code = code.replace(
  /Visão detalhada de penalidades \{selectedMotorista \? <><span className="text-orange-400 font-bold">filtrada pelo motorista: \{selectedMotorista\}<\/span> <button onClick=\{\(\) => setSelectedMotorista\(null\)\} className="text-xs ml-2 bg-slate-700 hover:bg-slate-600 px-2 py-0\.5 rounded text-white transition-colors">Limpar Filtro<\/button><\/> : 'para a filial em todas as quinzenas\.'\}/,
  `Visão detalhada de penalidades {selectedMotorista ? <><span className="text-orange-400 font-bold">filtrada pelo motorista: {selectedMotorista}</span> <button onClick={() => setSelectedMotorista(null)} className="text-xs ml-2 bg-slate-700 hover:bg-slate-600 px-2 py-0.5 rounded text-white transition-colors">Limpar Filtro</button></> : 'para a filial em todas as quinzenas.'}`
); // Wait, this doesn't add the big button. Let's add the big button near the chart title!

// Replace the Qtd Chart with a Table when motorista is selected.
// Look for `<h4 className="text-sm font-bold text-slate-700">Evolução Operacional (Qtd Pacotes)</h4>`
code = code.replace(
  /<div className="flex-1 min-h-\[300px\] bg-white rounded-2xl shadow-sm border border-slate-100 p-4 flex flex-col relative">[\s\S]*?<h4 className="text-sm font-bold text-slate-700">Evolução Operacional \(Qtd Pacotes\)<\/h4>[\s\S]*?<\/div>[\s\S]*?<div className="w-full h-\[320px\] flex flex-col pt-6 pb-12 relative">[\s\S]*?<NativeComboChart data=\{chartDataQtd\} labelKey="quinzena" dsKey="saldo" showFaturamento=\{false\} heightClass="h-full" \/>[\s\S]*?<\/div>[\s\S]*?<\/div>/,
  `{selectedMotorista ? (
              <div className="flex-1 min-h-[300px] max-h-[400px] bg-white rounded-2xl shadow-sm border border-slate-100 p-4 flex flex-col relative overflow-hidden">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2"><Target className="w-4 h-4 text-orange-500" /> Detalhamento de Pacotes: {selectedMotorista}</h4>
                  <button onClick={() => setSelectedMotorista(null)} className="text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"><ArrowUp className="w-3 h-3 -rotate-90" /> Voltar para Visão Geral</button>
                </div>
                <div className="flex-1 overflow-y-auto pr-2">
                  <table className="w-full text-left text-[11px] md:text-xs">
                    <thead className="sticky top-0 bg-slate-100 text-slate-500 uppercase tracking-wider">
                      <tr>
                        <th className="p-2 md:p-3 rounded-tl-lg">Quinzena</th>
                        <th className="p-2 md:p-3">Tipo Infração</th>
                        <th className="p-2 md:p-3 rounded-tr-lg text-right">Valor</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {casosFilial.filter(c => c.motorista === selectedMotorista).map((c, i) => (
                        <tr key={i} className="hover:bg-slate-50 transition-colors">
                          <td className="p-2 md:p-3 font-medium text-slate-700">{c.quinzena}</td>
                          <td className="p-2 md:p-3 text-slate-600">{c.tipo}</td>
                          <td className="p-2 md:p-3 text-right font-bold text-red-500">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(c.valor || 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="flex-1 min-h-[300px] bg-white rounded-2xl shadow-sm border border-slate-100 p-4 flex flex-col relative">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-sm font-bold text-slate-700">Evolução Operacional (Qtd Pacotes)</h4>
                </div>
                <div className="w-full h-[320px] flex flex-col pt-6 pb-12 relative">
                  <NativeComboChart data={chartDataQtd} labelKey="quinzena" dsKey="saldo" showFaturamento={false} heightClass="h-full" />
                </div>
              </div>
            )}`
);

// 4. Combine Valores e Quantidade no Gráfico de Evolução (Top chart)
// Update NativeComboChart to show DS line if dsKey is provided!
// chartDataValor has `totalQtd`. We will pass `dsKey="totalQtd"` and `showDSLine={true}` to NativeComboChart.
// Let's modify chartDataValor rendering in FilialPenalidadesModal
code = code.replace(
  /<NativeComboChart data=\{chartDataValor\} labelKey="quinzena" showFaturamento=\{false\} heightClass="h-full" \/>/,
  `<NativeComboChart data={chartDataValor} labelKey="quinzena" dsKey="totalQtd" showDSLine={true} showFaturamento={false} heightClass="h-full" />`
);

// Ensure NativeComboChart supports `showDSLine` with an absolute max, or we need to pass a normalized DS!
// NativeComboChart renders the line by taking `d[dsKey]`. The line's Y scale is 0 to 100.
// So if `totalQtd` is 500, it will overflow the SVG!
// We need to normalize `totalQtd` inside `chartDataValor`!
// Let's modify `useMemo` in FilialPenalidadesModal to add `qtdNormalizada`!
code = code.replace(
  /return \{ chartDataValor: arrValor, chartDataQtd: arrQtd, tableData: motoristasArr \};/,
  `// Normalize totalQtd to 0-100 for the line chart
    const maxQtd = Math.max(...arrValor.map(d => d.totalQtd || 0), 1);
    const arrValorWithNorm = arrValor.map(d => ({ ...d, qtdNormalizada: ((d.totalQtd || 0) / maxQtd) * 100 }));
    
    return { chartDataValor: arrValorWithNorm, chartDataQtd: arrQtd, tableData: motoristasArr };`
);
code = code.replace(
  /<NativeComboChart data=\{chartDataValor\} labelKey="quinzena" dsKey="totalQtd" showDSLine=\{true\} showFaturamento=\{false\} heightClass="h-full" \/>/,
  `<NativeComboChart data={chartDataValor} labelKey="quinzena" dsKey="qtdNormalizada" showDSLine={true} dsLabel="Quantidade" showFaturamento={false} heightClass="h-full" tooltipRender={(d) => (\`\${d.totalQtd} pacotes\`)} />`
);

// Update NativeComboChart to support `tooltipRender` and `dsLabel` if passed
code = code.replace(
  /const NativeComboChart = \(\{ data, labelKey = 'name', dsKey = 'ds', isProj = false, onBarClick, showFaturamento = true, heightClass = 'h-\[300px\]' \}\) => \{/,
  `const NativeComboChart = ({ data, labelKey = 'name', dsKey = 'ds', isProj = false, onBarClick, showFaturamento = true, heightClass = 'h-[300px]', showDSLine = false, dsLabel = 'SLA', tooltipRender }) => {`
);
code = code.replace(
  /\{isProj && dsValue !== undefined && \(/g,
  `{(isProj || showDSLine) && dsValue !== undefined && (`
);
// In the NativeComboChart tooltip:
code = code.replace(
  /<div className="flex items-center justify-between gap-4 text-xs font-bold">[\s\S]*?<span className="text-slate-500">\{isProj \? 'SLA DS' : 'Margem'\}<\/span>[\s\S]*?<span className="text-orange-600">\{hoveredData\[dsKey\]\?.toFixed\(1\)\}%\<\/span>[\s\S]*?<\/div>/,
  `<div className="flex items-center justify-between gap-4 text-xs font-bold">
                    <span className="text-slate-500">{isProj ? 'SLA DS' : (dsLabel || 'Margem')}</span>
                    <span className="text-orange-600">{tooltipRender ? tooltipRender(hoveredData) : \`\${hoveredData[dsKey]?.toFixed(1)}%\`}</span>
                  </div>`
);


fs.writeFileSync('src/App.jsx', code, 'utf8');
console.log('Modal and UX updates written to App.jsx');
