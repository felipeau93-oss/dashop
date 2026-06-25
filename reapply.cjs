const fs = require('fs');

let code = fs.readFileSync('src/PainelDisponibilidade.jsx', 'utf8');

// 1. EvolutionLineChart
const oldEvolChart1 = `const EvolutionLineChart = ({ data, targetValue = 6, yMax = 7, heightClass = "h-[300px]" }) => {`;
const newEvolChart1 = `const EvolutionLineChart = ({ data, targetValue = 6, yMax = 7, heightClass = "h-[300px]", isPercentage = false }) => {`;
code = code.replace(oldEvolChart1, newEvolChart1);

code = code.replace("const yAxisSteps = [7, 6, 4, 2, 0];", "const yAxisSteps = isPercentage ? [100, 75, 50, 25, 0] : [7, 6, 4, 2, 0];");

const oldEvolStep = `<span className="text-[10px] font-bold text-slate-400 bg-transparent pr-2 -translate-y-1/2">{step}</span>`;
const newEvolStep = `<span className="text-[10px] font-bold text-slate-400 bg-transparent pr-2 -translate-y-1/2">{step}{isPercentage ? '%' : ''}</span>`;
code = code.replace(oldEvolStep, newEvolStep);

const oldEvolTarget = `<div className="absolute w-full border-t-2 border-dashed border-emerald-500 z-10 pointer-events-none opacity-70" style={{ top: \`\${targetY}%\` }}>
          <span className="absolute right-0 text-[10px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded -translate-y-1/2 mt-0.5 border border-emerald-200 shadow-sm mr-2">META ({targetValue})</span>
        </div>`;
const newEvolTarget = `<div className="absolute w-full z-10 pointer-events-none flex items-center pr-2" style={{ top: \`\${targetY}%\`, transform: 'translateY(-50%)' }}>
          <div className="flex-1 border-t-2 border-dashed border-emerald-500 opacity-70"></div>
          <span className="text-[10px] font-black text-emerald-500 bg-[#0f0f11] px-2 py-0.5 rounded ml-2 border border-emerald-500/30 shadow-sm">META ({targetValue}{isPercentage ? '%' : ''})</span>
        </div>`;
code = code.replace(oldEvolTarget, newEvolTarget);


// 2. DrilldownBarChart
const oldDrillTarget = `<div className="absolute w-full border-t-2 border-dashed border-emerald-500 z-10 pointer-events-none opacity-70" style={{ bottom: \`\${targetY}%\` }}>
          <span className="absolute right-0 text-[10px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded translate-y-1/2 mb-0.5 border border-emerald-200 shadow-sm mr-2">META ({targetValue})</span>
        </div>`;
const newDrillTarget = `<div className="absolute w-full z-10 pointer-events-none flex items-center pr-2" style={{ bottom: \`\${targetY}%\`, transform: 'translateY(50%)' }}>
          <div className="flex-1 border-t-2 border-dashed border-emerald-500 opacity-70"></div>
          <span className="text-[10px] font-black text-emerald-500 bg-[#0f0f11] px-2 py-0.5 rounded ml-2 border border-emerald-500/30 shadow-sm">META ({targetValue})</span>
        </div>`;
code = code.replace(oldDrillTarget, newDrillTarget);

// 3. States
const oldStates = `  const [searchTerm, setSearchTerm] = useState('');`;
const newStates = `  const [searchTerm, setSearchTerm] = useState('');
  const [selectedModal, setSelectedModal] = useState('ALL');
  const [showOnlyDivergent, setShowOnlyDivergent] = useState(false);
  const [opPlacaMap, setOpPlacaMap] = useState(new Map());
  const [opRotaMap, setOpRotaMap] = useState(new Map());`;
code = code.replace(oldStates, newStates);

