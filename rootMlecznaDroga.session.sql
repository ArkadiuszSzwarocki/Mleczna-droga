USE mleczna_droga;

-- 1. Tabela Uprawnień (Permissions)
-- Przechowuje klucze uprawnień używane w kodzie (np. 'manage_users')
CREATE TABLE IF NOT EXISTS permissions (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Tabela Ról (Roles)
-- Przechowuje główne role (np. 'admin', 'planista', 'lab')
CREATE TABLE IF NOT EXISTS roles (
    id VARCHAR(50) PRIMARY KEY,
    label VARCHAR(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Tabela Mapowania Uprawnień do Ról (Many-to-Many)
CREATE TABLE IF NOT EXISTS role_permissions (
    role_id VARCHAR(50),
    permission_id VARCHAR(50),
    PRIMARY KEY (role_id, permission_id),
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Tabela Oddziałów / Podról (Sub-Roles)
-- Przechowuje oddziały (np. 'AGRO', 'OSIP')
CREATE TABLE IF NOT EXISTS sub_roles (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. Tabela Użytkowników
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(50) PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role_id VARCHAR(50),
    sub_role_id VARCHAR(50),
    pin VARCHAR(10) DEFAULT '0000',
    is_temporary_password TINYINT(1) DEFAULT 1,
    password_last_changed DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE SET NULL,
    FOREIGN KEY (sub_role_id) REFERENCES sub_roles(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ==========================================
-- ZASILANIE DANYCH (Inicjalizacja)
-- ==========================================

-- A. Wstawianie Uprawnień (zgodnie z Permission enum w types.ts)
INSERT INTO permissions (id, name) VALUES
('manage_users', 'Zarządzanie użytkownikami'),
('manage_permissions', 'Zarządzanie uprawnieniami'),
('manage_system_settings', 'Ustawienia systemowe'),
('manage_products', 'Katalog produktów'),
('manage_production_stations', 'Stacje zasypowe'),
('create_delivery', 'Tworzenie dostaw'),
('process_delivery_lab', 'Badania laboratoryjne'),
('process_delivery_warehouse', 'Przyjęcia magazynowe'),
('manage_deliveries', 'Zarządzanie dostawami'),
('plan_production_agro', 'Planowanie AGRO'),
('execute_production_agro', 'Realizacja AGRO'),
('plan_production_psd', 'Planowanie PSD'),
('execute_production_psd', 'Realizacja PSD'),
('plan_mixing', 'Planowanie Miksowania'),
('execute_mixing', 'Realizacja Miksowania'),
('plan_dispatch_orders', 'Planowanie Wydań'),
('manage_dispatch_orders', 'Realizacja Wydań (Rampa)'),
('process_analysis', 'Badania NIRS'),
('manage_adjustments', 'Zarządzanie dosypkami'),
('manage_pallet_lock', 'Blokowanie/Zwalnianie palet'),
('extend_expiry_date', 'Przedłużanie terminów ważności'),
('plan_internal_transfers', 'Planowanie transferów OSiP'),
('manage_internal_transfers', 'Realizacja transferów OSiP');

-- B. Wstawianie Ról (zgodnie z PREDEFINED_ROLES w constants.ts)
INSERT INTO roles (id, label) VALUES
('admin', 'Administrator'),
('planista', 'Planista'),
('magazynier', 'Magazynier'),
('kierownik_magazynu', 'Kierownik Magazynu'),
('lab', 'Laborant'),
('operator_psd', 'Operator PSD'),
('operator_agro', 'Operator AGRO'),
('operator_procesu', 'Operator Procesu'),
('boss', 'Szef'),
('lider', 'Lider'),
('user', 'Użytkownik');

-- C. Wstawianie Oddziałów (Sub-Roles)
INSERT INTO sub_roles (id, name) VALUES
('AGRO', 'Oddział Produkcji Agro (Centrala)'),
('OSIP', 'Oddział OSiP (Magazyn Zewnętrzny)');

-- D. Przykładowe powiązanie uprawnień dla roli 'magazynier'
-- (Zgodnie z DEFAULT_PERMISSIONS w constants.ts)
INSERT INTO role_permissions (role_id, permission_id) VALUES
('magazynier', 'create_delivery'),
('magazynier', 'process_delivery_warehouse'),
('magazynier', 'execute_production_agro'),
('magazynier', 'manage_dispatch_orders'),
('magazynier', 'manage_internal_transfers');

-- E. Tworzenie konta administratora (hasło: password - należy zmienić po pierwszym logowaniu)
-- Uwaga: W produkcji hasło powinno być zahaszowane używając bcrypt
INSERT INTO users (id, username, password, role_id, sub_role_id, pin, is_temporary_password, password_last_changed) VALUES
('u-admin', 'admin', '$2b$10$YourHashedPasswordHere', 'admin', 'AGRO', '1234', 0, NOW())
ON DUPLICATE KEY UPDATE username=username;

COMMIT;