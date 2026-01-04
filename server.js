
import express from 'express';
import mysql from 'mysql2/promise';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// JWT Secret - pobierz ze zmiennych środowiskowych lub użyj domyślny
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production-2024';
const BCRYPT_ROUNDS = 10;

// Middleware do weryfikacji JWT
const verifyToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    console.log(`🔐 verifyToken: token=${token ? 'YES' : 'NO'}`);
    
    if (!token) {
        console.log('❌ verifyToken: Brak tokenu');
        return res.status(401).json({ error: 'Brak tokenu autoryzacji' });
    }
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.userId = decoded.id;
        req.userRole = decoded.role;
        console.log(`✅ verifyToken: userId=${req.userId}, role=${req.userRole}`);
        next();
    } catch (err) {
        console.log(`❌ verifyToken: Invalid token - ${err.message}`);
        return res.status(401).json({ error: 'Nieważny token' });
    }
};

// Funkcja do hashowania hasła
const hashPassword = async (password) => {
    return await bcrypt.hash(password, BCRYPT_ROUNDS);
};

// Funkcja do porównania hasła
const comparePassword = async (password, hash) => {
    return await bcrypt.compare(password, hash);
};

// Funkcja do generowania JWT
const generateToken = (user) => {
    return jwt.sign(
        { 
            id: user.id, 
            username: user.username, 
            role: user.role_name,
            isTemporaryPassword: user.is_temporary_password
        },
        JWT_SECRET,
        { expiresIn: '24h' }
    );
};

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

