import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

async function initDatabase() {
    const dbConfig = {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '3307'),
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'mleczna_droga'
    };

    console.log('⏳ Inicjalizacja bazy danych...');
    console.log(`   Host: ${dbConfig.host}:${dbConfig.port}`);
    console.log(`   Baza: ${dbConfig.database}`);
    
    const connection = await mysql.createConnection(dbConfig);

    try {
        // Tabela dostaw
        await connection.query(`
            CREATE TABLE IF NOT EXISTS deliveries (
                id VARCHAR(50) PRIMARY KEY,
                orderRef VARCHAR(100),
                supplier VARCHAR(100),
                deliveryDate DATE,
                status VARCHAR(50),
                items JSON,
                createdBy VARCHAR(50),
                createdAt DATETIME,
                requiresLab TINYINT(1) DEFAULT 0,
                warehouseStageCompletedAt DATETIME
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        // Tabela logów systemowych (opcjonalnie dla diagnostyki)
        await connection.query(`
            CREATE TABLE IF NOT EXISTS system_logs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                timestamp DATETIME,
                level VARCHAR(20),
                message TEXT,
                context VARCHAR(100),
                user VARCHAR(50)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        console.log('✅ Baza danych jest gotowa do pracy.');
        // --- Migration: rename existing `locations` (or `llocation`) table to `warehouseLocation` if present ---
        try {
            const [oldTables] = await connection.query(`
                SELECT table_name FROM information_schema.tables
                WHERE table_schema = ? AND table_name IN ('locations', 'llocation')
            `, [dbConfig.database]);

            const [newTableExists] = await connection.query(`
                SELECT table_name FROM information_schema.tables
                WHERE table_schema = ? AND table_name = 'warehouseLocation'
            `, [dbConfig.database]);

            if (oldTables.length > 0 && newTableExists.length === 0) {
                // Rename first found old table to warehouseLocation
                const oldName = oldTables[0].table_name;
                console.log(`🔁 Renaming existing table ${oldName} -> warehouseLocation`);
                await connection.query(`RENAME TABLE \`${oldName}\` TO \`warehouseLocation\``);
            }
        } catch (e) {
            console.warn('⚠️ Migration rename locations -> warehouseLocation failed or not needed:', e.message || e);
        }

        // --- Ensure warehouseLocation table exists (idempotent) ---
        await connection.query(`
            CREATE TABLE IF NOT EXISTS warehouseLocation (
                id INT AUTO_INCREMENT PRIMARY KEY,
                code VARCHAR(50) NOT NULL UNIQUE,
                name VARCHAR(255) NOT NULL,
                type VARCHAR(50) DEFAULT 'zone',
                capacity INT DEFAULT NULL,
                is_locked TINYINT(1) DEFAULT 0,
                is_active TINYINT(1) DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_code (code),
                INDEX idx_type (type)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        // --- Seed default warehouse locations (INSERT IGNORE to avoid duplicates) ---
        const defaultLocations = [
            ['BF_MP01', 'Bufor Produkcyjny', 'zone', 50],
            ['BF_MS01', 'Bufor Przyjęć Surowców', 'zone', 50],
            ['KO01', 'Strefa Konfekcji', 'zone', 30],
            ['MDM01', 'Magazyn Dodatków', 'warehouse', 100],
            ['MGW01', 'Wyroby Gotowe MGW01', 'warehouse', 400],
            ['MGW02', 'Wyroby Gotowe MGW02', 'warehouse', 400],
            ['MOP01', 'Magazyn Opakowań', 'warehouse', 150],
            ['MP01', 'Magazyn Produkcyjny', 'warehouse', 200],
            ['MS01', 'Magazyn Główny', 'warehouse', 500],
            ['OSIP', 'Magazyn Zewnętrzny OSiP', 'warehouse', 1000],
            ['PSD', 'Strefa PSD', 'zone', 40],
            ['R01', 'Regał R01', 'rack', 80],
            ['R02', 'Regał R02', 'rack', 80],
            ['R03', 'Regał R03', 'rack', 80],
            ['R04', 'Regał R04', 'rack', 80],
            ['R07', 'Regał R07', 'rack', 80]
        ];

        for (const loc of defaultLocations) {
            try {
                await connection.query(`INSERT IGNORE INTO warehouseLocation (code, name, type, capacity) VALUES (?, ?, ?, ?)` , loc);
            } catch (e) {
                // ignore individual insert errors
            }
        }
        console.log('✅ Zainicjalizowano domyślne lokalizacje w warehouseLocation');
    } catch (err) {
        console.error('❌ Błąd inicjalizacji bazy:', err.message);
    } finally {
        await connection.end();
    }
}

initDatabase();
