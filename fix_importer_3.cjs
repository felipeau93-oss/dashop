const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'DataImporter.jsx');
let content = fs.readFileSync(filePath, 'utf-8');

// Substituir saveInBuckets function by saveToSupabase function regex
const saveInBucketsRegex = /const saveInBuckets = async \([\s\S]*?throw err;\s*\n\s*};\s*\n/m;
const saveToSupabaseFunc = `const saveToSupabase = async (tableName, quinzena, dataArray, setProgress) => {
    try {
      const q = quinzena || 'GERAL';
      setProgress(\`Apagando dados antigos da quinzena \${q}...\`);
      
      const { error: deleteError } = await supabase
        .from(tableName)
        .delete()
        .eq('quinzena', q);
        
      if (deleteError) throw deleteError;

      let savedCount = 0;
      const CHUNK_SIZE = 1000;
      
      for (let i = 0; i < dataArray.length; i += CHUNK_SIZE) {
        const chunk = dataArray.slice(i, i + CHUNK_SIZE);
        const cleanedChunk = chunk.map(cleanUndefined);
        
        const { error: insertError } = await supabase
          .from(tableName)
          .insert(cleanedChunk);
          
        if (insertError) throw insertError;
        
        savedCount += chunk.length;
        setProgress(\`Processando linhas \${savedCount} de \${dataArray.length}...\`);
      }
    } catch (err) {
      console.error(\`Erro em saveToSupabase (\${tableName}):\`, err);
      throw err;
    }
  };
`;
content = content.replace(saveInBucketsRegex, saveToSupabaseFunc);

// Fix labels
content = content.replace(/Importação em Memória \(Buckets\)/g, "Importação PostgreSQL (Supabase)");
content = content.replace(/O processamento usará o navegador fragmentando grandes arquivos em blocos de 250 para não estourar a cota de 1MB por documento do Firebase./g, "O processamento usará o Bulk Insert para carregar dados massivos diretamente no banco relacional Supabase.");
content = content.replace(/Salvo em buckets no Firebase com sucesso!/g, "Salvo no Supabase com sucesso!");
content = content.replace(/await saveInBuckets\('capcar_testes'/g, "await saveToSupabase('capcar'");

fs.writeFileSync(filePath, content, 'utf-8');
console.log("Final UI and saveToSupabase fixes applied.");
