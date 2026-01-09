import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3307'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'mleczna_droga'
};

(async () => {
  const conn = await mysql.createConnection(dbConfig);
  try {
    const db = dbConfig.database;
    const [rows] = await conn.query(`SELECT TABLE_NAME, ENGINE, TABLE_COLLATION FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME IN ('inventory_sessions','inventory_snapshots','inventory_scans')`, [db]);
    console.log('Table engines and collations in', db);
    console.log(JSON.stringify(rows, null, 2));
  } catch (e) {
    console.error('Error:', e.message || e);
  } finally {
    await conn.end();
  }
})();