// 4. Auto classification & fetchMappings
const oldMemoTarget = `  const regionalMap = useMemo(() => {`;
const newClassify = `  const autoClassifiedFleetData = useMemo(() => {
    return fleetData.map(car => {
      let hasValidRoute = false;
      car.timeline.forEach(dia => {
        const val = String(dia.valorOriginal).trim();
        if (dia.rodou && val !== '' && val.toUpperCase() !== '-NÃO INFORMADO-' && val.toUpperCase() !== '-NAO INFORMADO-' && val !== '0') {
           hasValidRoute = true;
        }
      });
      return { ...car, modal: hasValidRoute ? 'Last Mile' : 'Middle Mile' };
    });
  }, [fleetData]);

  const availableModals = useMemo(() => {
    const modals = new Set(autoClassifiedFleetData.map(d => d.modal).filter(Boolean));
    return ['ALL', ...Array.from(modals).sort()];
  }, [autoClassifiedFleetData]);

  useEffect(() => {
    if (autoClassifiedFleetData.length === 0) return;

    const fetchMappings = async () => {
      try {
        const routeSet = new Set();
        autoClassifiedFleetData.forEach(car => {
          car.timeline.forEach(dia => {
            if (dia.rodou && dia.valorOriginal) routeSet.add(String(dia.valorOriginal).trim());
          });
        });
        const uniqueRoutes = Array.from(routeSet);
        if (uniqueRoutes.length === 0) return;

        const chunkSize = 200;
        let routeData = [];
        for (let i = 0; i < uniqueRoutes.length; i += chunkSize) {
          const chunk = uniqueRoutes.slice(i, i + chunkSize);
          const { data, error } = await supabase.from('operacional').select('rota, placa, filial').in('rota', chunk);
          if (!error && data) routeData = routeData.concat(data);
        }

        const newRotaMap = new Map();
        const newPlacaMap = new Map();
        
        routeData.forEach(row => {
          if (row.rota) {
             const rt = String(row.rota).trim();
             if (!newRotaMap.has(rt)) newRotaMap.set(rt, { filial: row.filial, placa: row.placa });
          }
          if (row.placa) {
             const pl = String(row.placa).trim();
             if (!newPlacaMap.has(pl)) newPlacaMap.set(pl, { filial: row.filial, rota: row.rota });
          }
        });

        setOpRotaMap(newRotaMap);
        setOpPlacaMap(newPlacaMap);
      } catch (err) {
        console.error("Erro ao buscar mappings", err);
      }
    };
    fetchMappings();
  }, [autoClassifiedFleetData]);

  const filialConfigMap = useMemo(() => {
    const map = new Map();
    configFiliais.forEach(f => {
      if (f.filial) map.set(f.filial.toUpperCase(), { regional: f.regional || 'N/A', supervisor: f.supervisor || 'N/A' });
    });
    return map;
  }, [configFiliais]);
`;
// Replace regionalMap block completely
const regMapStart = code.indexOf('  const regionalMap = useMemo(() => {');
const regMapEnd = code.indexOf('  }, [configFiliais]);', regMapStart) + '  }, [configFiliais]);'.length;
code = code.slice(0, regMapStart) + newClassify + code.slice(regMapEnd);


// 5. EnrichedFleetData
const oldEnrichStart = code.indexOf('  const enrichedFleetData = useMemo(() => {');
const oldEnrichEnd = code.indexOf('  }, [fleetData, regionalMap]);', oldEnrichStart) + '  }, [fleetData, regionalMap]);'.length;
let oldEnrichEnd2 = code.indexOf('  }, [fleetData, filialConfigMap]);', oldEnrichStart);
if(oldEnrichEnd2 !== -1) oldEnrichEnd2 += '  }, [fleetData, filialConfigMap]);'.length;
const actualEnrichEnd = oldEnrichEnd !== -1 && oldEnrichEnd < oldEnrichStart + 2000 ? oldEnrichEnd : oldEnrichEnd2;

