import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { UserPlus, Trash2, Shield, User, Loader2, CheckCircle2, Clock } from 'lucide-react';

export default function GestaoUsuarios() {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState('operacao');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('ativos'); // 'ativos' | 'pendentes'

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
    if (!newEmail.trim()) return;
    setIsSubmitting(true);
    setError('');
    
    try {
      const { error } = await supabase
        .from('user_roles')
        .insert([{ email: newEmail.trim().toLowerCase(), role: newRole }]);
        
      if (error) throw error;
      
      setNewEmail('');
      setNewRole('operacao');
      await fetchUsers();
    } catch (err) {
      console.error(err);
      if (err.code === '23505') {
        setError('Este e-mail já possui um papel cadastrado ou pendente.');
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
          Nota: O usuário precisará criar uma conta (Sign Up / Solicitar Acesso) com este mesmo e-mail na tela de login.
        </p>
      </div>

      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 mb-8">
        <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
          <UserPlus className="w-5 h-5 text-emerald-500" />
          Conceder Novo Acesso Manualmente
        </h2>
        <form onSubmit={handleAddUser} className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 w-full">
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
          <div className="w-full md:w-64">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Papel (Role)</label>
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="operacao">Operação (Apenas Ops)</option>
              <option value="importer">Importer (Apenas Importador)</option>
              <option value="admin">Administrador (Total)</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full md:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Adicionar'}
          </button>
        </form>
        {error && <p className="text-red-500 text-sm font-bold mt-4">{error}</p>}
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
                    <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-800">{user.nome || '—'}</div>
                        <div className="font-medium text-slate-500">{user.email}</div>
                        {user.telefone && <div className="text-xs text-slate-400 mt-1">{user.telefone}</div>}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-md text-xs font-bold uppercase tracking-wider
                          ${user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 
                            user.role === 'importer' ? 'bg-emerald-100 text-emerald-700' : 
                            'bg-blue-100 text-blue-700'}`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs font-medium text-slate-400">
                        {new Date(user.created_at).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleDeleteUser(user.id, user.email)}
                          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Remover Acesso"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
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
