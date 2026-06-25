import React, { useState } from 'react';
import { ArrowDown, Check } from 'lucide-react';

export function InverseMultiSelectDropdown({ label, options, excluded, onChange }) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleOption = (opt) => {
    if (excluded.includes(opt)) {
      onChange(excluded.filter(i => i !== opt));
    } else {
      onChange([...excluded, opt]);
    }
  };

  const selectAll = () => onChange([]);
  const deselectAll = () => onChange([...options]);

  const includedCount = options.length - excluded.length;
  let displayText = 'Todas';
  if (includedCount === 0) displayText = 'Nenhuma';
  else if (includedCount === 1) displayText = options.find(o => !excluded.includes(o));
  else if (includedCount < options.length) displayText = `${includedCount} ativas`;

  return (
    <div className={`relative shrink-0 flex items-center ${isOpen ? 'z-50' : 'z-10'}`}>
      <span className="text-[10px] font-bold text-slate-500 uppercase px-2 hidden sm:block">{label}:</span>
      <button onClick={() => setIsOpen(!isOpen)} className={`bg-white border text-sm rounded-xl px-3 py-1.5 outline-none font-bold cursor-pointer shadow-sm flex items-center justify-between min-w-[120px] max-w-[180px] transition-all duration-200 ${isOpen ? 'border-blue-500 ring-2 ring-blue-500/20 text-blue-700' : 'border-slate-300 text-slate-700 hover:border-blue-400'}`}>
        <span className="truncate">{displayText}</span>
        <ArrowDown className={`w-3 h-3 ml-2 shrink-0 transition-transform ${isOpen ? 'rotate-180 text-blue-500' : 'text-slate-400'}`} />
      </button>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)}></div>
          <div className="absolute top-full mt-2 w-64 max-h-72 overflow-y-auto bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-50 p-2 flex flex-col gap-1 animate-in fade-in zoom-in-95 duration-100">
            <div className="flex gap-2 mb-1">
              <button onClick={selectAll} className="flex-1 text-center px-2 py-2 rounded-lg text-xs font-bold transition-colors bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-white">Marcar Todas</button>
              <button onClick={deselectAll} className="flex-1 text-center px-2 py-2 rounded-lg text-xs font-bold transition-colors bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-white">Desmarcar</button>
            </div>
            <div className="h-px bg-slate-700 my-1"></div>
            {options.map((opt, idx) => {
              const isChecked = !excluded.includes(opt);
              return (
                <div key={idx} onClick={() => toggleOption(opt)} className="flex items-center gap-3 px-3 py-2 hover:bg-slate-700 rounded-lg cursor-pointer transition-colors group">
                  <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0 ${isChecked ? 'bg-blue-500 border-blue-500' : 'border-slate-500 bg-slate-800 group-hover:border-slate-400'}`}>
                    {isChecked && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <span className={`text-sm truncate ${isChecked ? 'font-bold text-white' : 'font-medium text-slate-400'}`} title={opt}>{opt}</span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
