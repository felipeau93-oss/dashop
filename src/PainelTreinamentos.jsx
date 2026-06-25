import React, { useState, useMemo, useEffect } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { 
  GraduationCap, 
  AlertTriangle, 
  Users, 
  MapPin, 
  Search, 
  UploadCloud, 
  FileSpreadsheet,
  Loader2,
  History,
  Calendar,
  Clock,
  CheckCircle2,
  Copy,
  LayoutDashboard,
  Link,
  X,
  Download,
  TrendingDown,
  RefreshCw,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { supabase } from './supabase';

// Converte textos de data para um formato padronizado (DD/MM/YYYY)
const parseDataTexto = (text) => {
  if (!text) return 'N/A';
  const str = String(text).trim();
  
  const matchUS = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (matchUS) return `${matchUS[3]}/${matchUS[2]}/${matchUS[1]}`;
  
  const mesesMap = { 'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04', 'may': '05', 'jun': '06', 'jul': '07', 'aug': '08', 'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12', 'fev': '02', 'abr': '04', 'mai': '05', 'ago': '08', 'set': '09', 'out': '10', 'dez': '12' };
  
  const matchText = str.match(/^(\d{1,2})-(.*)-(\d{4})/i);
  if (matchText) {
    const mesStr = matchText[2].toLowerCase().substring(0, 3);
    const mesNum = mesesMap[mesStr] || '01';
    return `${matchText[1].padStart(2, '0')}/${mesNum}/${matchText[3]}`;
  }

  const matchBR = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (matchBR) {
    const year = matchBR[3].length === 2 ? `20${matchBR[3]}` : matchBR[3];
    return `${matchBR[1].padStart(2, '0')}/${matchBR[2].padStart(2, '0')}/${year}`;
  }

  const matchPt = str.match(/^(\d{1,2}) de ([a-z]{3})\.? de (\d{4})/i);
  if (matchPt) {
    const mesStr = matchPt[2].toLowerCase().substring(0, 3);
    const mesNum = mesesMap[mesStr] || '01';
    return `${matchPt[1].padStart(2, '0')}/${mesNum}/${matchPt[3]}`;
  }

  return str;
};

const diffDays = (dateStr) => {
  const parsed = parseDataTexto(dateStr);
  if (parsed === 'N/A') return 0;
  const parts = parsed.split('/');
  if (parts.length === 3) {
    const d = new Date(`${parts[2]}-${parts[1]}-${parts[0]}T00:00:00`);
    if (!isNaN(d.getTime())) {
      const diffTime = Math.abs(new Date() - d);
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }
  }
  return 0;
};

const getTodayDateString = () => {
  const today = new Date();
  return `${today.getFullYear()}_${String(today.getMonth() + 1).padStart(2, '0')}_${String(today.getDate()).padStart(2, '0')}`;
};

const formatBrDate = (dateStr) => {
   if (!dateStr) return '';
   const [y, m, d] = dateStr.split('_');
   return `${d}/${m}/${y}`;
};

const KpiCard = ({ title, value, subtitle, icon: Icon, valueColor, iconBgColor }) => (
  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center gap-5 hover:border-slate-300 transition-colors">
    <div className={`p-4 rounded-2xl ${iconBgColor} text-white shadow-inner`}>
      <Icon className="w-8 h-8" />
    </div>
    <div className="flex flex-col">
      <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1">{title}</span>
      <span className={`text-3xl font-black ${valueColor} leading-none tracking-tight`}>{value}</span>
      {subtitle && <span className="text-xs font-medium text-slate-400 mt-1">{subtitle}</span>}
    </div>
  </div>
);

const chartColors = [
  '#6366f1', // indigo-500
  '#a855f7', // purple-500
  '#ec4899', // pink-500
  '#ef4444', // red-500
  '#f97316', // orange-500
  '#eab308', // yellow-500
  '#22c55e', // green-500
  '#06b6d4', // cyan-500
  '#3b82f6', // blue-500
  '#8b5cf6', // violet-500
  '#10b981', // emerald-500
];

const HorizontalLeaderboard = ({ data, labelKey, valueKey, onSliceClick }) => {
  const total = data.reduce((acc, curr) => acc + curr[valueKey], 0);
  const maxVal = Math.max(...data.map(d => d[valueKey]), 1);

  return (
    <div className="flex flex-col gap-3 mt-4 pt-4 border-t border-slate-700/50 w-full overflow-y-auto custom-scrollbar max-h-[320px] pr-2">
      <div className="flex justify-between items-end mb-2">
         <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Ranking</span>
         <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total: {total}</span>
      </div>
      {data.length === 0 && <span className="text-sm text-slate-500 font-bold m-auto py-4">Nenhum dado</span>}
      {data.map((d, i) => {
        const val = d[valueKey];
        const pctOfMax = (val / maxVal) * 100;
        const pctOfTotal = ((val / total) * 100).toFixed(1);
        const color = chartColors[i % chartColors.length];
        
        return (
          <div 
            key={i} 
            onClick={() => onSliceClick && onSliceClick(d[labelKey])} 
            className="shrink-0 group relative flex items-center justify-between p-3 rounded-xl bg-[#13131a] border border-slate-800 hover:border-slate-600 cursor-pointer overflow-hidden transition-colors"
          >
            {/* Progress bar background */}
            <div 
              className="absolute left-0 top-0 bottom-0 opacity-20 transition-all duration-1000 ease-out" 
              style={{ width: `${pctOfMax}%`, backgroundColor: color }}
            ></div>
            
            {/* Content */}
            <div className="relative z-10 flex items-center gap-3 w-full py-0.5">
               <div className="w-1.5 h-10 rounded-full flex-shrink-0" style={{ backgroundColor: color }}></div>
               <div className="flex flex-col justify-center flex-1 min-w-0 gap-1">
                 <span className="font-bold text-slate-300 truncate text-sm leading-tight" title={d[labelKey]}>{d[labelKey]}</span>
                 <span className="text-[11px] font-medium text-slate-500 truncate leading-tight">{pctOfTotal}% do total</span>
               </div>
               <div className="text-xl font-black text-slate-200 ml-4 flex-shrink-0">
                  {val}
               </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

const EvolutionChart = ({ data, heightClass = "h-56" }) => {
  if (!data || data.length === 0) return null;
  
  const maxVal = Math.max(...data.map(d => d.total_linhas), 1);
  const minVal = 0;
  
  return (
    <div className={`w-full ${heightClass} flex flex-col relative mt-2 bg-[#13131a] rounded-2xl border border-slate-800 p-4`}>
      <div className="flex-1 flex items-end justify-between gap-2 relative z-10 pt-6">
         {/* Linhas de grade horizontais */}
         <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-6 z-0">
            {[100, 50, 0].map((step, i) => (
               <div key={i} className="w-full border-t border-slate-700/50 flex items-center" style={{ height: step === 0 ? '0px' : 'auto', marginTop: step === 100 ? '-6px' : '0' }}></div>
            ))}
         </div>

         {data.map((d, i) => {
            const isLast = i === data.length - 1;
            const hPct = ((d.total_linhas - minVal) / (maxVal - minVal)) * 100;
            const dtStr = d.id;
            const dtFormat = dtStr.includes('_') ? `${dtStr.split('_')[2]}/${dtStr.split('_')[1]}` : dtStr;
            
            return (
               <div key={i} className="flex-1 flex flex-col items-center justify-end h-full group relative z-10">
                  {/* Tooltip Hover */}
                  <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 text-white text-[11px] font-bold px-2 py-1 rounded shadow-lg pointer-events-none whitespace-nowrap border border-slate-600 z-50">
                     {d.total_linhas} pendências
                  </div>
                  
                  {/* Label Fixo no Topo da Barra (Opcional, mas ajuda muito) */}
                  <span className={`text-[10px] font-bold mb-1 transition-colors ${isLast ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-300'}`}>
                     {d.total_linhas}
                  </span>

                  {/* Barra */}
                  <div 
                     className={`w-full max-w-[32px] rounded-t-md transition-all duration-500 flex items-end justify-center 
                     ${isLast ? 'bg-gradient-to-t from-indigo-900 to-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.4)]' : 'bg-slate-700 group-hover:bg-slate-600'}`} 
                     style={{ height: `${Math.max(hPct, 2)}%` }} // Garante um mínimo de 2% pra barra não sumir se for 0
                  ></div>
                  
                  {/* Data Eixo X */}
                  <span className={`text-[9px] font-bold mt-2 truncate w-full text-center ${isLast ? 'text-indigo-400' : 'text-slate-500'}`}>
                     {dtFormat}
                  </span>
               </div>
            );
         })}
      </div>
    </div>
  );
};

const UnmatchedRow = ({ group, handleOpenBindModal }) => {
  const [expanded, setExpanded] = useState(false);
  return (
    <>
      <tr onClick={() => setExpanded(!expanded)} className="hover:bg-red-50/30 transition-colors cursor-pointer group">
        <td className="py-2.5 px-4 font-mono font-bold text-slate-700">
           <div className="flex items-center gap-2">
             <div className="w-4 h-4 flex items-center justify-center bg-red-100 text-red-600 rounded">
                {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
             </div>
             {group.driverId}
           </div>
        </td>
        <td className="py-2.5 px-4 font-bold text-slate-700 uppercase text-[10px]">{group.milla && group.milla !== 'N/A' ? group.milla : '-'}</td>
        <td className="py-2.5 px-4 font-bold text-slate-600">
           <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-md text-[10px]">{group.cursos.length} curso(s) pendente(s)</span>
        </td>
        <td className="py-2.5 px-4 font-medium text-slate-500">{group.ultimaRotaData}</td>
        <td className="py-2.5 px-4 text-center" onClick={e => e.stopPropagation()}>
           <button onClick={() => handleOpenBindModal(group.items[0])} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-white border border-slate-300 text-indigo-600 hover:bg-indigo-50 hover:border-indigo-300 shadow-sm transition-colors">
              <Link className="w-3 h-3" /> Vincular Manual
           </button>
        </td>
      </tr>
      {expanded && (
        <tr className="bg-slate-50/50">
           <td colSpan="5" className="px-10 py-3 border-b border-red-50/50">
             <div className="flex flex-col gap-1">
               <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Treinamentos Pendentes</span>
               {group.cursos.map((c, i) => (
                  <div key={i} className="text-xs font-bold text-slate-700 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-400"></div>
                    {c}
                  </div>
               ))}
             </div>
           </td>
        </tr>
      )}
    </>
  );
};

const DrilldownAnalysis = ({ title, dataList, groupKeys = [], labels = [], colorTheme, heightClass = "h-fit min-h-[650px]", extraColumnL1 = null }) => {
  const [path, setPath] = useState([]);
  const [sortKey, setSortKey] = useState('total');
  const [sortDir, setSortDir] = useState('desc');

  const handleSort = (key) => {
     if (sortKey === key) setSortDir(sortDir === 'desc' ? 'asc' : 'desc');
     else { setSortKey(key); setSortDir('desc'); }
  };

  const validData = useMemo(() => dataList.filter(d => d.regional !== 'Sem Regional' && d.filial !== 'DESCONHECIDA'), [dataList]);

  const level = path.length;
  const isDataLevel = level === groupKeys.length;
  const currentKey = groupKeys[level];
  const currentLabel = labels[level];

  const currentData = useMemo(() => {
      let filtered = validData;
      for (let i = 0; i < level; i++) {
         filtered = filtered.filter(d => d[groupKeys[i]] === path[i]);
      }
      if (isDataLevel) {
          return filtered.sort((a, b) => new Date(a.ultimaRotaData.split('/').reverse().join('-')) - new Date(b.ultimaRotaData.split('/').reverse().join('-')));
      }
      return filtered;
  }, [validData, groupKeys, path, level, isDataLevel]);

  const groupedData = useMemo(() => {
     if (isDataLevel) return [];
     const map = {};
     currentData.forEach(d => {
        const val = d[currentKey] || 'N/A';
        if (!map[val]) map[val] = { total: 0, original: d };
        map[val].total++;
     });
     return Object.entries(map).map(([k, v]) => ({ name: k, total: v.total, original: v.original })).sort((a, b) => {
        if (sortKey === 'total') return sortDir === 'desc' ? b.total - a.total : a.total - b.total;
        if (sortKey === 'extra' && extraColumnL1 && level === 0) {
           const valA = String(a.original[extraColumnL1.key] || '');
           const valB = String(b.original[extraColumnL1.key] || '');
           return sortDir === 'desc' ? valB.localeCompare(valA) : valA.localeCompare(valB);
        }
        return sortDir === 'desc' ? b.name.localeCompare(a.name) : a.name.localeCompare(b.name);
     });
  }, [currentData, currentKey, isDataLevel, sortKey, sortDir, extraColumnL1, level]);

  const handleRowClick = (name) => {
      setPath([...path, name]);
  };

  return (
    <div className={`bg-[#1e1e24] border border-slate-700/60 p-6 rounded-3xl shadow-xl flex flex-col w-full ${heightClass} text-slate-200`}>
      <div className="flex items-center justify-between mb-4 border-b border-slate-700/50 pb-4">
         <div className="flex flex-col">
            <h3 className="text-sm font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2">
              <LayoutDashboard className="w-5 h-5 text-indigo-500" /> {title}
            </h3>
            <div className="flex flex-wrap items-center gap-2 mt-2">
               <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md transition-colors ${level === 0 ? 'bg-indigo-900/30 text-indigo-300' : 'text-slate-500 hover:bg-slate-800 cursor-pointer'}`} onClick={() => setPath([])}>
                 Visão Geral ({labels[0]})
               </span>
               {path.map((p, idx) => (
                 <React.Fragment key={idx}>
                   <span className="text-slate-600">/</span>
                   <span 
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md transition-colors ${idx === level - 1 && !isDataLevel ? 'bg-indigo-900/30 text-indigo-300' : 'text-slate-500 hover:bg-slate-800 cursor-pointer'}`}
                      onClick={() => setPath(path.slice(0, idx + 1))}
                   >
                     {p}
                   </span>
                 </React.Fragment>
               ))}
               {isDataLevel && (
                 <>
                   <span className="text-slate-600">/</span>
                   <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md bg-indigo-900/30 text-indigo-300">Motoristas</span>
                 </>
               )}
            </div>
         </div>
         {level > 0 && (
            <button onClick={() => setPath(path.slice(0, -1))} className="text-[10px] uppercase font-black tracking-widest bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-2 rounded-xl transition-colors border border-slate-700 flex items-center gap-2">
              ← Voltar Nível
            </button>
         )}
      </div>

      <div className="flex-1 overflow-auto min-h-0 custom-scrollbar pr-2">
         {/* GROUPED DATA */}
         {!isDataLevel && (
            <div className="flex flex-col gap-1 animate-in slide-in-from-right-4 duration-300">
              <div className="grid grid-cols-12 gap-2 px-4 py-2 text-[10px] uppercase font-black tracking-widest text-slate-500 bg-[#13131a] rounded-lg">
                 <div className={`${(extraColumnL1 && level === 0) ? 'col-span-4' : 'col-span-10'} cursor-pointer hover:text-slate-300 select-none flex items-center gap-1`} onClick={() => handleSort('name')}>
                    {currentLabel} {sortKey === 'name' && (sortDir === 'desc' ? '↓' : '↑')}
                 </div>
                 {(extraColumnL1 && level === 0) && (
                    <div className="col-span-6 cursor-pointer hover:text-slate-300 select-none flex items-center gap-1" onClick={() => handleSort('extra')}>
                       {extraColumnL1.label} {sortKey === 'extra' && (sortDir === 'desc' ? '↓' : '↑')}
                    </div>
                 )}
                 <div className="col-span-2 text-right cursor-pointer hover:text-slate-300 select-none flex items-center justify-end gap-1" onClick={() => handleSort('total')}>
                    Pendentes {sortKey === 'total' && (sortDir === 'desc' ? '↓' : '↑')}
                 </div>
              </div>
              {groupedData.map((row, idx) => (
                 <div key={idx} onClick={() => handleRowClick(row.name)} className="grid grid-cols-12 gap-2 px-4 py-3 text-xs font-bold border-b border-slate-800/50 hover:bg-slate-800/80 cursor-pointer transition-colors group rounded-lg">
                    <div className={`${(extraColumnL1 && level === 0) ? 'col-span-4' : 'col-span-10'} text-slate-300 group-hover:text-indigo-300 flex items-center gap-2`}>
                      <div className={`w-2 h-2 rounded-full ${colorTheme}`}></div> {row.name}
                    </div>
                    {(extraColumnL1 && level === 0) && (
                       <div className="col-span-6 text-slate-500 font-medium flex items-center">{row.original[extraColumnL1.key]}</div>
                    )}
                    <div className="col-span-2 text-right text-indigo-400 font-black bg-indigo-900/20 px-2 py-0.5 rounded flex items-center justify-end">{row.total}</div>
                 </div>
              ))}
            </div>
         )}
         
         {/* DATA LEVEL (Motoristas) */}
         {isDataLevel && (
            <div className="flex flex-col gap-1 animate-in slide-in-from-right-4 duration-300">
               <div className="grid grid-cols-12 gap-2 px-4 py-2 text-[10px] uppercase font-black tracking-widest text-slate-500 bg-[#13131a] rounded-lg">
                 <div className="col-span-2">Driver ID</div>
                 <div className="col-span-4">Motorista</div>
                 <div className="col-span-4 text-center">Curso(s) Pendente(s)</div>
                 <div className="col-span-2 text-right">Última Rota</div>
              </div>
              <div className="flex flex-col gap-1 mt-1">
                 {currentData.map((d, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 px-4 py-3 text-[11px] font-medium border-b border-slate-800/50 hover:bg-slate-800/50 transition-colors rounded-lg bg-slate-800/20">
                       <div className="col-span-2 font-mono text-slate-400">{d.driverId}</div>
                       <div className="col-span-4 font-bold text-slate-200 flex flex-col justify-center">
                          <span>{d.nome}</span>
                          <span className="text-[9px] text-slate-500 mt-0.5">{d.filial} {d.milla && d.milla !== 'N/A' ? `(${d.milla})` : ''}</span>
                       </div>
                       <div className="col-span-4 text-center flex flex-col justify-center text-orange-400 text-[10px] font-bold">
                          {d.cursosLista ? d.cursosLista.join(', ') : d.cursoPendente}
                       </div>
                       <div className="col-span-2 text-right text-slate-400 flex items-center justify-end font-mono">{d.ultimaRotaData}</div>
                    </div>
                 ))}
              </div>
            </div>
         )}
      </div>

      {/* PIE CHART AREA */}
      {!isDataLevel && (
         <div className="mt-6 pt-2">
            <p className="text-[10px] uppercase tracking-widest font-black text-slate-600 text-center mb-2 flex items-center justify-center gap-2">
               <TrendingDown className="w-3 h-3 text-slate-500" />
               {level > 0 ? `Distribuição de ${currentLabel} em ${path[level - 1]}` : `Distribuição Geral por ${currentLabel}`}
            </p>
            <HorizontalLeaderboard 
               data={groupedData} 
               labelKey="name" 
               valueKey="total" 
               onSliceClick={(name) => handleRowClick(name)}
            />
         </div>
      )}
    </div>
  );
};

export default function PainelTreinamentos({ rawOperacionalData = [], mapeamentoFiliais = [] }) {
  const [file, setFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  
  const [rawBaseData, setRawBaseData] = useState([]);
  const [trainingData, setTrainingData] = useState([]);
  const [unmatchedDrivers, setUnmatchedDrivers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [historicoList, setHistoricoList] = useState([]);
  const [selectedUploadDate, setSelectedUploadDate] = useState('');
  
  const [manualMap, setManualMap] = useState({});
  const [showBindModal, setShowBindModal] = useState(false);
  const [bindDriver, setBindDriver] = useState(null);
  const [bindNome, setBindNome] = useState('');
  const [bindFilial, setBindFilial] = useState('');

  const groupedUnmatched = useMemo(() => {
    const map = new Map();
    unmatchedDrivers.forEach(d => {
      if (!map.has(d.driverId)) map.set(d.driverId, []);
      map.get(d.driverId).push(d);
    });
    return Array.from(map.entries()).map(([driverId, items]) => ({
      driverId,
      milla: items[0].milla,
      ultimaRotaData: items[0].ultimaRotaData,
      cursos: items.map(i => i.cursoPendente),
      items
    }));
  }, [unmatchedDrivers]);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const { data: manuais } = await supabase.from('motoristas_manuais_treinamentos').select('*');
        if (manuais) {
           const map = {};
           manuais.forEach(m => { map[m.driver_id] = { nome: m.nome, filial: m.filial }; });
           setManualMap(map);
        }

        const { data: snapshot } = await supabase.from('treinamentos_historico').select('*').order('data_atualizacao', { ascending: false });
        if (snapshot && snapshot.length > 0) {
          setHistoricoList(snapshot);
          setSelectedUploadDate(snapshot[0].id);
        } else {
           setIsFetching(false);
        }
      } catch (err) {
        console.error("Erro ao buscar dados do supabase:", err);
        setIsFetching(false);
      }
    };
    fetchInitialData();
  }, []);

  useEffect(() => {
     if (!selectedUploadDate) return;
     const fetchBaseForDate = async () => {
        setIsFetching(true);
        try {
           const { data: docSnap } = await supabase.from('treinamentos_pendentes').select('*').eq('id_historico', selectedUploadDate);
           if (docSnap) {
              const mapped = docSnap.map(row => ({
                 driverId: row.driver_id,
                 courseName: row.curso,
                 lastRouteRaw: row.ultima_rota_data,
                 milla: row.milla,
                 status: row.status
              }));
              setRawBaseData(mapped);
           } else {
              setRawBaseData([]);
           }
        } catch(e) {
           console.error("Erro", e);
        } finally {
           setIsFetching(false);
        }
     };
     fetchBaseForDate();
  }, [selectedUploadDate]);

  const [loading, setLoading] = useState(false);
  const [syncTrigger, setSyncTrigger] = useState(0);

  useEffect(() => {
    if (rawBaseData.length === 0) {
      setTrainingData([]);
      setUnmatchedDrivers([]);
      return;
    }

    const processData = async () => {
      setLoading(true);

      // Extract all unique driver IDs from the training base
      const originalIds = Array.from(new Set(rawBaseData.map(r => String(r.driverId || '').trim()))).filter(id => id && id !== 'N/A' && id !== '');
      
      // To prevent case sensitivity issues in Supabase (.in()), we will query the original, upper, and lowercase variations
      const queryIds = Array.from(new Set([
         ...originalIds, 
         ...originalIds.map(id => id.toUpperCase()), 
         ...originalIds.map(id => id.toLowerCase())
      ]));

      const opMap = new Map();
      
      // Fetch precise mapping for these drivers from Supabase in chunks to avoid limits
      if (queryIds.length > 0) {
        const chunkSize = 10; // Keep it small! Each driver can have multiple rows, so a chunk of 10 safely avoids the 1000 row limit.
        const promises = [];
        
        for (let i = 0; i < queryIds.length; i += chunkSize) {
          const chunk = queryIds.slice(i, i + chunkSize);
          promises.push(
            Promise.all([
              supabase.from('operacional').select('driver_id, motorista, filial').in('driver_id', chunk),
              supabase.from('motoristas').select('driver_id, nome').in('driver_id', chunk)
            ]).then(([opRes, motRes]) => {
              const motMap = new Map();
              if (!motRes.error && motRes.data) {
                motRes.data.forEach(m => {
                  if (m.driver_id && m.nome) {
                    motMap.set(String(m.driver_id).trim().toUpperCase(), m.nome);
                  }
                });
              }

              if (!opRes.error && opRes.data) {
                opRes.data.forEach(r => {
                  if (r.driver_id) {
                     const did = String(r.driver_id).trim().toUpperCase();
                     const officialName = motMap.get(did) || r.motorista;
                     opMap.set(did, { nome: officialName, filial: r.filial });
                  }
                });
              }
            }).catch(e => console.error("Erro ao buscar chunk do Supabase", e))
          );
        }
        
        await Promise.all(promises);
      }

      const regionalMap = new Map();
      if (mapeamentoFiliais && mapeamentoFiliais.length > 0) {
        mapeamentoFiliais.forEach(m => {
           if (m.filial && m.filial.trim() !== '') {
              regionalMap.set(String(m.filial).toUpperCase(), { regional: m.regional || 'N/A', supervisor: m.supervisor || 'N/A' });
           }
        });
      }

      const mapped = [];
      const unmatched = [];

      rawBaseData.forEach(row => {
        const driverInfo = opMap.get(String(row.driverId).trim().toUpperCase()) || manualMap[String(row.driverId).trim().toUpperCase()];
        
        const filial = driverInfo ? String(driverInfo.filial).toUpperCase() : "DESCONHECIDA";
        const mappedData = regionalMap.get(filial) || { regional: "Sem Regional", supervisor: "Sem Supervisor" };
        const regional = mappedData.regional;
        const supervisor = mappedData.supervisor;
        
        const isUnmatched = !driverInfo || filial === "DESCONHECIDA" || filial === "N/A" || regional === "Sem Regional";
        const diasSemRota = diffDays(row.lastRouteRaw);

        const item = {
          driverId: String(row.driverId || ''),
          nome: String(driverInfo ? driverInfo.nome : "NÃO LOCALIZADO"),
          filial: String(filial || ''),
          regional: String(regional || ''),
          supervisor: String(supervisor || ''),
          cursoPendente: String(row.courseName || ''),
          ultimaRotaTexto: String(row.lastRouteRaw || ''),
          ultimaRotaData: parseDataTexto(row.lastRouteRaw),
          milla: String(row.milla || ''),
          diasSemRota,
          status: String(row.status || '')
        };

        mapped.push(item);
        if (isUnmatched) {
          unmatched.push(item);
        }
      });

      setTrainingData(mapped);
      setUnmatchedDrivers(unmatched);
      setLoading(false);
    };

    processData();
  }, [rawBaseData, mapeamentoFiliais, manualMap, syncTrigger]);

  const handleProcessFile = () => {
    if (!file) return;
    setIsProcessing(true);

    const processData = async (dataArray) => {
      let headerRowIdx = -1;
      let delimiterUsed = null;

      for (let i = 0; i < Math.min(15, dataArray.length); i++) {
        const row = dataArray[i];
        if (!row) continue;
        
        if (row.some(c => String(c).toUpperCase().includes('DRIVER_ID') || String(c).toUpperCase().includes('COURSE_NAME') || String(c).toUpperCase().includes('DRIVER ID'))) {
          headerRowIdx = i; 
          break;
        }

        if (row.length === 1 && typeof row[0] === 'string') {
          const upper = row[0].toUpperCase();
          if (upper.includes('DRIVER_ID') || upper.includes('COURSE_NAME') || upper.includes('DRIVER ID')) {
            headerRowIdx = i;
            if (row[0].includes(';')) delimiterUsed = ';';
            else if (row[0].includes(',')) delimiterUsed = ',';
            else if (row[0].includes('\t')) delimiterUsed = '\t';
            break;
          }
        }
      }

      if (headerRowIdx === -1) {
        alert("Não foi possível encontrar o cabeçalho 'DRIVER_ID' ou 'COURSE_NAME' na planilha.");
        setIsProcessing(false);
        return;
      }

      const getCells = (row) => {
        if (delimiterUsed && row.length === 1) {
          return String(row[0] || '').split(delimiterUsed);
        }
        return row;
      };

      const rawHeaders = getCells(dataArray[headerRowIdx]).map(h => String(h || '').trim());
      const parsed = [];
      
      for (let i = headerRowIdx + 1; i < dataArray.length; i++) {
        const row = dataArray[i];
        if (!row || row.length === 0) continue;
        
        const cells = getCells(row);
        const obj = {};
        rawHeaders.forEach((h, idx) => {
          if (h) obj[h] = cells[idx];
        });
        
        if (obj["DRIVER_ID"] || obj["COURSE_NAME"] || obj["Driver ID"] || obj["Course Name"]) {
          parsed.push(obj);
        }
      }

      let lastPendencies = new Set();
      try {
        const sortedHistorico = [...historicoList].sort((a,b) => new Date(b.data_atualizacao).getTime() - new Date(a.data_atualizacao).getTime());
        if (sortedHistorico.length > 0) {
           const lastId = sortedHistorico[0].id;
           const { data: lastPend } = await supabase.from('treinamentos_pendentes').select('driver_id, curso').eq('id_historico', lastId);
           if (lastPend) {
              lastPend.forEach(p => lastPendencies.add(`${p.driver_id}_${p.curso}`));
           }
        }
      } catch (e) {
         console.error("Erro ao buscar lista anterior:", e);
      }

      const currentListForFirebase = [];
      const newRawBase = parsed.map(row => {
        const driverId = String(row["DRIVER_ID"] || row["Driver ID"] || row["Driver_ID"] || "N/A").trim().toUpperCase();
        const courseName = row["COURSE_NAME"] || row["Course Name"] || row["Course"] || "Curso Desconhecido";
        const lastRouteRaw = row["ULTIMA ROTA"] || row["Date of Last Route"] || row["Last Route"] || "N/A";
        const milla = row["MILLA"] || row["Milla"] || row["milla"] || "N/A";
        
        const key = `${driverId}_${courseName}`;
        currentListForFirebase.push(key);

        const status = lastPendencies.has(key) ? "" : "ENTROU NA LISTA";

        return { driverId, courseName, lastRouteRaw, milla, status };
      });

      const todayStr = getTodayDateString(); 
      
      try {
        const novoHist = {
          id: todayStr,
          data_atualizacao: new Date().toISOString(), 
          total_linhas: newRawBase.length
        };
        const { error: err1 } = await supabase.from('treinamentos_historico').upsert(novoHist);
        if (err1) { console.error("Erro histórico:", err1); throw err1; }
        
        const insertData = newRawBase.map(r => ({
           id_historico: todayStr,
           driver_id: r.driverId,
           curso: r.courseName,
           ultima_rota_data: r.lastRouteRaw,
           milla: r.milla,
           status: r.status
        }));
        
        const { error: err2 } = await supabase.from('treinamentos_pendentes').delete().eq('id_historico', todayStr);
        if (err2) { console.error("Erro delete:", err2); throw err2; }
        
        for (let i = 0; i < insertData.length; i += 1000) {
           const { error: err3 } = await supabase.from('treinamentos_pendentes').insert(insertData.slice(i, i + 1000));
           if (err3) { console.error("Erro insert:", err3); throw err3; }
        }

        setHistoricoList(prev => {
           const idx = prev.findIndex(p => p.id === novoHist.id);
           if (idx !== -1) {
              const novo = [...prev];
              novo[idx] = novoHist;
              return novo;
           }
           return [novoHist, ...prev].sort((a,b) => new Date(b.data_atualizacao).getTime() - new Date(a.data_atualizacao).getTime());
        });
        
        setSelectedUploadDate(todayStr);

      } catch (err) {
        console.error("Erro ao salvar dados no Firebase", err);
        alert("Erro ao salvar no banco! Abra o Console (F12) para ver os detalhes. " + (err.message || err.details || ""));
      }

      setIsProcessing(false);
      setFile(null);
    };

    if (file.name.toLowerCase().endsWith('.csv')) {
      Papa.parse(file, {
        skipEmptyLines: true,
        worker: true,
        complete: (res) => processData(res.data),
        error: (err) => { alert(err.message); setIsProcessing(false); }
      });
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const workbook = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
          const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1 });
          processData(jsonData);
        } catch (err) {
          alert(err.message);
          setIsProcessing(false);
        }
      };
      reader.readAsArrayBuffer(file);
    }
  };

  const handleCopyUnmatched = () => {
    const ids = Array.from(new Set(unmatchedDrivers.map(d => d.driverId))).join('\n');
    navigator.clipboard.writeText(ids);
    alert("Driver IDs copiados para a área de transferência!");
  };

  const exportToExcel = () => {
    if (trainingData.length === 0) return;
    const wsData = trainingData.map(row => ({
       "Driver ID": row.driverId,
       "Milha": row.milla,
       "Nome do Motorista": row.nome,
       "SVC/XPT (Filial)": row.filial,
       "Regional": row.regional,
       "Supervisor": row.supervisor,
       "Curso Pendente": row.cursoPendente,
       "Última Rota": row.ultimaRotaData,
       "Status": row.status
    }));
    const ws = XLSX.utils.json_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Treinamentos");
    XLSX.writeFile(wb, `Pendencias_Treinamentos_${selectedUploadDate || 'Export'}.xlsx`);
  };

  const handleOpenBindModal = (driverInfo) => {
     setBindDriver(driverInfo);
     setBindNome('');
     setBindFilial('');
     setShowBindModal(true);
  };

  const handleSaveBind = async () => {
     if (!bindNome.trim() || !bindFilial.trim()) {
        alert("Preencha Nome e Filial para vincular!");
        return;
     }

     const newMap = { ...manualMap };
     newMap[bindDriver.driverId] = { nome: bindNome.toUpperCase().trim(), filial: bindFilial.toUpperCase().trim() };
     
     try {
        await supabase.from('motoristas_manuais_treinamentos').upsert({ driver_id: bindDriver.driverId, nome: bindNome.toUpperCase().trim(), filial: bindFilial.toUpperCase().trim() });
        setManualMap(newMap);
        setShowBindModal(false);
     } catch (e) {
        console.error("Erro ao salvar vinculo manual", e);
        alert("Erro ao salvar vínculo!");
     }
  };

  const filteredTable = useMemo(() => {
    const s = String(searchTerm || '').toLowerCase();
    return trainingData.filter(d => 
      String(d.nome || '').toLowerCase().includes(s) || 
      String(d.filial || '').toLowerCase().includes(s) ||
      String(d.regional || '').toLowerCase().includes(s) ||
      String(d.cursoPendente || '').toLowerCase().includes(s) ||
      String(d.driverId || '').toLowerCase().includes(s) ||
      String(d.milla || '').toLowerCase().includes(s)
    );
  }, [trainingData, searchTerm]);

  const uniqueDriversData = useMemo(() => {
     const map = new Map();
     trainingData.forEach(d => {
        if (!map.has(d.driverId)) {
           map.set(d.driverId, { ...d, totalCursos: 1, cursosLista: [d.cursoPendente] });
        } else {
           const existing = map.get(d.driverId);
           existing.totalCursos++;
           if (!existing.cursosLista.includes(d.cursoPendente)) {
              existing.cursosLista.push(d.cursoPendente);
           }
        }
     });
     return Array.from(map.values()).map(d => ({
        ...d,
        cursoPendente: `${d.totalCursos} curso(s) pendente(s)`
     }));
  }, [trainingData]);

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-800">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* CABEÇALHO E FILTROS */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-3xl shadow-sm border border-slate-200 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
          
          <div className="flex items-center gap-4 relative z-10">
            <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-200">
              <GraduationCap className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-800 tracking-tight">Treinamentos</h1>
              <p className="text-slate-500 font-medium text-sm mt-0.5">Visões dinâmicas sincronizadas com o Operacional.</p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 relative z-10">
            <button 
                 onClick={() => setSyncTrigger(prev => prev + 1)}
                 className="flex items-center justify-center gap-2 bg-indigo-50 text-indigo-600 font-bold px-4 py-2.5 rounded-xl border border-indigo-100 hover:bg-indigo-100 transition-colors shadow-sm"
                 title="Sincronizar novamente com o banco de dados operacional"
              >
                 <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                 <span className="hidden sm:inline">Sincronizar</span>
              </button>
            {historicoList.length > 0 && (
               <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 flex items-center gap-2">
                 <Calendar className="w-4 h-4 text-indigo-500" />
                 <select 
                    value={selectedUploadDate} 
                    onChange={e => setSelectedUploadDate(e.target.value)}
                    className="bg-transparent text-sm font-bold text-slate-700 focus:outline-none cursor-pointer"
                 >
                    {historicoList.map(h => {
                       const dt = h.id;
                       return <option key={h.id} value={dt} className="bg-white text-slate-800 font-medium">Base: {formatBrDate(dt)}</option>
                    })}
                 </select>
               </div>
            )}
            
            <label className="flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-700 px-5 py-3 rounded-xl cursor-pointer transition-colors border border-slate-300 font-bold shadow-sm">
              <UploadCloud className="w-5 h-5 text-indigo-500" />
              <span className="truncate max-w-[200px]">{file ? file.name : "Anexar Base"}</span>
              <input type="file" accept=".csv, .xlsx" onChange={e => setFile(e.target.files[0])} className="hidden" />
            </label>
            <button 
              onClick={handleProcessFile}
              disabled={isProcessing || !file}
              className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold shadow-md shadow-indigo-200 transition-all disabled:opacity-50"
            >
              {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileSpreadsheet className="w-5 h-5" />}
              Atualizar Base
            </button>
          </div>
        </div>

        {/* LOADING STATE */}
        {isFetching ? (
           <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-10 h-10 animate-spin text-indigo-500 mb-4" />
              <p className="font-bold text-slate-500">Sincronizando com a Nuvem...</p>
           </div>
        ) : (
          rawBaseData.length === 0 ? (
            <div className="bg-white p-12 rounded-3xl shadow-sm border border-slate-200 text-center flex flex-col items-center justify-center min-h-[400px]">
              <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                <FileSpreadsheet className="w-12 h-12 text-slate-300" />
              </div>
              <h2 className="text-xl font-black text-slate-700 mb-2">Nenhuma base encontrada</h2>
              <p className="text-slate-500 max-w-md font-medium leading-relaxed">
                Anexe a planilha extraída com as pendências (Excel ou CSV) e clique em Atualizar Base para gerar o Dashboard. 
                Os dados ficarão salvos por dia de upload e se atualizarão automaticamente ao mexer no módulo Operacional.
              </p>
            </div>
          ) : (
            <div className="space-y-6 animate-in fade-in duration-500">

              {/* GRÁFICO EVOLUÇÃO (1 POR DIA) */}
              {historicoList.length > 0 && (
                <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm flex flex-col gap-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-1 flex items-center gap-2">
                         <TrendingDown className="w-5 h-5 text-emerald-500" />
                         Evolução de Pendências Globais
                      </h3>
                      <p className="text-xs font-medium text-slate-500 max-w-lg">
                         Acompanhe a redução da fila de pendências conforme as atualizações diárias. Os dados são consolidados pelo último upload de cada dia.
                      </p>
                    </div>
                  </div>
                  
                  <EvolutionChart 
                     data={[...historicoList].reverse().slice(-14)} 
                  />
                </div>
              )}

              {/* KPI CARDS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                <KpiCard 
                   title="Total Pendências" 
                   value={trainingData.length} 
                   icon={FileSpreadsheet} 
                   valueColor="text-slate-800" 
                   iconBgColor="bg-blue-500" 
                />
                <KpiCard 
                   title="Mapeados (Com Operação)" 
                   value={uniqueDriversData.length - new Set(unmatchedDrivers.map(d => d.driverId)).size} 
                   icon={CheckCircle2} 
                   valueColor="text-emerald-600" 
                   iconBgColor="bg-emerald-500" 
                />
                <KpiCard 
                   title="Não Identificados" 
                   value={new Set(unmatchedDrivers.map(d => d.driverId)).size} 
                   icon={AlertTriangle} 
                   valueColor={unmatchedDrivers.length > 0 ? "text-red-600" : "text-slate-400"} 
                   iconBgColor={unmatchedDrivers.length > 0 ? "bg-red-500" : "bg-slate-300"} 
                />
                <KpiCard 
                   title="Motoristas Inativos (>15 dias)" 
                   value={uniqueDriversData.filter(d => d.diasSemRota > 15).length} 
                   icon={Clock} 
                   valueColor="text-orange-600" 
                   iconBgColor="bg-orange-500" 
                />
              </div>

              {/* UNMATCHED DRIVERS ALERT SECTION */}
              {unmatchedDrivers.length > 0 && (
                <div className="bg-red-50/50 border border-red-200 rounded-3xl p-6 shadow-sm">
                   <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                     <div className="flex items-center gap-3">
                       <div className="p-2 bg-red-100 rounded-xl">
                          <AlertTriangle className="w-6 h-6 text-red-600" />
                       </div>
                       <div>
                         <h3 className="text-lg font-black text-red-800 uppercase tracking-tight">Motoristas Não Identificados</h3>
                         <p className="text-red-600/80 text-xs font-bold mt-0.5">As pendências abaixo constam na planilha, mas estes Motoristas estão sem Filial mapeada na Base Operacional.</p>
                       </div>
                     </div>
                     <button onClick={handleCopyUnmatched} className="bg-white border border-red-200 text-red-600 hover:bg-red-50 px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 text-sm transition-colors shadow-sm whitespace-nowrap">
                       <Copy className="w-4 h-4" /> Copiar Driver IDs
                     </button>
                   </div>
                   
                   <div className="overflow-x-auto rounded-2xl border border-red-100 bg-white max-h-[400px]">
                     <table className="w-full text-left text-xs border-collapse">
                       <thead className="bg-red-50/50 sticky top-0 z-10 shadow-sm">
                         <tr className="text-red-700 uppercase tracking-wider">
                           <th className="py-3 px-4 font-black border-b border-red-100">Driver ID</th>
                           <th className="py-3 px-4 font-black border-b border-red-100">Milha</th>
                           <th className="py-3 px-4 font-black border-b border-red-100">Curso Pendente</th>
                           <th className="py-3 px-4 font-black border-b border-red-100">Última Rota</th>
                           <th className="py-3 px-4 font-black border-b border-red-100 text-center">Ação</th>
                         </tr>
                       </thead>
                       <tbody className="divide-y divide-red-50">
                         {groupedUnmatched.map((group, idx) => (
                           <UnmatchedRow key={idx} group={group} handleOpenBindModal={handleOpenBindModal} />
                         ))}
                       </tbody>
                     </table>
                   </div>
                </div>
              )}

              {/* DRILLDOWN DASHBOARDS */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <DrilldownAnalysis 
                  title="Visão Curso x Regional" 
                  dataList={trainingData} 
                  groupKeys={['regional', 'filial', 'cursoPendente']}
                  labels={['Regional', 'Filial', 'Curso Pendente']}
                  colorTheme="bg-indigo-500" 
                />
                <DrilldownAnalysis 
                  title="Motoristas Pendentes por Operação" 
                  dataList={uniqueDriversData} 
                  groupKeys={['filial']}
                  labels={['Filial (Operação)']}
                  colorTheme="bg-violet-500" 
                  heightClass="h-[850px]"
                  extraColumnL1={{ key: 'regional', label: 'Supervisor' }}
                />
              </div>

              <div className="mt-6">
                <DrilldownAnalysis 
                  title="Motoristas sem rota > 15 dias (Inativos)" 
                  dataList={uniqueDriversData.filter(d => d.diasSemRota > 15)} 
                  groupKeys={['filial']}
                  labels={['Filial (Operação)']}
                  colorTheme="bg-orange-500" 
                  heightClass="h-fit"
                  extraColumnL1={{ key: 'regional', label: 'Supervisor' }}
                />
              </div>

              {/* LISTA COMPLETA - DARK THEME */}
              <div className="bg-[#1e1e24] rounded-3xl shadow-xl border border-slate-700/60 overflow-hidden flex flex-col mt-8">
                <div className="p-6 border-b border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#13131a]">
                  <div>
                    <h3 className="text-lg font-black text-slate-200">Detalhamento Completo</h3>
                    <p className="text-xs text-slate-500 font-medium mt-1">Lista cruzada pronta para exportação ou filtro manual.</p>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
                     <div className="relative w-full sm:w-64">
                       <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                         <Search className="h-4 w-4 text-slate-500" />
                       </div>
                       <input
                         type="text"
                         value={searchTerm}
                         onChange={(e) => setSearchTerm(e.target.value)}
                         className="block w-full pl-10 pr-3 py-2.5 border border-slate-700/50 rounded-xl leading-5 bg-slate-800/50 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm font-medium transition-colors"
                         placeholder="Buscar nome, ID, filial..."
                       />
                     </div>
                     <button onClick={exportToExcel} className="flex items-center justify-center gap-2 bg-indigo-900/40 text-indigo-400 border border-indigo-800/50 hover:bg-indigo-800/60 px-4 py-2.5 rounded-xl font-bold text-sm transition-colors shadow-sm">
                       <Download className="w-4 h-4" /> Exportar Planilha
                     </button>
                  </div>
                </div>

                <div className="overflow-x-auto w-full max-h-[600px] custom-scrollbar">
                  <table className="w-full text-left border-collapse min-w-[1200px]">
                    <thead className="bg-[#13131a] sticky top-0 z-10 shadow-md">
                      <tr className="text-[10px] uppercase tracking-wider text-slate-500">
                        <th className="py-4 px-4 font-bold border-b border-slate-800">Driver ID</th>
                        <th className="py-4 px-4 font-bold border-b border-slate-800">SVC/XPT (Filial)</th>
                        <th className="py-4 px-4 font-bold border-b border-slate-800">Regional</th>
                        <th className="py-4 px-4 font-bold border-b border-slate-800">Supervisor</th>
                        <th className="py-4 px-4 font-bold border-b border-slate-800">Nome do Motorista</th>
                        <th className="py-4 px-4 font-bold border-b border-slate-800">Milha</th>
                        <th className="py-4 px-4 font-bold border-b border-slate-800">Curso Pendente</th>
                        <th className="py-4 px-4 font-bold border-b border-slate-800 text-center">Última Rota</th>
                        <th className="py-4 px-4 font-bold border-b border-slate-800 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {filteredTable.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-12 text-center text-slate-500 font-medium text-sm">Nenhum resultado encontrado.</td>
                        </tr>
                      ) : (
                        filteredTable.map((row, idx) => (
                          <tr key={idx} className={`transition-colors text-[11px] ${row.nome === "NÃO LOCALIZADO" ? 'bg-red-900/20 hover:bg-red-900/40' : 'bg-[#1e1e24] hover:bg-slate-800'}`}>
                            <td className="py-3 px-4 font-mono font-bold text-slate-400">{row.driverId}</td>
                            <td className="py-3 px-4 font-bold text-slate-300">{row.filial}</td>
                            <td className="py-3 px-4 font-medium text-slate-500">{row.regional}</td>
                            <td className="py-3 px-4 font-medium text-slate-500">{row.supervisor}</td>
                            <td className="py-3 px-4 font-bold text-slate-200">
                              {row.nome === "NÃO LOCALIZADO" ? (
                                <span className="text-red-500 flex items-center gap-1"><AlertTriangle className="w-3 h-3"/> Não Localizado</span>
                              ) : row.nome}
                            </td>
                            <td className="py-3 px-4 font-bold text-indigo-400 uppercase tracking-wider text-[9px]">{row.milla && row.milla !== 'N/A' ? row.milla : '-'}</td>
                            <td className="py-3 px-4 font-bold text-orange-400">{row.cursoPendente}</td>
                            <td className="py-3 px-4 text-center">
                              <div className="flex flex-col items-center gap-0.5">
                                <span className="font-mono text-slate-400 font-bold">{row.ultimaRotaData}</span>
                                <span className={`text-[9px] font-black tracking-wider ${row.diasSemRota > 15 ? 'text-red-500' : 'text-slate-600'}`}>
                                  <Clock className="w-2.5 h-2.5 inline mr-0.5" />
                                  {row.diasSemRota} DIAS
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-center">
                              {row.status === "ENTROU NA LISTA" && (
                                <span className="inline-flex items-center px-2 py-1 rounded text-[9px] font-black uppercase tracking-wider bg-emerald-900/50 text-emerald-400 border border-emerald-800/50">
                                  ENTROU NA LISTA
                                </span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="p-4 bg-[#13131a] border-t border-slate-800 text-xs text-slate-500 text-center font-medium flex justify-between items-center">
                  <span>Mostrando {filteredTable.length} registros (busca).</span>
                  <span>Total Geral: {trainingData.length} registros</span>
                </div>
              </div>

            </div>
          )
        )}
      </div>

      {/* MODAL DE VÍNCULO MANUAL */}
      {showBindModal && bindDriver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                <Link className="w-5 h-5 text-indigo-500" /> Vincular Motorista
              </h3>
              <button onClick={() => setShowBindModal(false)} className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 flex flex-col gap-5">
               <div className="bg-slate-100 rounded-xl p-4 flex flex-col gap-1 border border-slate-200">
                  <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Driver ID a vincular</span>
                  <span className="text-xl font-mono font-black text-slate-800">{bindDriver.driverId}</span>
                  <span className="text-xs font-bold text-slate-500 mt-1">Milha: <span className="text-indigo-600">{bindDriver.milla}</span></span>
               </div>

               <div>
                 <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Nome do Motorista</label>
                 <input 
                   type="text" 
                   value={bindNome}
                   onChange={e => setBindNome(e.target.value)}
                   className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/50" 
                   placeholder="Ex: FELIPE AUGUSTO" 
                   autoFocus
                 />
               </div>
               
               <div>
                 <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Sigla da Filial (SVC/XPT)</label>
                 <input 
                   type="text" 
                   value={bindFilial}
                   onChange={e => setBindFilial(e.target.value.toUpperCase())}
                   className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-slate-800 font-bold uppercase focus:outline-none focus:ring-2 focus:ring-indigo-500/50" 
                   placeholder="Ex: SJDC" 
                 />
                 <p className="text-[10px] text-slate-500 mt-2 font-medium">A regional será puxada automaticamente do seu cadastro de filiais.</p>
               </div>

               <button 
                 onClick={handleSaveBind}
                 className="w-full mt-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-4 rounded-xl font-black text-sm shadow-md shadow-indigo-200 transition-all"
               >
                 Salvar Vínculo Manual
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
