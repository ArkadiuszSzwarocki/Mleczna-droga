
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Konfiguracja połączenia
const dbConfig = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 3307,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  connectTimeout: 10000 // 10 sekund na połączenie
};

let db;

function handleDisconnect() {
  db = mysql.createConnection(dbConfig);

  db.connect(err => {
    if (err) {
      console.error('❌ [BACKEND] Błąd połączenia z MariaDB na QNAP:', err.message);
      setTimeout(handleDisconnect, 2000); // Ponów próbę za 2 sekundy
    } else {
      console.log('✅ [BACKEND] Połączono z bazą danych MariaDB na QNAP!');
    }
  });

  db.on('error', err => {
    console.error('⚠️ [BACKEND] Błąd bazy danych:', err.message);
    if (err.code === 'PROTOCOL_CONNECTION_LOST') {
      handleDisconnect();
    } else {
      throw err;
    }
  });
}

handleDisconnect();

// ENDPOINT: Sprawdzanie statusu (Health Check)
app.get('/api/health', (req, res) => {
  db.query('SELECT 1', (err, results) => {
    if (err) {
        return res.status(500).json({ 
            status: 'error', 
            database: 'disconnected', 
            message: err.message 
        });
    }
    res.json({ 
        status: 'ok', 
        database: 'connected', 
        timestamp: new Date().toISOString() 
    });
  });
});

// Pobieranie dostaw
app.get('/api/deliveries', (req, res) => {
  db.query('SELECT * FROM deliveries ORDER BY createdAt DESC', (err, results) => {
    if (err) return res.status(500).json(err);
    res.json(results);
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Serwer API Mleczna Droga działa na http://localhost:${PORT}`);
    console.log(`📡 Podłączony do hosta: ${dbConfig.host}:${dbConfig.port}`);
});
