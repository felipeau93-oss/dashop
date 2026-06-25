import React from 'react';
import { Menu, Filter, RefreshCw, Settings, Sun, Moon } from 'lucide-react';
import { InverseMultiSelectDropdown } from '../ui/InverseMultiSelectDropdown';
import { supabase } from '../../supabase';

export default function Header({
  setIsMobileMenuOpen,
  quinzenasDisponiveis,
  filtroQuinzenas,
  setFiltroQuinzenas,
  regionaisDisponiveis,
  filtroRegionais,
  setFiltroRegionais,
  supervisoresDisponiveis,
  filtroSupervisores,
  setFiltroSupervisores,
  filiaisDisponiveis,
  filtroFiliais,
  setFiltroFiliais,
  showInsucessosFilter,
  diasSemanaDisponiveis,
  filtroDiasSemana,
  setFiltroDiasSemana,
  insucessosDisponiveis,
  insucessosExcluidos,
  setInsucessosExcluidos,
  hasActiveFilters,
  clearAllFilters,
  setActiveMenu,
  isDarkMode,
  setIsDarkMode
}) {
  return (
    <header className="bg-white border-b border-slate-200 p-4 md:px-6 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 shrink-0 shadow-sm z-30">
      <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-3 w-full xl:w-auto">
        <div className="flex items-center gap-3 w-full sm:w-auto pb-2 sm:pb-0 border-b border-slate-100 sm:border-none">
          <button
            className="md:hidden p-2 -ml-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-600 transition-colors"
            onClick={() => setIsMobileMenuOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 text-slate-500">
            <Filter className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider">Filtros</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-200">
          <InverseMultiSelectDropdown label="Quinzena" options={quinzenasDisponiveis} excluded={filtroQuinzenas} onChange={setFiltroQuinzenas} />
          <div className="hidden sm:block w-px h-6 bg-slate-300 mx-1"></div>
          <InverseMultiSelectDropdown label="Regional" options={regionaisDisponiveis} excluded={filtroRegionais} onChange={setFiltroRegionais} />
          <div className="hidden sm:block w-px h-6 bg-slate-300 mx-1"></div>
          <InverseMultiSelectDropdown label="Supervisor" options={supervisoresDisponiveis} excluded={filtroSupervisores} onChange={setFiltroSupervisores} />
          <div className="hidden sm:block w-px h-6 bg-slate-300 mx-1"></div>
          <InverseMultiSelectDropdown label="Filial" options={filiaisDisponiveis} excluded={filtroFiliais} onChange={setFiltroFiliais} />

          {showInsucessosFilter && (
            <>
              <div className="hidden sm:block w-px h-6 bg-slate-300 mx-1"></div>
              <InverseMultiSelectDropdown label="Dia da Semana" options={diasSemanaDisponiveis} excluded={filtroDiasSemana} onChange={setFiltroDiasSemana} />
              <div className="hidden sm:block w-px h-6 bg-slate-300 mx-1"></div>
              <InverseMultiSelectDropdown label="Motivos de Insucesso" options={insucessosDisponiveis} excluded={insucessosExcluidos} onChange={setInsucessosExcluidos} />
            </>
          )}

          {hasActiveFilters && (
            <>
              <div className="hidden sm:block w-px h-6 bg-slate-300 mx-1"></div>
              <button onClick={clearAllFilters} className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-[10px] font-bold text-slate-500 hover:text-red-600 bg-white border border-slate-200 hover:border-red-200 hover:bg-red-50 rounded-xl transition-all shadow-sm" title="Restaurar todos os filtros">
                <RefreshCw className="w-3.5 h-3.5" />
                <span className="hidden lg:inline uppercase tracking-wider">Restaurar</span>
              </button>
            </>
          )}
        </div>
      </div>

      <div className="flex shrink-0 w-full xl:w-auto mt-2 xl:mt-0 justify-end gap-3 items-center">
        <button onClick={() => setActiveMenu('configuracoes')} className="flex items-center justify-center gap-2 bg-slate-100 text-slate-700 hover:bg-slate-200 px-4 py-2 rounded-xl text-sm font-bold transition-colors shadow-sm w-full sm:w-auto">
          <Settings className="w-4 h-4" /> Configurações
        </button>
        <button onClick={() => supabase.auth.signOut()} className="flex items-center justify-center gap-2 bg-red-50 text-red-600 hover:bg-red-100 px-4 py-2 rounded-xl text-sm font-bold transition-colors shadow-sm w-full sm:w-auto">
          Sair
        </button>
        <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 bg-slate-100 text-slate-600 rounded-full hover:bg-slate-200 transition-colors shadow-sm" title={isDarkMode ? 'Modo Claro' : 'Modo Escuro'}>
          {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
      </div>
    </header>
  );
}
