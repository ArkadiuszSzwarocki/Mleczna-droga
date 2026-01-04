import express from 'express';
import mysql from 'mysql2/promise';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

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

console.log(`\n====================================================`);
console.log(`📡 KONFIGURACJA BAZY DANYCH:`);
console.log(`   Host: ${dbConfig.host}:${dbConfig.port}`);
console.log(`   Baza: ${dbConfig.database}`);
console.log(`   Użytkownik: ${dbConfig.user}`);
console.log(`====================================================\n`);

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
        const envPath = path.join(__dirname, '../.env');
        fs.writeFileSync(envPath, envContent);

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
            port: dbConfig.port,
            database: dbConfig.database,
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

// ===== UŻYTKOWNICY (USERS) =====

// GET: Pobieranie wszystkich użytkowników
app.get('/api/users', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM users ORDER BY username');
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Błąd pobierania użytkowników' });
    }
});

// GET: Pobierz jednego użytkownika
app.get('/api/users/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [id]);
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Użytkownik nie znaleziony' });
        }
        res.json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Błąd pobierania użytkownika' });
    }
});

// POST: Tworzenie nowego użytkownika
app.post('/api/users', async (req, res) => {
    const { id, username, password, email, role, subRole, pin, isActive } = req.body;
    try {
        const sql = `INSERT INTO users (id, username, email, role, sub_role, pin, password, isActive, createdAt) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        const params = [
            id || `u-${Date.now()}`,
            username,
            email || null,
            role || 'user',
            subRole || 'AGRO',
            pin || null,
            password || 'temp123',
            isActive !== undefined ? isActive : 1,
            new Date().toISOString()
        ];
        await pool.execute(sql, params);
        res.json({ success: true, insertId: id });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Błąd tworzenia użytkownika' });
    }
});

// PUT: Aktualizacja użytkownika
app.put('/api/users/:id', async (req, res) => {
    const { id } = req.params;
    const { username, email, role, subRole, pin, password, isActive } = req.body;
    try {
        const sql = `UPDATE users SET 
                     username = ?, email = ?, role = ?, sub_role = ?, pin = ?, 
                     password = ?, isActive = ? WHERE id = ?`;
        const params = [
            username,
            email || null,
            role,
            subRole || 'AGRO',
            pin || null,
            password || null,
            isActive !== undefined ? isActive : 1,
            id
        ];
        await pool.execute(sql, params);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Błąd aktualizacji użytkownika' });
    }
});

// DELETE: Usuwanie użytkownika
app.delete('/api/users/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.execute('DELETE FROM users WHERE id = ?', [id]);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Błąd usuwania użytkownika' });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n====================================================`);
    console.log(`🚀 SERWER API DZIAŁA: http://localhost:${PORT}`);
    console.log(`📡 POŁĄCZENIE Z BAZĄ: ${dbConfig.host}:${dbConfig.port}`);
    console.log(`====================================================\n`);
});

export default app;
