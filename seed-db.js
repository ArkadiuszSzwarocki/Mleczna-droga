
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function init() {
    const dbConfig = {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '3307'),
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'mleczna_droga'
    };

    console.log('⏳ Inicjalizacja bazy danych...');
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
    } catch (err) {
        console.error('❌ Błąd inicjalizacji bazy:', err.message);
    } finally {
        await connection.end();
    }
}

init();
