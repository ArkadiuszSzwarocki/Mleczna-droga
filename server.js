
import express from 'express';
import mysql from 'mysql2/promise';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import pdfParse from 'pdf-parse';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
// allow plain text bodies (for CSV upload)
app.use(express.text({ type: ['text/*', 'application/csv'] }));

// multer for multipart file uploads (PDF/CSV)
const upload = multer({ storage: multer.memoryStorage() });

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
            await pool.execute(`ALTER TABLE delivery_items ADD COLUMN IF NOT EXISTS net_weight DECIMAL(10,2) DEFAULT 0`);
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

        // Tabela magazynów (jeśli brak) - potrzebna dla klucza obcego w warehouse_locations
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS warehouses (
                id VARCHAR(50) PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                location VARCHAR(100),
                capacity INT DEFAULT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_warehouses_name (name)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci;
        `);
        console.log('✅ Tabela warehouses jest gotowa');

        // Tabela lokalizacji magazynowych (pozycje / strefy w magazynach)
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS warehouse_locations (
                id INT AUTO_INCREMENT PRIMARY KEY,
                warehouse_id VARCHAR(50) DEFAULT NULL,
                code VARCHAR(50) UNIQUE,
                name VARCHAR(255) NOT NULL,
                zone VARCHAR(100),
                capacity INT DEFAULT NULL,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_warehouse (warehouse_id),
                INDEX idx_code (code),
                FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE SET NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci;
        `);
        console.log('✅ Tabela warehouse_locations jest gotowa');
        
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

// POST: Import produktów (CSV)
app.post('/api/import-products', upload.single('file'), async (req, res) => {
    try {
        let payload = '';
        if (req.file && req.file.buffer) {
            const mimetype = req.file.mimetype || '';
            if (mimetype === 'application/pdf' || (req.file.originalname || '').toLowerCase().endsWith('.pdf')) {
                try {
                    const parsed = await pdfParse(req.file.buffer);
                    payload = (parsed && parsed.text) ? parsed.text : '';
                } catch (e) {
                    console.error('Błąd parsowania PDF:', e.message);
                    return res.status(400).json({ error: 'Nie można sparsować pliku PDF' });
                }
            } else {
                payload = req.file.buffer.toString('utf8');
            }
        } else {
            payload = typeof req.body === 'string' ? req.body : req.body.csv || '';
        }

        if (!payload || !payload.trim()) return res.status(400).json({ error: 'Brak danych CSV/PDF w body' });

        const lines = payload.split(/\r?\n/).map(l => l.trim()).filter(l => l);
        let inserted = 0;
        for (const line of lines) {
            // akceptujemy separatory: tab, comma, semicolon, whitespace
            const parts = line.split(/\t|,|;|\s+/).map(p => p.trim()).filter(p => p);
            if (parts.length < 1) continue;
            const code = parts[0];
            const group = parts[1] || 'inne';
            const id = `RM-${code}`;
            try {
                const [result] = await pool.execute(
                    `INSERT IGNORE INTO raw_materials (id, nrPalety, nazwa, productGroup, initialWeight, currentWeight, isBlocked, unit) VALUES (?, ?, ?, ?, 0, 0, 0, 'kg')`,
                    [id, code, code, group]
                );
                if (result && result.affectedRows && result.affectedRows > 0) inserted++;
            } catch (e) {
                console.error('Błąd insert raw material', code, e.message);
            }
        }
        res.json({ success: true, inserted, total: lines.length });
    } catch (err) {
        console.error('❌ Błąd importu produktów:', err);
        res.status(500).json({ error: 'Błąd importu produktów' });
    }
});

