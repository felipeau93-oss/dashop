import React, { useState, useMemo, useEffect } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { 
  Truck, AlertTriangle, CalendarDays, CheckCircle2, XCircle, Search, 
  UploadCloud, FileSpreadsheet, Loader2, Calendar, TrendingUp, BarChart3, ArrowUp, History
} from 'lucide-react';
import { supabase } from './supabase';

const ANO_REFERENCIA = 2026;

const getInicioDaSemana = (dataString) => {
  const [dia, mes] = dataString.split('/');
  const data = new Date(ANO_REFERENCIA, parseInt(mes) - 1, parseInt(dia));
  const diaDaSemana = data.getDay(); 
  const domingo = new Date(data);
  domingo.setDate(data.getDate() - diaDaSemana);
  return `${domingo.getDate().toString().padStart(2, '0')}/${(domingo.getMonth() + 1).toString().padStart(2, '0')}`;
};

const EvolutionLineChart = ({ data, targetValue = 6, yMax = 7, heightClass = "h-[300px]" }) => {
  const safeData = data || [];
  if (safeData.length === 0) return <div className={`w-full ${heightClass} flex items-center justify-center text-slate-400`}>Sem dados suficientes.</div>;

  const yAxisSteps = [7, 6, 4, 2, 0];
  const targetY = 100 - (targetValue / yMax) * 100;

  return (
    <div className={`w-full ${heightClass} flex flex-col pt-6 pb-8 relative`}>
      <div className="flex-1 flex relative mt-2">
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
          {yAxisSteps.map((step, idx) => (
            <div key={idx} className="w-full border-t border-slate-200 flex items-center justify-between" style={{ height: step === 0 ? '0px' : 'auto', marginTop: step === 7 ? '-10px' : '0' }}>
              <span className="text-[10px] font-bold text-slate-400 bg-transparent pr-2 -translate-y-1/2">{step}</span>
            </div>
          ))}
        </div>
        <div className="absolute w-full border-t-2 border-dashed border-emerald-500 z-10 pointer-events-none opacity-70" style={{ top: `${targetY}%` }}>
          <span className="absolute right-0 text-[10px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded -translate-y-1/2 mt-0.5 border border-emerald-200 shadow-sm mr-2">META ({targetValue})</span>
        </div>
        <div className="z-10 flex w-full h-full items-end justify-around border-b border-slate-300 relative ml-6">
          <svg className="absolute inset-0 w-full h-full overflow-visible z-20" viewBox="0 0 100 100" preserveAspectRatio="none">
            <polyline 
              points={safeData.map((d, i) => `${(i + 0.5) * (100 / safeData.length)},${100 - (d.value / yMax) * 100}`).join(' ')} 
              fill="none" stroke="#4f46e5" strokeWidth="3" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" 
            />
          </svg>
          {safeData.map((d, i) => {
            const xPct = (i + 0.5) * (100 / safeData.length);
            const yPct = 100 - (d.value / yMax) * 100;
            return (
              <div key={i} className="absolute w-3.5 h-3.5 bg-white border-[3px] border-indigo-600 rounded-full shadow-md z-30 transition-transform hover:scale-150 cursor-pointer group flex justify-center items-center" style={{ left: `calc(${xPct}% - 7px)`, top: `calc(${yPct}% - 7px)` }}>
                <span className="absolute bottom-full mb-3 bg-slate-800 text-white text-[11px] font-bold px-2.5 py-1.5 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none transition-opacity border border-slate-700">
                  Semana {d.label}: <span className="text-blue-300">{d.value.toFixed(1)} dias</span>
                </span>
                <span className="absolute top-full mt-4 text-[10px] font-bold text-slate-500 whitespace-nowrap pointer-events-none">{d.label}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  );
};

const DrilldownBarChart = ({ data, onBarClick, targetValue = 6, yMax = 7, heightClass = "h-[300px]", isPlacaView = false }) => {
  const safeData = data || [];
  if (safeData.length === 0) return <div className={`w-full ${heightClass} flex items-center justify-center text-slate-400`}>Sem dados suficientes.</div>;

  const yAxisSteps = [7, 6, 4, 2, 0];
  const targetY = (targetValue / yMax) * 100;

  return (
    <div className={`w-full ${heightClass} flex flex-col pt-6 pb-8 relative`}>
      <div className="flex-1 flex relative mt-2">
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
          {yAxisSteps.map((step, idx) => (
            <div key={idx} className="w-full border-t border-slate-200 flex items-center justify-between" style={{ height: step === 0 ? '0px' : 'auto', marginTop: step === 7 ? '-10px' : '0' }}>
              <span className="text-[10px] font-bold text-slate-400 bg-transparent pr-2 -translate-y-1/2">{step}</span>
            </div>
          ))}
        </div>
        <div className="absolute w-full border-t-2 border-dashed border-emerald-500 z-10 pointer-events-none opacity-70" style={{ bottom: `${targetY}%` }}>
          <span className="absolute right-0 text-[10px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded -translate-y-1/2 border border-emerald-200 shadow-sm mr-2">META ({targetValue})</span>
        </div>
        <div className="z-10 flex w-full h-full items-end justify-around gap-1 sm:gap-2 border-b border-slate-300 relative ml-6">
          {safeData.map((d, i) => {
            const pct = (d.value / yMax) * 100;
            const isSuccess = d.value >= targetValue;
            const barColor = isSuccess ? 'bg-emerald-500 hover:bg-emerald-400' : (d.value >= 4 ? 'bg-orange-400 hover:bg-orange-300' : 'bg-red-500 hover:bg-red-400');
            
            return (
              <div key={i} className={`flex-1 flex flex-col justify-end h-full group relative max-w-[50px] ${!isPlacaView ? 'cursor-pointer' : 'cursor-default'}`} onClick={() => !isPlacaView && onBarClick && onBarClick(d.label)}>
                <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[11px] font-bold px-2.5 py-1.5 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none transition-opacity border border-slate-700 z-50">
                  {d.label}: <span className={isSuccess ? 'text-emerald-300' : 'text-red-300'}>{d.value.toFixed(1)} dias</span>
                </span>
                <div className={`w-full ${barColor} transition-colors rounded-t-md shadow-sm border border-black/10`} style={{ height: `${pct}%` }}></div>
                <span className="absolute top-full mt-2 left-1/2 -translate-x-1/2 text-[9px] font-bold text-slate-500 truncate w-16 text-center" title={d.label}>{d.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default function PainelDisponibilidade({ rawOperacionalData = [], mapeamentoFiliais = [] }) {
  const [file, setFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [fleetData, setFleetData] = useState([]);
  const [dateHeaders, setDateHeaders] = useState([]);
  const [weeksData, setWeeksData] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [historyList, setHistoryList] = useState([]);
  const [selectedRef, setSelectedRef] = useState('');
  const [progressText, setProgressText] = useState('');
  
  // States para filtros e visões
  const [chartSelectedFilial, setChartSelectedFilial] = useState(null);
  const [selectedWeek, setSelectedWeek] = useState('ALL');
  const [viewMode, setViewMode] = useState('FILIAL'); // 'FILIAL' ou 'REGIONAL'

  const opPlacaMap = useMemo(() => {
    const map = new Map();
    if (rawOperacionalData && rawOperacionalData.length > 0) {
      rawOperacionalData.forEach(row => {
        let placa = row.placa;
        if (!placa && row.dados_originais) {
           const placaKey = Object.keys(row.dados_originais).find(k => k.toUpperCase() === 'PLACA' || k.toUpperCase() === 'PLACA VEICULO' || k.toUpperCase() === 'VEÍCULO' || k.toUpperCase() === 'VEICULO');
           if (placaKey) placa = row.dados_originais[placaKey];
        }
        
        if (placa && String(placa).trim() !== '' && String(placa).trim() !== 'N/A') {
          map.set(String(placa).trim().toUpperCase(), { filial: row.filial, regional: row.regional, supervisor: row.supervisor });
        }
      });
    }
    return map;
  }, [rawOperacionalData]);

  const opRotaMap = useMemo(() => {
    const map = new Map();
    if (rawOperacionalData && rawOperacionalData.length > 0) {
      rawOperacionalData.forEach(row => {
        if (row.id_rota) {
          map.set(String(row.id_rota).trim(), { 
            filial: row.filial, 
            regional: row.regional, 
            supervisor: row.supervisor 
          });
        }
      });
    }
    return map;
  }, [rawOperacionalData]);

  const regionalMap = useMemo(() => {
    const map = new Map();
    if (mapeamentoFiliais && mapeamentoFiliais.length > 0) {
      mapeamentoFiliais.forEach(m => {
        map.set(String(m.filial).toUpperCase(), m.regional || 'N/A');
      });
    }
    return map;
  }, [mapeamentoFiliais]);

  // Fetch History of imports
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const { data, error } = await supabase
          .from('importacoes_history')
          .select('*')
          .eq('tipo', 'Disponibilidade de Frota')
          .order('data_importacao', { ascending: false });

        if (error) {
          console.error("Erro ao buscar historico:", error);
          return;
        }

        if (data && data.length > 0) {
          setHistoryList(data);
          setSelectedRef(data[0].quinzena);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchHistory();
  }, []);

  // Fetch data when selectedRef changes
  useEffect(() => {
    if (!selectedRef) return;

    const fetchDataForRef = async () => {
      try {
        let allData = [];
        let currentStart = 0;
        const limit = 1000;
        let hasMore = true;

        while (hasMore) {
          const { data, error } = await supabase
            .from('disponibilidade_frota')
            .select('*')
            .eq('referencia', selectedRef)
            .range(currentStart, currentStart + limit - 1);

          if (error) {
            console.error(error);
            break;
          }

          if (data && data.length > 0) {
            allData = allData.concat(data);
            currentStart += limit;
            if (data.length < limit) hasMore = false;
          } else {
            hasMore = false;
          }
        }
        
        if (allData.length > 0) {
          const mapped = allData.map(d => ({
            placa: d.placa,
            modal: d.modal,
            filial: d.filial,
            timeline: d.timeline,
            metasSemana: d.metas_semana || d.metasSemana,
            diasParadoAtual: d.dias_parado_atual || d.diasParadoAtual,
            bateuTodasMetas: d.bateu_todas_metas || d.bateuTodasMetas
          }));

          if (mapped.length > 0 && mapped[0].timeline) {
            const dates = mapped[0].timeline.map(t => t.data);
            setDateHeaders(dates);

            const wMap = new Map();
            dates.forEach(d => {
              const weekStart = getInicioDaSemana(d);
              if (!wMap.has(weekStart)) wMap.set(weekStart, []);
              wMap.get(weekStart).push(d);
            });
            setWeeksData(Array.from(wMap.entries()).map(([inicio, dias]) => ({ inicio, dias })));
          }

          setFleetData(mapped);
        } else {
          setFleetData([]);
        }
      } catch (err) {
        console.error("Erro ao buscar dados do Supabase:", err);
      }
    };

    fetchDataForRef();
  }, [selectedRef]);

  const handleProcessFile = () => {
    if (!file) return;
    setIsProcessing(true);
    setProgressText('Lendo arquivo...');

    const processData = async (dataArray) => {
      let headerRowIdx = -1;
      for (let i = 0; i < Math.min(15, dataArray.length); i++) {
        if (dataArray[i] && dataArray[i].some(c => String(c).toUpperCase() === 'PLACA' || String(c).toUpperCase() === 'MODAL')) {
          headerRowIdx = i; break;
        }
      }

      if (headerRowIdx === -1) {
        alert("Cabeçalho não encontrado.");
        setIsProcessing(false);
        return;
      }

      const rawHeaders = dataArray[headerRowIdx].map(h => String(h || '').trim());
      const dates = rawHeaders.filter(h => h.includes('/') && h.length <= 5);
      setDateHeaders(dates);

      const wMap = new Map();
      dates.forEach(d => {
        const weekStart = getInicioDaSemana(d);
        if (!wMap.has(weekStart)) wMap.set(weekStart, []);
        wMap.get(weekStart).push(d);
      });
      const weeksArray = Array.from(wMap.entries()).map(([inicio, dias]) => ({ inicio, dias }));
      setWeeksData(weeksArray);

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
        const refName = monthNames[monthFromHeader] || `Mes_${monthFromHeader}`;
        
        setProgressText(`Buscando dados de ${refName}...`);

        // Fetch existing data for merging
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

        setProgressText('Mesclando histórico de veículos...');
        const mergedMap = new Map();

        // 1. Map existing DB data
        existingData.forEach(d => {
          mergedMap.set(d.placa, { 
            ...d, 
            timelineMap: new Map((d.timeline || []).map(t => [t.data, { data: t.data, rodou: t.rodou, valorOriginal: t.valorOriginal }])) 
          });
        });

        // 2. Merge new parsed data
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

        // 3. Extract and sort ALL unique dates
        const allDatesSet = new Set();
        mergedMap.forEach(v => v.timelineMap.forEach((_, dateStr) => allDatesSet.add(dateStr)));
        const allDatesArray = Array.from(allDatesSet).sort((a, b) => {
           const [d1, m1] = a.split('/'); const [d2, m2] = b.split('/');
           const currentYear = new Date().getFullYear();
           return new Date(currentYear, parseInt(m1)-1, parseInt(d1)) - new Date(currentYear, parseInt(m2)-1, parseInt(d2));
        });

        // Update global UI dates/weeks
        setDateHeaders(allDatesArray);
        const wMapGlobal = new Map();
        allDatesArray.forEach(d => {
          const weekStart = getInicioDaSemana(d);
          if (!wMapGlobal.has(weekStart)) wMapGlobal.set(weekStart, []);
          wMapGlobal.get(weekStart).push(d);
        });
        const globalWeeksArray = Array.from(wMapGlobal.entries()).map(([inicio, dias]) => ({ inicio, dias }));
        setWeeksData(globalWeeksArray);

        // 4. Recalculate KPIs based on sorted merged timeline
        const finalDataToSave = [];
        const finalMappedForUI = [];

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

           // DB object
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

           // UI object
           finalMappedForUI.push({
             placa: v.placa,
             modal: v.modal,
             filial: v.filial,
             timeline: newTimeline,
             metasSemana: newMetas,
             diasParadoAtual: ocioso,
             bateuTodasMetas: newMetas.every(m => m.bateuMeta)
           });
        });

        setProgressText('Salvando no banco de dados...');
        // We delete all for the reference because we are replacing it with the fully merged set
        await supabase.from('disponibilidade_frota').delete().eq('referencia', refName);

        const CHUNK_SIZE = 500;
        for (let i = 0; i < finalDataToSave.length; i += CHUNK_SIZE) {
          const chunk = finalDataToSave.slice(i, i + CHUNK_SIZE);
          await supabase.from('disponibilidade_frota').insert(chunk);
        }

        const newHistoryObj = {
          id: crypto.randomUUID(),
          tipo: 'Disponibilidade de Frota',
          quinzena: refName,
          qtd_registros: finalDataToSave.length,
          data_importacao: new Date().toISOString()
        };

        await supabase.from('importacoes_history').insert([newHistoryObj]);
        
        // Update history selector
        setHistoryList(prev => [newHistoryObj, ...prev]);
        setSelectedRef(refName);
        setFleetData(finalMappedForUI);

      } catch (err) {
        console.error("Erro ao salvar no Supabase", err);
      }

      setChartSelectedFilial(null);
      setIsProcessing(false);
      setProgressText('');
    };

    if (file.name.toLowerCase().endsWith('.csv')) {
      Papa.parse(file, { skipEmptyLines: true, worker: true, complete: (res) => processData(res.data), error: (err) => { alert(err.message); setIsProcessing(false); } });
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const workbook = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
          const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1 });
          processData(jsonData);
        } catch (err) { alert(err.message); setIsProcessing(false); }
      };
      reader.readAsArrayBuffer(file);
    }
  };

  const enrichedFleetData = useMemo(() => {
    return fleetData.map(d => {
      let opData = null;
      
      // Procura a última rota válida na timeline para pegar a base mais recente
      if (d.timeline && d.timeline.length > 0) {
         for (let i = d.timeline.length - 1; i >= 0; i--) {
            const val = String(d.timeline[i].valorOriginal || '').trim();
            if (val && val !== '0' && !val.toUpperCase().includes('NÃO') && !val.toUpperCase().includes('NAO')) {
               if (opRotaMap.has(val)) {
                  opData = opRotaMap.get(val);
                  break;
               }
            }
         }
      }

      // Fallback para a busca por placa
      if (!opData) {
        const placaStr = String(d.placa).toUpperCase().trim();
        opData = opPlacaMap.get(placaStr);
      }
      
      const opFilial = opData ? opData.filial : null;
      const opRegional = opData ? opData.regional : null;
      const opSupervisor = opData && opData.supervisor ? opData.supervisor : 'N/A';
      
      const isFilialDivergent = opFilial && opFilial.toUpperCase() !== String(d.filial).toUpperCase();
      const regional = opRegional || regionalMap.get(String(d.filial).toUpperCase()) || 'Sem Regional';
      
      return {
        ...d,
        opFilial,
        isFilialDivergent,
        regional,
        opSupervisor
      };
    });
  }, [fleetData, opPlacaMap, opRotaMap, regionalMap]);

  const filteredData = useMemo(() => {
    let filtered = enrichedFleetData;
    
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      filtered = filtered.filter(d => 
        d.placa.toLowerCase().includes(lowerSearch) || 
        d.filial.toLowerCase().includes(lowerSearch) ||
        d.regional.toLowerCase().includes(lowerSearch) ||
        d.modal.toLowerCase().includes(lowerSearch)
      );
    }
    
    if (chartSelectedFilial) {
       filtered = filtered.filter(d => (viewMode === 'REGIONAL' ? d.regional === chartSelectedFilial : d.filial === chartSelectedFilial));
    }
    
    return filtered;
  }, [enrichedFleetData, searchTerm, chartSelectedFilial, viewMode]);

  const chartData = useMemo(() => {
    if (enrichedFleetData.length === 0) return { evolution: [], drilldown: [] };
    const evolMap = new Map();
    const drillMap = new Map();

    enrichedFleetData.forEach(car => {
      const isSelected = chartSelectedFilial && (viewMode === 'REGIONAL' ? car.regional === chartSelectedFilial : car.filial === chartSelectedFilial);
      const includeInEvol = !chartSelectedFilial || isSelected;

      car.metasSemana.forEach(meta => {
        if (selectedWeek !== 'ALL' && meta.semanaInicio !== selectedWeek) return;
        
        if (includeInEvol) {
          if (!evolMap.has(meta.semanaInicio)) evolMap.set(meta.semanaInicio, { sum: 0, count: 0 });
          evolMap.get(meta.semanaInicio).sum += meta.diasRodados;
          evolMap.get(meta.semanaInicio).count += 1;
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
      label: semana, value: stats.sum / stats.count
    })).sort((a, b) => {
      const [d1, m1] = a.label.split('/'); const [d2, m2] = b.label.split('/');
      return new Date(ANO_REFERENCIA, parseInt(m1)-1, parseInt(d1)) - new Date(ANO_REFERENCIA, parseInt(m2)-1, parseInt(d2));
    });

    const drilldown = Array.from(drillMap.entries()).map(([key, stats]) => ({
      label: key, value: stats.sum / stats.count
    })).sort((a, b) => a.value - b.value).slice(0, 15); // Worst offenders first

    return { evolution, drilldown };
  }, [enrichedFleetData, chartSelectedFilial, selectedWeek, viewMode]);

  const kpis = useMemo(() => {
    let base = enrichedFleetData;
    if (selectedWeek !== 'ALL') {
       // Filter KPIs to only consider the selected week's meta
       const total = base.length;
       if (total === 0) return { total: 0, criticos: 0, ociososHoje: 0, metaBatida: 0 };
       const criticos = base.filter(d => d.diasParadoAtual >= 3).length;
       const ociososHoje = base.filter(d => d.diasParadoAtual > 0).length;
       const metaBatida = base.filter(d => {
          const weekMeta = d.metasSemana.find(m => m.semanaInicio === selectedWeek);
          return weekMeta && weekMeta.bateuMeta;
       }).length;
       return { total, criticos, ociososHoje, metaBatida };
    } else {
       const total = base.length;
       if (total === 0) return { total: 0, criticos: 0, ociososHoje: 0, metaBatida: 0 };
       const criticos = base.filter(d => d.diasParadoAtual >= 3).length;
       const ociososHoje = base.filter(d => d.diasParadoAtual > 0).length;
       const metaBatida = base.filter(d => d.bateuTodasMetas).length;
       return { total, criticos, ociososHoje, metaBatida };
    }
  }, [enrichedFleetData, selectedWeek]);

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-800">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-600 rounded-2xl">
              <Truck className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-800 tracking-tight">Disponibilidade de Frota</h1>
              <p className="text-slate-500 font-medium">Análise de ociosidade e ofensores (Meta Operacional: 6 Dias).</p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 shadow-sm">
              <History className="w-5 h-5 text-indigo-500" />
              <select 
                value={selectedRef} 
                onChange={e => setSelectedRef(e.target.value)}
                className="bg-transparent text-sm font-bold text-slate-700 focus:outline-none cursor-pointer outline-none w-32"
              >
                {historyList.length === 0 && <option value="">Sem Histórico</option>}
                {historyList.map(h => (
                  <option key={h.id || h.quinzena} value={h.quinzena}>{h.quinzena}</option>
                ))}
              </select>
            </div>
            
            <label className="flex items-center justify-center gap-2 bg-slate-50 hover:bg-slate-100 text-slate-700 px-4 py-3 rounded-xl cursor-pointer transition-colors border border-slate-200 font-bold shadow-sm">
              <UploadCloud className="w-5 h-5 text-indigo-500" />
              <span className="truncate max-w-[200px]">{file ? file.name : "Anexar Planilha"}</span>
              <input type="file" accept=".csv, .xlsx" onChange={e => setFile(e.target.files[0])} className="hidden" />
            </label>
            <button 
              onClick={handleProcessFile}
              disabled={isProcessing || !file}
              className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-xl font-bold shadow-md transition-all disabled:opacity-50"
            >
              {isProcessing ? (
                 <>
                   <Loader2 className="w-5 h-5 animate-spin" />
                   {progressText || 'Processando...'}
                 </>
              ) : (
                 <>
                   <FileSpreadsheet className="w-5 h-5" />
                   Processar Base
                 </>
              )}
            </button>
          </div>
        </div>

        {enrichedFleetData.length === 0 ? (
          <div className="bg-white p-12 rounded-3xl shadow-sm border border-slate-200 text-center flex flex-col items-center justify-center min-h-[400px]">
            <CalendarDays className="w-16 h-16 text-slate-300 mb-4" />
            <h2 className="text-xl font-bold text-slate-600 mb-2">Aguardando Planilha</h2>
            <p className="text-slate-400 max-w-md">Anexe a planilha e o sistema vai cruzar os dados, salvar no Supabase e gerar os gráficos.</p>
          </div>
        ) : (
          <>
            {/* KPI CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5"><Truck className="w-16 h-16 text-indigo-600" /></div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">Total de Veículos</span>
                <span className="text-3xl font-black text-slate-800">{kpis.total}</span>
              </div>
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5"><Calendar className="w-16 h-16 text-yellow-600" /></div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">Ociosos (Último dia)</span>
                <span className="text-3xl font-black text-yellow-600">{kpis.ociososHoje}</span>
              </div>
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5"><AlertTriangle className="w-16 h-16 text-red-600" /></div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">Críticos (≥ 3 dias)</span>
                <span className="text-3xl font-black text-red-600">{kpis.criticos}</span>
              </div>
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5"><CheckCircle2 className="w-16 h-16 text-emerald-600" /></div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">Compliance {selectedWeek !== 'ALL' ? `(Sem. ${selectedWeek})` : '(Geral)'}</span>
                <span className="text-3xl font-black text-emerald-600">{((kpis.metaBatida / kpis.total) * 100).toFixed(1)}%</span>
              </div>
            </div>

            {/* CHARTS */}
            <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 border-b border-slate-100 pb-4 gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-50 rounded-lg"><BarChart3 className="w-6 h-6 text-indigo-600" /></div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-800">{chartSelectedFilial ? `Análise: ${chartSelectedFilial}` : 'Produtividade: Ofensores'}</h2>
                  </div>
                </div>
                
                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                  {/* SELETOR DE VISÃO (REGIONAL VS FILIAL) */}
                  {!chartSelectedFilial && (
                    <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-inner">
                      <button 
                        onClick={() => setViewMode('REGIONAL')} 
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'REGIONAL' ? 'bg-white shadow text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                        Visão Regional
                      </button>
                      <button 
                        onClick={() => setViewMode('FILIAL')} 
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'FILIAL' ? 'bg-white shadow text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                        Visão Filial
                      </button>
                    </div>
                  )}

                  {/* SELETOR DE SEMANA */}
                  <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
                    <Calendar className="w-4 h-4 text-indigo-500" />
                    <select 
                      value={selectedWeek} 
                      onChange={e => setSelectedWeek(e.target.value)}
                      className="bg-transparent text-sm font-bold text-slate-700 focus:outline-none cursor-pointer"
                    >
                      <option value="ALL">Todas as Semanas</option>
                      {weeksData.map(w => (
                        <option key={w.inicio} value={w.inicio}>Semana {w.inicio}</option>
                      ))}
                    </select>
                  </div>

                  {chartSelectedFilial && (
                    <button onClick={() => setChartSelectedFilial(null)} className="flex items-center gap-2 text-xs font-bold text-indigo-600 bg-indigo-50 px-4 py-2 rounded-xl hover:bg-indigo-100 transition-colors border border-indigo-200 shadow-sm">
                      <ArrowUp className="w-4 h-4 -rotate-90" /> Voltar
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200">
                  <h3 className="text-sm font-bold text-slate-600 uppercase tracking-wider mb-2 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-indigo-500" /> Evolução Semanal</h3>
                  <EvolutionLineChart data={chartData.evolution} />
                </div>
                <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 relative">
                  <h3 className="text-sm font-bold text-slate-600 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-500" /> 
                    {chartSelectedFilial ? 'Veículos Ofensores' : `Ofensores por ${viewMode === 'REGIONAL' ? 'Regional' : 'Filial'}`}
                  </h3>
                  <DrilldownBarChart data={chartData.drilldown} onBarClick={(label) => setChartSelectedFilial(label)} isPlacaView={!!chartSelectedFilial} />
                </div>
              </div>
            </div>

            {/* HEATMAP TABLE */}
            <div className="bg-slate-900 rounded-3xl shadow-xl border border-slate-800 overflow-hidden flex flex-col relative text-slate-300">
              <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
              
              <div className="p-6 border-b border-slate-800 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 bg-slate-950/50 relative z-10">
                <div className="relative w-full xl:w-80">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Search className="h-4 w-4 text-slate-500" /></div>
                  <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="block w-full pl-10 pr-3 py-2.5 border border-slate-700 rounded-xl leading-5 bg-[#13131a] placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium text-white shadow-inner" placeholder="Buscar placa, filial, regional..." />
                </div>
                <div className="flex flex-wrap items-center gap-3 text-[10px] sm:text-xs font-bold text-slate-400 bg-[#13131a] px-4 py-2.5 rounded-xl border border-slate-800">
                  <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div> Rodou na Base</div>
                  <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]"></div> Rodou em Outra Base</div>
                  <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.5)]"></div> 1 dia parado</div>
                  <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]"></div> 2 dias seguidos</div>
                  <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"></div> 3+ dias seguidos</div>
                </div>
              </div>

              <div className="overflow-x-auto w-full max-h-[600px] custom-scrollbar relative z-10">
                <table className="w-full text-left border-collapse min-w-max">
                  <thead className="bg-[#1e1e24] sticky top-0 z-20 shadow-md">
                    <tr>
                      <th className="py-4 px-5 font-bold border-b border-slate-700 text-slate-300 sticky left-0 bg-[#1e1e24] z-30 shadow-[4px_0_10px_-4px_rgba(0,0,0,0.5)] uppercase tracking-wider text-xs">Veículo / Filial</th>
                      {dateHeaders.map((date, idx) => {
                         const isInSelectedWeek = selectedWeek === 'ALL' || weeksData.find(w => w.inicio === selectedWeek)?.dias.includes(date);
                         return (
                           <th key={idx} className={`py-4 px-1.5 font-bold border-b border-r border-slate-700 text-center text-[10px] min-w-[36px] transition-colors ${isInSelectedWeek ? 'text-indigo-300' : 'text-slate-600'}`}>
                              {date}
                           </th>
                         );
                      })}
                      {weeksData.map((w, idx) => {
                         const isSelected = selectedWeek === 'ALL' || selectedWeek === w.inicio;
                         return (
                           <th key={`week-${idx}`} className={`py-4 px-3 font-bold border-b border-l-2 border-l-slate-700 border-slate-700 text-center text-[10px] transition-colors ${isSelected ? 'text-indigo-400 bg-indigo-900/10' : 'text-slate-600'}`}>
                             Meta Sem. <br/> (Início {w.inicio})
                           </th>
                         );
                      })}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {filteredData.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/50 transition-colors group">
                        <td className="py-3 px-5 border-b border-slate-800/50 sticky left-0 bg-slate-900 group-hover:bg-slate-800/80 z-10 shadow-[4px_0_10px_-4px_rgba(0,0,0,0.3)]">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                               <span className="font-bold text-white text-sm">{row.placa}</span>
                               {row.isFilialDivergent && (
                                  <div className="flex items-center gap-1 bg-red-900/40 text-red-400 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border border-red-800/50" title={`A placa realizou rotas na filial ${row.opFilial} no Operacional, mas está registrada em ${row.filial} na planilha.`}>
                                     <AlertTriangle className="w-3 h-3" /> Operacional: {row.opFilial}
                                  </div>
                               )}
                            </div>
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{row.regional} • {row.filial} • {row.modal} • Sup: {row.opSupervisor}</span>
                          </div>
                        </td>
                        {row.timeline.map((dia, dIdx) => {
                          const isInSelectedWeek = selectedWeek === 'ALL' || weeksData.find(w => w.inicio === selectedWeek)?.dias.includes(dia.data);
                          
                          const rotaInfo = dia.rodou ? opRotaMap.get(String(dia.valorOriginal).trim()) : null;
                          const divergenteDia = rotaInfo && rotaInfo.filial && String(rotaInfo.filial).toUpperCase() !== String(row.filial).toUpperCase();
                          
                          let cor = 'bg-slate-800 border-slate-700'; let textColor = 'text-slate-600';
                          let titleStr = `${dia.data} | Rota: ${dia.valorOriginal}`;
                          if (divergenteDia) titleStr += ` | (Rodou na Filial ${rotaInfo.filial})`;

                          if (dia.rodou) { 
                             cor = divergenteDia ? 'bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.3)] border-indigo-400' : 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)] border-emerald-400'; 
                             textColor = 'text-white'; 
                          } 
                          else if (dia.ociosoConsecutivo === 1) { cor = 'bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.3)] border-yellow-400'; textColor = 'text-yellow-900'; } 
                          else if (dia.ociosoConsecutivo === 2) { cor = 'bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.3)] border-orange-400'; textColor = 'text-white'; } 
                          else if (dia.ociosoConsecutivo >= 3) { cor = 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.3)] border-red-400'; textColor = 'text-white'; }

                          return (
                            <td key={dIdx} className={`p-1 border-b border-r border-slate-800/50 text-center transition-opacity ${isInSelectedWeek ? 'opacity-100' : 'opacity-20'}`}>
                              <div className={`w-full h-8 flex items-center justify-center rounded-md border text-[10px] font-black transition-transform hover:scale-110 cursor-help ${cor} ${textColor}`} title={titleStr}>
                                {dia.rodou ? <CheckCircle2 className="w-3.5 h-3.5 opacity-90" /> : dia.ociosoConsecutivo}
                              </div>
                            </td>
                          );
                        })}
                        {row.metasSemana.map((meta, wIdx) => {
                          const isSelected = selectedWeek === 'ALL' || selectedWeek === meta.semanaInicio;
                          return (
                            <td key={`meta-${wIdx}`} className={`py-2 px-3 border-b border-l-2 border-l-slate-700 border-slate-800/50 text-center transition-opacity ${isSelected ? 'opacity-100 bg-indigo-900/10' : 'opacity-20'}`}>
                              <div className={`flex flex-col items-center justify-center px-2 py-1.5 rounded-lg border ${meta.bateuMeta ? 'bg-emerald-900/30 border-emerald-500/30' : 'bg-red-900/30 border-red-500/30'}`}>
                                <span className={`text-[10px] font-black ${meta.bateuMeta ? 'text-emerald-400' : 'text-red-400'}`}>{meta.diasRodados} / 6</span>
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
