import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), 'database-server/.env') });

const desired = [
  ['BF_MP01','Bufor Produkcyjny','zone',50],
  ['BF_MS01','Bufor Przyjęć Surowców','zone',50],
  ['KO01','Strefa Konfekcji','zone',30],
  ['MDM01','Magazyn Dodatków','warehouse',100],
  ['MGW01','Wyroby Gotowe MGW01','warehouse',400],
  ['MGW02','Wyroby Gotowe MGW02','warehouse',400],
  ['MOP01','Magazyn Opakowań','warehouse',150],
  ['MP01','Magazyn Produkcyjny','warehouse',200],
  ['MS01','Magazyn Główny','warehouse',500],
  ['OSIP','Magazyn Zewnętrzny OSiP','warehouse',1000],
  ['PSD','Strefa PSD','zone',40],
  ['R01','Regał R01','rack',80],
  ['R02','Regał R02','rack',80],
  ['R03','Regał R03','rack',80],
  ['R04','Regał R04','rack',80],
  ['R07','Regał R07','rack',80]
];

async function run() {
  const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3307'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'mleczna_droga'
  };

  const conn = await mysql.createConnection(dbConfig);
  try {
    // get existing codes (prefer canonical 'code' then legacy 'kod_lokalizacji')
    const [rows] = await conn.query("SELECT code, kod_lokalizacji FROM warehouseLocation");
    const existing = new Set();
    for (const r of rows) {
      if (r.code) existing.add(r.code.toString());
      if (r.kod_lokalizacji) existing.add(r.kod_lokalizacji.toString());
    }
    console.log('Existing location codes:', Array.from(existing).join(', '));

    const toInsert = desired.filter(d => !existing.has(d[0]));
    if (toInsert.length === 0) {
      console.log('All desired locations already present.');
      return;
    }

    // Insert missing rows using INSERT IGNORE into canonical columns if available
    const values = toInsert.map(t => `(${conn.escape(t[0])}, ${conn.escape(t[1])}, ${conn.escape(t[2])}, ${t[3]})`).join(',\n');
    // Determine if 'code' and 'type' columns exist
    const [cols] = await conn.query("SHOW COLUMNS FROM warehouseLocation");
    const colNames = (cols||[]).map(c=>c.Field);
    let insertSql = '';
    if (colNames.includes('code') && (colNames.includes('type') || colNames.includes('typ'))) {
      const typeCol = colNames.includes('type') ? 'type' : 'typ';
      insertSql = `INSERT IGNORE INTO warehouseLocation (code, name, ${typeCol}, capacity) VALUES ${values};`;
    } else {
      // fallback to legacy columns
      insertSql = `INSERT IGNORE INTO warehouseLocation (kod_lokalizacji, nazwa, typ, pojemnosc) VALUES ${values};`;
    }

    console.log('Inserting missing locations:', toInsert.map(t=>t[0]).join(', '));
    const [res] = await conn.query(insertSql);
    console.log('Inserted rows (affectedRows):', res.affectedRows || 0);
  } finally {
    await conn.end();
  }
}

run().catch(e=>{ console.error(e); process.exit(1); });