// Tworzy tabelę users jeśli nie istnieje, z polami zgodnymi z frontendem (email, is_active)
async function initUsersTable() {
    try {
        // Tworzymy tabelę roles jeśli nie istnieje
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS roles (
                id VARCHAR(50) PRIMARY KEY,
                label VARCHAR(100) NOT NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci;
        `);
        
        // Poprawiamy collation dla istniejącej tabeli roles
        try {
            await pool.execute(`ALTER TABLE roles CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
        } catch (err) {
            // Mogła się już zmienić
        }
        console.log('✅ Tabela roles jest gotowa');
        
        // Tworzymy tabelę permissions jeśli nie istnieje
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS permissions (
                id VARCHAR(50) PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci;
        `);
        console.log('✅ Tabela permissions jest gotowa');
        
        // Tworzymy tabelę role_permissions (Many-to-Many)
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS role_permissions (
                role_id VARCHAR(50),
                permission VARCHAR(50),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (role_id, permission),
                FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci;
        `);
        console.log('✅ Tabela role_permissions jest gotowa');
        
        // Tworzymy tabelę sub_roles jeśli nie istnieje
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS sub_roles (
                id VARCHAR(50) PRIMARY KEY,
                name VARCHAR(100) NOT NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci;
        `);
        
        // Poprawiamy collation dla istniejącej tabeli sub_roles
        try {
            await pool.execute(`ALTER TABLE sub_roles CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
        } catch (err) {
            // Mogła się już zmienić
        }
        console.log('✅ Tabela sub_roles jest gotowa');
        
        // Tworzymy tabelę users z nowymi polami (bez FK na razie) jeśli nie istnieje
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(100) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                role_id VARCHAR(50),
                sub_role_id VARCHAR(50) DEFAULT 'AGRO',
                pin VARCHAR(10) DEFAULT '0000',
                email VARCHAR(255),
                is_active TINYINT(1) DEFAULT 1,
                is_temporary_password TINYINT(1) DEFAULT 1,
                password_last_changed DATETIME,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_username (username),
                INDEX idx_role (role_id),
                INDEX idx_active (is_active)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci;
        `);
        console.log('✅ Tabela users jest gotowa');
        
        // Wstawianie ról
        const roles = [
            { id: 'admin', label: 'Administrator' },
            { id: 'planista', label: 'Planista' },
            { id: 'magazynier', label: 'Magazynier' },
            { id: 'kierownik_magazynu', label: 'Kierownik Magazynu' },
            { id: 'lab', label: 'Laborant' },
            { id: 'operator_psd', label: 'Operator PSD' },
            { id: 'operator_agro', label: 'Operator AGRO' },
            { id: 'operator_procesu', label: 'Operator Procesu' },
            { id: 'boss', label: 'Szef' },
            { id: 'lider', label: 'Lider' },
            { id: 'user', label: 'Użytkownik' }
        ];
        
        for (const role of roles) {
            try {
                await pool.execute('INSERT INTO roles (id, label) VALUES (?, ?)', [role.id, role.label]);
            } catch (err) {
                // Rola już istnieje
            }
        }
        console.log('✅ Role wstawione do bazy');
        
        // Wstawianie sub_roles (oddziałów)
        const subRoles = [
            { id: 'AGRO', name: 'Oddział Produkcji Agro (Centrala)' },
            { id: 'OSIP', name: 'Oddział OSiP (Magazyn Zewnętrzny)' }
        ];
        
        for (const sr of subRoles) {
            try {
                await pool.execute('INSERT INTO sub_roles (id, name) VALUES (?, ?)', [sr.id, sr.name]);
            } catch (err) {
                // Sub-role już istnieje
            }
        }
        console.log('✅ Oddziały (sub_roles) wstawione do bazy');
        
        // Wstawianie uprawnień (Permissions)
        const permissions = [
            { id: 'manage_users', name: 'Zarządzanie użytkownikami' },
            { id: 'manage_permissions', name: 'Zarządzanie uprawnieniami' },
            { id: 'manage_system_settings', name: 'Ustawienia systemowe' },
            { id: 'manage_products', name: 'Katalog produktów' },
            { id: 'manage_production_stations', name: 'Stacje zasypowe' },
            { id: 'create_delivery', name: 'Tworzenie dostaw' },
            { id: 'process_delivery_lab', name: 'Badania laboratoryjne' },
            { id: 'process_delivery_warehouse', name: 'Przyjęcia magazynowe' },
            { id: 'manage_deliveries', name: 'Zarządzanie dostawami' },
            { id: 'plan_production_agro', name: 'Planowanie AGRO' },
            { id: 'execute_production_agro', name: 'Realizacja AGRO' },
            { id: 'plan_production_psd', name: 'Planowanie PSD' },
            { id: 'execute_production_psd', name: 'Realizacja PSD' },
            { id: 'plan_mixing', name: 'Planowanie Miksowania' },
            { id: 'execute_mixing', name: 'Realizacja Miksowania' },
            { id: 'plan_dispatch_orders', name: 'Planowanie Wydań' },
            { id: 'manage_dispatch_orders', name: 'Realizacja Wydań (Rampa)' },
            { id: 'process_analysis', name: 'Badania NIRS' },
            { id: 'manage_adjustments', name: 'Zarządzanie dosypkami' },
            { id: 'manage_pallet_lock', name: 'Blokowanie/Zwalnianie palet' },
            { id: 'extend_expiry_date', name: 'Przedłużanie terminów ważności' },
            { id: 'plan_internal_transfers', name: 'Planowanie transferów OSiP' },
            { id: 'manage_internal_transfers', name: 'Realizacja transferów OSiP' }
        ];
        
        for (const perm of permissions) {
            try {
                await pool.execute('INSERT INTO permissions (id, name) VALUES (?, ?)', [perm.id, perm.name]);
            } catch (err) {
                // Uprawnienie już istnieje
            }
        }
        console.log('✅ Uprawnienia (permissions) wstawione do bazy');
        
        // Domyślne mapowanie uprawnień dla wybranych ról
        const defaultRolePermissions = [
            // Magazynier
            { role_id: 'magazynier', permission: 'create_delivery' },
            { role_id: 'magazynier', permission: 'process_delivery_warehouse' },
            { role_id: 'magazynier', permission: 'execute_production_agro' },
            { role_id: 'magazynier', permission: 'manage_dispatch_orders' },
            { role_id: 'magazynier', permission: 'manage_internal_transfers' },
            // Laborant
            { role_id: 'lab', permission: 'process_delivery_lab' },
            { role_id: 'lab', permission: 'process_analysis' },
            { role_id: 'lab', permission: 'manage_pallet_lock' },
            // Planista
            { role_id: 'planista', permission: 'plan_production_agro' },
            { role_id: 'planista', permission: 'plan_production_psd' },
            { role_id: 'planista', permission: 'plan_mixing' },
            { role_id: 'planista', permission: 'plan_dispatch_orders' },
            { role_id: 'planista', permission: 'plan_internal_transfers' }
        ];
        
        for (const rp of defaultRolePermissions) {
            try {
                await pool.execute('INSERT INTO role_permissions (role_id, permission) VALUES (?, ?)', [rp.role_id, rp.permission]);
            } catch (err) {
                // Mapowanie już istnieje
            }
        }
        console.log('✅ Domyślne uprawnienia ról (role_permissions) wstawione do bazy');
        
        // ==================== TABELE SYSTEMU DOSTAW ====================
        
        // UWAGA: NIE USUWAĆ TABEL W PRODUKCJI - dane byłyby tracone przy każdym restarcie!
        // Usunięcie starych tabel (jeśli istnieją) - TYLKO DO TESTÓW/DEVELOPMENTU
        // console.log('🔄 Usuwanie starych tabel dostaw...');
        // await pool.execute('DROP TABLE IF EXISTS delivery_correction_log');
        // await pool.execute('DROP TABLE IF EXISTS pallet_location_history');
        // await pool.execute('DROP TABLE IF EXISTS delivery_documents');
        // await pool.execute('DROP TABLE IF EXISTS delivery_lab_results');
        // await pool.execute('DROP TABLE IF EXISTS delivery_items');
        // await pool.execute('DROP TABLE IF EXISTS deliveries');
        // await pool.execute('DROP TABLE IF EXISTS suppliers');
        // console.log('✅ Stare tabele dostaw usunięte');
        
        // Tabela dostawców
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS suppliers (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                nip VARCHAR(15) UNIQUE,
                address TEXT,
                city VARCHAR(100),
                postal_code VARCHAR(10),
                country VARCHAR(100) DEFAULT 'Polska',
                contact_person VARCHAR(255),
                phone VARCHAR(20),
                email VARCHAR(255),
                notes TEXT,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_name (name),
                INDEX idx_nip (nip),
                INDEX idx_active (is_active)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci;
        `);
        console.log('✅ Tabela suppliers jest gotowa');
        
        // Tabela główna dostaw (nagłówek)
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS deliveries (
                id VARCHAR(50) PRIMARY KEY,
                order_ref VARCHAR(100),
                supplier_id INT,
                supplier_name VARCHAR(255),
                delivery_date DATE,
                target_warehouse VARCHAR(50) DEFAULT 'BF_MS01',
                status ENUM('REGISTRATION', 'PENDING_LAB', 'PENDING_WAREHOUSE', 'COMPLETED', 'ARCHIVED') DEFAULT 'REGISTRATION',
                requires_lab BOOLEAN DEFAULT FALSE,
                created_by VARCHAR(100),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                completed_at TIMESTAMP NULL,
                completed_by VARCHAR(100),
                notes TEXT,
                INDEX idx_status (status),
                INDEX idx_supplier (supplier_id),
                INDEX idx_date (delivery_date),
                INDEX idx_created_at (created_at),
                FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci;
        `);
        console.log('✅ Tabela deliveries jest gotowa');
        
        // Tabela pozycji dostawy (palety)
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS delivery_items (
                id VARCHAR(50) PRIMARY KEY,
                delivery_id VARCHAR(50) NOT NULL,
                product_name VARCHAR(255) NOT NULL,
                product_code VARCHAR(100),
                batch_number VARCHAR(100),
                position INT DEFAULT 0,
                packaging_type VARCHAR(50) DEFAULT 'bags',
                net_weight DECIMAL(10,2) DEFAULT 0,
                weight_per_bag DECIMAL(10,2),
                units_per_pallet INT,
                unit VARCHAR(10) DEFAULT 'kg',
                quantity INT DEFAULT 1,
                supplier_batch VARCHAR(100),
                production_date DATE,
                expiry_date DATE,
                pallet_id VARCHAR(50) UNIQUE,
                location VARCHAR(50) DEFAULT 'BF_MS01',
                is_blocked BOOLEAN DEFAULT FALSE,
                block_reason VARCHAR(255),
                lab_notes TEXT,
                label_printed BOOLEAN DEFAULT FALSE,
                label_printed_at TIMESTAMP NULL,
                label_printed_by VARCHAR(100),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_delivery (delivery_id),
                INDEX idx_pallet (pallet_id),
                INDEX idx_location (location),
                INDEX idx_blocked (is_blocked),
                FOREIGN KEY (delivery_id) REFERENCES deliveries(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci;
        `);
        console.log('✅ Tabela delivery_items jest gotowa');
        
        // Migracja: Dodaj brakujące kolumny do tabeli delivery_items jeśli nie istnieją
        try {
            await pool.execute(`ALTER TABLE delivery_items ADD COLUMN IF NOT EXISTS batch_number VARCHAR(100)`);
            await pool.execute(`ALTER TABLE delivery_items ADD COLUMN IF NOT EXISTS position INT DEFAULT 0`);
            await pool.execute(`ALTER TABLE delivery_items MODIFY COLUMN packaging_type VARCHAR(50) DEFAULT 'bags'`);
            await pool.execute(`ALTER TABLE delivery_items CHANGE COLUMN weight_net net_weight DECIMAL(10,2) DEFAULT 0`);
            await pool.execute(`ALTER TABLE delivery_items ADD COLUMN IF NOT EXISTS weight_per_bag DECIMAL(10,2)`);
            await pool.execute(`ALTER TABLE delivery_items ADD COLUMN IF NOT EXISTS units_per_pallet INT`);
            await pool.execute(`ALTER TABLE delivery_items ADD COLUMN IF NOT EXISTS unit VARCHAR(10) DEFAULT 'kg'`);
            await pool.execute(`ALTER TABLE delivery_items ADD COLUMN IF NOT EXISTS lab_notes TEXT`);
            console.log('✅ Kolumny tabeli delivery_items zaktualizowane');
        } catch (err) {
            // Kolumny mogą już istnieć
            console.log('⚠️ Niektóre kolumny tabeli delivery_items już istnieją lub występuje błąd:', err.message);
        }
        
        // Tabela wyników laboratoryjnych
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS delivery_lab_results (
                id INT AUTO_INCREMENT PRIMARY KEY,
                delivery_item_id VARCHAR(50) NOT NULL,
                delivery_id VARCHAR(50) NOT NULL,
                parameter_name VARCHAR(100) NOT NULL,
                parameter_value DECIMAL(10,3),
                parameter_unit VARCHAR(20),
                min_range DECIMAL(10,3),
                max_range DECIMAL(10,3),
                is_within_range BOOLEAN,
                tested_by VARCHAR(100),
                tested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                notes TEXT,
                INDEX idx_item (delivery_item_id),
                INDEX idx_delivery (delivery_id),
                INDEX idx_parameter (parameter_name),
                FOREIGN KEY (delivery_item_id) REFERENCES delivery_items(id) ON DELETE CASCADE,
                FOREIGN KEY (delivery_id) REFERENCES deliveries(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci;
        `);
        console.log('✅ Tabela delivery_lab_results jest gotowa');
        
        // Tabela dokumentów dostawy (certyfikaty, zdjęcia)
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS delivery_documents (
                id INT AUTO_INCREMENT PRIMARY KEY,
                delivery_id VARCHAR(50) NOT NULL,
                delivery_item_id VARCHAR(50),
                document_type ENUM('CERTYFIKAT', 'ZDJĘCIE', 'WZ', 'FAKTURA', 'INNE') DEFAULT 'INNE',
                file_name VARCHAR(255) NOT NULL,
                file_path TEXT NOT NULL,
                file_size INT,
                mime_type VARCHAR(100),
                uploaded_by VARCHAR(100),
                uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                notes TEXT,
                INDEX idx_delivery (delivery_id),
                INDEX idx_item (delivery_item_id),
                INDEX idx_type (document_type),
                FOREIGN KEY (delivery_id) REFERENCES deliveries(id) ON DELETE CASCADE,
                FOREIGN KEY (delivery_item_id) REFERENCES delivery_items(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci;
        `);
        console.log('✅ Tabela delivery_documents jest gotowa');
        
        // Tabela historii przesunięć palet (lokalizacja)
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS pallet_location_history (
                id INT AUTO_INCREMENT PRIMARY KEY,
                pallet_id VARCHAR(50) NOT NULL,
                from_location VARCHAR(50),
                to_location VARCHAR(50) NOT NULL,
                moved_by VARCHAR(100) NOT NULL,
                moved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                reason VARCHAR(255),
                notes TEXT,
                INDEX idx_pallet (pallet_id),
                INDEX idx_from (from_location),
                INDEX idx_to (to_location),
                INDEX idx_moved_at (moved_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci;
        `);
        console.log('✅ Tabela pallet_location_history jest gotowa');
        
        // Tabela logu korekt (dla zamkniętych dostaw)
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS delivery_correction_log (
                id INT AUTO_INCREMENT PRIMARY KEY,
                delivery_id VARCHAR(50) NOT NULL,
                field_name VARCHAR(100) NOT NULL,
                old_value TEXT,
                new_value TEXT,
                corrected_by VARCHAR(100) NOT NULL,
                corrected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                reason TEXT,
                INDEX idx_delivery (delivery_id),
                INDEX idx_corrected_at (corrected_at),
                FOREIGN KEY (delivery_id) REFERENCES deliveries(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci;
        `);
        console.log('✅ Tabela delivery_correction_log jest gotowa');
        
    } catch (err) {
        console.error('❌ Błąd inicjalizacji tabel:', err.message);
    }
}

// Endpoint do aktualizacji pliku .env i restartu połączenia
app.post('/api/config', async (req, res) => {
    const { host, port, user, password, database } = req.body;
    
    try {
        // 1. Budowanie nowej zawartości pliku .env
        const envContent = `PORT=${process.env.PORT || 5001}
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

// ==================== ENDPOINTY DOSTAWCÓW ====================

// GET: Pobieranie wszystkich dostawców
app.get('/api/suppliers', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT * FROM suppliers 
            WHERE is_active = TRUE 
            ORDER BY name ASC
        `);
        res.json(rows);
    } catch (err) {
        console.error('❌ Błąd pobierania dostawców:', err);
        res.status(500).json({ error: 'Błąd pobierania dostawców' });
    }
});

