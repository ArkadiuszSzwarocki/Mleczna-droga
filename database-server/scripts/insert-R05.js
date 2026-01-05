import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), 'database-server/.env') });

const ROW = { code: 'R05', name: 'Regał05', type: 'rack', capacity: 50 };

async function main(){
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3307'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'MleczDroga'
  });
  try {
    const [cols] = await conn.query('SHOW COLUMNS FROM warehouseLocation');
    const colNames = (cols || []).map(c=>c.Field);
    const checks = [];
    const params = [];
    if (colNames.includes('code')) { checks.push('code = ?'); params.push(ROW.code); }
    if (colNames.includes('kod_lokalizacji')) { checks.push('kod_lokalizacji = ?'); params.push(ROW.code); }
    if (colNames.includes('name')) { checks.push('name = ?'); params.push(ROW.name); }
    if (colNames.includes('nazwa')) { checks.push('nazwa = ?'); params.push(ROW.name); }
    if (checks.length === 0) {
      console.log('Brak kolumn do porównania, kontynuuję wstawianie.');
    } else {
      const sql = `SELECT * FROM warehouseLocation WHERE ${checks.join(' OR ')} LIMIT 1`;
      const [rows] = await conn.query(sql, params);
      if (rows && rows.length > 0) {
        console.log('R05 już istnieje w DB:', rows[0]);
        return;
      }
    }

    // Try canonical insert, but fill legacy fields if present
    const insertFields = [];
    const insertVals = [];

    if (colNames.includes('code')) { insertFields.push('code'); insertVals.push(ROW.code); }
    if (colNames.includes('name')) { insertFields.push('name'); insertVals.push(ROW.name); }
    if (colNames.includes('type')) { insertFields.push('type'); insertVals.push(ROW.type); }
    if (colNames.includes('capacity')) { insertFields.push('capacity'); insertVals.push(ROW.capacity); }
    if (colNames.includes('kod_lokalizacji') && !insertFields.includes('kod_lokalizacji')) { insertFields.push('kod_lokalizacji'); insertVals.push(ROW.code); }
    if (colNames.includes('nazwa') && !insertFields.includes('nazwa')) { insertFields.push('nazwa'); insertVals.push(ROW.name); }
    if (colNames.includes('is_active') && !insertFields.includes('is_active')) { insertFields.push('is_active'); insertVals.push(1); }
    if (insertFields.length === 0) throw new Error('No suitable columns found to insert R05');

    const placeholders = insertFields.map(()=>'?').join(', ');
    const sql = `INSERT INTO warehouseLocation (${insertFields.join(', ')}) VALUES (${placeholders})`;
    const [res] = await conn.execute(sql, insertVals);
    console.log('Inserted R05, result:', res);
  } finally {
    await conn.end();
  }
}

main().catch(e=>{ console.error(e); process.exit(1); });
