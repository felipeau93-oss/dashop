import React, { useState, useEffect, useMemo } from 'react';
import { 
  Building2, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Calculator, 
  AlertTriangle,
  Download,
  Filter,
  BarChart3,
  Loader2,
  PieChart,
  Wallet
} from 'lucide-react';
import { supabase } from './supabase';
import * as XLSX from 'xlsx';

const formatCurr = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
const formatPerc = (v) => `${(v || 0).toFixed(2)}%`;

export default function DreGerencial({ setAgentContext }) {
  const [loading, setLoading] = useState(true);
  const [quinzenas, setQuinzenas] = useState([]);
  const [selectedQuinzena, setSelectedQuinzena] = useState('');
  
  const [dreData, setDreData] = useState([]);
  const [retaguardaData, setRetaguardaData] = useState([]);
  const [filialRegionalMap, setFilialRegionalMap] = useState({});
  
  const [imposto, setImposto] = useState(6.56);
  const [filtroRegional, setFiltroRegional] = useState('TODAS');

  useEffect(() => {
    if (setAgentContext) setAgentContext('Tela: DRE Gerencial (Visão consolidada por filial)');
    loadInitialData();
  }, [setAgentContext]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      // Fetch Quinzenas
      const { data: qzData } = await supabase.from('view_dre_custo_leve').select('quinzena');
      const uniqueQz = [...new Set((qzData || []).map(q => q.quinzena).filter(Boolean))].sort((a,b) => b.localeCompare(a));
      setQuinzenas(uniqueQz);
      if (uniqueQz.length > 0) {
        setSelectedQuinzena(uniqueQz[0]);
      }
      
      // Fetch Filial -> Regional Map
      const { data: opData } = await supabase.from('mapeamento_filiais').select('filial, regional');
      const map = {};
      (opData || []).forEach(row => {
        if (row.filial && row.filial !== 'N/A' && row.filial !== 'DESCONHECIDA') {
          map[row.filial.toUpperCase()] = row.regional || 'Sem Regional';
        }
      });
      setFilialRegionalMap(map);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedQuinzena) {
      loadQuinzenaData(selectedQuinzena);
    }
  }, [selectedQuinzena]);

  const loadQuinzenaData = async (qz) => {
    setLoading(true);
    try {
      // 1. Load DRE Base Data (Faturamento, CAP)
      const { data: dreBase } = await supabase.from('view_dre_custo_leve').select('*').eq('quinzena', qz);
      // 2. Load Retaguarda
      const { data: retData } = await supabase.from('retaguarda').select('*').eq('quinzena', qz);
      
      setDreData(dreBase || []);
      setRetaguardaData(retData || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const processedData = useMemo(() => {
    if (!dreData.length) return [];

    // Identify active filiais for this quinzena
    const activeFiliais = dreData.filter(d => d.filial && d.filial !== 'N/A' && d.filial !== 'DESCONHECIDA')
                                 .map(d => d.filial.toUpperCase());
    
    // Group filiais by regional for fast allocation
    const regionalGroups = {};
    activeFiliais.forEach(f => {
      const reg = filialRegionalMap[f] || 'Sem Regional';
      if (!regionalGroups[reg.toUpperCase()]) regionalGroups[reg.toUpperCase()] = [];
      regionalGroups[reg.toUpperCase()].push(f);
    });

    // Initialize totals map
    const filialTotals = {};
    dreData.forEach(d => {
      const f = (d.filial || 'N/A').toUpperCase();
      if (f === 'N/A' || f === 'DESCONHECIDA') return;
      
      const faturamento = Number(d.faturamento_total) || 0;
      const valorImposto = faturamento * (imposto / 100);
      const receitaLiquida = faturamento - valorImposto;
      const agregados = Number(d.custo_capcar_pago) || 0;
      const penalidades = Number(d.penalidades) || 0;
      const margemBruta = receitaLiquida - agregados - penalidades;

      filialTotals[f] = {
        filial: f,
        regional: filialRegionalMap[f] || 'Sem Regional',
        faturamento,
        valorImposto,
        receitaLiquida,
        agregados,
        penalidades,
        margemBruta,
        retaguardaDireta: 0,
        retaguardaRateada: 0
      };
    });

    // Process Retaguarda Allocations
    retaguardaData.forEach(ret => {
      const target = (ret.filial || '').toUpperCase().trim();
      const val = Number(ret.valor_pago) || 0;
      
      if (filialTotals[target]) {
        // Direct allocation
        filialTotals[target].retaguardaDireta += val;
      } else if (target.includes('REGIONAL') || target.includes('REGIAO')) {
        // Regional allocation
        const targetReg = target.replace('REGIAO', 'REGIONAL').trim();
        // find matched regional group
        const matchedKey = Object.keys(regionalGroups).find(k => k === targetReg || k.includes(targetReg) || targetReg.includes(k));
        
        if (matchedKey && regionalGroups[matchedKey].length > 0) {
          const splitVal = val / regionalGroups[matchedKey].length;
          regionalGroups[matchedKey].forEach(f => {
            if (filialTotals[f]) filialTotals[f].retaguardaRateada += splitVal;
          });
        } else {
          // Fallback to all if regional not found
          const numFiliais = Object.keys(filialTotals).length;
          if (numFiliais > 0) {
            const splitVal = val / numFiliais;
            Object.values(filialTotals).forEach(ft => {
              ft.retaguardaRateada += splitVal;
            });
          }
        }
      } else {
        // Global allocation (corporativo)
        const numFiliais = Object.keys(filialTotals).length;
        if (numFiliais > 0) {
          const splitVal = val / numFiliais;
          Object.values(filialTotals).forEach(ft => {
            ft.retaguardaRateada += splitVal;
          });
        }
      }
    });

    // Final calculations
    return Object.values(filialTotals).map(ft => {
      const retaguardaTotal = ft.retaguardaDireta + ft.retaguardaRateada;
      const resultadoLiquido = ft.margemBruta - retaguardaTotal;
      const margemPerc = ft.faturamento > 0 ? (ft.margemBruta / ft.faturamento) * 100 : 0;
      const resultadoPerc = ft.faturamento > 0 ? (resultadoLiquido / ft.faturamento) * 100 : 0;
      
      return {
        ...ft,
        retaguardaTotal,
        resultadoLiquido,
        margemPerc,
        resultadoPerc
      };
    }).sort((a, b) => b.resultadoLiquido - a.resultadoLiquido);

  }, [dreData, retaguardaData, imposto, filialRegionalMap]);

  const uniqueRegionals = [...new Set(processedData.map(d => d.regional))].sort();
  const filteredData = processedData.filter(d => filtroRegional === 'TODAS' || d.regional === filtroRegional);

  const totais = filteredData.reduce((acc, curr) => {
    acc.faturamento += curr.faturamento;
    acc.valorImposto += curr.valorImposto;
    acc.receitaLiquida += curr.receitaLiquida;
    acc.agregados += curr.agregados;
    acc.penalidades += curr.penalidades;
    acc.margemBruta += curr.margemBruta;
    acc.retaguardaDireta += curr.retaguardaDireta;
    acc.retaguardaRateada += curr.retaguardaRateada;
    acc.retaguardaTotal += curr.retaguardaTotal;
    acc.resultadoLiquido += curr.resultadoLiquido;
    return acc;
  }, {
    faturamento: 0, valorImposto: 0, receitaLiquida: 0,
    agregados: 0, penalidades: 0, margemBruta: 0, retaguardaDireta: 0,
    retaguardaRateada: 0, retaguardaTotal: 0, resultadoLiquido: 0
  });

  const totalMargemPerc = totais.faturamento > 0 ? (totais.margemBruta / totais.faturamento) * 100 : 0;
  const totalResultadoPerc = totais.faturamento > 0 ? (totais.resultadoLiquido / totais.faturamento) * 100 : 0;

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filteredData.map(d => ({
      Filial: d.filial,
      Regional: d.regional,
      "Faturamento (R$)": d.faturamento,
      "Imposto (R$)": d.valorImposto,
      "Receita Líquida (R$)": d.receitaLiquida,
      "Custos Agregados (R$)": d.agregados,
      "Penalidades (R$)": d.penalidades,
      "Margem Bruta (R$)": d.margemBruta,
      "Margem (%)": d.margemPerc,
      "Retaguarda Direta (R$)": d.retaguardaDireta,
      "Retaguarda Rateio (R$)": d.retaguardaRateada,
      "Retaguarda Total (R$)": d.retaguardaTotal,
      "Resultado Líquido (R$)": d.resultadoLiquido,
      "Resultado (%)": d.resultadoPerc
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "DRE_Gerencial");
    XLSX.writeFile(wb, `DRE_Gerencial_${selectedQuinzena}.xlsx`);
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 bg-slate-950 min-h-full font-sans text-slate-200">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/2"></div>
          
          <div className="relative z-10 space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-600/20 text-blue-400 rounded-xl">
                <BarChart3 className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-3xl font-black text-white tracking-tight">DRE Gerencial</h1>
                <p className="text-slate-400 text-sm font-medium mt-1 flex items-center gap-2">
                  Visão Consolidada de Resultados por Filial
                </p>
              </div>
            </div>
          </div>

          <div className="relative z-10 flex flex-wrap items-center gap-3">
            <div className="bg-slate-800/80 p-2 rounded-xl border border-slate-700/50 flex items-center gap-3">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-2">Imposto (%)</label>
              <input 
                type="number" 
                step="0.01"
                value={imposto}
                onChange={e => setImposto(parseFloat(e.target.value) || 0)}
                className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 w-24 text-white text-sm font-bold focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
            
            <div className="bg-slate-800/80 p-2 rounded-xl border border-slate-700/50">
              <select 
                value={selectedQuinzena}
                onChange={e => setSelectedQuinzena(e.target.value)}
                className="bg-transparent text-white text-sm font-bold focus:outline-none w-32 cursor-pointer"
              >
                {quinzenas.map(q => <option key={q} value={q} className="bg-slate-800">{q}</option>)}
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
            <p className="text-slate-400 font-medium">Processando estrutura financeira...</p>
          </div>
        ) : !dreData.length ? (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center flex flex-col items-center justify-center">
            <AlertTriangle className="w-12 h-12 text-slate-500 mb-4" />
            <h3 className="text-xl font-bold text-white">Nenhum dado encontrado</h3>
            <p className="text-slate-400 mt-2">Não há registros de DRE base para a quinzena selecionada.</p>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* Global Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-5 rounded-3xl border border-slate-700 shadow-lg relative overflow-hidden">
                <div className="absolute -right-4 -bottom-4 opacity-10">
                  <DollarSign className="w-32 h-32" />
                </div>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Receita Líquida Total</p>
                <h3 className="text-2xl font-black text-white">{formatCurr(totais.receitaLiquida)}</h3>
                <p className="text-sm text-slate-500 mt-2">Fat. Bruto: {formatCurr(totais.faturamento)}</p>
              </div>
              
              <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-5 rounded-3xl border border-slate-700 shadow-lg relative overflow-hidden">
                <div className="absolute -right-4 -bottom-4 opacity-10">
                  <Calculator className="w-32 h-32" />
                </div>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Custos Totais</p>
                <h3 className="text-2xl font-black text-white">{formatCurr(totais.agregados + totais.retaguardaTotal + totais.penalidades)}</h3>
                <div className="flex flex-col mt-2 gap-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-medium text-slate-500">Agregados:</span>
                    <span className="text-slate-300 font-bold">{formatCurr(totais.agregados)}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-medium text-slate-500">Penalidades:</span>
                    <span className="text-slate-300 font-bold">{formatCurr(totais.penalidades)}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-medium text-slate-500">Retaguarda:</span>
                    <span className="text-slate-300 font-bold">{formatCurr(totais.retaguardaTotal)}</span>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-5 rounded-3xl border border-slate-700 shadow-lg relative overflow-hidden">
                <div className="absolute -right-4 -bottom-4 opacity-10">
                  <PieChart className="w-32 h-32" />
                </div>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Margem Bruta (Após Agregados)</p>
                <h3 className="text-2xl font-black text-blue-400">{formatCurr(totais.margemBruta)}</h3>
                <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 text-xs font-bold border border-blue-500/20">
                  {formatPerc(totalMargemPerc)}
                </div>
              </div>

              <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-5 rounded-3xl border border-slate-700 shadow-lg relative overflow-hidden">
                <div className="absolute -right-4 -bottom-4 opacity-10">
                  <Wallet className="w-32 h-32" />
                </div>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Resultado Líquido Final</p>
                <h3 className={`text-2xl font-black ${totais.resultadoLiquido >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {formatCurr(totais.resultadoLiquido)}
                </h3>
                <div className={`mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-bold border ${totais.resultadoLiquido >= 0 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                  {totais.resultadoLiquido >= 0 ? <TrendingUp className="w-3 h-3"/> : <TrendingDown className="w-3 h-3"/>}
                  {formatPerc(totalResultadoPerc)}
                </div>
              </div>
            </div>

            {/* Main Data Table */}
            <div className="bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden shadow-xl">
              <div className="p-5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-indigo-400" />
                  Detalhamento por Filial
                </h2>
                
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2">
                    <Filter className="w-4 h-4 text-slate-500" />
                    <select 
                      value={filtroRegional}
                      onChange={e => setFiltroRegional(e.target.value)}
                      className="bg-transparent text-sm font-medium text-slate-300 focus:outline-none"
                    >
                      <option value="TODAS">Todas as Regionais</option>
                      {uniqueRegionals.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  
                  <button onClick={exportToExcel} className="p-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-xl transition-colors border border-emerald-500/20 flex items-center gap-2 text-sm font-bold">
                    <Download className="w-4 h-4" /> Excel
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-950/50 text-slate-400 text-xs uppercase tracking-wider font-bold">
                      <th className="p-4 border-b border-slate-800 whitespace-nowrap">Filial</th>
                      <th className="p-4 border-b border-slate-800 text-right whitespace-nowrap">Receita Líquida</th>
                      <th className="p-4 border-b border-slate-800 text-right whitespace-nowrap">Agregados</th>
                      <th className="p-4 border-b border-slate-800 text-right whitespace-nowrap">Penalidades</th>
                      <th className="p-4 border-b border-slate-800 text-right whitespace-nowrap">Margem Bruta</th>
                      <th className="p-4 border-b border-slate-800 text-right whitespace-nowrap bg-indigo-950/20">Retaguarda</th>
                      <th className="p-4 border-b border-slate-800 text-right whitespace-nowrap bg-blue-950/20">Resultado Final</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {filteredData.map((row, idx) => (
                      <tr key={row.filial} className="hover:bg-slate-800/30 transition-colors group">
                        <td className="p-4">
                          <div className="font-bold text-white">{row.filial}</div>
                          <div className="text-xs text-slate-500">{row.regional}</div>
                        </td>
                        <td className="p-4 text-right">
                          <div className="font-medium text-slate-300">{formatCurr(row.receitaLiquida)}</div>
                          <div className="text-[10px] text-slate-500">Fat: {formatCurr(row.faturamento)}</div>
                        </td>
                        <td className="p-4 text-right">
                          <div className="font-medium text-rose-400">{formatCurr(row.agregados)}</div>
                        </td>
                        <td className="p-4 text-right">
                          <div className="font-medium text-orange-400">{formatCurr(row.penalidades)}</div>
                        </td>
                        <td className="p-4 text-right">
                          <div className="font-bold text-blue-400">{formatCurr(row.margemBruta)}</div>
                          <div className="text-xs text-blue-500/70">{formatPerc(row.margemPerc)}</div>
                        </td>
                        <td className="p-4 text-right bg-indigo-950/10">
                          <div className="font-medium text-indigo-400">{formatCurr(row.retaguardaTotal)}</div>
                          <div className="text-[10px] text-slate-500">Dir: {formatCurr(row.retaguardaDireta)} | Rat: {formatCurr(row.retaguardaRateada)}</div>
                        </td>
                        <td className={`p-4 text-right bg-blue-950/10 ${row.resultadoLiquido >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          <div className="font-black">{formatCurr(row.resultadoLiquido)}</div>
                          <div className="text-xs opacity-70 flex items-center justify-end gap-1">
                            {formatPerc(row.resultadoPerc)}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredData.length === 0 && (
                      <tr>
                        <td colSpan="6" className="p-8 text-center text-slate-500">Nenhuma filial encontrada para esta seleção.</td>
                      </tr>
                    )}
                  </tbody>
                  {filteredData.length > 0 && (
                    <tfoot className="bg-slate-950 border-t-2 border-slate-800">
                      <tr>
                        <td className="p-4 font-black text-white uppercase text-sm">TOTAL GERAL</td>
                        <td className="p-4 text-right font-bold text-white">{formatCurr(totais.receitaLiquida)}</td>
                        <td className="p-4 text-right font-bold text-rose-400">{formatCurr(totais.agregados)}</td>
                        <td className="p-4 text-right font-bold text-blue-400">{formatCurr(totais.margemBruta)}<br/><span className="text-xs text-blue-500/70">{formatPerc(totalMargemPerc)}</span></td>
                        <td className="p-4 text-right font-bold text-indigo-400">{formatCurr(totais.retaguardaTotal)}</td>
                        <td className={`p-4 text-right font-black ${totais.resultadoLiquido >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {formatCurr(totais.resultadoLiquido)}<br/><span className="text-xs opacity-70">{formatPerc(totalResultadoPerc)}</span>
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