// POST: Tworzenie nowego dostawcy
app.post('/api/suppliers', async (req, res) => {
    const { name, nip, address, city, postal_code, country, contact_person, phone, email, notes } = req.body;
    try {
        const [result] = await pool.execute(`
            INSERT INTO suppliers (name, nip, address, city, postal_code, country, contact_person, phone, email, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [name, nip, address, city, postal_code, country || 'Polska', contact_person, phone, email, notes]);
        
        res.json({ success: true, id: result.insertId });
    } catch (err) {
        console.error('❌ Błąd tworzenia dostawcy:', err);
        res.status(500).json({ error: 'Błąd tworzenia dostawcy' });
    }
});

// PUT: Aktualizacja dostawcy
app.put('/api/suppliers/:id', async (req, res) => {
    const { id } = req.params;
    const { name, nip, address, city, postal_code, country, contact_person, phone, email, notes } = req.body;
    try {
        await pool.execute(`
            UPDATE suppliers 
            SET name = ?, nip = ?, address = ?, city = ?, postal_code = ?, 
                country = ?, contact_person = ?, phone = ?, email = ?, notes = ?
            WHERE id = ?
        `, [name, nip, address, city, postal_code, country, contact_person, phone, email, notes, id]);
        
        res.json({ success: true });
    } catch (err) {
        console.error('❌ Błąd aktualizacji dostawcy:', err);
        res.status(500).json({ error: 'Błąd aktualizacji dostawcy' });
    }
});

// ==================== ENDPOINTY DOSTAW ====================

// GET: Pobieranie dostaw (z filtrowaniem po statusie)
app.get('/api/deliveries', async (req, res) => {
    const { status, archived } = req.query;
    try {
        let query = 'SELECT d.*, s.name as supplier_name FROM deliveries d LEFT JOIN suppliers s ON d.supplier_id = s.id';
        const params = [];
        const conditions = [];
        
        if (status) {
            conditions.push('d.status = ?');
            params.push(status);
        }
        
        if (archived === 'true') {
            conditions.push('d.status = ?');
            params.push('ARCHIVED');
        } else {
            conditions.push('d.status != ?');
            params.push('ARCHIVED');
        }
        
        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }
        
        query += ' ORDER BY d.created_at DESC';
        
        const [rows] = await pool.query(query, params);
        
        // Pobierz pozycje (items) dla każdej dostawy
        for (let delivery of rows) {
            const [items] = await pool.query(
                'SELECT * FROM delivery_items WHERE delivery_id = ? ORDER BY created_at ASC',
                [delivery.id]
            );
            delivery.items = items;
        }
        
        res.json(rows);
    } catch (err) {
        console.error('❌ Błąd pobierania dostaw:', err);
        res.status(500).json({ error: 'Błąd pobierania dostaw' });
    }
});

// GET: Pobieranie pojedynczej dostawy z pozycjami
app.get('/api/deliveries/:id', async (req, res) => {
    const { id } = req.params;
    try {
        // Pobierz nagłówek dostawy
        const [deliveries] = await pool.query(`
            SELECT d.*, s.name as supplier_name 
            FROM deliveries d 
            LEFT JOIN suppliers s ON d.supplier_id = s.id 
            WHERE d.id = ?
        `, [id]);
        
        if (deliveries.length === 0) {
            return res.status(404).json({ error: 'Dostawa nie znaleziona' });
        }
        
        const delivery = deliveries[0];
        
        // Pobierz pozycje dostawy
        const [items] = await pool.query(`
            SELECT * FROM delivery_items WHERE delivery_id = ? ORDER BY created_at ASC
        `, [id]);
        
        delivery.items = items;
        
        res.json(delivery);
    } catch (err) {
        console.error('❌ Błąd pobierania dostawy:', err);
        res.status(500).json({ error: 'Błąd pobierania dostawy' });
    }
});

// POST: Tworzenie nowej dostawy (Etap 1: REJESTRACJA)
app.post('/api/deliveries', async (req, res) => {
    const { orderRef, supplierId, supplierName, deliveryDate, targetWarehouse, items, createdBy, notes, status } = req.body;
    
    try {
        const deliveryId = `DEL-${Date.now()}`;
        
        // Sprawdź czy dostawy wymaga laboratorium (big_bag lub bags)
        const requiresLab = items.some(item => 
            item.packaging_type === 'big_bag' || item.packaging_type === 'bags'
        );
        
        const deliveryStatus = status || (requiresLab ? 'PENDING_LAB' : 'PENDING_WAREHOUSE');
        
        // Konwertuj undefined na null
        const safeSupplierIdterId = supplierId === undefined ? null : supplierId;
        const safeSupplierName = supplierName || '';
        const safeNotes = notes || '';
        
        // Wstaw nagłówek dostawy
        await pool.execute(`
            INSERT INTO deliveries 
            (id, order_ref, supplier_id, supplier_name, delivery_date, target_warehouse, 
             status, requires_lab, created_by, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [deliveryId, orderRef, safeSupplierIdterId, safeSupplierName, deliveryDate, targetWarehouse || 'BF_MS01',
            deliveryStatus, requiresLab, createdBy, safeNotes]);
        
        // Wstaw pozycje dostawy
        for (const item of items) {
            const itemId = item.id || `ITEM-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            const isBlocked = item.packaging_type === 'big_bag' || item.packaging_type === 'bags';
            const blockReason = item.is_blocked ? (item.block_reason || 'Auto blokada dostawy - wymaga laboratorium') : null;
            
            await pool.execute(`
                INSERT INTO delivery_items 
                (id, delivery_id, position, product_name, product_code, batch_number, 
                 packaging_type, net_weight, unit, weight_per_bag, units_per_pallet,
                 production_date, expiry_date, location, is_blocked, block_reason, lab_notes)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                itemId, deliveryId, item.position || 0, item.product_name, item.product_code || '',
                item.batch_number || '', item.packaging_type || 'bags', item.net_weight || 0,
                item.unit || 'kg', item.weight_per_bag || null, item.units_per_pallet || null,
                item.production_date || null, item.expiry_date || null, targetWarehouse || 'BF_MS01',
                item.is_blocked || isBlocked, blockReason, item.lab_notes || null
            ]);
        }
        
        console.log(`✅ Utworzono dostawę ${deliveryId} ze statusem ${deliveryStatus}`);
        res.json({ success: true, deliveryId, status: deliveryStatus });
    } catch (err) {
        console.error('❌ Błąd tworzenia dostawy:', err);
        res.status(500).json({ error: 'Błąd tworzenia dostawy' });
    }
});

