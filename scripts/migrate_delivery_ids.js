#!/usr/bin/env node
/**
 * Safe migration script:
 * - Aligns `delivery_items.id` and `raw_materials.id` to an 18-digit numeric id
 * - Updates related tables: `delivery_lab_results`, `delivery_documents`, `pallet_location_history`
 * - Default mode is dry-run (no DB changes). Use `--apply` to perform changes.
 * - Creates a JSON backup of affected rows before applying.
 */

import fs from 'fs/promises';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config({ path: './database-server/.env' });

const argv = process.argv.slice(2);
const APPLY = argv.includes('--apply');
const LIMIT_ARG = argv.find(a => a.startsWith('--limit='));
const LIMIT = LIMIT_ARG ? parseInt(LIMIT_ARG.split('=')[1], 10) : null;

const epoch1982 = new Date('1982-06-07T00:00:00Z').getTime();
const generate18DigitId = () => {
    const diff = Math.max(0, Date.now() - epoch1982);
    const base = `${diff}`;
    const needed = 18 - base.length;
    if (needed > 0) {
        const randomPart = Math.floor(Math.random() * Math.pow(10, needed)).toString().padStart(needed, '0');
        return `${base}${randomPart}`;
    }
    return base.substring(0, 18);
};

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'mleczna_droga',
    multipleStatements: false
};

async function ensureUniqueId(conn, candidate) {
    let id = candidate;
    while (true) {
        const [[row]] = await conn.query('SELECT COUNT(*) as cnt FROM delivery_items WHERE id = ?', [id]);
        if (row.cnt === 0) return id;
        id = generate18DigitId();
    }
}

async function run() {
    const conn = await mysql.createConnection(dbConfig);
    try {
        const [items] = await conn.query('SELECT * FROM delivery_items ORDER BY created_at ASC' + (LIMIT ? ' LIMIT ' + LIMIT : ''), []);

        const plan = [];

        for (const item of items) {
            const oldId = item.id;
            const oldPallet = item.pallet_id || null;

            const isNumeric18 = typeof oldId === 'string' && /^\d{18}$/.test(oldId);
            const targetId = isNumeric18 ? oldId : generate18DigitId();

            plan.push({ oldId, oldPallet, targetId, isNumeric18 });
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupPath = `migrations/backup_delivery_items_${timestamp}.json`;
        await fs.mkdir('migrations', { recursive: true });
        await fs.writeFile(backupPath, JSON.stringify({ plan, previewCount: plan.length }, null, 2));

        console.log(`Dry-run summary: ${plan.length} delivery_items processed. Backup saved to ${backupPath}`);

        if (!APPLY) {
            console.log('Run with --apply to perform changes. This was a dry-run.');
            await conn.end();
            return;
        }

        // APPLY mode
        console.log('Applying changes...');
        const applied = [];
        for (const p of plan) {
            const { oldId, oldPallet } = p;
            let targetId = p.targetId;

            // ensure unique
            targetId = await ensureUniqueId(conn, targetId);

            await conn.beginTransaction();
            try {
                // Update delivery_items PK and pallet_id
                await conn.execute('UPDATE delivery_items SET id = ?, pallet_id = ? WHERE id = ?', [targetId, targetId, oldId]);

                // Update referencing tables
                await conn.execute('UPDATE delivery_lab_results SET delivery_item_id = ? WHERE delivery_item_id = ?', [targetId, oldId]);
                await conn.execute('UPDATE delivery_documents SET delivery_item_id = ? WHERE delivery_item_id = ?', [targetId, oldId]);
                await conn.execute('UPDATE pallet_location_history SET pallet_id = ? WHERE pallet_id = ?', [targetId, oldPallet]);

                // Check for existing raw_materials with nrPalety == oldPallet or nrPalety == oldId
                const [rmRows] = await conn.query('SELECT * FROM raw_materials WHERE nrPalety = ? OR nrPalety = ?', [oldPallet, oldId]);
                if (rmRows.length > 0) {
                    // Update first matching raw_materials id/nrPalety
                    await conn.execute('UPDATE raw_materials SET id = ?, nrPalety = ? WHERE id = ? OR nrPalety = ? LIMIT 1', [targetId, targetId, oldId, oldPallet]);
                } else {
                    // Insert new raw_materials row mapping basic fields from delivery_items
                    const [items2] = await conn.query('SELECT * FROM delivery_items WHERE id = ?', [targetId]);
                    const it = items2[0];
                    await conn.execute(`INSERT INTO raw_materials (id, nrPalety, nazwa, dataProdukcji, dataPrzydatnosci, initialWeight, currentWeight, isBlocked, blockReason, currentLocation, batchNumber, packageForm, unit, labAnalysisNotes, deliveryRef, deliveryDate, createdAt)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`, [
                        targetId, targetId, it.product_name || null, it.production_date || null, it.expiry_date || null, it.net_weight || 0, it.net_weight || 0, it.is_blocked || 0, it.block_reason || null, it.location || null, it.batch_number || null, it.packaging_type || null, it.unit || null, it.lab_notes || null, null, null
                    ]);
                }

                await conn.commit();
                applied.push({ oldId, targetId });
            } catch (err) {
                await conn.rollback();
                console.error('Transaction failed for', oldId, err.message);
                throw err;
            }
        }

        console.log('Applied changes for', applied.length, 'items.');
        await conn.end();
    } catch (err) {
        console.error('Migration failed:', err);
        try { await conn.end(); } catch (e) {}
        process.exit(1);
    }
}

run();
