const mysql = require('mysql2/promise');
const fs = require('fs');
require('dotenv').config({ path: __dirname + '/../database-server/.env' });

(async function main() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'MleczDroga',
    waitForConnections: true,
    connectionLimit: 5,
  });

  try {
    const [tables] = await pool.query("SHOW TABLES LIKE 'raw_materials'");
    if (!tables || tables.length === 0) {
      console.log('Tabela raw_materials nie istnieje.');
      return;
    }

    const [cols] = await pool.query('SHOW COLUMNS FROM raw_materials');
    console.log('\nKolumny w raw_materials:');
    cols.forEach(c => console.log(` - ${c.Field} (${c.Type})`));

    const [counts] = await pool.query(`SELECT 
      COUNT(*) AS total, 
      SUM(CASE WHEN currentLocation = 'ARCHIVED' THEN 1 ELSE 0 END) AS archived,
      SUM(CASE WHEN currentLocation IS NULL OR currentLocation = '' THEN 1 ELSE 0 END) AS no_location
      FROM raw_materials`);
    console.log('\nStatystyki:');
    console.log(counts[0]);

    const [samples] = await pool.query('SELECT id, nrPalety, nazwa, currentWeight, currentLocation, createdAt, updatedAt, isBlocked FROM raw_materials LIMIT 30');
    console.log('\nPrzykładowe wiersze (do 30):');
    console.table(samples);

    // zapisz wynik do pliku
    const out = { cols, stats: counts[0], samples };
    fs.writeFileSync('raw_materials_check.json', JSON.stringify(out, null, 2));
    console.log('\nZapisano raw_materials_check.json');
  } catch (err) {
    console.error('Błąd podczas sprawdzania raw_materials:', err.message || err);
  } finally {
    await pool.end();
  }
})();
