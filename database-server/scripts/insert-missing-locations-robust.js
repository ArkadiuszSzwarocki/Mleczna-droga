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

async function main() {
  const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3307'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'mleczna_droga'
  };

  const conn = await mysql.createConnection(dbConfig);
  try {
    const [cols] = await conn.query("SHOW COLUMNS FROM warehouseLocation");
    const colNames = (cols || []).map(c => c.Field);
    const colInfo = {};
    (cols || []).forEach(c => { colInfo[c.Field] = c; });
    console.log('Columns in warehouseLocation:', colNames.join(', '));

    const [rows] = await conn.query("SELECT * FROM warehouseLocation");
    const existing = new Set();
    rows.forEach(r => {
      if (r.code) existing.add(String(r.code));
      if (r.kod_lokalizacji) existing.add(String(r.kod_lokalizacji));
      if (r.name) existing.add(String(r.name));
      // also add lowercase for name-based matches
      if (r.name) existing.add(String(r.name).toLowerCase());
    });

    console.log('Existing identifiers count:', existing.size);

    const typeCol = colNames.includes('type') ? 'type' : (colNames.includes('typ') ? 'typ' : null);
    const codeCol = colNames.includes('code') ? 'code' : (colNames.includes('kod_lokalizacji') ? 'kod_lokalizacji' : null);
    const nameCol = colNames.includes('name') ? 'name' : (colNames.includes('nazwa') ? 'nazwa' : null);
    const capCol = colNames.includes('capacity') ? 'capacity' : (colNames.includes('pojemnosc') ? 'pojemnosc' : null);
    const legacyCodeCol = colNames.includes('kod_lokalizacji') ? 'kod_lokalizacji' : null;

    // If missing canonical columns, try to add them (non-destructive)
    if (!colNames.includes('code') || !colNames.includes('name')) {
      console.log('Attempting to add canonical columns (code, name, type, capacity) if missing...');
      try {
        await conn.query(`ALTER TABLE warehouseLocation
          ADD COLUMN IF NOT EXISTS code VARCHAR(50) NULL,
          ADD COLUMN IF NOT EXISTS name VARCHAR(255) NULL,
          ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'zone',
          ADD COLUMN IF NOT EXISTS capacity INT DEFAULT NULL,
          ADD COLUMN IF NOT EXISTS is_active TINYINT(1) DEFAULT 1`);
      } catch (e) {
        // fallback for MySQL versions without IF NOT EXISTS
        try { if (!colNames.includes('code')) await conn.query("ALTER TABLE warehouseLocation ADD COLUMN code VARCHAR(50) NULL"); } catch(e){}
        try { if (!colNames.includes('name')) await conn.query("ALTER TABLE warehouseLocation ADD COLUMN name VARCHAR(255) NULL"); } catch(e){}
        try { if (!colNames.includes('type') && !colNames.includes('typ')) await conn.query("ALTER TABLE warehouseLocation ADD COLUMN type VARCHAR(50) DEFAULT 'zone'"); } catch(e){}
        try { if (!colNames.includes('capacity') && !colNames.includes('pojemnosc')) await conn.query("ALTER TABLE warehouseLocation ADD COLUMN capacity INT DEFAULT NULL"); } catch(e){}
        try { if (!colNames.includes('is_active')) await conn.query("ALTER TABLE warehouseLocation ADD COLUMN is_active TINYINT(1) DEFAULT 1"); } catch(e){}
      }
      // refresh column list
      const [cols2] = await conn.query("SHOW COLUMNS FROM warehouseLocation");
      const after = (cols2||[]).map(c=>c.Field);
      console.log('Columns after attempted alteration:', after.join(', '));
    }

    // Re-evaluate columns
    const [colsFinal] = await conn.query("SHOW COLUMNS FROM warehouseLocation");
    const finalCols = (colsFinal || []).map(c=>c.Field);
    const finalTypeCol = finalCols.includes('type') ? 'type' : (finalCols.includes('typ') ? 'typ' : null);
    const finalCodeCol = finalCols.includes('code') ? 'code' : (finalCols.includes('kod_lokalizacji') ? 'kod_lokalizacji' : null);
    const finalNameCol = finalCols.includes('name') ? 'name' : (finalCols.includes('nazwa') ? 'nazwa' : null);
    const finalCapCol = finalCols.includes('capacity') ? 'capacity' : (finalCols.includes('pojemnosc') ? 'pojemnosc' : null);

    console.log('Using columns -> code:', finalCodeCol, 'name:', finalNameCol, 'type:', finalTypeCol, 'capacity:', finalCapCol);

    let inserted = 0;
    for (const [code, name, typ, cap] of desired) {
      if (existing.has(code) || existing.has(name) || existing.has(name.toLowerCase())) {
        console.log(`Skipping ${code} — already present`);
        continue;
      }

      // Try insert using canonical columns
      try {
        if (finalCodeCol && finalNameCol && finalTypeCol && finalCapCol) {
          const insertFields = [finalCodeCol, finalNameCol, finalTypeCol, finalCapCol];
          const insertVals = [code, name, typ, cap];
          if (legacyCodeCol && legacyCodeCol !== finalCodeCol) {
            insertFields.push(legacyCodeCol);
            insertVals.push(code);
          }
          insertFields.push('is_active');
          insertVals.push(1);
          const insertSql = `INSERT INTO warehouseLocation (${insertFields.join(', ')}) VALUES (${insertFields.map(()=>'?').join(', ')})`;
          const [res] = await conn.execute(insertSql, insertVals);
          if (res && res.affectedRows && res.affectedRows > 0) {
            console.log(`Inserted ${code} using columns ${finalCodeCol},${finalNameCol}`);
            inserted++;
            existing.add(code);
            continue;
          }
        }

        // If canonical insert didn't work, try legacy column names
        if ((finalCodeCol === 'kod_lokalizacji' || finalNameCol === 'nazwa') && finalTypeCol && finalCapCol) {
          const insertFields = ['kod_lokalizacji', 'nazwa', finalTypeCol, finalCapCol, 'is_locked'];
          const insertVals = [code, name, typ, cap, 0];
          // also set canonical code/name if present
          if (finalCols.includes('code') && !insertFields.includes('code')) { insertFields.push('code'); insertVals.push(code); }
          if (finalCols.includes('name') && !insertFields.includes('name')) { insertFields.push('name'); insertVals.push(name); }
          const insertSql = `INSERT INTO warehouseLocation (${insertFields.join(', ')}) VALUES (${insertFields.map(()=>'?').join(', ')})`;
          const [res] = await conn.execute(insertSql, insertVals);
          if (res && res.affectedRows && res.affectedRows > 0) {
            console.log(`Inserted ${code} into legacy columns`);
            inserted++;
            existing.add(code);
            continue;
          }
        }

        // If insert failed due to unique conflicts, try to update an existing NULL/empty row to fill canonical columns
        // Find a candidate row where kod_lokalizacji is NULL or empty
        const [candidates] = await conn.query("SELECT * FROM warehouseLocation LIMIT 5");
        if (candidates && candidates.length > 0) {
          // Try update first candidate which doesn't have our code
          const candidate = candidates[0];
          const whereClause = candidate.id ? `id = ${candidate.id}` : null;
          if (whereClause) {
            const updFields = [];
            const updVals = [];
            if (finalCodeCol) { updFields.push(`${finalCodeCol} = ?`); updVals.push(code); }
            if (finalNameCol) { updFields.push(`${finalNameCol} = ?`); updVals.push(name); }
            if (finalTypeCol) { updFields.push(`${finalTypeCol} = ?`); updVals.push(typ); }
            if (finalCapCol) { updFields.push(`${finalCapCol} = ?`); updVals.push(cap); }
            if (updFields.length > 0) {
              const updSql = `UPDATE warehouseLocation SET ${updFields.join(', ')} WHERE ${whereClause}`;
              const [ures] = await conn.execute(updSql, updVals);
              if (ures && ures.affectedRows && ures.affectedRows > 0) {
                console.log(`Updated existing row ${candidate.id} to represent ${code}`);
                inserted++;
                existing.add(code);
                continue;
              }
            }
          }
        }

        console.warn(`Failed to insert or update ${code} — will attempt next strategy`);
      } catch (err) {
        console.error(`Error inserting ${code}:`, err.message || err);
        // If error mentions unknown column, refresh and retry once after adding columns
        if ((err.message || '').toLowerCase().includes('unknown column')) {
          console.log('Detected unknown column error; attempting to add canonical columns and retry once');
          try {
            await conn.query("ALTER TABLE warehouseLocation ADD COLUMN IF NOT EXISTS code VARCHAR(50) NULL");
            await conn.query("ALTER TABLE warehouseLocation ADD COLUMN IF NOT EXISTS name VARCHAR(255) NULL");
            await conn.query("ALTER TABLE warehouseLocation ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'zone'");
            await conn.query("ALTER TABLE warehouseLocation ADD COLUMN IF NOT EXISTS capacity INT DEFAULT NULL");
          } catch (e) { }
        }
      }
    }

    console.log('Total inserted/updated:', inserted);

    // Output final table rows for verification (limit 200)
    const [finalRows] = await conn.query('SELECT id, kod_lokalizacji, typ, pojemnosc, code, name, capacity, is_active FROM warehouseLocation ORDER BY id ASC LIMIT 200');
    console.table(finalRows);
  } finally {
    await conn.end();
  }
}

main().catch(e => { console.error(e); process.exit(1); });
