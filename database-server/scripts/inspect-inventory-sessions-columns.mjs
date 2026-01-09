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
  const [rows] = await conn.query("SELECT COLUMN_NAME,COLUMN_TYPE,CHARACTER_SET_NAME,COLLATION_NAME,IS_NULLABLE,COLUMN_KEY FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'inventory_sessions'", [config.database]);
  console.log(JSON.stringify(rows, null, 2));
  await conn.end();
})();
