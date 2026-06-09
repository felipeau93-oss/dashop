import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { 
  Calculator, Database, Plus, Trash2, MapPin, 
  CalendarClock, TrendingUp, TrendingDown, 
  LayoutDashboard, Loader2, AlertCircle,
  History, Save, CheckCircle2, ChevronDown, ChevronUp, Percent,
  BadgeDollarSign, Truck, Target, RotateCcw, BarChart3, UserMinus
} from 'lucide-react';

export default function Simulador() {
  // Estado para os inputs globais
  const [quinzena, setQuinzena] = useState('');
  const [filial, setFilial] = useState('SPR1');
  const [percentualImposto, setPercentualImposto] = useState(0);
  const [agregadoExcluido, setAgregadoExcluido] = useState('ESPINDOLA');
  const [activeTab, setActiveTab] = useState('calculadora');

  // Estados Globais do Painel de Margem
  const [modoMargemGlobal, setModoMargemGlobal] = useState('atual');
  const [margemDesejadaGlobal, setMargemDesejadaGlobal] = useState('');

  // Estado para a base de dados única do Google Sheets
  const [dadosPlanilhaRaw, setDadosPlanilhaRaw] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Estrutura de Cenários (Categoria + Dia da Semana)
  const [cenarios, setCenarios] = useState([]);

  // Busca os dados diretamente do Google Sheets
  useEffect(() => {
    const fetchPlanilha = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Link fornecido da planilha mestre com TODAS as colunas juntas
        const url = "https://docs.google.com/spreadsheets/d/1wV2aLuLW93nCu7z065NCJkVaSJajDNxapCymcxTtMQk/export?format=tsv&gid=405309182";
        
        const response = await fetch(url);
        if (!response.ok) throw new Error("Não foi possível acessar a planilha. Verifique se o link está público.");
        
        const text = await response.text();
        const lines = text.trim().split('\n');

        let headerIdx = lines.findIndex(l => l.toLowerCase().includes('categoria') || l.toLowerCase().includes('veículo') || l.toLowerCase().includes('veiculo'));
        if (headerIdx === -1) headerIdx = 0;

        const parsed = lines.slice(headerIdx + 1).map(line => {
          const cols = line.split('\t');
          
          const parseValor = (val) => {
            if(!val) return 0;
            let str = String(val).replace(/"/g, '').replace(/R\$/gi, '').trim();
            if (str === '-' || str === '') return 0;
            
            let isNegative = false;
            if (str.startsWith('(') && str.endsWith(')')) {
              isNegative = true;
              str = str.slice(1, -1).trim();
            } else if (str.startsWith('-')) {
              isNegative = true;
              str = str.substring(1).trim();
            }
            
            str = str.replace(/\s/g, '');
            
            const hasComma = str.includes(',');
            const hasDot = str.includes('.');
            
            if (hasComma && hasDot) {
              const lastComma = str.lastIndexOf(',');
              const lastDot = str.lastIndexOf('.');
              if (lastComma > lastDot) {
                str = str.replace(/\./g, '').replace(',', '.');
              } else {
                str = str.replace(/,/g, '');
              }
            } else if (hasComma) {
              str = str.replace(',', '.');
            }
            
            let num = parseFloat(str);
            if(isNaN(num)) return 0;
            return isNegative ? -num : num;
          };

          const normalizeText = (text) => (text || '').trim().replace(/\s+/g, ' ');

          const receitaBase = parseValor(cols[51]);
          const receitaParadas = parseValor(cols[60]);

          return {
            quinzena: normalizeText(cols[4]).toUpperCase(),
            filial: normalizeText(cols[7]).toUpperCase(),
            dia: normalizeText(cols[8]),
            agregado: normalizeText(cols[12]).toUpperCase(),
            ciclo: normalizeText(cols[21]),
            categoria: normalizeText(cols[17]),
            range: normalizeText(cols[36]) || 'SEM FAIXA',
            tarifaBase: parseValor(cols[37]),
            valorPago: parseValor(cols[46]),
            receitaTotal: receitaBase + receitaParadas
          };
        }).filter(c => c.quinzena && c.categoria);

        setDadosPlanilhaRaw(parsed);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPlanilha();
  }, []);

  // Filtro Global de Exclusão de Agregado
  const agregadosUnicos = useMemo(() => {
    return [...new Set(dadosPlanilhaRaw.map(d => d.agregado))].filter(Boolean).sort();
  }, [dadosPlanilhaRaw]);

  const dadosPlanilha = useMemo(() => {
    if (!agregadoExcluido) return dadosPlanilhaRaw;
    // Filtro com base na seleção exata da lista suspensa
    return dadosPlanilhaRaw.filter(d => d.agregado !== agregadoExcluido);
  }, [dadosPlanilhaRaw, agregadoExcluido]);

  const { categoriasUnicas, filiaisUnicas, diasUnicas, quinzenasUnicas } = useMemo(() => {
    const cats = [...new Set(dadosPlanilha.map(t => t.categoria))].filter(Boolean).sort();
    const fils = [...new Set(dadosPlanilha.map(t => t.filial))].filter(Boolean).sort();
    const dias = [...new Set(dadosPlanilha.map(t => t.dia))].filter(Boolean).sort();
    const quinzenas = [...new Set(dadosPlanilha.map(t => t.quinzena))].filter(Boolean).sort((a, b) => b.localeCompare(a));
    return { categoriasUnicas: cats, filiaisUnicas: fils, diasUnicas: dias, quinzenasUnicas: quinzenas };
  }, [dadosPlanilha]);

  useEffect(() => {
    if (quinzenasUnicas && quinzenasUnicas.length > 0 && (!quinzena || !quinzenasUnicas.includes(quinzena))) {
      setQuinzena(quinzenasUnicas[0]);
    }
  }, [quinzenasUnicas, quinzena]);

  const cenariosCalculados = useMemo(() => {
    return cenarios.map(cenario => {
      const normalizeParaFiltro = (text) => (text || '').trim().replace(/\s+/g, ' ').toLowerCase();
      
      const rotasFiltradas = dadosPlanilha.filter(d => 
        d.quinzena === quinzena.trim().toUpperCase() && 
        d.filial === filial.trim().toUpperCase() && 
        d.categoria.toLowerCase() === normalizeParaFiltro(cenario.categoria) &&
        d.dia.toLowerCase() === normalizeParaFiltro(cenario.dia)
      );

      const totalRotasCenario = rotasFiltradas.length;

      const rangesAgrupados = {};
      rotasFiltradas.forEach(rota => {
        if (!rangesAgrupados[rota.range]) {
          rangesAgrupados[rota.range] = { qtd: 0, somaAL: 0, somaAU: 0, somaReceita: 0 };
        }
        rangesAgrupados[rota.range].qtd += 1;
        rangesAgrupados[rota.range].somaAL += rota.tarifaBase;
        rangesAgrupados[rota.range].somaAU += rota.valorPago;
        rangesAgrupados[rota.range].somaReceita += rota.receitaTotal;
      });

      const rangesOrdenadosCenario = Object.keys(rangesAgrupados).sort((a, b) => {
        const numA = parseInt(a.split('/')[0]) || 0;
        const numB = parseInt(b.split('/')[0]) || 0;
        return numA - numB;
      });

      const totalRecebido = rotasFiltradas.reduce((acc, curr) => acc + curr.receitaTotal, 0);
      const totalAL = rotasFiltradas.reduce((acc, curr) => acc + curr.tarifaBase, 0);
      const totalAU = rotasFiltradas.reduce((acc, curr) => acc + curr.valorPago, 0);
      
      const diferencaHistorica = totalAU - totalAL;

      let totalPagoSimuladoPadrao = 0;
      let currentSimuladoUnitario = cenario.valorInicialSimulado || 0;

      const faixasCalculadas = rangesOrdenadosCenario.map((range, index) => {
        const dadosFaixa = rangesAgrupados[range];
        const mediaAL = dadosFaixa.qtd > 0 ? dadosFaixa.somaAL / dadosFaixa.qtd : 0;

        let pctAumento = 0;

        if (index > 0) {
          if (cenario.tipoProgressao === 'tabela') {
            const rangeAnterior = rangesOrdenadosCenario[index - 1];
            const mediaALAnterior = rangesAgrupados[rangeAnterior].qtd > 0 ? rangesAgrupados[rangeAnterior].somaAL / rangesAgrupados[rangeAnterior].qtd : 0;
            if (mediaALAnterior > 0) {
              const taxa = mediaAL / mediaALAnterior;
              pctAumento = (taxa - 1) * 100;
              currentSimuladoUnitario = Math.floor(currentSimuladoUnitario * taxa);
            }
          } else {
            pctAumento = cenario.percentualIncremento || 0;
            if (currentSimuladoUnitario > 0) {
              currentSimuladoUnitario = Math.floor(currentSimuladoUnitario * (1 + (pctAumento / 100)));
            }
          }
        } else {
          currentSimuladoUnitario = cenario.valorInicialSimulado || 0;
        }

        const pagoSimuladoFaixa = dadosFaixa.qtd * currentSimuladoUnitario;
        totalPagoSimuladoPadrao += pagoSimuladoFaixa;

        return {
          range,
          qtdRotas: dadosFaixa.qtd,
          valorReceitaFaixa: dadosFaixa.somaReceita,
          pagoTabelaFaixa: dadosFaixa.somaAL,
          pagoRealFaixa: dadosFaixa.somaAU,
          pctAumento,
          valorSimuladoUnitario: currentSimuladoUnitario,
          pagoSimuladoFaixa
        };
      });

      const totalPagoSimuladoFinal = totalPagoSimuladoPadrao + diferencaHistorica;
      
      const lucroBrutoReal = totalRecebido - totalAU;
      const lucroSimulado = totalRecebido - totalPagoSimuladoFinal;
      const margemBrutaReal = totalRecebido > 0 ? (lucroBrutoReal / totalRecebido) * 100 : 0;
      const margemSimulada = totalRecebido > 0 ? (lucroSimulado / totalRecebido) * 100 : 0;

      return {
        ...cenario,
        faixasCalculadas,
        totalRotasCenario,
        totalRecebido,
        totalAL,
        totalAU,
        diferencaHistorica,
        totalPagoSimuladoPadrao,
        totalPagoSimuladoFinal,
        lucroBrutoReal,
        lucroSimulado,
        margemBrutaReal,
        margemSimulada
      };
    });
  }, [cenarios, dadosPlanilha, quinzena, filial]);

  // --- NOVA VISÃO MACRO: FILIAL GERAL ---
  const resumoGlobalFilial = useMemo(() => {
    // 1. Pega TODO o histórico da Filial inteira (todas as categorias)
    const rotasFilial = dadosPlanilha.filter(d => 
      d.quinzena === quinzena.trim().toUpperCase() && 
      d.filial === filial.trim().toUpperCase()
    );

    const totalRotasFilial = rotasFilial.length;
    const faturamentoBrutoFilial = rotasFilial.reduce((acc, curr) => acc + curr.receitaTotal, 0);
    const custoRealFilialAU = rotasFilial.reduce((acc, curr) => acc + curr.valorPago, 0);

    // 2. Calcula o Impacto (Delta) gerado pelas simulações ativas
    let deltaCustoSimulado = 0;
    let rotasCenariosAtivos = 0;
    let lucroLiquidoCenariosAtivos = 0;

    cenariosCalculados.forEach(c => {
      // O Delta é a diferença entre o que simulamos e o que custou de verdade naquelas categorias
      deltaCustoSimulado += (c.totalPagoSimuladoFinal - c.totalAU);
      rotasCenariosAtivos += c.totalRotasCenario;
      
      // Lucro isolado das rotas simuladas (Receita - Imposto Proporcional - Custo Simulado)
      const impostoCenario = (c.totalRecebido * (percentualImposto || 0)) / 100;
      lucroLiquidoCenariosAtivos += (c.totalRecebido - impostoCenario - c.totalPagoSimuladoFinal);
    });

    // O Custo Simulado da Filial é o custo Real original somado ao buraco/economia das simulações
    const custoSimuladoFilial = custoRealFilialAU + deltaCustoSimulado;

    // 3. Aplica Imposto Global sobre o Faturamento da Filial
    const valorImposto = (faturamentoBrutoFilial * (percentualImposto || 0)) / 100;
    const receitaLiquida = faturamentoBrutoFilial - valorImposto;

    // 4. Resultados e Margens Globais da Filial
    const resultadoReal = receitaLiquida - custoRealFilialAU;
    const resultadoSimulado = receitaLiquida - custoSimuladoFilial;

    const margemReal = faturamentoBrutoFilial > 0 ? (resultadoReal / faturamentoBrutoFilial) * 100 : 0;
    const margemSimulada = faturamentoBrutoFilial > 0 ? (resultadoSimulado / faturamentoBrutoFilial) * 100 : 0;

    // --- CÁLCULO DE VEÍCULOS ADICIONAIS PARA FECHAR O BURACO ---
    // Usamos o Lucro Médio e a Receita Média dos veículos simulados para cobrir o gap
    let receitaBrutaCenariosAtivos = 0;
    cenariosCalculados.forEach(c => {
      receitaBrutaCenariosAtivos += c.totalRecebido;
    });

    const lucro_medio_global = totalRotasFilial > 0 ? resultadoSimulado / totalRotasFilial : 0;
    const receita_media_global = totalRotasFilial > 0 ? faturamentoBrutoFilial / totalRotasFilial : 0;

    const lucro_medio_para_adicao = (rotasCenariosAtivos > 0) 
                                    ? (lucroLiquidoCenariosAtivos / rotasCenariosAtivos) 
                                    : lucro_medio_global;
    
    const receita_media_para_adicao = (rotasCenariosAtivos > 0)
                                    ? (receitaBrutaCenariosAtivos / rotasCenariosAtivos)
                                    : receita_media_global;

    const M_alvo = (parseFloat(margemDesejadaGlobal) || 0) / 100;
    const lucroAlvoR$ = faturamentoBrutoFilial * M_alvo;

    let rotasParaManter = 0; let rotasParaManterPossivel = true;
    let rotasParaAlvo = 0; let rotasParaAlvoPossivel = true;

    if (totalRotasFilial > 0 && faturamentoBrutoFilial > 0) {
      // Gap para Manter Lucro Original da Filial em Reais
      const gapLucro = resultadoReal - resultadoSimulado;
      if (gapLucro <= 0) rotasParaManter = 0;
      else if (lucro_medio_para_adicao > 0) rotasParaManter = Math.ceil(gapLucro / lucro_medio_para_adicao);
      else rotasParaManterPossivel = false;

      // Gap para Atingir Nova Margem Alvo para a Filial
      const gapAlvo = lucroAlvoR$ - resultadoSimulado;
      
      // Contribuição real de cada veículo extra para atingir a margem alvo:
      // Cada veículo traz lucro_medio, mas também aumenta a meta de lucro em (receita_media * M_alvo)
      const contribuicaoParaMargem = lucro_medio_para_adicao - (receita_media_para_adicao * M_alvo);

      if (gapAlvo <= 0) rotasParaAlvo = 0;
      else if (contribuicaoParaMargem > 0) rotasParaAlvo = Math.ceil(gapAlvo / contribuicaoParaMargem);
      else rotasParaAlvoPossivel = false;
    }

    return { 
      rotas: totalRotasFilial, 
      faturamentoBruto: faturamentoBrutoFilial, 
      valorImposto, 
      receitaLiquida, 
      pagoTabelaAU: custoRealFilialAU, 
      pagoSimuladoFinal: custoSimuladoFilial,
      resultadoReal, 
      resultadoSimulado, 
      margemReal, 
      margemSimulada,
      rotasParaManter, 
      rotasParaManterPossivel, 
      rotasParaAlvo, 
      rotasParaAlvoPossivel, 
      lucroAlvoR$
    };
  }, [dadosPlanilha, quinzena, filial, cenariosCalculados, percentualImposto, margemDesejadaGlobal]);

  const handleAddCenario = () => {
    const novoId = cenarios.length > 0 ? Math.max(...cenarios.map(c => c.id)) + 1 : 1;
    const cat = categoriasUnicas[0] || '';
    const dia = diasUnicas[0] || '';
    
    const rotas = dadosPlanilha.filter(d => d.quinzena === quinzena && d.filial === filial && d.categoria === cat && d.dia === dia);
    let sugestaoBase = 0;
    if (rotas.length > 0) {
      const rotasRange1 = rotas.filter(r => r.range.startsWith('1/'));
      if(rotasRange1.length > 0) sugestaoBase = rotasRange1[0].tarifaBase;
      else sugestaoBase = rotas[0].tarifaBase;
    }

    setCenarios([...cenarios, { 
      id: novoId, 
      categoria: cat, 
      dia: dia,
      valorInicialSimulado: sugestaoBase,
      percentualIncremento: 5,
      tipoProgressao: 'tabela',
      isExpanded: true
    }]);
  };

  const handleRemoveCenario = (id) => setCenarios(cenarios.filter(c => c.id !== id));

  const handleCenarioChange = (id, field, value) => {
    setCenarios(cenarios.map(c => {
      if (c.id === id) {
        const updated = { ...c, [field]: value };
        if (field === 'categoria' || field === 'dia') {
           const rotas = dadosPlanilha.filter(d => d.quinzena === quinzena && d.filial === filial && d.categoria === updated.categoria && d.dia === updated.dia);
           if (rotas.length > 0) {
             const rotasRange1 = rotas.filter(r => r.range.startsWith('1/'));
             updated.valorInicialSimulado = rotasRange1.length > 0 ? rotasRange1[0].tarifaBase : rotas[0].tarifaBase;
           } else {
             updated.valorInicialSimulado = 0;
           }
        }
        return updated;
      }
      return c;
    }));
  };

  const toggleExpand = (id) => setCenarios(cenarios.map(c => c.id === id ? { ...c, isExpanded: !c.isExpanded } : c));
  const limparTudo = () => { setCenarios([]); setPercentualImposto(0); setMargemDesejadaGlobal(''); };
  const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4">
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-4" />
        <h2 className="text-xl font-semibold text-slate-800">Sincronizando Base de Dados...</h2>
        <p className="text-slate-500 mt-2 text-center max-w-sm">Calculando Realizado, Tabelas, Faturamentos e Cruzamentos.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4 mx-auto" />
        <h2 className="text-xl font-semibold text-slate-800">Erro de Conexão</h2>
        <p className="text-slate-500 mt-2">{error}</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-100 text-slate-800 font-sans pb-8 h-full">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* HEADER */}
        <header className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Calculator className="w-7 h-7 text-indigo-600" />
              Simulador Realizado
            </h1>
          </div>
        </header>

        {/* FILTROS GLOBAIS */}
        <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col lg:flex-row gap-6 items-center">
            <div className="flex-1 w-full space-y-1">
              <label className="text-sm font-medium text-slate-600 flex items-center gap-2">
                <CalendarClock className="w-4 h-4 text-indigo-500" /> Quinzena Referência
              </label>
              <select 
                value={quinzena}
                onChange={(e) => setQuinzena(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium uppercase text-slate-700"
              >
                {quinzenasUnicas?.map(q => <option key={q} value={q}>{q}</option>)}
              </select>
            </div>
            <div className="flex-1 w-full space-y-1">
              <label className="text-sm font-medium text-slate-600 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-indigo-500" /> Filial de Operação
              </label>
              <select 
                value={filial}
                onChange={(e) => setFilial(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium uppercase text-slate-700"
              >
                {filiaisUnicas.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div className="flex-1 w-full space-y-1">
              <label className="text-sm font-medium text-slate-600 flex items-center gap-2" title="Filtra fora rotas de um agregado">
                <UserMinus className="w-4 h-4 text-orange-500" /> Ocultar Agregado
              </label>
              <select 
                value={agregadoExcluido}
                onChange={(e) => setAgregadoExcluido(e.target.value)}
                className="w-full p-2.5 bg-orange-50 border border-orange-200 text-orange-800 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none transition-all font-medium uppercase truncate"
              >
                <option value="">Nenhum (Todos)</option>
                {agregadosUnicos.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div className="flex-1 w-full space-y-1">
              <label className="text-sm font-medium text-slate-600 flex items-center gap-2">
                <BadgeDollarSign className="w-4 h-4 text-red-500" /> Imposto a Descontar (%)
              </label>
              <div className="relative">
                <input 
                  type="number" 
                  min="0" step="0.1"
                  value={percentualImposto === 0 ? '' : percentualImposto}
                  onChange={(e) => setPercentualImposto(parseFloat(e.target.value) || 0)}
                  className="w-full p-2.5 pr-8 bg-red-50 border border-red-200 text-red-700 rounded-lg focus:ring-2 focus:ring-red-500 outline-none transition-all font-medium"
                />
                <Percent className="w-4 h-4 text-red-500 absolute right-3 top-3" />
              </div>
            </div>
          </div>

          {/* DASHBOARD GLOBAL (VISÃO MACRO FILIAL) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between">
              <div>
                <span className="text-sm font-bold text-slate-700 mb-3 block">1. Faturamento Total da Filial</span>
                <div className="flex justify-between items-center text-sm mb-1.5">
                  <span className="text-slate-500">Fat. Bruto ({resumoGlobalFilial.rotas} rotas):</span>
                  <span className="font-medium text-slate-800">{formatCurrency(resumoGlobalFilial.faturamentoBruto)}</span>
                </div>
                <div className="flex justify-between items-center text-sm mb-3 pb-3 border-b border-slate-100">
                  <span className="text-slate-500">Imposto Global ({percentualImposto}%):</span>
                  <span className="font-medium text-red-500">-{formatCurrency(resumoGlobalFilial.valorImposto)}</span>
                </div>
              </div>
              <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Receita Líquida:</span>
                <span className="text-base font-bold text-emerald-600">{formatCurrency(resumoGlobalFilial.receitaLiquida)}</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between">
              <div>
                  <span className="text-sm font-bold text-slate-700 mb-3 block">2. Custos Totais da Filial</span>
                  <div className="space-y-4">
                    <div>
                      <span className="text-xs text-slate-500 block uppercase tracking-wider mb-0.5">Custo Real (AU Total)</span>
                      <span className="text-xl font-semibold text-slate-700">{formatCurrency(resumoGlobalFilial.pagoTabelaAU)}</span>
                    </div>
                    <div>
                      <span className="text-xs text-indigo-500 block uppercase tracking-wider font-bold mb-0.5">Custo Pós-Simulação</span>
                      <span className="text-xl font-bold text-indigo-600">{formatCurrency(resumoGlobalFilial.pagoSimuladoFinal)}</span>
                    </div>
                  </div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between">
                <div>
                  <span className="text-sm font-bold text-slate-700 mb-3 block">3. Resultado Líquido da Filial</span>
                  <div className="space-y-4">
                    <div>
                      <span className="text-xs text-slate-500 block uppercase tracking-wider mb-0.5">Lucro Real</span>
                      <span className={`text-xl font-semibold flex items-center gap-1 ${resumoGlobalFilial.resultadoReal >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {resumoGlobalFilial.resultadoReal >= 0 ? <TrendingUp className="w-4 h-4"/> : <TrendingDown className="w-4 h-4"/>}
                        {formatCurrency(resumoGlobalFilial.resultadoReal)}
                      </span>
                    </div>
                    <div>
                      <span className="text-xs text-indigo-500 block uppercase tracking-wider font-bold mb-0.5">Novo Lucro Simulado</span>
                      <span className={`text-xl font-bold flex items-center gap-1 ${resumoGlobalFilial.resultadoSimulado >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {resumoGlobalFilial.resultadoSimulado >= 0 ? <TrendingUp className="w-4 h-4"/> : <TrendingDown className="w-4 h-4"/>}
                        {formatCurrency(resumoGlobalFilial.resultadoSimulado)}
                      </span>
                    </div>
                  </div>
                </div>
            </div>

            <div className="bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-700 flex flex-col justify-between text-white">
                <div>
                  <span className="text-sm font-bold text-slate-300 mb-3 block">4. Margem Geral da Filial (%)</span>
                  <div className="space-y-4">
                    <div>
                      <span className="text-xs text-slate-400 block uppercase tracking-wider mb-0.5">Margem Real Total</span>
                      <span className="text-2xl font-semibold text-slate-200">
                        {resumoGlobalFilial.margemReal.toFixed(1)}%
                      </span>
                    </div>
                    <div>
                      <span className="text-xs text-indigo-300 block uppercase tracking-wider font-bold mb-0.5">Nova Margem Sim.</span>
                      <span className={`text-3xl font-bold flex items-center gap-1 ${resumoGlobalFilial.margemSimulada >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {resumoGlobalFilial.margemSimulada >= 0 ? <TrendingUp className="w-6 h-6"/> : <TrendingDown className="w-6 h-6"/>}
                        {resumoGlobalFilial.margemSimulada.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
            </div>
          </div>

          {/* LISTA DE CENÁRIOS */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-800">Detalhamento para Simulação</h3>
              <div className="flex gap-2">
                <button 
                  onClick={limparTudo}
                  className="bg-white border border-slate-300 text-slate-600 hover:bg-slate-50 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" /> Limpar
                </button>
                <button 
                  onClick={handleAddCenario}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shadow-sm"
                >
                  <Plus className="w-4 h-4" /> Add Categoria/Dia
                </button>
              </div>
            </div>

            {cenariosCalculados.map((cenario, index) => (
              <div key={cenario.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden relative group transition-all">
                <div className={`p-5 md:pr-24 border-b transition-colors ${cenario.isExpanded ? 'border-slate-100' : 'border-transparent pb-4'} cursor-pointer hover:bg-slate-50`} onClick={() => toggleExpand(cenario.id)}>
                  
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleRemoveCenario(cenario.id); }}
                    className="absolute top-4 right-14 md:right-16 text-slate-300 hover:text-red-500 transition-colors z-10 p-2"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>

                  <button 
                    className="absolute top-4 right-4 md:right-4 text-slate-400 hover:text-slate-600 transition-colors z-10 p-2"
                  >
                    {cenario.isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </button>

                  <div className="flex items-center gap-3 mb-4">
                    <span className="bg-slate-100 text-slate-500 text-xs font-bold px-2.5 py-1 rounded-md">Op. #{index + 1}</span>
                    {!cenario.isExpanded && (
                        <div className="flex flex-wrap gap-2 sm:gap-4 text-sm font-medium text-slate-500">
                          <span>{cenario.categoria} ({cenario.dia})</span>
                          <span className="hidden sm:inline">&bull; {cenario.totalRotasCenario} rotas</span>
                          <span className={`hidden sm:inline ${cenario.margemSimulada >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>&bull; Nova Margem: {cenario.margemSimulada.toFixed(1)}%</span>
                        </div>
                    )}
                  </div>

                  <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4 ${cenario.isExpanded ? 'block' : 'hidden'}`} onClick={e => e.stopPropagation()}>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Categoria</label>
                      <select 
                        value={cenario.categoria}
                        onChange={(e) => handleCenarioChange(cenario.id, 'categoria', e.target.value)}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium text-slate-700"
                      >
                        {categoriasUnicas.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Dia da Semana</label>
                      <select 
                        value={cenario.dia}
                        onChange={(e) => handleCenarioChange(cenario.id, 'dia', e.target.value)}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium text-slate-700"
                      >
                        {diasUnicas.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-500 uppercase tracking-wider flex items-center gap-1">
                        Padrão de Aumento
                      </label>
                      <select 
                        value={cenario.tipoProgressao || 'tabela'}
                        onChange={(e) => handleCenarioChange(cenario.id, 'tipoProgressao', e.target.value)}
                        className="w-full p-2.5 bg-blue-50 border border-blue-200 text-blue-800 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold truncate"
                      >
                        <option value="tabela">Seguir Proporção AL</option>
                        <option value="fixo">Percentual Fixo</option>
                      </select>
                    </div>

                    {cenario.tipoProgressao === 'fixo' && (
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-500 uppercase tracking-wider flex items-center gap-1">
                          Aumento Fixo (%)
                        </label>
                        <div className="relative">
                          <input 
                            type="number" min="0" step="0.1"
                            value={cenario.percentualIncremento === 0 ? '' : cenario.percentualIncremento}
                            onChange={(e) => handleCenarioChange(cenario.id, 'percentualIncremento', parseFloat(e.target.value) || 0)}
                            className="w-full p-2.5 pr-8 bg-blue-50 border border-blue-200 text-blue-800 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold"
                          />
                          <Percent className="w-4 h-4 text-blue-500 absolute right-3 top-3" />
                        </div>
                      </div>
                    )}

                    <div className="space-y-1">
                      <label className="text-xs font-medium text-indigo-600 uppercase tracking-wider" title="Nova base que substituirá a Tarifa AL na faixa inicial">
                        Nova Tarifa Base SIM. (R$)
                      </label>
                      <input 
                        type="number" min="0" step="5"
                        value={cenario.valorInicialSimulado === '' ? '' : cenario.valorInicialSimulado}
                        onChange={(e) => handleCenarioChange(cenario.id, 'valorInicialSimulado', e.target.value !== '' ? parseFloat(e.target.value) : '')}
                        className="w-full p-2.5 bg-indigo-50 border border-indigo-200 text-indigo-800 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-black shadow-sm"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Faturado Histórico (R$)</label>
                      <input 
                        type="text" readOnly
                        value={formatCurrency(cenario.totalRecebido)}
                        className="w-full p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg outline-none text-sm font-semibold cursor-not-allowed"
                      />
                    </div>
                  </div>
                </div>

                {cenario.isExpanded && (
                  <div className="bg-slate-50 p-4 border-b border-slate-100 overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap min-w-[600px]">
                      <thead>
                        <tr className="text-slate-500 font-medium border-b border-slate-200">
                          <th className="pb-3 px-2">Faixa KM</th>
                          <th className="pb-3 px-2 text-center">Qtd Lançamentos</th>
                          <th className="pb-3 px-2 text-right">Média Recebida</th>
                          <th className="pb-3 px-2 text-right">Média Base (AL)</th>
                          <th className="pb-3 px-2 text-right text-indigo-700">Nova Base Sim.</th>
                          <th className="pb-3 px-2 text-right">Custo Faixa Sim.</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {cenario.faixasCalculadas.map((faixa, fIdx) => (
                          <tr key={faixa.range} className="hover:bg-slate-100/50">
                            <td className="py-2.5 px-2 font-medium text-slate-700">
                              {faixa.range}
                              {fIdx === 0 && <span className="ml-2 text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded">BASE</span>}
                              {fIdx > 0 && <span className="ml-2 text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">+{faixa.pctAumento.toFixed(1)}%</span>}
                            </td>
                            <td className="py-2.5 px-2 text-center font-bold text-slate-500">
                              {faixa.qtdRotas}
                            </td>
                            <td className="py-2.5 px-2 text-right font-medium text-emerald-700">{formatCurrency(faixa.valorReceitaFaixa / (faixa.qtdRotas || 1))}</td>
                            <td className="py-2.5 px-2 text-right text-slate-500">{formatCurrency(faixa.pagoTabelaFaixa / (faixa.qtdRotas || 1))}</td>
                            <td className="py-2.5 px-2 text-right font-bold text-indigo-600 bg-indigo-50/30">{formatCurrency(faixa.valorSimuladoUnitario)}</td>
                            <td className="py-2.5 px-2 text-right font-medium text-slate-700">{formatCurrency(faixa.pagoSimuladoFaixa)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="bg-white border-t border-slate-100 p-5 flex flex-col md:flex-row gap-6 md:justify-between items-start md:items-center">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6 flex-1 w-full">
                    <div>
                      <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block mb-1">Total Base Histórico (AL)</span>
                      <span className="font-semibold text-slate-600 text-sm">{formatCurrency(cenario.totalAL)}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block mb-1">Total Pago Histórico (AU)</span>
                      <span className="font-semibold text-slate-600 text-sm">{formatCurrency(cenario.totalAU)}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-orange-500 text-[10px] font-bold uppercase tracking-wider block mb-1">Diferença Histórica Extra (AU - AL)</span>
                      <span className="font-bold text-orange-600 text-sm">
                        {cenario.diferencaHistorica >= 0 ? '+' : ''}{formatCurrency(cenario.diferencaHistorica)}
                      </span>
                      <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">Valor real pago a mais no passado que será repassado para a sua simulação.</p>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 border-t border-slate-200 p-5 flex flex-wrap gap-6 sm:gap-10 items-center justify-between">
                  <div className="flex gap-10">
                    <div>
                      <span className="text-indigo-500 text-xs font-bold uppercase tracking-wider block mb-1">Simulação Padrão (Rotas x Nova Base)</span>
                      <span className="font-semibold text-slate-700 text-lg">{formatCurrency(cenario.totalPagoSimuladoPadrao)}</span>
                    </div>
                    <div>
                      <span className="text-indigo-600 text-xs font-bold uppercase tracking-wider block mb-1" title="Soma da Simulação + Diferença Histórica Extra">Novo Custo Simulado Final</span>
                      <span className="font-black text-indigo-700 text-xl">{formatCurrency(cenario.totalPagoSimuladoFinal)}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-500 text-xs font-bold uppercase tracking-wider block mb-1">Nova Margem da Linha</span>
                    <span className={`font-black text-2xl ${cenario.margemSimulada >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {cenario.margemSimulada.toFixed(1)}%
                    </span>
                  </div>
                </div>

              </div>
            ))}
            
            {cenarios.length === 0 && (
              <div className="text-center p-12 bg-white rounded-2xl border border-dashed border-slate-300">
                <BarChart3 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500 mb-4 font-medium">Nenhuma operação adicionada à análise.</p>
                <button 
                  onClick={handleAddCenario}
                  className="text-indigo-600 font-bold hover:text-indigo-700 inline-flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" /> Adicionar Categoria/Dia
                </button>
              </div>
            )}

            {/* --- PAINEL GLOBAL DE METAS E VIABILIDADE (VISÃO FILIAL) --- */}
            {cenarios.length > 0 && resumoGlobalFilial.rotas > 0 && (
              <div className="bg-indigo-900 border border-indigo-800 rounded-2xl p-6 shadow-lg mt-8 flex flex-col md:flex-row gap-6 md:items-center justify-between relative overflow-hidden">
                <div className="absolute -right-10 -top-10 opacity-10 pointer-events-none">
                  <Target className="w-48 h-48 text-white" />
                </div>
                
                <div className="relative z-10 md:w-1/2">
                  <h3 className="text-xl font-bold text-white flex items-center gap-2 mb-2">
                    <Target className="w-6 h-6 text-indigo-400" />
                    Análise Global da Frota (Visão Filial)
                  </h3>
                  <p className="text-indigo-200 text-sm">
                    Avalie quantos veículos a mais você precisa operar nesta categoria simulada para fechar o "buraco" gerado no lucro total da filial inteira.
                  </p>
                  
                  <div className="flex bg-indigo-950/50 p-1 rounded-lg mt-4 w-fit border border-indigo-800">
                    <button
                      onClick={() => setModoMargemGlobal('atual')}
                      className={`text-xs font-bold px-3 py-2 rounded-md transition-colors ${modoMargemGlobal === 'atual' ? 'bg-indigo-600 text-white shadow-sm' : 'text-indigo-300 hover:text-white'}`}
                    >
                      Manter Lucro Atual da Filial ({formatCurrency(resumoGlobalFilial.resultadoReal)})
                    </button>
                    <button
                      onClick={() => setModoMargemGlobal('nova')}
                      className={`text-xs font-bold px-3 py-2 rounded-md transition-colors ${modoMargemGlobal === 'nova' ? 'bg-indigo-600 text-white shadow-sm' : 'text-indigo-300 hover:text-white'}`}
                    >
                      Atingir Nova Margem da Filial
                    </button>
                  </div>

                  {modoMargemGlobal === 'nova' && (
                    <div className="flex items-center gap-3 mt-4">
                      <span className="text-sm font-medium text-indigo-200">Margem Alvo para Filial:</span>
                      <div className="relative w-28">
                        <input
                          type="number" min="0" step="0.1"
                          value={margemDesejadaGlobal === '' ? '' : margemDesejadaGlobal}
                          onChange={(e) => setMargemDesejadaGlobal(e.target.value !== '' ? parseFloat(e.target.value) : '')}
                          placeholder="Ex: 20"
                          className="w-full text-sm font-bold p-2 pr-6 bg-white border border-transparent rounded-lg text-right focus:ring-2 focus:ring-indigo-400 outline-none text-slate-800"
                        />
                        <Percent className="w-3 h-3 text-slate-400 absolute right-2.5 top-3" />
                      </div>
                    </div>
                  )}
                </div>

                <div className="relative z-10 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-5 md:w-1/3 flex flex-col justify-center items-center min-h-[140px] shadow-inner">
                  {(() => {
                    const isNova = modoMargemGlobal === 'nova';
                    const hasMargemInput = margemDesejadaGlobal !== '' && margemDesejadaGlobal !== undefined;

                    if (isNova && !hasMargemInput) {
                      return <span className="text-sm text-indigo-200 font-medium text-center">Informe a margem desejada ao lado</span>;
                    }

                    const isPossivel = isNova ? resumoGlobalFilial.rotasParaAlvoPossivel : resumoGlobalFilial.rotasParaManterPossivel;
                    const rotasExtras = isNova ? resumoGlobalFilial.rotasParaAlvo : resumoGlobalFilial.rotasParaManter;
                    const atingida = isPossivel && rotasExtras === 0;

                    if (!isPossivel) {
                      return (
                        <div className="text-center w-full px-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider mb-2 text-red-300 block">Status da Frota Extra</span>
                          <div className="flex items-center justify-center gap-2 text-red-400 mb-1">
                            <TrendingDown className="w-5 h-5" />
                            <span className="text-lg font-bold">Inviável</span>
                          </div>
                          <p className="text-[10px] text-red-200/80 mt-1 leading-tight">
                            As rotas simuladas não geram lucro unitário suficiente para cobrir o gap da filial.
                          </p>
                        </div>
                      );
                    } else if (atingida) {
                      return (
                        <div className="text-center w-full">
                          <span className="text-[10px] font-bold uppercase tracking-wider mb-1 text-emerald-300 block">
                              {isNova ? `Alvo de ${margemDesejadaGlobal}% (${formatCurrency(resumoGlobalFilial.lucroAlvoR$)})` : `Alvo de ${resumoGlobalFilial.margemReal.toFixed(1)}% (${formatCurrency(resumoGlobalFilial.resultadoReal)})`}
                          </span>
                          <div className="flex items-center justify-center gap-2 text-emerald-400 mt-2">
                            <CheckCircle2 className="w-5 h-5" />
                            <span className="text-lg font-bold">Objetivo Atingido!</span>
                          </div>
                          <p className="text-[10px] text-emerald-200/70 mt-1">O caixa da filial não sofreu perdas absolutas.</p>
                        </div>
                      );
                    } else {
                      return (
                        <div className="text-center w-full">
                          <div className="mb-3 pb-3 border-b border-white/10 w-full">
                            <span className="text-xs font-medium text-indigo-200 block mb-1">
                              {isNova ? `Filial a ${margemDesejadaGlobal}% representará:` : `Lucro Original da Filial representa:`}
                            </span>
                            <span className="text-2xl font-bold text-emerald-400">
                              {isNova ? formatCurrency(resumoGlobalFilial.lucroAlvoR$) : formatCurrency(resumoGlobalFilial.resultadoReal)}
                            </span>
                          </div>
                          
                          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-200 block mb-2">
                            Para fechar a conta da Filial, adicione:
                          </span>
                          <div className="flex items-center justify-center gap-2 text-white">
                            <Truck className="w-6 h-6 text-indigo-300" />
                            <span className="text-4xl font-black">+{rotasExtras}</span>
                          </div>
                          <span className="text-xs font-semibold text-indigo-300 mt-1 block">Veículos Extras Simulados</span>
                        </div>
                      );
                    }
                  })()}
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
