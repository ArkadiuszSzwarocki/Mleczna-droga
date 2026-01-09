const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

(async () => {
  const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3307'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'mleczna_droga'
  };

  console.log('Łączenie z:', `${dbConfig.host}:${dbConfig.port}`);
  try {
    const conn = await mysql.createConnection(dbConfig);
    const [rows] = await conn.query('SELECT id, username, role_id, sub_role_id, pin, is_temporary_password FROM users ORDER BY username');
    console.log(JSON.stringify(rows, null, 2));
    await conn.end();
  } catch (err) {
    console.error('Błąd połączenia / zapytania:', err.message || err);
    process.exit(1);
  }
})();