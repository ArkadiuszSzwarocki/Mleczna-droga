import mysql from 'mysql2/promise';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

dotenv.config();

const BCRYPT_ROUNDS = 10;

async function migratePasswords() {
    const dbConfig = {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '3307'),
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'mleczna_droga'
    };

    const pool = mysql.createPool(dbConfig);

    try {
        console.log('🔄 Migracja haseł - zahasowywanie istniejących haseł w bazie...\n');

        // Pobierz wszystkich użytkowników
        const [users] = await pool.query('SELECT id, username, password_hash FROM users');

        if (users.length === 0) {
            console.log('ℹ️ Brak użytkowników do migracji');
            await pool.end();
            return;
        }

        console.log(`📋 Znaleziono ${users.length} użytkowników do migracji\n`);

        let migratedCount = 0;
        let skippedCount = 0;

        for (const user of users) {
            const plainPassword = user.password_hash;

            // Sprawdź czy hasło jest już zahasowane (bcrypt hash zaczyna się od $2a$, $2b$, $2y$)
            if (plainPassword.startsWith('$2a$') || plainPassword.startsWith('$2b$') || plainPassword.startsWith('$2y$')) {
                console.log(`⏭️  ${user.id} - ${user.username}: hasło już zahasowane, pomijam`);
                skippedCount++;
                continue;
            }

            // Zahasuj hasło
            const hashedPassword = await bcrypt.hash(plainPassword, BCRYPT_ROUNDS);

            // Aktualizuj bazę
            await pool.execute(
                'UPDATE users SET password_hash = ? WHERE id = ?',
                [hashedPassword, user.id]
            );

            console.log(`✅ ${user.id} - ${user.username}: hasło zahasowane (${plainPassword.substring(0, 20)}...)`);
            migratedCount++;
        }

        console.log(`\n${'='.repeat(60)}`);
        console.log(`✅ Migracja zakończona!`);
        console.log(`📊 Zahasowano: ${migratedCount}`);
        console.log(`⏭️  Pominięto: ${skippedCount}`);
        console.log(`${'='.repeat(60)}\n`);

    } catch (err) {
        console.error('❌ Błąd migracji:', err.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

migratePasswords();