const newEnrich = `  const enrichedFleetData = useMemo(() => {
    return autoClassifiedFleetData.filter(car => selectedModal === 'ALL' || car.modal === selectedModal).map(car => {
      const pFilial = car.filial ? car.filial.toUpperCase() : '';
      const conf = filialConfigMap.get(pFilial);
      const regional = conf ? conf.regional : 'N/A';
      const supervisor = conf ? conf.supervisor : 'N/A';
      
      let isFilialDivergent = false;
      let opFilial = '';
      
      const pMap = opPlacaMap.get(car.placa);
      if (pMap && pMap.filial) {
         if (String(pMap.filial).toUpperCase() !== pFilial) {
            isFilialDivergent = true;
            opFilial = pMap.filial;
         }
      } else {
         for (let dia of car.timeline) {
            if (dia.rodou && dia.valorOriginal) {
               const rMap = opRotaMap.get(String(dia.valorOriginal).trim());
               if (rMap && rMap.filial && String(rMap.filial).toUpperCase() !== pFilial) {
                  isFilialDivergent = true;
                  opFilial = rMap.filial;
                  break;
               }
            }
         }
      }
      
      return { ...car, regional, opSupervisor: supervisor, isFilialDivergent, opFilial };
    });
  }, [autoClassifiedFleetData, opPlacaMap, opRotaMap, filialConfigMap, selectedModal]);`;
code = code.slice(0, oldEnrichStart) + newEnrich + code.slice(actualEnrichEnd);


// 6. FilteredData
const oldFilter = `  const filteredData = useMemo(() => {
    return enrichedFleetData.filter(car => {
      if (viewMode === 'FILIAL') return !chartSelectedFilial || car.filial === chartSelectedFilial;
      if (viewMode === 'REGIONAL') return !chartSelectedFilial || car.regional === chartSelectedFilial;
      return true;
    });
  }, [enrichedFleetData, viewMode, chartSelectedFilial]);`;
const newFilter = `  const filteredData = useMemo(() => {
    return enrichedFleetData.filter(car => {
      if (viewMode === 'FILIAL') return !chartSelectedFilial || car.filial === chartSelectedFilial;
      if (viewMode === 'REGIONAL') return !chartSelectedFilial || car.regional === chartSelectedFilial;
      return true;
    }).filter(car => {
       if (showOnlyDivergent) return car.isFilialDivergent;
       return true;
    });
  }, [enrichedFleetData, viewMode, chartSelectedFilial, showOnlyDivergent]);`;
code = code.replace(oldFilter, newFilter);

// 7. KPIs
const kpiStart = code.indexOf('  const kpis = useMemo(() => {');
const kpiEnd = code.indexOf('  }, [enrichedFleetData, selectedWeek]);', kpiStart) + '  }, [enrichedFleetData, selectedWeek]);'.length;

const newKpi = `  const kpis = useMemo(() => {
    const base = enrichedFleetData;
    let totalDiasRodados = 0;
    let totalDiasPossiveis = 0;

    if (viewMode === 'GERAL') {
       base.forEach(d => {
         d.metasSemana.forEach(m => {
             totalDiasRodados += m.diasRodados;
             totalDiasPossiveis += m.totalDiasAmostra;
         });
       });
       const total = base.length;
       const criticos = base.filter(d => d.diasParadoAtual >= 3).length;
       const ociososHoje = base.filter(d => d.diasParadoAtual > 0).length;
       const metaBatida = base.filter(d => d.bateuTodasMetas).length;
       const mediaUtilizacao = totalDiasPossiveis > 0 ? (totalDiasRodados / totalDiasPossiveis) * 100 : 0;
       
       return { total, criticos, ociososHoje, metaBatida, mediaUtilizacao };
    } else {
       base.forEach(d => {
         d.metasSemana.forEach(m => {
             totalDiasRodados += m.diasRodados;
             totalDiasPossiveis += m.totalDiasAmostra;
         });
       });
       const total = base.length;
       const criticos = base.filter(d => d.diasParadoAtual >= 3).length;
       const ociososHoje = base.filter(d => d.diasParadoAtual > 0).length;
       const metaBatida = base.filter(d => d.bateuTodasMetas).length;
       const mediaUtilizacao = totalDiasPossiveis > 0 ? (totalDiasRodados / totalDiasPossiveis) * 100 : 0;
       
       return { total, criticos, ociososHoje, metaBatida, mediaUtilizacao };
    }
  }, [enrichedFleetData, selectedWeek]);`;
code = code.slice(0, kpiStart) + newKpi + code.slice(kpiEnd);

