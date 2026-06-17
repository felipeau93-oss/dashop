import React, { useState, useEffect } from 'react';
import { Settings, Save, Plus, Trash2, MapPin } from 'lucide-react';

export default function ConfigFiliais({ mapeamentoFiliais, onSave }) {
  const [localMap, setLocalMap] = useState([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (mapeamentoFiliais && mapeamentoFiliais.length > 0) {
      setLocalMap(mapeamentoFiliais);
    } else {
      // Seed data if empty
      setLocalMap([
        { filial: 'SRS1', regional: '1', supervisor: 'Janusa' },
        { filial: 'SRS8', regional: '1', supervisor: 'Janusa' },
        { filial: 'SRS9', regional: '1', supervisor: 'Janusa' },
        { filial: 'SRS2', regional: '2', supervisor: 'Lucas' },
        { filial: 'SRS7', regional: '2', supervisor: 'Lucas' },
        { filial: 'ERS16', regional: '1', supervisor: 'Janusa' },
        { filial: 'SRS10', regional: '1', supervisor: 'Janusa' },
        { filial: 'ERS1', regional: '2', supervisor: 'Lucas' },
        { filial: 'ERS10', regional: '2', supervisor: 'Lucas' },
        { filial: 'ERS2', regional: '2', supervisor: 'Lucas' },
        { filial: 'ERS8', regional: '2', supervisor: 'Lucas' },
        { filial: 'ERS7', regional: '2', supervisor: 'Lucas' },
        { filial: 'SSC4', regional: '3', supervisor: 'Vivian' },
        { filial: 'SRS3', regional: '3', supervisor: 'Vivian' },
        { filial: 'ERS14', regional: '3', supervisor: 'Vivian' },
        { filial: 'ERS9', regional: '3', supervisor: 'Vivian' },
        { filial: 'ESC4', regional: '3', supervisor: 'Vivian' },
        { filial: 'ESC5', regional: '3', supervisor: 'Vivian' },
        { filial: 'ESC9', regional: '3', supervisor: 'Vivian' },
        { filial: 'SPR1', regional: '4', supervisor: 'Johnatan' },
        { filial: 'SPR10', regional: '4', supervisor: 'Johnatan' },
        { filial: 'SPR11', regional: '4', supervisor: 'Johnatan' },
        { filial: 'SPR8', regional: '4', supervisor: 'Johnatan' },
        { filial: 'SSC1', regional: '4', supervisor: 'Johnatan' },
        { filial: 'SSC2', regional: '5', supervisor: 'Neemias' },
        { filial: 'SSC8', regional: '5', supervisor: 'Neemias' },
        { filial: 'SSC9', regional: '5', supervisor: 'Neemias' }
      ]);
    }
  }, [mapeamentoFiliais]);

  const handleUpdate = (index, field, value) => {
    const newMap = [...localMap];
    newMap[index][field] = value;
    setLocalMap(newMap);
  };

  const handleAdd = () => {
    setLocalMap([{ filial: '', regional: '', supervisor: '' }, ...localMap]);
  };

  const handleDelete = (index) => {
    const newMap = [...localMap];
    newMap.splice(index, 1);
    setLocalMap(newMap);
  };

  const handleSave = async () => {
    setIsSaving(true);
    await onSave(localMap.filter(d => d.filial.trim() !== ''));
    setIsSaving(false);
  };

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col gap-6">
      <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-4">
            <div className="bg-indigo-100 text-indigo-600 p-3 rounded-2xl">
              <Settings className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-800">Estrutura de Filiais</h1>
              <p className="text-slate-500 font-medium">Mapeamento central de Regionais e Supervisores para as Filiais.</p>
            </div>
          </div>
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all shadow-md disabled:opacity-50"
          >
            <Save className="w-5 h-5" />
            {isSaving ? 'Salvando...' : 'Salvar Estrutura'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-bold text-slate-700 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-indigo-500" />
            Tabela de Mapeamento
          </h2>
          <button onClick={handleAdd} className="bg-emerald-50 text-emerald-600 hover:bg-emerald-100 px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-colors">
            <Plus className="w-4 h-4" /> Nova Filial
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-sm font-bold uppercase tracking-wider">
                <th className="p-4 rounded-tl-xl">Filial (Operação)</th>
                <th className="p-4">Regional</th>
                <th className="p-4">Supervisor</th>
                <th className="p-4 rounded-tr-xl text-right">Ação</th>
              </tr>
            </thead>
            <tbody>
              {localMap.map((item, idx) => (
                <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="p-3">
                    <input 
                      type="text" 
                      value={item.filial} 
                      onChange={(e) => handleUpdate(idx, 'filial', e.target.value.toUpperCase())}
                      placeholder="Ex: SSC4"
                      className="w-full bg-transparent border-b border-dashed border-slate-300 focus:border-indigo-500 outline-none font-bold text-slate-800 py-1"
                    />
                  </td>
                  <td className="p-3">
                    <input 
                      type="text" 
                      value={item.regional} 
                      onChange={(e) => handleUpdate(idx, 'regional', e.target.value)}
                      placeholder="Ex: 3"
                      className="w-full bg-transparent border-b border-dashed border-slate-300 focus:border-indigo-500 outline-none font-medium text-slate-700 py-1"
                    />
                  </td>
                  <td className="p-3">
                    <input 
                      type="text" 
                      value={item.supervisor} 
                      onChange={(e) => handleUpdate(idx, 'supervisor', e.target.value)}
                      placeholder="Nome do Supervisor"
                      className="w-full bg-transparent border-b border-dashed border-slate-300 focus:border-indigo-500 outline-none font-medium text-slate-700 py-1"
                    />
                  </td>
                  <td className="p-3 text-right">
                    <button onClick={() => handleDelete(idx)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
              {localMap.length === 0 && (
                <tr>
                  <td colSpan="4" className="text-center p-8 text-slate-400">Nenhum mapeamento cadastrado.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
