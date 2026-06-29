import React, { useState, useMemo } from 'react';
import { Truck, Fuel, DollarSign, TrendingUp, TrendingDown, Route, User, Percent, AlertCircle, Wrench, Shield, Circle } from 'lucide-react';

const formatCurrency = (value) => {
  if (isNaN(value)) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

const formatNumber = (value) => {
  if (isNaN(value)) return '0';
  return new Intl.NumberFormat('pt-BR').format(Math.round(value));
};

const VehicleCard = ({ title, icon: Icon, baseConsumo, data, onChangeConsumo }) => {
  const { margemDesejada, distancia, precoDiesel, custoMotorista, tipoMotorista, imposto, custoSeguro, tipoSeguro, custoPneu, tipoPneu, custoManutencao, tipoManutencao } = data;

  const consumoVal = Number(baseConsumo);
  const litros = distancia > 0 && consumoVal > 0 ? distancia / consumoVal : 0;
  const custoCombustivel = litros * precoDiesel;
  
  const motoristaVal = Number(custoMotorista);
  const custoMotoristaCalc = tipoMotorista === 'Por KM' ? (motoristaVal * distancia) : motoristaVal;
  
  const pneuVal = Number(custoPneu);
  const custoPneuCalc = tipoPneu === 'Por KM' ? (pneuVal * distancia) : pneuVal;

  const manutVal = Number(custoManutencao);
  const custoManutCalc = tipoManutencao === 'Por KM' ? (manutVal * distancia) : manutVal;

  const seguroVal = Number(custoSeguro);
  const custoSeguroFixo = tipoSeguro === 'Fixo' ? seguroVal : 0;
  const seguroPct = tipoSeguro === '% Fat.' ? (seguroVal / 100) : 0;

  const custoTotal = custoCombustivel + custoMotoristaCalc + custoPneuCalc + custoManutCalc + custoSeguroFixo;
  
  const margemVal = Number(margemDesejada);
  const impostoVal = Number(imposto);
  
  const fatorDivisor = 1 - (impostoVal / 100) - (margemVal / 100) - seguroPct;
  const faturamentoSugerido = fatorDivisor > 0 ? custoTotal / fatorDivisor : 0;
  
  const valorImposto = faturamentoSugerido * (impostoVal / 100);
  const valorMargem = faturamentoSugerido * (margemVal / 100);
  const totalSeguro = custoSeguroFixo + (faturamentoSugerido * seguroPct);

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
      <div className="p-5 flex-1 flex flex-col gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Consumo Médio (km/l)</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Fuel className="w-4 h-4 text-slate-400" />
            </div>
            <input
              type="number"
              value={baseConsumo}
              onChange={(e) => onChangeConsumo(e.target.value)}
              step="0.1"
              className="pl-10 w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>
        </div>

        <div className="bg-slate-50 rounded-xl p-4 flex flex-col gap-3 mt-auto">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-slate-500 uppercase">Litros Consumidos</span>
            <span className="font-mono font-bold text-slate-700">{formatNumber(litros)} L</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-slate-500 uppercase">Custo Combustível</span>
            <span className="font-mono font-bold text-slate-700">{formatCurrency(custoCombustivel)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-slate-500 uppercase">Custo Motorista</span>
            <span className="font-mono font-bold text-slate-700">{formatCurrency(custoMotoristaCalc)}</span>
          </div>
          {(custoPneuCalc > 0 || pneuVal > 0) && (
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-slate-500 uppercase">Custo Pneus</span>
              <span className="font-mono font-bold text-slate-700">{formatCurrency(custoPneuCalc)}</span>
            </div>
          )}
          {(custoManutCalc > 0 || manutVal > 0) && (
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-slate-500 uppercase">Manutenção</span>
              <span className="font-mono font-bold text-slate-700">{formatCurrency(custoManutCalc)}</span>
            </div>
          )}
          {(totalSeguro > 0 || seguroVal > 0) && (
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-slate-500 uppercase">Seguro {tipoSeguro === '% Fat.' ? `(${seguroVal}%)` : ''}</span>
              <span className="font-mono font-bold text-slate-700">{formatCurrency(totalSeguro)}</span>
            </div>
          )}
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-red-500 uppercase">Impostos ({impostoVal}%)</span>
            <span className="font-mono font-bold text-red-500">-{formatCurrency(valorImposto)}</span>
          </div>
          <div className="flex justify-between items-center border-t border-slate-200 pt-3">
            <span className="text-xs font-black text-emerald-600 uppercase">Lucro Líquido ({margemVal}%)</span>
            <span className="font-mono font-black text-emerald-600">+{formatCurrency(valorMargem)}</span>
          </div>
        </div>

        <div className="p-4 rounded-xl flex flex-col gap-1 border bg-blue-50 border-blue-100">
          <div className="flex justify-between items-center">
            <span className="text-xs font-black uppercase tracking-wider text-blue-700">
              Tarifa Sugerida (BID)
            </span>
            <TrendingUp className="w-4 h-4 text-blue-600" />
          </div>
          <div className="flex items-end justify-between mt-1">
            <span className="font-mono text-3xl font-black text-blue-600">
              {formatCurrency(faturamentoSugerido)}
            </span>
          </div>
          <p className="text-[10px] text-blue-500/80 font-bold mt-1 leading-tight">Valor bruto necessário para cobrir os custos e atingir a margem de {margemVal}%.</p>
        </div>
      </div>
    </div>
  );
};

const DreAnaliseCusto = () => {
  const [margemDesejada, setMargemDesejada] = useState(15);
  const [distancia, setDistancia] = useState(1000);
  const [precoDiesel, setPrecoDiesel] = useState(5.90);
  
  const [custoMotorista, setCustoMotorista] = useState("");
  const [tipoMotorista, setTipoMotorista] = useState('Fixo'); // 'Fixo' ou 'Por KM'
  
  const [imposto, setImposto] = useState(6.56);
  
  const [custoSeguro, setCustoSeguro] = useState("");
  const [tipoSeguro, setTipoSeguro] = useState('Fixo'); // 'Fixo' ou '% Fat.'
  
  const [custoPneu, setCustoPneu] = useState("");
  const [tipoPneu, setTipoPneu] = useState('Por KM'); // 'Fixo' ou 'Por KM'
  
  const [custoManutencao, setCustoManutencao] = useState("");
  const [tipoManutencao, setTipoManutencao] = useState('Por KM'); // 'Fixo' ou 'Por KM'

  const [consumoCarreta, setConsumoCarreta] = useState("");
  const [consumoTruck, setConsumoTruck] = useState("");
  const [consumoToco, setConsumoToco] = useState("");

  const simuladorData = {
    margemDesejada,
    distancia,
    precoDiesel,
    custoMotorista,
    tipoMotorista,
    imposto,
    custoSeguro,
    tipoSeguro,
    custoPneu,
    tipoPneu,
    custoManutencao,
    tipoManutencao
  };

  return (
    <div className="h-full w-full bg-slate-50 flex flex-col overflow-hidden">
      <div className="p-6 bg-white border-b border-slate-200 sticky top-0 z-10 shrink-0">
        <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3 tracking-tight">
          <Truck className="w-7 h-7 text-blue-600" /> DRE Análise de Custo por Tipo de Veículo
        </h2>
        <p className="text-slate-500 mt-1 text-sm font-medium">Simule e analise os custos operacionais (combustível, motorista e impostos) para diferentes perfis de frota em uma mesma rota.</p>
      </div>

      <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
        
        {/* SETUP DA ROTA / VIAGEM */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-6 flex items-center gap-2">
            <Route className="w-5 h-5 text-blue-500" /> Parâmetros da Viagem / Rota
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Margem Desejada (%)</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Percent className="w-4 h-4 text-slate-400" /></div>
                <input type="number" value={margemDesejada} onChange={(e) => setMargemDesejada(e.target.value)} className="pl-10 w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Distância Total (km)</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Route className="w-4 h-4 text-slate-400" /></div>
                <input type="number" value={distancia} onChange={(e) => setDistancia(Number(e.target.value))} className="pl-10 w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Preço do Diesel (R$/L)</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Fuel className="w-4 h-4 text-slate-400" /></div>
                <input type="number" step="0.01" value={precoDiesel} onChange={(e) => setPrecoDiesel(e.target.value)} className="pl-10 w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Impostos (%)</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Percent className="w-4 h-4 text-slate-400" /></div>
                <input type="number" step="0.01" value={imposto} onChange={(e) => setImposto(e.target.value)} className="pl-10 w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
              </div>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2"><User className="w-4 h-4" /> Custo do Motorista</label>
              <div className="flex border border-slate-200 rounded-xl overflow-hidden bg-white mb-3">
                <button onClick={() => setTipoMotorista('Fixo')} className={`flex-1 py-2 text-[11px] font-bold transition-colors ${tipoMotorista === 'Fixo' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>Fixo Viagem</button>
                <button onClick={() => setTipoMotorista('Por KM')} className={`flex-1 py-2 text-[11px] font-bold transition-colors ${tipoMotorista === 'Por KM' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>Por KM</button>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><DollarSign className="w-4 h-4 text-slate-400" /></div>
                <input type="number" step="0.01" value={custoMotorista} onChange={(e) => setCustoMotorista(e.target.value)} className="pl-10 w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" placeholder="R$ 0,00" />
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2"><Shield className="w-4 h-4" /> Seguro Carga / Ad Valorem</label>
              <div className="flex border border-slate-200 rounded-xl overflow-hidden bg-white mb-3">
                <button onClick={() => setTipoSeguro('Fixo')} className={`flex-1 py-2 text-[11px] font-bold transition-colors ${tipoSeguro === 'Fixo' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>Fixo Viagem</button>
                <button onClick={() => setTipoSeguro('% Fat.')} className={`flex-1 py-2 text-[11px] font-bold transition-colors ${tipoSeguro === '% Fat.' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>% Fat.</button>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">{tipoSeguro === 'Fixo' ? <DollarSign className="w-4 h-4 text-slate-400" /> : <Percent className="w-4 h-4 text-slate-400" />}</div>
                <input type="number" step="0.01" value={custoSeguro} onChange={(e) => setCustoSeguro(e.target.value)} className="pl-10 w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" placeholder={tipoSeguro === 'Fixo' ? 'R$ 0,00' : '0%'} />
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2"><Circle className="w-4 h-4" /> Desgaste de Pneus</label>
              <div className="flex border border-slate-200 rounded-xl overflow-hidden bg-white mb-3">
                <button onClick={() => setTipoPneu('Por KM')} className={`flex-1 py-2 text-[11px] font-bold transition-colors ${tipoPneu === 'Por KM' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>Por KM</button>
                <button onClick={() => setTipoPneu('Fixo')} className={`flex-1 py-2 text-[11px] font-bold transition-colors ${tipoPneu === 'Fixo' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>Fixo Viagem</button>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><DollarSign className="w-4 h-4 text-slate-400" /></div>
                <input type="number" step="0.01" value={custoPneu} onChange={(e) => setCustoPneu(e.target.value)} className="pl-10 w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" placeholder="R$ 0,00" />
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2"><Wrench className="w-4 h-4" /> Manutenção Preditiva</label>
              <div className="flex border border-slate-200 rounded-xl overflow-hidden bg-white mb-3">
                <button onClick={() => setTipoManutencao('Por KM')} className={`flex-1 py-2 text-[11px] font-bold transition-colors ${tipoManutencao === 'Por KM' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>Por KM</button>
                <button onClick={() => setTipoManutencao('Fixo')} className={`flex-1 py-2 text-[11px] font-bold transition-colors ${tipoManutencao === 'Fixo' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>Fixo Viagem</button>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><DollarSign className="w-4 h-4 text-slate-400" /></div>
                <input type="number" step="0.01" value={custoManutencao} onChange={(e) => setCustoManutencao(e.target.value)} className="pl-10 w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" placeholder="R$ 0,00" />
              </div>
            </div>
          </div>
        </div>

        {/* COMPARAÇÃO DOS VEÍCULOS */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <VehicleCard title="Carreta" icon={Truck} baseConsumo={consumoCarreta} data={simuladorData} onChangeConsumo={setConsumoCarreta} />
          <VehicleCard title="Truck" icon={Truck} baseConsumo={consumoTruck} data={simuladorData} onChangeConsumo={setConsumoTruck} />
          <VehicleCard title="Toco" icon={Truck} baseConsumo={consumoToco} data={simuladorData} onChangeConsumo={setConsumoToco} />
        </div>

      </div>
    </div>
  );
};

export default DreAnaliseCusto;
