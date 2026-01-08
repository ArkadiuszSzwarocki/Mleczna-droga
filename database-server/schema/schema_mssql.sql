-- MSSQL Schema for Mleczna Droga
-- Host: filipinka.myqnapcloud.com:3307 (original MySQL host shown for reference)
-- This file contains T-SQL compatible CREATE statements for Microsoft SQL Server.

-- =====================================================
-- Table: deliveries
-- =====================================================
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'deliveries')
BEGIN
CREATE TABLE dbo.deliveries (
    id NVARCHAR(50) PRIMARY KEY,
    orderRef NVARCHAR(100) NULL,
    supplier NVARCHAR(100) NULL,
    deliveryDate DATE NULL,
    status NVARCHAR(50) NULL,
    items NVARCHAR(MAX) NULL, -- JSON stored as NVARCHAR(MAX). Use ISJSON(items)=1 for validation if needed.
    createdBy NVARCHAR(50) NULL,
    createdAt DATETIME2 DEFAULT SYSUTCDATETIME(),
    requiresLab BIT DEFAULT 0,
    warehouseStageCompletedAt DATETIME2 NULL
);
END
GO

-- Indexes
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_status' AND object_id = OBJECT_ID('dbo.deliveries'))
    CREATE INDEX idx_status ON dbo.deliveries(status);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_createdAt' AND object_id = OBJECT_ID('dbo.deliveries'))
    CREATE INDEX idx_createdAt ON dbo.deliveries(createdAt);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_supplier' AND object_id = OBJECT_ID('dbo.deliveries'))
    CREATE INDEX idx_supplier ON dbo.deliveries(supplier);
GO

-- =====================================================
-- Table: system_logs
-- =====================================================
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'system_logs')
BEGIN
CREATE TABLE dbo.system_logs (
    id INT IDENTITY(1,1) PRIMARY KEY,
    [timestamp] DATETIME2 DEFAULT SYSUTCDATETIME(),
    [level] NVARCHAR(20) NULL,
    [message] NVARCHAR(MAX) NULL,
    [context] NVARCHAR(100) NULL,
    [user] NVARCHAR(50) NULL
);
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_timestamp' AND object_id = OBJECT_ID('dbo.system_logs'))
    CREATE INDEX idx_timestamp ON dbo.system_logs([timestamp]);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_level' AND object_id = OBJECT_ID('dbo.system_logs'))
    CREATE INDEX idx_level ON dbo.system_logs([level]);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_user' AND object_id = OBJECT_ID('dbo.system_logs'))
    CREATE INDEX idx_user ON dbo.system_logs([user]);
GO

-- =====================================================
-- Table: users
-- =====================================================
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'users')
BEGIN
CREATE TABLE dbo.users (
    id NVARCHAR(50) PRIMARY KEY,
    username NVARCHAR(50) NOT NULL,
    email NVARCHAR(100) NULL,
    role NVARCHAR(50) NULL,
    createdAt DATETIME2 DEFAULT SYSUTCDATETIME(),
    lastLogin DATETIME2 NULL,
    isActive BIT DEFAULT 1
);
-- Unique constraints
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'uq_users_username' AND object_id = OBJECT_ID('dbo.users'))
    CREATE UNIQUE INDEX uq_users_username ON dbo.users(username);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'uq_users_email' AND object_id = OBJECT_ID('dbo.users'))
    CREATE UNIQUE INDEX uq_users_email ON dbo.users(email);
END
GO

-- Indexes
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_username' AND object_id = OBJECT_ID('dbo.users'))
    CREATE INDEX idx_username ON dbo.users(username);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_role' AND object_id = OBJECT_ID('dbo.users'))
    CREATE INDEX idx_role ON dbo.users(role);
GO

-- =====================================================
-- Table: warehouses
-- =====================================================
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'warehouses')
BEGIN
CREATE TABLE dbo.warehouses (
    id NVARCHAR(50) PRIMARY KEY,
    name NVARCHAR(100) NOT NULL,
    location NVARCHAR(100) NULL,
    capacity INT NULL,
    createdAt DATETIME2 DEFAULT SYSUTCDATETIME()
);
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_name' AND object_id = OBJECT_ID('dbo.warehouses'))
    CREATE INDEX idx_name ON dbo.warehouses(name);
GO

-- =====================================================
-- Table: warehouseLocation
-- =====================================================
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'warehouseLocation')
BEGIN
CREATE TABLE dbo.warehouseLocation (
    id INT IDENTITY(1,1) PRIMARY KEY,
    code NVARCHAR(50) NOT NULL UNIQUE,
    name NVARCHAR(255) NOT NULL,
    [type] NVARCHAR(50) DEFAULT N'zone',
    capacity INT NULL,
    is_locked BIT DEFAULT 0,
    is_active BIT DEFAULT 1,
    created_at DATETIME2 DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2 DEFAULT SYSUTCDATETIME()
);
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_code' AND object_id = OBJECT_ID('dbo.warehouseLocation'))
    CREATE INDEX idx_code ON dbo.warehouseLocation(code);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_type' AND object_id = OBJECT_ID('dbo.warehouseLocation'))
    CREATE INDEX idx_type ON dbo.warehouseLocation([type]);
GO

-- Optional trigger to update 'updated_at' on change
IF OBJECT_ID('dbo.trg_warehouseLocation_update','TR') IS NULL
EXEC('CREATE TRIGGER dbo.trg_warehouseLocation_update
ON dbo.warehouseLocation
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE wl
    SET updated_at = SYSUTCDATETIME()
    FROM dbo.warehouseLocation wl
    JOIN inserted i ON wl.id = i.id;
END');
GO

-- =====================================================
-- Table: products
-- =====================================================
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'products')
BEGIN
CREATE TABLE dbo.products (
    id NVARCHAR(50) PRIMARY KEY,
    name NVARCHAR(100) NOT NULL,
    sku NVARCHAR(50) NULL,
    description NVARCHAR(MAX) NULL,
    category NVARCHAR(50) NULL,
    createdAt DATETIME2 DEFAULT SYSUTCDATETIME()
);
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_sku' AND object_id = OBJECT_ID('dbo.products'))
    CREATE INDEX idx_sku ON dbo.products(sku);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_category' AND object_id = OBJECT_ID('dbo.products'))
    CREATE INDEX idx_category ON dbo.products(category);
GO

-- =====================================================
-- Table: inventory_sessions
-- =====================================================
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'inventory_sessions')
BEGIN
CREATE TABLE dbo.inventory_sessions (
    id NVARCHAR(50) PRIMARY KEY,
    name NVARCHAR(100) NOT NULL,
    userId NVARCHAR(50) NOT NULL,
    createdAt DATETIME2 DEFAULT SYSUTCDATETIME(),
    [status] NVARCHAR(50) NULL,
    results NVARCHAR(MAX) NULL,
    CONSTRAINT fk_inventory_sessions_user FOREIGN KEY (userId) REFERENCES dbo.users(id) ON DELETE CASCADE
);
END
GO
