import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { Truck, Search, Loader2, AlertCircle, FileSpreadsheet, X, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function GestaoMotoristas() {
  const [motoristas, setMotoristas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Pagination Main
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  // Modal Details
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [driverDetails, setDriverDetails] = useState([]);
  const [driverPenalties, setDriverPenalties] = useState({});
  const [expandedRoute, setExpandedRoute] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  
  // Edit Driver
  const [editingDriver, setEditingDriver] = useState(null);
  const [editForm, setEditForm] = useState({ nome: '', cpf_cnpj: '' });
  const [savingDriver, setSavingDriver] = useState(false);
  
  // Pagination Details
  const [detailsPage, setDetailsPage] = useState(1);

  useEffect(() => {
    fetchMotoristas();
  }, []);

  const fetchMotoristas = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('view_motorista_agregado')
      .select('driver_id, nome, cpf_cnpj, placas_vinculadas, total_rotas, entregues, saldo, valor_penalidades, qtd_penalidades')
      .order('valor_penalidades', { ascending: false });
    
    if (data) {
      setMotoristas(data);
    } else if (error) {
      console.error(error);
    }
    setLoading(false);
  };

  const handleVerDetalhes = async (driver) => {
    setSelectedDriver(driver);
    setDetailsPage(1);
    setExpandedRoute(null);
    setLoadingDetails(true);
    
    // Limits to 1000 routes per driver by default, can be paginated on server if needed later
    const { data: routesData, error } = await supabase
      .from('view_motorista_detalhes')
      .select('id_rota, quinzena, filial, data_rota, dia_semana, placa, entregues, saldo, valor_penalidades, qtd_penalidades')
      .eq('driver_id', driver.driver_id)
      .order('data_rota', { ascending: false });
      
    if (routesData) {
      setDriverDetails(routesData);
      
      // Fetch penalties for these routes
      const rotasIds = routesData.map(r => r.id_rota).filter(Boolean);
      if (rotasIds.length > 0) {
        const { data: penData } = await supabase
          .from('penalidades')
          .select('id_rota, id_pacote, tipo, descricao, valor')
          .in('id_rota', rotasIds);
          
        if (penData) {
          const penMap = {};
          penData.forEach(p => {
            if (!penMap[p.id_rota]) penMap[p.id_rota] = [];
            penMap[p.id_rota].push(p);
          });
          setDriverPenalties(penMap);
        }
      }
    }
    setLoadingDetails(false);
  };

  const formatExcelDate = (dateVal) => {
    if (!dateVal) return '-';
    const num = parseInt(dateVal);
    // Excel dates are numbers > 40000 (around year 2010+)
    if (!isNaN(num) && num > 40000) {
      const d = new Date(Math.round((num - 25569) * 86400 * 1000));
      return new Date(d.getTime() + d.getTimezoneOffset() * 60000).toLocaleDateString('pt-BR');
    }
    return dateVal;
  };

  const exportDetailsToExcel = () => {
    // ... logic remains but we are adding edit handling
    if (!driverDetails || driverDetails.length === 0) return;
    
    const dataToExport = driverDetails.map(d => {
      const routePenalties = driverPenalties[d.id_rota] || [];
      const pacotes = routePenalties.map(p => p.id_pacote).filter(Boolean).join(', ');
      const descricoes = routePenalties.map(p => p.descricao).filter(Boolean).join(' | ');

      return {
        "ID da Rota": d.id_rota,
        "Quinzena": d.quinzena,
        "Filial": d.filial,
        "Data": formatExcelDate(d.data_rota),
        "Dia da Semana": d.dia_semana,
        "Placa Utilizada": d.placa,
        "Saldo de Pacotes": d.saldo,
        "Entregues": d.entregues,
        "Insucessos": (d.saldo || 0) - (d.entregues || 0),
        "Qtd Penalidades": d.qtd_penalidades,
        "Valor Penalidades (R$)": d.valor_penalidades,
        "Pacotes Ocorrência": pacotes,
        "Motivo Ocorrência": descricoes
      };
    });

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "RaioX_Motorista");
    XLSX.writeFile(wb, `RaioX_${selectedDriver.nome ? selectedDriver.nome.replace(/\s+/g, '_') : selectedDriver.driver_id}.xlsx`);
  };

  const filtered = motoristas.filter(m => 
    (m.nome || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    (m.driver_id || '').includes(searchTerm) ||
    (m.cpf_cnpj || '').includes(searchTerm)
  );

  // Pagination logic
  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const currentData = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const totalDetailsPages = Math.ceil(driverDetails.length / itemsPerPage);
  const currentDetailsData = driverDetails.slice((detailsPage - 1) * itemsPerPage, detailsPage * itemsPerPage);

  const formatBRL = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

  return (
    <div className="p-6 md:p-10 animate-in fade-in zoom-in-95 duration-500 relative min-h-full">
      {selectedDriver && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-6xl max-h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-start bg-slate-50 shrink-0">
              <div>
                <h3 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                  <Eye className="w-6 h-6 text-blue-500" />
                  Raio-X do Motorista
                </h3>
                <div className="mt-4 flex flex-wrap gap-4 text-sm">
                  <div className="bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm">
                    <span className="text-slate-400 font-bold block text-[10px] uppercase tracking-wider">Nome</span>
                    <span className="font-black text-slate-800">{selectedDriver.nome}</span>
                  </div>
                  <div className="bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm">
                    <span className="text-slate-400 font-bold block text-[10px] uppercase tracking-wider">Driver ID</span>
                    <span className="font-mono text-slate-600 font-bold">{selectedDriver.driver_id}</span>
                  </div>
                  <div className="bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm">
                    <span className="text-slate-400 font-bold block text-[10px] uppercase tracking-wider">CPF/CNPJ</span>
                    <span className="text-slate-600 font-bold">{selectedDriver.cpf_cnpj}</span>
                  </div>
                  <div className="bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm">
                    <span className="text-slate-400 font-bold block text-[10px] uppercase tracking-wider">Placas Vinculadas</span>
                    <span className="font-mono text-slate-600 font-bold max-w-xs block truncate" title={selectedDriver.placas_vinculadas}>{selectedDriver.placas_vinculadas || '-'}</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={exportDetailsToExcel} className="p-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl transition-colors shadow-sm flex items-center gap-2 font-bold text-sm">
                  <FileSpreadsheet className="w-4 h-4" /> Exportar
                </button>
                <button onClick={() => setSelectedDriver(null)} className="p-2.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-500 hover:text-slate-700 transition-colors shadow-sm">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-6 bg-slate-50">
              {loadingDetails ? (
                <div className="flex flex-col items-center justify-center p-20 gap-4">
                  <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
                  <p className="text-slate-500 font-bold">Carregando histórico do motorista...</p>
                </div>
              ) : (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                        <tr>
                          <th className="p-4 font-bold text-[10px] uppercase tracking-wider">Data / Dia</th>
                          <th className="p-4 font-bold text-[10px] uppercase tracking-wider">Quinzena</th>
                          <th className="p-4 font-bold text-[10px] uppercase tracking-wider">Filial</th>
                          <th className="p-4 font-bold text-[10px] uppercase tracking-wider">Rota</th>
                          <th className="p-4 font-bold text-[10px] uppercase tracking-wider">Placa</th>
                          <th className="p-4 font-bold text-[10px] uppercase tracking-wider text-center">Volume (Sdo/Ent/Ins)</th>
                          <th className="p-4 font-bold text-[10px] uppercase tracking-wider text-right">Penalidades</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {currentDetailsData.map((d, i) => (
                          <React.Fragment key={i}>
                            <tr 
                              className={`hover:bg-slate-50 transition-colors ${d.valor_penalidades > 0 ? 'cursor-pointer' : ''} ${expandedRoute === d.id_rota ? 'bg-slate-50' : ''}`}
                              onClick={() => {
                                if (d.valor_penalidades > 0) {
                                  setExpandedRoute(expandedRoute === d.id_rota ? null : d.id_rota);
                                }
                              }}
                            >
                              <td className="p-4">
                                <span className="block font-bold text-slate-800">{formatExcelDate(d.data_rota)}</span>
                                <span className="text-[10px] font-bold text-slate-400 uppercase">{d.dia_semana}</span>
                              </td>
                              <td className="p-4 font-bold text-slate-600">{d.quinzena}</td>
                              <td className="p-4 font-bold text-slate-600">{d.filial}</td>
                              <td className="p-4 font-mono text-slate-500 text-xs">{d.id_rota}</td>
                              <td className="p-4 font-mono text-slate-500 text-xs">{d.placa}</td>
                              <td className="p-4 text-center">
                                <span className="font-bold text-blue-600" title="Saldo Total">{d.saldo}</span>
                                <span className="text-slate-400 mx-1">/</span>
                                <span className="font-black text-emerald-600" title="Entregues">{d.entregues}</span>
                                <span className="text-slate-400 mx-1">/</span>
                                <span className="font-bold text-orange-500" title="Insucessos">{(d.saldo || 0) - (d.entregues || 0)}</span>
                              </td>
                              <td className="p-4 text-right">
                                {d.valor_penalidades > 0 ? (
                                  <div className="flex flex-col items-end">
                                    <span className="font-black text-red-500 bg-red-50 px-2 py-0.5 rounded">{formatBRL(d.valor_penalidades)}</span>
                                    <span className="text-[10px] font-bold text-red-400 mt-0.5 flex items-center gap-1">
                                      {d.qtd_penalidades} ocorrência(s)
                                      <ChevronRight className={`w-3 h-3 transition-transform ${expandedRoute === d.id_rota ? 'rotate-90' : ''}`} />
                                    </span>
                                  </div>
                                ) : (
                                  <span className="font-bold text-slate-400">-</span>
                                )}
                              </td>
                            </tr>
                            {expandedRoute === d.id_rota && driverPenalties[d.id_rota] && (
                              <tr className="bg-slate-50/50">
                                <td colSpan="7" className="p-0">
                                  <div className="px-6 py-4 border-l-4 border-red-400 bg-red-50/30">
                                    <h4 className="text-xs font-black text-slate-800 mb-3 uppercase tracking-wider">Ocorrências da Rota</h4>
                                    <div className="flex flex-col gap-2">
                                      {driverPenalties[d.id_rota].map((pen, pIdx) => (
                                        <div key={pIdx} className="flex justify-between items-center bg-white p-3 rounded-xl border border-red-100 shadow-sm">
                                          <div>
                                            <div className="flex items-center gap-2 mb-1">
                                              <span className="px-2 py-0.5 rounded bg-red-100 text-red-700 text-[10px] font-bold uppercase">{pen.tipo || 'Penalidade'}</span>
                                              {pen.id_pacote && <span className="font-mono text-xs text-slate-500 font-bold">Pacote: {pen.id_pacote}</span>}
                                            </div>
                                            <span className="text-xs text-slate-600">{pen.descricao}</span>
                                          </div>
                                          <span className="font-black text-red-500">{formatBRL(pen.valor)}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        ))}
                        {currentDetailsData.length === 0 && (
                          <tr><td colSpan="7" className="p-8 text-center text-slate-500 font-medium">Nenhum registro encontrado.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  {totalDetailsPages > 1 && (
                    <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-500">Página {detailsPage} de {totalDetailsPages}</span>
                      <div className="flex gap-2">
                        <button disabled={detailsPage === 1} onClick={() => setDetailsPage(p => p - 1)} className="p-1.5 rounded bg-white border border-slate-200 text-slate-600 disabled:opacity-50 hover:bg-slate-50"><ChevronLeft className="w-4 h-4"/></button>
                        <button disabled={detailsPage === totalDetailsPages} onClick={() => setDetailsPage(p => p + 1)} className="p-1.5 rounded bg-white border border-slate-200 text-slate-600 disabled:opacity-50 hover:bg-slate-50"><ChevronRight className="w-4 h-4"/></button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
            <Truck className="w-7 h-7 text-blue-500" />
            Base de Motoristas
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Consolidação automática de todo o histórico da operação.
          </p>
        </div>
        <div className="relative w-full md:w-auto">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Buscar por nome, CPF ou ID..." 
            value={searchTerm}
            onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full md:w-80 shadow-sm"
          />
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl mb-6 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800">
          <strong>Raio-X Completo:</strong> Cada motorista é listado apenas uma vez. Clique em "Ver Detalhes" para analisar todas as rotas e placas vinculadas a ele.
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center p-20 gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
          <p className="text-slate-500 font-bold animate-pulse">Carregando histórico completo...</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                <tr>
                  <th className="p-4 font-bold uppercase tracking-wider text-[10px]">Driver ID</th>
                  <th className="p-4 font-bold uppercase tracking-wider text-[10px]">Nome do Motorista</th>
                  <th className="p-4 font-bold uppercase tracking-wider text-[10px]">CPF / CNPJ</th>
                  <th className="p-4 font-bold uppercase tracking-wider text-[10px] text-center">Total Rotas</th>
                  <th className="p-4 font-bold uppercase tracking-wider text-[10px] text-center">Volume (Sdo/Ent/Ins)</th>
                  <th className="p-4 font-bold uppercase tracking-wider text-[10px] text-right">Descontos (R$)</th>
                  <th className="p-4 font-bold uppercase tracking-wider text-[10px] text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {currentData.map((m, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-mono font-bold text-slate-500 text-xs">{m.driver_id}</td>
                    <td className="p-4 font-black text-slate-800">{m.nome}</td>
                    <td className="p-4 text-slate-600 text-xs">{m.cpf_cnpj}</td>
                    <td className="p-4 text-center font-black text-blue-600 bg-blue-50/50">{m.total_rotas}</td>
                    <td className="p-4 text-center">
                      <span className="font-bold text-blue-600" title="Saldo Total">{m.saldo}</span>
                      <span className="text-slate-400 mx-1">/</span>
                      <span className="font-black text-emerald-600" title="Entregues">{m.entregues}</span>
                      <span className="text-slate-400 mx-1">/</span>
                      <span className="font-bold text-orange-500" title="Insucessos">{(m.saldo || 0) - (m.entregues || 0)}</span>
                    </td>
                    <td className="p-4 text-right font-black text-red-500 bg-red-50/30">
                      {formatBRL(m.valor_penalidades)}
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex justify-center items-center gap-2">
                        <button 
                          onClick={() => handleEditDriver(m)}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors shadow-sm"
                        >
                          Editar
                        </button>
                        <button onClick={() => handleVerDetalhes(m)} className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors shadow-sm">
                          Ver Detalhes
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {currentData.length === 0 && (
                  <tr>
                    <td colSpan="7" className="p-12 text-center text-slate-500 font-medium">
                      Nenhum motorista encontrado na base.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {totalPages > 1 && (
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-between items-center mt-auto">
              <span className="text-xs font-bold text-slate-500">
                Mostrando {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, filtered.length)} de {filtered.length} motoristas
              </span>
              <div className="flex gap-2">
                <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 font-bold text-xs disabled:opacity-50 hover:bg-slate-50 transition-colors flex items-center gap-1">
                  <ChevronLeft className="w-4 h-4" /> Anterior
                </button>
                <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 font-bold text-xs disabled:opacity-50 hover:bg-slate-50 transition-colors flex items-center gap-1">
                  Próxima <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
