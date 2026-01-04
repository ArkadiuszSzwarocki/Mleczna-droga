
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

        // Tabela uprawnień dla ról
        await connection.query(`
            CREATE TABLE IF NOT EXISTS role_permissions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                role_name VARCHAR(100) NOT NULL,
                permission VARCHAR(100) NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY unique_role_permission (role_name, permission),
                KEY idx_role (role_name)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        // Tabela uprawnień indywidualnych dla użytkowników
        await connection.query(`
            CREATE TABLE IF NOT EXISTS user_permissions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                permission VARCHAR(100) NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY unique_user_permission (user_id, permission),
                KEY idx_user (user_id),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
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

        // Wyczyszczenie starego mapowania uprawnień (opcjonalnie)
        await connection.query(`TRUNCATE TABLE role_permissions;`);

        // Domyślne mapowanie uprawnień dla ról
        const rolePermissionsData = [
            // Admin ma wszystkie uprawnienia
            ['admin', 'manage_users'],
            ['admin', 'manage_permissions'],
            ['admin', 'manage_system_settings'],
            ['admin', 'manage_products'],
            ['admin', 'manage_production_stations'],
            ['admin', 'create_delivery'],
            ['admin', 'process_delivery_lab'],
            ['admin', 'process_delivery_warehouse'],
            ['admin', 'manage_deliveries'],
            ['admin', 'plan_production_agro'],
            ['admin', 'execute_production_agro'],
            ['admin', 'plan_production_psd'],
            ['admin', 'execute_production_psd'],
            ['admin', 'plan_mixing'],
            ['admin', 'execute_mixing'],
            ['admin', 'plan_dispatch_orders'],
            ['admin', 'manage_dispatch_orders'],
            ['admin', 'process_analysis'],
            ['admin', 'manage_adjustments'],
            ['admin', 'manage_pallet_lock'],
            ['admin', 'extend_expiry_date'],
            ['admin', 'plan_internal_transfers'],
            ['admin', 'manage_internal_transfers'],
            ['admin', 'manage_recipes'],
            ['admin', 'view_traceability'],
            ['admin', 'manage_suppliers_customers'],
            
            // Boss ma wszystkie uprawnienia (jak admin)
            ['boss', 'manage_users'],
            ['boss', 'manage_permissions'],
            ['boss', 'manage_system_settings'],
            ['boss', 'manage_products'],
            ['boss', 'manage_production_stations'],
            ['boss', 'create_delivery'],
            ['boss', 'process_delivery_lab'],
            ['boss', 'process_delivery_warehouse'],
            ['boss', 'manage_deliveries'],
            ['boss', 'plan_production_agro'],
            ['boss', 'execute_production_agro'],
            ['boss', 'plan_production_psd'],
            ['boss', 'execute_production_psd'],
            ['boss', 'plan_mixing'],
            ['boss', 'execute_mixing'],
            ['boss', 'plan_dispatch_orders'],
            ['boss', 'manage_dispatch_orders'],
            ['boss', 'process_analysis'],
            ['boss', 'manage_adjustments'],
            ['boss', 'manage_pallet_lock'],
            ['boss', 'extend_expiry_date'],
            ['boss', 'plan_internal_transfers'],
            ['boss', 'manage_internal_transfers'],
            ['boss', 'manage_recipes'],
            ['boss', 'view_traceability'],
            ['boss', 'manage_suppliers_customers'],

            // Planista
            ['planista', 'plan_production_agro'],
            ['planista', 'plan_production_psd'],
            ['planista', 'plan_mixing'],
            ['planista', 'plan_dispatch_orders'],
            ['planista', 'manage_deliveries'],
            ['planista', 'create_delivery'],
            ['planista', 'manage_adjustments'],
            ['planista', 'plan_internal_transfers'],
            ['planista', 'manage_internal_transfers'],
            ['planista', 'manage_recipes'],
            ['planista', 'view_traceability'],

            // Kierownik magazynu
            ['kierownik magazynu', 'create_delivery'],
            ['kierownik magazynu', 'process_delivery_warehouse'],
            ['kierownik magazynu', 'execute_production_agro'],
            ['kierownik magazynu', 'manage_dispatch_orders'],
            ['kierownik magazynu', 'manage_pallet_lock'],
            ['kierownik magazynu', 'manage_internal_transfers'],
            ['kierownik magazynu', 'view_traceability'],

            // Magazynier
            ['magazynier', 'create_delivery'],
            ['magazynier', 'process_delivery_warehouse'],
            ['magazynier', 'execute_production_agro'],
            ['magazynier', 'manage_dispatch_orders'],
            ['magazynier', 'manage_internal_transfers'],

            // Laborant
            ['lab', 'process_delivery_lab'],
            ['lab', 'process_analysis'],
            ['lab', 'manage_adjustments'],
            ['lab', 'manage_pallet_lock'],
            ['lab', 'extend_expiry_date'],
            ['lab', 'create_delivery'],
            ['lab', 'manage_recipes'],
            ['lab', 'execute_mixing'],
            ['lab', 'view_traceability'],

            // Lider
            ['lider', 'execute_production_agro'],
            ['lider', 'execute_production_psd'],
            ['lider', 'execute_mixing'],
            ['lider', 'manage_adjustments'],
            ['lider', 'manage_internal_transfers'],
            ['lider', 'plan_production_agro'],
            ['lider', 'plan_production_psd'],
            ['lider', 'manage_pallet_lock'],
            ['lider', 'view_traceability'],

            // Operator AGRO
            ['operator_agro', 'execute_production_agro'],
            ['operator_agro', 'manage_adjustments'],

            // Operator PSD
            ['operator_psd', 'execute_production_psd'],
            ['operator_psd', 'execute_mixing'],
            ['operator_psd', 'manage_adjustments'],

            // Operator procesu
            ['operator_procesu', 'manage_production_stations'],
            ['operator_procesu', 'execute_production_agro'],
            ['operator_procesu', 'manage_adjustments'],
            ['operator_procesu', 'process_delivery_warehouse'],

            // User (brak uprawnień)
        ];

        // Wstaw uprawnienia dla ról
        for (const [role, permission] of rolePermissionsData) {
            await connection.query(
                'INSERT IGNORE INTO role_permissions (role_name, permission) VALUES (?, ?)',
                [role, permission]
            );
        }

        console.log('✅ Baza danych jest gotowa do pracy.');
    } catch (err) {
        console.error('❌ Błąd inicjalizacji bazy:', err.message);
    } finally {
        await connection.end();
    }
}

init();
