import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || '',
  connectTimeout: 5000
};

async function check() {
  console.log('Sprawdzam połączenie do bazy:', `${dbConfig.host}:${dbConfig.port}`);
  try {
    const pool = mysql.createPool(dbConfig);
    const [rows] = await pool.query('SELECT 1 AS ok');
    console.log('✅ Zapytanie wykonało się poprawnie:', rows);
    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('❌ Błąd połączenia do bazy:', err.message);
    process.exit(2);
  }
}

check();
