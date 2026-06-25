import pg from 'pg';

const pool = new pg.Pool({
  connectionString: 'postgresql://postgres:Aa982451397%40%23%40@db.lysyyfuylxoiilusjnot.supabase.co:5432/postgres'
});

async function run() {
  try {
    const result = await pool.query(`SELECT dados_originais FROM operacional WHERE motorista IS NOT NULL AND motorista != 'N/A' LIMIT 5`);
    if (result.rows.length > 0) {
      result.rows.forEach((row, idx) => {
        console.log(`Sample ${idx} keys:`, Object.keys(row.dados_originais));
        console.log(`Sample ${idx} values:`, Object.values(row.dados_originais).slice(0, 15));
      });
    } else {
      console.log('No data found');
    }
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}

run();
