import mysql from 'mysql2/promise';

(async function(){
  try{
    const conn = await mysql.createConnection({
      host: 'filipinka.myqnapcloud.com',
      port: 3307,
      user: 'rootMlecznaDroga',
      password: 'Filipinka2025',
      database: 'MleczDroga',
      connectTimeout: 10000
    });

    const tables = ['inventory_sessions','inventory_snapshots','inventory_scans','raw_materials'];

    for(const t of tables){
      try{
        const [exists] = await conn.query("SHOW TABLES LIKE '"+t+"'");
        console.log('---', t, '---', exists.length ? 'EXISTS' : 'MISSING');
        if(exists.length){
          const [cols] = await conn.query('SHOW COLUMNS FROM `'+t+'`');
          console.log(JSON.stringify(cols, null, 2));
        }
      }catch(e){
        console.error('ERROR checking', t, e && e.message);
      }
    }

    await conn.end();
  }catch(err){
    console.error('CONNECT_ERROR', err && err.message);
    process.exit(2);
  }
})();
