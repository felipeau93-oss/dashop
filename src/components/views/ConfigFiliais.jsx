import React, { useState, useEffect } from 'react';
import { Settings, Save, Plus, MapPin, Check, Edit2, Trash2 } from 'lucide-react';

export default function ConfigFiliais({ mapeamentoFiliais, rawData = [], rawFaturamentoData = [], rawOperacionalData = [], onSave }) {
  const [localMap, setLocalMap] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [autoAddedCount, setAutoAddedCount] = useState(0);
  
  const [formData, setFormData] = useState({ index: null, filial: '', regional: '', supervisor: '' });

  useEffect(() => {
    let currentMap = [];
    if (mapeamentoFiliais && mapeamentoFiliais.length > 0) {
      currentMap = [...mapeamentoFiliais];
    } else {
      // Seed data if empty
      currentMap = [
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
      ];
    }

    // Varredura de filiais órfãs nos dados importados
    const uniqueFiliais = new Set();
    const normalize = (f) => String(f).trim().toUpperCase();

    [...rawData, ...rawFaturamentoData, ...rawOperacionalData].forEach(d => {
      if (d.filial && String(d.filial).trim() !== '' && normalize(d.filial) !== 'N/A') {
        uniqueFiliais.add(normalize(d.filial));
      }
    });

    const currentFiliais = new Set(currentMap.map(m => normalize(m.filial)));

    let addedCount = 0;
    const newEntries = [];

    uniqueFiliais.forEach(f => {
      if (!currentFiliais.has(f)) {
        newEntries.push({ filial: f, regional: '', supervisor: '' });
        addedCount++;
      }
    });

    if (addedCount > 0) {
      currentMap = [...newEntries, ...currentMap];
      setAutoAddedCount(addedCount);
    }

    setLocalMap(currentMap);
  }, [mapeamentoFiliais, rawData, rawFaturamentoData, rawOperacionalData]);

  const handleSelectChange = (e) => {
    const val = e.target.value;
    if (val === 'NEW') {
      setFormData({ index: null, filial: '', regional: '', supervisor: '' });
    } else {
      const idx = parseInt(val, 10);
      setFormData({ index: idx, ...localMap[idx] });
    }
  };

  const handleFormChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleApplyForm = async () => {
    const newMap = [...localMap];
    if (formData.index !== null) {
      newMap[formData.index] = { filial: formData.filial, regional: formData.regional, supervisor: formData.supervisor };
    } else {
      if (formData.filial.trim() !== '') {
        newMap.unshift({ filial: formData.filial, regional: formData.regional, supervisor: formData.supervisor });
        setFormData({ index: null, filial: '', regional: '', supervisor: '' });
      }
    }
    setLocalMap(newMap);
    setIsSaving(true);
    await onSave(newMap.filter(d => d.filial.trim() !== ''));
    setIsSaving(false);
  };

  const handleDeleteForm = async () => {
    if (formData.index !== null) {
      const newMap = [...localMap];
      newMap.splice(formData.index, 1);
      setLocalMap(newMap);
      setFormData({ index: null, filial: '', regional: '', supervisor: '' });
      setIsSaving(true);
      await onSave(newMap.filter(d => d.filial.trim() !== ''));
      setIsSaving(false);
    }
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
          <div className="flex flex-col">
            <h2 className="text-lg font-bold text-slate-700 flex items-center gap-2">
              <Edit2 className="w-5 h-5 text-indigo-500" />
              Editar ou Adicionar Filial
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Selecione uma filial abaixo para editá-la ou crie uma nova.
            </p>
          </div>
        </div>

        {autoAddedCount > 0 && (
          <div className="mb-6 p-4 bg-indigo-50 border border-indigo-200 rounded-xl flex items-start gap-3">
            <div className="text-indigo-600 font-medium text-sm">
              <span className="font-bold">Varredura Automática:</span> Detectamos <span className="font-bold">{autoAddedCount}</span> {autoAddedCount === 1 ? 'nova filial' : 'novas filiais'} nos dados importados que ainda não possuíam Regional/Supervisor mapeados. {autoAddedCount === 1 ? 'Ela foi adicionada' : 'Elas foram adicionadas'} na lista para que você preencha.
            </div>
          </div>
        )}

        <div className="flex flex-col md:flex-row gap-4 items-end mb-8 bg-slate-50 p-6 rounded-2xl border border-slate-100">
          <div className="w-full md:w-1/4">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Selecionar</label>
            <select 
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 focus:border-indigo-500 outline-none font-bold text-slate-800"
              value={formData.index === null ? 'NEW' : formData.index}
              onChange={handleSelectChange}
            >
              <option value="NEW">+ Nova Filial...</option>
              {localMap.map((m, idx) => (
                <option key={idx} value={idx}>{m.filial || '(Sem Nome)'}</option>
              ))}
            </select>
          </div>
          <div className="w-full md:w-1/4">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Filial (Operação)</label>
            <input 
              type="text" 
              value={formData.filial}
              onChange={(e) => handleFormChange('filial', e.target.value.toUpperCase())}
              placeholder="Ex: SSC4"
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 focus:border-indigo-500 outline-none font-bold text-slate-800"
            />
          </div>
          <div className="w-full md:w-1/4">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Regional</label>
            <input 
              type="text" 
              value={formData.regional}
              onChange={(e) => handleFormChange('regional', e.target.value)}
              placeholder="Ex: 3"
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 focus:border-indigo-500 outline-none font-medium text-slate-700"
            />
          </div>
          <div className="w-full md:w-1/4">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Supervisor</label>
            <input 
              type="text" 
              value={formData.supervisor}
              onChange={(e) => handleFormChange('supervisor', e.target.value)}
              placeholder="Nome"
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 focus:border-indigo-500 outline-none font-medium text-slate-700"
            />
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <button onClick={handleApplyForm} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors flex-1 md:flex-none">
              {formData.index === null ? <Plus className="w-4 h-4" /> : <Check className="w-4 h-4" />}
              {formData.index === null ? 'Adicionar' : 'Atualizar'}
            </button>
            {formData.index !== null && (
              <button onClick={handleDeleteForm} className="bg-red-50 text-red-600 hover:bg-red-100 px-4 py-2.5 rounded-xl font-bold flex items-center justify-center transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-col">
          <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2 mb-3">
            <MapPin className="w-4 h-4 text-slate-400" />
            Visão Geral das Filiais Cadastradas
          </h2>
          <div className="overflow-x-auto rounded-xl border border-slate-200 max-h-[400px]">
            <table className="w-full text-left border-collapse text-sm">
              <thead className="bg-slate-50 sticky top-0">
                <tr className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-2 px-4 border-b border-slate-200">Filial</th>
                  <th className="py-2 px-4 border-b border-slate-200">Regional</th>
                  <th className="py-2 px-4 border-b border-slate-200">Supervisor</th>
                </tr>
              </thead>
              <tbody>
                {localMap.map((item, idx) => (
                  <tr key={idx} className={`border-b border-slate-100 transition-colors ${formData.index === idx ? 'bg-indigo-50' : 'hover:bg-slate-50'}`}>
                    <td className="py-1.5 px-4 font-bold text-slate-700">{item.filial || '-'}</td>
                    <td className="py-1.5 px-4 font-medium text-slate-600">{item.regional || '-'}</td>
                    <td className="py-1.5 px-4 font-medium text-slate-600">{item.supervisor || '-'}</td>
                  </tr>
                ))}
                {localMap.length === 0 && (
                  <tr>
                    <td colSpan="3" className="text-center py-4 text-slate-400 text-xs">Nenhum mapeamento cadastrado.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
