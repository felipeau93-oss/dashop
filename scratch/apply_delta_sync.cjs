const fs = require('fs');

let content = fs.readFileSync('src/App.jsx', 'utf8');

// 1. Add refs
if (!content.includes('const rawDataRef = useRef')) {
  content = content.replace(
    "const [rawData, setRawData] = useState(initialParsedData);",
    "const [rawData, setRawData] = useState(initialParsedData);\n  const rawDataRef = useRef([]);\n  const rawFaturamentoDataRef = useRef([]);\n  const rawOperacionalDataRef = useRef([]);\n  const rawBscDataRef = useRef([]);\n  const rawCustosDataRef = useRef([]);"
  );
}

// 2. Update fetchFromFirebase
const newFetchFromFirebase = `
  const fetchFromFirebase = useCallback(async () => {
    setIsLoading(true); setError(null);
    try {
      const fetchCol = async (colName, setter, ref) => {
        const snapshot = await getDocs(collection(db, colName));
        const data = [];
        snapshot.forEach(d => data.push({ ...d.data(), _docId: d.id }));
        setter(data);
        ref.current = data;
      };
      await Promise.all([
        fetchCol('penalidades', setRawData, rawDataRef),
        fetchCol('faturamento', setRawFaturamentoData, rawFaturamentoDataRef),
        fetchCol('operacional', setRawOperacionalData, rawOperacionalDataRef),
        fetchCol('bsc', setRawBscData, rawBscDataRef),
        fetchCol('custosFinanceiros', setRawCustosData, rawCustosDataRef),
      ]);
    } catch(err) {
      setError("Erro ao ler do Firebase: " + String(err));
    } finally {
      setIsLoading(false);
    }
  }, []);
`;

// Replace fetchFromFirebase
content = content.replace(/const fetchFromFirebase = useCallback\(async \(\) => \{[\s\S]*?\}, \[\]\);/, newFetchFromFirebase.trim());

// 3. Update syncToFirebase
const newSyncToFirebase = `
  const syncToFirebase = async (collectionName, newDataArray, existingDataArray) => {
    try {
      const colRef = collection(db, collectionName);
      
      const getHash = (obj) => {
        const copy = { ...obj };
        delete copy._docId;
        delete copy._addedCount;
        const sorted = {};
        Object.keys(copy).sort().forEach(k => sorted[k] = copy[k]);
        return JSON.stringify(sorted);
      };

      const existingCounts = {};
      const existingDocIds = {};

      existingDataArray.forEach(item => {
        const hash = getHash(item);
        existingCounts[hash] = (existingCounts[hash] || 0) + 1;
        if (!existingDocIds[hash]) existingDocIds[hash] = [];
        existingDocIds[hash].push(item._docId);
      });

      const newCounts = {};
      newDataArray.forEach(item => {
        const hash = getHash(item);
        newCounts[hash] = (newCounts[hash] || 0) + 1;
      });

      const itemsToAdd = [];
      newDataArray.forEach(item => {
        const hash = getHash(item);
        if (!item._addedCount) item._addedCount = 0;
        
        const existing = existingCounts[hash] || 0;
        const target = newCounts[hash];
        
        if (target > existing && item._addedCount < (target - existing)) {
           const copy = { ...item };
           delete copy._addedCount;
           itemsToAdd.push(copy);
           item._addedCount++;
        }
      });

      const docsToDelete = [];
      for (const hash in existingCounts) {
         const existing = existingCounts[hash];
         const target = newCounts[hash] || 0;
         if (existing > target) {
            const difference = existing - target;
            const idsToRemove = existingDocIds[hash].slice(0, difference);
            docsToDelete.push(...idsToRemove);
         }
      }

      if (itemsToAdd.length === 0 && docsToDelete.length === 0) {
        console.log(\`[Delta Sync] \${collectionName}: Nenhuma alteração.\`);
        return;
      }

      console.log(\`[Delta Sync] \${collectionName}: Adicionando \${itemsToAdd.length}, Removendo \${docsToDelete.length}\`);

      let batch = writeBatch(db);
      let count = 0;

      for (const docId of docsToDelete) {
        if (docId) {
          batch.delete(doc(colRef, docId));
          count++;
          if (count === 490) { await batch.commit(); batch = writeBatch(db); count = 0; }
        }
      }
      
      for (const item of itemsToAdd) {
        batch.set(doc(colRef), item);
        count++;
        if (count === 490) { await batch.commit(); batch = writeBatch(db); count = 0; }
      }

      if (count > 0) await batch.commit();
      console.log(\`[Delta Sync] \${collectionName} sincronizada com sucesso!\`);
    } catch (err) {
      console.error(\`Erro ao sincronizar \${collectionName}:\`, err);
    }
  };
`;

content = content.replace(/const syncToFirebase = async \(collectionName, dataArray\) => \{[\s\S]*?console\.error\(\`Erro ao sincronizar \$\{collectionName\}:\`, err\);\n    \}\n  \};/, newSyncToFirebase.trim());

// 4. Update fetchFromGoogleSheets calls
content = content.replace(
  "if (d1) await syncToFirebase('penalidades', d1);",
  "if (d1) await syncToFirebase('penalidades', d1, rawDataRef.current);"
);
content = content.replace(
  "if (d2) await syncToFirebase('faturamento', d2);",
  "if (d2) await syncToFirebase('faturamento', d2, rawFaturamentoDataRef.current);"
);
content = content.replace(
  "if (d3) await syncToFirebase('operacional', d3);",
  "if (d3) await syncToFirebase('operacional', d3, rawOperacionalDataRef.current);"
);
content = content.replace(
  "if (d4) await syncToFirebase('bsc', d4);",
  "if (d4) await syncToFirebase('bsc', d4, rawBscDataRef.current);"
);
content = content.replace(
  "if (d5) await syncToFirebase('custosFinanceiros', d5);",
  "if (d5) await syncToFirebase('custosFinanceiros', d5, rawCustosDataRef.current);"
);

// We should also trigger fetchFromFirebase at the end of fetchFromGoogleSheets so refs get updated with the new docIds.
content = content.replace(
  "if (d5) await syncToFirebase('custosFinanceiros', d5, rawCustosDataRef.current);\n\n    } catch (err) {",
  "if (d5) await syncToFirebase('custosFinanceiros', d5, rawCustosDataRef.current);\n\n      await fetchFromFirebase();\n    } catch (err) {"
);


fs.writeFileSync('src/App.jsx', content, 'utf8');
console.log('Delta Sync applied successfully.');
