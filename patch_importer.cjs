const fs = require('fs');
let code = fs.readFileSync('src/DataImporter.jsx', 'utf8');

// 1. Add States
if (!code.includes('dispFile')) {
  const bscStates = `  const [bscFile, setBscFile] = useState(null);
  const [quinzenaBsc, setQuinzenaBsc] = useState('');
  const [isProcessingBsc, setIsProcessingBsc] = useState(false);
  const [progressBsc, setProgressBsc] = useState('');`;
  
  const dispStates = `\n  const [dispFile, setDispFile] = useState(null);
  const [isProcessingDisp, setIsProcessingDisp] = useState(false);
  const [progressDisp, setProgressDisp] = useState('');`;

  code = code.replace(bscStates, bscStates + dispStates);
}

// 2. Add handleProcessDispFile
if (!code.includes('handleProcessDispFile')) {
  const processBscDef = `  const handleProcessBsc = () => {`;
  const processDispFn = `  const handleProcessDispFile = () => {
    if (!dispFile) return;
    setIsProcessingDisp(true);
    setProgressDisp('Lendo arquivo de disponibilidade...');

    const processData = async (dataArray) => {
      let headerRowIdx = -1;
      for (let i = 0; i < Math.min(15, dataArray.length); i++) {
        if (dataArray[i] && dataArray[i].some(c => String(c).toUpperCase() === 'PLACA' || String(c).toUpperCase() === 'MODAL')) {
          headerRowIdx = i; break;
        }
      }

      if (headerRowIdx === -1) {
        alert("Cabeçalho não encontrado.");
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

      try {
        const monthFromHeader = dates[dates.length - 1] ? dates[dates.length - 1].split('/')[1] : '01';
        const monthNames = {
          '01': 'Janeiro', '02': 'Fevereiro', '03': 'Março', '04': 'Abril',
          '05': 'Maio', '06': 'Junho', '07': 'Julho', '08': 'Agosto',
          '09': 'Setembro', '10': 'Outubro', '11': 'Novembro', '12': 'Dezembro'
        };
        const refName = monthNames[monthFromHeader] || \`Mes_\${monthFromHeader}\`;
        
        setProgressDisp(\`Buscando dados de \${refName}...\`);

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

        setProgressDisp('Mesclando histórico...');
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
        await supabase.from('disponibilidade_frota').delete().eq('referencia', refName);

        const CHUNK_SIZE = 500;
        for (let i = 0; i < finalDataToSave.length; i += CHUNK_SIZE) {
          const chunk = finalDataToSave.slice(i, i + CHUNK_SIZE);
          await supabase.from('disponibilidade_frota').insert(chunk);
        }

        const newHistoryObj = {
          tipo: 'Disponibilidade de Frota',
          quinzena: refName,
          qtd_registros: finalDataToSave.length,
          data_importacao: new Date().toISOString()
        };

        await supabase.from('importacoes_history').insert([newHistoryObj]);
        
        alert("Disponibilidade processada e salva com sucesso!");

      } catch (err) {
        console.error("Erro ao salvar no Supabase", err);
        alert("Erro: " + err.message);
      }

      setIsProcessingDisp(false);
      setProgressDisp('');
      setDispFile(null);
    };

    if (dispFile.name.toLowerCase().endsWith('.csv')) {
      Papa.parse(dispFile, { skipEmptyLines: true, worker: true, complete: (res) => processData(res.data), error: (err) => { alert(err.message); setIsProcessingDisp(false); } });
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const workbook = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
          const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1 });
          processData(jsonData);
        } catch (err) { alert(err.message); setIsProcessingDisp(false); }
      };
      reader.readAsArrayBuffer(dispFile);
    }
  };

`;
  
  code = code.replace(processBscDef, processDispFn + "\n" + processBscDef);
}

// 3. Add UI Block
if (!code.includes('activeStep === 5 &&')) {
  const activeStep7 = `{activeStep === 7 && (`;
  const dispUI = `{activeStep === 5 && (
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
          )}
          `;
  
  code = code.replace(activeStep7, dispUI + "\n          " + activeStep7);
}

fs.writeFileSync('src/DataImporter.jsx', code);
console.log('DataImporter patched successfully');
