import React, { useState } from 'react';
import {
  Activity,
  X,
  DollarSign,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Box,
  Calculator,
  Database,
  Settings,
  Users,
  Home,
  FileText,
  Search,
  LogOut,
  Wrench,
  BarChart3
} from 'lucide-react';
import { supabase } from '../../supabase';

// Componente auxiliar para labels de seção
const SectionLabel = ({ label, isCollapsed }) => {
  if (isCollapsed) return <div className="w-full border-t border-slate-700/50 my-2" />;
  return (
    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-5 mb-2 px-3 select-none">
      {label}
    </p>
  );
};

// Componente auxiliar para itens de menu simples (sem accordion)
const MenuItem = ({ icon: Icon, label, menuKey, activeMenu, onClick, badge, isCollapsed }) => {
  const isActive = activeMenu === menuKey;
  return (
    <button
      onClick={onClick}
      title={isCollapsed ? label : undefined}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-all duration-200 group relative ${
        isActive
          ? 'bg-blue-600/15 text-blue-400'
          : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
      }`}
    >
      {isActive && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-blue-500 rounded-r-full" />
      )}
      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-blue-400' : 'group-hover:text-slate-300'}`} />
      {!isCollapsed && (
        <span className={`truncate text-sm ${isActive ? 'font-bold' : ''}`}>{label}</span>
      )}
      {!isCollapsed && badge && (
        <span className="text-[9px] font-black bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded uppercase tracking-wider ml-auto shrink-0">
          {badge}
        </span>
      )}
    </button>
  );
};

// Componente auxiliar para sub-itens do accordion
const SubMenuItem = ({ label, menuKey, activeMenu, onClick, badge, isCollapsed }) => {
  const isActive = activeMenu === menuKey;
  if (isCollapsed) return null;
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between text-left pl-10 pr-3 py-2 rounded-lg text-sm font-medium transition-colors relative ${
        isActive
          ? 'bg-blue-600/20 text-blue-400'
          : 'text-slate-400 hover:bg-slate-800 hover:text-white'
      }`}
    >
      {isActive && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 bg-blue-500 rounded-r-full" />
      )}
      <span className="leading-snug text-left break-words mr-2">{label}</span>
      {badge && (
        <span className="text-[9px] font-black bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded uppercase tracking-wider ml-2 shrink-0">
          {badge}
        </span>
      )}
    </button>
  );
};

// Componente auxiliar para accordion (grupo expansível)
const AccordionMenu = ({
  icon: Icon,
  label,
  menuKey,
  expandKey,
  activeMenus,
  activeMenu,
  expandedMenus,
  toggleExpandedMenu,
  onClick,
  children,
  isCollapsed,
  maxHeight = 'max-h-[500px]'
}) => {
  const isActive = activeMenus.includes(activeMenu);
  return (
    <div className="flex flex-col">
      <button
        onClick={onClick}
        title={isCollapsed ? label : undefined}
        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg font-medium transition-all duration-200 group relative ${
          isActive
            ? 'bg-slate-800/50 text-white'
            : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
        }`}
      >
        {isActive && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-blue-500 rounded-r-full" />
        )}
        <div className="flex items-center gap-3">
          <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-blue-400' : 'group-hover:text-slate-300'}`} />
          {!isCollapsed && (
            <span className={`truncate text-sm ${isActive ? 'font-bold' : ''}`}>{label}</span>
          )}
        </div>
        {!isCollapsed && (
          <div
            onClick={(e) => toggleExpandedMenu(expandKey, e)}
            className="p-1 hover:bg-slate-700 rounded-md transition-colors text-slate-500 hover:text-slate-300"
          >
            <ChevronDown
              className={`w-4 h-4 transition-transform duration-200 ${
                expandedMenus[expandKey] ? 'rotate-180' : ''
              }`}
            />
          </div>
        )}
      </button>

      {!isCollapsed && (
        <div
          className={`flex flex-col gap-0.5 overflow-hidden transition-all duration-300 ease-in-out ${
            expandedMenus[expandKey]
              ? `${maxHeight} mt-1 opacity-100`
              : 'max-h-0 opacity-0'
          }`}
        >
          {children}
        </div>
      )}
    </div>
  );
};

