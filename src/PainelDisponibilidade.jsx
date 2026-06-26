import React, { useState, useMemo, useEffect } from 'react';
import { 
  Truck, AlertTriangle, CalendarDays, CheckCircle2, XCircle, Search, 
  UploadCloud, FileSpreadsheet, Loader2, Calendar, TrendingUp, BarChart3, ArrowUp, History
} from 'lucide-react';
import { supabase } from './supabase';

const ANO_REFERENCIA = 2026;

const getInicioDaSemana = (dataString) => {
  if (!dataString) return '';
  const [dia, mes] = dataString.split('/');
  if (!dia || !mes) return '';
  const data = new Date(ANO_REFERENCIA, parseInt(mes) - 1, parseInt(dia));
  
  const dt = new Date(data.getTime());
  dt.setHours(0, 0, 0, 0);
  dt.setDate(dt.getDate() + 4 - (dt.getDay() || 7));
  const yearStart = new Date(dt.getFullYear(), 0, 1);
  const weekNo = Math.ceil((((dt - yearStart) / 86400000) + 1) / 7);
  return `W${weekNo}`;
};

const EvolutionLineChart = ({ data, targetValue = 6, yMax = 7, heightClass = "h-[300px]", isPercentage = false }) => {
  const safeData = data || [];
  if (safeData.length === 0) return <div className={`w-full ${heightClass} flex items-center justify-center text-slate-400`}>Sem dados suficientes.</div>;

  const yAxisSteps = isPercentage ? [100, 75, 50, 25, 0] : [7, 6, 4, 2, 0];
  const targetY = 100 - (targetValue / yMax) * 100;

  return (
    <div className={`w-full ${heightClass} flex flex-col pt-6 pb-8 relative`}>
      <div className="flex-1 flex relative mt-2">
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
          {yAxisSteps.map((step, idx) => (
            <div key={idx} className="w-full border-t border-slate-200 flex items-center justify-between" style={{ height: step === 0 ? '0px' : 'auto', marginTop: step === yMax ? '-10px' : '0' }}>
              <span className="text-[10px] font-bold text-slate-400 bg-transparent pr-2 -translate-y-1/2">{step}{isPercentage ? '%' : ''}</span>
            </div>
          ))}
        </div>
        <div className="absolute w-full z-10 pointer-events-none flex items-center pr-2" style={{ top: `${targetY}%`, transform: 'translateY(-50%)' }}>
          <div className="flex-1 border-t-2 border-dashed border-emerald-500 opacity-70"></div>
          <span className="text-[10px] font-black text-emerald-500 bg-[#0f0f11] px-2 py-0.5 rounded ml-2 border border-emerald-500/30 shadow-sm">META ({targetValue}{isPercentage ? '%' : ''})</span>
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
                  Semana {d.label}: <span className="text-blue-300">{d.value.toFixed(1)}{isPercentage ? '%' : ' dias'}</span>
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
        <div className="absolute w-full z-10 pointer-events-none flex items-center pr-2" style={{ bottom: `${targetY}%`, transform: 'translateY(50%)' }}>
          <div className="flex-1 border-t-2 border-dashed border-emerald-500 opacity-70"></div>
          <span className="text-[10px] font-black text-emerald-500 bg-[#0f0f11] px-2 py-0.5 rounded ml-2 border border-emerald-500/30 shadow-sm">META ({targetValue})</span>
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
  const [fleetData, setFleetData] = useState([]);
  const [weeksData, setWeeksData] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedModal, setSelectedModal] = useState('ALL');
  const [showOnlyDivergent, setShowOnlyDivergent] = useState(false);
  const [historyList, setHistoryList] = useState([]);
  const [selectedRef, setSelectedRef] = useState('');
  const [chartSelectedFilial, setChartSelectedFilial] = useState(null);
  const [selectedWeek, setSelectedWeek] = useState('ALL');
  const [viewMode, setViewMode] = useState('FILIAL');
  const [opRotaMap, setOpRotaMap] = useState(new Map());
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressText, setProgressText] = useState('');
  const [file, setFile] = useState(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const { data, error } = await supabase
          .from('importacoes_history')
          .select('*')
          .eq('tipo', 'Disponibilidade de Frota')
          .order('data_importacao', { ascending: false });

        if (!error && data && data.length > 0) {
          const uniqueRefs = Array.from(new Set(data.map(item => item.quinzena)));
          const uniqueHistory = uniqueRefs.map(q => data.find(item => item.quinzena === q));
          setHistoryList(uniqueHistory);
          setSelectedRef('LATEST_3');
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchHistory();
  }, []);

  useEffect(() => {
    if (!selectedRef) return;

    const fetchDataForRef = async () => {
      try {
        let allData = [];
        let currentStart = 0;
        const limit = 1000;
        let hasMore = true;

        let refsToFetch = [selectedRef];
        if (selectedRef === 'LATEST_3') {
           refsToFetch = historyList.slice(0, 3).map(h => h.quinzena);
        }

        while (hasMore) {
          const { data, error } = await supabase
            .from('disponibilidade_frota')
            .select('*')
            .in('referencia', refsToFetch)
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
          const allDatesSet = new Set();
          allData.forEach(d => {
             if(d.timeline) d.timeline.forEach(t => allDatesSet.add(t.data));
          });
          
          const allDatesArray = Array.from(allDatesSet).sort((a, b) => {
             const [d1, m1] = a.split('/'); const [d2, m2] = b.split('/');
             return new Date(ANO_REFERENCIA, parseInt(m1)-1, parseInt(d1)) - new Date(ANO_REFERENCIA, parseInt(m2)-1, parseInt(d2));
          });
          
          const wMap = new Map();
          allDatesArray.forEach(d => {
            const weekStart = getInicioDaSemana(d);
            if (!wMap.has(weekStart)) wMap.set(weekStart, []);
            wMap.get(weekStart).push(d);
          });
          
          let weeksArray = Array.from(wMap.entries()).map(([inicio, dias]) => ({ inicio, dias }));
          
          // Se for "Últimos 3 Períodos", garantimos que mostre no máximo as 3 semanas mais recentes
          if (selectedRef === 'LATEST_3' && weeksArray.length > 3) {
             weeksArray = weeksArray.slice(-3);
          }
          setWeeksData(weeksArray);
          
          const allowedDates = new Set();
          weeksArray.forEach(w => w.dias.forEach(d => allowedDates.add(d)));
          const filteredDatesArray = allDatesArray.filter(d => allowedDates.has(d));
          const allowedWeeks = new Set(weeksArray.map(w => w.inicio));

          const mergedByPlaca = new Map();
          allData.forEach(d => {
             if (!mergedByPlaca.has(d.placa)) {
                mergedByPlaca.set(d.placa, { ...d, timelineMap: new Map(), metasMap: new Map() });
             }
             const existing = mergedByPlaca.get(d.placa);
             
             if (d.filial && d.filial !== 'N/A') existing.filial = d.filial;
             if (d.modal && d.modal !== 'N/A') existing.modal = d.modal;
             
             if (d.timeline) {
               d.timeline.forEach(t => existing.timelineMap.set(t.data, t));
             }
             
             const metas = d.metas_semana || d.metasSemana || [];
             metas.forEach(m => existing.metasMap.set(m.semanaInicio, m));
          });

          const finalMergedData = Array.from(mergedByPlaca.values()).map(existing => {
            let ocioso = 0;
            const fullTimeline = filteredDatesArray.map(date => {
              const t = existing.timelineMap.get(date);
              if (t) {
                 if (t.rodou) ocioso = 0; else ocioso++;
                 return { ...t, ociosoConsecutivo: ocioso };
              } else {
                 ocioso++;
                 return { data: date, rodou: false, ociosoConsecutivo: ocioso, valorOriginal: '' };
              }
            });

            let metasSemana = Array.from(existing.metasMap.values());
            if (selectedRef === 'LATEST_3') {
               metasSemana = metasSemana.filter(m => allowedWeeks.has(m.semanaInicio));
            }
            metasSemana.sort((a, b) => {
               const w1 = parseInt(a.semanaInicio.replace('W','')) || 0;
               const w2 = parseInt(b.semanaInicio.replace('W','')) || 0;
               return w1 - w2;
            });

            const metasAtivas = metasSemana.filter(m => m.diasRodados > 0);
            const bateuTodas = metasAtivas.length > 0 ? metasAtivas.every(m => m.bateuMeta) : false;

            return {
              placa: existing.placa,
              modal: existing.modal,
              filial: existing.filial,
              timeline: fullTimeline,
              metasSemana,
              diasParadoAtual: ocioso,
              bateuTodasMetas: bateuTodas
            };
          });

          setFleetData(finalMergedData);
        } else {
          setFleetData([]);
        }
      } catch (err) {
        console.error("Erro ao buscar dados do Supabase:", err);
      }
    };

    fetchDataForRef();
  }, [selectedRef, historyList]);

  const autoClassifiedFleetData = useMemo(() => {
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

  const filialConfigMap = useMemo(() => {
    const map = new Map();
    mapeamentoFiliais.forEach(f => {
      if (f.filial) map.set(f.filial.toUpperCase(), { regional: f.regional || 'N/A', supervisor: f.supervisor || 'N/A' });
    });
    return map;
  }, [mapeamentoFiliais]);

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
          const { data, error } = await supabase.from('operacional').select('id_rota, filial').in('id_rota', chunk);
          if (!error && data) routeData = routeData.concat(data);
        }
        const newRotaMap = new Map();
        routeData.forEach(row => {
          if (row.id_rota) {
             const rt = String(row.id_rota).trim();
             if (!newRotaMap.has(rt)) newRotaMap.set(rt, { filial: row.filial });
          }
        });
        setOpRotaMap(newRotaMap);
      } catch (err) { console.error("Erro ao buscar mappings", err); }
    };
    fetchMappings();
  }, [autoClassifiedFleetData]);

  const enrichedFleetData = useMemo(() => {
    return autoClassifiedFleetData.filter(car => selectedModal === 'ALL' || car.modal === selectedModal).map(car => {
      const pFilial = car.filial ? car.filial.toUpperCase() : '';
      const conf = filialConfigMap.get(pFilial);
      const regional = conf ? conf.regional : 'N/A';
      const supervisor = conf ? conf.supervisor : 'N/A';
      let isFilialDivergent = false;
      let opFilial = '';
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
      return { ...car, regional, opSupervisor: supervisor, isFilialDivergent, opFilial };
    });
  }, [autoClassifiedFleetData, opRotaMap, filialConfigMap, selectedModal]);

  const filteredData = useMemo(() => {
    let filtered = enrichedFleetData.filter(car => {
      if (viewMode === 'FILIAL') return !chartSelectedFilial || car.filial === chartSelectedFilial;
      if (viewMode === 'REGIONAL') return !chartSelectedFilial || car.regional === chartSelectedFilial;
      return true;
    }).filter(car => {
       if (showOnlyDivergent) return car.isFilialDivergent;
       return true;
    });
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
  }, [enrichedFleetData, searchTerm, chartSelectedFilial, viewMode, showOnlyDivergent]);

  const chartData = useMemo(() => {
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
      if (a.label.startsWith('W') && b.label.startsWith('W')) {
        const w1 = parseInt(a.label.replace('W', ''), 10) || 0;
        const w2 = parseInt(b.label.replace('W', ''), 10) || 0;
        return w1 - w2;
      } else {
        const [d1, m1] = a.label.split('/'); const [d2, m2] = b.label.split('/');
        return new Date(ANO_REFERENCIA, parseInt(m1)-1, parseInt(d1)) - new Date(ANO_REFERENCIA, parseInt(m2)-1, parseInt(d2));
      }
    });

    const drilldown = Array.from(drillMap.entries()).map(([key, stats]) => ({
      label: key, value: stats.sum / stats.count
    })).sort((a, b) => a.value - b.value).slice(0, 15);

    return { evolution, drilldown };
  }, [enrichedFleetData, viewMode, chartSelectedFilial, selectedWeek]);

  const kpis = useMemo(() => {
    const base = enrichedFleetData;
    let totalDiasRodados = 0;
    let totalDiasPossiveis = 0;

    let diasDaSemana = [];
    if (selectedWeek !== 'ALL') {
      diasDaSemana = weeksData.find(w => w.inicio === selectedWeek)?.dias || [];
    }

    let criticos = 0;
    let ociososHoje = 0;

    base.forEach(d => {
      d.metasSemana.forEach(m => {
        if (selectedWeek === 'ALL' || m.semanaInicio === selectedWeek) {
          totalDiasRodados += m.diasRodados;
          totalDiasPossiveis += m.totalDiasAmostra;
        }
      });

      if (selectedWeek === 'ALL') {
        if (d.diasParadoAtual >= 3) criticos++;
        if (d.diasParadoAtual > 0) ociososHoje++;
      } else if (diasDaSemana.length > 0) {
        const lastDay = diasDaSemana[diasDaSemana.length - 1];
        const t = d.timeline.find(x => x.data === lastDay);
        const ociosoCount = t ? t.ociosoConsecutivo : 0;
        if (ociosoCount >= 3) criticos++;
        if (ociosoCount > 0) ociososHoje++;
      }
    });
    
    const total = base.length;
    const metaBatida = base.filter(d => {
        const weekMeta = selectedWeek !== 'ALL' ? d.metasSemana.find(m => m.semanaInicio === selectedWeek) : null;
        return selectedWeek !== 'ALL' ? (weekMeta && weekMeta.bateuMeta) : d.bateuTodasMetas;
    }).length;
    const mediaUtilizacao = totalDiasPossiveis > 0 ? (totalDiasRodados / totalDiasPossiveis) * 100 : 0;
    
    return { total, criticos, ociososHoje, metaBatida, mediaUtilizacao };
  }, [enrichedFleetData, selectedWeek, weeksData]);

  const dateHeaders = useMemo(() => {
    if (fleetData.length > 0 && fleetData[0].timeline) {
      return fleetData[0].timeline.map(t => t.data);
    }
    return [];
  }, [fleetData]);

  const metaHeaders = useMemo(() => {
    if (fleetData.length > 0 && fleetData[0].metasSemana) {
      return fleetData[0].metasSemana.map(m => m.semanaInicio);
    }
    return [];
  }, [fleetData]);

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
        </div>

        {enrichedFleetData.length === 0 ? (
          <div className="bg-white p-12 rounded-3xl shadow-sm border border-slate-200 text-center flex flex-col items-center justify-center min-h-[400px]">
            <CalendarDays className="w-16 h-16 text-slate-300 mb-4" />
            <h2 className="text-xl font-bold text-slate-600 mb-2">Aguardando Planilha</h2>
            <p className="text-sm text-slate-400 max-w-md mx-auto">Importe os dados de Disponibilidade pelo menu Importador Inteligente para visualizar o heatmap da frota.</p>
          </div>
        ) : (
          <>
            {/* KPI CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex items-center justify-between group hover:border-indigo-300 transition-colors">
                <div>
                  <p className="text-sm font-bold text-slate-500 mb-1">Total Analisado</p>
                  <div className="flex items-end gap-2">
                    <h3 className="text-3xl font-black text-slate-800 group-hover:text-indigo-600 transition-colors">{kpis.total}</h3>
                    <span className="text-xs font-bold text-slate-400 mb-1">veículos</span>
                  </div>
                </div>
                <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Truck className="w-8 h-8 text-indigo-400" />
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex items-center justify-between group hover:border-emerald-300 transition-colors">
                <div>
                  <p className="text-sm font-bold text-slate-500 mb-1">Frota Compliance</p>
                  <div className="flex items-end gap-2">
                    <h3 className="text-3xl font-black text-slate-800 group-hover:text-emerald-600 transition-colors">
                      {kpis.total > 0 ? ((kpis.metaBatida / kpis.total) * 100).toFixed(1) : 0}%
                    </h3>
                  </div>
                </div>
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <TrendingUp className="w-8 h-8 text-emerald-400" />
                </div>
              </div>

              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex items-center justify-between group hover:border-orange-300 transition-colors">
                <div>
                  <p className="text-sm font-bold text-slate-500 mb-1">Ociosos (1+ Dias)</p>
                  <div className="flex items-end gap-2">
                    <h3 className="text-3xl font-black text-slate-800 group-hover:text-orange-600 transition-colors">{kpis.ociososHoje}</h3>
                    <span className="text-xs font-bold text-slate-400 mb-1">veículos</span>
                  </div>
                </div>
                <div className="w-14 h-14 rounded-2xl bg-orange-50 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <AlertTriangle className="w-8 h-8 text-orange-400" />
                </div>
              </div>

              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex items-center justify-between group hover:border-red-300 transition-colors">
                <div>
                  <p className="text-sm font-bold text-slate-500 mb-1">Críticos (3+ Dias)</p>
                  <div className="flex items-end gap-2">
                    <h3 className="text-3xl font-black text-slate-800 group-hover:text-red-600 transition-colors">{kpis.criticos}</h3>
                    <span className="text-xs font-bold text-slate-400 mb-1">veículos</span>
                  </div>
                </div>
                <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <XCircle className="w-8 h-8 text-red-400" />
                </div>
              </div>
              
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
                
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={selectedModal}
                      onChange={(e) => setSelectedModal(e.target.value)}
                      className="px-4 py-2.5 bg-slate-100 border-none rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer w-full sm:w-auto"
                    >
                      <option className="bg-[#1e1e24] text-white" value="ALL">Todos os Modais</option>
                      <option className="bg-[#1e1e24] text-white" value="Last Mile">Last Mile</option>
                      <option className="bg-[#1e1e24] text-white" value="Middle Mile">Middle Mile</option>
                    </select>
                    {weeksData.length > 0 && (
                      <select
                        value={selectedWeek}
                        onChange={(e) => setSelectedWeek(e.target.value)}
                        className="px-4 py-2.5 bg-slate-100 border-none rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer w-full sm:w-auto"
                      >
                        <option className="bg-[#1e1e24] text-white" value="ALL">Todas as Semanas</option>
                        {weeksData.map(w => (
                          <option className="bg-[#1e1e24] text-white" key={w.inicio} value={w.inicio}>{w.inicio}</option>
                        ))}
                      </select>
                    )}
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
                  <h3 className="text-sm font-bold text-slate-600 uppercase tracking-wider mb-2 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-indigo-500" /> Evolução Semanal (Utilização)</h3>
                  <EvolutionLineChart data={chartData.evolution} isPercentage={true} targetValue={95} yMax={100} />
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
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <div className="relative w-full xl:w-80">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Search className="h-4 w-4 text-slate-500" /></div>
                      <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="block w-full pl-10 pr-3 py-2.5 border border-slate-700 rounded-xl leading-5 bg-[#1e1e24] placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium text-white shadow-inner transition-colors" placeholder="Buscar placa..." />
                    </div>
                    <button
                      onClick={() => setShowOnlyDivergent(!showOnlyDivergent)}
                      className={`px-4 py-2.5 rounded-xl font-bold text-sm transition-colors border flex items-center justify-center gap-2 whitespace-nowrap ${showOnlyDivergent ? 'bg-red-900/40 border-red-500 text-red-400' : 'bg-[#1e1e24] border-slate-700 text-slate-400 hover:text-slate-300'}`}
                    >
                      <AlertTriangle className="w-4 h-4" /> Somente Divergentes
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[9px] sm:text-[10px] font-bold text-slate-400 bg-[#1e1e24] px-3 py-2 rounded-xl border border-slate-800">
                    <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]"></div> Rodou na Base</div>
                    <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_6px_rgba(99,102,241,0.5)]"></div> Rodou em Outra Base</div>
                    <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-yellow-500 shadow-[0_0_6px_rgba(234,179,8,0.5)]"></div> 1 dia parado</div>
                    <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-orange-500 shadow-[0_0_6px_rgba(249,115,22,0.5)]"></div> 2 dias seguidos</div>
                    <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.5)]"></div> 3+ dias seguidos</div>
                  </div>
                </div>

              <div className="overflow-x-auto w-full max-h-[600px] custom-scrollbar relative z-10">
                <table className="w-full text-left border-collapse min-w-max">
                  <thead className="bg-[#1e1e24] sticky top-0 z-20 shadow-md">
                    <tr>
                      <th className="py-4 px-5 font-bold border-b border-slate-700 text-slate-300 sticky left-0 bg-[#1e1e24] z-30 shadow-[4px_0_10px_-4px_rgba(0,0,0,0.5)] uppercase tracking-wider text-xs">Veículo / Filial</th>
                      {dateHeaders.map((date, idx) => (
                        <th key={idx} className="py-4 px-1.5 font-bold border-b border-r border-slate-700 text-center text-[10px] min-w-[36px]">{date}</th>
                      ))}
                      {metaHeaders.map((semana, idx) => {
                        const isSelected = selectedWeek === 'ALL' || selectedWeek === semana;
                        return (
                          <th key={`meta-head-${idx}`} className={`py-4 px-3 font-bold border-b border-l-2 border-l-slate-700 border-slate-700 text-center text-[9px] uppercase tracking-wider transition-opacity ${isSelected ? 'opacity-100 text-indigo-300' : 'opacity-20 text-slate-500'}`}>
                            Meta: {semana}
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
                                  <div className="flex items-center gap-0.5 bg-red-900/40 text-red-400 px-1 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border border-red-800/50 w-fit max-w-[90px] truncate" title={`Operacional: ${row.opFilial}`}>
                                     <AlertTriangle className="w-2.5 h-2.5 flex-shrink-0" /> OP: {row.opFilial}
                                  </div>
                                )}
                            </div>
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{row.filial}</span>
                          </div>
                        </td>
                        {row.timeline.map((dia, dIdx) => {
                          const rotaInfo = dia.rodou ? opRotaMap.get(String(dia.valorOriginal).trim()) : null;
                          const divergenteDia = rotaInfo && rotaInfo.filial && String(rotaInfo.filial).toUpperCase() !== String(row.filial).toUpperCase();
                          let cor = 'bg-slate-800 border-slate-700'; let textColor = 'text-slate-600';
                          let titleStr = `${dia.data} | Rota: ${dia.valorOriginal}`;
                          if (divergenteDia) titleStr += ` | (Rodou na Filial ${rotaInfo.filial})`;

                          const isInSelectedWeek = selectedWeek === 'ALL' || (weeksData.find(w => w.inicio === selectedWeek)?.dias.includes(dia.data));

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
