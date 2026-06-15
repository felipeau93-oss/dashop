const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');

// Replace the 'evolutivo' export logic
code = code.replace(
  /if \(type === 'evolutivo'\) \{[\s\S]*?return;\n          \}/,
  `if (type === 'evolutivo') {
            const isEvent = options && (options.nativeEvent || options._reactName);
            const { filial } = isEvent ? {} : (options || {});
            let exportData = options.data || [];
            
            // To make it exactly like "detalhamento", we create cases, motoristas and filiais aggregations
            // Actually, we just need to dump the cases with detailed info.
            const casosDetalhe = exportData.map(d => ({
              "Filial": d.filial || options.filial,
              "Regional": d.regional || 'N/A',
              "Supervisor": d.supervisor || 'N/A',
              "Quinzena": d.quinzena || 'N/A',
              "Motorista": d.motorista || 'N/A',
              "Tipo Penalidade": d.tipo || 'N/A',
              "ID (Pacote/Rota)": d.tipo === 'Not Visited' ? (d.id_rota || '-') : (d.id_pacote || '-'),
              "Valor (R$)": d.valor || 0,
              "Quantidade": 1
            })).sort((a, b) => b["Valor (R$)"] - a["Valor (R$)"]);

            // If the user wants Motoristas as well, let's group it just like penalidades!
            const motoristasMap = {};
            exportData.forEach(d => {
              const mKey = d.motorista || 'N/A';
              if (!motoristasMap[mKey]) motoristasMap[mKey] = { "Motorista": mKey, "Total (R$)": 0, "Pacotes Perdidos": 0, "Lost (R$)": 0, "Not Visited": 0, "NV (R$)": 0 };
              motoristasMap[mKey]["Total (R$)"] += (d.valor || 0);
              if (d.tipo === 'Lost Packages') { motoristasMap[mKey]["Lost (R$)"] += (d.valor || 0); motoristasMap[mKey]["Pacotes Perdidos"] += 1; }
              else if (d.tipo === 'Not Visited') { motoristasMap[mKey]["NV (R$)"] += (d.valor || 0); motoristasMap[mKey]["Not Visited"] += 1; }
            });
            const motoristasData = Object.values(motoristasMap).sort((a, b) => b["Total (R$)"] - a["Total (R$)"]);

            if (motoristasData.length > 0) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(motoristasData), "Por Motorista");
            if (casosDetalhe.length > 0) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(casosDetalhe), "Casos Detalhados");

            if (casosDetalhe.length === 0 && motoristasData.length === 0) {
              const ws = XLSX.utils.json_to_sheet([{ Mensagem: "Nenhum caso encontrado para exportação" }]);
              XLSX.utils.book_append_sheet(wb, ws, "Vazio");
            }

            XLSX.writeFile(wb, \`Evolutivo_\${options.filial}.xlsx\`);
            setExportingType(null);
            return;
          }`
);

// We should also filter cases when exporting if a motorista is selected!
// The user says "preciso que ele traga no detalhe... não ta mostrando os casos do motorista no detalhe igual eu pedi".
// Wait, the "Excel" button in the modal currently exports ALL `casosFilial`. 
// If a motorista is selected, should it ONLY export for that motorista? Probably yes!
code = code.replace(
  /<button onClick=\{\(\) => onExportExcel && onExportExcel\(casosFilial\)\} className="px-3 py-2\.5 bg-slate-800 hover:bg-emerald-900 border border-slate-700 hover:border-emerald-700 text-slate-300 hover:text-emerald-400 rounded-xl transition-colors shadow-lg flex items-center gap-2" title="Gerar Planilha desta Vis.*o">/,
  `<button onClick={() => onExportExcel && onExportExcel(selectedMotorista ? casosFilial.filter(c => c.motorista === selectedMotorista) : casosFilial)} className="px-3 py-2.5 bg-slate-800 hover:bg-emerald-900 border border-slate-700 hover:border-emerald-700 text-slate-300 hover:text-emerald-400 rounded-xl transition-colors shadow-lg flex items-center gap-2" title="Gerar Planilha desta Visão">`
);


fs.writeFileSync('src/App.jsx', code, 'utf8');
console.log('App.jsx fixed excel evolutivo logic!');
