import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { createClient } from '@supabase/supabase-js';
import { UserPlus, Trash2, Shield, User, Loader2, CheckCircle2, Clock, Settings, Save, X } from 'lucide-react';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export default function GestaoUsuarios() {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newNome, setNewNome] = useState('');
  const [newTelefone, setNewTelefone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState('operacao');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [activeTab, setActiveTab] = useState('ativos'); // 'ativos' | 'pendentes'
  const [editingPermissions, setEditingPermissions] = useState(null);
  const [currentPerms, setCurrentPerms] = useState([]);
  const [currentRole, setCurrentRole] = useState('operacao');

  const formatName = (str) => {
    return str.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      console.error(err);
      setError('Erro ao carregar usuários. Verifique as permissões.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleAddUser = async (e) => {
    e.preventDefault();
    if (!newEmail.trim() || !newNome.trim()) return;
    setIsSubmitting(true);
    setError('');
    setSuccessMessage('');
    
    try {
      // Cria cliente secundário para não deslogar o admin atual
      const adminAuthClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        }
      });

      // Gera senha temporária de 8 caracteres
      const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%";
      let tempPassword = "";
      for (let i = 0; i < 8; i++) {
        tempPassword += chars.charAt(Math.floor(Math.random() * chars.length));
      }

      // Cria usuário no Auth
      const { data: authData, error: authError } = await adminAuthClient.auth.signUp({
        email: newEmail.trim().toLowerCase(),
        password: tempPassword,
      });

      if (authError) {
        if (authError.message && authError.message.toLowerCase().includes('user already registered')) {
          throw new Error('Este e-mail já está cadastrado no sistema.');
        }
        throw authError;
      }
      
      const { error: dbError } = await supabase
        .from('user_roles')
        .insert([{ 
          email: newEmail.trim().toLowerCase(), 
          role: newRole,
          nome: formatName(newNome),
          telefone: newTelefone,
          needs_password_change: true
        }]);
        
      if (dbError) throw dbError;
      
      setNewNome('');
      setNewTelefone('');
      setNewEmail('');
      setNewRole('operacao');
      setSuccessMessage(`Usuário criado com sucesso! A senha temporária é: ${tempPassword} (Copie e envie ao usuário. O usuário deverá utilizar o código OTP recebido por e-mail no primeiro acesso.)`);
      window.alert(`ATENÇÃO! Copie a senha temporária abaixo para enviar ao usuário:\n\n${tempPassword}\n\nO Supabase enviará apenas o código numérico OTP no e-mail dele.`);
      
      await fetchUsers();
    } catch (err) {
      console.error(err);
      if (err.code === '23505') {
        setError('Este e-mail já possui um papel cadastrado ou pendente na tabela de permissões.');
      } else {
        setError(`Erro ao cadastrar usuário: ${err.message}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async (id, email) => {
    if (!window.confirm(`Tem certeza que deseja remover o acesso/solicitação de ${email}?`)) return;
    
    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      await fetchUsers();
    } catch (err) {
      console.error(err);
      alert(`Erro ao remover: ${err.message}`);
    }
  };

  const handleApproveUser = async (id, email, selectedRole) => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .update({ role: selectedRole })
        .eq('id', id);
        
      if (error) throw error;
      await fetchUsers();
    } catch (err) {
      console.error(err);
      alert(`Erro ao aprovar: ${err.message}`);
    }
  };

  const savePermissions = async (userId) => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .update({ permissoes: currentPerms, role: currentRole })
        .eq('id', userId);
      if (error) throw error;
      setEditingPermissions(null);
      await fetchUsers();
    } catch (err) {
      console.error(err);
      alert(`Erro ao salvar permissões: ${err.message}`);
    }
  };

  const togglePerm = (perm) => {
    setCurrentPerms(prev => prev.includes(perm) ? prev.filter(p => p !== perm) : [...prev, perm]);
  };

  const pendentes = users.filter(u => u.role === 'pending');
  const ativos = users.filter(u => u.role !== 'pending');

  return (
    <div className="p-6 max-w-5xl mx-auto w-full font-sans text-slate-800 animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
          <Shield className="w-8 h-8 text-blue-600" />
          Gestão de Usuários
        </h1>
        <p className="text-slate-500 font-medium mt-1">Gerencie os acessos, permissões e solicitações do DashOp.</p>
        <p className="text-xs text-blue-600 bg-blue-50 p-3 rounded-lg mt-3 font-semibold border border-blue-100">
          Nota: O sistema gerará uma senha temporária ao criar um usuário. O Supabase enviará o e-mail de OTP. Envie a senha temporária para a pessoa.
        </p>
      </div>

      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 mb-8">
        <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
          <UserPlus className="w-5 h-5 text-emerald-500" />
          Conceder Novo Acesso Manualmente
        </h2>
        <form onSubmit={handleAddUser} className="flex flex-col gap-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Nome Completo</label>
              <input
                type="text"
                value={newNome}
                onChange={(e) => setNewNome(e.target.value)}
                placeholder="João da Silva"
                className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">E-mail do Usuário</label>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="exemplo@espindolalog.com"
                className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Telefone (Opcional)</label>
              <input
                type="tel"
                value={newTelefone}
                onChange={(e) => setNewTelefone(e.target.value)}
                placeholder="51999999999"
                className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Papel (Role)</label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="operacao">Operação (Apenas Ops)</option>
                <option value="importer">Importer (Apenas Importador)</option>
                <option value="gestao">Gestão (Total exceto Usuários)</option>
                <option value="admin">Administrador (Total)</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full md:w-48 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Criar Acesso'}
            </button>
          </div>
        </form>
        {error && <p className="text-red-500 text-sm font-bold mt-4">{error}</p>}
        {successMessage && (
          <div className="mt-4 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
            <p className="text-emerald-700 text-sm font-bold break-all">{successMessage}</p>
          </div>
        )}
      </div>

      <div className="flex gap-4 mb-4">
        <button
          onClick={() => setActiveTab('ativos')}
          className={`px-4 py-2 font-bold rounded-xl transition-all flex items-center gap-2 ${activeTab === 'ativos' ? 'bg-blue-600 text-white' : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-200'}`}
        >
          <User className="w-4 h-4" /> Usuários Ativos ({ativos.length})
        </button>
        <button
          onClick={() => setActiveTab('pendentes')}
          className={`px-4 py-2 font-bold rounded-xl transition-all flex items-center gap-2 ${activeTab === 'pendentes' ? 'bg-amber-500 text-white' : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-200'}`}
        >
          <Clock className="w-4 h-4" /> Solicitações Pendentes ({pendentes.length})
        </button>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden mb-8">
        {isLoading ? (
          <div className="p-12 flex justify-center">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs uppercase font-black text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4">Usuário</th>
                  <th className="px-6 py-4">Papel</th>
                  <th className="px-6 py-4">Data da Solicitação</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activeTab === 'ativos' ? (
                  ativos.length > 0 ? ativos.map((user) => (
                    <React.Fragment key={user.id}>
                    <tr className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-800">{user.nome || '—'}</div>
                        <div className="font-medium text-slate-500">{user.email}</div>
                        {user.telefone && <div className="text-xs text-slate-400 mt-1">{user.telefone}</div>}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-md text-xs font-bold uppercase tracking-wider
                          ${user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 
                            user.role === 'importer' ? 'bg-emerald-100 text-emerald-700' : 
                            user.role === 'gestao' ? 'bg-amber-100 text-amber-700' : 
                            'bg-blue-100 text-blue-700'}`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs font-medium text-slate-400">
                        {new Date(user.created_at).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setEditingPermissions(user.id);
                            const defaultOpPerms = ['gestao_penalidades', 'gestao_bsc', 'comparativo_bsc', 'gaps_operacionais', 'painel_treinamentos', 'disponibilidade_frota', 'gestao_motoristas'];
                            const defaultImpPerms = ['importador'];
                            setCurrentPerms(user.permissoes || (user.role === 'operacao' ? defaultOpPerms : user.role === 'importer' ? defaultImpPerms : []));
                            setCurrentRole(user.role || 'operacao');
                          }}
                          className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Gerenciar Permissões Extras"
                        >
                          <Settings className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.id, user.email)}
                          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Remover Acesso"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                    {editingPermissions === user.id && (
                      <tr>
                        <td colSpan="4" className="bg-slate-50 p-4 border-b border-slate-200">
                          <div className="flex flex-col gap-4 mx-auto bg-white p-5 rounded-2xl shadow-sm border border-slate-200 max-w-3xl">
                             <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-3">
                               <h4 className="font-bold text-slate-700 text-sm flex items-center gap-2">
                                 <Settings className="w-4 h-4 text-blue-500" /> Configurações de Acesso para {user.nome?.split(' ')[0]}
                               </h4>
                               <button onClick={() => setEditingPermissions(null)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4"/></button>
                             </div>
                             
                             <div className="mb-4 px-2">
                               <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Papel (Role)</label>
                               <select
                                 value={currentRole}
                                 onChange={(e) => setCurrentRole(e.target.value)}
                                 className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm"
                               >
                                 <option value="operacao">Operação (Apenas Ops)</option>
                                 <option value="importer">Importer (Apenas Importador)</option>
                                 <option value="gestao">Gestão (Total exceto Usuários)</option>
                                 <option value="admin">Administrador (Total)</option>
                               </select>
                             </div>

                             <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 px-2">Permissões Específicas</h5>
                             
                             {currentRole === 'admin' ? (
                               <p className="text-sm text-slate-500 italic px-2">Administradores possuem todas as permissões por padrão.</p>
                             ) : (
                               <div className="grid grid-cols-1 md:grid-cols-3 gap-3 px-2 max-h-[300px] overflow-y-auto">
                                 {/* FINANCEIRO */}
                                 <label className="flex items-center gap-3 p-2 rounded-xl border border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors">
                                   <input type="checkbox" className="w-4 h-4 text-blue-600 rounded" checked={currentPerms.includes('detalhe_financeiro')} onChange={() => togglePerm('detalhe_financeiro')} />
                                   <div className="flex flex-col"><span className="text-xs font-bold text-slate-700">Penalidades Detalhadas</span></div>
                                 </label>
                                 <label className="flex items-center gap-3 p-2 rounded-xl border border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors">
                                   <input type="checkbox" className="w-4 h-4 text-blue-600 rounded" checked={currentPerms.includes('gestao_margem')} onChange={() => togglePerm('gestao_margem')} />
                                   <div className="flex flex-col"><span className="text-xs font-bold text-slate-700">Margem de Contribuição</span></div>
                                 </label>

                                 {/* OPERACIONAL */}
                                 <label className="flex items-center gap-3 p-2 rounded-xl border border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors">
                                   <input type="checkbox" className="w-4 h-4 text-blue-600 rounded" checked={currentPerms.includes('gestao_penalidades')} onChange={() => togglePerm('gestao_penalidades')} />
                                   <div className="flex flex-col"><span className="text-xs font-bold text-slate-700">Penalidades (Operação)</span></div>
                                 </label>
                                 <label className="flex items-center gap-3 p-2 rounded-xl border border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors">
                                   <input type="checkbox" className="w-4 h-4 text-blue-600 rounded" checked={currentPerms.includes('gestao_bsc')} onChange={() => togglePerm('gestao_bsc')} />
                                   <div className="flex flex-col"><span className="text-xs font-bold text-slate-700">Visão BSC</span></div>
                                 </label>
                                 <label className="flex items-center gap-3 p-2 rounded-xl border border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors">
                                   <input type="checkbox" className="w-4 h-4 text-blue-600 rounded" checked={currentPerms.includes('comparativo_bsc')} onChange={() => togglePerm('comparativo_bsc')} />
                                   <div className="flex flex-col"><span className="text-xs font-bold text-slate-700">Comparativo BSC</span></div>
                                 </label>
                                 <label className="flex items-center gap-3 p-2 rounded-xl border border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors">
                                   <input type="checkbox" className="w-4 h-4 text-blue-600 rounded" checked={currentPerms.includes('gaps_operacionais')} onChange={() => togglePerm('gaps_operacionais')} />
                                   <div className="flex flex-col"><span className="text-xs font-bold text-slate-700">Gaps Operacionais</span></div>
                                 </label>
                                 <label className="flex items-center gap-3 p-2 rounded-xl border border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors">
                                   <input type="checkbox" className="w-4 h-4 text-blue-600 rounded" checked={currentPerms.includes('painel_treinamentos')} onChange={() => togglePerm('painel_treinamentos')} />
                                   <div className="flex flex-col"><span className="text-xs font-bold text-slate-700">Treinamentos</span></div>
                                 </label>
                                 <label className="flex items-center gap-3 p-2 rounded-xl border border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors">
                                   <input type="checkbox" className="w-4 h-4 text-blue-600 rounded" checked={currentPerms.includes('disponibilidade_frota')} onChange={() => togglePerm('disponibilidade_frota')} />
                                   <div className="flex flex-col"><span className="text-xs font-bold text-slate-700">Disponibilidade de Frota</span></div>
                                 </label>
                                 <label className="flex items-center gap-3 p-2 rounded-xl border border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors">
                                   <input type="checkbox" className="w-4 h-4 text-blue-600 rounded" checked={currentPerms.includes('gestao_motoristas')} onChange={() => togglePerm('gestao_motoristas')} />
                                   <div className="flex flex-col"><span className="text-xs font-bold text-slate-700">Base de Motoristas</span></div>
                                 </label>

                                 {/* PLANEJAMENTO */}
                                 <label className="flex items-center gap-3 p-2 rounded-xl border border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors">
                                   <input type="checkbox" className="w-4 h-4 text-blue-600 rounded" checked={currentPerms.includes('dre_custos')} onChange={() => togglePerm('dre_custos')} />
                                   <div className="flex flex-col"><span className="text-xs font-bold text-slate-700">DRE Custo Pesados</span></div>
                                 </label>
                                 <label className="flex items-center gap-3 p-2 rounded-xl border border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors">
                                   <input type="checkbox" className="w-4 h-4 text-blue-600 rounded" checked={currentPerms.includes('dre_leves')} onChange={() => togglePerm('dre_leves')} />
                                   <div className="flex flex-col"><span className="text-xs font-bold text-slate-700">DRE Custo Leves</span></div>
                                 </label>
                                 <label className="flex items-center gap-3 p-2 rounded-xl border border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors">
                                   <input type="checkbox" className="w-4 h-4 text-blue-600 rounded" checked={currentPerms.includes('dre_viabilidade')} onChange={() => togglePerm('dre_viabilidade')} />
                                   <div className="flex flex-col"><span className="text-xs font-bold text-slate-700">DRE Viabilidade</span></div>
                                 </label>
                                 <label className="flex items-center gap-3 p-2 rounded-xl border border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors">
                                   <input type="checkbox" className="w-4 h-4 text-blue-600 rounded" checked={currentPerms.includes('dre_gerencial')} onChange={() => togglePerm('dre_gerencial')} />
                                   <div className="flex flex-col"><span className="text-xs font-bold text-slate-700">DRE Gerencial</span></div>
                                 </label>

                                 {/* OUTROS */}
                                 <label className="flex items-center gap-3 p-2 rounded-xl border border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors">
                                   <input type="checkbox" className="w-4 h-4 text-blue-600 rounded" checked={currentPerms.includes('importador')} onChange={() => togglePerm('importador')} />
                                   <div className="flex flex-col"><span className="text-xs font-bold text-slate-700">Importador Inteligente</span></div>
                                 </label>
                                 <label className="flex items-center gap-3 p-2 rounded-xl border border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors">
                                   <input type="checkbox" className="w-4 h-4 text-blue-600 rounded" checked={currentPerms.includes('config_filiais')} onChange={() => togglePerm('config_filiais')} />
                                   <div className="flex flex-col"><span className="text-xs font-bold text-slate-700">Config. de Filiais</span></div>
                                 </label>
                                 <label className="flex items-center gap-3 p-2 rounded-xl border border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors">
                                   <input type="checkbox" className="w-4 h-4 text-blue-600 rounded" checked={currentPerms.includes('config_tarifas')} onChange={() => togglePerm('config_tarifas')} />
                                   <div className="flex flex-col"><span className="text-xs font-bold text-slate-700">Config. de Tarifas</span></div>
                                 </label>
                                 <label className="flex items-center gap-3 p-2 rounded-xl border border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors">
                                   <input type="checkbox" className="w-4 h-4 text-blue-600 rounded" checked={currentPerms.includes('explorador_dados')} onChange={() => togglePerm('explorador_dados')} />
                                   <div className="flex flex-col"><span className="text-xs font-bold text-slate-700">Explorador de Dados</span></div>
                                 </label>
                               </div>
                             )}
                             
                             <div className="flex gap-2 justify-end mt-2">
                               <button onClick={() => setEditingPermissions(null)} className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-lg transition-colors">Cancelar</button>
                               <button onClick={() => savePermissions(user.id)} className="px-4 py-2 text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-2"><Save className="w-4 h-4"/> Salvar Configurações</button>
                             </div>
                          </div>
                        </td>
                      </tr>
                    )}
                    </React.Fragment>
                  )) : (
                    <tr>
                      <td colSpan="4" className="px-6 py-8 text-center text-slate-500 font-medium">
                        Nenhum usuário ativo cadastrado.
                      </td>
                    </tr>
                  )
                ) : (
                  pendentes.length > 0 ? pendentes.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-800">{user.nome || '—'}</div>
                        <div className="font-medium text-slate-500">{user.email}</div>
                        {user.telefone && <div className="text-xs text-slate-400 mt-1">{user.telefone}</div>}
                      </td>
                      <td className="px-6 py-4">
                        <select
                          className="w-full max-w-[150px] px-2 py-1 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                          onChange={(e) => user.tempRole = e.target.value}
                          defaultValue="operacao"
                        >
                          <option value="operacao">Operação</option>
                          <option value="importer">Importer</option>
                          <option value="gestao">Gestão</option>
                          <option value="admin">Administrador</option>
                        </select>
                      </td>
                      <td className="px-6 py-4 text-xs font-medium text-slate-400">
                        {new Date(user.created_at).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleApproveUser(user.id, user.email, user.tempRole || 'operacao')}
                          className="px-3 py-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1 shadow-sm"
                          title="Aprovar Acesso"
                        >
                          <CheckCircle2 className="w-4 h-4" /> Aprovar
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.id, user.email)}
                          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Recusar Solicitação"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="4" className="px-6 py-8 text-center text-slate-500 font-medium">
                        Nenhuma solicitação pendente.
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
