import mysql from 'mysql2/promise';
import fs from 'fs';

(async function(){
  const config = {
    host: 'filipinka.myqnapcloud.com',
    port: 3307,
    user: 'rootMlecznaDroga',
    password: 'Filipinka2025',
    database: 'MleczDroga',
    connectTimeout: 10000
  };

  const conn = await mysql.createConnection(config);
  try{
    const tables = ['inventory_sessions','inventory_snapshots','inventory_scans'];

    // 1) Backup SHOW CREATE TABLE
    for(const t of tables){
      try{
        const [rows] = await conn.query("SHOW CREATE TABLE `"+t+"`");
        const key = Object.keys(rows[0]).find(k=>k.toLowerCase().includes('create')); 
        const ddl = rows[0][key];
        fs.writeFileSync(`backup_${t}_create.sql`, ddl+";\n");
        console.log('Backed up CREATE TABLE for', t);
      }catch(e){
        console.error('Failed to backup',t,e.message);
      }
    }

    // 2) Find orphan session_ids
    const orphanChecks = [
      {table:'inventory_snapshots', col:'session_id'},
      {table:'inventory_scans', col:'session_id'}
    ];

    for(const chk of orphanChecks){
      const q = `SELECT COUNT(*) as c FROM ${chk.table} WHERE ${chk.col} IS NOT NULL AND ${chk.col} NOT IN (SELECT id FROM inventory_sessions)`;
      const [[res]] = await conn.query(q);
      console.log(`Orphans in ${chk.table}.${chk.col}:`, res.c);
      if(res.c>0){
        // set them to NULL to allow FK creation
        const upd = `UPDATE ${chk.table} SET ${chk.col}=NULL WHERE ${chk.col} IS NOT NULL AND ${chk.col} NOT IN (SELECT id FROM inventory_sessions)`;
        const [u] = await conn.query(upd);
        console.log('Cleared orphan session_ids in', chk.table, 'affectedRows=', u.affectedRows);
      }
    }

    // 3) Modify enum on inventory_sessions.status
    try{
      const alterStatus = "ALTER TABLE inventory_sessions MODIFY COLUMN status ENUM('ongoing','pending_review','completed','cancelled','active') NOT NULL DEFAULT 'ongoing'";
      await conn.query(alterStatus);
      console.log('Modified inventory_sessions.status enum');
    }catch(e){
      console.error('Failed to modify status enum:', e.message);
    }

    // 4) Add foreign keys if not exist
    const fks = [
      {table:'inventory_snapshots', col:'session_id', name:'fk_inv_snap_session'},
      {table:'inventory_scans', col:'session_id', name:'fk_inv_scans_session'}
    ];

    for(const fk of fks){
      // check existence
      const [existRows] = await conn.query(`SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='${fk.table}' AND COLUMN_NAME='${fk.col}' AND REFERENCED_TABLE_NAME='inventory_sessions'`);
      if(existRows.length){
        console.log(`Foreign key on ${fk.table}.${fk.col} already exists (first match: ${existRows[0].CONSTRAINT_NAME})`);
        continue;
      }
      try{
        const addfk = `ALTER TABLE ${fk.table} ADD CONSTRAINT ${fk.name} FOREIGN KEY (${fk.col}) REFERENCES inventory_sessions(id) ON DELETE CASCADE ON UPDATE CASCADE`;
        await conn.query(addfk);
        console.log('Added FK', fk.name, 'on', fk.table);
      }catch(e){
        console.error('Failed to add FK', fk.name, e.message);
      }
    }

    console.log('Done.');
  }catch(err){
    console.error('ERROR', err.message);
  }finally{
    await conn.end();
  }
})();
