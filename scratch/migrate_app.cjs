const fs = require('fs');

let content = fs.readFileSync('src/App.jsx', 'utf8');

// 1. Add Firebase imports
if (!content.includes('import { db }')) {
  content = content.replace(
    "import DreCustoLeve from './DreCustoLeve';",
    "import DreCustoLeve from './DreCustoLeve';\nimport { db } from './firebase';\nimport { collection, writeBatch, doc, getDocs } from 'firebase/firestore';"
  );
}

// 2. Modify process functions to return parsed
content = content.replace(/setRawData\(parsed\);\n\s*setError\(null\);/g, "setRawData(parsed);\n      setError(null);\n      return parsed;");
content = content.replace(/setRawFaturamentoData\(parsed\);\n\s*setError\(null\);/g, "setRawFaturamentoData(parsed);\n      setError(null);\n      return parsed;");
content = content.replace(/setRawOperacionalData\(parsed\);\n\s*setError\(null\);/g, "setRawOperacionalData(parsed);\n      setError(null);\n      return parsed;");
content = content.replace(/setRawBscData\(parsed\);\n\s*setError\(null\);/g, "setRawBscData(parsed);\n      setError(null);\n      return parsed;");
content = content.replace(/setRawCustosData\(parsed\);\n\s*setError\(null\);/g, "setRawCustosData(parsed);\n      setError(null);\n      return parsed;");
// wait, the process functions might have try catch around the return.
// Let's check processCustosData:
content = content.replace(/setRawCustosData\(parsedData\);/g, "setRawCustosData(parsedData);\n      return parsedData;");

// 3. Add syncToFirebase and fetchFromFirebase right before fetchFromGoogleSheets
const fetchGoogleIndex = content.indexOf('const fetchFromGoogleSheets = useCallback(async () => {');

const firebaseFunctions = `
  const syncToFirebase = async (collectionName, dataArray) => {
    try {
      const colRef = collection(db, collectionName);
      const snapshot = await getDocs(colRef);
      let batch = writeBatch(db);
      let count = 0;
      for (const document of snapshot.docs) {
        batch.delete(document.ref);
        count++;
        if (count === 490) { await batch.commit(); batch = writeBatch(db); count = 0; }
      }
      if (count > 0) await batch.commit();

      batch = writeBatch(db);
      count = 0;
      for (const item of dataArray) {
        batch.set(doc(colRef), item);
        count++;
        if (count === 490) { await batch.commit(); batch = writeBatch(db); count = 0; }
      }
      if (count > 0) await batch.commit();
      console.log(\`Coleção \${collectionName} sincronizada com sucesso!\`);
    } catch (err) {
      console.error(\`Erro ao sincronizar \${collectionName}:\`, err);
    }
  };

  const fetchFromFirebase = useCallback(async () => {
    setIsLoading(true); setError(null);
    try {
      const fetchCol = async (colName, setter) => {
        const snapshot = await getDocs(collection(db, colName));
        const data = [];
        snapshot.forEach(d => data.push(d.data()));
        setter(data);
      };
      await Promise.all([
        fetchCol('penalidades', setRawData),
        fetchCol('faturamento', setRawFaturamentoData),
        fetchCol('operacional', setRawOperacionalData),
        fetchCol('bsc', setRawBscData),
        fetchCol('custosFinanceiros', setRawCustosData),
      ]);
    } catch(err) {
      setError("Erro ao ler do Firebase: " + String(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

`;

if (!content.includes('syncToFirebase')) {
  content = content.slice(0, fetchGoogleIndex) + firebaseFunctions + content.slice(fetchGoogleIndex);
}

// 4. Modify fetchFromGoogleSheets to call syncToFirebase
const googleSheetsLogic = `      const t1 = await fetchCSV(sheetUrl, 'Penalidades');
      const d1 = t1 ? processRawCSV(t1) : null;
      if (d1) await syncToFirebase('penalidades', d1);

      const t2 = await fetchCSV(sheetUrlFaturamento, 'Faturamento');
      const d2 = t2 ? processFaturamentoData(t2) : null;
      if (d2) await syncToFirebase('faturamento', d2);

      const t3 = await fetchCSV(sheetUrlOperacional, 'Operacional');
      const d3 = t3 ? processOperacionalData(t3) : null;
      if (d3) await syncToFirebase('operacional', d3);

      const t4 = await fetchCSV(sheetUrlBsc, 'BSC');
      const d4 = t4 ? processBscData(t4) : null;
      if (d4) await syncToFirebase('bsc', d4);

      const t5 = await fetchCSV(sheetUrlCustos, 'Custos Financeiros');
      const d5 = t5 ? processCustosData(t5) : null;
      if (d5) await syncToFirebase('custosFinanceiros', d5);`;

content = content.replace(
  /const t1 = await fetchCSV\(sheetUrl, 'Penalidades'\);\s*if \(t1\) processRawCSV\(t1\);\s*const t2 = await fetchCSV\(sheetUrlFaturamento, 'Faturamento'\);\s*if \(t2\) processFaturamentoData\(t2\);\s*const t3 = await fetchCSV\(sheetUrlOperacional, 'Operacional'\);\s*if \(t3\) processOperacionalData\(t3\);\s*const t4 = await fetchCSV\(sheetUrlBsc, 'BSC'\);\s*if \(t4\) processBscData\(t4\);\s*const t5 = await fetchCSV\(sheetUrlCustos, 'Custos Financeiros'\);\s*if \(t5\) processCustosData\(t5\);/,
  googleSheetsLogic
);

// 5. Change useEffect to fetchFromFirebase instead of fetchFromGoogleSheets
content = content.replace(
  "fetchFromGoogleSheets();\n      setHasInitialSynced(true);",
  "fetchFromFirebase();\n      setHasInitialSynced(true);"
);
// Make sure dependencies are updated
content = content.replace(
  "useEffect(() => {\n    if (isAuthenticated && !hasInitialSynced) {\n      fetchFromFirebase();\n      setHasInitialSynced(true);\n    }\n  }, [isAuthenticated, hasInitialSynced, fetchFromGoogleSheets]);",
  "useEffect(() => {\n    if (isAuthenticated && !hasInitialSynced) {\n      fetchFromFirebase();\n      setHasInitialSynced(true);\n    }\n  }, [isAuthenticated, hasInitialSynced, fetchFromFirebase]);"
);


fs.writeFileSync('src/App.jsx', content, 'utf8');
console.log('App.jsx updated successfully.');
