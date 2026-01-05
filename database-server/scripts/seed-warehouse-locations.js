import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), 'database-server/.env') });

async function seed() {
    const dbConfig = {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '3307'),
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'mleczna_droga'
    };

    const conn = await mysql.createConnection(dbConfig);
    try {
        // Ensure canonical columns exist; if table was renamed from legacy structure, add missing columns
        const [cols] = await conn.query("SHOW COLUMNS FROM warehouseLocation");
        const colNames = (cols || []).map(c => c.Field);
        if (!colNames.includes('code')) {
            console.log('Adding missing canonical columns to warehouseLocation...');
            try {
                await conn.query(`ALTER TABLE warehouseLocation
                    ADD COLUMN IF NOT EXISTS code VARCHAR(50) NULL,
                    ADD COLUMN IF NOT EXISTS name VARCHAR(255) NULL,
                    ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'zone',
                    ADD COLUMN IF NOT EXISTS capacity INT DEFAULT NULL,
                    ADD COLUMN IF NOT EXISTS is_active TINYINT(1) DEFAULT 1`);
            } catch (e) {
                // MySQL < 8 may not support IF NOT EXISTS for ADD COLUMN; try individual adds
                try { await conn.query("ALTER TABLE warehouseLocation ADD COLUMN code VARCHAR(50) NULL"); } catch(e){}
                try { await conn.query("ALTER TABLE warehouseLocation ADD COLUMN name VARCHAR(255) NULL"); } catch(e){}
                try { await conn.query("ALTER TABLE warehouseLocation ADD COLUMN type VARCHAR(50) DEFAULT 'zone'"); } catch(e){}
                try { await conn.query("ALTER TABLE warehouseLocation ADD COLUMN capacity INT DEFAULT NULL"); } catch(e){}
                try { await conn.query("ALTER TABLE warehouseLocation ADD COLUMN is_active TINYINT(1) DEFAULT 1"); } catch(e){}
            }

            // If legacy kolumny exist like kod_lokalizacji / pojemnosc, copy their values into new columns
            const legacyCols = colNames;
            if (legacyCols.includes('kod_lokalizacji')) {
                await conn.query(`UPDATE warehouseLocation SET code = kod_lokalizacji WHERE code IS NULL AND kod_lokalizacji IS NOT NULL`);
            }
            if (legacyCols.includes('nazwa')) {
                await conn.query(`UPDATE warehouseLocation SET name = nazwa WHERE name IS NULL AND nazwa IS NOT NULL`);
            }
            if (legacyCols.includes('pojemnosc')) {
                await conn.query(`UPDATE warehouseLocation SET capacity = pojemnosc WHERE capacity IS NULL AND pojemnosc IS NOT NULL`);
            }
            // Ensure 'type' column exists and copy from legacy 'typ' if present
            try { await conn.query("ALTER TABLE warehouseLocation ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'zone'"); } catch(e) {
                try { await conn.query("ALTER TABLE warehouseLocation ADD COLUMN type VARCHAR(50) DEFAULT 'zone'"); } catch(e){}
            }
            if (legacyCols.includes('typ')) {
                await conn.query(`UPDATE warehouseLocation SET type = typ WHERE (type IS NULL OR type = '') AND typ IS NOT NULL`);
            }
        }

        // Re-fetch columns after migration attempts and log them for debugging
        const [colsAfter] = await conn.query("SHOW COLUMNS FROM warehouseLocation");
        const colNamesAfter = (colsAfter || []).map(c => c.Field);
        console.log('warehouseLocation columns after migration attempt:', colNamesAfter.join(', '));

        const sql = `INSERT IGNORE INTO warehouseLocation (code, name, typ, capacity) VALUES
 ('BF_MP01','Bufor Produkcyjny','zone',50),
 ('BF_MS01','Bufor Przyjęć Surowców','zone',50),
 ('KO01','Strefa Konfekcji','zone',30),
 ('MDM01','Magazyn Dodatków','warehouse',100),
 ('MGW01','Wyroby Gotowe MGW01','warehouse',400),
 ('MGW02','Wyroby Gotowe MGW02','warehouse',400),
 ('MOP01','Magazyn Opakowań','warehouse',150),
 ('MP01','Magazyn Produkcyjny','warehouse',200),
 ('MS01','Magazyn Główny','warehouse',500),
 ('OSIP','Magazyn Zewnętrzny OSiP','warehouse',1000),
 ('PSD','Strefa PSD','zone',40),
 ('R01','Regał R01','rack',80),
 ('R02','Regał R02','rack',80),
 ('R03','Regał R03','rack',80),
 ('R04','Regał R04','rack',80),
 ('R07','Regał R07','rack',80);`;

        const [res] = await conn.query(sql);
        console.log('Inserted rows (affectedRows):', (res && res.affectedRows) || 0);
    } catch (err) {
        console.error('Error seeding warehouseLocation:', err.message || err);
        process.exit(1);
    } finally {
        await conn.end();
    }
}

seed();
