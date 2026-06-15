const fs = require('fs');

let content = fs.readFileSync('src/Simulador.jsx', 'utf8');

// 1. Add Firebase imports
if (!content.includes('import { db }')) {
  content = content.replace(
    "import React, { useState, useMemo, useEffect, useCallback } from 'react';",
    "import React, { useState, useMemo, useEffect, useCallback } from 'react';\nimport { db } from './firebase';\nimport { collection, addDoc, getDocs, deleteDoc, doc } from 'firebase/firestore';"
  );
}

// 2. Add History State right after "const [cenarios, setCenarios] = useState([]);"
const historyStateStr = `
  const [cenarios, setCenarios] = useState([]);

  // Estados de Histórico
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyData, setHistoryData] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const fetchHistory = async () => {
    try {
      setIsLoadingHistory(true);
      const snapshot = await getDocs(collection(db, 'simulacoes_realizado'));
      const list = [];
      snapshot.forEach(doc => {
        list.push({ id: doc.id, ...doc.data() });
      });
      list.sort((a, b) => b.dataSalva - a.dataSalva);
      setHistoryData(list);
    } catch(err) {
      console.error("Erro ao ler historico:", err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleSaveSimulacao = async () => {
    const nome = prompt("Digite um nome para salvar esta simulação:");
    if (!nome) return;
    
    try {
      const payload = {
        nome,
        dataSalva: Date.now(),
        quinzena,
        filial,
        percentualImposto,
        agregadoExcluido,
        modoFaturamento,
        cenarios,
        veiculosAdicionais,
        visaoDiaria,
        diasOperacao
      };
      await addDoc(collection(db, 'simulacoes_realizado'), payload);
      alert("Simulação salva com sucesso!");
    } catch(err) {
      console.error(err);
      alert("Erro ao salvar simulação.");
    }
  };

  const handleLoadSimulacao = (item) => {
    setQuinzena(item.quinzena || '');
    setFilial(item.filial || 'SPR1');
    setPercentualImposto(item.percentualImposto ?? 6.56);
    setAgregadoExcluido(item.agregadoExcluido || '');
    setModoFaturamento(item.modoFaturamento || 'recebido');
    setCenarios(item.cenarios || []);
    setVeiculosAdicionais(item.veiculosAdicionais || '');
    setVisaoDiaria(item.visaoDiaria || false);
    setDiasOperacao(item.diasOperacao || 15);
    setShowHistoryModal(false);
  };

  const handleDeleteSimulacao = async (id) => {
    if(!window.confirm("Deseja apagar esta simulação?")) return;
    try {
      await deleteDoc(doc(db, 'simulacoes_realizado', id));
      setHistoryData(prev => prev.filter(i => i.id !== id));
    } catch(err) {
      console.error(err);
      alert("Erro ao apagar");
    }
  };
`;

content = content.replace("const [cenarios, setCenarios] = useState([]);", historyStateStr.trim());

// 3. Update the Header buttons
const headerStart = `<h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Calculator className="w-7 h-7 text-indigo-600" />
              Simulador Realizado
            </h1>
          </div>`;

const newHeaderStart = `<h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Calculator className="w-7 h-7 text-indigo-600" />
              Simulador Realizado
            </h1>
          </div>
          <div className="flex gap-2 w-full md:w-auto mt-4 md:mt-0">
            <button 
              onClick={() => { fetchHistory(); setShowHistoryModal(true); }}
              className="flex-1 md:flex-none bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50 hover:border-indigo-300 px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              <History className="w-4 h-4" /> Histórico
            </button>
            <button 
              onClick={handleSaveSimulacao}
              className="flex-1 md:flex-none bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              <Save className="w-4 h-4" /> Salvar Cenário
            </button>
          </div>`;

content = content.replace(headerStart, newHeaderStart);

// 4. Add the Modal before the closing div
const modalStr = `
      {/* MODAL DE HISTÓRICO */}
      {showHistoryModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <History className="w-5 h-5 text-indigo-600" />
                Histórico de Simulações (Realizado)
              </h3>
              <button 
                onClick={() => setShowHistoryModal(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                ✕
              </button>
            </div>
            
            <div className="p-5 overflow-y-auto flex-1">
              {isLoadingHistory ? (
                <div className="flex flex-col items-center justify-center py-10">
                  <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
                  <p className="text-slate-500 text-sm">Carregando histórico...</p>
                </div>
              ) : historyData.length === 0 ? (
                <div className="text-center py-10">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <History className="w-8 h-8 text-slate-400" />
                  </div>
                  <p className="text-slate-500 font-medium">Nenhuma simulação salva ainda.</p>
                  <p className="text-slate-400 text-sm mt-1">Crie um cenário e clique em "Salvar Cenário" para guardar aqui.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {historyData.map(item => (
                    <div key={item.id} className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between hover:border-indigo-200 hover:shadow-sm transition-all group">
                      <div>
                        <h4 className="font-bold text-slate-800 mb-1">{item.nome}</h4>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                          <span className="flex items-center gap-1"><CalendarClock className="w-3 h-3" /> {new Date(item.dataSalva).toLocaleString()}</span>
                          <span className="flex items-center gap-1 font-medium text-slate-600">QZN: {item.quinzena} | {item.filial}</span>
                          <span className="flex items-center gap-1 bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded font-medium">{item.cenarios?.length || 0} cenários</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => handleLoadSimulacao(item)}
                          className="bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                        >
                          Carregar
                        </button>
                        <button 
                          onClick={() => handleDeleteSimulacao(item.id)}
                          className="text-slate-400 hover:text-red-500 bg-slate-50 hover:bg-red-50 p-1.5 rounded-lg transition-colors"
                          title="Apagar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
`;

content = content.replace("</div>\n  );\n}\n", modalStr);
content = content.replace("</div>\r\n  );\r\n}\r\n", modalStr);


fs.writeFileSync('src/Simulador.jsx', content, 'utf8');
console.log('Simulador history injected.');