// PUT: Aktualizacja dostawy
app.put('/api/deliveries/:id', async (req, res) => {
    const { id } = req.params;
    const { orderRef, supplierId, supplierName, deliveryDate, targetWarehouse, status, notes, items } = req.body;
    
    try {
        // Konwertuj undefined na null
        const safeSupplierIdterId = supplierId === undefined ? null : supplierId;
        const safeSupplierName = supplierName || '';
        const safeOrderRef = orderRef || '';
        const safeTargetWarehouse = targetWarehouse || 'BF_MS01';
        const safeStatus = status || 'REGISTRATION';
        const safeNotes = notes || '';
        
        // Aktualizuj nagłówek dostawy
        await pool.execute(`
            UPDATE deliveries 
            SET order_ref = ?, supplier_id = ?, supplier_name = ?, delivery_date = ?, 
                target_warehouse = ?, status = ?, notes = ?
            WHERE id = ?
        `, [safeOrderRef, safeSupplierIdterId, safeSupplierName, deliveryDate, safeTargetWarehouse, safeStatus, safeNotes, id]);
        
        // Jeśli przesłano items, zaktualizuj je
        if (items && Array.isArray(items)) {
            // Usuń stare items
            await pool.execute('DELETE FROM delivery_items WHERE delivery_id = ?', [id]);
            
            // Wstaw nowe items
            for (const item of items) {
                const itemId = item.id || `ITEM-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                const isBlocked = item.is_blocked || (item.packaging_type === 'big_bag' || item.packaging_type === 'bags');
                const blockReason = item.block_reason || (isBlocked ? 'Auto blokada dostawy - wymaga laboratorium' : null);
                
                await pool.execute(`
                    INSERT INTO delivery_items 
                    (id, delivery_id, position, product_name, product_code, batch_number, 
                     packaging_type, net_weight, unit, weight_per_bag, units_per_pallet,
                     production_date, expiry_date, location, is_blocked, block_reason, lab_notes)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    itemId, id, item.position || 0, item.product_name, item.product_code || '',
                    item.batch_number || '', item.packaging_type || 'bags', item.net_weight || 0,
                    item.unit || 'kg', item.weight_per_bag || null, item.units_per_pallet || null,
                    item.production_date || null, item.expiry_date || null, safeTargetWarehouse,
                    isBlocked, blockReason, item.lab_notes || null
                ]);
            }
        }
        
        res.json({ success: true });
    } catch (err) {
        console.error('❌ Błąd aktualizacji dostawy:', err);
        res.status(500).json({ error: 'Błąd aktualizacji dostawy' });
    }
});

