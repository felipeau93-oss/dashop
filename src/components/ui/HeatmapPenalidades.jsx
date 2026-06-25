import React, { useMemo, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, AlertCircle, Info, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { supabase } from '../../supabase';

// Helper to format currency
const formatCurrency = (val) => {
  if (typeof val !== 'number') return 'R$ 0,00';
  return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

// Dias da semana ordenados
const DAYS_OF_WEEK = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const parseDateFromItem = (item) => {
  // 1. Tentar parsear do dados_originais
  if (item.dados_originais) {
    let dadosObj = item.dados_originais;
    if (typeof dadosObj === 'string') {
      try { dadosObj = JSON.parse(dadosObj); } catch(e) {}
    }
    if (typeof dadosObj === 'object' && dadosObj !== null) {
      const keys = Object.keys(dadosObj);
      const dateKey = keys.find(k => k.toLowerCase().includes('data') || k.toLowerCase().includes('date') || k.toLowerCase().includes('inicio'));
      if (dateKey && dadosObj[dateKey]) {
        let dateStr = String(dadosObj[dateKey]).trim();
        if (!isNaN(dateStr) && Number(dateStr) > 40000) {
          const excelEpoch = new Date(1899, 11, 30);
          const parsedDate = new Date(excelEpoch.getTime() + Number(dateStr) * 86400000);
          return parsedDate;
        }
        const match = dateStr.match(/(\d{2})[\/\-](\d{2})[\/\-](\d{4})/);
        if (match) {
          return new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
        }
        const nativeDate = new Date(dateStr);
        if (!isNaN(nativeDate.getTime())) return nativeDate;
      }
    }
  }

  // 2. Tentar extrair da descrição
  if (item.descricao) {
    const matchFull = item.descricao.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (matchFull) {
      return new Date(Number(matchFull[3]), Number(matchFull[2]) - 1, Number(matchFull[1]));
    }
    const matchShort = item.descricao.match(/(\d{2})\/(\d{2})/);
    if (matchShort) {
      return new Date(new Date().getFullYear(), Number(matchShort[2]) - 1, Number(matchShort[1]));
    }
  }

  return null;
};

export function HeatmapPenalidades({ data = [] }) {
  const [hoveredCell, setHoveredCell] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [rawData, setRawData] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchRawDates() {
      if (!data || data.length === 0) {
        setRawData([]);
        return;
      }

      setLoading(true);
      try {
        const uniqueQuinzenas = [...new Set(data.map(d => d.quinzena).filter(Boolean))];
        const uniqueFiliais = [...new Set(data.map(d => d.filial).filter(Boolean))];

        if (uniqueQuinzenas.length === 0) {
          setRawData([]);
          setLoading(false);
          return;
        }

        let allPenalidades = [];
        let start = 0;
        let limit = 1000;
        let hasMore = true;

        while (hasMore) {
          const { data: penData, error } = await supabase
            .from('penalidades')
            .select('filial, descricao, dados_originais, valor, quinzena, tipo')
            .in('quinzena', uniqueQuinzenas)
            .in('filial', uniqueFiliais)
            .range(start, start + limit - 1);

          if (error) throw error;

          if (penData && penData.length > 0) {
            allPenalidades = [...allPenalidades, ...penData];
            start += limit;
          } else {
            hasMore = false;
          }

          if (penData.length < limit) {
            hasMore = false;
          }
        }

        setRawData(allPenalidades);
      } catch (err) {
        console.error('Erro ao buscar penalidades raw para o heatmap:', err);
      } finally {
        setLoading(false);
      }
    }
    
    fetchRawDates();
  }, [data]);

  const { heatmaps, maxValue } = useMemo(() => {
    const tipos = Array.from(new Set(rawData.map(d => d.tipo).filter(Boolean))).sort();
    const categorias = [...tipos];
    
    let globalMax = 0;

    const result = categorias.map(cat => {
      const map = new Map(); // filial -> array of values per day
      const filtered = cat === 'Geral' ? rawData : rawData.filter(d => d.tipo === cat);

      filtered.forEach(d => {
        const filial = d.filial && d.filial !== 'N/A' ? d.filial : 'Outros';
        if (!map.has(filial)) {
          map.set(filial, Array(7).fill().map(() => ({ count: 0, valor: 0 })));
        }

        const dateObj = parseDateFromItem(d);
        if (dateObj) {
          const dayIdx = dateObj.getDay(); // 0 = Dom, 1 = Seg...
          const row = map.get(filial);
          row[dayIdx].count += 1;
          row[dayIdx].valor += Number(d.valor || 0);

          if (row[dayIdx].valor > globalMax) {
            globalMax = row[dayIdx].valor;
          }
        }
      });

      // Ordenar filiais alfabeticamente ou por volume total (limitado a 20)
      const sortedFiliais = Array.from(map.keys()).sort((a, b) => {
        const sumA = map.get(a).reduce((acc, curr) => acc + curr.valor, 0);
        const sumB = map.get(b).reduce((acc, curr) => acc + curr.valor, 0);
        return sumB - sumA;
      }).slice(0, 20);

      const matrix = sortedFiliais.map(f => ({
        filial: f,
        days: map.get(f)
      }));

      return {
        title: cat,
        matrix
      };
    });

    const validHeatmaps = result.filter(h => h.matrix.length > 0);

    return { heatmaps: validHeatmaps, maxValue: globalMax };
  }, [rawData]);

  if (loading) {
    return (
      <div className="w-full h-64 flex flex-col items-center justify-center text-slate-400 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800">
        <Loader2 className="w-8 h-8 animate-spin text-red-500 mb-4" />
        <p className="font-bold text-slate-600 dark:text-slate-300">Buscando histórico de ocorrências...</p>
      </div>
    );
  }

  if (!heatmaps || heatmaps.length === 0) {
    return (
      <div className="w-full h-64 flex flex-col items-center justify-center text-slate-400 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800">
        <Calendar className="w-8 h-8 mb-4 opacity-50" />
        <p>Dados de datas insuficientes para o Heatmap.</p>
        <p className="text-xs mt-2 opacity-70">Verifique se as descrições ou dados originais contêm datas.</p>
      </div>
    );
  }

  const getCellColor = (valor) => {
    if (valor === 0) return 'bg-slate-50 dark:bg-slate-800/30 text-transparent border border-slate-200 dark:border-slate-700/30';
    
    const intensity = Math.max(0.01, Math.min(valor / (maxValue || 1), 1));
    
    if (intensity < 0.15) return 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200 border-orange-200 dark:border-orange-800/50';
    if (intensity < 0.35) return 'bg-orange-300 dark:bg-orange-800/60 text-orange-900 dark:text-orange-100 border-orange-400 dark:border-orange-700/50';
    if (intensity < 0.60) return 'bg-red-400 dark:bg-red-700/80 text-white border-red-500 dark:border-red-600/50 font-medium';
    if (intensity < 0.85) return 'bg-red-500 dark:bg-red-600 text-white border-red-600 dark:border-red-500 font-bold';
    return 'bg-red-600 dark:bg-red-500 text-white border-red-700 dark:border-red-400 font-bold shadow-[0_0_8px_rgba(220,38,38,0.4)]';
  };

  return (
    <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-[2rem] border border-slate-200 dark:border-slate-800 flex flex-col shadow-sm relative group">
      <div className="flex justify-between items-start mb-8 z-10">
        <div>
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]" />
              Heatmap de Risco
            </h2>
          </div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-2">
            Concentração de penalidades por Dia da Semana e Filial
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-[10px] uppercase font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-full">
          <Info className="w-3 h-3" /> Baseado na data original
        </div>
      </div>

      <div className="flex flex-col gap-10">
        {heatmaps.map((hm, hIdx) => (
          <div key={hm.title} className="w-full overflow-x-auto pb-4 custom-scrollbar">
            <h3 className="text-sm font-black text-slate-700 dark:text-slate-300 mb-4 pl-2 border-l-4 border-red-500">
              Tipo: {hm.title}
            </h3>
            
            <div className="min-w-fit flex flex-col pl-2">
              {/* Header row: Days of week */}
              <div className="flex w-full mb-3">
                <div className="w-32 sm:w-40 shrink-0"></div>
                <div className="flex gap-2">
                  {DAYS_OF_WEEK.map((day) => (
                    <div key={day} className="w-12 h-10 shrink-0 flex-none flex items-center justify-center text-xs font-bold text-slate-400 uppercase tracking-wider">
                      {day}
                    </div>
                  ))}
                </div>
              </div>

              {/* Body: Filiais */}
              <div className="flex flex-col gap-2">
                {hm.matrix.map((row, rIdx) => (
                  <div key={row.filial} className="flex w-full items-center group/row">
                    <div className="w-32 sm:w-40 shrink-0 text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-300 truncate pr-4 text-right">
                      {row.filial}
                    </div>
                    <div className="flex gap-2">
                      {row.days.map((dayData, dIdx) => {
                        const isHovered = hoveredCell?.h === hIdx && hoveredCell?.r === rIdx && hoveredCell?.d === dIdx;
                        return (
                          <div
                            key={dIdx}
                            onMouseMove={(e) => {
                              setTooltipPos({ x: e.clientX, y: e.clientY });
                              setHoveredCell({ h: hIdx, r: rIdx, d: dIdx, data: dayData, filial: row.filial, dayName: DAYS_OF_WEEK[dIdx], title: hm.title });
                            }}
                            onMouseLeave={() => setHoveredCell(null)}
                            className={cn(
                              "w-12 h-10 shrink-0 flex-none rounded-md transition-all duration-200 cursor-pointer border flex items-center justify-center text-xs font-bold",
                              getCellColor(dayData.valor),
                              isHovered ? "scale-[1.15] ring-2 ring-red-500/50 z-20 shadow-md" : "hover:opacity-80"
                            )}
                          >
                            {dayData.count > 0 ? dayData.count : ''}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Legend Footer */}
      <div className="mt-4 pt-5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between z-10">
         <div className="text-[10px] text-slate-400 font-medium">
            Limitado às 20 maiores filiais por volume
         </div>
         <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-400 font-bold uppercase">Baixo</span>
            <div className="flex gap-1 h-3">
               <div className="w-4 rounded-sm border bg-slate-50 border-slate-200 dark:bg-slate-800/30 dark:border-slate-700/30" />
               <div className="w-4 rounded-sm border bg-orange-100 border-orange-200 dark:bg-orange-900/30 dark:border-orange-800/50" />
               <div className="w-4 rounded-sm border bg-orange-300 border-orange-400 dark:bg-orange-800/60 dark:border-orange-700/50" />
               <div className="w-4 rounded-sm border bg-red-400 border-red-500 dark:bg-red-700/80 dark:border-red-600/50" />
               <div className="w-4 rounded-sm border bg-red-600 border-red-700 dark:bg-red-500 dark:border-red-400" />
            </div>
            <span className="text-[10px] text-slate-400 font-bold uppercase">Crítico</span>
         </div>
      </div>

      {/* Portal-like Tooltip via Fixed Positioning to avoid overflow/z-index clipping */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {hoveredCell && hoveredCell.data.valor > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 5 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 5 }}
              transition={{ duration: 0.15 }}
              className="fixed z-[999999] pointer-events-none bg-slate-900 dark:bg-slate-800 text-white rounded-xl shadow-2xl border border-slate-700/50 p-3 w-56"
              style={{ 
                left: Math.min(tooltipPos.x + 15, typeof window !== 'undefined' ? window.innerWidth - 240 : tooltipPos.x + 15), 
                top: Math.min(tooltipPos.y + 15, typeof window !== 'undefined' ? window.innerHeight - 100 : tooltipPos.y + 15)
              }}
            >
              <div className="text-[10px] text-slate-400 font-bold mb-2 uppercase tracking-wider border-b border-slate-700/50 pb-2">
                {hoveredCell.title} &bull; {hoveredCell.filial} &bull; {hoveredCell.dayName}
              </div>
              <div className="flex justify-between items-center mt-2">
                <span className="text-xs text-slate-300">Valor Total</span>
                <span className="text-sm font-black text-rose-400">{formatCurrency(hoveredCell.data.valor)}</span>
              </div>
              <div className="flex justify-between items-center mt-2">
                <span className="text-xs text-slate-300">Ocorrências</span>
                <span className="text-xs font-bold text-white bg-slate-700/50 border border-slate-600 px-2 py-0.5 rounded-md">
                  {hoveredCell.data.count}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
