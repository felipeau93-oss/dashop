const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'App.jsx');
let content = fs.readFileSync(filePath, 'utf-8');

// 1. Add Supabase import
if (!content.includes("import { supabase }")) {
  content = content.replace(
    "import { db, auth, getCollectionName } from './firebase';",
    "import { db, auth, getCollectionName } from './firebase';\nimport { supabase } from './supabase';"
  );
}

// 2. Replace extractItems
const extractItemsOld = `const extractItems = async (colName) => {
         const items = [];
         const snap = await getDocs(collection(db, getCollectionName(colName)));
         snap.forEach(doc => {
            const data = doc.data();
            if (data.items && Array.isArray(data.items)) {
               data.items.forEach(item => items.push({ ...item, quinzena: item.quinzena || data.quinzena }));
            } else if (!data.items) {
               items.push({ ...data, quinzena: data.quinzena || 'N/A' });
            }
         });
         return items;
      };`;

const extractItemsNew = `const extractItems = async (tableName) => {
         const { data, error } = await supabase.from(tableName).select('*');
         if (error) {
             console.error("Supabase Erro na tabela", tableName, error);
             return [];
         }
         return data || [];
      };`;

content = content.replace(extractItemsOld, extractItemsNew);

// 3. Fix extractItems calls
content = content.replace(/extractItems\('penalidades_testes'\)/g, "extractItems('penalidades')");
content = content.replace(/extractItems\('faturamento_testes'\)/g, "extractItems('faturamento')");
content = content.replace(/extractItems\('operacional_testes'\)/g, "extractItems('operacional')");
content = content.replace(/extractItems\('capcar_testes'\)/g, "extractItems('custos').then(data => data.filter(d => d.tipo === 'Capcar'))");
content = content.replace(/extractItems\('operacional_bsc_testes'\)/g, "extractItems('bsc')");
content = content.replace(/extractItems\('custosFinanceiros_testes'\)/g, "extractItems('custos').then(data => data.filter(d => d.tipo === 'Financeiro'))");
content = content.replace(/extractItems\('tarifas_testes'\)/g, "extractItems('tarifas')");

// 4. Fix rotas_ignoradas
const ignoradasOld = `const ignoradasSnap = await getDocs(collection(db, getCollectionName('rotas_ignoradas_testes')));
      const rotasIgnoradas = new Set();
      ignoradasSnap.forEach(doc => rotasIgnoradas.add(String(doc.id).trim()));`;
      
const ignoradasNew = `const { data: ignoradasData } = await supabase.from('rotas_ignoradas').select('id_rota');
      const rotasIgnoradas = new Set((ignoradasData || []).map(d => String(d.id_rota).trim()));`;

content = content.replace(ignoradasOld, ignoradasNew);

// 5. Fix rotas pendentes save (na linha 2871 do App.jsx onde tem setDoc)
const pendentesOld = `const pendentesRef = collection(db, getCollectionName('rotas_pendentes_testes'));
      const pendentesBatch = writeBatch(db);
      novasRotasPendentes.forEach(r => {
        pendentesBatch.set(doc(pendentesRef, String(r.id_rota)), {
           id_rota: r.id_rota,
           data_identificacao: new Date().toISOString()
        }, { merge: true });
      });
      await pendentesBatch.commit();`;

const pendentesNew = `if (novasRotasPendentes.length > 0) {
        const upsertData = novasRotasPendentes.map(r => ({
           id_rota: r.id_rota,
           data_identificacao: new Date().toISOString()
        }));
        await supabase.from('rotas_pendentes').upsert(upsertData, { onConflict: 'id_rota' });
      }`;

content = content.replace(pendentesOld, pendentesNew);

// Fix setDataSource firebase -> supabase default
content = content.replace(/const \[dataSource, setDataSource\] = useState\('firebase'\);/g, "const [dataSource, setDataSource] = useState('supabase');");
content = content.replace(/dataSource === 'firebase'/g, "dataSource === 'supabase'");
content = content.replace(/setDataSource\('firebase'\)/g, "setDataSource('supabase')");


fs.writeFileSync(filePath, content, 'utf-8');
console.log('App.jsx migrado para Supabase com sucesso!');
