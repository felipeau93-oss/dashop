const fs = require('fs');

const originalCode = fs.readFileSync('src/DataImporter.jsx', 'utf8');
const dispLogic = fs.readFileSync('disp_logic.jsx', 'utf8');

// 1. Add State
const stateTarget = `  const [bscFile, setBscFile] = useState(null);`;
const stateReplacement = `  const [dispFile, setDispFile] = useState(null);\n  const [isProcessingDisp, setIsProcessingDisp] = useState(false);\n  const [progressDisp, setProgressDisp] = useState('');\n\n  const [bscFile, setBscFile] = useState(null);`;
let newCode = originalCode.replace(stateTarget, stateReplacement);

// 2. Add Function
const funcTarget = `  const handleProcessBsc = () => {`;
const funcReplacement = `  const handleProcessDispFile = () => {\n    if (!dispFile) return;\n    setIsProcessingDisp(true);\n    setProgressDisp('Lendo arquivo...');\n    addLog(\`Iniciando processamento da planilha de disponibilidade: \${dispFile.name}\`, 'info');\n\n    const processData = async (dataArray) => {\n        try {\n          let headerRowIdx = -1;\n          for (let i = 0; i < Math.min(15, dataArray.length); i++) {\n            if (dataArray[i] && dataArray[i].some(c => String(c).toUpperCase() === 'PLACA' || String(c).toUpperCase() === 'MODAL')) {\n              headerRowIdx = i; break;\n            }\n          }\n\n          if (headerRowIdx === -1) {\n            addLog("Cabeçalho não encontrado na planilha de disponibilidade.", 'error');\n            setIsProcessingDisp(false);\n            return;\n          }\n\n          const rawHeaders = dataArray[headerRowIdx].map(h => {\n            let text = String(h || '').trim();\n            if (/^\\d{1,2}\\/\\d{1,2}\\/\\d{2,4}$/.test(text)) return text.substring(0, 5);\n            return text;\n          });\n          const dates = rawHeaders.filter(h => /^\\d{1,2}\\/\\d{1,2}$/.test(h));\n\n          const wMap = new Map();\n          dates.forEach(d => {\n            const weekStart = getInicioDaSemana(d);\n            if (!wMap.has(weekStart)) wMap.set(weekStart, []);\n            wMap.get(weekStart).push(d);\n          });\n          const weeksArray = Array.from(wMap.entries()).map(([inicio, dias]) => ({ inicio, dias }));\n\n          const idxPlaca = rawHeaders.findIndex(h => h.toUpperCase() === 'PLACA');\n          const idxModal = rawHeaders.findIndex(h => h.toUpperCase() === 'MODAL');\n          const idxXPT = rawHeaders.findIndex(h => h.toUpperCase() === 'XPT' || h.toUpperCase() === 'FILIAL');\n\n          const parsed = [];\n\n          for (let i = headerRowIdx + 1; i < dataArray.length; i++) {\n            const row = dataArray[i];\n            if (!row || row.length === 0) continue;\n            const placa = row[idxPlaca] ? String(row[idxPlaca]).trim() : '';\n            if (!placa) continue;\n\n            const modal = row[idxModal] ? String(row[idxModal]).trim() : 'N/A';\n            const filial = row[idxXPT] ? String(row[idxXPT]).trim() : 'N/A';\n\n            let ociosoConsecutivo = 0;\n            const timeline = dates.map(date => {\n              const colIdx = rawHeaders.indexOf(date);\n              const valor = String(row[colIdx] || '').trim();\n              const rodou = valor !== '' && valor.toUpperCase() !== '-NÃO INFORMADO-' && valor.toUpperCase() !== '-NAO INFORMADO-' && valor !== '0';\n              \n              if (!rodou) ociosoConsecutivo++; else ociosoConsecutivo = 0;\n\n              return { data: date, rodou, ociosoConsecutivo, valorOriginal: valor };\n            });\n\n            const metasSemana = weeksArray.map(w => {\n              let diasRodados = 0;\n              w.dias.forEach(d => {\n                const info = timeline.find(t => t.data === d);\n                if (info && info.rodou) diasRodados++;\n              });\n              return { semanaInicio: w.inicio, diasRodados, totalDiasAmostra: w.dias.length, bateuMeta: diasRodados >= 6 };\n            });\n\n            parsed.push({ placa, modal, filial, timeline, metasSemana, diasParadoAtual: timeline[timeline.length - 1]?.ociosoConsecutivo || 0, bateuTodasMetas: metasSemana.every(m => m.bateuMeta) });\n          }\n\n          const monthFromHeader = dates[dates.length - 1] ? dates[dates.length - 1].split('/')[1] : '01';\n          const monthNames = {\n            '01': 'Janeiro', '02': 'Fevereiro', '03': 'Março', '04': 'Abril',\n            '05': 'Maio', '06': 'Junho', '07': 'Julho', '08': 'Agosto',\n            '09': 'Setembro', '10': 'Outubro', '11': 'Novembro', '12': 'Dezembro'\n          };\n          const refName = monthNames[monthFromHeader] || \`Mes_\${monthFromHeader}\`;\n          \n          setProgressDisp(\`Buscando dados de \${refName}...\`);\n          addLog(\`Referência identificada: \${refName}. Mesclando com histórico...\`, 'info');\n\n          let existingData = [];\n          let currentStart = 0;\n          let hasMore = true;\n          while (hasMore) {\n            const { data, error } = await supabase.from('disponibilidade_frota').select('*').eq('referencia', refName).range(currentStart, currentStart + 999);\n            if (error) break;\n            if (data && data.length > 0) {\n              existingData = existingData.concat(data);\n              currentStart += 1000;\n              if (data.length < 1000) hasMore = false;\n            } else hasMore = false;\n          }\n\n          setProgressDisp('Mesclando histórico de veículos...');\n          const mergedMap = new Map();\n\n          existingData.forEach(d => {\n            mergedMap.set(d.placa, { \n              ...d, \n              timelineMap: new Map((d.timeline || []).map(t => [t.data, { data: t.data, rodou: t.rodou, valorOriginal: t.valorOriginal }])) \n            });\n          });\n\n          parsed.forEach(p => {\n            if (mergedMap.has(p.placa)) {\n               const existing = mergedMap.get(p.placa);\n               if (p.filial && p.filial !== 'N/A') existing.filial = p.filial;\n               if (p.modal && p.modal !== 'N/A') existing.modal = p.modal;\n               p.timeline.forEach(t => existing.timelineMap.set(t.data, { data: t.data, rodou: t.rodou, valorOriginal: t.valorOriginal }));\n            } else {\n               mergedMap.set(p.placa, { ...p, timelineMap: new Map(p.timeline.map(t => [t.data, { data: t.data, rodou: t.rodou, valorOriginal: t.valorOriginal }])) });\n            }\n          });\n\n          const allDatesSet = new Set();\n          mergedMap.forEach(v => v.timelineMap.forEach((_, dateStr) => allDatesSet.add(dateStr)));\n          const allDatesArray = Array.from(allDatesSet).sort((a, b) => {\n             const [d1, m1] = a.split('/'); const [d2, m2] = b.split('/');\n             const currentYear = new Date().getFullYear();\n             return new Date(currentYear, parseInt(m1)-1, parseInt(d1)) - new Date(currentYear, parseInt(m2)-1, parseInt(d2));\n          });\n\n          const wMapGlobal = new Map();\n          allDatesArray.forEach(d => {\n            const weekStart = getInicioDaSemana(d);\n            if (!wMapGlobal.has(weekStart)) wMapGlobal.set(weekStart, []);\n            wMapGlobal.get(weekStart).push(d);\n          });\n          const globalWeeksArray = Array.from(wMapGlobal.entries()).map(([inicio, dias]) => ({ inicio, dias }));\n\n          const finalDataToSave = [];\n\n          mergedMap.forEach(v => {\n             let ocioso = 0;\n             const newTimeline = allDatesArray.map(date => {\n                const t = v.timelineMap.get(date);\n                if (t) {\n                   if (!t.rodou) ocioso++; else ocioso = 0;\n                   return { ...t, ociosoConsecutivo: ocioso };\n                } else {\n                   ocioso++;\n                   return { data: date, rodou: false, ociosoConsecutivo: ocioso, valorOriginal: '' };\n                }\n             });\n\n             const newMetas = globalWeeksArray.map(w => {\n               let diasRodados = 0;\n               w.dias.forEach(d => {\n                 const info = newTimeline.find(t => t.data === d);\n                 if (info && info.rodou) diasRodados++;\n               });\n               return { semanaInicio: w.inicio, diasRodados, totalDiasAmostra: w.dias.length, bateuMeta: diasRodados >= 6 };\n             });\n\n             finalDataToSave.push({\n               placa: v.placa,\n               modal: v.modal,\n               filial: v.filial,\n               timeline: newTimeline,\n               metas_semana: newMetas,\n               dias_parado_atual: ocioso,\n               bateu_todas_metas: newMetas.every(m => m.bateuMeta),\n               referencia: refName\n             });\n          });\n\n          setProgressDisp('Salvando no banco de dados...');\n          addLog(\`Iniciando deleção de histórico antigo para referência \${refName}...\`, 'info');\n          await supabase.from('disponibilidade_frota').delete().eq('referencia', refName);\n          addLog(\`Deleção concluída. Inserindo \${finalDataToSave.length} registros...\`, 'info');\n\n          const CHUNK_SIZE = 500;\n          for (let i = 0; i < finalDataToSave.length; i += CHUNK_SIZE) {\n            const chunk = finalDataToSave.slice(i, i + CHUNK_SIZE);\n            await supabase.from('disponibilidade_frota').insert(chunk);\n          }\n\n          addLog('Registrando no histórico de importações...', 'info');\n          await registrarImportacao('Disponibilidade de Frota', refName, finalDataToSave.length);\n          addLog('Processamento da disponibilidade de frota concluído com sucesso!', 'success');\n          \n          setDispFile(null);\n        } catch (err) {\n          console.error("Erro ao salvar no Supabase", err);\n          addLog(\`Erro crítico ao processar: \${err.message}\`, 'error');\n        } finally {\n          setIsProcessingDisp(false);\n          setProgressDisp('');\n        }\n    };\n\n    if (dispFile.name.toLowerCase().endsWith('.csv')) {\n      Papa.parse(dispFile, { skipEmptyLines: true, worker: true, complete: (res) => processData(res.data), error: (err) => { addLog(err.message, 'error'); setIsProcessingDisp(false); } });\n    } else {\n      const reader = new FileReader();\n      reader.onload = (e) => {\n        try {\n          const workbook = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });\n          const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1, raw: false, dateNF: 'dd/mm' });\n          processData(jsonData);\n        } catch (err) { addLog(err.message, 'error'); setIsProcessingDisp(false); }\n      };\n      reader.readAsArrayBuffer(dispFile);\n    }\n  };\n\n  const handleProcessBsc = () => {`;
newCode = newCode.replace(funcTarget, funcReplacement);

// 3. Add Tab
const tabTarget = `              <button 
                onClick={() => setActiveStep(4)}
                className={\`px-4 py-2 font-bold whitespace-nowrap border-b-2 transition-colors flex items-center gap-2 \${activeStep === 4 ? 'border-orange-500 text-orange-400' : 'border-transparent text-slate-400 hover:text-slate-300'}\`}
              >
                <Box className="w-4 h-4" /> BSC
              </button>`;
const tabReplacement = `              <button 
                onClick={() => setActiveStep(8)}
                className={\`px-4 py-2 font-bold whitespace-nowrap border-b-2 transition-colors flex items-center gap-2 \${activeStep === 8 ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-300'}\`}
              >
                <Truck className="w-4 h-4" /> Disponibilidade
              </button>\n` + tabTarget;
newCode = newCode.replace(tabTarget, tabReplacement);

// 4. Add UI
const uiTarget = `          {activeStep === 4 && (`
const uiReplacement = `          {activeStep === 8 && (
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
          )}\n` + uiTarget;
newCode = newCode.replace(uiTarget, uiReplacement);

fs.writeFileSync('src/DataImporter.jsx', newCode);
console.log('Update Complete.');
