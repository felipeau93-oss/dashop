const fs = require('fs');

let content = fs.readFileSync('src/Simulador.jsx', 'utf8');

const oldCalc = `// --- 1. TARIFA LIMITE (EMPATAR LUCRO EM R$) ---
    // Qual é a tarifa máxima para o lucro em R$ não cair em relação ao original?
    const novoImpostoAlvo = (novoFaturamentoBrutoFilial * (percentualImposto || 0)) / 100;
    const novaReceitaLiquidaAlvo = novoFaturamentoBrutoFilial - novoImpostoAlvo;
    
    const custoNaoAfetado = custoRealFilialAU - custoRealRotasSimuladas;
    const custoTotalPermitidoEmpate = novaReceitaLiquidaAlvo - resultadoReal;
    const custoPermitidoOperacaoEmpate = custoTotalPermitidoEmpate - custoNaoAfetado;
    
    const totalRotasOperacao = rotasCenariosAtivos + vAdicionais;
    
    let tarifaLimiteEmpate = 0;
    if (totalRotasOperacao > 0 && custoPermitidoOperacaoEmpate > 0) {
      tarifaLimiteEmpate = custoPermitidoOperacaoEmpate / totalRotasOperacao;
    }

    // --- 2. TARIFA SAUDÁVEL (MANTER MARGEM % DOS CARROS SIMULADOS) ---
    // Para crescimento saudável, garantimos que os novos carros obedeçam à mesma margem % dos carros que estão sendo simulados.
    let tarifaAlvoSaudavel = 0;
    if (rotasCenariosAtivos > 0 && receitaBrutaCenariosAtivos > 0) {
       const impostoBlocoSimulado = (receitaBrutaCenariosAtivos * (percentualImposto || 0)) / 100;
       const lucroBlocoSimuladoOriginal = receitaBrutaCenariosAtivos - impostoBlocoSimulado - custoRealRotasSimuladas;
       const margemBlocoOriginalPerc = lucroBlocoSimuladoOriginal / receitaBrutaCenariosAtivos;

       const receitaNovaOperacao = receitaBrutaCenariosAtivos + (vAdicionais * receita_media_para_adicao);
       const impostoNovaOperacao = (receitaNovaOperacao * (percentualImposto || 0)) / 100;
       
       const lucroAlvoBloco = receitaNovaOperacao * margemBlocoOriginalPerc;
       const custoPermitidoSaudavel = receitaNovaOperacao - impostoNovaOperacao - lucroAlvoBloco;
       
       tarifaAlvoSaudavel = custoPermitidoSaudavel / totalRotasOperacao;
    } else {
       tarifaAlvoSaudavel = tarifaLimiteEmpate; // fallback de segurança
    }`;

const newCalc = `// --- 1. TETO ZERO LUCRO (ECONOMIA UNITÁRIA) ---
    // Receita média do carro simulado menos os impostos. Se pagar mais que isso, o carro em si dá prejuízo.
    const receitaMediaParaCalc = receita_media_para_adicao || 0;
    const impostoMedioParaCalc = (receitaMediaParaCalc * (percentualImposto || 0)) / 100;
    const receitaLiquidaMediaParaCalc = receitaMediaParaCalc - impostoMedioParaCalc;
    
    const tarifaLimiteEmpate = receitaLiquidaMediaParaCalc;

    // --- 2. ALVO SAUDÁVEL (ECONOMIA UNITÁRIA) ---
    // Qual tarifa pagar para que o lucro desse carro corresponda à mesma margem % global atual da filial
    const margemRealPerc = faturamentoBrutoFilial > 0 ? (resultadoReal / faturamentoBrutoFilial) : 0;
    const lucroEsperadoPorCarro = receitaMediaParaCalc * margemRealPerc;
    
    const tarifaAlvoSaudavel = receitaLiquidaMediaParaCalc - lucroEsperadoPorCarro;`;

content = content.replace(oldCalc, newCalc);

fs.writeFileSync('src/Simulador.jsx', content, 'utf8');
console.log('Unit Economics applied.');
