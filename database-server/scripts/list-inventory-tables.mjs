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
  console.log('Table engines and collations in', config.database);
  const [rows] = await conn.query("SELECT TABLE_NAME, ENGINE, TABLE_COLLATION FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME LIKE 'inventory_%'", [config.database]);
  console.log(JSON.stringify(rows, null, 2));
  await conn.end();
})();
