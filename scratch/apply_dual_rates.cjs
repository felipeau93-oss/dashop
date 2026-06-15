const fs = require('fs');

let content = fs.readFileSync('src/Simulador.jsx', 'utf8');

// 1. Replace the calculation logic (lines ~465 to 483)
const oldCalc = `// --- PONTO DE EQUILÍBRIO (Tarifa Recomendada para manter a Margem Original em %) ---
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
    }`;

const newCalc = `// --- 1. TARIFA LIMITE (EMPATAR LUCRO EM R$) ---
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

content = content.replace(oldCalc, newCalc);

// 2. Replace the return statement keys
content = content.replace(
  "tarifaMediaRecomendada,\n      gapLucro,",
  "tarifaLimiteEmpate,\n      tarifaAlvoSaudavel,\n      gapLucro,"
);

// 3. Replace the UI block
const oldUI = `{veiculosAdicionais !== '' && veiculosAdicionais > 0 && resumoGlobalFilial.gapLucro > 0 && (
                        <div className="flex-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-2 text-center flex flex-col justify-center">
                          <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-300 flex items-center justify-center gap-1 mb-0.5">
                            Tarifa Rec. p/ Manter Margem
                            <span className="text-[8px] font-black bg-emerald-500/30 text-emerald-100 px-1 py-0.5 rounded leading-none shrink-0">DEV</span>
                          </span>
                          <span className="text-sm font-black text-emerald-400 leading-none">
                            {formatCurrency(resumoGlobalFilial.tarifaMediaRecomendada)}
                          </span>
                          <span className="text-[9px] text-emerald-200/70 block mt-1 leading-tight">
                            Média alvo para a operação
                          </span>
                        </div>
                      )}`;

const newUI = `{veiculosAdicionais !== '' && veiculosAdicionais > 0 && (
                        <div className="flex-1 flex gap-2">
                          <div className="flex-1 bg-rose-500/10 border border-rose-500/20 rounded-lg p-2 text-center flex flex-col justify-center relative group" title="Tarifa máxima para você não fechar no prejuízo em relação ao lucro original.">
                            <span className="text-[9px] font-bold uppercase tracking-wider text-rose-300 flex items-center justify-center gap-1 mb-0.5">
                              Teto (Empate R$)
                            </span>
                            <span className="text-sm font-black text-rose-400 leading-none">
                              {formatCurrency(resumoGlobalFilial.tarifaLimiteEmpate)}
                            </span>
                          </div>

                          <div className="flex-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-2 text-center flex flex-col justify-center relative group" title="Tarifa recomendada para a rentabilidade (%) crescer de forma saudável acompanhando o aumento do faturamento.">
                            <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-300 flex items-center justify-center gap-1 mb-0.5">
                              Alvo (Saudável)
                            </span>
                            <span className="text-sm font-black text-emerald-400 leading-none">
                              {formatCurrency(resumoGlobalFilial.tarifaAlvoSaudavel)}
                            </span>
                          </div>
                        </div>
                      )}`;

content = content.replace(oldUI, newUI);

// 4. Update the AgentContext
content = content.replace(
  "- Tarifa média recomendada (R$ por veículo) para manter a margem antiga % com os custos atuais: ${formatCurr(resumoGlobalFilial.tarifaMediaRecomendada)}",
  "- Tarifa Teto (R$ por veículo) para manter o Lucro em R$ original: ${formatCurr(resumoGlobalFilial.tarifaLimiteEmpate)}\n      - Tarifa Alvo (R$ por veículo) para crescer com Margem Saudável: ${formatCurr(resumoGlobalFilial.tarifaAlvoSaudavel)}"
);

fs.writeFileSync('src/Simulador.jsx', content, 'utf8');
console.log('Dual recommendation metrics injected.');
