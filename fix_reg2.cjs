const fs = require('fs');
let c = fs.readFileSync('src/DataImporter.jsx', 'utf8');

const regex = /const registrarImportacao = async \(tipo, quinzena, totalLinhas\) => \{[\s\S]*?await fetchHistorico\(\);\s*\} catch\s*\(err\)\s*\{[\s\S]*?\}\s*\};/;

const replacement = `const registrarImportacao = async (tipo, quinzena, totalLinhas) => {
    try {
      const q = quinzena || 'GERAL';
      await supabase.from('importacoes_history').delete().eq('tipo', tipo).eq('quinzena', q);

      const historyEntry = {
        tipo,
        quinzena: q,
        qtd_registros: totalLinhas,
        data_importacao: new Date().toISOString()
      };
      const { error: insErr } = await supabase.from('importacoes_history').insert([historyEntry]);
      if (insErr) throw insErr;
      await fetchHistorico();
    } catch(err) {
      console.error('Erro ao registrar importação', err);
    }
  };`;

if (regex.test(c)) {
    c = c.replace(regex, replacement);
    fs.writeFileSync('src/DataImporter.jsx', c);
    console.log('registrarImportacao fixed with regex!');
} else {
    console.log('TARGET NOT FOUND WITH REGEX');
}
