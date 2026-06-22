import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { Database, Search, Edit3, Trash2, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';

export default function GestaoDadosTab({ mapeamentoFiliais, rawOperacionalData = [] }) {
  const [quinzenasAtivas, setQuinzenasAtivas] = useState([]);
  const [oldQuinzena, setOldQuinzena] = useState('');
  const [newQuinzena, setNewQuinzena] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);
  const [faturaDetails, setFaturaDetails] = useState('');
  const [quinzenaSummary, setQuinzenaSummary] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [dadosOrfaos, setDadosOrfaos] = useState([]);
  const [isLoadingOrfaos, setIsLoadingOrfaos] = useState(false);
  const [filialSelecionada, setFilialSelecionada] = useState({});
  const [selectedOrfaos, setSelectedOrfaos] = useState(new Set());
  const [bulkFilialSelecionada, setBulkFilialSelecionada] = useState('');

  const tabelasParaQuinzena = ['operacional', 'faturamento', 'penalidades', 'capcar', 'custos', 'disponibilidade_frota', 'bsc'];
  const tabelasComFilial = ['operacional', 'faturamento', 'penalidades', 'capcar', 'custos', 'bsc'];

  const loadQuinzenas = async () => {
    try {
      // Pega as quinzenas únicas do operacional como base
      const { data, error } = await supabase.from('operacional').select('quinzena');
      if (!error && data) {
        const unique = [...new Set(data.map(d => d.quinzena))].filter(Boolean);
        setQuinzenasAtivas(unique.sort());
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadOrfaos = async () => {
    setIsLoadingOrfaos(true);
    let allOrfaos = [];
    try {
      const validFiliais = mapeamentoFiliais.map(m => String(m.filial).trim()).filter(Boolean);
      const filterStr = validFiliais.length > 0 ? '(' + validFiliais.map(f => '"' + f + '"').join(',') + ')' : '()';

      for (const table of tabelasComFilial) {
        let query = supabase.from(table).select('*').limit(300);
        
        if (validFiliais.length > 0) {
          query = query.not('filial', 'in', filterStr);
        } else {
          query = query.eq('filial', 'N/A');
        }

        const { data, error } = await query;
        if (!error && data && data.length > 0) {
          allOrfaos = [...allOrfaos, ...data.map(d => ({ ...d, _tabela: table }))];
        }
      }
      setDadosOrfaos(allOrfaos);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingOrfaos(false);
    }
  };

  useEffect(() => {
    loadQuinzenas();
    loadOrfaos();
  }, []);

  useEffect(() => {
    if (!oldQuinzena) {
      setFaturaDetails('');
      setQuinzenaSummary(null);
      return;
    }
    const fetchDetails = async () => {
      setFaturaDetails('Buscando dados...');
      try {
        const { data, count, error } = await supabase
          .from('faturamento')
          .select('numero_fatura', { count: 'exact' })
          .eq('quinzena', oldQuinzena)
          .limit(1);
          
        let summary = {};
        for (const table of tabelasParaQuinzena) {
          const { count: c } = await supabase.from(table).select('id', { count: 'exact', head: true }).eq('quinzena', oldQuinzena);
          summary[table] = c || 0;
        }
        
        const { count: histC } = await supabase.from('importacoes_history').select('id', { count: 'exact', head: true }).eq('quinzena', oldQuinzena);
        summary['importacoes_history'] = histC || 0;

        setQuinzenaSummary(summary);
        
        if (!error && data) {
          const fatura = data.length > 0 ? (data[0].numero_fatura || 'S/N') : 'Nenhuma';
          setFaturaDetails(`Fatura: ${fatura}`);
        } else {
          setFaturaDetails('Detalhes indisponíveis.');
        }
      } catch (err) {
        setFaturaDetails('Erro ao buscar fatura.');
      }
    };
    fetchDetails();
  }, [oldQuinzena]);

  const handleRenameQuinzena = async () => {
    if (!oldQuinzena || !newQuinzena) return;
    if (!window.confirm(`Tem certeza que deseja renomear a quinzena de "${oldQuinzena}" para "${newQuinzena}" em TODAS as tabelas?`)) return;
    
    setIsRenaming(true);
    try {
      for (const table of tabelasParaQuinzena) {
        await supabase.from(table).update({ quinzena: newQuinzena }).eq('quinzena', oldQuinzena);
      }
      await supabase.rpc('rpc_refresh_materialized_views');
      alert(`Quinzena renomeada com sucesso!`);
      setOldQuinzena('');
      setNewQuinzena('');
      setQuinzenaSummary(null);
      loadQuinzenas();
    } catch (err) {
      console.error(err);
      alert("Erro ao renomear: " + err.message);
    } finally {
      setIsRenaming(false);
    }
  };

  const handleDeleteQuinzena = async () => {
    if (!oldQuinzena) return;
    if (!window.confirm(`ATENÇÃO! Tem certeza que deseja EXCLUIR PERMANENTEMENTE todos os dados de TODAS as tabelas associados à quinzena "${oldQuinzena}"? Essa ação não pode ser desfeita.`)) return;
    
    setIsDeleting(true);
    try {
      for (const table of tabelasParaQuinzena) {
        await supabase.from(table).delete().eq('quinzena', oldQuinzena);
      }
      await supabase.from('importacoes_history').delete().eq('quinzena', oldQuinzena);
      await supabase.rpc('rpc_refresh_materialized_views');
      
      alert(`Quinzena ${oldQuinzena} excluída com sucesso!`);
      setOldQuinzena('');
      setNewQuinzena('');
      setQuinzenaSummary(null);
      loadQuinzenas();
      loadOrfaos();
    } catch (err) {
      console.error(err);
      alert("Erro ao excluir quinzena: " + err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteOrfao = async (item) => {
    if (!window.confirm(`Excluir este registro permanentemente da tabela ${item._tabela}?`)) return;
    try {
      await supabase.from(item._tabela).delete().eq('id', item.id);
      setDadosOrfaos(prev => prev.filter(d => d.id !== item.id));
      setSelectedOrfaos(prev => {
        const newSet = new Set(prev);
        newSet.delete(item.id);
        return newSet;
      });
      await supabase.rpc('rpc_refresh_materialized_views');
    } catch (e) {
      console.error(e);
      alert("Erro ao excluir.");
    }
  };

  const handleBulkFixOrfaos = async () => {
    if (selectedOrfaos.size === 0) return;
    if (!bulkFilialSelecionada) {
      alert("Selecione uma filial para aplicar em massa.");
      return;
    }
    if (!window.confirm(`Aplicar a filial ${bulkFilialSelecionada} em ${selectedOrfaos.size} registros selecionados?`)) return;
    
    setIsLoadingOrfaos(true);
    try {
      const config = mapeamentoFiliais.find(m => String(m.filial).toUpperCase() === String(bulkFilialSelecionada).toUpperCase());
      const reg = config ? config.regional : 'N/A';
      const sup = config ? config.supervisor : 'N/A';

      const itemsToFix = dadosOrfaos.filter(d => selectedOrfaos.has(d.id));
      
      for (const item of itemsToFix) {
         await supabase.from(item._tabela).update({
            filial: bulkFilialSelecionada,
            regional: reg,
            supervisor: sup
         }).eq('id', item.id);
      }
      
      setDadosOrfaos(prev => prev.filter(d => !selectedOrfaos.has(d.id)));
      setSelectedOrfaos(new Set());
      setBulkFilialSelecionada('');
      await supabase.rpc('rpc_refresh_materialized_views');
      alert(`Sucesso! ${itemsToFix.length} registros foram corrigidos.`);
    } catch (e) {
      console.error(e);
      alert("Erro ao aplicar correções em massa.");
    } finally {
      setIsLoadingOrfaos(false);
    }
  };

  const handleFixOrfao = async (item) => {
    const novaFilial = filialSelecionada[item.id];
    if (!novaFilial) {
      alert("Selecione uma filial primeiro.");
      return;
    }
    
    const config = mapeamentoFiliais.find(m => String(m.filial).toUpperCase() === String(novaFilial).toUpperCase());
    const reg = config ? config.regional : 'N/A';
    const sup = config ? config.supervisor : 'N/A';

    try {
      await supabase.from(item._tabela).update({
        filial: novaFilial,
        regional: reg,
        supervisor: sup
      }).eq('id', item.id);

      setDadosOrfaos(prev => prev.filter(d => d.id !== item.id));
      await supabase.rpc('rpc_refresh_materialized_views');
    } catch (err) {
      alert("Erro ao reparar: " + err.message);
    }
  };

  const handleAutoRepair = async () => {
    if (!window.confirm("Isso fará com que o sistema busque o ID das rotas órfãs no histórico do Operacional e conserte a Filial automaticamente. Deseja continuar?")) return;
    
    setIsLoadingOrfaos(true);
    let repairedCount = 0;
    
    // Pegar todos os IDs das rotas rfs
    const idsToRepair = dadosOrfaos.map(d => String(d.id_rota).trim()).filter(Boolean);
    const uniqueIds = [...new Set(idsToRepair)];
    
    if (uniqueIds.length === 0) {
      setIsLoadingOrfaos(false);
      alert("Nenhuma das linhas rfs possui ID de rota para ser buscado no Operacional.");
      return;
    }

    // Buscar no banco de dados em tempo real (ignora o cache local)
    const mapRotaFilial = {};
    try {
      for (let i = 0; i < uniqueIds.length; i += 200) {
        const chunk = uniqueIds.slice(i, i + 200);
        const { data: opData } = await supabase
          .from('operacional')
          .select('id_rota, filial, regional, supervisor')
          .in('id_rota', chunk);
          
        if (opData) {
          opData.forEach(d => {
            if (d.filial && d.filial !== 'N/A') {
              let fKey = String(d.filial).trim().toUpperCase();
              let config = mapeamentoFiliais.find(m => String(m.filial).toUpperCase() === fKey);
              if (!config) {
                 config = mapeamentoFiliais.find(m => m.de_para && String(m.de_para).toUpperCase().split(',').map(s => s.trim()).includes(fKey));
              }
              if (config) {
                 mapRotaFilial[String(d.id_rota).trim()] = { filial: config.filial, regional: config.regional, supervisor: config.supervisor };
              } else {
                 mapRotaFilial[String(d.id_rota).trim()] = { filial: d.filial, regional: d.regional, supervisor: d.supervisor };
              }
            }
          });
        }
      }
    } catch (e) {
      console.error("Erro ao buscar no Operacional:", e);
    }

    try {
      for (const item of dadosOrfaos) {
        if (!item.id_rota) continue;
        const opMatch = mapRotaFilial[String(item.id_rota).trim()];
        if (opMatch) {
          await supabase.from(item._tabela).update({
            filial: opMatch.filial,
            regional: opMatch.regional,
            supervisor: opMatch.supervisor
          }).eq('id', item.id);
          repairedCount++;
        }
      }
      
      if (repairedCount > 0) {
        await supabase.rpc('rpc_refresh_materialized_views');
        alert(`Sucesso! ${repairedCount} registros foram corrigidos automaticamente com base no Operacional.`);
      } else {
        alert("Nenhuma rota órfã pôde ser encontrada no histórico do Operacional.");
      }
      await loadOrfaos();
    } catch (err) {
      alert("Erro no auto-reparo: " + err.message);
      setIsLoadingOrfaos(false);
    }
  };

  const filiaisDropdown = mapeamentoFiliais.map(m => m.filial).filter(Boolean).sort();
  const orfaosFiltrados = oldQuinzena ? dadosOrfaos.filter(d => d.quinzena === oldQuinzena) : dadosOrfaos;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* CARD RENOMEAR QUINZENA */}
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6">
        <h3 className="text-lg font-black text-slate-200 mb-4 flex items-center gap-2">
          <Edit3 className="w-5 h-5 text-blue-400" /> Alterar Quinzena Lançada
        </h3>
        <div className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex-1">
            <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Quinzena Errada (Atual)</label>
            <select 
              value={oldQuinzena} 
              onChange={e => setOldQuinzena(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-200 focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Selecione...</option>
              {quinzenasAtivas.map(q => <option key={q} value={q}>{q}</option>)}
            </select>
            {faturaDetails && (
              <p className="mt-2 text-xs font-mono font-bold text-blue-400">
                {faturaDetails}
              </p>
            )}
          </div>
          <div className="flex-1">
            <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Nova Quinzena (Correta)</label>
            <input 
              type="text" 
              placeholder="Ex: 202605Q1" 
              value={newQuinzena} 
              onChange={e => setNewQuinzena(e.target.value.toUpperCase())}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-200 focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button 
            onClick={handleRenameQuinzena}
            disabled={isRenaming || isDeleting || !oldQuinzena || !newQuinzena}
            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold px-6 py-2.5 rounded-xl transition-all"
          >
            {isRenaming ? 'Processando...' : 'Aplicar Correção Global'}
          </button>
        </div>

        {quinzenaSummary && oldQuinzena && (
          <div className="mt-6 p-4 bg-slate-900/50 border border-slate-700 rounded-xl">
            <h4 className="text-sm font-bold text-slate-300 mb-3 flex items-center justify-between">
              <span>Registros encontrados em {oldQuinzena}</span>
              <button
                onClick={handleDeleteQuinzena}
                disabled={isDeleting || isRenaming}
                className="bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white px-4 py-1.5 rounded-lg text-xs font-bold transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <Trash2 className="w-3 h-3" /> {isDeleting ? 'Excluindo...' : 'Excluir Toda a Quinzena'}
              </button>
            </h4>
            <div className="flex flex-wrap gap-2">
              {Object.entries(quinzenaSummary).map(([tbl, cnt]) => cnt > 0 && (
                <span key={tbl} className="bg-slate-800 text-slate-400 text-xs px-3 py-1 rounded-full border border-slate-700">
                  <strong className="text-slate-200 capitalize">{tbl.replace('_', ' ')}:</strong> {cnt}
                </span>
              ))}
              {Object.values(quinzenaSummary).every(c => c === 0) && (
                <span className="text-slate-500 text-xs">Nenhum registro encontrado nesta quinzena.</span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* CARD DADOS ÓRFAOS */}
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6">
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 mb-6">
          <div>
            <h3 className="text-lg font-black text-slate-200 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" /> Linhas "Órfãs" ({orfaosFiltrados.length})
            </h3>
            <p className="text-slate-400 text-sm mt-1">
              Estes são os registros do banco onde a coluna Filial estava vazia ou possui um código inválido.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {selectedOrfaos.size > 0 && (
              <div className="flex items-center gap-2 bg-indigo-500/10 p-1.5 rounded-xl border border-indigo-500/20">
                <select
                  value={bulkFilialSelecionada}
                  onChange={(e) => setBulkFilialSelecionada(e.target.value)}
                  className="bg-slate-900 border border-slate-700 text-slate-200 text-sm rounded-lg px-3 py-1.5 focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="">Selecione a Filial...</option>
                  {filiaisDropdown.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
                <button 
                  onClick={handleBulkFixOrfaos}
                  disabled={isLoadingOrfaos || !bulkFilialSelecionada}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-bold transition-colors disabled:opacity-50"
                >
                  Aplicar em {selectedOrfaos.size} itens
                </button>
              </div>
            )}
            <button 
              onClick={handleAutoRepair}
              disabled={isLoadingOrfaos || orfaosFiltrados.length === 0}
              className="px-4 py-2 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white rounded-lg text-sm font-bold transition-colors disabled:opacity-50"
            >
              Auto-Reparar com Operacional
            </button>
            <button onClick={loadOrfaos} className="p-2 bg-slate-900 border border-slate-700 hover:bg-slate-700 rounded-lg text-slate-400 transition-colors">
              <RefreshCw className={`w-5 h-5 ${isLoadingOrfaos ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {isLoadingOrfaos ? (
          <div className="text-center py-10 text-slate-400">Carregando linhas órfãs...</div>
        ) : orfaosFiltrados.length === 0 ? (
          <div className="text-center py-10 text-emerald-400 font-bold flex flex-col items-center gap-2">
            <CheckCircle2 className="w-8 h-8" />
            {oldQuinzena 
              ? `Nenhum registro sem filial foi encontrado na quinzena ${oldQuinzena}!` 
              : 'Nenhum registro sem filial foi encontrado no banco!'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-900/50 text-slate-400 uppercase text-[10px] font-bold">
                <tr>
                  <th className="p-3 w-10">
                    <input 
                      type="checkbox"
                      checked={orfaosFiltrados.length > 0 && selectedOrfaos.size === orfaosFiltrados.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedOrfaos(new Set(orfaosFiltrados.map(i => i.id)));
                        } else {
                          setSelectedOrfaos(new Set());
                        }
                      }}
                      className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-blue-500 focus:ring-blue-500 focus:ring-offset-slate-900"
                    />
                  </th>
                  <th className="p-3">Tabela</th>
                  <th className="p-3">Quinzena</th>
                  <th className="p-3 text-orange-400">Filial Inválida</th>
                  <th className="p-3">Valor/Rota/Detalhe</th>
                  <th className="p-3">Ação: Reparar Filial</th>
                  <th className="p-3 text-right">Ação: Excluir</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50 text-sm">
                {orfaosFiltrados.map((item) => (
                  <tr key={item.id} className={`hover:bg-slate-700/20 ${selectedOrfaos.has(item.id) ? 'bg-indigo-500/10' : ''}`}>
                    <td className="p-3">
                      <input 
                        type="checkbox"
                        checked={selectedOrfaos.has(item.id)}
                        onChange={(e) => {
                          const newSet = new Set(selectedOrfaos);
                          if (e.target.checked) newSet.add(item.id);
                          else newSet.delete(item.id);
                          setSelectedOrfaos(newSet);
                        }}
                        className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-blue-500 focus:ring-blue-500 focus:ring-offset-slate-900"
                      />
                    </td>
                    <td className="p-3 text-slate-300 font-mono text-xs uppercase">{item._tabela}</td>
                    <td className="p-3 text-slate-300">{item.quinzena}</td>
                    <td className="p-3 font-bold text-orange-400">{item.filial || 'Vazio'}</td>
                    <td className="p-3 text-slate-400 text-xs">
                      {item.descricao && <div className="truncate max-w-xs" title={item.descricao}>{item.descricao}</div>}
                      {item.id_rota && <div>Rota: {item.id_rota}</div>}
                      {item.numero_fatura && <div className="text-blue-400 font-bold">Fatura: {item.numero_fatura}</div>}
                      {item.valor !== undefined && <div className="text-red-400">Valor: R$ {item.valor}</div>}
                      {item.faturamento !== undefined && <div className="text-emerald-400">Fat: R$ {item.faturamento}</div>}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <select
                          value={filialSelecionada[item.id] || ''}
                          onChange={(e) => setFilialSelecionada({...filialSelecionada, [item.id]: e.target.value})}
                          className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-2 py-1 focus:ring-1 focus:ring-blue-500"
                        >
                          <option value="">Selecione...</option>
                          {filiaisDropdown.map(f => <option key={f} value={f}>{f}</option>)}
                        </select>
                        <button 
                          onClick={() => handleFixOrfao(item)}
                          disabled={!filialSelecionada[item.id]}
                          className="bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white px-3 py-1 rounded-lg text-xs font-bold transition-colors disabled:opacity-30"
                        >
                          Aplicar
                        </button>
                      </div>
                    </td>
                    <td className="p-3 text-right">
                      <button 
                        onClick={() => handleDeleteOrfao(item)}
                        className="p-1.5 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                        title="Excluir Permanentemente"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
