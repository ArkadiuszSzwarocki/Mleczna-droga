import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

async function checkVersion() {
  const dbConfig = {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD
  };

  const conn = await mysql.createConnection(dbConfig);
  try {
    const [[vrow]] = await conn.query("SELECT VERSION() AS version, @@version_comment AS version_comment, @@version_compile_os AS compile_os");
    console.log('Server version info:', vrow);
    // Check for JSON type support quick test
    try {
      const [[res]] = await conn.query("SELECT JSON_VALID('[]') AS json_valid");
      console.log('JSON functions available (JSON_VALID):', res.json_valid);
    } catch (e) {
      console.log('JSON functions not available or JSON type not supported:', e.message);
    }
  } finally {
    await conn.end();
  }
}

checkVersion().catch(e => { console.error('Error checking version:', e.message); process.exit(1); });