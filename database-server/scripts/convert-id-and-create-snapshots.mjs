import mysql from 'mysql2/promise';

const config = {
  host: 'filipinka.myqnapcloud.com',
  port: 3307,
  user: 'rootMlecznaDroga',
  password: 'Filipinka2025',
  database: 'MleczDroga',
};

(async () => {
  const conn = await mysql.createConnection(config);
  try {
    console.log('Altering inventory_sessions.id to VARCHAR(50)...');
    await conn.query("ALTER TABLE inventory_sessions MODIFY id VARCHAR(50) NOT NULL");
    console.log('Altered. Now attempting to create inventory_snapshots and inventory_scans...');
    const createSnapshots = `
      CREATE TABLE IF NOT EXISTS inventory_snapshots (
        id INT AUTO_INCREMENT PRIMARY KEY,
        session_id VARCHAR(50),
        pallet_id VARCHAR(50),
        product_name VARCHAR(255),
        expected_quantity DECIMAL(10,3),
        location_id VARCHAR(100),
        FOREIGN KEY (session_id) REFERENCES inventory_sessions(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci;
    `;
    const createScans = `
      CREATE TABLE IF NOT EXISTS inventory_scans (
        id INT AUTO_INCREMENT PRIMARY KEY,
        session_id VARCHAR(50),
        location_id VARCHAR(100),
        pallet_id VARCHAR(50),
        counted_quantity DECIMAL(10,3),
        scanned_by VARCHAR(100),
        scanned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_scan (session_id, location_id, pallet_id),
        FOREIGN KEY (session_id) REFERENCES inventory_sessions(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci;
    `;
    await conn.query(createSnapshots);
    await conn.query(createScans);
    console.log('Created inventory_snapshots and inventory_scans successfully.');
  } catch (err) {
    console.error('Error during conversion/create:', err);
  } finally {
    await conn.end();
  }
})();
