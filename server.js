
import express from 'express';
import mysql from 'mysql2/promise';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Konfiguracja bazy danych pobierana ze zmiennych środowiskowych
let dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3307'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'mleczna_droga',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

let pool = mysql.createPool(dbConfig);

// Endpoint do aktualizacji pliku .env i restartu połączenia
app.post('/api/config', async (req, res) => {
    const { host, port, user, password, database } = req.body;
    
    try {
        // 1. Budowanie nowej zawartości pliku .env
        const envContent = `PORT=${process.env.PORT || 5000}
DB_HOST=${host}
DB_PORT=${port}
DB_USER=${user}
DB_PASSWORD=${password}
DB_NAME=${database}`;

        // 2. Zapis do pliku .env
        fs.writeFileSync('.env', envContent);

        // 3. Aktualizacja konfiguracji w pamięci procesu
        dbConfig = {
            ...dbConfig,
            host,
            port: parseInt(port),
            user,
            password,
            database
        };

        // 4. Restart puli połączeń
        await pool.end();
        pool = mysql.createPool(dbConfig);

        console.log('♻️ Zaktualizowano konfigurację bazy danych i zrestartowano pulę połączeń.');
        res.json({ success: true, message: 'Konfiguracja zapisana w .env i odświeżona.' });
    } catch (err) {
        console.error('❌ Błąd aktualizacji .env:', err);
        res.status(500).json({ success: false, message: 'Błąd zapisu konfiguracji.' });
    }
});

// Endpoint Health Check
app.get('/api/health', async (req, res) => {
    try {
        const connection = await pool.getConnection();
        await connection.query('SELECT 1');
        connection.release();
        res.json({ 
            status: 'OK', 
            database: 'connected', 
            host: dbConfig.host,
            timestamp: new Date() 
        });
    } catch (err) {
        res.status(500).json({ status: 'ERROR', database: 'disconnected', message: err.message });
    }
});

// GET: Pobieranie dostaw
app.get('/api/deliveries', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM deliveries ORDER BY createdAt DESC');
        const deliveries = rows.map(row => ({
            ...row,
            items: typeof row.items === 'string' ? JSON.parse(row.items) : row.items
        }));
        res.json(deliveries);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Błąd pobierania danych z bazy' });
    }
});

// POST: Tworzenie nowej dostawy
app.post('/api/deliveries', async (req, res) => {
    const delivery = req.body;
    try {
        const sql = `INSERT INTO deliveries (id, orderRef, supplier, deliveryDate, status, items, createdBy, createdAt, requiresLab) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        const params = [
            delivery.id || `DEL-${Date.now()}`,
            delivery.orderRef,
            delivery.supplier,
            delivery.deliveryDate,
            delivery.status,
            JSON.stringify(delivery.items),
            delivery.createdBy,
            delivery.createdAt || new Date().toISOString(),
            delivery.requiresLab ? 1 : 0
        ];
        await pool.execute(sql, params);
        res.json({ success: true, insertId: delivery.id });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Błąd zapisu w bazie danych' });
    }
});

// PUT: Aktualizacja dostawy
app.put('/api/deliveries/:id', async (req, res) => {
    const { id } = req.params;
    const delivery = req.body;
    try {
        const sql = `UPDATE deliveries SET 
                     orderRef = ?, supplier = ?, deliveryDate = ?, status = ?, 
                     items = ?, requiresLab = ? WHERE id = ?`;
        const params = [
            delivery.orderRef,
            delivery.supplier,
            delivery.deliveryDate,
            delivery.status,
            JSON.stringify(delivery.items),
            delivery.requiresLab ? 1 : 0,
            id
        ];
        await pool.execute(sql, params);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Błąd aktualizacji w bazie danych' });
    }
});

// DELETE: Usuwanie dostawy
app.delete('/api/deliveries/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.execute('DELETE FROM deliveries WHERE id = ?', [id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Błąd usuwania z bazy' });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n====================================================`);
    console.log(`🚀 SERWER API DZIAŁA: http://localhost:${PORT}`);
    console.log(`📡 POŁĄCZENIE Z BAZĄ: ${dbConfig.host}:${dbConfig.port}`);
    console.log(`====================================================\n`);
});
