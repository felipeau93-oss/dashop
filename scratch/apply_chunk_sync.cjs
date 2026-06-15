const fs = require('fs');

let content = fs.readFileSync('src/App.jsx', 'utf8');

// 1. New fetchFromFirebase
const newFetchFromFirebase = `
  const fetchFromFirebase = useCallback(async () => {
    setIsLoading(true); setError(null);
    try {
      const snapshot = await getDocs(collection(db, 'app_dados_comprimidos'));
      const chunks = {};
      
      snapshot.forEach(doc => {
        const id = doc.id; // Ex: faturamento_chunk_0
        if (id.includes('_chunk_')) {
          const [colName, index] = id.split('_chunk_');
          if (!chunks[colName]) chunks[colName] = [];
          chunks[colName][parseInt(index)] = doc.data().payload;
        }
      });

      const parseChunks = (colName) => {
        if (!chunks[colName]) return [];
        const fullString = chunks[colName].join('');
        return fullString ? JSON.parse(fullString) : [];
      };

      const penalidades = parseChunks('penalidades');
      const faturamento = parseChunks('faturamento');
      const operacional = parseChunks('operacional');
      const bsc = parseChunks('bsc');
      const custosFinanceiros = parseChunks('custosFinanceiros');

      setRawData(penalidades);
      if (rawDataRef) rawDataRef.current = penalidades;

      setRawFaturamentoData(faturamento);
      if (rawFaturamentoDataRef) rawFaturamentoDataRef.current = faturamento;

      setRawOperacionalData(operacional);
      if (rawOperacionalDataRef) rawOperacionalDataRef.current = operacional;

      setRawBscData(bsc);
      if (rawBscDataRef) rawBscDataRef.current = bsc;

      setRawCustosData(custosFinanceiros);
      if (rawCustosDataRef) rawCustosDataRef.current = custosFinanceiros;

    } catch(err) {
      console.error(err);
      setError("Erro ao ler do Firebase: " + String(err));
    } finally {
      setIsLoading(false);
    }
  }, []);
`;

content = content.replace(/const fetchFromFirebase = useCallback\(async \(\) => \{[\s\S]*?\}, \[\]\);/, newFetchFromFirebase.trim());

// 2. New syncToFirebase (chunking approach)
const newSyncToFirebase = `
  const syncToFirebase = async (collectionName, dataArray) => {
    try {
      const fullString = JSON.stringify(dataArray);
      const CHUNK_SIZE = 800000; // ~800KB por chunk para ficar longe do limite de 1MB do Firestore
      const numChunks = Math.ceil(fullString.length / CHUNK_SIZE);
      
      const colRef = collection(db, 'app_dados_comprimidos');
      const snapshot = await getDocs(colRef);
      
      let batch = writeBatch(db);
      
      // Apaga os chunks antigos desta coleção específica
      snapshot.forEach(docSnap => {
         if (docSnap.id.startsWith(collectionName + '_chunk_')) {
            batch.delete(docSnap.ref);
         }
      });
      await batch.commit(); // É seguro pois teremos no máximo de 10 a 20 chunks
      
      batch = writeBatch(db);
      for (let i = 0; i < numChunks; i++) {
        const chunkStr = fullString.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
        const docRef = doc(colRef, \`\${collectionName}_chunk_\${i}\`);
        batch.set(docRef, { payload: chunkStr });
      }
      
      await batch.commit();
      console.log(\`[Chunk Sync] \${collectionName} salvo em \${numChunks} fatias com sucesso!\`);
    } catch (err) {
      console.error(\`Erro ao sincronizar \${collectionName}:\`, err);
    }
  };
`;

content = content.replace(/const syncToFirebase = async \(collectionName, newDataArray, existingDataArray\) => \{[\s\S]*?console\.error\(\`Erro ao sincronizar \$\{collectionName\}:\`, err\);\n    \}\n  \};/, newSyncToFirebase.trim());

// 3. Revert fetchFromGoogleSheets back to not passing existingDataArray
content = content.replace(
  "if (d1) await syncToFirebase('penalidades', d1, rawDataRef.current);",
  "if (d1) await syncToFirebase('penalidades', d1);"
);
content = content.replace(
  "if (d2) await syncToFirebase('faturamento', d2, rawFaturamentoDataRef.current);",
  "if (d2) await syncToFirebase('faturamento', d2);"
);
content = content.replace(
  "if (d3) await syncToFirebase('operacional', d3, rawOperacionalDataRef.current);",
  "if (d3) await syncToFirebase('operacional', d3);"
);
content = content.replace(
  "if (d4) await syncToFirebase('bsc', d4, rawBscDataRef.current);",
  "if (d4) await syncToFirebase('bsc', d4);"
);
content = content.replace(
  "if (d5) await syncToFirebase('custosFinanceiros', d5, rawCustosDataRef.current);",
  "if (d5) await syncToFirebase('custosFinanceiros', d5);"
);


fs.writeFileSync('src/App.jsx', content, 'utf8');
console.log('Chunk Sync applied successfully.');
