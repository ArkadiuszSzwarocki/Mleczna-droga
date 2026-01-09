import mysql from 'mysql2/promise';

const config = {
  host: 'filipinka.myqnapcloud.com',
  port: 3307,
  user: 'rootMlecznaDroga',
  password: 'Filipinka2025',
  database: 'MleczDroga',
  connectTimeout: 10000,
};

async function run() {
  const conn = await mysql.createConnection(config);
  console.log('Connected to DB:', config.host + ':' + config.port, 'DB:', config.database);
  try {
    console.log('Creating backup table inventory_sessions_backup (if not exists)...');
    await conn.query("CREATE TABLE IF NOT EXISTS inventory_sessions_backup LIKE inventory_sessions");
    console.log('Copying data into backup table (may take a while)...');
    await conn.query('TRUNCATE TABLE inventory_sessions_backup');
    await conn.query('INSERT INTO inventory_sessions_backup SELECT * FROM inventory_sessions');
    console.log('Backup complete. Now attempting ALTER TABLE to InnoDB...');
    const [res] = await conn.query("ALTER TABLE inventory_sessions ENGINE=InnoDB, CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    console.log('ALTER TABLE result:', res);
  } catch (err) {
    console.error('Error during conversion:', err && err.message ? err.message : err);
    console.error(err);
    await conn.end();
    process.exit(1);
  }

  try {
    const [rows] = await conn.query("SELECT TABLE_NAME, ENGINE, TABLE_COLLATION FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME IN ('inventory_sessions','inventory_sessions_backup','inventory_snapshots','inventory_scans')", [config.database]);
    console.table(rows);
  } finally {
    await conn.end();
  }
}

run().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
