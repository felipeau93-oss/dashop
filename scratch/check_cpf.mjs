import pg from 'pg';

const pool = new pg.Pool({
  connectionString: 'postgresql://postgres:Aa982451397%40%23%40@db.rfxkxxvaykiolzhmkaxt.supabase.co:5432/postgres'
});

async function run() {
  try {
    const result = await pool.query(`SELECT dados_originais FROM operacional WHERE motorista IS NOT NULL AND motorista != 'N/A' LIMIT 10`);
    if (result.rows.length > 0) {
      console.log('Sample dados_originais keys:', Object.keys(result.rows[0].dados_originais));
      console.log('Sample dados_originais keys 2:', Object.keys(result.rows[1].dados_originais));
      console.log('Sample dados_originais keys 3:', Object.keys(result.rows[2].dados_originais));
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