// POST: Dodaj wyniki laboratoryjne (Etap 2: PENDING_LAB -> PENDING_WAREHOUSE)
app.post('/api/deliveries/:id/lab-results', async (req, res) => {
    const { id } = req.params;
    const { itemId, results, testedBy, decision } = req.body;
    // results = [{ parameter_name, parameter_value, parameter_unit, min_range, max_range }]
    
    try {
        // Dodaj wyniki do bazy
        for (const result of results) {
            const isWithinRange = result.parameter_value >= result.min_range && 
                                  result.parameter_value <= result.max_range;
            
            await pool.execute(`
                INSERT INTO delivery_lab_results 
                (delivery_item_id, delivery_id, parameter_name, parameter_value, parameter_unit, 
                 min_range, max_range, is_within_range, tested_by, notes)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [itemId, id, result.parameter_name, result.parameter_value, result.parameter_unit,
                result.min_range, result.max_range, isWithinRange, testedBy, result.notes]);
        }
        
        // Zaktualizuj blokadę pozycji
        if (decision === 'ZWOLNIJ') {
            await pool.execute(`
                UPDATE delivery_items 
                SET is_blocked = FALSE, block_reason = NULL 
                WHERE id = ?
            `, [itemId]);
        } else if (decision === 'BLOKUJ') {
            await pool.execute(`
                UPDATE delivery_items 
                SET is_blocked = TRUE, block_reason = ? 
                WHERE id = ?
            `, [req.body.blockReason || 'Wady jakościowe', itemId]);
        }
        
        // Sprawdź czy wszystkie pozycje dostawy zostały przetestowane
        const [items] = await pool.query(`
            SELECT COUNT(*) as total,
                   SUM(CASE WHEN is_blocked = FALSE THEN 1 ELSE 0 END) as tested
            FROM delivery_items 
            WHERE delivery_id = ?
        `, [id]);
        
        // Jeśli wszystkie pozycje przeszły przez lab, zmień status dostawy
        if (items[0].total === items[0].tested) {
            await pool.execute(`
                UPDATE deliveries 
                SET status = 'PENDING_WAREHOUSE' 
                WHERE id = ?
            `, [id]);
        }
        
        res.json({ success: true, message: 'Wyniki zapisane' });
    } catch (err) {
        console.error('❌ Błąd zapisu wyników lab:', err);
        res.status(500).json({ error: 'Błąd zapisu wyników' });
    }
});

// POST: Generuj etykiety i finalizuj (Etap 3: PENDING_WAREHOUSE -> UKOŃCZONE)
app.post('/api/deliveries/:id/finalize', async (req, res) => {
    const { id } = req.params;
    const { completedBy } = req.body;
    
    try {
        // Pobierz dostawę i jej pozycje
        const [deliveries] = await pool.query(`
            SELECT * FROM deliveries WHERE id = ?
        `, [id]);
        
        if (deliveries.length === 0) {
            return res.status(404).json({ error: 'Dostawa nie znaleziona' });
        }
        
        const delivery = deliveries[0];
        
        const [items] = await pool.query(`
            SELECT * FROM delivery_items WHERE delivery_id = ?
        `, [id]);
        
        // Generuj palety i przenieś do magazynu (raw_materials)
        const createdPallets = [];
        for (const item of items) {
            const palletId = `P${Date.now()}${Math.random().toString(36).substr(2, 10)}`.toUpperCase();
            
            // Aktualizuj delivery_item z ID palety
            await pool.execute(`
                UPDATE delivery_items 
                SET pallet_id = ?, label_printed = TRUE, label_printed_at = NOW(), label_printed_by = ?
                WHERE id = ?
            `, [palletId, completedBy, item.id]);
            
            // Utwórz paletę w magazynie (raw_materials)
            const rmId = `RM-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            await pool.execute(`
                INSERT INTO raw_materials 
                (id, nrPalety, nazwa, dataProdukcji, dataPrzydatnosci, initialWeight, currentWeight, 
                 isBlocked, blockReason, currentLocation, batchNumber, packageForm, unit, labAnalysisNotes,
                 deliveryRef, deliveryDate, createdAt)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
            `, [
                rmId,
                palletId,
                item.product_name,
                item.production_date,
                item.expiry_date,
                item.net_weight || 0,
                item.net_weight || 0,
                item.is_blocked || false,
                item.block_reason || null,
                delivery.target_warehouse || 'BF_MS01',
                item.batch_number || '',
                item.packaging_type || 'bags',
                item.unit || 'kg',
                item.lab_notes || null,
                delivery.order_ref,
                delivery.delivery_date
            ]);
            
            createdPallets.push({ palletId, rawMaterialId: rmId });
        }
        
        // Zmień status dostawy na COMPLETED
        await pool.execute(`
            UPDATE deliveries 
            SET status = 'COMPLETED', completed_at = NOW(), completed_by = ?
            WHERE id = ?
        `, [completedBy, id]);
        
        console.log(`✅ Dostawa ${id} finalizowana przez ${completedBy} - utworzono ${createdPallets.length} palet w magazynie`);
        res.json({ success: true, message: 'Dostawa ukończona', pallets: createdPallets });
    } catch (err) {
        console.error('❌ Błąd finalizacji dostawy:', err);
        res.status(500).json({ error: 'Błąd finalizacji dostawy: ' + err.message });
    }
});

// POST: Przesunięcie palety (Put-away / Rozlokowanie)
app.post('/api/pallets/:palletId/move', async (req, res) => {
    const { palletId } = req.params;
    const { toLocation, movedBy, reason, notes } = req.body;
    
    try {
        // Pobierz aktualną lokalizację
        const [items] = await pool.query(`
            SELECT location FROM delivery_items WHERE pallet_id = ?
        `, [palletId]);
        
        if (items.length === 0) {
            return res.status(404).json({ error: 'Paleta nie znaleziona' });
        }
        
        const fromLocation = items[0].location;
        
        // Zapisz historię
        await pool.execute(`
            INSERT INTO pallet_location_history 
            (pallet_id, from_location, to_location, moved_by, reason, notes)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [palletId, fromLocation, toLocation, movedBy, reason, notes]);
        
        // Zaktualizuj lokalizację palety
        await pool.execute(`
            UPDATE delivery_items 
            SET location = ? 
            WHERE pallet_id = ?
        `, [toLocation, palletId]);
        
        console.log(`✅ Paleta ${palletId} przeniesiona z ${fromLocation} do ${toLocation}`);
        res.json({ success: true, message: 'Paleta przeniesiona' });
    } catch (err) {
        console.error('❌ Błąd przenoszenia palety:', err);
        res.status(500).json({ error: 'Błąd przenoszenia palety' });
    }
});

// POST: Korekta zamkniętej dostawy (tylko admin/boss)
app.post('/api/deliveries/:id/correction', verifyToken, async (req, res) => {
    const { id } = req.params;
    const { fieldName, oldValue, newValue, reason, correctedBy } = req.body;
    
    try {
        // Sprawdź uprawnienia
        const [user] = await pool.query('SELECT role_id FROM users WHERE id = ?', [req.userId]);
        if (!user.length || (user[0].role_id !== 'admin' && user[0].role_id !== 'boss')) {
            return res.status(403).json({ error: 'Brak uprawnień' });
        }
        
        // Zapisz log korekty
        await pool.execute(`
            INSERT INTO delivery_correction_log 
            (delivery_id, field_name, old_value, new_value, corrected_by, reason)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [id, fieldName, oldValue, newValue, correctedBy, reason]);
        
        console.log(`✅ Korekta dostawy ${id}: ${fieldName} = ${newValue}`);
        res.json({ success: true, message: 'Korekta zapisana' });
    } catch (err) {
        console.error('❌ Błąd korekty dostawy:', err);
        res.status(500).json({ error: 'Błąd korekty dostawy' });
    }
});

// POST: Archiwizuj dostawę (automatyczne po 7 dniach lub ręcznie)
app.post('/api/deliveries/:id/archive', async (req, res) => {
    const { id } = req.params;
    
    try {
        await pool.execute(`
            UPDATE deliveries 
            SET status = 'ARCHIVED' 
            WHERE id = ? AND status = 'UKOŃCZONE'
        `, [id]);
        
        console.log(`✅ Dostawa ${id} zarchiwizowana`);
        res.json({ success: true, message: 'Dostawa zarchiwizowana' });
    } catch (err) {
        console.error('❌ Błąd archiwizacji dostawy:', err);
        res.status(500).json({ error: 'Błąd archiwizacji dostawy' });
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
        const [rows] = await pool.query(`
            SELECT 
                u.id, u.username, r.id as role_name, u.sub_role_id as subRole, 
                u.pin, u.email, u.is_active as isActive, u.is_temporary_password as isTemporaryPassword,
                u.password_last_changed as passwordLastChanged, r.label
            FROM users u 
            LEFT JOIN roles r ON u.role_id = r.id
            ORDER BY u.username
        `);
        
        // Pobierz uprawnienia dla każdego użytkownika
        const usersWithPermissions = await Promise.all(
            rows.map(async (user) => {
                // Pobierz uprawnienia indywidualne
                const [userPerms] = await pool.query(`
                    SELECT DISTINCT permission FROM user_permissions 
                    WHERE user_id = ?
                `, [user.id]);
                
                // Pobierz uprawnienia z roli
                const [rolePerms] = await pool.query(`
                    SELECT DISTINCT permission FROM role_permissions 
                    WHERE role_name = ?
                `, [user.role_name]);
                
                // Połącz uprawnienia indywidualne + z roli
                const userPermSet = new Set(userPerms.map(p => p.permission));
                const rolePermSet = new Set(rolePerms.map(p => p.permission));
                const permissions = Array.from(new Set([...userPermSet, ...rolePermSet]));
                
                return {
                    id: user.id,
                    username: user.username,
                    role: user.role_name,
                    subRole: user.subRole,
                    pin: user.pin,
                    email: user.email,
                    isActive: user.isActive,
                    isTemporaryPassword: user.isTemporaryPassword,
                    passwordLastChanged: user.passwordLastChanged,
                    label: user.label,
                    permissions
                };
            })
        );
        
        res.json(usersWithPermissions);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Błąd pobierania użytkowników' });
    }
});

// GET: Pobierz jednego użytkownika
app.get('/api/users/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await pool.query(`
            SELECT 
                u.id, u.username, u.role_id as role, u.sub_role_id as subRole, 
                u.pin, u.email, u.is_active as isActive, u.is_temporary_password as isTemporaryPassword,
                u.password_last_changed as passwordLastChanged, r.label
            FROM users u 
            LEFT JOIN roles r ON u.role_id = r.id
            WHERE u.id = ?
        `, [id]);
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Użytkownik nie znaleziony' });
        }
        
        const user = rows[0];
        
        // Pobierz uprawnienia indywidualne
        const [userPerms] = await pool.query(`
            SELECT DISTINCT permission FROM user_permissions 
            WHERE user_id = ?
        `, [user.id]);
        
        // Pobierz uprawnienia z roli
        const [rolePerms] = await pool.query(`
            SELECT DISTINCT permission FROM role_permissions 
            WHERE role_name = ?
        `, [user.role]);
        
        // Połącz uprawnienia indywidualne + z roli
        const userPermSet = new Set(userPerms.map(p => p.permission));
        const rolePermSet = new Set(rolePerms.map(p => p.permission));
        const permissions = Array.from(new Set([...userPermSet, ...rolePermSet]));
        
        res.json({
            ...user,
            permissions
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Błąd pobierania użytkownika' });
    }
});

// POST: Tworzenie nowego użytkownika
app.post('/api/users', async (req, res) => {
    const { username, password, role, subRole, pin, email, isActive, isTemporaryPassword, passwordLastChanged } = req.body;
    try {
        // Hashuj hasło zanim go zapiszesz
        const hashedPassword = await hashPassword(password || 'temp123');
        
        // Format daty dla MySQL: YYYY-MM-DD HH:MM:SS
        const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
        const lastChanged = passwordLastChanged ? new Date(passwordLastChanged).toISOString().slice(0, 19).replace('T', ' ') : now;
        
        const sql = `INSERT INTO users (username, password_hash, role_id, sub_role_id, pin, email, is_active, is_temporary_password, password_last_changed, created_at) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        const params = [
            username,
            hashedPassword,
            role || 'user',
            subRole || 'AGRO',
            pin || null,
            email || null,
            isActive !== undefined ? (isActive ? 1 : 0) : 1,
            isTemporaryPassword !== undefined ? (isTemporaryPassword ? 1 : 0) : 1,
            lastChanged,
            now
        ];
        
        const [result] = await pool.execute(sql, params);
        console.log(`✅ Użytkownik ${username} dodany do bazy danych (ID: ${result.insertId})`);
        res.json({ 
            success: true, 
            insertId: result.insertId, 
            username, 
            role: role || 'user',
            message: `Użytkownik ${username} został dodany` 
        });
    } catch (err) {
        console.error('❌ Błąd tworzenia użytkownika:', err.message);
        res.status(500).json({ error: 'Błąd tworzenia użytkownika', details: err.message });
    }
});

