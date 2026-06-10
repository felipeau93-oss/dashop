import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { 
  Calculator, Database, Plus, Trash2, MapPin, 
  CalendarClock, TrendingUp, TrendingDown, 
  LayoutDashboard, Loader2, AlertCircle,
  History, Save, CheckCircle2, ChevronDown, ChevronUp, Percent,
  BadgeDollarSign, Truck, Target, RotateCcw, BarChart3, UserMinus, Globe
} from 'lucide-react';

export default function Simulador() {
  // Estado para os inputs globais
  const [quinzena, setQuinzena] = useState('');
  const [filial, setFilial] = useState('SPR1');
  const [percentualImposto, setPercentualImposto] = useState(6.56);
  const [agregadoExcluido, setAgregadoExcluido] = useState('ESPINDOLA');
  const [modoFaturamento, setModoFaturamento] = useState('recebido');
  const [activeTab, setActiveTab] = useState('calculadora');

  // Estados Globais do Painel de Margem
  const [modoMargemGlobal, setModoMargemGlobal] = useState('atual');
  const [veiculosAdicionais, setVeiculosAdicionais] = useState('');
  const [visaoDiaria, setVisaoDiaria] = useState(false);
  const [diasOperacao, setDiasOperacao] = useState(15);

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
        
        const url = "https://docs.google.com/spreadsheets/d/1zabomWsXNX1xwZbj0xNRx683re1QAYFcPYackB2kXU0/export?format=csv&gid=1452775904";
        const response = await fetch(url);
        if (!response.ok) throw new Error("Não foi possível acessar a planilha. Verifique se o link está público.");
        
        const text = await response.text();
        const lines = text.trim().split('\n');
        const delimiter = lines[0].includes(';') ? ';' : ',';

        const parseCSVLine = (line, delimiter) => {
          const result = [];
          let current = '';
          let inQuotes = false;
          for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
              inQuotes = !inQuotes;
            } else if (char === delimiter && !inQuotes) {
              result.push(current.trim());
              current = '';
            } else {
              current += char;
            }
          }
          result.push(current.trim());
          return result;
        };

        let headerIdx = lines.findIndex(l => {
          const lower = l.toLowerCase();
          return lower.includes('categoria') || lower.includes('veículo') || lower.includes('veiculo');
        });
        if (headerIdx === -1) headerIdx = 0;

        const parsed = lines.slice(headerIdx + 1).map(line => {
          const cols = parseCSVLine(line, delimiter);
          
          const parseValor = (valStr) => {
            if(!valStr) return 0;
            let str = valStr.toString().trim();
            const isNegative = str.includes('-') || (str.includes('(') && str.includes(')'));
            str = str.replace(/[^\d,.]/g, '');
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

          const normalizeText = (text) => (text || '').replace(/"/g, '').trim().replace(/\s+/g, ' ');
          const titleCase = (str) => str.toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

          const receitaBaseRecebido = parseValor(cols[51]);
          const receitaBaseAReceber = parseValor(cols[47]);
          const receitaParadas = parseValor(cols[60]);

          return {
            quinzena: normalizeText(cols[4]).toUpperCase(),
            filial: normalizeText(cols[7]).toUpperCase(),
            dia: normalizeText(cols[8]),
            agregado: normalizeText(cols[12]).toUpperCase(),
            ciclo: normalizeText(cols[21]),
            categoria: titleCase(normalizeText(cols[17])),
            range: normalizeText(cols[36]) || 'SEM FAIXA',
            tarifaBase: parseValor(cols[37]),
            valorPago: parseValor(cols[46]),
            receitaBaseRecebido,
            receitaBaseAReceber,
            receitaParadas
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

  const dadosPlanilhaComReceita = useMemo(() => {
    return dadosPlanilha.map(d => {
        const base = modoFaturamento === 'recebido' ? d.receitaBaseRecebido : d.receitaBaseAReceber;
        return { ...d, receitaTotal: base + d.receitaParadas };
    });
  }, [dadosPlanilha, modoFaturamento]);

  const { categoriasUnicas, filiaisUnicas, diasUnicas, quinzenasUnicas } = useMemo(() => {
    const cats = [...new Set(dadosPlanilhaComReceita.map(t => t.categoria))].filter(Boolean).sort();
    const fils = [...new Set(dadosPlanilhaComReceita.map(t => t.filial))].filter(Boolean).sort();
    const dias = [...new Set(dadosPlanilhaComReceita.map(t => t.dia))].filter(Boolean).sort();
    const quinzenas = [...new Set(dadosPlanilhaComReceita.map(t => t.quinzena))].filter(Boolean).sort((a, b) => b.localeCompare(a));
    return { categoriasUnicas: cats, filiaisUnicas: fils, diasUnicas: dias, quinzenasUnicas: quinzenas };
  }, [dadosPlanilhaComReceita]);

  useEffect(() => {
    if (quinzenasUnicas && quinzenasUnicas.length > 0 && (!quinzena || !quinzenasUnicas.includes(quinzena))) {
      setQuinzena(quinzenasUnicas[0]);
    }
  }, [quinzenasUnicas, quinzena]);

  const cenariosCalculados = useMemo(() => {
    return cenarios.map(cenario => {
      const normalizeParaFiltro = (text) => (text || '').trim().replace(/\s+/g, ' ').toLowerCase();
      
      const rotasFiltradas = dadosPlanilhaComReceita.filter(d => 
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
      
      const imposto = (totalRecebido * (percentualImposto || 0)) / 100;

      const lucroBrutoReal = totalRecebido - imposto - totalAU;
      const lucroSimulado = totalRecebido - imposto - totalPagoSimuladoFinal;
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
  }, [cenarios, dadosPlanilhaComReceita, quinzena, filial, percentualImposto]);

  // --- NOVA VISÃO MACRO: FILIAL GERAL ---
  const resumoGlobalFilial = useMemo(() => {
    // 1. Pega TODO o histórico da Filial inteira (todas as categorias)
    const rotasFilial = dadosPlanilhaComReceita.filter(d => 
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
    let custoRealRotasSimuladas = 0;
    
    // Variáveis para isolar apenas os cenários onde a tarifa de fato mudou
    let rotasCenariosAlterados = 0;
    let lucroLiquidoCenariosAlterados = 0;
    let receitaBrutaCenariosAlterados = 0;
    let categoriasAlteradasMap = {};

    cenariosCalculados.forEach(c => {
      custoRealRotasSimuladas += c.totalAU;
      // O Delta é a diferença entre o que simulamos e o que custou de verdade naquelas categorias
      const diffHistorica = c.totalPagoSimuladoFinal - c.totalAU;
      deltaCustoSimulado += diffHistorica;
      rotasCenariosAtivos += c.totalRotasCenario;
      
      // Lucro isolado das rotas simuladas (Receita - Imposto Proporcional - Custo Simulado)
      const impostoCenario = (c.totalRecebido * (percentualImposto || 0)) / 100;
      const lucroCenarioAtual = c.totalRecebido - impostoCenario - c.totalPagoSimuladoFinal;
      lucroLiquidoCenariosAtivos += lucroCenarioAtual;

      // Se a tarifa paga mudou em relação à história (considerando margem de float), isolamos esses dados
      if (Math.abs(diffHistorica) > 0.01) {
        rotasCenariosAlterados += c.totalRotasCenario;
        lucroLiquidoCenariosAlterados += lucroCenarioAtual;
        receitaBrutaCenariosAlterados += c.totalRecebido;
        
        if (!categoriasAlteradasMap[c.categoria]) {
          categoriasAlteradasMap[c.categoria] = 0;
        }
        categoriasAlteradasMap[c.categoria] += c.totalRotasCenario;
      }
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

    // A adição de veículos segue prioritariamente o perfil das categorias alteradas. Se nenhuma foi alterada, segue a média dos ativos, senão a global.
    const lucro_medio_para_adicao = (rotasCenariosAlterados > 0) 
                                    ? (lucroLiquidoCenariosAlterados / rotasCenariosAlterados) 
                                    : ((rotasCenariosAtivos > 0) ? (lucroLiquidoCenariosAtivos / rotasCenariosAtivos) : lucro_medio_global);
    
    const receita_media_para_adicao = (rotasCenariosAlterados > 0)
                                    ? (receitaBrutaCenariosAlterados / rotasCenariosAlterados)
                                    : ((rotasCenariosAtivos > 0) ? (receitaBrutaCenariosAtivos / rotasCenariosAtivos) : receita_media_global);

    const inputVeiculos = parseInt(veiculosAdicionais) || 0;
    const vAdicionais = visaoDiaria ? inputVeiculos * Math.max(1, diasOperacao) : inputVeiculos;

    // Nova Receita e Lucro da Operação (Cenários Ativos + Novos Carros)
    const receitaOperacaoNova = receitaBrutaCenariosAtivos + (vAdicionais * receita_media_para_adicao);
    const lucroOperacaoNova = lucroLiquidoCenariosAtivos + (vAdicionais * lucro_medio_para_adicao);
    const margemOperacaoNova = receitaOperacaoNova > 0 ? (lucroOperacaoNova / receitaOperacaoNova) * 100 : 0;

    // Nova Receita e Lucro da Filial Total (Tudo + Novos Carros)
    const novoFaturamentoBrutoFilial = faturamentoBrutoFilial + (vAdicionais * receita_media_para_adicao);
    const novoResultadoSimulado = resultadoSimulado + (vAdicionais * lucro_medio_para_adicao);
    const novaMargemSimuladaFilial = novoFaturamentoBrutoFilial > 0 ? (novoResultadoSimulado / novoFaturamentoBrutoFilial) * 100 : 0;

    const impactoLucroR$ = vAdicionais * lucro_medio_para_adicao;

    // --- PONTO DE EQUILÍBRIO (Quantidade Ideal para Manter o Lucro Original) ---
    const gapLucro = resultadoReal - resultadoSimulado;
    let rotasParaManter = 0;
    let rotasParaManterDiarias = 0;
    let breakdownCategorias = [];

    if (gapLucro > 0 && lucro_medio_para_adicao > 0) {
      rotasParaManter = Math.ceil(gapLucro / lucro_medio_para_adicao);
      rotasParaManterDiarias = Math.ceil(rotasParaManter / Math.max(1, diasOperacao));

      // Calcula o mix de frota
      if (rotasCenariosAlterados > 0) {
        Object.entries(categoriasAlteradasMap).forEach(([cat, qtd]) => {
          const peso = qtd / rotasCenariosAlterados;
          const qtdCatTotal = Math.round(rotasParaManter * peso);
          const qtdCatDiaria = Math.ceil(qtdCatTotal / Math.max(1, diasOperacao));
          if (qtdCatTotal > 0) {
            breakdownCategorias.push({ categoria: cat, qtdTotal: qtdCatTotal, qtdDiaria: qtdCatDiaria });
          }
        });
      }
    }

    // --- PONTO DE EQUILÍBRIO (Tarifa Recomendada para manter a Margem Original em %) ---
    const custoNaoAfetado = custoRealFilialAU - custoRealRotasSimuladas;
    const novoImpostoAlvo = (novoFaturamentoBrutoFilial * (percentualImposto || 0)) / 100;
    const novaReceitaLiquidaAlvo = novoFaturamentoBrutoFilial - novoImpostoAlvo;
    
    // Margem real %
    const margemRealPerc = faturamentoBrutoFilial > 0 ? (resultadoReal / faturamentoBrutoFilial) : 0;
    // Lucro Alvo para manter a mesma margem % sobre o novo faturamento
    const lucroAlvoParaMargem = novoFaturamentoBrutoFilial * margemRealPerc;

    // Para que o lucro total seja lucroAlvoParaMargem: ReceitaLiquidaAlvo - CustoTotalPermitido = lucroAlvoParaMargem
    const novoCustoTotalPermitido = novaReceitaLiquidaAlvo - lucroAlvoParaMargem;
    const custoPermitidoOperacao = novoCustoTotalPermitido - custoNaoAfetado;
    const totalRotasOperacao = rotasCenariosAtivos + vAdicionais;
    
    let tarifaMediaRecomendada = 0;
    if (totalRotasOperacao > 0 && custoPermitidoOperacao > 0) {
      tarifaMediaRecomendada = custoPermitidoOperacao / totalRotasOperacao;
    }

    // --- MARGEM DE CRESCIMENTO COM TARIFA REAL (Sem aplicar simulação) ---
    // Qual seria a margem se os veículos adicionais mantivessem a tarifa antiga?
    let impostoRotasAtivas = (receitaBrutaCenariosAtivos * (percentualImposto || 0)) / 100;
    let lucroRotasAtivasReal = receitaBrutaCenariosAtivos - impostoRotasAtivas - custoRealRotasSimuladas;
    let lucroMedioRotasReais = rotasCenariosAtivos > 0 ? (lucroRotasAtivasReal / rotasCenariosAtivos) : 0;

    let resultadoComCrescimentoReal = resultadoReal + (vAdicionais * lucroMedioRotasReais);
    let margemComCrescimentoReal = novoFaturamentoBrutoFilial > 0 ? (resultadoComCrescimentoReal / novoFaturamentoBrutoFilial) * 100 : 0;

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
      lucro_medio_para_adicao,
      receita_media_para_adicao,
      margemOperacaoNova,
      novoFaturamentoBrutoFilial,
      novoResultadoSimulado,
      novaMargemSimuladaFilial,
      impactoLucroR$,
      rotasParaManter,
      rotasParaManterDiarias,
      breakdownCategorias,
      tarifaMediaRecomendada,
      gapLucro,
      margemComCrescimentoReal
    };
  }, [dadosPlanilhaComReceita, quinzena, filial, cenariosCalculados, percentualImposto, veiculosAdicionais, diasOperacao, visaoDiaria]);

  // --- NOVA VISÃO MACRO: EMPRESA GERAL ---
  const resumoGlobalEmpresa = useMemo(() => {
    const rotasEmpresa = dadosPlanilhaComReceita.filter(d => 
      d.quinzena === quinzena.trim().toUpperCase()
    );

    const faturamentoBruto = rotasEmpresa.reduce((acc, curr) => acc + curr.receitaTotal, 0);
    const custoRealAU = rotasEmpresa.reduce((acc, curr) => acc + curr.valorPago, 0);

    let deltaCustoSimulado = 0;
    cenariosCalculados.forEach(c => {
      deltaCustoSimulado += (c.totalPagoSimuladoFinal - c.totalAU);
    });

    const custoSimulado = custoRealAU + deltaCustoSimulado;

    const valorImposto = (faturamentoBruto * (percentualImposto || 0)) / 100;
    const receitaLiquida = faturamentoBruto - valorImposto;

    const resultadoReal = receitaLiquida - custoRealAU;
    const resultadoSimulado = receitaLiquida - custoSimulado;

    const margemReal = faturamentoBruto > 0 ? (resultadoReal / faturamentoBruto) * 100 : 0;
    const margemSimulada = faturamentoBruto > 0 ? (resultadoSimulado / faturamentoBruto) * 100 : 0;

    return {
      rotas: rotasEmpresa.length,
      faturamentoBruto,
      margemReal,
      margemSimulada,
      resultadoReal,
      resultadoSimulado
    };
  }, [dadosPlanilhaComReceita, quinzena, cenariosCalculados, percentualImposto]);

  const handleAddCenario = () => {
    const novoId = cenarios.length > 0 ? Math.max(...cenarios.map(c => c.id)) + 1 : 1;
    const cat = categoriasUnicas[0] || '';
    const dia = diasUnicas[0] || '';
    
    const rotas = dadosPlanilhaComReceita.filter(d => d.quinzena === quinzena && d.filial === filial && d.categoria === cat && d.dia === dia);
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
           const rotas = dadosPlanilhaComReceita.filter(d => d.quinzena === quinzena && d.filial === filial && d.categoria === updated.categoria && d.dia === updated.dia);
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
  const limparTudo = () => { setCenarios([]); setPercentualImposto(6.56); setVeiculosAdicionais(''); };
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
        <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 items-end">
            <div className="w-full space-y-1.5">
              <label className="text-[13px] font-semibold text-slate-600 flex items-center gap-1.5">
                <CalendarClock className="w-3.5 h-3.5 text-indigo-500" /> Quinzena
              </label>
              <select 
                value={quinzena}
                onChange={(e) => setQuinzena(e.target.value)}
                className="w-full py-1.5 px-3 bg-slate-50 border border-slate-200 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium uppercase text-sm text-slate-700"
              >
                {quinzenasUnicas?.map(q => <option key={q} value={q}>{q}</option>)}
              </select>
            </div>
            <div className="w-full space-y-1.5">
              <label className="text-[13px] font-semibold text-slate-600 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-indigo-500" /> Filial
              </label>
              <select 
                value={filial}
                onChange={(e) => setFilial(e.target.value)}
                className="w-full py-1.5 px-3 bg-slate-50 border border-slate-200 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium uppercase text-sm text-slate-700"
              >
                {filiaisUnicas.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div className="w-full space-y-1.5">
              <label className="text-[13px] font-semibold text-slate-600 flex items-center gap-1.5" title="Filtra fora rotas de um agregado">
                <UserMinus className="w-3.5 h-3.5 text-orange-500" /> Ocultar Agregado
              </label>
              <select 
                value={agregadoExcluido}
                onChange={(e) => setAgregadoExcluido(e.target.value)}
                className="w-full py-1.5 px-3 bg-orange-50 border border-orange-200 text-orange-800 rounded-md focus:ring-2 focus:ring-orange-500 outline-none transition-all font-medium uppercase text-sm truncate"
              >
                <option value="">Nenhum (Todos)</option>
                {agregadosUnicos.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div className="w-full space-y-1.5">
              <label className="text-[13px] font-semibold text-slate-600 flex items-center gap-1.5 truncate">
                <BadgeDollarSign className="w-3.5 h-3.5 text-emerald-500" /> Base Faturamento
              </label>
              <select 
                value={modoFaturamento}
                onChange={(e) => setModoFaturamento(e.target.value)}
                className="w-full py-1.5 px-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-md focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-medium uppercase text-sm truncate"
              >
                <option value="recebido">Val. Recebido (AZ+BI)</option>
                <option value="a_receber">Val. Devido (AV+BI)</option>
              </select>
            </div>
            <div className="w-full space-y-1.5 flex flex-col">
              <label className="text-[13px] font-semibold text-slate-600 flex items-center gap-1.5 truncate">
                <Percent className="w-3.5 h-3.5 text-red-500" /> Imposto Descontar
              </label>
              <div className="relative">
                <input 
                  type="number" 
                  min="0" step="0.1"
                  value={percentualImposto === 0 ? '' : percentualImposto}
                  onChange={(e) => setPercentualImposto(parseFloat(e.target.value) || 0)}
                  className="w-full py-1.5 px-3 pr-7 bg-red-50 border border-red-200 text-red-700 rounded-md focus:ring-2 focus:ring-red-500 outline-none transition-all font-medium text-sm"
                />
                <Percent className="w-3.5 h-3.5 text-red-500 absolute right-2.5 top-2.5" />
              </div>
              <div className="text-[10px] text-slate-500 leading-tight mt-1">
                PIS e Cofins: 3,5% | ISS: 0,5%<br/>
                IRPJ: 1,32% | CSLL: 1,19%<br/>
                Margem de erro: 2,5%
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

                  <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4 items-end ${cenario.isExpanded ? 'block' : 'hidden'}`} onClick={e => e.stopPropagation()}>
                    <div className="space-y-1 flex flex-col justify-end">
                      <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Categoria</label>
                      <select 
                        value={cenario.categoria}
                        onChange={(e) => handleCenarioChange(cenario.id, 'categoria', e.target.value)}
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium text-slate-700"
                      >
                        {categoriasUnicas.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                      </select>
                    </div>

                    <div className="space-y-1 flex flex-col justify-end">
                      <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Dia Semana</label>
                      <select 
                        value={cenario.dia}
                        onChange={(e) => handleCenarioChange(cenario.id, 'dia', e.target.value)}
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium text-slate-700"
                      >
                        {diasUnicas.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>

                    <div className="space-y-1 flex flex-col justify-end">
                      <label className="text-xs font-medium text-slate-500 uppercase tracking-wider flex items-center gap-1 truncate">
                        Padrão de Aumento
                      </label>
                      <select 
                        value={cenario.tipoProgressao || 'tabela'}
                        onChange={(e) => handleCenarioChange(cenario.id, 'tipoProgressao', e.target.value)}
                        className="w-full p-2 bg-blue-50 border border-blue-200 text-blue-800 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold truncate"
                      >
                        <option value="tabela">Seguir Proporção AL</option>
                        <option value="fixo">Percentual Fixo</option>
                      </select>
                    </div>

                    {cenario.tipoProgressao === 'fixo' && (
                      <div className="space-y-1 flex flex-col justify-end">
                        <label className="text-xs font-medium text-slate-500 uppercase tracking-wider flex items-center gap-1">
                          Aumento Fixo (%)
                        </label>
                        <div className="relative">
                          <input 
                            type="number" min="0" step="0.1"
                            value={cenario.percentualIncremento === 0 ? '' : cenario.percentualIncremento}
                            onChange={(e) => handleCenarioChange(cenario.id, 'percentualIncremento', parseFloat(e.target.value) || 0)}
                            className="w-full p-2 pr-8 bg-blue-50 border border-blue-200 text-blue-800 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold"
                          />
                          <Percent className="w-4 h-4 text-blue-500 absolute right-2.5 top-2.5" />
                        </div>
                      </div>
                    )}

                    <div className="space-y-1 flex flex-col justify-end">
                      <label className="text-xs font-medium text-indigo-600 uppercase tracking-wider truncate" title="Nova base que substituirá a Tarifa AL na faixa inicial">
                        Tarifa Base SIM. (R$)
                      </label>
                      <input 
                        type="number" min="0" step="5"
                        value={cenario.valorInicialSimulado === '' ? '' : cenario.valorInicialSimulado}
                        onChange={(e) => handleCenarioChange(cenario.id, 'valorInicialSimulado', e.target.value !== '' ? parseFloat(e.target.value) : '')}
                        className="w-full p-2 bg-indigo-50 border border-indigo-200 text-indigo-800 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-black shadow-sm"
                      />
                    </div>

                    <div className="space-y-1 flex flex-col justify-end">
                      <label className="text-xs font-medium text-slate-500 uppercase tracking-wider truncate">Faturado Histórico (R$)</label>
                      <input 
                        type="text" readOnly
                        value={formatCurrency(cenario.totalRecebido)}
                        className="w-full p-2 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg outline-none text-sm font-semibold cursor-not-allowed"
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

            {/* --- COCKPIT FINANCEIRO (VISÃO FILIAL) --- */}
            {cenarios.length > 0 && resumoGlobalFilial.rotas > 0 && (
              <div className="bg-indigo-950 border border-indigo-800 rounded-2xl p-6 shadow-2xl mt-8 flex flex-col gap-6 relative overflow-hidden">
                <div className="absolute -right-20 -top-20 opacity-5 pointer-events-none"><Target className="w-96 h-96" /></div>
                
                <div className="z-10 text-white border-b border-indigo-800/50 pb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <h3 className="text-xl font-bold text-indigo-300 mb-2 uppercase tracking-wide flex items-center gap-2">
                      <Target className="w-6 h-6 text-emerald-400" />
                      Cockpit Financeiro da Filial
                    </h3>
                    <p className="text-indigo-200 text-sm max-w-2xl leading-relaxed">
                      Avalie o impacto isolado da nova tarifa, descubra os pontos de equilíbrio para não perder dinheiro e faça projeções personalizadas adicionando veículos à frota.
                    </p>
                  </div>
                  
                  {/* Controles de Visão e Dias de Operação */}
                  <div className="flex items-center gap-3 bg-indigo-900/50 p-2 rounded-lg border border-indigo-700">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-indigo-300 font-bold uppercase tracking-wider mb-1">Dias Operados</span>
                      <input 
                        type="number" min="1" max="31" step="1"
                        value={diasOperacao}
                        onChange={(e) => setDiasOperacao(e.target.value !== '' ? parseInt(e.target.value) : 15)}
                        className="w-16 bg-indigo-950 border border-indigo-600 rounded text-center text-xs text-white p-1"
                      />
                    </div>
                    <div className="w-px h-8 bg-indigo-700 mx-1"></div>
                    <div className="flex flex-col">
                      <span className="text-[10px] text-indigo-300 font-bold uppercase tracking-wider mb-1 text-center">Visão</span>
                      <div className="flex bg-indigo-950 rounded border border-indigo-600 overflow-hidden">
                        <button 
                          onClick={() => setVisaoDiaria(false)}
                          className={`px-3 py-1 text-xs font-bold transition-colors ${!visaoDiaria ? 'bg-indigo-600 text-white' : 'text-indigo-300 hover:bg-indigo-800'}`}
                        >
                          Mês/Quinzena
                        </button>
                        <button 
                          onClick={() => setVisaoDiaria(true)}
                          className={`px-3 py-1 text-xs font-bold transition-colors ${visaoDiaria ? 'bg-indigo-600 text-white' : 'text-indigo-300 hover:bg-indigo-800'}`}
                        >
                          Dia
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 z-10">
                  {/* Bloco 1: Impacto Isolado e Ponto de Equilíbrio */}
                  <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-5 flex flex-col justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-indigo-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <BarChart3 className="w-4 h-4" /> Cenário Base (Zero Incremento)
                      </h4>
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-indigo-200 text-xs font-medium">Margem Original da Filial</span>
                        <span className="text-white font-bold">{resumoGlobalFilial.margemReal.toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-indigo-200 text-xs font-medium">Nova Margem (Apenas Tarifa)</span>
                        <span className={`font-bold ${resumoGlobalFilial.margemSimulada >= resumoGlobalFilial.margemReal ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {resumoGlobalFilial.margemSimulada.toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between items-center pt-3 border-t border-white/10">
                        <span className="text-indigo-200 text-xs font-medium">Impacto no Lucro Total</span>
                        <span className={`font-bold ${resumoGlobalFilial.resultadoSimulado >= resumoGlobalFilial.resultadoReal ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {resumoGlobalFilial.gapLucro <= 0 ? '+' : ''}{formatCurrency(resumoGlobalFilial.resultadoSimulado - resumoGlobalFilial.resultadoReal)}
                        </span>
                      </div>
                    </div>
                    
                    {resumoGlobalFilial.gapLucro > 0 ? (
                      <div className="mt-5 bg-rose-500/10 border border-rose-500/20 rounded-lg p-3">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-rose-300 block mb-1">
                          Ponto de Equilíbrio (Volume {visaoDiaria ? 'Diário' : 'Total'})
                        </span>
                        <p className="text-xs text-rose-100 mb-2">
                          Para recuperar essa perda financeira e empatar o lucro, você precisaria adicionar 
                          <strong className="text-rose-300 text-base ml-1">+{visaoDiaria ? resumoGlobalFilial.rotasParaManterDiarias : resumoGlobalFilial.rotasParaManter} veículos</strong> na operação.
                        </p>
                        
                        {resumoGlobalFilial.breakdownCategorias.length > 0 && (
                          <div className="mt-2 space-y-1">
                            <span className="text-[9px] text-rose-300/70 uppercase font-bold tracking-widest block mb-1 border-b border-rose-500/20 pb-1">Mix de Frota (Proporção):</span>
                            {resumoGlobalFilial.breakdownCategorias.map((b, idx) => (
                              <div key={idx} className="flex justify-between items-center text-[10px] bg-rose-900/30 px-2 py-1 rounded">
                                <span className="text-rose-200">{b.categoria}</span>
                                <span className="font-bold text-rose-300">+{visaoDiaria ? b.qtdDiaria : b.qtdTotal} {visaoDiaria ? 'p/ dia' : 'total'}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="mt-5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300 block mb-1">
                          Aumento de Rentabilidade
                        </span>
                        <p className="text-xs text-emerald-100">
                          A nova tarifa configurada já gera ganhos isolados para a operação da filial, sem necessidade de veículos extras.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Bloco 2: Projeção Personalizada */}
                  <div className="bg-indigo-900/50 backdrop-blur-sm border border-indigo-700/50 rounded-xl p-5 flex flex-col">
                    <h4 className="text-sm font-bold text-indigo-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4" /> Projeção de Incremento
                    </h4>
                    
                    <div className="flex gap-4 mb-5 items-end">
                      <div className="flex-1">
                        <label className="text-xs font-medium text-indigo-300 block mb-1">
                          {visaoDiaria ? 'Simular Adição Diária' : 'Simular Adição Total'}
                        </label>
                        <input
                          type="number" min="0" step="1"
                          value={veiculosAdicionais === '' ? '' : veiculosAdicionais}
                          onChange={(e) => setVeiculosAdicionais(e.target.value !== '' ? parseInt(e.target.value) : '')}
                          placeholder="Ex: 10"
                          className="w-full text-sm font-bold p-2 bg-indigo-950 border border-indigo-600 rounded-lg focus:ring-2 focus:ring-indigo-400 outline-none text-white text-center"
                        />
                      </div>
                      
                      {veiculosAdicionais !== '' && veiculosAdicionais > 0 && resumoGlobalFilial.gapLucro > 0 && (
                        <div className="flex-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-2 text-center flex flex-col justify-center">
                          <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-300 block mb-0.5">
                            Tarifa Rec. p/ Manter Margem
                          </span>
                          <span className="text-sm font-black text-emerald-400 leading-none">
                            {formatCurrency(resumoGlobalFilial.tarifaMediaRecomendada)}
                          </span>
                          <span className="text-[9px] text-emerald-200/70 block mt-1 leading-tight">
                            Média alvo para a operação
                          </span>
                        </div>
                      )}
                    </div>

                    {veiculosAdicionais !== '' && veiculosAdicionais > 0 ? (
                      <div className="grid grid-cols-2 gap-3 mt-auto">
                        <div className="bg-white/5 border border-white/10 rounded-lg p-3 text-center">
                          <span className="text-[10px] font-bold uppercase text-indigo-300 block mb-1">Margem com Tarifa Sim.</span>
                          <span className={`text-xl font-bold ${resumoGlobalFilial.novaMargemSimuladaFilial >= resumoGlobalFilial.margemReal ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {resumoGlobalFilial.novaMargemSimuladaFilial.toFixed(1)}%
                          </span>
                        </div>
                        <div className="bg-white/5 border border-white/10 rounded-lg p-3 text-center">
                          <span className="text-[10px] font-bold uppercase text-indigo-300 block mb-1">Margem com Tarifa Real</span>
                          <span className={`text-xl font-bold ${resumoGlobalFilial.margemComCrescimentoReal >= resumoGlobalFilial.margemReal ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {resumoGlobalFilial.margemComCrescimentoReal.toFixed(1)}%
                          </span>
                        </div>
                        <div className="col-span-2 bg-white/5 border border-white/10 rounded-lg p-3 text-center flex justify-between items-center px-4">
                          <span className="text-[10px] font-bold uppercase text-indigo-300">Impacto Mensal Projetado</span>
                          <span className={`text-xl font-bold ${resumoGlobalFilial.novoResultadoSimulado >= resumoGlobalFilial.resultadoReal ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {formatCurrency(resumoGlobalFilial.novoResultadoSimulado - resumoGlobalFilial.resultadoReal)}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 flex items-center justify-center border border-dashed border-indigo-700/50 rounded-lg mt-auto min-h-[100px]">
                        <span className="text-xs text-indigo-300/70 text-center px-4">
                          Informe a quantidade de veículos acima para gerar a projeção detalhada e a tarifa recomendada.
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* --- PAINEL GLOBAL (VISÃO EMPRESA) --- */}
            {cenarios.length > 0 && resumoGlobalEmpresa.rotas > 0 && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg mt-6 flex flex-col md:flex-row gap-6 md:items-center justify-between relative overflow-hidden">
                <div className="absolute -right-10 -top-10 opacity-10 pointer-events-none">
                  <Globe className="w-48 h-48 text-emerald-500" />
                </div>
                
                <div className="relative z-10 md:w-1/2">
                  <h3 className="text-xl font-bold text-white flex items-center gap-2 mb-2">
                    <Globe className="w-6 h-6 text-emerald-400" />
                    Análise Global (Visão Empresa)
                  </h3>
                  <p className="text-slate-300 text-sm">
                    Veja como a margem geral da empresa inteira é impactada pelas mudanças aplicadas nesta filial.
                  </p>
                </div>

                <div className="relative z-10 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-5 md:w-1/2 flex gap-4 md:gap-8 justify-around items-center min-h-[140px] shadow-inner">
                  <div className="text-center">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Margem Real</span>
                    <span className="text-3xl font-bold text-white">{resumoGlobalEmpresa.margemReal.toFixed(2)}%</span>
                    <span className="text-xs text-slate-500 block mt-1">{formatCurrency(resumoGlobalEmpresa.resultadoReal)}</span>
                  </div>
                  
                  <div className="flex flex-col items-center justify-center text-slate-600">
                    <TrendingUp className="w-6 h-6 rotate-90 mb-1" />
                    {(() => {
                      const diff = resumoGlobalEmpresa.margemSimulada - resumoGlobalEmpresa.margemReal;
                      if (Math.abs(diff) < 0.001) return <span className="text-[10px] font-bold text-slate-500 bg-slate-800/50 px-2 py-0.5 rounded">0 p.p.</span>;
                      return (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${diff > 0 ? 'text-emerald-400 bg-emerald-400/10' : 'text-red-400 bg-red-400/10'}`}>
                          {diff > 0 ? '+' : ''}{diff.toFixed(2)} p.p.
                        </span>
                      );
                    })()}
                  </div>
                  
                  <div className="text-center">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300 block mb-1">Margem Simulada</span>
                    <span className={`text-3xl font-black ${resumoGlobalEmpresa.margemSimulada >= resumoGlobalEmpresa.margemReal ? 'text-emerald-400' : 'text-red-400'}`}>
                      {resumoGlobalEmpresa.margemSimulada.toFixed(2)}%
                    </span>
                    <span className={`text-xs block mt-1 font-medium ${resumoGlobalEmpresa.margemSimulada >= resumoGlobalEmpresa.margemReal ? 'text-emerald-500/70' : 'text-red-500/70'}`}>
                      {formatCurrency(resumoGlobalEmpresa.resultadoSimulado)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