// Ensure recipes table
async function ensureRecipesTable() {
    try {
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS recipes (
                id VARCHAR(100) PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                data JSON,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci;
        `);
        console.log('✅ Tabela recipes jest gotowa');
    } catch (err) {
        console.error('❌ Błąd tworzenia tabeli recipes:', err.message);
    }
}
// POST: Import receptur (CSV)
app.post('/api/import-recipes', upload.single('file'), async (req, res) => {
    try {
        let payload = '';
        if (req.file && req.file.buffer) {
            const mimetype = req.file.mimetype || '';
            if (mimetype === 'application/pdf' || (req.file.originalname || '').toLowerCase().endsWith('.pdf')) {
                try {
                    const parsed = await pdfParse(req.file.buffer);
                    payload = (parsed && parsed.text) ? parsed.text : '';
                } catch (e) {
                    console.error('Błąd parsowania PDF (receptury):', e.message);
                    return res.status(400).json({ error: 'Nie można sparsować pliku PDF' });
                }
            } else {
                payload = req.file.buffer.toString('utf8');
            }
        } else {
            payload = typeof req.body === 'string' ? req.body : req.body.csv || '';
        }

        if (!payload || !payload.trim()) return res.status(400).json({ error: 'Brak danych CSV/PDF w body' });

        await ensureRecipesTable();

        const lines = payload.split(/\r?\n/).map(l => l.trim()).filter(l => l);
        let inserted = 0;
        for (const line of lines) {
            const sep = line.includes(';') ? ';' : (line.includes(',') ? ',' : null);
            let name = line;
            let ingPart = '';
            if (sep) {
                const idx = line.indexOf(sep);
                name = line.substring(0, idx).trim();
                ingPart = line.substring(idx + 1).trim();
            }
            const ingredients = ingPart ? ingPart.split(/[|,]/).map(s => s.trim()).filter(Boolean).map(it => {
                const [code, qty] = it.split(':').map(x=>x.trim());
                return { code, qty: qty ? parseFloat(qty) : null };
            }) : [];
            const id = `RC-${name.replace(/\s+/g,'_').toUpperCase()}`;
            try {
                const data = { ingredients };
                const [result] = await pool.execute(
                    `INSERT INTO recipes (id, name, data) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE data = VALUES(data)`,
                    [id, name, JSON.stringify(data)]
                );
                if (result && result.affectedRows) inserted++;
            } catch (e) {
                console.error('Błąd insert recipe', name, e.message);
            }
        }
        res.json({ success: true, inserted, total: lines.length });
    } catch (err) {
        console.error('❌ Błąd importu receptur:', err);
        res.status(500).json({ error: 'Błąd importu receptur' });
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

// ==================== ENDPOINTY FORM OPAKOWAŃ ====================

// GET: Pobierz wszystkie aktywne formy opakowań
app.get('/api/packaging-forms', async (req, res) => {
    try {
        const [rows] = await pool.query(`SELECT * FROM packaging_forms WHERE is_active = TRUE ORDER BY name ASC`);
        res.json(rows);
    } catch (err) {
        console.error('❌ Błąd pobierania form opakowań:', err);
        res.status(500).json({ error: 'Błąd pobierania form opakowań' });
    }
});

// POST: Dodaj nową formę opakowania
app.post('/api/packaging-forms', async (req, res) => {
    const { code, name, type, description } = req.body;
    try {
        const [result] = await pool.execute(`
            INSERT INTO packaging_forms (code, name, type, description)
            VALUES (?, ?, ?, ?)
        `, [code || null, name, type || null, description || null]);

        res.json({ success: true, id: result.insertId });
    } catch (err) {
        console.error('❌ Błąd tworzenia formy opakowania:', err);
        res.status(500).json({ error: 'Błąd tworzenia formy opakowania' });
    }
});

// PUT: Aktualizuj formę opakowania
app.put('/api/packaging-forms/:id', async (req, res) => {
    const { id } = req.params;
    const { code, name, type, description, is_active } = req.body;
    try {
        await pool.execute(`
            UPDATE packaging_forms SET code = ?, name = ?, type = ?, description = ?, is_active = ? WHERE id = ?
        `, [code || null, name, type || null, description || null, is_active === undefined ? true : is_active, id]);
        res.json({ success: true });
    } catch (err) {
        console.error('❌ Błąd aktualizacji formy opakowania:', err);
        res.status(500).json({ error: 'Błąd aktualizacji formy opakowania' });
    }
});

// DELETE: Dezaktywuj formę opakowania (soft-delete)
app.delete('/api/packaging-forms/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.execute(`UPDATE packaging_forms SET is_active = FALSE WHERE id = ?`, [id]);
        res.json({ success: true });
    } catch (err) {
        console.error('❌ Błąd usuwania formy opakowania:', err);
        res.status(500).json({ error: 'Błąd usuwania formy opakowania' });
    }
});

// ==================== ENDPOINTY LOKALIZACJI MAGAZYNOWYCH ====================

// GET: Pobierz wszystkie aktywne lokalizacje magazynowe
app.get('/api/warehouse-locations', async (req, res) => {
    try {
        const [rows] = await pool.query(`SELECT * FROM warehouse_locations WHERE is_active = TRUE ORDER BY name ASC`);
        res.json(rows);
    } catch (err) {
        console.error('❌ Błąd pobierania lokalizacji magazynowych:', err);
        res.status(500).json({ error: 'Błąd pobierania lokalizacji magazynowych' });
    }
});

// POST: Dodaj nową lokalizację magazynową
app.post('/api/warehouse-locations', async (req, res) => {
    const { warehouse_id, code, name, zone, capacity } = req.body;
    try {
        const [result] = await pool.execute(`
            INSERT INTO warehouse_locations (warehouse_id, code, name, zone, capacity)
            VALUES (?, ?, ?, ?, ?)
        `, [warehouse_id || null, code || null, name, zone || null, capacity || null]);

        res.json({ success: true, id: result.insertId });
    } catch (err) {
        console.error('❌ Błąd tworzenia lokalizacji:', err);
        res.status(500).json({ error: 'Błąd tworzenia lokalizacji magazynowej' });
    }
});

// PUT: Aktualizuj lokalizację magazynową
app.put('/api/warehouse-locations/:id', async (req, res) => {
    const { id } = req.params;
    const { warehouse_id, code, name, zone, capacity, is_active } = req.body;
    try {
        await pool.execute(`
            UPDATE warehouse_locations SET warehouse_id = ?, code = ?, name = ?, zone = ?, capacity = ?, is_active = ? WHERE id = ?
        `, [warehouse_id || null, code || null, name, zone || null, capacity || null, is_active === undefined ? true : is_active, id]);
        res.json({ success: true });
    } catch (err) {
        console.error('❌ Błąd aktualizacji lokalizacji:', err);
        res.status(500).json({ error: 'Błąd aktualizacji lokalizacji magazynowej' });
    }
});

// DELETE: Dezaktywuj lokalizację (soft-delete)
app.delete('/api/warehouse-locations/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.execute(`UPDATE warehouse_locations SET is_active = FALSE WHERE id = ?`, [id]);
        res.json({ success: true });
    } catch (err) {
        console.error('❌ Błąd usuwania lokalizacji:', err);
        res.status(500).json({ error: 'Błąd usuwania lokalizacji magazynowej' });
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
            await pool.execute(`ALTER TABLE raw_materials ADD COLUMN IF NOT EXISTS productGroup VARCHAR(50) COMMENT 'Grupa produktowa'`);
            console.log('✅ Kolumny deliveryRef, deliveryDate i productGroup dodane do raw_materials');
        } catch (err) {
            console.log('⚠️ Kolumny już istnieją lub błąd:', err.message);
        }
        
        // Dodanie definicji surowców
        try {
            const rawMaterialsData = [
                ['BM2448', 'bm'], ['BM2455', 'bm'], ['BM2974', 'bm'], ['BM2981', 'bm'], ['BM2998', 'bm'],
                ['BM3001', 'bm'], ['BM3285', 'bm'], ['BM3308', 'bm'], ['BM3322', 'bm'], ['BM3995', 'bm'],
                ['BM4008', 'bm'], ['BM4015', 'bm'], ['BM4022', 'bm'], ['BM4039', 'bm'], ['BM4046', 'bm'],
                ['BM4053', 'bm'], ['BM4060', 'bm'], ['BM4077', 'bm'], ['BM4084', 'bm'], ['BM4091', 'bm'],
                ['BM4107', 'bm'], ['BM4114', 'bm'], ['BM4121', 'bm'], ['BM4138', 'bm'], ['BM4145', 'bm'],
                ['BM4152', 'bm'], ['BM4169', 'bm'], ['BM4176', 'bm'], ['BM4183', 'bm'], ['BM4190', 'bm'],
                ['BM4206', 'bm'], ['BM4213', 'bm'], ['BM4220', 'bm'], ['BM4237', 'bm'], ['BM4244', 'bm'],
                ['BM4251', 'bm'], ['BM4268', 'bm'],
                ['DO1960', 'dodatek'], ['DO2394', 'dodatek'], ['DO2424', 'dodatki'], ['DO2431', 'dodatki'],
                ['DO2493', 'dodatek'], ['DO2509', 'dodatek'], ['DO2554', 'dodatek'], ['DO2561', 'dodatek'],
                ['DO2578', 'dodatek'], ['DO2615', 'dodatek'], ['DO2653', 'dodatek'], ['DO2660', 'dodatek'],
                ['DO2677', 'dodatek'], ['DO2684', 'dodatek'], ['DO2776', 'dodatek'], ['DO2837', 'dodatek'],
                ['DO2851', 'dodatek'], ['DO2929', 'dodatek'], ['DO2936', 'dodatek'], ['DO2943', 'dodatek'],
                ['DO2950', 'dodatek'], ['DO2967', 'dodatek'], ['DO3094', 'dodatek'], ['DO3339', 'dodatki'],
                ['DO3346', 'dodatki'], ['DO3414', 'dodatek'], ['DO3490', 'dodatek'], ['DO3506', 'dodatek'],
                ['DO3513', 'dodatek'], ['DO3520', 'dodatek'], ['DO3537', 'dodatek'], ['DO3544', 'dodatek'],
                ['DO3551', 'dodatek'], ['DO3629', 'dodatek'], ['DO3735', 'dodatek'], ['DO3780', 'dodatek'],
                ['DO3797', 'dodatek'], ['DO3803', 'dodatek'], ['DO3810', 'dodatek'], ['DO3896', 'dodatek'],
                ['DO3933', 'dodatek'], ['DO5074', 'dodatek'], ['DO5081', 'dodatek'],
                ['IN3186', 'inne'], ['IN3759', 'inne'],
                ['MI2400', 'mineralne'], ['MI2516', 'mineralne'], ['MI2523', 'mineralne'], ['MI2905', 'mineralne'],
                ['MI3032', 'mineralne'], ['MI3087', 'mineralne'], ['MI3452', 'mineralne'],
                ['ML2417', 'mleczne'], ['ML2462', 'mleczne'], ['ML2486', 'mleczne'], ['ML2530', 'mleczne'],
                ['ML2547', 'mleczne'], ['ML2585', 'mleczne'], ['ML2592', 'mleczne'], ['ML2721', 'mleczne'],
                ['ML2745', 'mleczne'], ['ML2769', 'mleczne'], ['ML2790', 'mleczne'], ['ML2806', 'mleczne'],
                ['ML2820', 'mleczne'], ['ML2844', 'mleczne'], ['ML2875', 'mleczne'], ['ML2882', 'mleczne'],
                ['ML2899', 'mleczne'], ['ML3018', 'mleczne'], ['ML3025', 'mleczne'], ['ML3100', 'mleczne'],
                ['ML3117', 'mleczne'], ['ML3124', 'mleczne'], ['ML3148', 'mleczne'], ['ML3155', 'mleczne'],
                ['ML3162', 'mleczne'], ['ML3179', 'mleczne'], ['ML3193', 'mleczne'], ['ML3209', 'mleczne'],
                ['ML3216', 'mleczne'], ['ML3223', 'mleczne'], ['ML3230', 'mleczne'], ['ML3247', 'mleczne'],
                ['ML3254', 'mleczne'], ['ML3261', 'mleczne'], ['ML3278', 'mleczne'], ['ML3292', 'mleczne'],
                ['ML3315', 'mleczne'], ['ML3391', 'mleczne'], ['ML3407', 'mleczne'], ['ML3438', 'mleczne'],
                ['ML3445', 'mleczne'], ['ML3469', 'mleczne'], ['ML3636', 'mleczne'], ['ML3643', 'mleczne'],
                ['ML3650', 'mleczne'], ['ML3667', 'mleczne'], ['ML3674', 'mleczne'], ['ML3681', 'mleczne'],
                ['ML3766', 'mleczne'], ['ML3773', 'mleczne'], ['ML3827', 'mleczne'], ['ML3834', 'mleczne'],
                ['ML3841', 'mleczne'], ['ML3858', 'mleczne'], ['ML3865', 'mleczne'], ['ML3872', 'mleczne'],
                ['ML3889', 'mleczne'], ['ML3902', 'mleczne'], ['ML3940', 'mleczne'], ['ML3957', 'mleczne'],
                ['PX2622', 'premiks'], ['PX2639', 'premiks'], ['PX2646', 'premiks'], ['PX3049', 'premiks'],
                ['PX3056', 'premiks'], ['PX3063', 'premiks'], ['PX3070', 'premiks'], ['PX3476', 'premiks'],
                ['PX3483', 'premiks'], ['PX3742', 'premiks'], ['PX3971', 'premiks'], ['PX3988', 'premiks'],
                ['RO2479', 'roślinne'], ['RO2608', 'roślinne'], ['RO2691', 'roślinne'], ['RO2707', 'roślinne'],
                ['RO2714', 'roślinne'], ['RO2738', 'roślinne'], ['RO2752', 'roślinne'], ['RO2783', 'roślinne'],
                ['RO2813', 'roślinne'], ['RO2868', 'roślinne'], ['RO2912', 'roślinne'], ['RO3131', 'roślinne'],
                ['RO3353', 'roślinne'], ['RO3360', 'roślinne'], ['RO3377', 'roślinne'], ['RO3384', 'roślinne'],
                ['RO3421', 'roślinne'], ['RO3568', 'roślinne'], ['RO3575', 'roślinne'], ['RO3582', 'roślinne'],
                ['RO3599', 'roślinne'], ['RO3605', 'roślinne'], ['RO3612', 'roślinne'], ['RO3698', 'roślinne'],
                ['RO3704', 'roślinne'], ['RO3711', 'roślinne'], ['RO3728', 'roślinne'], ['RO3919', 'roślinne'],
                ['RO3926', 'roślinne'], ['RO3964', 'roślinne']
            ];
            
            for (const [kod, grupa] of rawMaterialsData) {
                const id = `RM-${kod}`;
                await pool.execute(
                    `INSERT INTO raw_materials (id, nrPalety, nazwa, productGroup, initialWeight, currentWeight, isBlocked, unit)
                     VALUES (?, ?, ?, ?, 0, 0, 0, 'kg')
                     ON DUPLICATE KEY UPDATE nazwa = VALUES(nazwa), productGroup = VALUES(productGroup)`,
                    [id, kod, kod, grupa]
                );
            }
            console.log(`✅ Zsynchronizowano ${rawMaterialsData.length} definicji surowców`);
        } catch (err) {
            console.log('⚠️ Błąd podczas dodawania surowców:', err.message);
        }
    } catch (err) {
        console.error('❌ Błąd inicjalizacji tabeli raw_materials:', err.message);
    }
}

// Tworzy tabelę katalogu produktów i synchronizuje z raw_materials
async function initProductsTable() {
    try {
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS products (
                id VARCHAR(100) PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                sku VARCHAR(100) UNIQUE,
                description TEXT,
                category VARCHAR(100),
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_sku (sku),
                INDEX idx_category (category)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci;
        `);
        console.log('✅ Tabela products jest gotowa');

        // Synchronizuj istniejące surowce (raw_materials) do katalogu produktów.
        // Tabela `products` może mieć różne schematy (stara aplikacja) — wykryj kolumny i dopasuj insert/update.
        try {
            const [cols] = await pool.query(`SHOW COLUMNS FROM products`);
            const colNames = (cols || []).map(c => c.Field);

            const [rows] = await pool.query(`SELECT nrPalety, nazwa, productGroup, id FROM raw_materials WHERE nrPalety IS NOT NULL`);
            for (const r of rows) {
                const sku = r.nrPalety;
                const pname = r.nazwa || sku;
                const category = r.productGroup || null;

                try {
                    if (colNames.includes('sku') && colNames.includes('name')) {
                        // modern schema
                        const pid = `P-${sku}`;
                        await pool.execute(`INSERT INTO products (id, name, sku, category, createdAt, updatedAt) VALUES (?, ?, ?, ?, NOW(), NOW()) ON DUPLICATE KEY UPDATE name = ?, category = ?, sku = ?, updatedAt = NOW()`, [pid, pname, sku, category, pname, category, sku]);
                    } else if (colNames.includes('nazwa')) {
                        // legacy schema: id (auto), nazwa, typ, jednostka
                        // find existing by nazwa or insert
                        const [[existing]] = await pool.query(`SELECT * FROM products WHERE nazwa = ? LIMIT 1`, [pname]);
                        if (existing) {
                            await pool.execute(`UPDATE products SET nazwa = ?, typ = ?, jednostka = ? WHERE id = ?`, [pname, 'raw', category || 'kg', existing.id]);
                        } else {
                            await pool.execute(`INSERT INTO products (nazwa, typ, jednostka) VALUES (?, ?, ?)`, [pname, 'raw', category || 'kg']);
                        }
                    } else {
                        // unknown schema: skip
                        console.log('⚠️ Nieznany schemat tabeli products, pomijam wpis:', sku);
                    }
                } catch (e) {
                    console.log('⚠️ Błąd podczas synchronizacji rekordu produktu:', e.message);
                }
            }
            console.log('✅ Zsynchronizowano katalog produktów z raw_materials');
        } catch (err) {
            console.log('⚠️ Błąd synchronizacji produktów (select):', err.message);
        }
    } catch (err) {
        console.error('❌ Błąd inicjalizacji tabeli products:', err.message);
    }
}