// 8. ChartData
const cdataStart = code.indexOf('  const chartData = useMemo(() => {');
const cdataEnd = code.indexOf('  }, [enrichedFleetData, viewMode, chartSelectedFilial, selectedWeek]);', cdataStart) + '  }, [enrichedFleetData, viewMode, chartSelectedFilial, selectedWeek]);'.length;
const newCdata = `  const chartData = useMemo(() => {
    const evolMap = new Map();
    const drillMap = new Map();

    enrichedFleetData.forEach(car => {
      const isSelected = chartSelectedFilial && (viewMode === 'REGIONAL' ? car.regional === chartSelectedFilial : car.filial === chartSelectedFilial);
      const includeInEvol = !chartSelectedFilial || isSelected;

      car.metasSemana.forEach(meta => {
        if (selectedWeek !== 'ALL' && meta.semanaInicio !== selectedWeek) return;
        
        if (includeInEvol) {
          if (!evolMap.has(meta.semanaInicio)) evolMap.set(meta.semanaInicio, { sumRodados: 0, sumPossiveis: 0 });
          evolMap.get(meta.semanaInicio).sumRodados += meta.diasRodados;
          evolMap.get(meta.semanaInicio).sumPossiveis += meta.totalDiasAmostra;
        }
        
        const drillKey = chartSelectedFilial ? car.placa : (viewMode === 'REGIONAL' ? car.regional : car.filial);
        if (!chartSelectedFilial || isSelected) {
          if (!drillMap.has(drillKey)) drillMap.set(drillKey, { sum: 0, count: 0 });
          drillMap.get(drillKey).sum += meta.diasRodados;
          drillMap.get(drillKey).count += 1;
        }
      });
    });

    const evolution = Array.from(evolMap.entries()).map(([semana, stats]) => ({
      label: semana, value: stats.sumPossiveis > 0 ? (stats.sumRodados / stats.sumPossiveis) * 100 : 0
    })).sort((a, b) => {
      const [d1, m1] = a.label.split('/'); const [d2, m2] = b.label.split('/');
      return new Date(ANO_REFERENCIA, parseInt(m1)-1, parseInt(d1)) - new Date(ANO_REFERENCIA, parseInt(m2)-1, parseInt(d2));
    });

    const drilldown = Array.from(drillMap.entries()).map(([key, stats]) => ({
      label: key, value: stats.sum / stats.count
    })).sort((a, b) => a.value - b.value).slice(0, 15); // Worst offenders first

    return { evolution, drilldown };
  }, [enrichedFleetData, viewMode, chartSelectedFilial, selectedWeek]);`;
code = code.slice(0, cdataStart) + newCdata + code.slice(cdataEnd);

// 9. Fix Header and Dropdowns
// Modals dropdown
const modalsSelect = `<select
                  value={selectedModal}
                  onChange={(e) => setSelectedModal(e.target.value)}
                  className="px-4 py-2.5 bg-slate-100 border-none rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer w-full sm:w-auto"
                >
                  <option className="bg-[#1e1e24] text-white" value="ALL">Todos os Modais</option>
                  {availableModals.filter(m => m !== 'ALL').map(m => (
                    <option className="bg-[#1e1e24] text-white" key={m} value={m}>{m}</option>
                  ))}
                </select>`;
code = code.replace(/<select\s+value=\{selectedWeek\}[\s\S]*?<\/select>/, `$&
                ${modalsSelect}`);
code = code.replace(/<option value="ALL">/g, '<option className="bg-[#1e1e24] text-white" value="ALL">');
code = code.replace(/<option key=\{w.inicio\} value=\{w.inicio\}>/g, '<option className="bg-[#1e1e24] text-white" key={w.inicio} value={w.inicio}>');

// Search Bar + Somente Divergentes
const oldSearch = `<div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar placa..."
                    className="block w-full pl-10 pr-3 py-2 border border-slate-700 rounded-lg leading-5 bg-[#13131a] text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm font-bold transition-colors"
                  />
                </div>`;
