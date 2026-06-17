const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf-8');

// 1. Insert prevPrevQuinzenaName
code = code.replace(
  /const prevQuinzenaName = useMemo\(\(\) => \{[\s\S]*?\}, \[quinzenasDisponiveis, targetQuinzenaRunRate\]\);/,
  `const prevQuinzenaName = useMemo(() => {
    if (!targetQuinzenaRunRate || quinzenasDisponiveis.length < 2) return null;
    const currentIndex = quinzenasDisponiveis.indexOf(targetQuinzenaRunRate);
    if (currentIndex !== -1 && currentIndex + 1 < quinzenasDisponiveis.length) {
      return quinzenasDisponiveis[currentIndex + 1];
    }
    return null;
  }, [quinzenasDisponiveis, targetQuinzenaRunRate]);

  const prevPrevQuinzenaName = useMemo(() => {
    if (!targetQuinzenaRunRate || quinzenasDisponiveis.length < 3) return null;
    const currentIndex = quinzenasDisponiveis.indexOf(targetQuinzenaRunRate);
    if (currentIndex !== -1 && currentIndex + 2 < quinzenasDisponiveis.length) {
      return quinzenasDisponiveis[currentIndex + 2];
    }
    return null;
  }, [quinzenasDisponiveis, targetQuinzenaRunRate]);`
);

fs.writeFileSync('src/App.jsx', code, 'utf-8');
console.log('Patch 1 complete.');
