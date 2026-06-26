import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../supabase';
import { Loader2, Users, AlertCircle } from 'lucide-react';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from 'recharts';

// Helper to sort quinzenas
const getQuinzenaSortKey = (q) => {
  if (!q) return '0000-00-00';
  const parts = String(q).split('-');
  if (parts.length !== 3) return q;
  const qPart = parts[0]; // Q1 or Q2
  const mPart = parts[1].toUpperCase();
  const yPart = parts[2];
  
  const monthMap = { 'JAN': '01', 'FEV': '02', 'MAR': '03', 'ABR': '04', 'MAI': '05', 'JUN': '06', 'JUL': '07', 'AGO': '08', 'SET': '09', 'OUT': '10', 'NOV': '11', 'DEZ': '12' };
  const mNum = monthMap[mPart] || '00';
  return `${yPart}-${mNum}-${qPart}`;
};

export function TurnoverMotoristas() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Drill-down state
  const [selectedQuinzena, setSelectedQuinzena] = useState(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        let allData = [];
        let start = 0;
        let limit = 1000;
        let hasMore = true;

        while (hasMore) {
          const { data: gapsData, error: dbErr } = await supabase
            .from('view_gaps_operacionais_bsc')
            .select('quinzena, filial, motorista')
            .not('motorista', 'eq', 'N/A')
            .not('motorista', 'is', null)
            .range(start, start + limit - 1);

          if (dbErr) throw dbErr;

          if (gapsData && gapsData.length > 0) {
            allData = [...allData, ...gapsData];
            start += limit;
          } else {
            hasMore = false;
          }

          if (gapsData.length < limit) {
            hasMore = false;
          }
        }
        setData(allData);
      } catch (err) {
        console.error('Erro ao buscar dados de turnover:', err);
        setError('Falha ao carregar histórico de motoristas.');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const { chartDataGlobal, drilldownDataMap } = useMemo(() => {
    if (!data.length) return { chartDataGlobal: [], drilldownDataMap: {} };

    // Agrupa motoristas por quinzena e por filial
    const quinzenasMapGlobal = new Map(); // quinzena -> Set of motoristas
    const quinzenasFilialMap = new Map(); // quinzena -> filial -> Set of motoristas

    data.forEach(d => {
      if (!d.quinzena || !d.motorista) return;
      
      // Global
      if (!quinzenasMapGlobal.has(d.quinzena)) quinzenasMapGlobal.set(d.quinzena, new Set());
      quinzenasMapGlobal.get(d.quinzena).add(d.motorista);

      // Por Filial
      if (d.filial) {
        if (!quinzenasFilialMap.has(d.quinzena)) quinzenasFilialMap.set(d.quinzena, new Map());
        const fMap = quinzenasFilialMap.get(d.quinzena);
        if (!fMap.has(d.filial)) fMap.set(d.filial, new Set());
        fMap.get(d.filial).add(d.motorista);
      }
    });

    // Sort quinzenas cronologicamente
    const quinzenasSorted = Array.from(quinzenasMapGlobal.keys()).sort((a, b) => getQuinzenaSortKey(a).localeCompare(getQuinzenaSortKey(b)));

    // Calcula Ativos, Novos e Churn Global
    const globalResult = [];
    const drilldownMap = {}; // quinzena -> array de dados por filial
    
    for (let i = 0; i < quinzenasSorted.length; i++) {
      const currentQ = quinzenasSorted[i];
      const prevQ = i > 0 ? quinzenasSorted[i - 1] : null;

      // ---- GLOBAL CALCULATION ----
      const currentDrivers = quinzenasMapGlobal.get(currentQ);
      const prevDrivers = prevQ ? quinzenasMapGlobal.get(prevQ) : new Set();

      let novos = 0;
      let churn = 0;

      if (i > 0) {
        currentDrivers.forEach(m => { if (!prevDrivers.has(m)) novos++; });
        prevDrivers.forEach(m => { if (!currentDrivers.has(m)) churn++; });
      }

      const ativos = currentDrivers.size;
      const veteranos = ativos - novos;
      const taxaTurnover = prevDrivers.size > 0 ? (churn / prevDrivers.size) * 100 : 0;

      globalResult.push({
        quinzena: currentQ,
        ativos,
        veteranos,
        novos,
        churn,
        taxaTurnover: Number(taxaTurnover.toFixed(1))
      });

      // ---- DRILLDOWN PER FILIAL CALCULATION ----
      if (i > 0) {
        const currentFMap = quinzenasFilialMap.get(currentQ) || new Map();
        const prevFMap = quinzenasFilialMap.get(prevQ) || new Map();
        
        const allFiliaisThisPeriod = new Set([...Array.from(currentFMap.keys()), ...Array.from(prevFMap.keys())]);
        const filiaisResult = [];

        allFiliaisThisPeriod.forEach(filial => {
          const cDriversF = currentFMap.get(filial) || new Set();
          const pDriversF = prevFMap.get(filial) || new Set();

          let fNovos = 0;
          let fChurn = 0;

          cDriversF.forEach(m => { if (!pDriversF.has(m)) fNovos++; });
          pDriversF.forEach(m => { if (!cDriversF.has(m)) fChurn++; });

          const fAtivos = cDriversF.size;
          const fVeteranos = fAtivos - fNovos;
          const fTaxa = pDriversF.size > 0 ? (fChurn / pDriversF.size) * 100 : 0;

          // Só adiciona se teve alguma movimentação ou tem ativos
          if (fAtivos > 0 || fChurn > 0) {
            filiaisResult.push({
              filial,
              ativos: fAtivos,
              veteranos: fVeteranos,
              novos: fNovos,
              churn: fChurn,
              taxaTurnover: Number(fTaxa.toFixed(1))
            });
          }
        });

        // Ordenar os ofensores (maior Churn absoluto primeiro, depois taxa)
        filiaisResult.sort((a, b) => b.churn - a.churn || b.taxaTurnover - a.taxaTurnover);
        drilldownMap[currentQ] = filiaisResult;
      } else {
        drilldownMap[currentQ] = [];
      }
    }

    return { 
      chartDataGlobal: globalResult, 
      drilldownDataMap: drilldownMap
    };
  }, [data]);

  if (loading) {
    return (
      <div className="w-full h-80 flex flex-col items-center justify-center bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-4" />
        <p className="text-slate-500 font-bold">Calculando histórico de rotatividade...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-80 flex flex-col items-center justify-center text-red-500 bg-red-50 dark:bg-red-900/20 rounded-[2rem] border border-red-200 dark:border-red-800/50">
        <AlertCircle className="w-8 h-8 mb-4" />
        <p className="font-bold">{error}</p>
      </div>
    );
  }

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      
      return (
        <div className="bg-slate-900 dark:bg-slate-800 text-white p-4 rounded-xl shadow-2xl border border-slate-700/50 min-w-[200px]">
          <p className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-wider border-b border-slate-700/50 pb-2">{label}</p>
          
          <div className="flex justify-between items-center gap-6 mb-3 bg-slate-800/50 p-2 rounded-lg border border-slate-700/50">
            <span className="text-sm font-bold text-slate-300 flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-400" />
              Total de Ativos
            </span>
            <span className="text-sm font-black text-white">{data.ativos}</span>
          </div>

          <div className="flex flex-col gap-1.5">
            {payload.map((entry, index) => (
              <div key={index} className="flex justify-between items-center gap-6">
                <span className="text-xs font-semibold flex items-center gap-2 text-slate-300">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                  {entry.name}
                </span>
                <span className="text-xs font-bold" style={{ color: entry.color }}>
                  {entry.name === 'Taxa de Churn (%)' ? `${entry.value}%` : entry.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  const renderChart = () => {
    if (!selectedQuinzena) {
      // Visão Global
      return (
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartDataGlobal}
            margin={{ top: 20, right: 20, bottom: 20, left: 0 }}
            onClick={(e) => {
              if (e && e.activeLabel) {
                // Não permite drilldown na primeira quinzena se não houver dados de churn
                if (drilldownDataMap[e.activeLabel] && drilldownDataMap[e.activeLabel].length > 0) {
                  setSelectedQuinzena(e.activeLabel);
                }
              }
            }}
            className="cursor-pointer"
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.15} />
            <XAxis 
              dataKey="quinzena" 
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }}
              dy={10}
            />
            <YAxis 
              yAxisId="left"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }}
              dx={-10}
            />
            <YAxis 
              yAxisId="right" 
              orientation="right" 
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#ef4444', fontSize: 12, fontWeight: 600 }}
              tickFormatter={(value) => `${value}%`}
              dx={10}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f1f5f9', opacity: 0.5 }} />
            <Legend wrapperStyle={{ paddingTop: '20px', fontWeight: 600, fontSize: '12px', color: '#64748b' }} />
            
            <Bar yAxisId="left" dataKey="veteranos" name="Motoristas Veteranos" fill="#3b82f6" stackId="a" maxBarSize={50} isAnimationActive={true} animationDuration={1500} />
            <Bar yAxisId="left" dataKey="novos" name="Novos Entrantes" fill="#10b981" stackId="a" radius={[4, 4, 0, 0]} maxBarSize={50} isAnimationActive={true} animationDuration={1500} />
            <Line 
              yAxisId="right" 
              type="monotone" 
              dataKey="taxaTurnover" 
              name="Taxa de Churn (%)" 
              stroke="#ef4444" 
              strokeWidth={3}
              dot={{ r: 4, fill: '#ef4444', strokeWidth: 2, stroke: '#fff' }} 
              activeDot={{ r: 6, fill: '#ef4444', stroke: '#fff' }} 
              isAnimationActive={true}
              animationDuration={1500}
            />
          </ComposedChart>
        </ResponsiveContainer>
      );
    } else {
      // Visão Drilldown (Filiais Ofensoras da Quinzena)
      const dataFiliais = drilldownDataMap[selectedQuinzena] || [];
      return (
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={dataFiliais}
            margin={{ top: 20, right: 20, bottom: 20, left: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.15} />
            <XAxis 
              dataKey="filial" 
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }}
              dy={10}
              interval={0}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis 
              yAxisId="left"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }}
              dx={-10}
            />
            <YAxis 
              yAxisId="right" 
              orientation="right" 
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#ef4444', fontSize: 12, fontWeight: 600 }}
              tickFormatter={(value) => `${value}%`}
              dx={10}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f1f5f9', opacity: 0.5 }} />
            <Legend wrapperStyle={{ paddingTop: '10px', fontWeight: 600, fontSize: '12px', color: '#64748b' }} />
            
            <Bar yAxisId="left" dataKey="churn" name="Evadidos (Churn)" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={40} isAnimationActive={true} animationDuration={1500} />
            <Bar yAxisId="left" dataKey="novos" name="Novos Entrantes" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} isAnimationActive={true} animationDuration={1500} />
            <Line 
              yAxisId="right" 
              type="monotone" 
              dataKey="taxaTurnover" 
              name="Taxa de Churn (%)" 
              stroke="#f59e0b" 
              strokeWidth={2}
              dot={{ r: 3, fill: '#f59e0b', strokeWidth: 2, stroke: '#fff' }} 
              isAnimationActive={true}
              animationDuration={1500}
            />
          </ComposedChart>
        </ResponsiveContainer>
      );
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-[2rem] border border-slate-200 dark:border-slate-800 flex flex-col shadow-sm mb-8 relative overflow-hidden group">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 z-10 gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-3 tracking-tight">
            <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center border border-orange-100 dark:border-orange-500/20">
               <Users className="w-5 h-5 text-orange-500" />
            </div>
            {selectedQuinzena ? `Ofensores de Turnover - ${selectedQuinzena}` : 'Turnover de Motoristas Global'}
          </h2>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-2 pl-13">
            {selectedQuinzena 
              ? 'Detalhamento das filiais com maior impacto em rotatividade nesta quinzena'
              : 'Clique sobre a barra de uma quinzena para abrir o detalhamento de Churn por Filial (Ofensores)'}
          </p>
        </div>
        
        {selectedQuinzena && (
          <div className="w-full md:w-auto">
            <button 
              onClick={() => setSelectedQuinzena(null)}
              className="w-full md:w-auto bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold rounded-xl px-5 py-2.5 transition-colors shadow-sm"
            >
              ← Voltar para Visão Global
            </button>
          </div>
        )}
      </div>

      <div className="w-full h-[400px]">
        {renderChart()}
      </div>
    </div>
  );
}