// Tworzy tabelę form opakowań (packaging_forms)
async function initPackagingFormsTable() {
    try {
        await pool.execute(`
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
        `);
        console.log('✅ Tabela packaging_forms jest gotowa');
    } catch (err) {
        console.error('❌ Błąd inicjalizacji tabeli packaging_forms:', err.message);
    }
}

// Tworzy tabelę roles jeśli nie istnieje

// Główna funkcja inicjalizacji
async function initialize() {
    await initUsersTable();
    await initRawMaterialsTable();
    await initProductsTable();
    await initPackagingFormsTable();
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

// GET: Pobieranie wszystkich produktów (surowców) dla katalogu
app.get('/api/products', async (req, res) => {
    try {
        // Detect products table schema
        const [cols] = await pool.query(`SHOW COLUMNS FROM products`);
        const colNames = (cols || []).map(c => c.Field);

        if (colNames.includes('sku') && colNames.includes('name')) {
            const [catalogRows] = await pool.query(`
                SELECT sku as name, 'raw_material' as type, name as fullName, category as groupName
                FROM products
                WHERE sku IS NOT NULL
                ORDER BY name ASC
            `);
            if (catalogRows && catalogRows.length > 0) return res.json(catalogRows);
        } else if (colNames.includes('nazwa')) {
            const [legacyRows] = await pool.query(`
                SELECT nazwa as name, CASE WHEN typ='raw' THEN 'raw_material' WHEN typ='fg' THEN 'finished_good' WHEN typ='pkg' THEN 'packaging' ELSE typ END as type, nazwa as fullName, jednostka as groupName
                FROM products
                ORDER BY nazwa ASC
            `);
            if (legacyRows && legacyRows.length > 0) return res.json(legacyRows);
        }

        // Fallback to raw_materials if products table empty or missing
        const [rows] = await pool.query(`
            SELECT nrPalety as name, 'raw_material' as type, nazwa as fullName, productGroup as groupName
            FROM raw_materials
            WHERE nrPalety IS NOT NULL
            ORDER BY nazwa ASC
        `);
        res.json(rows);
    } catch (err) {
        console.error('❌ Błąd pobierania produktów:', err);
        res.status(500).json({ error: 'Błąd pobierania produktów' });
    }
});

// DEBUG: pokaż schemat tabeli products (tylko do diagnostyki)
app.get('/api/_debug/products-schema', async (req, res) => {
    try {
        const [cols] = await pool.query(`SHOW COLUMNS FROM products`);
        res.json(cols);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST: Dodawanie nowego produktu (surowca)
app.post('/api/products', async (req, res) => {
    const { name, type, fullName, groupName } = req.body;

    if (type !== 'raw_material') {
        return res.status(400).json({ error: 'Aktualnie obsługiwane są tylko surowce (raw_material)' });
    }

    try {
        const sku = name;
        const id = `P-${Date.now()}`;
        await pool.execute(
            `INSERT INTO products (id, name, sku, category) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE name = VALUES(name), category = VALUES(category)`,
            [id, fullName || name, sku, groupName || 'inne']
        );
        res.json({ success: true, message: 'Produkt katalogowy został dodany', id });
    } catch (err) {
        console.error('❌ Błąd dodawania produktu do katalogu:', err);
        res.status(500).json({ error: 'Błąd dodawania produktu' });
    }
});

// PUT: Aktualizacja produktu (surowca)
app.put('/api/products/:sku', async (req, res) => {
    const { sku } = req.params;
    const { fullName, groupName } = req.body;

    try {
        await pool.execute(
            `UPDATE products SET name = ?, category = ? WHERE sku = ?`,
            [fullName, groupName, sku]
        );
        res.json({ success: true, message: 'Produkt katalogowy został zaktualizowany' });
    } catch (err) {
        console.error('❌ Błąd aktualizacji produktu katalogowego:', err);
        res.status(500).json({ error: 'Błąd aktualizacji produktu' });
    }
});

// DELETE: Usuwanie produktu (surowca)
app.delete('/api/products/:sku', async (req, res) => {
    const { sku } = req.params;

    try {
        await pool.execute('DELETE FROM products WHERE sku = ?', [sku]);
        res.json({ success: true, message: 'Produkt katalogowy został usunięty' });
    } catch (err) {
        console.error('❌ Błąd usuwania produktu katalogowego:', err);
        res.status(500).json({ error: 'Błąd usuwania produktu' });
    }
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n====================================================`);
    console.log(`🚀 SERWER API DZIAŁA: http://localhost:${PORT}`);
    console.log(`📡 POŁĄCZENIE Z BAZĄ: ${dbConfig.host}:${dbConfig.port}`);
    console.log(`====================================================\n`);
});
