import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingDown, TrendingUp, AlertTriangle, AlertCircle, Activity, 
  MapPin, Users, PackageX, DollarSign, ShieldAlert 
} from 'lucide-react';
import { formatCurrency, formatQtd, formatDS } from '../../lib/utils';

export default function HomePage({ 
  isOpMode, currentUser, 
  operacionalSimuladoEvolucao, dadosFiltradosEvolucao, 
  faturamentoFiltradoEvolucao, quinzenasDisponiveis
}) {

  // Descobrir a quinzena mais recente
  const currentQuinzena = useMemo(() => {
    // A lista de quinzenas em App.jsx é classificada de forma descendente (a mais recente no índice 0).
    // Além disso, vamos filtrar eventuais lixos de dados como "1969".
    if (!quinzenasDisponiveis || quinzenasDisponiveis.length === 0) return null;
    const validQuinzenas = quinzenasDisponiveis.filter(q => !String(q).includes('1969') && !String(q).includes('1970'));
    return validQuinzenas.length > 0 ? validQuinzenas[0] : null; 
  }, [quinzenasDisponiveis]);

  // Função simples para agrupar e normalizar nome de filial
  const normalizeText = (text) => {
    if (!text) return '';
    return text.toString().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim();
  };

  // 1. Piores DS (Filiais) - Baseado na quinzena atual
  const pioresDS = useMemo(() => {
    if (!operacionalSimuladoEvolucao || !currentQuinzena) return [];
    
    const map = {};
    // Filtramos apenas os dados da quinzena atual
    operacionalSimuladoEvolucao.filter(d => d.quinzena === currentQuinzena).forEach(d => {
      const key = normalizeText(d.filial);
      if (!map[key]) map[key] = { filial: d.filial, saldo: 0, entregues: 0 };
      map[key].saldo += (d.saldo || 0);
      map[key].entregues += (d.entregues || 0);
    });

    return Object.values(map)
      .map(item => ({
        ...item,
        ds: item.saldo > 0 ? (item.entregues / item.saldo) * 100 : 0
      }))
      .filter(item => item.saldo > 0) // ignorar quem não teve pacotes
      .sort((a, b) => a.ds - b.ds) // menor DS primeiro (piores)
      .slice(0, 5);
  }, [operacionalSimuladoEvolucao, currentQuinzena]);


  // 2 e 3. Maiores Ofensores (Valor e Volume) - Baseado na quinzena atual
  const [pioresPenalidadesPorValor, pioresPenalidadesPorQtd] = useMemo(() => {
    if (!dadosFiltradosEvolucao || !currentQuinzena) return [[], []];

    const map = {};
    dadosFiltradosEvolucao.filter(d => d.quinzena === currentQuinzena).forEach(d => {
      const key = normalizeText(d.filial);
      if (!map[key]) map[key] = { filial: d.filial, penalidades: 0, pnr: 0, lost: 0, notVisited: 0, qtdPacotes: 0 };
      
      map[key].penalidades += (d.valor || 0);
      
      // Contabilizando quantidades usando o _pesoQtd se existir
      const qtdBase = d.qtd || 1;
      const peso = d._pesoQtd || 1;
      map[key].qtdPacotes += (qtdBase * peso);

      if (d.tipo === 'PNRs') map[key].pnr += (d.valor || 0);
      else if (d.tipo === 'Lost Packages') map[key].lost += (d.valor || 0);
      else if (d.tipo === 'Not Visited') map[key].notVisited += (d.valor || 0);
    });

    const arr = Object.values(map).filter(item => item.penalidades > 0);

    const pioresValor = [...arr].sort((a, b) => b.penalidades - a.penalidades).slice(0, 5);
    const pioresQtd = [...arr].sort((a, b) => b.qtdPacotes - a.qtdPacotes).slice(0, 5);

    return [pioresValor, pioresQtd];
  }, [dadosFiltradosEvolucao, currentQuinzena]);


  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-[1600px] mx-auto p-4 md:p-8">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white capitalize">
            Olá, {currentUser?.user_metadata?.full_name || currentUser?.user_metadata?.name || currentUser?.email?.split('@')[0] || 'Usuário'}! 👋
          </h1>
          <p className="text-slate-400 mt-2 text-lg">
            {isOpMode 
              ? 'Aqui está o resumo da sua operação.'
              : `Resumo executivo do desempenho e penalidades na quinzena atual (${currentQuinzena || '-'}).`}
          </p>
        </div>
      </div>

      {!isOpMode ? (
        <>
          {/* VISÃO EXECUTIVA */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            
            {/* PIORES DS */}
            <div className="bg-slate-800/50 rounded-3xl p-6 border border-slate-700 shadow-sm flex flex-col h-full">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-500">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-200">Piores DS (Filiais)</h3>
                  <p className="text-xs text-slate-400">Ranking das filiais com menor DS</p>
                </div>
              </div>

              <div className="space-y-4 flex-1">
                {pioresDS.length === 0 ? (
                  <p className="text-sm text-slate-500 italic text-center py-4">Sem dados no período.</p>
                ) : (
                  pioresDS.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 rounded-2xl bg-slate-900/50 border border-slate-700/50">
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-black text-slate-600 w-6 text-center">{idx + 1}</span>
                        <div className="font-bold text-slate-300">{item.filial}</div>
                      </div>
                      <div className={`font-black ${item.ds < 90 ? 'text-red-500' : 'text-orange-400'}`}>
                        {formatDS(item.ds)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* MAIORES OFENSORES VALOR */}
            <div className="bg-slate-800/50 rounded-3xl p-6 border border-slate-700 shadow-sm flex flex-col h-full">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-200">Maiores Ofensores (Valor)</h3>
                  <p className="text-xs text-slate-400">Filiais que mais geraram perdas R$</p>
                </div>
              </div>

              <div className="space-y-4 flex-1">
                {pioresPenalidadesPorValor.length === 0 ? (
                  <p className="text-sm text-slate-500 italic text-center py-4">Sem dados no período.</p>
                ) : (
                  pioresPenalidadesPorValor.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 rounded-2xl bg-slate-900/50 border border-slate-700/50">
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-black text-slate-600 w-6 text-center">{idx + 1}</span>
                        <div>
                          <div className="font-bold text-slate-300">{item.filial}</div>
                          <div className="text-[10px] text-slate-500">{formatQtd(item.qtdPacotes)} QTD afetados</div>
                        </div>
                      </div>
                      <div className="font-black text-red-400 text-right">
                        {formatCurrency(item.penalidades)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* MAIORES OFENSORES VOLUMES */}
            <div className="bg-slate-800/50 rounded-3xl p-6 border border-slate-700 shadow-sm flex flex-col h-full">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                  <PackageX className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-200">Maiores Ofensores (QTD)</h3>
                  <p className="text-xs text-slate-400">Filiais com mais pacotes afetados</p>
                </div>
              </div>

              <div className="space-y-4 flex-1">
                {pioresPenalidadesPorQtd.length === 0 ? (
                  <p className="text-sm text-slate-500 italic text-center py-4">Sem dados no período.</p>
                ) : (
                  pioresPenalidadesPorQtd.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 rounded-2xl bg-slate-900/50 border border-slate-700/50">
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-black text-slate-600 w-6 text-center">{idx + 1}</span>
                        <div>
                          <div className="font-bold text-slate-300">{item.filial}</div>
                          <div className="text-[10px] text-slate-500">{formatCurrency(item.penalidades)} perdidos</div>
                        </div>
                      </div>
                      <div className="font-black text-purple-400 flex items-center gap-1">
                        {formatQtd(item.qtdPacotes)} <span className="text-[10px] font-normal opacity-70">QTD</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        </>
      ) : (
        <>
          {/* VISÃO OPERACIONAL */}
          <div className="bg-slate-800/50 p-8 rounded-3xl shadow-sm border border-slate-700 mb-8 flex flex-col items-center justify-center text-center gap-4 min-h-[40vh]">
            <MapPin className="w-12 h-12 text-slate-600" />
            <div>
              <h2 className="text-xl font-bold text-slate-300">Visão da Filial</h2>
              <p className="text-slate-500 max-w-md mt-2">Nesta área ficarão os indicadores específicos da sua operação.</p>
            </div>
          </div>
        </>
      )}

    </div>
  );
}
