const fs = require('fs');

let code = fs.readFileSync('src/DataImporter.jsx', 'utf8');

// 1. Imports
if (!code.includes('Truck')) {
  code = code.replace("Copy } from 'lucide-react';", "Copy, Truck } from 'lucide-react';");
}

// 2. Utils
const utils = `
const ANO_REFERENCIA = 2026;

const getInicioDaSemana = (dataString) => {
  const [dia, mes] = dataString.split('/');
  const data = new Date(ANO_REFERENCIA, parseInt(mes) - 1, parseInt(dia));
  const diaDaSemana = data.getDay(); 
  const domingo = new Date(data);
  domingo.setDate(data.getDate() - diaDaSemana);
  return \`\${domingo.getDate().toString().padStart(2, '0')}/\${(domingo.getMonth() + 1).toString().padStart(2, '0')}\`;
};
`;
if (!code.includes('ANO_REFERENCIA')) {
  code = code.replace("import { supabase } from './supabase';", "import { supabase } from './supabase';\n" + utils);
}

// 3. States
const states = `
  const [dispFile, setDispFile] = useState(null);
  const [isProcessingDisp, setIsProcessingDisp] = useState(false);
  const [progressDisp, setProgressDisp] = useState('');
`;
if (!code.includes('setDispFile')) {
  code = code.replace("  const [bscFile, setBscFile] = useState(null);\n", states + "\n  const [bscFile, setBscFile] = useState(null);\n");
}

// 4. useEffect
code = code.replace("    if (activeStep === 5) {\n      fetchHistorico();\n    } else if (activeStep === 6) {\n      loadPendentes();\n    }", "    if (activeStep === 6) {\n      fetchHistorico();\n    } else if (activeStep === 7) {\n      loadPendentes();\n    }");
code = code.replace("    if (activeStep === 5) {\r\n      fetchHistorico();\r\n    } else if (activeStep === 6) {\r\n      loadPendentes();\r\n    }", "    if (activeStep === 6) {\n      fetchHistorico();\n    } else if (activeStep === 7) {\n      loadPendentes();\n    }");

// 5. Tabs
const oldTabs = `<button
            onClick={() => setActiveStep(5)}
            className={\`px-4 py-2 font-bold whitespace-nowrap border-b-2 transition-colors \${activeStep === 5 ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-300'}\`}
          >
            Histórico
          </button>
          <button
            onClick={() => setActiveStep(6)}
            className={\`px-4 py-2 font-bold whitespace-nowrap border-b-2 transition-colors flex items-center gap-2 \${activeStep === 6 ? 'border-red-500 text-red-400' : 'border-transparent text-slate-400 hover:text-slate-300'}\`}
          >
            <AlertTriangle className="w-4 h-4" /> Rotas Pendentes
          </button>`;
const newTabs = `<button onClick={() => setActiveStep(5)} className={\`px-4 py-2 text-sm font-bold rounded-xl \${activeStep === 5 ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'}\`}>5. Disponibilidade</button>
          <div className="flex-1"></div>
          <div className="flex items-center gap-1 border-b-2 border-slate-700/50">
            <button
              onClick={() => setActiveStep(6)}
              className={\`px-4 py-2 font-bold whitespace-nowrap border-b-2 transition-colors \${activeStep === 6 ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-300'}\`}
            >
              Histórico
            </button>
            <button
              onClick={() => setActiveStep(7)}
              className={\`px-4 py-2 font-bold whitespace-nowrap border-b-2 transition-colors flex items-center gap-2 \${activeStep === 7 ? 'border-red-500 text-red-400' : 'border-transparent text-slate-400 hover:text-slate-300'}\`}
            >
              <AlertTriangle className="w-4 h-4" /> Rotas Pendentes
            </button>
          </div>`;

// Use regex to replace the tabs robustly since whitespace might vary
code = code.replace(/<button[^>]*onClick=\{\(\) => setActiveStep\(5\)\}[^>]*>[\s\S]*?Histórico[\s\S]*?<\/button>[\s\S]*?<button[^>]*onClick=\{\(\) => setActiveStep\(6\)\}[^>]*>[\s\S]*?<AlertTriangle[^>]*\/>[\s\S]*?Rotas Pendentes[\s\S]*?<\/button>/, newTabs);


