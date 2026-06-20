const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'DataImporter.jsx');
let content = fs.readFileSync(filePath, 'utf-8');

// Remover os '};' extras
content = content.replace(/  };\r?\n  };/g, "  };");
content = content.replace(/  };\r?\n  };/g, "  };");

// Fix fetchHistorico manually
const histRegex = /const fetchHistorico = async \(\) => {[\s\S]*?setIsLoadingHistory\(false\);\s*\n\s*};/m;
content = content.replace(histRegex, `const fetchHistorico = async () => {
    setIsLoadingHistory(true);
    try {
      const { data, error } = await supabase.from('importacoes_history').select('*').order('data_importacao', { ascending: false });
      if (error) throw error;
      setHistorico(data || []);
    } catch(err) {
      console.error(err);
    } finally {
      setIsLoadingHistory(false);
    }
  };`);

// Fix registrarImportacao manually
const regRegex = /const registrarImportacao = async \(tipo, quinzena, totalLinhas\) => {[\s\S]*?console\.error\('Erro ao registrar importação', err\);\s*\n\s*};/m;
content = content.replace(regRegex, `const registrarImportacao = async (tipo, quinzena, totalLinhas) => {
    try {
      const historyEntry = {
        tipo,
        quinzena: quinzena || 'GERAL',
        qtd_registros: totalLinhas,
        data_importacao: new Date().toISOString()
      };
      await supabase.from('importacoes_history').insert([historyEntry]);
      await fetchHistorico();
    } catch(err) {
      console.error('Erro ao registrar importação', err);
    }
  };`);

fs.writeFileSync(filePath, content, 'utf-8');
console.log("Syntax fixed and Historico Firebase refs removed!");
