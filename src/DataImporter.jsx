import React, { useState } from 'react';
import Papa from 'papaparse';
import { UploadCloud, FileSpreadsheet, CheckCircle2, AlertTriangle, ArrowRight, Loader2, Database } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function DataImporter({ onImportComplete, rawFaturamentoData = [], rawOperacionalData = [], mapeamentoFiliais = [] }) {
  const [billingFile, setBillingFile] = useState(null);
  const [baseFile, setBaseFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [logs, setLogs] = useState([]);
  const [preview, setPreview] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const addLog = (msg, type = 'info') => {
    setLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), msg, type }]);
  };

  const handleProcess = () => {
    if (!billingFile || !baseFile) return;
    setIsProcessing(true);
    setLogs([]);
    setPreview(null);
    addLog('Iniciando processamento...');

    const processBaseFile = (dataArray) => {
      addLog(`Base Operacional lida: ${dataArray.length} linhas.`);
      
      // Find Rota and XPT columns
      let headerRowIdx = -1;
      let rotaColIdx = -1;
      let xptColIdx = -1;
      let saldoColIdx = -1;
      let entreguesColIdx = -1;
      let insucessosColIdx = -1;

      for (let i = 0; i < Math.min(15, dataArray.length); i++) {
        const row = dataArray[i];
        if (!row) continue;
        const cRota = row.findIndex(c => String(c).toUpperCase().includes('ROTA'));
        const cXpt = row.findIndex(c => String(c).toUpperCase() === 'XPT' || String(c).toUpperCase() === 'FILIAL');
        const cSaldo = row.findIndex(c => String(c).toUpperCase() === 'SALDO');
        const cEntregues = row.findIndex(c => String(c).toUpperCase() === 'ENTREGUES');
        const cInsucessos = row.findIndex(c => String(c).toUpperCase() === 'INSUCESSOS');

        if (cRota !== -1 && cXpt !== -1) {
          headerRowIdx = i;
          rotaColIdx = cRota;
          xptColIdx = cXpt;
          saldoColIdx = cSaldo;
          entreguesColIdx = cEntregues;
          insucessosColIdx = cInsucessos;
          break;
        }
      }

      const mapRotaFilial = {};
      const configMap = {};
      mapeamentoFiliais.forEach(m => configMap[String(m.filial).toUpperCase()] = m);

      // 1. Build Fallback Map from Historical Firebase Data
      let fallbackCount = 0;
      const buildFallbackMap = () => {
        const populate = (d) => {
          if (d.id_rota && d.filial && d.filial !== 'N/A') {
            const fKey = String(d.filial).toUpperCase();
            const config = configMap[fKey] || {};
            mapRotaFilial[String(d.id_rota).trim()] = {
                filial: String(d.filial).trim(),
                regional: config.regional || 'N/A',
                supervisor: config.supervisor || 'N/A'
            };
            fallbackCount++;
          }
        };
        rawFaturamentoData.forEach(populate);
        rawOperacionalData.forEach(populate);
      };
      buildFallbackMap();
      if (fallbackCount > 0) {
        addLog(`Pré-carregado histórico do Firebase como fallback (Rotas conhecidas).`, 'info');
      }

      const newOperacionalData = [];
      let insucessosHeaders = [];

      // 2. Override with Uploaded Spreadsheet Data
      if (headerRowIdx !== -1) {
        if (insucessosColIdx !== -1) {
           const row = dataArray[headerRowIdx];
           for (let j = insucessosColIdx + 1; j < row.length; j++) {
              if (row[j] && String(row[j]).trim() !== '') {
                 insucessosHeaders.push({ index: j, name: String(row[j]).trim() });
              }
           }
        }

        for (let i = headerRowIdx + 1; i < dataArray.length; i++) {
          const row = dataArray[i];
          if (!row) continue;
          const rota = String(row[rotaColIdx] || '').trim();
          const filial = String(row[xptColIdx] || '').trim();
          
          if (rota && filial && filial !== 'N/A') {
              const fKey = filial.toUpperCase();
              const config = configMap[fKey] || {};
              const regional = config.regional || 'N/A';
              const supervisor = config.supervisor || 'N/A';

              mapRotaFilial[rota] = { filial, regional, supervisor };

              const saldo = saldoColIdx !== -1 ? (parseFloat(row[saldoColIdx]) || 0) : 0;
              const entregues = entreguesColIdx !== -1 ? (parseFloat(row[entreguesColIdx]) || 0) : 0;
              const insucessosDetalhados = {};
              insucessosHeaders.forEach(h => {
                 const v = parseFloat(row[h.index]) || 0;
                 if (v > 0) insucessosDetalhados[h.name] = v;
              });

              const somaIns = Object.values(insucessosDetalhados).reduce((a,b)=>a+b, 0);
              if (saldo > 0 || entregues > 0 || somaIns > 0) {
                 newOperacionalData.push({
                    id_rota: rota,
                    filial: filial,
                    regional: regional,
                    supervisor: supervisor,
                    saldo,
                    entregues,
                    insucessosDetalhados,
                    dia_semana: 'N/A',
                    cluster: 'N/A',
                    motorista: 'N/A'
                 });
              }
          }
        }
        addLog(`Mapa de Filiais (PROCV) e Volumetria (Saldo/Entregues) extraídos da planilha importada!`, 'success');
      } else {
        addLog(`Aviso: Não encontrou colunas ROTA e XPT na Base Operacional. Usando apenas histórico do Firebase.`, 'warn');
      }

      // 3. Parse Billing
      Papa.parse(billingFile, {
        skipEmptyLines: true,
        complete: (billingResults) => {
          processBilling(billingResults.data, mapRotaFilial, newOperacionalData);
        },
        error: (err) => {
          addLog(`Erro ao ler Billing: ${err.message}`, 'error');
          setIsProcessing(false);
        }
      });
    };

    // Determina se Base é CSV ou Excel
    const ext = baseFile.name.split('.').pop().toLowerCase();
    if (ext === 'csv') {
      Papa.parse(baseFile, {
        skipEmptyLines: true,
        complete: (baseResults) => processBaseFile(baseResults.data),
        error: (err) => {
          addLog(`Erro ao ler Base Operacional: ${err.message}`, 'error');
          setIsProcessing(false);
        }
      });
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          processBaseFile(jsonData);
        } catch (err) {
          addLog(`Erro ao ler arquivo Excel: ${err.message}`, 'error');
          setIsProcessing(false);
        }
      };
      reader.readAsArrayBuffer(baseFile);
    }
  };

  const processBilling = (data, mapRotaFilial, newOperacionalData) => {
    addLog(`Billing lido: ${data.length} linhas brutas.`);

    // Encontrar cabeçalho e quinzena
    let headerIdx = -1;
    let quinzenaStr = 'N/A';
    
    // Tenta achar quinzena (geralmente linha 9, col 5)
    for (let i = 0; i < Math.min(20, data.length); i++) {
      const row = data[i];
      if (row.some(c => String(c).toUpperCase().includes('PERÍODO') || String(c).toUpperCase().includes('PERIODO'))) {
         // O valor costuma estar abaixo
         if (data[i+1] && data[i+1].length > 5) {
            quinzenaStr = String(data[i+1][5] || data[i+1][4] || '').trim(); // Ex: 202606Q1
         }
      }
      
      const descIdx = row.findIndex(c => String(c).toUpperCase() === 'DESCRIÇÃO' || String(c).toUpperCase() === 'DESCRICAO');
      if (descIdx !== -1) {
        headerIdx = i;
        break;
      }
    }

    if (headerIdx === -1) {
      addLog(`Erro: Coluna 'Descrição' não encontrada no Billing.`, 'error');
      setIsProcessing(false);
      return;
    }

    addLog(`Quinzena identificada: ${quinzenaStr}`);

    if (newOperacionalData && newOperacionalData.length > 0) {
      newOperacionalData.forEach(d => {
        d.quinzena = quinzenaStr;
      });
    }

    let isPenaltiesSection = false;
    const mapDiarias = {};
    const arrayPenalidades = [];

    let linhasApagadas = 0;
    let acentosRemovidos = 0;

    for (let i = headerIdx + 1; i < data.length; i++) {
      const row = data[i];
      const rowText = row.join('').trim().toLowerCase();

      // Transição de Diárias para Penalidades
      if (rowText.includes('visited addresses')) {
        isPenaltiesSection = true;
        continue;
      }

      if (rowText === '' || rowText.includes('total') || rowText.includes('subtotal')) {
        linhasApagadas++;
        continue;
      }

      // Colunas do Billing (baseado no Script original)
      // 0: Descrição, 1: ID da rota, 2: Data de início, 3: Data de término, 4: Placa, 5: Motorista, 6: Qtd, 7: Preço Un., 8: Total
      let descricaoOrig = String(row[0] || '');
      let idRota = String(row[1] || '').trim();
      let dataInicio = String(row[2] || '').trim();
      let dataTermino = String(row[3] || '').trim();
      let placa = String(row[4] || '').trim();
      let motorista = String(row[5] || '').trim();
      let precoStr = String(row[7] || row[8] || '0').toUpperCase().replace('R$', '').trim();
      if (precoStr.includes('.') && precoStr.includes(',')) {
          let lastDot = precoStr.lastIndexOf('.');
          let lastComma = precoStr.lastIndexOf(',');
          if (lastComma > lastDot) {
              precoStr = precoStr.replace(/\./g, '').replace(',', '.');
          } else {
              precoStr = precoStr.replace(/,/g, '');
          }
      } else if (precoStr.includes(',')) {
          precoStr = precoStr.replace(',', '.');
      }
      let valor = parseFloat(precoStr) || 0;

      // Limpeza de Acentos e Padronização
      let descLimpa = descricaoOrig.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      if (descricaoOrig !== descLimpa) acentosRemovidos++;
      
      descLimpa = descLimpa.replace(/Ve[ií]culo de Passeio/gi, "Passeio");
      descLimpa = descLimpa.replace(/Utilit[aá]rios/gi, "Utilitario");

      const routeMapObj = mapRotaFilial[idRota] || { filial: 'N/A', regional: 'N/A', supervisor: 'N/A' };
      const filialProc = routeMapObj.filial;
      const regionalProc = routeMapObj.regional;
      const supervisorProc = routeMapObj.supervisor;

      if (!isPenaltiesSection) {
        // --- LÓGICA DE DIÁRIAS ---
        let textoUpper = descLimpa.toUpperCase();
        let isAddStops = textoUpper.includes("ADDSTOPS");

        if (!idRota) idRota = `sem_rota_${i}`; // fallback if empty

        if (!mapDiarias[idRota]) {
          mapDiarias[idRota] = {
            quinzena: quinzenaStr,
            filial: filialProc,
            regional: regionalProc,
            supervisor: supervisorProc,
            descricao_original: descLimpa,
            id_rota: idRota,
            data_inicio: dataInicio,
            placa: placa,
            motorista: motorista,
            faturamento: 0,
            faturamento_paradas: 0,
            svc: "", tipo: "", ciclo: "", range_km: "", dia_semana: "", categoria: ""
          };
        }

        if (isAddStops) {
            mapDiarias[idRota].faturamento_paradas += valor;
        } else {
            mapDiarias[idRota].faturamento += valor;
            
            // Só sobrescreve os metadados se for a linha principal
            let categoria = descLimpa.split(/ - SVC:/i)[0].trim();
            let matchSvc = descLimpa.match(/SVC:\s*([A-Z0-9]+)/i);
            let svc = matchSvc ? matchSvc[1] : "";
            let tipoDD = textoUpper.includes("AMBULANCE") ? "AMBULANCE" : "NORMAL";
            let ciclo = textoUpper.includes("PART TIME") ? "PM" : "AM";
            let matchRange = descLimpa.match(/KMs RANGE:\s*([\d\/]+)/i);
            let range = matchRange ? matchRange[1] : "1/100";
            let diaSem = textoUpper.includes("HOLIDAY") ? "Dom-Fer" : "Seg-Sab";

            mapDiarias[idRota].descricao_original = descLimpa;
            mapDiarias[idRota].categoria = categoria;
            mapDiarias[idRota].svc = svc;
            mapDiarias[idRota].tipo = tipoDD;
            mapDiarias[idRota].ciclo = ciclo;
            mapDiarias[idRota].range_km = range;
            mapDiarias[idRota].dia_semana = diaSem;
            if (dataInicio) mapDiarias[idRota].data_inicio = dataInicio;
            if (placa) mapDiarias[idRota].placa = placa;
            if (motorista) mapDiarias[idRota].motorista = motorista;
        }

      } else {
        // --- LÓGICA DE PENALIDADES ---
        let idPacote = "";
        let tipoPenalidade = "Outros";
        const dLower = descLimpa.toLowerCase();

        if (dLower.includes("pnr")) {
          tipoPenalidade = "PNRs";
        } else if (dLower.includes("lost package") || dLower.includes("extravio")) {
          tipoPenalidade = "Lost Packages";
        } else if (dLower.includes("vehicle daily not visited") || dLower.includes("falta")) {
          tipoPenalidade = "Not Visited";
        }

        if (tipoPenalidade !== "Not Visited") {
          let matchID = descLimpa.match(/(\d+)\s*$/);
          idPacote = matchID ? matchID[1] : "";
        }

        // Para evitar lixo, só insere se o valor for negativo (se o CSV trouxer negativo) ou se força ser penalidade
        // No dashboard original, valor de penalidade é positivo, descontado na hora do cálculo.
        arrayPenalidades.push({
          quinzena: quinzenaStr,
          filial: filialProc,
          id_pacote: idPacote,
          descricao: descLimpa,
          tipo: tipoPenalidade,
          id_rota: idRota,
          data: dataInicio,
          placa: placa,
          motorista: motorista,
          valor: Math.abs(valor)
        });
      }
    }

    const arrayDiarias = Object.values(mapDiarias);

    addLog(`Limpeza: ${linhasApagadas} linhas removidas (Totais/Vazias), ${acentosRemovidos} acentos retirados.`, 'success');
    addLog(`Diárias (Rotas Únicas) processadas: ${arrayDiarias.length}`, 'success');
    addLog(`Penalidades processadas: ${arrayPenalidades.length}`, 'success');

    const rotasNaoEncontradas = new Set();
    arrayDiarias.filter(d => d.filial === 'N/A').forEach(d => { if(d.id_rota) rotasNaoEncontradas.add(d.id_rota) });
    arrayPenalidades.filter(p => p.filial === 'N/A').forEach(p => { if(p.id_rota) rotasNaoEncontradas.add(p.id_rota) });

    setPreview({
      diarias: arrayDiarias,
      penalidades: arrayPenalidades,
      operacional: newOperacionalData,
      filiaisNaoEncontradas: arrayDiarias.filter(d => d.filial === 'N/A').length + arrayPenalidades.filter(p => p.filial === 'N/A').length,
      rotasNaoEncontradas: Array.from(rotasNaoEncontradas)
    });

    setIsProcessing(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    addLog('Iniciando sincronização com Firebase...', 'info');
    
    try {
      if (onImportComplete) {
         await onImportComplete(preview.diarias, preview.penalidades, preview.operacional);
      }
      addLog('Sincronização concluída com sucesso!', 'success');
      setPreview(null);
      setBillingFile(null);
      setBaseFile(null);
    } catch(err) {
      addLog(`Erro ao salvar no banco: ${err.message}`, 'error');
    }
    setIsSaving(false);
  };

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col gap-6">
      
      {/* Header */}
      <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200">
        <div className="flex items-start gap-4 mb-4">
          <div className="bg-blue-100 text-blue-600 p-3 rounded-2xl">
            <Database className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800">Importador Inteligente (ETL)</h1>
            <p className="text-slate-500 font-medium">Faça o upload das planilhas brutas. O sistema fará a limpeza, o PROCV de Filiais e separará as Diárias das Penalidades automaticamente.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Upload Billing */}
        <div className={`bg-white rounded-3xl p-8 border-2 border-dashed flex flex-col items-center justify-center text-center transition-all ${billingFile ? 'border-emerald-500 bg-emerald-50' : 'border-slate-300 hover:border-blue-400'}`}>
          <FileSpreadsheet className={`w-12 h-12 mb-4 ${billingFile ? 'text-emerald-500' : 'text-slate-400'}`} />
          <h3 className="font-bold text-slate-800 text-lg mb-2">Billing Bruto (CSV)</h3>
          <p className="text-slate-500 text-sm mb-6">Planilha original com Diárias e Penalidades misturadas.</p>
          
          <label className={`cursor-pointer px-6 py-3 rounded-xl font-bold transition-all ${billingFile ? 'bg-emerald-500 hover:bg-emerald-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}>
            {billingFile ? billingFile.name : 'Selecionar Arquivo'}
            <input type="file" accept=".csv" className="hidden" onChange={e => setBillingFile(e.target.files[0])} />
          </label>
        </div>

        {/* Upload Base Operacional */}
        <div className={`bg-white rounded-3xl p-8 border-2 border-dashed flex flex-col items-center justify-center text-center transition-all ${baseFile ? 'border-emerald-500 bg-emerald-50' : 'border-slate-300 hover:border-blue-400'}`}>
          <FileSpreadsheet className={`w-12 h-12 mb-4 ${baseFile ? 'text-emerald-500' : 'text-slate-400'}`} />
          <h3 className="font-bold text-slate-800 text-lg mb-2">Base Operacional (Excel ou CSV)</h3>
          <p className="text-slate-500 text-sm mb-6">Planilha de rotas contendo a coluna XPT (Filial) para o PROCV.</p>
          
          <label className={`cursor-pointer px-6 py-3 rounded-xl font-bold transition-all ${baseFile ? 'bg-emerald-500 hover:bg-emerald-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}>
            {baseFile ? baseFile.name : 'Selecionar Arquivo'}
            <input type="file" accept=".csv, .xlsx, .xls" className="hidden" onChange={e => setBaseFile(e.target.files[0])} />
          </label>
        </div>

      </div>

      {/* Ações */}
      <div className="flex justify-end mt-4">
        <button 
          onClick={handleProcess}
          disabled={!billingFile || !baseFile || isProcessing}
          className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl font-black text-lg flex items-center gap-3 disabled:opacity-50 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1"
        >
          {isProcessing ? <Loader2 className="w-6 h-6 animate-spin" /> : <UploadCloud className="w-6 h-6" />}
          {isProcessing ? 'Processando Lógica...' : 'Processar Dados Mágicamente'}
        </button>
      </div>

      {/* Console de Logs */}
      {(logs.length > 0 || preview) && (
        <div className="bg-slate-900 rounded-3xl p-6 shadow-xl mt-4">
          <h3 className="text-white font-bold mb-4 flex items-center gap-2"><ArrowRight className="w-4 h-4 text-blue-400" /> Console de Processamento</h3>
          <div className="bg-slate-950 p-4 rounded-xl font-mono text-sm h-48 overflow-y-auto flex flex-col gap-2">
            {logs.map((log, idx) => (
              <div key={idx} className={`flex items-start gap-3 ${log.type === 'error' ? 'text-red-400' : log.type === 'warn' ? 'text-yellow-400' : log.type === 'success' ? 'text-emerald-400' : 'text-slate-400'}`}>
                <span className="text-slate-600 shrink-0">[{log.time}]</span>
                <span>{log.msg}</span>
              </div>
            ))}
            {isProcessing && (
              <div className="text-blue-400 flex items-center gap-2 animate-pulse mt-2">
                <span>Aplicando PROCV nativo e filtrando linhas...</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Pré-visualização e Ação Final */}
      {preview && (
        <div className="bg-emerald-50 rounded-3xl p-8 border border-emerald-200 shadow-sm animate-in fade-in slide-in-from-bottom-4 mt-4">
          <div className="flex items-center gap-3 mb-6">
            <CheckCircle2 className="w-8 h-8 text-emerald-500" />
            <h2 className="text-2xl font-black text-emerald-800">Pronto para Enviar!</h2>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-emerald-100 flex flex-col justify-center items-center text-center">
              <span className="text-4xl font-black text-emerald-600 mb-2">{preview.diarias.length}</span>
              <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">Diárias Identificadas</span>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-emerald-100 flex flex-col justify-center items-center text-center">
              <span className="text-4xl font-black text-emerald-600 mb-2">{preview.penalidades.length}</span>
              <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">Penalidades</span>
            </div>
            <div className={`bg-white p-6 rounded-2xl shadow-sm flex flex-col justify-center items-center text-center ${preview.filiaisNaoEncontradas > 0 ? 'border-red-200' : 'border-emerald-100'}`}>
              <span className={`text-4xl font-black mb-2 ${preview.filiaisNaoEncontradas > 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                {preview.filiaisNaoEncontradas}
              </span>
              <span className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                {preview.filiaisNaoEncontradas > 0 && <AlertTriangle className="w-4 h-4 text-red-500" />}
                Filiais Não Cruzadas (N/A)
              </span>
            </div>
          </div>

          {preview.filiaisNaoEncontradas > 0 && preview.rotasNaoEncontradas && (
            <div className="bg-red-50 p-6 rounded-2xl border border-red-200 mb-8 animate-in fade-in slide-in-from-bottom-2">
              <h3 className="text-red-800 font-bold mb-3 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Rotas não encontradas na Base Operacional ({preview.rotasNaoEncontradas.length} IDs únicos)
              </h3>
              <p className="text-red-600 text-sm mb-4">
                Estas rotas precisam ser cadastradas na planilha de Base Operacional, caso contrário os valores ficarão sem filial no painel:
              </p>
              <div className="bg-white rounded-xl p-4 border border-red-100 max-h-40 overflow-y-auto font-mono text-xs text-slate-700">
                {preview.rotasNaoEncontradas.join(', ')}
              </div>
              <button 
                onClick={() => navigator.clipboard.writeText(preview.rotasNaoEncontradas.join('\n'))}
                className="mt-4 bg-red-100 hover:bg-red-200 text-red-700 px-4 py-2 rounded-lg text-sm font-bold transition-colors shadow-sm"
              >
                Copiar Lista de Rotas
              </button>
            </div>
          )}

          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-xl font-black text-lg transition-all shadow-lg flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="w-6 h-6 animate-spin" /> : <Database className="w-6 h-6" />}
            {isSaving ? 'Sincronizando com Banco de Dados...' : 'Consolidar e Salvar no Firebase'}
          </button>
        </div>
      )}

    </div>
  );
}
