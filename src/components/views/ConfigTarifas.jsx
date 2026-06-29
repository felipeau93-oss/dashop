import React, { useState, useEffect } from 'react';
import { Settings, Save, Plus, MapPin, FileEdit, Trash2 } from 'lucide-react';
import { tarifas as defaultTarifas } from '../../data/tarifas'; // Fallback seed

export default function ConfigTarifas({ tarifasAtuais = [], onSave }) {
  const [localMap, setLocalMap] = useState([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let currentMap = [];
    if (tarifasAtuais && tarifasAtuais.length > 0) {
      currentMap = [...tarifasAtuais];
    } else {
      // Seed with default if empty
      currentMap = [...defaultTarifas];
    }
    setLocalMap(currentMap);
  }, [tarifasAtuais]);

  const handleUpdate = (index, field, value) => {
    const newMap = [...localMap];
    newMap[index][field] = field === 'tarifa' ? Number(value) || 0 : value;
    setLocalMap(newMap);
  };

  const handleAdd = () => {
    setLocalMap([{ uf: 'Todos', categoria: '', range: '', diaSem: 'N/A', ciclo: 'N/A', tarifa: 0 }, ...localMap]);
  };

  const handleDelete = (index) => {
    const newMap = [...localMap];
    newMap.splice(index, 1);
    setLocalMap(newMap);
  };

  const handleSave = async () => {
    setIsSaving(true);
    await onSave(localMap.filter(d => d.categoria.trim() !== ''));
    setIsSaving(false);
  };

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col gap-6">
      <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-4">
            <div className="bg-emerald-100 text-emerald-600 p-3 rounded-2xl">
              <FileEdit className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-800">Tabela de Tarifas (Simulador)</h1>
              <p className="text-slate-500 font-medium">Configuração dinâmica da receita base por categoria e KM para o Simulador.</p>
            </div>
          </div>
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all shadow-md disabled:opacity-50"
          >
            <Save className="w-5 h-5" />
            {isSaving ? 'Salvando...' : 'Salvar Tarifas'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200">
        <div className="flex justify-between items-center mb-6">
          <div className="flex flex-col">
            <h2 className="text-lg font-bold text-slate-700 flex items-center gap-2">
              <Settings className="w-5 h-5 text-emerald-500" />
              Gestão de Tarifas
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Altere os valores e adicione novas categorias. Esses valores definem a Receita no simulador DRE.
            </p>
          </div>
          <button onClick={handleAdd} className="bg-blue-50 text-blue-600 hover:bg-blue-100 px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-colors">
            <Plus className="w-4 h-4" /> Nova Tarifa
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-sm font-bold uppercase tracking-wider">
                <th className="p-4 rounded-tl-xl w-24">UF</th>
                <th className="p-4">Categoria</th>
                <th className="p-4 w-32">Range (KM)</th>
                <th className="p-4 w-32">Dia Sem.</th>
                <th className="p-4 w-32">Ciclo</th>
                <th className="p-4 w-40">Tarifa (R$)</th>
                <th className="p-4 rounded-tr-xl text-right w-20">Ação</th>
              </tr>
            </thead>
            <tbody>
              {localMap.map((item, idx) => (
                <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="p-3">
                    <input 
                      type="text" 
                      value={item.uf} 
                      onChange={(e) => handleUpdate(idx, 'uf', e.target.value)}
                      placeholder="Todos"
                      className="w-full bg-transparent border-b border-dashed border-slate-300 focus:border-emerald-500 outline-none font-bold text-slate-800 py-1"
                    />
                  </td>
                  <td className="p-3">
                    <input 
                      type="text" 
                      value={item.categoria} 
                      onChange={(e) => handleUpdate(idx, 'categoria', e.target.value)}
                      placeholder="Ex: Van TKS"
                      className="w-full bg-transparent border-b border-dashed border-slate-300 focus:border-emerald-500 outline-none font-bold text-slate-800 py-1"
                    />
                  </td>
                  <td className="p-3">
                    <input 
                      type="text" 
                      value={item.range} 
                      onChange={(e) => handleUpdate(idx, 'range', e.target.value)}
                      placeholder="1/100"
                      className="w-full bg-transparent border-b border-dashed border-slate-300 focus:border-emerald-500 outline-none font-medium text-slate-700 py-1"
                    />
                  </td>
                  <td className="p-3">
                    <input 
                      type="text" 
                      value={item.diaSem} 
                      onChange={(e) => handleUpdate(idx, 'diaSem', e.target.value)}
                      placeholder="N/A"
                      className="w-full bg-transparent border-b border-dashed border-slate-300 focus:border-emerald-500 outline-none font-medium text-slate-700 py-1"
                    />
                  </td>
                  <td className="p-3">
                    <input 
                      type="text" 
                      value={item.ciclo} 
                      onChange={(e) => handleUpdate(idx, 'ciclo', e.target.value)}
                      placeholder="N/A"
                      className="w-full bg-transparent border-b border-dashed border-slate-300 focus:border-emerald-500 outline-none font-medium text-slate-700 py-1"
                    />
                  </td>
                  <td className="p-3">
                    <input 
                      type="number" 
                      value={item.tarifa} 
                      onChange={(e) => handleUpdate(idx, 'tarifa', e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-transparent border-b border-dashed border-slate-300 focus:border-emerald-500 outline-none font-bold text-emerald-700 py-1"
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
                  <td colSpan="7" className="text-center p-8 text-slate-400">Nenhuma tarifa configurada.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
