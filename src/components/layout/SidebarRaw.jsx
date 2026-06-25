      <aside className={`fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 md:relative md:translate-x-0 w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 overflow-y-auto border-r border-slate-800 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 bg-slate-950 border-b border-slate-800 sticky top-0 z-10 flex justify-between items-center">
          <div className="flex items-center gap-2 select-none">
            {/* Símbolo Abstrato (Pulso em um bloco tecnológico) */}
            <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-950 shadow-lg border border-blue-400/20">
              <Activity className="w-5 h-5 text-emerald-400 absolute" strokeWidth={2.5} />
            </div>

            {/* Tipografia Moderna */}
            <span className="text-2xl font-black tracking-tighter text-white">
              Dash<span className="text-blue-500">Op</span>
              <span className="text-emerald-400 text-3xl leading-none">.</span>
            </span>
          </div>
          {/* BOTÃO FECHAR MENU (MOBILE) */}
          <button
            className="md:hidden p-2 bg-slate-800 rounded-lg text-slate-400 hover:text-white"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <nav className="flex-1 py-6 flex flex-col gap-6 px-4">
          <div className="flex flex-col gap-1 pb-6">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 px-3">Módulos</p>

            {/* Accordion Gestão Financeira */}
            {!isOpMode && !isImporter && (
              <div className="flex flex-col mb-2">
                <button
                  onClick={() => {
                    handleMenuChange('gestao_financeira');
                    if (!expandedMenus.financeiro) toggleExpandedMenu('financeiro', { stopPropagation: () => { } });
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg font-medium transition-colors ${['gestao_financeira', 'detalhe_financeiro', 'gestao_margem'].includes(activeMenu) ? 'bg-slate-800/50 text-white' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'}`}
                >
                  <div className="flex items-center gap-3">
                    <DollarSign className={`w-4 h-4 shrink-0 ${activeMenu === 'gestao_financeira' ? 'text-blue-400' : ''}`} />
                    <span className={`truncate ${activeMenu === 'gestao_financeira' ? 'font-bold' : ''}`}>Gestão Financeira</span>
                  </div>
                  <div onClick={(e) => toggleExpandedMenu('financeiro', e)} className="p-1 hover:bg-slate-700 rounded-md transition-colors text-slate-500 hover:text-slate-300">
                    <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${expandedMenus.financeiro ? 'rotate-180' : ''}`} />
                  </div>
                </button>

                <div className={`flex flex-col gap-1 overflow-hidden transition-all duration-300 ease-in-out ${expandedMenus.financeiro ? 'max-h-40 mt-1 opacity-100' : 'max-h-0 opacity-0'}`}>
                  <button onClick={() => handleMenuChange('detalhe_financeiro')} className={`w-full flex items-center justify-start text-left pl-10 pr-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeMenu === 'detalhe_financeiro' ? 'bg-blue-600/20 text-blue-400' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                    <span className="truncate">Penalidades Detalhadas</span>
                  </button>
                  <button onClick={() => handleMenuChange('gestao_margem')} className={`w-full flex items-center justify-between text-left pl-10 pr-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeMenu === 'gestao_margem' ? 'bg-blue-600/20 text-blue-400' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                    <span className="truncate">Margem de Contribuição</span>
                    <span className="text-[9px] font-black bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded uppercase tracking-wider ml-2 shrink-0">Dev</span>
                  </button>
                </div>
              </div>
            )}

            {/* Accordion Gestão Operacional */}
            {!isImporter && (
            <div className="flex flex-col">
              <button
                onClick={() => {
                  handleMenuChange('gestao_operacional');
                  if (!expandedMenus.operacional) toggleExpandedMenu('operacional', { stopPropagation: () => { } });
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg font-medium transition-colors ${['gestao_operacional', 'gestao_penalidades', 'gestao_bsc', 'comparativo_bsc', 'gaps_operacionais', 'painel_treinamentos', 'disponibilidade_frota', 'gestao_motoristas'].includes(activeMenu) ? 'bg-slate-800/50 text-white' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'}`}
              >
                <div className="flex items-center gap-3">
                  <Box className={`w-4 h-4 shrink-0 ${activeMenu === 'gestao_operacional' ? 'text-blue-400' : ''}`} />
                  <span className={`truncate ${activeMenu === 'gestao_operacional' ? 'font-bold' : ''}`}>Gestão Operacional</span>
                </div>
                <div onClick={(e) => toggleExpandedMenu('operacional', e)} className="p-1 hover:bg-slate-700 rounded-md transition-colors text-slate-500 hover:text-slate-300">
                  <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${expandedMenus.operacional ? 'rotate-180' : ''}`} />
                </div>
              </button>

              <div className={`flex flex-col gap-1 overflow-hidden transition-all duration-300 ease-in-out ${expandedMenus.operacional ? 'max-h-[500px] mt-1 opacity-100' : 'max-h-0 opacity-0'}`}>
                <button onClick={() => handleMenuChange('gestao_penalidades')} className={`w-full flex items-center justify-start text-left pl-10 pr-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeMenu === 'gestao_penalidades' ? 'bg-blue-600/20 text-blue-400' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                  <span className="truncate">Penalidades (Operação)</span>
                </button>
                  <button onClick={() => handleMenuChange('gestao_bsc')} className={`w-full flex items-center justify-start text-left pl-10 pr-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeMenu === 'gestao_bsc' ? 'bg-blue-600/20 text-blue-400' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                    <span className="truncate">Visão BSC</span>
                  </button>
                  <button onClick={() => handleMenuChange('comparativo_bsc')} className={`w-full flex items-center justify-start text-left pl-10 pr-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeMenu === 'comparativo_bsc' ? 'bg-blue-600/20 text-blue-400' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                    <span className="truncate">Comparativo BSC</span>
                  </button>
                  <button onClick={() => handleMenuChange('gaps_operacionais')} className={`w-full flex items-center justify-start text-left pl-10 pr-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeMenu === 'gaps_operacionais' ? 'bg-blue-600/20 text-blue-400' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                    <span className="truncate">Gaps Operacionais</span>
                  </button>
                  <button onClick={() => handleMenuChange('painel_treinamentos')} className={`w-full flex items-center justify-start text-left pl-10 pr-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeMenu === 'painel_treinamentos' ? 'bg-blue-600/20 text-blue-400' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                    <span className="truncate">Treinamentos</span>
                  </button>
                  <button onClick={() => handleMenuChange('disponibilidade_frota')} className={`w-full flex items-center justify-start text-left pl-10 pr-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeMenu === 'disponibilidade_frota' ? 'bg-blue-600/20 text-blue-400' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                    <span className="truncate">Disponibilidade de Frota</span>
                  </button>
                  <button onClick={() => handleMenuChange('gestao_motoristas')} className={`w-full flex items-center justify-start text-left pl-10 pr-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeMenu === 'gestao_motoristas' ? 'bg-blue-600/20 text-blue-400' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                    <span className="truncate">Base de Motoristas</span>
                  </button>
                </div>
              </div>
            )}
            {/* Accordion Planejamento */}
            {!isOpMode && !isImporter && (
              <div className="flex flex-col">
                <button
                  onClick={() => {
                    handleMenuChange('planejamento');
                    if (!expandedMenus.planejamento) toggleExpandedMenu('planejamento', { stopPropagation: () => { } });
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg font-medium transition-colors ${['planejamento', 'dre_custos', 'dre_leves', 'dre_viabilidade'].includes(activeMenu) ? 'bg-slate-800/50 text-white' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'}`}
                >
                  <div className="flex items-center gap-3">
                    <Calculator className={`w-4 h-4 shrink-0 ${activeMenu === 'planejamento' ? 'text-blue-400' : ''}`} />
                    <span className={`truncate ${activeMenu === 'planejamento' ? 'font-bold' : ''}`}>Planejamento</span>
                  </div>
                  <div onClick={(e) => toggleExpandedMenu('planejamento', e)} className="p-1 hover:bg-slate-700 rounded-md transition-colors text-slate-500 hover:text-slate-300">
                    <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${expandedMenus.planejamento ? 'rotate-180' : ''}`} />
                  </div>
                </button>

                <div className={`flex flex-col gap-1 overflow-hidden transition-all duration-300 ease-in-out ${expandedMenus.planejamento ? 'max-h-60 mt-1 opacity-100' : 'max-h-0 opacity-0'}`}>
                  <button onClick={() => handleMenuChange('dre_custos')} className={`w-full flex items-center justify-start text-left pl-10 pr-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeMenu === 'dre_custos' ? 'bg-blue-600/20 text-blue-400' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                    <span className="truncate">DRE Custo Pesados</span>
                  </button>
                  <button onClick={() => handleMenuChange('dre_leves')} className={`w-full flex items-center justify-start text-left pl-10 pr-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeMenu === 'dre_leves' ? 'bg-blue-600/20 text-blue-400' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                    <span className="truncate">DRE Custo Leves</span>
                  </button>
                  <button onClick={() => handleMenuChange('dre_viabilidade')} className={`w-full flex items-center justify-start text-left pl-10 pr-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeMenu === 'dre_viabilidade' ? 'bg-blue-600/20 text-blue-400' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                    <span className="truncate">DRE Viabilidade</span>
                  </button>
                </div>
              </div>
            )}

            {/* Importador Inteligente */}
            {(isUserAdmin || isImporter) && (
              <div className="flex flex-col mt-4 pt-4 border-t border-slate-800">
                <button
                  onClick={() => {
                    handleMenuChange('importador');
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg font-medium transition-colors ${activeMenu === 'importador' ? 'bg-blue-600/20 text-blue-400' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'}`}
                >
                  <div className="flex items-center gap-3">
                    <Database className={`w-4 h-4 shrink-0 ${activeMenu === 'importador' ? 'text-blue-400' : ''}`} />
                    <span className={`truncate ${activeMenu === 'importador' ? 'font-bold' : ''}`}>Importador Inteligente</span>
                  </div>
                </button>
                {isUserAdmin && (
                  <>
                    <button
                      onClick={() => {
                        handleMenuChange('config_filiais');
                        setIsMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg font-medium transition-colors ${activeMenu === 'config_filiais' ? 'bg-blue-600/20 text-blue-400' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'} mt-2`}
                    >
                      <div className="flex items-center gap-3">
                        <Settings className={`w-4 h-4 shrink-0 ${activeMenu === 'config_filiais' ? 'text-blue-400' : ''}`} />
                        <span className={`truncate ${activeMenu === 'config_filiais' ? 'font-bold' : ''}`}>Config. de Filiais</span>
                      </div>
                    </button>
                    <button
                      onClick={() => {
                        handleMenuChange('config_tarifas');
                        setIsMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg font-medium transition-colors ${activeMenu === 'config_tarifas' ? 'bg-blue-600/20 text-blue-400' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'} mt-2`}
                    >
                      <div className="flex items-center gap-3">
                        <Settings className={`w-4 h-4 shrink-0 ${activeMenu === 'config_tarifas' ? 'text-blue-400' : ''}`} />
                        <span className={`truncate ${activeMenu === 'config_tarifas' ? 'font-bold' : ''}`}>Config. de Tarifas</span>
                      </div>
                    </button>
                    <button
                      onClick={() => {
                        handleMenuChange('gestao_usuarios');
                        setIsMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg font-medium transition-colors ${activeMenu === 'gestao_usuarios' ? 'bg-blue-600/20 text-blue-400' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'} mt-2`}
                    >
                      <div className="flex items-center gap-3">
                        <Users className={`w-4 h-4 shrink-0 ${activeMenu === 'gestao_usuarios' ? 'text-blue-400' : ''}`} />
                        <span className={`truncate ${activeMenu === 'gestao_usuarios' ? 'font-bold' : ''}`}>Gestão de Usuários</span>
                      </div>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </nav>
      </aside>
