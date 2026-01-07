
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

dotenv.config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3307'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'mleczna_droga',
  waitForConnections: true,
  connectionLimit: 1,
  queueLimit: 0
};

(async () => {
  try {
    console.log('Łączenie z bazą:', dbConfig.host, 'port', dbConfig.port, 'użytkownik', dbConfig.user);
    const pool = mysql.createPool(dbConfig);
    const sql = `
      CREATE TABLE IF NOT EXISTS packaging_forms (
          id INT AUTO_INCREMENT PRIMARY KEY,
          code VARCHAR(50) UNIQUE,
          name VARCHAR(255) NOT NULL,
          type VARCHAR(50),
          description TEXT,
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_name (name),
          INDEX idx_code (code)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci;
    `;

    const [result] = await pool.execute(sql);
    console.log('✅ Wykonano CREATE TABLE (lub już istniała).');
    await pool.end();
    // FIX: Cast process to any to resolve 'exit' property not found on type 'Process' error.
    (process as any).exit(0);
  } catch (err) {
    console.error('❌ Błąd podczas tworzenia tabeli packaging_forms:', err.message || err);
    // FIX: Cast process to any to resolve 'exit' property not found on type 'Process' error.
    (process as any).exit(2);
  }
})();
