const fs = require('fs');
let c = fs.readFileSync('src/DataImporter.jsx', 'utf8');

const target = `  const registrarImportacao = async (tipo, quinzena, totalLinhas) => {
    try {
      const historyEntry = {
        tipo,
        quinzena: quinzena || 'GERAL',
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

const replacement = `  const registrarImportacao = async (tipo, quinzena, totalLinhas) => {
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

if (c.includes(target)) {
    c = c.replace(target, replacement);
    fs.writeFileSync('src/DataImporter.jsx', c);
    console.log('registrarImportacao fixed!');
} else {
    console.log('TARGET NOT FOUND');
}
