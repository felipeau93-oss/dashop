const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

const filesToUpdate = [
  'Simulador.jsx',
  'PainelTreinamentos.jsx',
  'DreViabilidade.jsx',
  'DreCustoLeve.jsx',
  'DataImporter.jsx',
  'App.jsx'
];

filesToUpdate.forEach(file => {
  const filePath = path.join(srcDir, file);
  if (!fs.existsSync(filePath)) return;
  
  let content = fs.readFileSync(filePath, 'utf-8');

  // Add import if not exists
  if (!content.includes('getCollectionName')) {
    const importRegex = /import\s+\{([^}]*db[^}]*)\}\s+from\s+['"]\.\/firebase['"];/;
    if (importRegex.test(content)) {
      content = content.replace(importRegex, (match, p1) => {
        if (p1.includes('getCollectionName')) return match;
        return `import { ${p1.trim()}, getCollectionName } from './firebase';`;
      });
    } else {
      // Se não encontrou o import explícito do db, apenas garante que adicionou
      content = `import { getCollectionName } from './firebase';\n` + content;
    }
  }

  // Replace collection(db, ...)
  content = content.replace(/collection\(\s*db\s*,\s*([^)]+)\)/g, (match, p1) => {
    if (p1.trim().startsWith('getCollectionName')) return match;
    return `collection(db, getCollectionName(${p1.trim()}))`;
  });

  // Replace doc(db, ...)
  // We match until the first comma after db to get the collection name
  content = content.replace(/doc\(\s*db\s*,\s*([^,]+)(.*)\)/g, (match, p1, p2) => {
    if (p1.trim().startsWith('getCollectionName')) return match;
    return `doc(db, getCollectionName(${p1.trim()})${p2})`;
  });

  fs.writeFileSync(filePath, content, 'utf-8');
  console.log(`Updated ${file}`);
});

// Update firebase.js
const fbPath = path.join(srcDir, 'firebase.js');
if (fs.existsSync(fbPath)) {
  let fbContent = fs.readFileSync(fbPath, 'utf-8');
  if (!fbContent.includes('getCollectionName')) {
    fbContent += `\nexport const getCollectionName = (name) => {\n  const prefix = import.meta.env.VITE_DB_PREFIX || '';\n  return \`\${prefix}\${name}\`;\n};\n`;
    fs.writeFileSync(fbPath, fbContent, 'utf-8');
    console.log('Updated firebase.js');
  }
}

console.log('All done!');
