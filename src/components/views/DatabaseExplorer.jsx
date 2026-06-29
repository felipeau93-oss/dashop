import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { Database, Search, Check, RefreshCw, AlertTriangle, ChevronLeft, ChevronRight, Save, Filter, X, Trash2, Edit3 } from 'lucide-react';

const TABLES = [
  'operacional',
  'faturamento',
  'penalidades',
  'custos',
  'disponibilidade_frota',
  'bsc',
  'motoristas',
  'treinamentos',
  'importacoes_history'
];

const OPERATORS = [
  { value: 'eq', label: 'Igual (=)' },
  { value: 'ilike', label: 'Contém (texto)' },
  { value: 'gt', label: 'Maior que (>)' },
  { value: 'lt', label: 'Menor que (<)' },
  { value: 'gte', label: 'Maior ou Igual (>=)' },
  { value: 'lte', label: 'Menor ou Igual (<=)' },
  { value: 'neq', label: 'Diferente (!=)' }
];

export default function DatabaseExplorer() {
  const [selectedTable, setSelectedTable] = useState('');
  const [data, setData] = useState([]);
  const [columns, setColumns] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Pagination
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [totalRecords, setTotalRecords] = useState(0);

  // Filters
  const [filters, setFilters] = useState([{ column: '', operator: 'eq', value: '' }]);

  // Editing
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  // Bulk Selection
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (selectedTable) {
      setPage(0);
      setFilters([{ column: '', operator: 'eq', value: '' }]);
      loadTableData(selectedTable, 0, [{ column: '', operator: 'eq', value: '' }]);
    } else {
      setData([]);
      setColumns([]);
      setTotalRecords(0);
    }
  }, [selectedTable, pageSize]);

  const loadTableData = async (table = selectedTable, currentPage = page, currentFilters = filters) => {
    if (!table) return;
    setIsLoading(true);
    setEditingId(null);
    setSelectedIds(new Set());

    try {
      let query = supabase.from(table).select('*', { count: 'exact' });

      // Apply Filters
      for (const f of currentFilters) {
        if (f.column && f.value) {
          if (f.operator === 'ilike') {
            query = query.ilike(f.column, `%${f.value}%`);
          } else {
            query = query.filter(f.column, f.operator, f.value);
          }
        }
      }

      // Pagination
      const from = currentPage * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);
      
      const { data: result, count, error } = await query;
      
      if (error) throw error;

      if (result && result.length > 0) {
        const cols = Object.keys(result[0]);
        if (cols.includes('id')) {
           cols.splice(cols.indexOf('id'), 1);
           cols.unshift('id');
        }
        setColumns(cols);
      } else if (result && result.length === 0 && columns.length === 0) {
         const { data: fallback } = await supabase.from(table).select('*').limit(1);
         if (fallback && fallback.length > 0) {
            const cols = Object.keys(fallback[0]);
            if (cols.includes('id')) { cols.splice(cols.indexOf('id'), 1); cols.unshift('id'); }
            setColumns(cols);
         }
      }

      setData(result || []);
      setTotalRecords(count || 0);

    } catch (err) {
      console.error(err);
      alert('Erro ao carregar dados da tabela: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = (index, field, value) => {
    const newFilters = [...filters];
    newFilters[index][field] = value;
    setFilters(newFilters);
  };

  const addFilter = () => {
    setFilters([...filters, { column: '', operator: 'eq', value: '' }]);
  };

  const removeFilter = (index) => {
    const newFilters = [...filters];
    newFilters.splice(index, 1);
    if (newFilters.length === 0) {
      newFilters.push({ column: '', operator: 'eq', value: '' });
    }
    setFilters(newFilters);
  };

  const applyFilters = () => {
    setPage(0);
    loadTableData(selectedTable, 0, filters);
  };

  const clearFilters = () => {
    const defaultFilters = [{ column: '', operator: 'eq', value: '' }];
    setFilters(defaultFilters);
    setPage(0);
    loadTableData(selectedTable, 0, defaultFilters);
  };

  const handleEditClick = (row) => {
    setEditingId(row.id);
    setEditForm({ ...row });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    setIsSaving(true);
    try {
      const payload = { ...editForm };
      delete payload.id; 
      
      const { error } = await supabase.from(selectedTable).update(payload).eq('id', editingId);
      if (error) throw error;
      
      setData(data.map(d => d.id === editingId ? { ...d, ...payload } : d));
      setEditingId(null);
      setEditForm({});
      
      await supabase.rpc('rpc_refresh_materialized_views');
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteRow = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir permanentemente este registro?')) return;
    try {
      const { error } = await supabase.from(selectedTable).delete().eq('id', id);
      if (error) throw error;
      
      setData(data.filter(d => d.id !== id));
      setTotalRecords(prev => prev - 1);
      
      await supabase.rpc('rpc_refresh_materialized_views');
    } catch (err) {
      console.error(err);
      alert('Erro ao excluir registro: ' + err.message);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`ATENÇÃO: Você está prestes a excluir ${selectedIds.size} registros selecionados. Esta ação é irreversível. Deseja continuar?`)) return;
    
    setIsDeleting(true);
    try {
      const idsArray = Array.from(selectedIds);
      const { error } = await supabase.from(selectedTable).delete().in('id', idsArray);
      
      if (error) throw error;
      
      setData(data.filter(d => !selectedIds.has(d.id)));
      setSelectedIds(new Set());
      setTotalRecords(prev => prev - idsArray.length);
      
      await supabase.rpc('rpc_refresh_materialized_views');
      alert('Registros excluídos com sucesso.');
      
      if (data.length === idsArray.length) {
        loadTableData();
      }
    } catch (err) {
      console.error(err);
      alert('Erro ao excluir registros em massa: ' + err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(new Set(data.map(d => d.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const toggleSelectRow = (id) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* HEADER & CONTROLS */}
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-end justify-between mb-6 border-b border-slate-700 pb-6">
          <div className="w-full md:w-1/3">
            <label className="block text-xs font-bold text-slate-400 uppercase mb-2 flex items-center gap-2">
              <Database className="w-4 h-4 text-blue-400" /> Tabela do Banco de Dados
            </label>
            <select 
              value={selectedTable} 
              onChange={e => setSelectedTable(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-200 focus:ring-2 focus:ring-blue-500 transition-all font-mono"
            >
              <option value="">Selecione uma tabela...</option>
              {TABLES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => loadTableData()} disabled={!selectedTable || isLoading} className="p-2.5 bg-slate-900 border border-slate-700 hover:bg-slate-700 rounded-xl text-slate-400 transition-colors" title="Atualizar">
              <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {selectedTable && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-300 mb-2">
              <Filter className="w-4 h-4 text-emerald-400" /> Filtros Dinâmicos
            </div>
            
            {filters.map((filter, index) => (
              <div key={index} className="flex flex-col sm:flex-row gap-2 items-center">
                <select 
                  value={filter.column} 
                  onChange={e => handleFilterChange(index, 'column', e.target.value)}
                  className="w-full sm:w-1/3 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:ring-1 focus:ring-emerald-500 font-mono"
                >
                  <option value="">Selecione a Coluna...</option>
                  {columns.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                
                <select 
                  value={filter.operator} 
                  onChange={e => handleFilterChange(index, 'operator', e.target.value)}
                  className="w-full sm:w-1/4 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:ring-1 focus:ring-emerald-500"
                >
                  {OPERATORS.map(op => <option key={op.value} value={op.value}>{op.label}</option>)}
                </select>
                
                <input 
                  type="text" 
                  placeholder="Valor..." 
                  value={filter.value} 
                  onChange={e => handleFilterChange(index, 'value', e.target.value)}
                  className="w-full sm:w-1/3 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:ring-1 focus:ring-emerald-500"
                  onKeyDown={e => e.key === 'Enter' && applyFilters()}
                />

                <div className="flex gap-1 w-full sm:w-auto">
                  {filters.length > 1 && (
                    <button onClick={() => removeFilter(index)} className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                  {index === filters.length - 1 && (
                    <button onClick={addFilter} className="px-3 py-2 text-xs font-bold bg-slate-900 border border-slate-700 hover:bg-slate-700 rounded-lg text-slate-300 transition-colors">
                      + E
                    </button>
                  )}
                </div>
              </div>
            ))}

            <div className="flex flex-wrap gap-2 pt-2">
              <button onClick={applyFilters} disabled={isLoading} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors">
                <Search className="w-4 h-4" /> {isLoading ? 'Buscando...' : 'Aplicar Filtros'}
              </button>
              <button onClick={clearFilters} className="px-4 py-2 text-sm font-bold text-slate-400 hover:text-white bg-slate-900 border border-slate-700 hover:bg-slate-700 rounded-lg transition-colors">
                Limpar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* DATA TABLE */}
      {selectedTable && (
        <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden shadow-sm flex flex-col">
          
          {/* Table Header Controls */}
          <div className="p-4 bg-slate-900/50 border-b border-slate-700 flex flex-wrap justify-between items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="text-sm text-slate-400">
                Mostrando <strong className="text-slate-200">{data.length}</strong> de <strong className="text-slate-200">{totalRecords}</strong> registros
              </div>
              
              {selectedIds.size > 0 && (
                <button 
                  onClick={handleBulkDelete}
                  disabled={isDeleting}
                  className="flex items-center gap-2 bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
                >
                  <Trash2 className="w-4 h-4" /> Excluir {selectedIds.size} Selecionados
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Página {page + 1} de {Math.max(1, Math.ceil(totalRecords / pageSize))}</span>
              <button 
                onClick={() => { setPage(p => p - 1); loadTableData(selectedTable, page - 1); }} 
                disabled={page === 0 || isLoading}
                className="p-1.5 bg-slate-900 border border-slate-700 hover:bg-slate-700 rounded-lg text-slate-400 disabled:opacity-30"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button 
                onClick={() => { setPage(p => p + 1); loadTableData(selectedTable, page + 1); }} 
                disabled={(page + 1) * pageSize >= totalRecords || isLoading}
                className="p-1.5 bg-slate-900 border border-slate-700 hover:bg-slate-700 rounded-lg text-slate-400 disabled:opacity-30"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              
              <select 
                value={pageSize}
                onChange={e => { setPageSize(Number(e.target.value)); setPage(0); }}
                className="ml-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-300 px-2 py-1.5 focus:ring-1 focus:ring-blue-500"
              >
                <option value={20}>20/pág</option>
                <option value={50}>50/pág</option>
                <option value={100}>100/pág</option>
                <option value={500}>500/pág</option>
              </select>
            </div>
          </div>

          {/* Table Content */}
          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-3">
                <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
                <p>Carregando dados...</p>
              </div>
            ) : data.length === 0 ? (
              <div className="p-12 text-center text-slate-500 font-medium">
                Nenhum registro encontrado para os filtros atuais.
              </div>
            ) : (
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] font-bold sticky top-0 z-10">
                  <tr>
                    <th className="p-3 w-10 border-b border-slate-700">
                      <input 
                        type="checkbox"
                        checked={data.length > 0 && selectedIds.size === data.length}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-blue-500 focus:ring-blue-500 focus:ring-offset-slate-900"
                      />
                    </th>
                    <th className="p-3 border-b border-slate-700 sticky left-0 z-20 bg-slate-950 w-24">Ações</th>
                    {columns.map(col => (
                      <th key={col} className="p-3 border-b border-slate-700 font-mono text-[9px] tracking-wider">{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50 text-xs">
                  {data.map((row) => {
                    const isEditing = editingId === row.id;
                    const isSelected = selectedIds.has(row.id);
                    
                    return (
                      <tr key={row.id} className={`hover:bg-slate-700/20 transition-colors ${isSelected ? 'bg-blue-500/10' : ''} ${isEditing ? 'bg-emerald-500/10' : ''}`}>
                        <td className="p-3 border-r border-slate-700/30">
                          <input 
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectRow(row.id)}
                            className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-blue-500 focus:ring-blue-500 focus:ring-offset-slate-900"
                          />
                        </td>
                        <td className="p-3 border-r border-slate-700/30 sticky left-0 z-10 bg-slate-800 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.5)]">
                          {isEditing ? (
                            <div className="flex items-center gap-1">
                              <button onClick={handleSaveEdit} disabled={isSaving} className="p-1.5 bg-emerald-600 text-white rounded hover:bg-emerald-500 transition-colors" title="Salvar">
                                <Save className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={handleCancelEdit} className="p-1.5 bg-slate-700 text-slate-300 rounded hover:bg-slate-600 transition-colors" title="Cancelar">
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1">
                              <button onClick={() => handleEditClick(row)} className="p-1.5 text-blue-400 hover:bg-blue-500/20 rounded transition-colors" title="Editar">
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => handleDeleteRow(row.id)} className="p-1.5 text-red-400 hover:bg-red-500/20 rounded transition-colors" title="Excluir">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </td>
                        
                        {columns.map(col => (
                          <td key={col} className={`p-2 px-3 ${col === 'id' ? 'font-mono text-[10px] text-slate-500' : 'text-slate-300'}`}>
                            {isEditing && col !== 'id' ? (
                              <input 
                                type="text"
                                value={editForm[col] === null ? '' : editForm[col]}
                                onChange={e => setEditForm({...editForm, [col]: e.target.value})}
                                className="w-full min-w-[100px] bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs text-white focus:ring-1 focus:ring-emerald-500"
                              />
                            ) : (
                              <div className="max-w-xs truncate" title={String(row[col])}>
                                {row[col] === null ? <span className="text-slate-600 italic">null</span> : 
                                 typeof row[col] === 'boolean' ? (row[col] ? 'True' : 'False') :
                                 typeof row[col] === 'object' ? JSON.stringify(row[col]) :
                                 String(row[col])}
                              </div>
                            )}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