const newSearch = `<div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="relative flex-1 sm:w-64">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar placa..."
                    className="block w-full pl-10 pr-3 py-2.5 border border-slate-700 rounded-xl leading-5 bg-[#1e1e24] text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm font-bold transition-colors"
                  />
                </div>
                <button
                  onClick={() => setShowOnlyDivergent(!showOnlyDivergent)}
                  className={\`px-4 py-2.5 rounded-xl font-bold text-sm transition-colors border flex items-center justify-center gap-2 \${showOnlyDivergent ? 'bg-red-900/40 border-red-500 text-red-400' : 'bg-[#1e1e24] border-slate-700 text-slate-400 hover:text-slate-300'}\`}
                >
                  <AlertTriangle className="w-4 h-4" /> Somente Divergentes
                </button>
              </div>`;
code = code.replace(oldSearch, newSearch);
// Also in case it wasn't exactly like that:
if (!code.includes('Somente Divergentes')) {
   console.log('Failed to patch search bar, please check regex');
}

// 10. KPI Cards Update
code = code.replace('grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6', 'grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6');
code = code.replace('className="w-12 h-12 text-indigo-400"', 'className="w-8 h-8 text-indigo-400"');
code = code.replace('className="w-12 h-12 text-emerald-400"', 'className="w-8 h-8 text-emerald-400"');
code = code.replace('className="w-12 h-12 text-orange-400"', 'className="w-8 h-8 text-orange-400"');
code = code.replace('className="w-12 h-12 text-red-400"', 'className="w-8 h-8 text-red-400"');

const fourthCardEnd = `              <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center group-hover:scale-110 transition-transform">
                <XCircle className="w-8 h-8 text-red-400" />
              </div>
            </div>`;
const fifthCard = `
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex items-center justify-between group hover:border-blue-300 transition-colors">
              <div>
                <p className="text-sm font-bold text-slate-500 mb-1">Média Utilização</p>
                <div className="flex items-end gap-2">
                  <h3 className="text-3xl font-black text-slate-800 group-hover:text-blue-600 transition-colors">{kpis.mediaUtilizacao.toFixed(1)}%</h3>
                </div>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center group-hover:scale-110 transition-transform">
                <BarChart3 className="w-8 h-8 text-blue-400" />
              </div>
            </div>`;
code = code.replace(fourthCardEnd, fourthCardEnd + fifthCard);


// 11. EvolutionLineChart JSX usage update
code = code.replace('<EvolutionLineChart data={chartData.evolution} />', '<EvolutionLineChart data={chartData.evolution} isPercentage={true} targetValue={95} yMax={100} />');
code = code.replace('Evolução Semanal (Média Dias/Semana)', 'Evolução Semanal (Utilização)');

// 12. Legend & Table row changes
code = code.replace('bg-[#13131a] px-4 py-3 rounded-2xl border border-slate-800', 'bg-[#1e1e24] px-4 py-2.5 rounded-xl border border-slate-800');

const oldTr = `<span className="font-bold text-white text-sm">{row.placa}</span>
                              {row.isFilialDivergent && (
                                 <div className="flex items-center gap-1 bg-red-900/40 text-red-400 px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider border border-red-800/50" title={\`A placa realizou rotas na filial \${row.opFilial} no Operacional, mas está registrada em \${row.filial} na planilha.\`}>
                                    <AlertTriangle className="w-4 h-4" /> Operacional: {row.opFilial}
                                 </div>
                              )}
                            </div>
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{row.regional} • {row.filial} • {row.modal} • Sup: {row.opSupervisor}</span>`;
const newTr = `<span className="font-bold text-white text-sm">{row.placa}</span>
                               {row.isFilialDivergent && (
                                  <div className="flex items-center gap-1 bg-red-900/40 text-red-400 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border border-red-800/50" title={\`A placa realizou rotas na filial \${row.opFilial} no Operacional, mas está registrada em \${row.filial} na planilha.\`}>
                                     <AlertTriangle className="w-3 h-3" /> Operacional: {row.opFilial}
                                  </div>
                               )}
                            </div>
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{row.filial}</span>`;
code = code.replace(oldTr, newTr);

fs.writeFileSync('src/PainelDisponibilidade.jsx', code);
console.log('Restoration completed');
