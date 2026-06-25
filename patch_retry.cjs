const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'DataImporter.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add RefreshCw to imports
content = content.replace(
  /import { UploadCloud, FileSpreadsheet, CheckCircle2, AlertTriangle, ArrowRight, Loader2, Database, Box, DollarSign, History, Calendar, LayoutList, Truck, Trash2, EyeOff, Copy } from 'lucide-react';/,
  "import { UploadCloud, FileSpreadsheet, CheckCircle2, AlertTriangle, ArrowRight, Loader2, Database, Box, DollarSign, History, Calendar, LayoutList, Truck, Trash2, EyeOff, Copy, RefreshCw } from 'lucide-react';"
);

// 2. Add handleBulkRetrySearch before toggleSelectAllPendentes
const retryFunc = `
  const handleBulkRetrySearch = async () => {
    if(selectedPendentes.size === 0) return;
    setIsLoadingPendentes(true);
    addLog(\`Iniciando busca no operacional para \${selectedPendentes.size} rotas...\`, 'info');
    try {
      const idsArray = Array.from(selectedPendentes).map(id => String(id));
      let rotasEncontradas = [];
      
      for (let i = 0; i < idsArray.length; i += 100) {
          const chunk = idsArray.slice(i, i + 100);
          const { data: opData } = await supabase.from('operacional').select('id_rota, filial, regional, supervisor, motorista').in('id_rota', chunk);
          if (opData && opData.length > 0) {
             rotasEncontradas = rotasEncontradas.concat(opData);
          }
      }
      
      if (rotasEncontradas.length > 0) {
         const map = new Map();
         rotasEncontradas.forEach(r => map.set(r.id_rota, r));
         const rotasUnicas = Array.from(map.values());
         
         addLog(\`Sincronizando \${rotasUnicas.length} rotas encontradas no faturamento...\`, 'info');
         
         for (const r of rotasUnicas) {
             await supabase.from('faturamento').update({
                filial: r.filial, regional: r.regional, supervisor: r.supervisor
             }).eq('id_rota', r.id_rota).eq('filial', 'N/A');
             
             await supabase.from('penalidades').update({
                filial: r.filial, regional: r.regional, supervisor: r.supervisor
             }).eq('id_rota', r.id_rota).eq('filial', 'N/A');
             
             await supabase.from('rotas_pendentes').delete().eq('id_rota', r.id_rota);
         }
         
         addLog(\`Sucesso! \${rotasUnicas.length} rotas foram sincronizadas. Atualizando dashboard...\`, 'success');
         await supabase.rpc('rpc_refresh_materialized_views');
      } else {
         addLog(\`Nenhuma das \${selectedPendentes.size} rotas foi encontrada no operacional ainda.\`, 'info');
      }
      
      setSelectedPendentes(new Set());
      await loadPendentes();
      
    } catch (e) {
      console.error("Erro ao refazer busca:", e);
      addLog(\`Erro ao refazer busca: \${e.message}\`, 'error');
    } finally {
      setIsLoadingPendentes(false);
    }
  };

  const toggleSelectAllPendentes = () => {`;

content = content.replace("  const toggleSelectAllPendentes = () => {", retryFunc);

// 3. Add the button
const buttonsBlock = `                      <button onClick={handleBulkIgnorar} className="bg-orange-600 hover:bg-orange-500 text-white px-4 py-1.5 rounded-lg text-sm font-bold transition-colors flex items-center gap-2">
                        <EyeOff className="w-4 h-4" /> Ignorar ({selectedPendentes.size})
                      </button>
                      <button onClick={handleBulkDelete} className="bg-red-600 hover:bg-red-500 text-white px-4 py-1.5 rounded-lg text-sm font-bold transition-colors flex items-center gap-2">
                        <Trash2 className="w-4 h-4" /> Excluir Alertas ({selectedPendentes.size})
                      </button>
                      <button onClick={handleBulkRetrySearch} className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-1.5 rounded-lg text-sm font-bold transition-colors flex items-center gap-2">
                        <RefreshCw className="w-4 h-4" /> Refazer Busca ({selectedPendentes.size})
                      </button>`;

content = content.replace(
  /<button onClick=\{handleBulkIgnorar\}[\s\S]*?<Trash2 className="w-4 h-4" \/> Excluir Alertas \(\{selectedPendentes\.size\}\)\n\s*<\/button>/,
  buttonsBlock
);

fs.writeFileSync(filePath, content, 'utf8');
console.log("Patched successfully");