// PUT: Aktualizacja użytkownika
app.put('/api/users/:id', async (req, res) => {
    const { id } = req.params;
    const { username, role, subRole, pin, password, passwordLastChanged, email, isActive, isTemporaryPassword } = req.body;
    try {
        // Buduj dynamiczne UPDATE w zależności od co jest przekazane
        const updates = [];
        const params = [];
        
        if (username !== undefined) {
            updates.push('username = ?');
            params.push(username);
        }
        if (role !== undefined) {
            updates.push('role_id = ?');
            params.push(role);
        }
        if (subRole !== undefined) {
            updates.push('sub_role_id = ?');
            params.push(subRole);
        }
        if (pin !== undefined) {
            updates.push('pin = ?');
            params.push(pin);
        }
        if (password !== undefined) {
            // Hashuj hasło przed zapisaniem
            const hashedPassword = await hashPassword(password);
            updates.push('password_hash = ?');
            params.push(hashedPassword);
        }
        if (passwordLastChanged !== undefined) {
            // Konwertuj ISO format na MySQL format
            const date = new Date(passwordLastChanged);
            const formattedDate = date.toISOString().slice(0, 19).replace('T', ' ');
            updates.push('password_last_changed = ?');
            params.push(formattedDate);
        }
        if (email !== undefined) {
            updates.push('email = ?');
            params.push(email);
        }
        if (isActive !== undefined) {
            updates.push('is_active = ?');
            params.push(isActive ? 1 : 0);
        }
        if (isTemporaryPassword !== undefined) {
            updates.push('is_temporary_password = ?');
            params.push(isTemporaryPassword ? 1 : 0);
        }
        
        if (updates.length === 0) {
            return res.status(400).json({ error: 'Brak danych do aktualizacji' });
        }
        
        let sql = 'UPDATE users SET ' + updates.join(', ') + ' WHERE id = ?';
        params.push(id);
        
        await pool.execute(sql, params);
        console.log(`✅ Użytkownik ${id} zaktualizowany`);
        res.json({ success: true });
    } catch (err) {
        console.error('❌ Błąd aktualizacji użytkownika:', err.message);
        res.status(500).json({ error: 'Błąd aktualizacji użytkownika', details: err.message });
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

// ===== LOGOWANIE I AUTORYZACJA =====

// POST: Logowanie (zwraca JWT token)
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    console.log(`🔐 Próba logowania: username="${username}"`);
    try {
        if (!username || !password) {
            console.log('❌ Brakuje username lub password');
            return res.status(400).json({ error: 'Brakuje nazwy użytkownika lub hasła' });
        }

        const [rows] = await pool.query('SELECT u.*, r.label as role_label, u.role_id as role_name FROM users u LEFT JOIN roles r ON u.role_id = r.id WHERE u.username = ?', [username]);
        
        if (rows.length === 0) {
            console.log(`❌ Użytkownik ${username} nie znaleziony`);
            return res.status(401).json({ error: 'Błędna nazwa użytkownika lub hasło' });
        }

        const user = rows[0];
        console.log(`🔐 Znaleziono użytkownika ${username}, porównuję hasła...`);

        // Porównaj hasło z hashem
        const isPasswordValid = await comparePassword(password, user.password_hash);
        console.log(`🔐 Czy hasło prawidłowe? ${isPasswordValid}`);
        
        if (!isPasswordValid) {
            console.log(`❌ Hasło nieprawidłowe dla ${username}`);
            return res.status(401).json({ error: 'Błędna nazwa użytkownika lub hasło' });
        }

        // Wygeneruj JWT token
        console.log(`🔐 user.role_name: ${user.role_name}`);
        const token = generateToken(user);

        console.log(`✅ Użytkownik ${username} zalogowany`);
        console.log(`🔐 JWT Token: ${token.substring(0, 50)}...`);
        console.log(`🔐 is_temporary_password w bazie: ${user.is_temporary_password}`);
        
        const response = {
            success: true,
            token,
            user: {
                id: user.id,
                username: user.username,
                role: user.role_name || 'user',
                subRole: user.sub_role_id || 'AGRO',
                pin: user.pin,
                email: user.email,
                isActive: user.is_active,
                passwordLastChanged: user.password_last_changed,
                isTemporaryPassword: user.is_temporary_password,
                permissions: [] // Uprawnienia będą pobrane na froncie
            }
        };
        console.log(`🔐 Odpowiedź API:`, JSON.stringify(response.user));
        res.json(response);
    } catch (err) {
        console.error('❌ Błąd logowania:', err.message);
        res.status(500).json({ error: 'Błąd serwera przy logowaniu' });
    }
});

// GET: Pobierz uprawnienia użytkownika (lub roli)
app.get('/api/permissions/:userIdOrRole', async (req, res) => {
    const { userIdOrRole } = req.params;
    console.log(`🔐 /api/permissions: userIdOrRole=${userIdOrRole}`);
    try {
        // Sprawdzenie czy to ID użytkownika czy nazwa roli
        const isNumeric = !isNaN(userIdOrRole);
        console.log(`🔐 isNumeric=${isNumeric}`);

        let permissions = [];

        if (isNumeric) {
            // Pobierz uprawnienia dla konkretnego użytkownika
            // 1. Najpierw uprawnienia indywidualne (user_permissions)
            const [userPerms] = await pool.query(`
                SELECT DISTINCT permission FROM user_permissions 
                WHERE user_id = ?
            `, [userIdOrRole]);
            console.log(`🔐 userPerms.length=${userPerms.length}`);

            // 2. Potem uprawnienia z roli
            const [user] = await pool.query(`
                SELECT u.role_id, r.id as role_name FROM users u 
                LEFT JOIN roles r ON u.role_id = r.id 
                WHERE u.id = ?
            `, [userIdOrRole]);
            console.log(`🔐 user.length=${user.length}, user=${JSON.stringify(user)}`);

            if (user.length > 0) {
                const [rolePerms] = await pool.query(`
                    SELECT DISTINCT permission FROM role_permissions 
                    WHERE role_name = ?
                `, [user[0].role_name]);
                console.log(`🔐 rolePerms.length=${rolePerms.length}`);

                // Połącz uprawnienia indywidualne + z roli
                const userPermSet = new Set(userPerms.map(p => p.permission));
                const rolePermSet = new Set(rolePerms.map(p => p.permission));
                permissions = Array.from(new Set([...userPermSet, ...rolePermSet]));
            }
        } else {
            // Pobierz uprawnienia dla roli
            const [rolePerms] = await pool.query(`
                SELECT DISTINCT permission FROM role_permissions 
                WHERE role_name = ?
            `, [userIdOrRole]);
            permissions = rolePerms.map(p => p.permission);
        }

        console.log(`✅ Zwracam ${permissions.length} uprawnień`);
        res.json({ permissions });
    } catch (err) {
        console.error('❌ Błąd pobierania uprawnień:', err.message);
        res.status(500).json({ error: 'Błąd pobierania uprawnień' });
    }
});

// POST: Zapisz uprawnienia indywidualne użytkownika
app.post('/api/user-permissions', verifyToken, async (req, res) => {
    const { userId, permissions } = req.body;
    try {
        if (!userId || !Array.isArray(permissions)) {
            return res.status(400).json({ error: 'Brakuje userId lub permissions' });
        }

        // Sprawdź czy użytkownik ma uprawnienie do zarządzania uprawnieniami
        const [user] = await pool.query(
            'SELECT role_id FROM users WHERE id = ?',
            [req.userId]
        );

        if (!user || !user.length) {
            return res.status(401).json({ error: 'Użytkownik nie znaleziony' });
        }

        const currentUserRole = user[0].role_id;
        if (currentUserRole !== 'admin' && currentUserRole !== 'boss') {
            return res.status(403).json({ error: 'Brak uprawnień do zarządzania uprawnieniami' });
        }

        // Usuń stare uprawnienia indywidualne
        await pool.execute(
            'DELETE FROM user_permissions WHERE user_id = ?',
            [userId]
        );

        // Dodaj nowe uprawnienia
        if (permissions.length > 0) {
            const values = permissions.map(perm => [userId, perm]);
            await pool.query(
                'INSERT IGNORE INTO user_permissions (user_id, permission) VALUES ?',
                [values]
            );
        }

        console.log(`✅ Uprawnienia indywidualne dla użytkownika ${userId} zostały zapisane`);
        res.json({ success: true, message: 'Uprawnienia zostały zapisane' });
    } catch (err) {
        console.error('❌ Błąd zapisywania uprawnień:', err.message);
        res.status(500).json({ error: 'Błąd zapisywania uprawnień', details: err.message });
    }
});

// GET: Pobierz TYLKO uprawnienia indywidualne użytkownika (bez uprawnień z roli)
app.get('/api/user-permissions/:userId', async (req, res) => {
    const { userId } = req.params;
    console.log(`🔐 /api/user-permissions: userId=${userId} (TYLKO indywidualne)`);
    try {
        const [userPerms] = await pool.query(`
            SELECT DISTINCT permission FROM user_permissions 
            WHERE user_id = ?
        `, [userId]);
        
        const permissions = userPerms.map(p => p.permission);
        console.log(`✅ Zwracam ${permissions.length} uprawnień indywidualnych`);
        res.json({ permissions });
    } catch (err) {
        console.error('❌ Błąd pobierania uprawnień indywidualnych:', err.message);
        res.status(500).json({ error: 'Błąd pobierania uprawnień' });
    }
});

// POST: Zmiana hasła (wymaga autoryzacji)
app.post('/api/change-password', verifyToken, async (req, res) => {
    const { oldPassword, newPassword } = req.body;
    const userId = req.userId;

    
    console.log(`🔐 /api/change-password: userId=${userId}, oldPassword="${oldPassword}", newPassword="${newPassword}"`);

    try {
        if (!oldPassword || !newPassword) {
            console.log('❌ Brakuje starego lub nowego hasła');
            return res.status(400).json({ error: 'Brakuje starego lub nowego hasła' });
        }

        if (newPassword.length < 6) {
            console.log('❌ Nowe hasło za krótkie');
            return res.status(400).json({ error: 'Nowe hasło musi mieć co najmniej 6 znaków' });
        }

        const [rows] = await pool.query('SELECT id, username, password_hash FROM users WHERE id = ?', [userId]);
        
        if (rows.length === 0) {
            console.log(`❌ Użytkownik ${userId} nie znaleziony`);
            return res.status(404).json({ error: 'Użytkownik nie znaleziony' });
        }

        const user = rows[0];
        console.log(`🔐 Znaleziony użytkownik: ${user.username}, hash w bazie: ${user.password_hash.substring(0, 50)}...`);

        // Porównaj stare hasło
        const isOldPasswordValid = await comparePassword(oldPassword, user.password_hash);
        console.log(`🔐 comparePassword("${oldPassword}", hash) = ${isOldPasswordValid}`);
        
        if (!isOldPasswordValid) {
            console.log(`❌ Stare hasło nieprawidłowe dla user ${userId}`);
            return res.status(401).json({ error: 'Stare hasło jest nieprawidłowe' });
        }

        // Hashuj nowe hasło
        const hashedNewPassword = await hashPassword(newPassword);
        console.log(`🔐 Zahashowane nowe hasło: ${hashedNewPassword.substring(0, 50)}...`);
        const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

        // Zaktualizuj hasło w bazie
        const [result] = await pool.execute(
            'UPDATE users SET password_hash = ?, password_last_changed = ?, is_temporary_password = 0 WHERE id = ?',
            [hashedNewPassword, now, userId]
        );

        console.log(`✅ Użytkownik ${userId} (${user.username}) zmienił hasło, affectedRows=${result.affectedRows}`);
        
        res.json({ success: true, message: 'Hasło zostało zmienione' });
    } catch (err) {
        console.error('❌ Błąd zmiany hasła:', err.message);
        res.status(500).json({ error: 'Błąd serwera przy zmianie hasła' });
    }
});

// POST: Wymuszona zmiana hasła (dla haseł tymczasowych - wymaga JWT)
app.post('/api/force-change-password', verifyToken, async (req, res) => {
    console.log('🔐 /api/force-change-password został wołany');
    const { newPassword } = req.body;
    const userId = req.userId;
    
    console.log(`🔐 Otrzymane dane: newPassword="${newPassword}", userId=${userId}`);

    try {
        if (!newPassword) {
            console.log('❌ Brakuje newPassword');
            return res.status(400).json({ error: 'Brakuje nowego hasła' });
        }

        if (newPassword.length < 6) {
            console.log(`❌ Hasło za krótkie: ${newPassword.length} znaków`);
            return res.status(400).json({ error: 'Nowe hasło musi mieć co najmniej 6 znaków' });
        }

        console.log(`🔐 Zmiana hasła tymczasowego dla user ID: ${userId}, nowe hasło: ${newPassword}`);

        // Hashuj nowe hasło
        const hashedNewPassword = await hashPassword(newPassword);
        const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

        console.log(`🔐 Zahashowane hasło: ${hashedNewPassword.substring(0, 50)}...`);

        // Zaktualizuj hasło w bazie i ustaw is_temporary_password na 0
        const [result] = await pool.execute(
            'UPDATE users SET password_hash = ?, password_last_changed = ?, is_temporary_password = 0 WHERE id = ?',
            [hashedNewPassword, now, userId]
        );

        console.log(`✅ UPDATE result: affectedRows=${result.affectedRows}`);
        console.log(`✅ Użytkownik ${userId} zmienił hasło tymczasowe`);
        
        res.json({ success: true, message: 'Hasło zostało zmienione' });
    } catch (err) {
        console.error('❌ Błąd wymuszanej zmiany hasła:', err.message);
        res.status(500).json({ error: 'Błąd serwera przy zmianie hasła' });
    }
});

// ===== SUROWCE (RAW MATERIALS) =====

// Inicjalizacja tabeli raw_materials
async function initRawMaterialsTable() {
    try {
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS raw_materials (
                id VARCHAR(50) PRIMARY KEY COMMENT 'Unikalny identyfikator',
                nrPalety VARCHAR(50) UNIQUE NOT NULL COMMENT 'Numer palety',
                nazwa VARCHAR(100) NOT NULL COMMENT 'Nazwa surowca',
                dataProdukcji DATE COMMENT 'Data produkcji',
                dataPrzydatnosci DATE COMMENT 'Data przydatności',
                initialWeight DECIMAL(10,2) COMMENT 'Waga początkowa (kg)',
                currentWeight DECIMAL(10,2) COMMENT 'Waga aktualna (kg)',
                isBlocked TINYINT(1) DEFAULT 0 COMMENT 'Czy zablokowany',
                blockReason VARCHAR(255) COMMENT 'Powód blokady',
                currentLocation VARCHAR(100) COMMENT 'Aktualna lokalizacja',
                batchNumber VARCHAR(50) COMMENT 'Numer partii',
                packageForm VARCHAR(50) COMMENT 'Forma opakowania',
                unit VARCHAR(20) COMMENT 'Jednostka',
                labAnalysisNotes TEXT COMMENT 'Notatki z analizy laboratoryjnej',
                deliveryRef VARCHAR(100) COMMENT 'Referencja dostawy',
                deliveryDate DATE COMMENT 'Data dostawy',
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_location (currentLocation),
                INDEX idx_blocked (isBlocked),
                INDEX idx_createdAt (createdAt)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci;
        `);
        console.log('✅ Tabela raw_materials jest gotowa');
        
        // Migracja: Dodaj brakujące kolumny do tabeli raw_materials
        try {
            await pool.execute(`ALTER TABLE raw_materials ADD COLUMN IF NOT EXISTS deliveryRef VARCHAR(100) COMMENT 'Referencja dostawy'`);
            await pool.execute(`ALTER TABLE raw_materials ADD COLUMN IF NOT EXISTS deliveryDate DATE COMMENT 'Data dostawy'`);
            console.log('✅ Kolumny deliveryRef i deliveryDate dodane do raw_materials');
        } catch (err) {
            console.log('⚠️ Kolumny deliveryRef/deliveryDate już istnieją lub błąd:', err.message);
        }
    } catch (err) {
        console.error('❌ Błąd inicjalizacji tabeli raw_materials:', err.message);
    }
}

// Tworzy tabelę roles jeśli nie istnieje

// Główna funkcja inicjalizacji
async function initialize() {
    await initUsersTable();
    await initRawMaterialsTable();
}

initialize();

// GET: Pobieranie wszystkich ról z bazy danych
app.get('/api/roles', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT id as name, label FROM roles ORDER BY id');
        console.log('✅ Pobrane role:', rows);
        res.json(rows);
    } catch (err) {
        console.error('❌ Błąd pobierania ról:', err);
        res.status(500).json({ error: 'Błąd pobierania ról' });
    }
});

// GET: Pobieranie wszystkich surowców
app.get('/api/raw-materials', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM raw_materials ORDER BY createdAt DESC');
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Błąd pobierania surowców' });
    }
});

// GET: Pobieranie surowca po ID
app.get('/api/raw-materials/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await pool.query('SELECT * FROM raw_materials WHERE id = ? OR nrPalety = ?', [id, id]);
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Surowiec nie znaleziony' });
        }
        res.json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Błąd pobierania surowca' });
    }
});

// POST: Tworzenie nowego surowca
app.post('/api/raw-materials', async (req, res) => {
    const { id, nrPalety, nazwa, dataProdukcji, dataPrzydatnosci, initialWeight, currentWeight, isBlocked, blockReason, currentLocation, batchNumber, packageForm, unit, labAnalysisNotes } = req.body;
    try {
        const sql = `INSERT INTO raw_materials (id, nrPalety, nazwa, dataProdukcji, dataPrzydatnosci, initialWeight, currentWeight, isBlocked, blockReason, currentLocation, batchNumber, packageForm, unit, labAnalysisNotes)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        const params = [
            id || `RM-${Date.now()}`,
            nrPalety,
            nazwa,
            dataProdukcji,
            dataPrzydatnosci,
            initialWeight,
            currentWeight,
            isBlocked ? 1 : 0,
            blockReason,
            currentLocation,
            batchNumber,
            packageForm,
            unit,
            labAnalysisNotes
        ];
        const [result] = await pool.execute(sql, params);
        res.json({ success: true, insertId: id || `RM-${Date.now()}` });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Błąd tworzenia surowca', details: err.message });
    }
});

// PUT: Aktualizacja surowca
app.put('/api/raw-materials/:id', async (req, res) => {
    const { id } = req.params;
    const { currentWeight, isBlocked, blockReason, currentLocation, labAnalysisNotes } = req.body;
    try {
        const updates = [];
        const params = [];
        
        if (currentWeight !== undefined) { updates.push('currentWeight = ?'); params.push(currentWeight); }
        if (isBlocked !== undefined) { updates.push('isBlocked = ?'); params.push(isBlocked ? 1 : 0); }
        if (blockReason !== undefined) { updates.push('blockReason = ?'); params.push(blockReason); }
        if (currentLocation !== undefined) { updates.push('currentLocation = ?'); params.push(currentLocation); }
        if (labAnalysisNotes !== undefined) { updates.push('labAnalysisNotes = ?'); params.push(labAnalysisNotes); }
        
        if (updates.length === 0) {
            return res.status(400).json({ error: 'Brak danych do aktualizacji' });
        }
        
        const sql = 'UPDATE raw_materials SET ' + updates.join(', ') + ' WHERE id = ? OR nrPalety = ?';
        params.push(id, id);
        
        await pool.execute(sql, params);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Błąd aktualizacji surowca' });
    }
});

// DELETE: Usuwanie surowca
app.delete('/api/raw-materials/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.execute('DELETE FROM raw_materials WHERE id = ? OR nrPalety = ?', [id, id]);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Błąd usuwania surowca' });
    }
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n====================================================`);
    console.log(`🚀 SERWER API DZIAŁA: http://localhost:${PORT}`);
    console.log(`📡 POŁĄCZENIE Z BAZĄ: ${dbConfig.host}:${dbConfig.port}`);
    console.log(`====================================================\n`);
});
