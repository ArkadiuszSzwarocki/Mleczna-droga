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
  const [rows] = await conn.query(
    `SELECT TABLE_SCHEMA, TABLE_NAME, CONSTRAINT_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
     FROM information_schema.KEY_COLUMN_USAGE
     WHERE REFERENCED_TABLE_NAME = 'inventory_sessions' AND REFERENCED_TABLE_SCHEMA = ?`,
    [config.database]
  );
  console.log(JSON.stringify(rows, null, 2));
  await conn.end();
})();