export default function Sidebar({
  isMobileMenuOpen,
  setIsMobileMenuOpen,
  isOpMode,
  isImporter,
  isUserAdmin,
  isUserGestao,
  activeMenu,
  handleMenuChange,
  expandedMenus,
  toggleExpandedMenu,
  userPermissions = [],
  currentUser,
  userRole
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const hasMenuPerm = (menuKey) => isUserAdmin || isUserGestao || userPermissions.includes(menuKey);

  // Permissões por seção
  const hasFinanceiro = hasMenuPerm('detalhe_financeiro') || hasMenuPerm('gestao_margem') || hasMenuPerm('dre_gerencial');
  const hasOperacional = hasMenuPerm('gestao_penalidades') || hasMenuPerm('gestao_bsc') || hasMenuPerm('comparativo_bsc') || hasMenuPerm('gaps_operacionais') || hasMenuPerm('painel_treinamentos') || hasMenuPerm('disponibilidade_frota') || hasMenuPerm('gestao_motoristas');
  const hasPlanejamento = hasMenuPerm('dre_pesados') || hasMenuPerm('dre_leves') || hasMenuPerm('dre_viabilidade') || hasMenuPerm('simulador');
  const hasImportador = hasMenuPerm('importador');
  const hasExplorador = hasMenuPerm('explorador_dados');
  const hasConfig = hasMenuPerm('config_filiais') || hasMenuPerm('config_tarifas');

  // Menus ativos por seção
  const financeiroActiveMenus = ['gestao_financeira', 'detalhe_financeiro', 'gestao_margem', 'dre_gerencial'];
  const operacionalActiveMenus = ['gestao_operacional', 'gestao_penalidades', 'gestao_bsc', 'comparativo_bsc', 'gaps_operacionais', 'painel_treinamentos', 'disponibilidade_frota', 'gestao_motoristas'];
  const planejamentoActiveMenus = ['analise_custos', 'dre_custos', 'dre_leves', 'dre_viabilidade', 'simulador'];

  const closeMobile = () => setIsMobileMenuOpen(false);

  // Formatar a role para exibição
  const formatRole = (role) => {
    const map = { admin: 'Administrador', gestao: 'Gestão', operacao: 'Operação', importer: 'Importador' };
    return map[role] || role || '—';
  };

  // Iniciais do avatar
  const getInitials = (email) => {
    if (!email) return '??';
    const parts = email.split('@')[0].split(/[._-]/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return email.substring(0, 2).toUpperCase();
  };

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-50 transform transition-all duration-300 md:relative md:translate-x-0 ${
        isCollapsed ? 'w-[68px]' : 'w-64'
      } bg-slate-900 text-slate-300 flex flex-col shrink-0 border-r border-slate-800 ${
        isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      {/* ═══ HEADER / LOGO ═══ */}
      <div className="p-4 bg-slate-950 border-b border-slate-800 sticky top-0 z-10 flex justify-between items-center gap-2">
        <div className="flex items-center gap-2 select-none min-w-0">
          <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-950 shadow-lg border border-blue-400/20 shrink-0">
            <Activity className="w-5 h-5 text-emerald-400 absolute" strokeWidth={2.5} />
          </div>
          {!isCollapsed && (
            <span className="text-2xl font-black tracking-tighter text-white truncate">
              Dash<span className="text-blue-500">Op</span>
              <span className="text-emerald-400 text-3xl leading-none">.</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {/* Botão colapsar (desktop) */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden md:flex p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors"
            title={isCollapsed ? 'Expandir menu' : 'Recolher menu'}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
          {/* Botão fechar (mobile) */}
          <button
            className="md:hidden p-1.5 bg-slate-800 rounded-lg text-slate-400 hover:text-white"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ═══ NAVEGAÇÃO ═══ */}
      <nav className="flex-1 py-3 flex flex-col gap-0.5 px-3 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">

        {/* ─── INÍCIO (Home) ─── */}
        <MenuItem
          icon={Home}
          label="Início"
          menuKey="home"
          activeMenu={activeMenu}
          isCollapsed={isCollapsed}
          onClick={() => { handleMenuChange('home'); closeMobile(); }}
        />

        {/* ═══════════════════════ ANÁLISE ═══════════════════════ */}
        {hasFinanceiro && (
          <>
            <SectionLabel label="Análise" isCollapsed={isCollapsed} />
            <AccordionMenu
              icon={DollarSign}
              label="Financeiro"
              menuKey="gestao_financeira"
              expandKey="financeiro"
              activeMenus={financeiroActiveMenus}
              activeMenu={activeMenu}
              expandedMenus={expandedMenus}
              toggleExpandedMenu={toggleExpandedMenu}
              isCollapsed={isCollapsed}
              maxHeight="max-h-60"
              onClick={(e) => {
                toggleExpandedMenu('financeiro', e);
              }}
            >
              {hasMenuPerm('gestao_financeira') && (
                <SubMenuItem label="Visão Geral" menuKey="gestao_financeira" activeMenu={activeMenu} onClick={() => { handleMenuChange('gestao_financeira'); closeMobile(); }} />
              )}
              {hasMenuPerm('detalhe_financeiro') && (
                <SubMenuItem label="Penalidades Detalhadas" menuKey="detalhe_financeiro" activeMenu={activeMenu} onClick={() => { handleMenuChange('detalhe_financeiro'); closeMobile(); }} />
              )}
              {hasMenuPerm('gestao_margem') && (
                <SubMenuItem label="Margem de Contribuição" menuKey="gestao_margem" activeMenu={activeMenu} onClick={() => handleMenuChange('gestao_margem')} badge="Dev" />
              )}
              {hasMenuPerm('dre_gerencial') && (
                <SubMenuItem label="DRE Gerencial" menuKey="dre_gerencial" activeMenu={activeMenu} onClick={() => handleMenuChange('dre_gerencial')} />
              )}
            </AccordionMenu>
          </>
        )}

        {/* ═══════════════════════ OPERAÇÕES ═══════════════════════ */}
        {hasOperacional && (
          <>
            <SectionLabel label="Operações" isCollapsed={isCollapsed} />
            <AccordionMenu
              icon={Box}
              label="Operacional"
              menuKey="gestao_operacional"
              expandKey="operacional"
              activeMenus={operacionalActiveMenus}
              activeMenu={activeMenu}
              expandedMenus={expandedMenus}
              toggleExpandedMenu={toggleExpandedMenu}
              isCollapsed={isCollapsed}
              onClick={(e) => {
                toggleExpandedMenu('operacional', e);
              }}
            >
              {hasMenuPerm('gestao_operacional') && (
                <SubMenuItem label="Visão Geral" menuKey="gestao_operacional" activeMenu={activeMenu} onClick={() => { handleMenuChange('gestao_operacional'); closeMobile(); }} />
              )}
              {hasMenuPerm('gestao_penalidades') && (
                <SubMenuItem label="Penalidades (Operação)" menuKey="gestao_penalidades" activeMenu={activeMenu} onClick={() => { handleMenuChange('gestao_penalidades'); closeMobile(); }} />
              )}
              {hasMenuPerm('gestao_bsc') && (
                <SubMenuItem label="Visão BSC" menuKey="gestao_bsc" activeMenu={activeMenu} onClick={() => handleMenuChange('gestao_bsc')} badge="Dev" />
              )}
              {hasMenuPerm('comparativo_bsc') && (
                <SubMenuItem label="Comparativo BSC" menuKey="comparativo_bsc" activeMenu={activeMenu} onClick={() => handleMenuChange('comparativo_bsc')} badge="Dev" />
              )}
              {hasMenuPerm('gaps_operacionais') && (
                <SubMenuItem label="Gaps Operacionais" menuKey="gaps_operacionais" activeMenu={activeMenu} onClick={() => handleMenuChange('gaps_operacionais')} badge="Dev" />
              )}
              {hasMenuPerm('painel_treinamentos') && (
                <SubMenuItem label="Treinamentos" menuKey="painel_treinamentos" activeMenu={activeMenu} onClick={() => handleMenuChange('painel_treinamentos')} />
              )}
              {hasMenuPerm('disponibilidade_frota') && (
                <SubMenuItem label="Disponibilidade de Frota" menuKey="disponibilidade_frota" activeMenu={activeMenu} onClick={() => handleMenuChange('disponibilidade_frota')} />
              )}
              {hasMenuPerm('gestao_motoristas') && (
                <SubMenuItem label="Base de Motoristas" menuKey="gestao_motoristas" activeMenu={activeMenu} onClick={() => handleMenuChange('gestao_motoristas')} />
              )}
            </AccordionMenu>
          </>
        )}

        {/* ═══════════════════════ PLANEJAMENTO ═══════════════════════ */}
        {hasPlanejamento && (
          <>
            <SectionLabel label="Planejamento" isCollapsed={isCollapsed} />
            <AccordionMenu
              icon={BarChart3}
              label="Análise & Custos"
              menuKey="analise_custos"
              expandKey="analise_custos"
              activeMenus={planejamentoActiveMenus}
              activeMenu={activeMenu}
              expandedMenus={expandedMenus}
              toggleExpandedMenu={toggleExpandedMenu}
              isCollapsed={isCollapsed}
              maxHeight="max-h-60"
              onClick={(e) => {
                toggleExpandedMenu('analise_custos', e);
              }}
            >
              {hasMenuPerm('dre_pesados') && (
                <SubMenuItem label="Custos — Pesados" menuKey="dre_custos" activeMenu={activeMenu} onClick={() => handleMenuChange('dre_custos')} />
              )}
              {hasMenuPerm('dre_leves') && (
                <SubMenuItem label="Custos — Leves" menuKey="dre_leves" activeMenu={activeMenu} onClick={() => handleMenuChange('dre_leves')} />
              )}
              {hasMenuPerm('dre_viabilidade') && (
                <SubMenuItem label="Estudo de Viabilidade" menuKey="dre_viabilidade" activeMenu={activeMenu} onClick={() => handleMenuChange('dre_viabilidade')} />
              )}
              {hasMenuPerm('simulador') && (
                <SubMenuItem label="Simulador de Cenários" menuKey="simulador" activeMenu={activeMenu} onClick={() => { handleMenuChange('simulador'); closeMobile(); }} />
              )}
            </AccordionMenu>
          </>
        )}

        {/* ═══════════════════════ FERRAMENTAS ═══════════════════════ */}
        {(hasImportador || hasExplorador) && (
          <>
            <SectionLabel label="Ferramentas" isCollapsed={isCollapsed} />
            {hasImportador && (
              <MenuItem
                icon={Database}
                label="Importador Inteligente"
                menuKey="importador"
                activeMenu={activeMenu}
                isCollapsed={isCollapsed}
                onClick={() => { handleMenuChange('importador'); closeMobile(); }}
              />
            )}
            {hasExplorador && (
              <MenuItem
                icon={Search}
                label="Explorador de Dados"
                menuKey="explorador_dados"
                activeMenu={activeMenu}
                isCollapsed={isCollapsed}
                onClick={() => { handleMenuChange('explorador_dados'); closeMobile(); }}
              />
            )}
          </>
        )}

        {/* ═══════════════════════ ADMIN ═══════════════════════ */}
        {(hasConfig || isUserAdmin) && (
          <>
            <SectionLabel label="Admin" isCollapsed={isCollapsed} />
            {hasConfig && (
              <AccordionMenu
                icon={Settings}
                label="Configurações"
                menuKey="configuracoes"
                expandKey="configuracoes"
                activeMenus={['configuracoes', 'config_filiais', 'config_tarifas']}
                activeMenu={activeMenu}
                expandedMenus={expandedMenus}
                toggleExpandedMenu={toggleExpandedMenu}
                isCollapsed={isCollapsed}
                maxHeight="max-h-40"
                onClick={() => {
                  handleMenuChange('configuracoes');
                  if (!expandedMenus.configuracoes) toggleExpandedMenu('configuracoes', { stopPropagation: () => {} });
                  closeMobile();
                }}
              >
                {hasMenuPerm('config_filiais') && (
                  <SubMenuItem label="Filiais" menuKey="config_filiais" activeMenu={activeMenu} onClick={() => { handleMenuChange('config_filiais'); closeMobile(); }} />
                )}
                {hasMenuPerm('config_tarifas') && (
                  <SubMenuItem label="Tarifas" menuKey="config_tarifas" activeMenu={activeMenu} onClick={() => { handleMenuChange('config_tarifas'); closeMobile(); }} />
                )}
              </AccordionMenu>
            )}
            {isUserAdmin && (
              <MenuItem
                icon={Users}
                label="Gestão de Usuários"
                menuKey="gestao_usuarios"
                activeMenu={activeMenu}
                isCollapsed={isCollapsed}
                onClick={() => { handleMenuChange('gestao_usuarios'); closeMobile(); }}
              />
            )}
          </>
        )}
      </nav>

      {/* ═══ RODAPÉ FIXO — PERFIL ═══ */}
      <div className="border-t border-slate-800 bg-slate-950 p-3 shrink-0">
        {isCollapsed ? (
          <div className="flex flex-col items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white text-xs font-bold shadow-md" title={currentUser?.email || 'Usuário'}>
              {getInitials(currentUser?.email)}
            </div>
            <button
              onClick={() => supabase.auth.signOut()}
              className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
              title="Sair"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white text-xs font-bold shadow-md shrink-0">
              {getInitials(currentUser?.email)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-200 truncate" title={currentUser?.email}>
                {currentUser?.email?.split('@')[0] || 'Usuário'}
              </p>
              <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">
                {formatRole(userRole)}
              </p>
            </div>
            <button
              onClick={() => supabase.auth.signOut()}
              className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors shrink-0"
              title="Sair"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
