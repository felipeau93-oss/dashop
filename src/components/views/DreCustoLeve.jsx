import React, { useState, useEffect } from 'react';
import { Car, Truck, DollarSign, TrendingUp, TrendingDown, Package, Percent, MapPin, Calendar, Clock, Map, Save, History, Trash2, X, Check } from "lucide-react";
import { tarifas as defaultTarifas } from '../../data/tarifas';
import { supabase } from '../../supabase';

const formatCurrency = (value) => {
  if (isNaN(value)) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

const KM_RANGES = ['1/100', '101/150', '151/200', '201/300', '301/99999'];
const KM_LABELS = {
  '1/100': '0 a 100 km',
  '101/150': '101 a 150 km',
  '151/200': '151 a 200 km',
  '201/300': '201 a 300 km',
  '301/99999': 'Acima de 300 km'
};

const VehicleCard = ({ title, icon: Icon, data, custosMotorista, setCustosMotorista, isCompetitorMode, compCustos, setCompCustos, activeTarifas }) => {
  const { imposto, diaSemana, turno } = data;

  const normalizeString = (str) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

  const handleChangeDiaria = (range, value, isCompetitor = false) => {
    const numValue = Number(value) || 0;
    const currentState = isCompetitor ? compCustos : custosMotorista;
    const setState = isCompetitor ? setCompCustos : setCustosMotorista;
    const newCustos = { ...currentState, [range]: value };

    // Se alterou a primeira faixa, calcula o sugerido para as demais
    if (range === '1/100') {
      const tarifaBaseObj = activeTarifas.find(t => normalizeString(t.categoria) === normalizeString(title) && t.range === '1/100' && t.diaSem === diaSemana && t.ciclo === turno);
      const faturamentoBase100 = tarifaBaseObj ? tarifaBaseObj.tarifa : 0;
      const receitaTotal100 = faturamentoBase100;
      const impostoTotal100 = receitaTotal100 * (Number(imposto) / 100);
      const margemR100 = receitaTotal100 - impostoTotal100 - numValue;
      const margemPctBase = receitaTotal100 > 0 ? (margemR100 / receitaTotal100) : 0;

      KM_RANGES.forEach(r => {
        if (r !== '1/100') {
          const tObj = activeTarifas.find(t => normalizeString(t.categoria) === normalizeString(title) && t.range === r && t.diaSem === diaSemana && t.ciclo === turno);
          const rBase = tObj ? tObj.tarifa : 0;
          const rTot = rBase;
          const imp = rTot * (Number(imposto) / 100);
          const mR = rTot * margemPctBase;
          const suggestedDiaria = rTot - imp - mR;
          newCustos[r] = suggestedDiaria > 0 ? suggestedDiaria.toFixed(2) : "0";
        }
      });
    }

    setState(newCustos);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
      <div className="bg-slate-50 border-b border-slate-200 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-slate-200 p-2 rounded-lg text-slate-700">
            <Icon className="w-6 h-6" />
          </div>
          <h3 className="font-black text-slate-800 text-lg uppercase tracking-tight">{title}</h3>
        </div>
      </div>
      
      <div className="p-3 flex-1 flex flex-col gap-3 justify-between">
        <div className="flex flex-col gap-3">
          {KM_RANGES.map((range, index) => {
            const tarifaObj = activeTarifas.find(t => normalizeString(t.categoria) === normalizeString(title) && t.range === range && t.diaSem === diaSemana && t.ciclo === turno);
            const faturamentoBase = tarifaObj ? tarifaObj.tarifa : 0;
            
            const receitaTotal = faturamentoBase;
            const impostoTotal = receitaTotal * (Number(imposto) / 100);
            
            const motoristaVal = Number(custosMotorista[range]) || 0;
            const compVal = Number(compCustos ? compCustos[range] : 0) || 0;

            const margemLiquidaR = receitaTotal - impostoTotal - motoristaVal;
            const margemLiquidaPct = receitaTotal > 0 ? (margemLiquidaR / receitaTotal) * 100 : 0;

            const margemCompR = receitaTotal - impostoTotal - compVal;
            const margemCompPct = receitaTotal > 0 ? (margemCompR / receitaTotal) * 100 : 0;
            
            const diffVal = motoristaVal - compVal;

            const isLucro = margemLiquidaPct > 0;
            const isZero = margemLiquidaPct === 0;

            return (
              <div key={range} className="flex flex-col p-3 border border-slate-100 rounded-xl bg-slate-50 shadow-sm relative overflow-hidden">
                <div className={`absolute top-0 left-0 w-1 h-full ${isLucro ? 'bg-emerald-500' : isZero ? 'bg-slate-300' : 'bg-red-500'}`}></div>
                
                <div className="flex justify-between items-center pl-2 mb-2">
                  <span className="text-[11px] font-black uppercase text-slate-600 tracking-wider flex gap-1 items-center">
                    {index === 0 && <span className="bg-blue-100 text-blue-700 px-1 py-0.5 rounded text-[8px]">BASE</span>}
                    {KM_LABELS[range]}
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-800">Rec: {formatCurrency(receitaTotal)}</span>
                </div>
                
                {isCompetitorMode ? (
                  <>
                    <div className="grid grid-cols-2 gap-2 pl-2">
                      <div className="flex flex-col gap-1 p-2 bg-white border border-slate-200 rounded-lg shadow-sm relative">
                        <span className="text-[9px] font-bold text-blue-600 uppercase tracking-wider mb-0.5">Sua Diária</span>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-1.5 flex items-center pointer-events-none"><DollarSign className="w-3 h-3 text-slate-400" /></div>
                          <input type="number" value={custosMotorista[range] !== undefined ? custosMotorista[range] : ""} onChange={(e) => handleChangeDiaria(range, e.target.value, false)} className="pl-5 w-full bg-slate-50 border border-slate-200 rounded px-1.5 py-1 text-slate-800 font-bold text-[10px] focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="0,00" />
                        </div>
                        <div className="flex justify-between items-center mt-1">
                          <span className="text-[9px] uppercase font-bold text-slate-400">Margem</span>
                          <span className={`font-bold text-[10px] ${isLucro ? 'text-emerald-600' : 'text-red-600'}`}>{margemLiquidaPct.toFixed(1)}%</span>
                        </div>
                      </div>

                      <div className="flex flex-col gap-1 p-2 bg-orange-50 border border-orange-200 rounded-lg shadow-sm relative">
                        <span className="text-[9px] font-bold text-orange-600 uppercase tracking-wider mb-0.5">Concorrente</span>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-1.5 flex items-center pointer-events-none"><DollarSign className="w-3 h-3 text-orange-400" /></div>
                          <input type="number" value={compCustos[range] !== undefined ? compCustos[range] : ""} onChange={(e) => handleChangeDiaria(range, e.target.value, true)} className="pl-5 w-full bg-white border border-orange-200 rounded px-1.5 py-1 text-slate-800 font-bold text-[10px] focus:outline-none focus:ring-1 focus:ring-orange-500" placeholder="0,00" />
                        </div>
                        <div className="flex justify-between items-center mt-1">
                          <span className="text-[9px] uppercase font-bold text-orange-400">Margem</span>
                          <span className={`font-bold text-[10px] ${margemCompPct > 0 ? 'text-emerald-600' : 'text-red-600'}`}>{margemCompPct.toFixed(1)}%</span>
                        </div>
                      </div>
                    </div>
                    {compVal > 0 && motoristaVal > 0 && (
                      <div className="mt-2 text-center pl-2">
                        <span className={`text-[9px] uppercase font-black tracking-wider px-2 py-0.5 rounded-full ${diffVal > 0 ? 'bg-emerald-100 text-emerald-700' : diffVal < 0 ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}`}>
                          {diffVal > 0 ? `Pagamos + ${formatCurrency(diffVal)}` : diffVal < 0 ? `Pagamos ${formatCurrency(diffVal)}` : 'Empate no valor'}
                        </span>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex items-center gap-3 pl-2">
                    <div className="flex-1">
                      <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">{index === 0 ? "Sua Diária" : "Diária"}</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                          <DollarSign className="w-3 h-3 text-slate-400" />
                        </div>
                        <input
                          type="number"
                          value={custosMotorista[range] !== undefined ? custosMotorista[range] : ""}
                          onChange={(e) => handleChangeDiaria(range, e.target.value, false)}
                          className={`pl-6 w-full bg-white border ${index === 0 ? 'border-blue-200 focus:ring-blue-500' : 'border-slate-200 focus:ring-emerald-500'} rounded-lg px-2 py-1 text-slate-800 font-bold text-xs focus:outline-none focus:ring-2 transition-all`}
                          placeholder="0,00"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col items-end justify-end flex-1">
                      <span className="text-[9px] uppercase font-bold text-slate-400 mb-0.5">Margem</span>
                      <span className={`font-mono text-sm font-black leading-none ${isLucro ? 'text-emerald-600' : isZero ? 'text-slate-500' : 'text-red-600'}`}>
                        {formatCurrency(margemLiquidaR)}
                      </span>
                      <span className={`mt-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${isLucro ? 'bg-emerald-100 text-emerald-700' : isZero ? 'bg-slate-200 text-slate-600' : 'bg-red-100 text-red-700'}`}>
                        {margemLiquidaPct.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default function DreCustoLeve({ setAgentContext, dynamicTarifas = [] }) {
  const activeTarifas = dynamicTarifas && dynamicTarifas.length > 0 ? dynamicTarifas : defaultTarifas;
  
  const [imposto, setImposto] = useState(6.56);
  
  const [diaSemana, setDiaSemana] = useState('Seg-Sab');
  const [turno, setTurno] = useState('AM');
  const [isCompetitorMode, setIsCompetitorMode] = useState(false);
  
  // Simulador de Adicionais
  const [qtdParadas, setQtdParadas] = useState("");
  const [regiaoParada, setRegiaoParada] = useState("Capitais");
  
  // Opção A (Escalonada)
  const [custoOpA_0_60, setCustoOpA_0_60] = useState("");
  const [custoOpA_61_90, setCustoOpA_61_90] = useState("");
  const [custoOpA_91, setCustoOpA_91] = useState("");
  
  // Opção B (Fixo > 80)
  const [custoOpB_Fixo, setCustoOpB_Fixo] = useState("");

  const [cenarioAtivo, setCenarioAtivo] = useState("A");

  // Histórico
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyData, setHistoryData] = useState([]);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const { data: dbData, error } = await supabase
          .from('simulacoes')
          .select('*')
          .eq('type', 'custo_leve')
          .order('id', { ascending: false });

        if (error) throw error;
        
        const data = [];
        if (dbData && dbData.length > 0) {
          dbData.forEach((row) => {
            data.push({ ...row.data, docId: row.id });
          });
        }
        // Ordena para os mais recentes ficarem no topo (baseado no timestamp id)
        data.sort((a, b) => Number(b.id) - Number(a.id));
        setHistoryData(data);
      } catch (err) {
        console.error("Erro ao buscar histórico da nuvem:", err);
        // Fallback para local storage caso não consiga buscar
        try {
          const saved = localStorage.getItem('dreLevesHistory');
          if (saved) setHistoryData(JSON.parse(saved));
        } catch { }
      }
    };
    fetchHistory();
  }, []);

  const handleSaveSimulacao = async () => {
    const name = window.prompt("Digite um nome para identificar esta simulação:");
    if (!name) return;
    
    const newState = {
      id: Date.now().toString(),
      date: new Date().toLocaleString('pt-BR'),
      name,
      state: {
        imposto, diaSemana, turno, isCompetitorMode,
        qtdParadas, regiaoParada,
        custoOpA_0_60, custoOpA_61_90, custoOpA_91,
        custoOpB_Fixo, cenarioAtivo,
        motPasseio, motUtil, motVan, motVuc,
        compMotPasseio, compMotUtil, compMotVan, compMotVuc
      }
    };
    
    try {
      const { data: insertedData, error } = await supabase
        .from('simulacoes')
        .insert([{
          date: newState.date,
          name: newState.name,
          type: 'custo_leve',
          data: newState
        }])
        .select()
        .single();

      if (error) throw error;
      
      console.log("Salvo na nuvem com ID: ", insertedData.id);
      
      const newHistory = [newState, ...historyData];
      setHistoryData(newHistory);
      localStorage.setItem('dreLevesHistory', JSON.stringify(newHistory));
      alert("Simulação salva na nuvem com sucesso! ☁️");
      
    } catch (error) {
      console.error("Erro ao salvar no Firebase: ", error);
      alert("Ops! Deu um erro ao salvar na nuvem.");
    }
  };

  const handleLoadSimulacao = (item) => {
    if (!window.confirm(`Deseja carregar a simulação "${item.name}"? Os dados atuais não salvos serão perdidos.`)) return;
    const { state } = item;
    setImposto(state.imposto || 6.56);
    setDiaSemana(state.diaSemana || 'Seg-Sab');
    setTurno(state.turno || 'AM');
    setIsCompetitorMode(state.isCompetitorMode || false);
    setQtdParadas(state.qtdParadas || "");
    setRegiaoParada(state.regiaoParada || "Capitais");
    setCustoOpA_0_60(state.custoOpA_0_60 || "");
    setCustoOpA_61_90(state.custoOpA_61_90 || "");
    setCustoOpA_91(state.custoOpA_91 || "");
    setCustoOpB_Fixo(state.custoOpB_Fixo || "");
    setCenarioAtivo(state.cenarioAtivo || "A");
    setMotPasseio(state.motPasseio || {});
    setMotUtil(state.motUtil || {});
    setMotVan(state.motVan || {});
    setMotVuc(state.motVuc || {});
    setCompMotPasseio(state.compMotPasseio || {});
    setCompMotUtil(state.compMotUtil || {});
    setCompMotVan(state.compMotVan || {});
    setCompMotVuc(state.compMotVuc || {});
    setShowHistoryModal(false);
  };

  const handleDeleteSimulacao = async (id, docId) => {
    if (!window.confirm("Deseja realmente apagar esta simulação do histórico?")) return;
    
    try {
      if (docId) {
        await supabase.from('simulacoes').delete().eq('id', docId);
      }
      const newHistory = historyData.filter(h => h.id !== id);
      setHistoryData(newHistory);
      localStorage.setItem('dreLevesHistory', JSON.stringify(newHistory));
    } catch (error) {
      console.error("Erro ao deletar da nuvem:", error);
      alert("Ops! Deu um erro ao apagar na nuvem.");
    }
  };

  // Cálculos do Simulador
  const q = Number(qtdParadas) || 0;
  
  // Faturamento
  let faturamentoCalculado = 0;
  if (q > 0) {
    const calc1 = Math.min(q, 60);
    faturamentoCalculado += calc1 * 0.65;
    const rest1 = q - calc1;
    if (rest1 > 0) {
       const calc2 = Math.min(rest1, 30);
       faturamentoCalculado += calc2 * (regiaoParada === 'Capitais' ? 2.00 : 1.50);
       const rest2 = rest1 - calc2;
       if (rest2 > 0) {
          faturamentoCalculado += rest2 * 0.75;
       }
    }
  }

  // Custo A
  let custoA = 0;
  if (q > 0) {
    const c1 = Math.min(q, 60);
    custoA += c1 * (Number(custoOpA_0_60) || 0);
    const r1 = q - c1;
    if (r1 > 0) {
       const c2 = Math.min(r1, 30);
       custoA += c2 * (Number(custoOpA_61_90) || 0);
       const r2 = r1 - c2;
       if (r2 > 0) {
          custoA += r2 * (Number(custoOpA_91) || 0);
       }
    }
  }

  // Custo B
  let custoB = 0;
  if (q >= 80) {
    custoB = Number(custoOpB_Fixo) || 0;
  }

  const impostoSobreParadas = faturamentoCalculado * (Number(imposto) / 100);

  const faturamentoAdicional = faturamentoCalculado;
  const custoAdicional = cenarioAtivo === 'A' ? custoA : (cenarioAtivo === 'B' ? custoB : 0);

  // Motoristas Repasse (Agrupado por veículo, contendo objeto com os KMs)
  const [motPasseio, setMotPasseio] = useState({});
  const [motUtil, setMotUtil] = useState({});
  const [motVan, setMotVan] = useState({});
  const [motVuc, setMotVuc] = useState({});
  
  // Repasse do Concorrente
  const [compMotPasseio, setCompMotPasseio] = useState({});
  const [compMotUtil, setCompMotUtil] = useState({});
  const [compMotVan, setCompMotVan] = useState({});
  const [compMotVuc, setCompMotVuc] = useState({});

  const globalData = { imposto, diaSemana, turno };

  return (
    <div className="h-full w-full bg-slate-50 flex flex-col overflow-hidden relative">
      <div className="p-6 bg-white border-b border-slate-200 sticky top-0 z-10 shrink-0 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3 tracking-tight">
            <Car className="w-7 h-7 text-emerald-600" /> DRE Custo Leves (Last Mile)
          </h2>
          <p className="text-slate-500 mt-1 text-sm font-medium">Preencha a diária da Faixa BASE para ver as sugestões, e altere as demais como desejar.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={handleSaveSimulacao} className="flex items-center gap-2 bg-blue-50 text-blue-700 hover:bg-blue-100 px-4 py-2 rounded-xl font-bold text-sm transition-all border border-blue-200">
            <Save className="w-4 h-4" /> Salvar Cenário
          </button>
          <button onClick={() => setShowHistoryModal(true)} className="flex items-center gap-2 bg-slate-100 text-slate-700 hover:bg-slate-200 px-4 py-2 rounded-xl font-bold text-sm transition-all border border-slate-200">
            <History className="w-4 h-4" /> Histórico {historyData.length > 0 && `(${historyData.length})`}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
        
        {/* PARÂMETROS GERAIS DA RECEITA */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-500" /> Parâmetros de Faturamento (Automático)
            </h3>
            <button onClick={() => setIsCompetitorMode(!isCompetitorMode)} className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-black tracking-widest uppercase transition-all border shadow-sm ${isCompetitorMode ? 'bg-orange-50 text-orange-600 border-orange-200 hover:bg-orange-100' : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'}`}>
               <TrendingUp className="w-3.5 h-3.5" /> Modo Concorrente: {isCompetitorMode ? 'ON' : 'OFF'}
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Dia da Semana</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Calendar className="w-4 h-4 text-slate-400" /></div>
                <select value={diaSemana} onChange={(e) => setDiaSemana(e.target.value)} className="pl-10 w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all appearance-none cursor-pointer">
                  <option value="Seg-Sab">Segunda a Sábado</option>
                  <option value="Dom-Fer">Domingo e Feriados</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Turno</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Clock className="w-4 h-4 text-slate-400" /></div>
                <select value={turno} onChange={(e) => setTurno(e.target.value)} className="pl-10 w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all appearance-none cursor-pointer">
                  <option value="AM">AM</option>
                  <option value="PM">PM</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Impostos (%)</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Percent className="w-4 h-4 text-slate-400" /></div>
                <input type="number" step="0.01" value={imposto} onChange={(e) => setImposto(e.target.value)} className="pl-10 w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all" />
              </div>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-slate-100">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Package className="w-5 h-5 text-orange-500" /> Simulador de Paradas Extras (Cenários)
            </h3>
            
            <div className="bg-orange-50/50 border border-orange-100 rounded-2xl p-4 mb-6">
               <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 items-end">
                 <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Total de Paradas / Pacotes</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Package className="w-4 h-4 text-slate-400" /></div>
                      <input type="number" value={qtdParadas} onChange={(e) => setQtdParadas(e.target.value)} className="pl-10 w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all" placeholder="Qtd" />
                    </div>
                 </div>
                 <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Região</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><MapPin className="w-4 h-4 text-slate-400" /></div>
                      <select value={regiaoParada} onChange={(e) => setRegiaoParada(e.target.value)} className="pl-10 w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all cursor-pointer">
                         <option value="Capitais">Capitais</option>
                         <option value="Interior">Interior</option>
                      </select>
                    </div>
                 </div>
                 <div className="bg-white border border-orange-200 rounded-xl p-3 flex flex-col justify-center items-center shadow-sm">
                    <span className="text-[10px] font-bold text-orange-600 uppercase tracking-wider mb-1">Receita Faturada (Escalonada)</span>
                    <span className="text-xl font-black text-slate-800 font-mono">{formatCurrency(faturamentoCalculado)}</span>
                 </div>
               </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
               {/* OPÇÃO A */}
               <div className="border-2 border-slate-200 rounded-2xl p-5 bg-white relative">
                  <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-blue-500" /> Opção A: Custo Escalonado
                  </h4>
                  <div className="grid grid-cols-3 gap-3 mb-4">
                     <div>
                       <label className="block text-[10px] font-bold text-slate-500 mb-1">0 a 60 un</label>
                       <input type="number" step="0.01" value={custoOpA_0_60} onChange={(e) => setCustoOpA_0_60(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-slate-800 font-bold text-xs focus:ring-2 focus:ring-orange-500/20" placeholder="R$" />
                     </div>
                     <div>
                       <label className="block text-[10px] font-bold text-slate-500 mb-1">61 a 90 un</label>
                       <input type="number" step="0.01" value={custoOpA_61_90} onChange={(e) => setCustoOpA_61_90(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-slate-800 font-bold text-xs focus:ring-2 focus:ring-orange-500/20" placeholder="R$" />
                     </div>
                     <div>
                       <label className="block text-[10px] font-bold text-slate-500 mb-1">Acima de 91</label>
                       <input type="number" step="0.01" value={custoOpA_91} onChange={(e) => setCustoOpA_91(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-slate-800 font-bold text-xs focus:ring-2 focus:ring-orange-500/20" placeholder="R$" />
                     </div>
                  </div>
                  <div className="flex justify-between items-end pt-4 border-t border-slate-100">
                     <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Custo Total A</span>
                        <span className="font-mono font-bold text-slate-800">{formatCurrency(custoA)}</span>
                     </div>
                     <div className="flex flex-col text-right">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Lucro Extra A (Líquido)</span>
                        <span className={`font-mono font-black text-lg ${faturamentoCalculado - impostoSobreParadas - custoA > 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatCurrency(faturamentoCalculado - impostoSobreParadas - custoA)}</span>
                     </div>
                  </div>
               </div>

               {/* OPÇÃO B */}
               <div className="border-2 border-slate-200 rounded-2xl p-5 bg-white relative">
                  <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Check className="w-4 h-4 text-violet-500" /> Opção B: Custo Fixo Único
                  </h4>
                  <div className="mb-4">
                     <label className="block text-[10px] font-bold text-slate-500 mb-1">Valor fixo pago ao atingir 80 paradas</label>
                     <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><DollarSign className="w-4 h-4 text-slate-400" /></div>
                        <input type="number" step="0.01" value={custoOpB_Fixo} onChange={(e) => setCustoOpB_Fixo(e.target.value)} className="pl-10 w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-slate-800 font-bold focus:ring-2 focus:ring-orange-500/20 transition-all" placeholder="R$ Fixo" />
                     </div>
                  </div>
                  <div className="flex justify-between items-end pt-4 border-t border-slate-100 mt-[1.35rem]">
                     <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Custo Total B</span>
                        <span className="font-mono font-bold text-slate-800">{formatCurrency(custoB)}</span>
                     </div>
                     <div className="flex flex-col text-right">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Lucro Extra B (Líquido)</span>
                        <span className={`font-mono font-black text-lg ${faturamentoCalculado - impostoSobreParadas - custoB > 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatCurrency(faturamentoCalculado - impostoSobreParadas - custoB)}</span>
                     </div>
                  </div>
               </div>
            </div>
          </div>
        </div>

        {/* COMPARAÇÃO DOS VEÍCULOS */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          <VehicleCard title="Passeio" icon={Car} data={globalData} custosMotorista={motPasseio} setCustosMotorista={setMotPasseio} isCompetitorMode={isCompetitorMode} compCustos={compMotPasseio} setCompCustos={setCompMotPasseio} activeTarifas={activeTarifas} />
          <VehicleCard title="Utilitário" icon={Truck} data={globalData} custosMotorista={motUtil} setCustosMotorista={setMotUtil} isCompetitorMode={isCompetitorMode} compCustos={compMotUtil} setCompCustos={setCompMotUtil} activeTarifas={activeTarifas} />
          <VehicleCard title="Van" icon={Truck} data={globalData} custosMotorista={motVan} setCustosMotorista={setMotVan} isCompetitorMode={isCompetitorMode} compCustos={compMotVan} setCompCustos={setCompMotVan} activeTarifas={activeTarifas} />
          <VehicleCard title="VUC" icon={Truck} data={globalData} custosMotorista={motVuc} setCustosMotorista={setMotVuc} isCompetitorMode={isCompetitorMode} compCustos={compMotVuc} setCompCustos={setCompMotVuc} activeTarifas={activeTarifas} />
        </div>

      </div>

      {showHistoryModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                <History className="w-5 h-5 text-blue-500" /> Histórico de Simulações Salvas
              </h3>
              <button onClick={() => setShowHistoryModal(false)} className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              {historyData.length === 0 ? (
                <div className="text-center py-10">
                  <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 font-bold">Nenhum cenário salvo ainda.</p>
                  <p className="text-slate-400 text-sm mt-1">Clique em "Salvar Cenário" lá em cima para criar o primeiro.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {historyData.map(item => (
                    <div key={item.id} className="border border-slate-200 rounded-xl p-4 flex justify-between items-center hover:border-blue-300 transition-colors group">
                      <div>
                        <h4 className="font-bold text-slate-800">{item.name}</h4>
                        <p className="text-xs font-bold text-slate-400 mt-1 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Salvo em {item.date}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleDeleteSimulacao(item.id, item.docId)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Apagar">
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleLoadSimulacao(item)} className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-bold text-xs rounded-lg transition-colors">
                          Carregar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