// 6. activeStep 5, 6, 7 panels
// rename old 5 and 6
code = code.replace("{activeStep === 5 && (", "{activeStep === 6 && (");
// Wait, the next one would also be replaced. Better do it via regex.
code = code.replace(/\{activeStep === 6 && \(\s*<div className="space-y-4 animate-in fade-in duration-300">[\s\S]*?Rotas Pendentes/g, '{activeStep === 7 && (\n            <div className="space-y-4 animate-in fade-in duration-300">\n              <div className="flex items-center justify-between">\n                <h2 className="text-2xl font-black text-white flex items-center gap-3"><AlertTriangle className="w-6 h-6 text-red-500" /> Rotas Pendentes');

const panelUI = `
          {activeStep === 5 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-black text-white flex items-center gap-3"><Truck className="w-6 h-6 text-indigo-400" /> Disponibilidade</h2>
              </div>
              
              <div className="bg-slate-900/50 p-5 rounded-2xl border border-slate-700/50 space-y-4">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-bold text-slate-400">Planilha de Frota (CSV / XLSX)</label>
                  <label className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-4 rounded-xl cursor-pointer transition-colors border border-slate-700 border-dashed">
                    <UploadCloud className="w-5 h-5 text-indigo-500" />
                    <span>{dispFile ? dispFile.name : "Clique para anexar ou arraste a planilha..."}</span>
                    <input type="file" accept=".csv, .xlsx" onChange={e => setDispFile(e.target.files[0])} className="hidden" />
                  </label>
                </div>

                <div className="pt-2">
                  <button 
                    onClick={handleProcessDispFile}
                    disabled={isProcessingDisp || !dispFile}
                    className="flex w-full items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-xl font-bold shadow-md transition-all disabled:opacity-50"
                  >
                    {isProcessingDisp ? (
                      <><Loader2 className="w-5 h-5 animate-spin" /> {progressDisp || 'Processando...'}</>
                    ) : (
                      <><FileSpreadsheet className="w-5 h-5" /> Iniciar Processamento</>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
`;
if (!code.includes('{activeStep === 5 && (')) {
  code = code.replace("{activeStep === 6 && (", panelUI + "\n          {activeStep === 6 && (");
}

// 7. handleProcessDispFile
const processFunc = `
  const handleProcessDispFile = () => {
    if (!dispFile) return;
    setIsProcessingDisp(true);
    setProgressDisp('Lendo arquivo...');
    addLog(\`Iniciando processamento da planilha de disponibilidade: \${dispFile.name}\`, 'info');

    const processData = async (dataArray) => {
        try {
          let headerRowIdx = -1;
          for (let i = 0; i < Math.min(15, dataArray.length); i++) {
            if (dataArray[i] && dataArray[i].some(c => String(c).toUpperCase() === 'PLACA' || String(c).toUpperCase() === 'MODAL')) {
              headerRowIdx = i; break;
            }
          }

          if (headerRowIdx === -1) {
            addLog("Cabeçalho não encontrado na planilha de disponibilidade.", 'error');
            setIsProcessingDisp(false);
            return;
          }

          const rawHeaders = dataArray[headerRowIdx].map(h => String(h || '').trim());
          const dates = rawHeaders.filter(h => h.includes('/') && h.length <= 5);

          const wMap = new Map();
          dates.forEach(d => {
            const weekStart = getInicioDaSemana(d);
            if (!wMap.has(weekStart)) wMap.set(weekStart, []);
            wMap.get(weekStart).push(d);
          });
          const weeksArray = Array.from(wMap.entries()).map(([inicio, dias]) => ({ inicio, dias }));

          const idxPlaca = rawHeaders.findIndex(h => h.toUpperCase() === 'PLACA');
          const idxModal = rawHeaders.findIndex(h => h.toUpperCase() === 'MODAL');
          const idxXPT = rawHeaders.findIndex(h => h.toUpperCase() === 'XPT' || h.toUpperCase() === 'FILIAL');

          const parsed = [];

          for (let i = headerRowIdx + 1; i < dataArray.length; i++) {
            const row = dataArray[i];
            if (!row || row.length === 0) continue;
            const placa = row[idxPlaca] ? String(row[idxPlaca]).trim() : '';
            if (!placa) continue;

            const modal = row[idxModal] ? String(row[idxModal]).trim() : 'N/A';
            const filial = row[idxXPT] ? String(row[idxXPT]).trim() : 'N/A';

            let ociosoConsecutivo = 0;
            const timeline = dates.map(date => {
              const colIdx = rawHeaders.indexOf(date);
              const valor = String(row[colIdx] || '').trim();
              const rodou = valor !== '' && valor.toUpperCase() !== '-NÃO INFORMADO-' && valor.toUpperCase() !== '-NAO INFORMADO-' && valor !== '0';
              
              if (!rodou) ociosoConsecutivo++; else ociosoConsecutivo = 0;

              return { data: date, rodou, ociosoConsecutivo, valorOriginal: valor };
            });

            const metasSemana = weeksArray.map(w => {
              let diasRodados = 0;
              w.dias.forEach(d => {
                const info = timeline.find(t => t.data === d);
                if (info && info.rodou) diasRodados++;
              });
              return { semanaInicio: w.inicio, diasRodados, totalDiasAmostra: w.dias.length, bateuMeta: diasRodados >= 6 };
            });

            parsed.push({ placa, modal, filial, timeline, metasSemana, diasParadoAtual: timeline[timeline.length - 1]?.ociosoConsecutivo || 0, bateuTodasMetas: metasSemana.every(m => m.bateuMeta) });
          }

          const monthFromHeader = dates[dates.length - 1] ? dates[dates.length - 1].split('/')[1] : '01';
          const monthNames = {
            '01': 'Janeiro', '02': 'Fevereiro', '03': 'Março', '04': 'Abril',
            '05': 'Maio', '06': 'Junho', '07': 'Julho', '08': 'Agosto',
            '09': 'Setembro', '10': 'Outubro', '11': 'Novembro', '12': 'Dezembro'
          };
          const refName = monthNames[monthFromHeader] || \`Mes_\${monthFromHeader}\`;
          
          setProgressDisp(\`Buscando dados de \${refName}...\`);
          addLog(\`Referência identificada: \${refName}. Mesclando com histórico...\`, 'info');

          let existingData = [];
          let currentStart = 0;
          let hasMore = true;
          while (hasMore) {
            const { data, error } = await supabase.from('disponibilidade_frota').select('*').eq('referencia', refName).range(currentStart, currentStart + 999);
            if (error) break;
            if (data && data.length > 0) {
              existingData = existingData.concat(data);
              currentStart += 1000;
              if (data.length < 1000) hasMore = false;
            } else hasMore = false;
          }

          setProgressDisp('Mesclando histórico de veículos...');
          const mergedMap = new Map();

          existingData.forEach(d => {
            mergedMap.set(d.placa, { 
              ...d, 
              timelineMap: new Map((d.timeline || []).map(t => [t.data, { data: t.data, rodou: t.rodou, valorOriginal: t.valorOriginal }])) 
            });
          });

          parsed.forEach(p => {
            if (mergedMap.has(p.placa)) {
               const existing = mergedMap.get(p.placa);
               if (p.filial && p.filial !== 'N/A') existing.filial = p.filial;
               if (p.modal && p.modal !== 'N/A') existing.modal = p.modal;
               p.timeline.forEach(t => existing.timelineMap.set(t.data, { data: t.data, rodou: t.rodou, valorOriginal: t.valorOriginal }));
            } else {
               mergedMap.set(p.placa, { ...p, timelineMap: new Map(p.timeline.map(t => [t.data, { data: t.data, rodou: t.rodou, valorOriginal: t.valorOriginal }])) });
            }
          });

          const allDatesSet = new Set();
          mergedMap.forEach(v => v.timelineMap.forEach((_, dateStr) => allDatesSet.add(dateStr)));
          const allDatesArray = Array.from(allDatesSet).sort((a, b) => {
             const [d1, m1] = a.split('/'); const [d2, m2] = b.split('/');
             const currentYear = new Date().getFullYear();
             return new Date(currentYear, parseInt(m1)-1, parseInt(d1)) - new Date(currentYear, parseInt(m2)-1, parseInt(d2));
          });

          const wMapGlobal = new Map();
          allDatesArray.forEach(d => {
            const weekStart = getInicioDaSemana(d);
            if (!wMapGlobal.has(weekStart)) wMapGlobal.set(weekStart, []);
            wMapGlobal.get(weekStart).push(d);
          });
          const globalWeeksArray = Array.from(wMapGlobal.entries()).map(([inicio, dias]) => ({ inicio, dias }));

          const finalDataToSave = [];

          mergedMap.forEach(v => {
             let ocioso = 0;
             const newTimeline = allDatesArray.map(date => {
                const t = v.timelineMap.get(date);
                if (t) {
                   if (!t.rodou) ocioso++; else ocioso = 0;
                   return { ...t, ociosoConsecutivo: ocioso };
                } else {
                   ocioso++;
                   return { data: date, rodou: false, ociosoConsecutivo: ocioso, valorOriginal: '' };
                }
             });

             const newMetas = globalWeeksArray.map(w => {
               let diasRodados = 0;
               w.dias.forEach(d => {
                 const info = newTimeline.find(t => t.data === d);
                 if (info && info.rodou) diasRodados++;
               });
               return { semanaInicio: w.inicio, diasRodados, totalDiasAmostra: w.dias.length, bateuMeta: diasRodados >= 6 };
             });

             finalDataToSave.push({
               placa: v.placa,
               modal: v.modal,
               filial: v.filial,
               timeline: newTimeline,
               metas_semana: newMetas,
               dias_parado_atual: ocioso,
               bateu_todas_metas: newMetas.every(m => m.bateuMeta),
               referencia: refName
             });
          });

          setProgressDisp('Salvando no banco de dados...');
          addLog(\`Iniciando deleção de histórico antigo para referência \${refName}...\`, 'info');
          await supabase.from('disponibilidade_frota').delete().eq('referencia', refName);
          addLog(\`Deleção concluída. Inserindo \${finalDataToSave.length} registros...\`, 'info');

          const CHUNK_SIZE = 500;
          for (let i = 0; i < finalDataToSave.length; i += CHUNK_SIZE) {
            const chunk = finalDataToSave.slice(i, i + CHUNK_SIZE);
            await supabase.from('disponibilidade_frota').insert(chunk);
          }

          addLog('Registrando no histórico de importações...', 'info');
          await registrarImportacao('Disponibilidade de Frota', refName, finalDataToSave.length);
          addLog('Processamento da disponibilidade de frota concluído com sucesso!', 'success');
          
          setDispFile(null);
        } catch (err) {
          console.error("Erro ao salvar no Supabase", err);
          addLog(\`Erro crítico ao processar: \${err.message}\`, 'error');
        } finally {
          setIsProcessingDisp(false);
          setProgressDisp('');
        }
    };

    if (dispFile.name.toLowerCase().endsWith('.csv')) {
      Papa.parse(dispFile, { skipEmptyLines: true, worker: true, complete: (res) => processData(res.data), error: (err) => { addLog(err.message, 'error'); setIsProcessingDisp(false); } });
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const workbook = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
          const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1 });
          processData(jsonData);
        } catch (err) { addLog(err.message, 'error'); setIsProcessingDisp(false); }
      };
      reader.readAsArrayBuffer(dispFile);
    }
  };
`;
if (!code.includes('handleProcessDispFile')) {
  code = code.replace("  const handleProcessBsc = () => {", processFunc + "\n  const handleProcessBsc = () => {");
}

fs.writeFileSync('src/DataImporter.jsx', code);
console.log('Migrated DataImporter successfully!');
