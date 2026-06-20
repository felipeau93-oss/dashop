import React, { useState, useEffect, useMemo } from 'react';
import { Truck, DollarSign, TrendingUp, TrendingDown, Save, History, Trash2, X, Clock, Plus, Fuel, Wrench, Shield, Users, CircleDollarSign, Percent, FileText, ChevronDown, ChevronUp, Copy, CalendarDays } from 'lucide-react';
import { db, getCollectionName } from './firebase';
import { collection, addDoc, getDocs, doc, deleteDoc } from "firebase/firestore";

const formatCurrency = (value) => {
  if (isNaN(value) || value === null || value === undefined) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

const formatPercent = (value) => {
  if (isNaN(value)) return '0,0%';
  return value.toFixed(1).replace('.', ',') + '%';
};

// Modelo em branco de uma análise
const createBlankAnalysis = (id) => ({
  id,
  nome: '',
  tipoVeiculo: '',
  valorRotaDia: '',
  parcelaAluguel: '',
  autonomiaKmL: '',
  precoCombustivel: '',
  valorMotorista: '',
  manutencao: '',
  provisaoFranquiaSeguro: '',
  custoPneu: '',
  regimeTributario: 'mei', // 'mei' ou 'simples'
  impostoFixoMei: '75.90',
  impostosSimplesPct: '6.56',
  kmRodadosDia: '',
  qtdRotasMes: '22',
});

const AnalysisCard = ({ analysis, onUpdate, onRemove, onDuplicate, canRemove }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleChange = (field, value) => {
    onUpdate(analysis.id, { ...analysis, [field]: value });
  };

  // === CÁLCULOS ===
  const calc = useMemo(() => {
    const valorRota = Number(analysis.valorRotaDia) || 0;
    const parcela = Number(analysis.parcelaAluguel) || 0;
    const autonomia = Number(analysis.autonomiaKmL) || 0;
    const precoComb = Number(analysis.precoCombustivel) || 0;
    const valorMot = Number(analysis.valorMotorista) || 0;
    const manutencao = Number(analysis.manutencao) || 0;
    const franquiaSeguro = Number(analysis.provisaoFranquiaSeguro) || 0;
    const custoPneu = Number(analysis.custoPneu) || 0;
    const kmDia = Number(analysis.kmRodadosDia) || 0;
    const qtdRotas = Number(analysis.qtdRotasMes) || 22;

    const isMei = analysis.regimeTributario === 'mei';
    const impostoFixoMei = Number(analysis.impostoFixoMei) || 0;
    const impostosSimplesPct = Number(analysis.impostosSimplesPct) || 0;

    // Receita
    const receitaBruta = valorRota;

    // Imposto diário
    let impostoValorDiario;
    let impostoLabel;
    if (isMei) {
      impostoValorDiario = qtdRotas > 0 ? impostoFixoMei / qtdRotas : 0;
      impostoLabel = `MEI Fixo R$${impostoFixoMei} ÷ ${qtdRotas} rotas`;
    } else {
      impostoValorDiario = receitaBruta * (impostosSimplesPct / 100);
      impostoLabel = `Simples ${impostosSimplesPct}%`;
    }

    const receitaLiquida = receitaBruta - impostoValorDiario;

    // Custo combustível
    const custoCombustivel = autonomia > 0 ? (kmDia / autonomia) * precoComb : 0;

    // Custos operacionais
    const totalCustosOperacionais = parcela + custoCombustivel + valorMot + manutencao + franquiaSeguro + custoPneu;

    // Resultado
    const resultado = receitaLiquida - totalCustosOperacionais;
    const margemPct = receitaBruta > 0 ? (resultado / receitaBruta) * 100 : 0;

    // Projeção mensal
    const resultadoMensal = resultado * qtdRotas;
    const receitaMensal = receitaBruta * qtdRotas;
    const custoMensal = totalCustosOperacionais * qtdRotas;
    const impostoMensal = isMei ? impostoFixoMei : impostoValorDiario * qtdRotas;

    return {
      receitaBruta,
      impostoValorDiario,
      impostoLabel,
      receitaLiquida,
      custoCombustivel,
      totalCustosOperacionais,
      resultado,
      margemPct,
      resultadoMensal,
      receitaMensal,
      custoMensal,
      impostoMensal,
      qtdRotas,
      isMei,
    };
  }, [analysis]);

  const isPositive = calc.resultado > 0;
  const isZero = calc.resultado === 0;

  const inputField = (label, field, icon, placeholder = '0,00', prefix = 'R$') => (
    <div className="flex flex-col gap-1.5">
      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
        {icon}
        {label}
      </label>
      <div className="relative">
        {prefix && (
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-[10px] font-bold text-slate-400 pointer-events-none">
            {prefix}
          </span>
        )}
        <input
          type="number"
          step="0.01"
          value={analysis[field]}
          onChange={(e) => handleChange(field, e.target.value)}
          className={`${prefix ? 'pl-9' : 'pl-3'} w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all hover:border-slate-300`}
          placeholder={placeholder}
        />
      </div>
    </div>
  );

  return (
    <div className={`bg-white border rounded-2xl shadow-sm overflow-hidden transition-all duration-300 ${isPositive ? 'border-emerald-200' : isZero ? 'border-slate-200' : 'border-red-200'}`}>
      {/* Header */}
      <div className={`p-4 flex items-center justify-between cursor-pointer select-none transition-colors ${isPositive ? 'bg-emerald-50/50' : isZero ? 'bg-slate-50' : 'bg-red-50/50'}`} onClick={() => setIsCollapsed(!isCollapsed)}>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className={`p-2.5 rounded-xl shadow-sm ${isPositive ? 'bg-emerald-100 text-emerald-700' : isZero ? 'bg-slate-200 text-slate-600' : 'bg-red-100 text-red-700'}`}>
            <Truck className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <input
              type="text"
              value={analysis.nome}
              onChange={(e) => { e.stopPropagation(); handleChange('nome', e.target.value); }}
              onClick={(e) => e.stopPropagation()}
              placeholder="Nome da análise (ex: Rota SP-RJ Fiorino)"
              className="text-base font-black text-slate-800 bg-transparent border-none outline-none w-full placeholder:text-slate-300 placeholder:font-medium"
            />
            <div className="flex items-center gap-3 mt-0.5">
              {analysis.tipoVeiculo && (
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-100 px-2 py-0.5 rounded-md">
                  {analysis.tipoVeiculo}
                </span>
              )}
              <span className={`text-xs font-black ${isPositive ? 'text-emerald-600' : isZero ? 'text-slate-500' : 'text-red-600'}`}>
                {formatCurrency(calc.resultado)}/dia · {formatPercent(calc.margemPct)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 ml-3">
          <button onClick={(e) => { e.stopPropagation(); onDuplicate(analysis.id); }} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Duplicar">
            <Copy className="w-4 h-4" />
          </button>
          {canRemove && (
            <button onClick={(e) => { e.stopPropagation(); onRemove(analysis.id); }} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Remover">
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          {isCollapsed ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronUp className="w-5 h-5 text-slate-400" />}
        </div>
      </div>

      {/* Body */}
      {!isCollapsed && (
        <div className="p-5 border-t border-slate-100">
          {/* Linha 1: Tipo de Veículo + Valor Rota + KM + Qtd Rotas */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5" />
                Tipo de Veículo
              </label>
              <select
                value={analysis.tipoVeiculo}
                onChange={(e) => handleChange('tipoVeiculo', e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all appearance-none cursor-pointer hover:border-slate-300"
              >
                <option value="">Selecione...</option>
                <option value="Passeio">Passeio</option>
                <option value="Utilitário">Utilitário</option>
                <option value="Van">Van</option>
                <option value="VUC">VUC</option>
                <option value="3/4">3/4</option>
                <option value="Toco">Toco</option>
                <option value="Truck">Truck</option>
                <option value="Carreta">Carreta</option>
                <option value="Moto">Moto</option>
                <option value="Outro">Outro</option>
              </select>
            </div>
            {inputField('Valor Rota/Dia', 'valorRotaDia', <DollarSign className="w-3.5 h-3.5" />, '0,00')}
            {inputField('KM Rodados/Dia', 'kmRodadosDia', <TrendingUp className="w-3.5 h-3.5" />, '0', 'KM')}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <CalendarDays className="w-3.5 h-3.5" />
                Qtd Rotas/Mês
              </label>
              <input
                type="number"
                step="1"
                value={analysis.qtdRotasMes}
                onChange={(e) => handleChange('qtdRotasMes', e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all hover:border-slate-300"
                placeholder="22"
              />
            </div>
          </div>

          {/* Linha 2: Custos do Veículo */}
          <div className="bg-slate-50 rounded-xl border border-slate-100 p-4 mb-5">
            <h4 className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Wrench className="w-3.5 h-3.5 text-orange-500" />
              Custos do Veículo
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-4">
              {inputField('Parcela/Aluguel', 'parcelaAluguel', <CircleDollarSign className="w-3.5 h-3.5" />)}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Fuel className="w-3.5 h-3.5" />
                  Autonomia (KM/L)
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-[10px] font-bold text-slate-400 pointer-events-none">KM/L</span>
                  <input type="number" step="0.1" value={analysis.autonomiaKmL} onChange={(e) => handleChange('autonomiaKmL', e.target.value)} className="pl-12 w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all hover:border-slate-300" placeholder="0,0" />
                </div>
              </div>
              {inputField('Preço Combustível', 'precoCombustivel', <Fuel className="w-3.5 h-3.5" />)}
              {inputField('Manutenção', 'manutencao', <Wrench className="w-3.5 h-3.5" />)}
              {inputField('Custo com Pneu', 'custoPneu', <CircleDollarSign className="w-3.5 h-3.5" />)}
              {inputField('Provisão Franquia Seguro', 'provisaoFranquiaSeguro', <Shield className="w-3.5 h-3.5" />)}
            </div>
          </div>

          {/* Linha 3: Custos de Pessoal + Impostos */}
          <div className="bg-blue-50/50 rounded-xl border border-blue-100 p-4 mb-5">
            <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Users className="w-3.5 h-3.5" />
              Motorista & Impostos
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {inputField('Valor a pagar Motorista', 'valorMotorista', <Users className="w-3.5 h-3.5" />)}

              {/* Regime Tributário */}
              <div className="flex flex-col gap-1.5 sm:col-span-1 lg:col-span-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Percent className="w-3.5 h-3.5" />
                  Regime Tributário
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleChange('regimeTributario', 'mei')}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all border ${analysis.regimeTributario === 'mei' ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white text-slate-500 border-slate-200 hover:border-blue-300'}`}
                  >
                    MEI (Fixo/Mês)
                  </button>
                  <button
                    onClick={() => handleChange('regimeTributario', 'simples')}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all border ${analysis.regimeTributario === 'simples' ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white text-slate-500 border-slate-200 hover:border-blue-300'}`}
                  >
                    Simples (%)
                  </button>
                </div>
              </div>

              {analysis.regimeTributario === 'mei' ? (
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5" />
                    Valor Fixo MEI/Mês
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-[10px] font-bold text-slate-400 pointer-events-none">R$</span>
                    <input type="number" step="0.01" value={analysis.impostoFixoMei} onChange={(e) => handleChange('impostoFixoMei', e.target.value)} className="pl-9 w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all hover:border-slate-300" placeholder="75,90" />
                  </div>
                  <span className="text-[9px] text-slate-400 font-medium">
                    = {formatCurrency(calc.impostoValorDiario)}/dia ({calc.qtdRotas} rotas)
                  </span>
                </div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Percent className="w-3.5 h-3.5" />
                    Alíquota Simples (%)
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-[10px] font-bold text-slate-400 pointer-events-none">%</span>
                    <input type="number" step="0.01" value={analysis.impostosSimplesPct} onChange={(e) => handleChange('impostosSimplesPct', e.target.value)} className="pl-7 w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all hover:border-slate-300" placeholder="6.56" />
                  </div>
                  <span className="text-[9px] text-slate-400 font-medium">
                    = {formatCurrency(calc.impostoValorDiario)}/dia
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* DRE Resultado */}
          <div className={`rounded-xl border-2 p-5 ${isPositive ? 'border-emerald-200 bg-emerald-50/30' : isZero ? 'border-slate-200 bg-slate-50' : 'border-red-200 bg-red-50/30'}`}>
            <h4 className="text-[10px] font-black text-slate-700 uppercase tracking-widest mb-4 flex items-center gap-2">
              <FileText className="w-3.5 h-3.5" />
              DRE — Demonstrativo de Resultado (por Rota)
            </h4>

            <div className="flex flex-col gap-2 text-sm">
              {/* Receita */}
              <div className="flex justify-between items-center py-2 px-3 bg-white rounded-lg">
                <span className="font-bold text-slate-600">Receita Bruta (Rota/Dia)</span>
                <span className="font-mono font-black text-slate-800">{formatCurrency(calc.receitaBruta)}</span>
              </div>
              <div className="flex justify-between items-center py-2 px-3">
                <span className="font-medium text-red-500 text-xs">(-) Impostos ({calc.impostoLabel})</span>
                <span className="font-mono font-bold text-red-500 text-xs">- {formatCurrency(calc.impostoValorDiario)}</span>
              </div>
              <div className="flex justify-between items-center py-2 px-3 bg-blue-50 rounded-lg border border-blue-100">
                <span className="font-bold text-blue-700 text-xs">(=) Receita Líquida</span>
                <span className="font-mono font-black text-blue-700">{formatCurrency(calc.receitaLiquida)}</span>
              </div>

              <div className="h-px bg-slate-200 my-1"></div>

              {/* Custos */}
              <div className="flex justify-between items-center py-1.5 px-3">
                <span className="font-medium text-slate-500 text-xs">(-) Parcela/Aluguel</span>
                <span className="font-mono text-slate-600 text-xs">{formatCurrency(Number(analysis.parcelaAluguel) || 0)}</span>
              </div>
              <div className="flex justify-between items-center py-1.5 px-3">
                <span className="font-medium text-slate-500 text-xs">(-) Combustível ({analysis.kmRodadosDia || 0}km ÷ {analysis.autonomiaKmL || 0}km/l × R${analysis.precoCombustivel || 0})</span>
                <span className="font-mono text-slate-600 text-xs">{formatCurrency(calc.custoCombustivel)}</span>
              </div>
              <div className="flex justify-between items-center py-1.5 px-3">
                <span className="font-medium text-slate-500 text-xs">(-) Motorista</span>
                <span className="font-mono text-slate-600 text-xs">{formatCurrency(Number(analysis.valorMotorista) || 0)}</span>
              </div>
              <div className="flex justify-between items-center py-1.5 px-3">
                <span className="font-medium text-slate-500 text-xs">(-) Manutenção</span>
                <span className="font-mono text-slate-600 text-xs">{formatCurrency(Number(analysis.manutencao) || 0)}</span>
              </div>
              <div className="flex justify-between items-center py-1.5 px-3">
                <span className="font-medium text-slate-500 text-xs">(-) Pneu</span>
                <span className="font-mono text-slate-600 text-xs">{formatCurrency(Number(analysis.custoPneu) || 0)}</span>
              </div>
              <div className="flex justify-between items-center py-1.5 px-3">
                <span className="font-medium text-slate-500 text-xs">(-) Franquia Seguro</span>
                <span className="font-mono text-slate-600 text-xs">{formatCurrency(Number(analysis.provisaoFranquiaSeguro) || 0)}</span>
              </div>

              <div className="flex justify-between items-center py-2 px-3 bg-orange-50 rounded-lg border border-orange-100">
                <span className="font-bold text-orange-700 text-xs">(=) Total Custos Operacionais</span>
                <span className="font-mono font-black text-orange-700">{formatCurrency(calc.totalCustosOperacionais)}</span>
              </div>

              <div className="h-px bg-slate-200 my-1"></div>

              {/* Resultado Diário */}
              <div className={`flex justify-between items-center py-3 px-4 rounded-xl border-2 ${isPositive ? 'bg-emerald-100 border-emerald-300' : isZero ? 'bg-slate-100 border-slate-300' : 'bg-red-100 border-red-300'}`}>
                <div className="flex items-center gap-2">
                  {isPositive ? <TrendingUp className="w-5 h-5 text-emerald-600" /> : <TrendingDown className="w-5 h-5 text-red-600" />}
                  <span className={`font-black text-sm ${isPositive ? 'text-emerald-700' : isZero ? 'text-slate-600' : 'text-red-700'}`}>
                    RESULTADO POR ROTA
                  </span>
                </div>
                <div className="text-right">
                  <span className={`font-mono font-black text-xl ${isPositive ? 'text-emerald-700' : isZero ? 'text-slate-600' : 'text-red-700'}`}>
                    {formatCurrency(calc.resultado)}
                  </span>
                  <span className={`block text-[10px] font-bold ${isPositive ? 'text-emerald-600' : isZero ? 'text-slate-500' : 'text-red-600'}`}>
                    Margem: {formatPercent(calc.margemPct)}
                  </span>
                </div>
              </div>

              {/* Projeção Mensal */}
              <div className="mt-3 grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 text-center">
                  <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Receita/Mês</span>
                  <span className="font-mono font-black text-sm text-slate-700">{formatCurrency(calc.receitaMensal)}</span>
                  <span className="block text-[9px] text-slate-400 font-medium">{calc.qtdRotas} rotas</span>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 text-center">
                  <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Custos/Mês</span>
                  <span className="font-mono font-black text-sm text-orange-600">{formatCurrency(calc.custoMensal)}</span>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 text-center">
                  <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Impostos/Mês</span>
                  <span className="font-mono font-black text-sm text-red-500">{formatCurrency(calc.impostoMensal)}</span>
                </div>
                <div className={`rounded-xl p-3 border text-center ${isPositive ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                  <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Resultado/Mês</span>
                  <span className={`font-mono font-black text-sm ${isPositive ? 'text-emerald-700' : 'text-red-700'}`}>{formatCurrency(calc.resultadoMensal)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const DreViabilidade = ({ setAgentContext }) => {
  const [analyses, setAnalyses] = useState([createBlankAnalysis(Date.now().toString())]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyData, setHistoryData] = useState([]);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveName, setSaveName] = useState('');

  // Contexto para o agente IA
  useEffect(() => {
    if (setAgentContext) {
      const ctx = analyses.map(a => {
        const valorRota = Number(a.valorRotaDia) || 0;
        const totalCustos = (Number(a.parcelaAluguel) || 0) + (Number(a.valorMotorista) || 0) + (Number(a.manutencao) || 0) + (Number(a.provisaoFranquiaSeguro) || 0) + (Number(a.custoPneu) || 0);
        const resultado = valorRota - (valorRota * (Number(a.impostosSimplesPct) || 0) / 100) - totalCustos;
        return `Análise "${a.nome || 'Sem nome'}": Veículo=${a.tipoVeiculo || 'N/A'}, Receita/dia=${formatCurrency(valorRota)}, Custos/dia=${formatCurrency(totalCustos)}, Resultado=${formatCurrency(resultado)}`;
      }).join('\n');
      setAgentContext(`Tela: DRE Viabilidade de Projeto\n${ctx}`);
    }
  }, [analyses, setAgentContext]);

  // Carregar histórico
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        // Tenta carregar do localStorage primeiro para ser mais rápido
        const cached = localStorage.getItem('dreViabilidadeHistory');
        if (cached) {
          setHistoryData(JSON.parse(cached));
        }

        const querySnapshot = await getDocs(collection(db, getCollectionName("simulacoes_testes")));
        const data = [];
        querySnapshot.forEach((document) => {
          const docData = document.data();
          if (docData.type === 'viabilidade') {
            data.push({ ...docData, docId: document.id });
          }
        });
        if (data.length > 0) {
          data.sort((a, b) => Number(b.id) - Number(a.id));
          setHistoryData(data);
          localStorage.setItem('dreViabilidadeHistory', JSON.stringify(data));
        }
      } catch (err) {
        console.error("Erro ao buscar histórico DRE Viabilidade:", err);
      }
    };
    fetchHistory();
  }, []);

  const handleUpdateAnalysis = (id, updatedAnalysis) => {
    setAnalyses(prev => prev.map(a => a.id === id ? updatedAnalysis : a));
  };

  const handleAddAnalysis = () => {
    setAnalyses(prev => [...prev, createBlankAnalysis(Date.now().toString())]);
  };

  const handleRemoveAnalysis = (id) => {
    if (analyses.length <= 1) return;
    setAnalyses(prev => prev.filter(a => a.id !== id));
  };

  const handleDuplicateAnalysis = (id) => {
    const original = analyses.find(a => a.id === id);
    if (!original) return;
    const duplicate = { ...original, id: Date.now().toString(), nome: (original.nome || 'Análise') + ' (cópia)' };
    setAnalyses(prev => [...prev, duplicate]);
  };

  const handleSave = async () => {
    setShowSaveModal(true);
    setSaveName('');
  };

  const confirmSave = async () => {
    if (!saveName.trim()) return;
    setShowSaveModal(false);

    const saveData = {
      id: Date.now().toString(),
      date: new Date().toLocaleString('pt-BR'),
      name: saveName.trim(),
      type: 'viabilidade',
      analyses: analyses,
    };

    try {
      const docRef = await addDoc(collection(db, getCollectionName("simulacoes_testes")), saveData);
      const newHistory = [{ ...saveData, docId: docRef.id }, ...historyData];
      setHistoryData(newHistory);
      localStorage.setItem('dreViabilidadeHistory', JSON.stringify(newHistory));
    } catch (error) {
      console.error("Erro ao salvar:", error);
      const newHistory = [saveData, ...historyData];
      setHistoryData(newHistory);
      localStorage.setItem('dreViabilidadeHistory', JSON.stringify(newHistory));
    }
    setSaveName('');
  };

  const handleLoad = (item) => {
    if (!window.confirm(`Deseja carregar "${item.name}"? Os dados atuais não salvos serão perdidos.`)) return;
    setAnalyses(item.analyses || [createBlankAnalysis(Date.now().toString())]);
    setShowHistoryModal(false);
  };

  const handleDelete = async (id, docId) => {
    if (!window.confirm("Deseja apagar esta simulação do histórico?")) return;
    try {
      if (docId) {
        await deleteDoc(doc(db, getCollectionName("simulacoes"), docId));
      }
      const newHistory = historyData.filter(h => h.id !== id);
      setHistoryData(newHistory);
      localStorage.setItem('dreViabilidadeHistory', JSON.stringify(newHistory));
    } catch (error) {
      console.error("Erro ao deletar:", error);
      // Remove do cache local mesmo se der erro no Firebase
      const newHistory = historyData.filter(h => h.id !== id);
      setHistoryData(newHistory);
      localStorage.setItem('dreViabilidadeHistory', JSON.stringify(newHistory));
    }
  };

  // Resumo consolidado
  const totals = useMemo(() => {
    let totalReceita = 0, totalCustos = 0, totalResultado = 0;
    analyses.forEach(a => {
      const valorRota = Number(a.valorRotaDia) || 0;
      const isMei = a.regimeTributario === 'mei';
      const qtdRotas = Number(a.qtdRotasMes) || 22;
      const impostoFixo = Number(a.impostoFixoMei) || 0;
      const impostosPct = Number(a.impostosSimplesPct) || 0;
      const impostoValor = isMei ? (qtdRotas > 0 ? impostoFixo / qtdRotas : 0) : valorRota * (impostosPct / 100);
      const receitaLiq = valorRota - impostoValor;

      const autonomia = Number(a.autonomiaKmL) || 0;
      const precoComb = Number(a.precoCombustivel) || 0;
      const kmDia = Number(a.kmRodadosDia) || 0;
      const custoComb = autonomia > 0 ? (kmDia / autonomia) * precoComb : 0;

      const custos = (Number(a.parcelaAluguel) || 0) + custoComb + (Number(a.valorMotorista) || 0) + (Number(a.manutencao) || 0) + (Number(a.provisaoFranquiaSeguro) || 0) + (Number(a.custoPneu) || 0);

      totalReceita += valorRota;
      totalCustos += custos;
      totalResultado += receitaLiq - custos;
    });
    const margemGlobal = totalReceita > 0 ? (totalResultado / totalReceita) * 100 : 0;
    return { totalReceita, totalCustos, totalResultado, margemGlobal };
  }, [analyses]);

  return (
    <div className="w-full bg-slate-50 flex flex-col relative">
      {/* Header */}
      <div className="p-6 bg-white border-b border-slate-200 shrink-0 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 rounded-t-2xl">
        <div>
          <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3 tracking-tight">
            <FileText className="w-7 h-7 text-violet-600" /> DRE Viabilidade de Projeto
          </h2>
          <p className="text-slate-500 mt-1 text-sm font-medium">Monte análises de viabilidade financeira para cada rota/projeto. Compare múltiplos cenários lado a lado.</p>
        </div>
        <div className="flex gap-3 shrink-0">
          <button onClick={handleSave} className="flex items-center gap-2 bg-violet-50 text-violet-700 hover:bg-violet-100 px-4 py-2 rounded-xl font-bold text-sm transition-all border border-violet-200">
            <Save className="w-4 h-4" /> Salvar
          </button>
          <button onClick={() => setShowHistoryModal(true)} className="flex items-center gap-2 bg-slate-100 text-slate-700 hover:bg-slate-200 px-4 py-2 rounded-xl font-bold text-sm transition-all border border-slate-200">
            <History className="w-4 h-4" /> Histórico {historyData.length > 0 && `(${historyData.length})`}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 flex flex-col gap-6">

        {/* Resumo Consolidado */}
        {analyses.length > 1 && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Análises</span>
              <p className="text-2xl font-black text-slate-800 mt-1">{analyses.length}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Receita Total/Dia</span>
              <p className="text-lg font-black text-slate-800 mt-1 font-mono">{formatCurrency(totals.totalReceita)}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Custos Total/Dia</span>
              <p className="text-lg font-black text-orange-600 mt-1 font-mono">{formatCurrency(totals.totalCustos)}</p>
            </div>
            <div className={`border rounded-2xl p-4 shadow-sm ${totals.totalResultado >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Resultado Total/Dia</span>
              <p className={`text-lg font-black mt-1 font-mono ${totals.totalResultado >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>{formatCurrency(totals.totalResultado)}</p>
              <span className={`text-[10px] font-bold ${totals.totalResultado >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>Margem: {formatPercent(totals.margemGlobal)}</span>
            </div>
          </div>
        )}

        {/* Cards de Análise */}
        {analyses.map((analysis) => (
          <AnalysisCard
            key={analysis.id}
            analysis={analysis}
            onUpdate={handleUpdateAnalysis}
            onRemove={handleRemoveAnalysis}
            onDuplicate={handleDuplicateAnalysis}
            canRemove={analyses.length > 1}
          />
        ))}

        {/* Botão Adicionar */}
        <button
          onClick={handleAddAnalysis}
          className="w-full py-4 border-2 border-dashed border-slate-300 rounded-2xl text-slate-400 hover:text-violet-600 hover:border-violet-400 hover:bg-violet-50/50 transition-all flex items-center justify-center gap-2 font-bold text-sm group"
        >
          <Plus className="w-5 h-5 group-hover:scale-110 transition-transform" />
          Adicionar Nova Análise
        </button>
      </div>

      {/* Modal Salvar */}
      {showSaveModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-200 bg-violet-50">
              <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                <Save className="w-5 h-5 text-violet-500" /> Salvar Análises
              </h3>
            </div>
            <div className="p-6">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Nome da Simulação</label>
              <input
                type="text"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && confirmSave()}
                placeholder="Ex: Rota SP-RJ Fiorino"
                className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all"
                autoFocus
              />
            </div>
            <div className="px-6 pb-6 flex gap-3 justify-end">
              <button onClick={() => setShowSaveModal(false)} className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-xl font-bold text-sm transition-colors">Cancelar</button>
              <button onClick={confirmSave} disabled={!saveName.trim()} className="px-6 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-bold text-sm transition-all disabled:opacity-50 shadow-md">Salvar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Histórico */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                <History className="w-5 h-5 text-violet-500" /> Histórico de Análises
              </h3>
              <button onClick={() => setShowHistoryModal(false)} className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              {historyData.length === 0 ? (
                <div className="text-center py-10">
                  <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 font-bold">Nenhuma análise salva ainda.</p>
                  <p className="text-slate-400 text-sm mt-1">Clique em "Salvar" para criar o primeiro registro.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {historyData.map(item => (
                    <div key={item.id} className="border border-slate-200 rounded-xl p-4 flex justify-between items-center hover:border-violet-300 transition-colors group">
                      <div>
                        <h4 className="font-bold text-slate-800">{item.name}</h4>
                        <p className="text-xs font-bold text-slate-400 mt-1 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Salvo em {item.date}
                          <span className="ml-2 text-violet-500">{item.analyses?.length || 0} análise(s)</span>
                        </p>
                      </div>
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleDelete(item.id, item.docId)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Apagar">
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleLoad(item)} className="px-4 py-2 bg-violet-500 hover:bg-violet-600 text-white font-bold text-xs rounded-lg transition-colors">
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

export default DreViabilidade;
