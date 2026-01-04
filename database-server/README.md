# 📦 Database Server - Folder Bazy Danych i Serwera SQL

Centralne repozytorium wszystkich plików dotyczących konfiguracji, zarządzania i obsługi bazy danych oraz serwera API aplikacji **Mleczna Droga**.

## 📁 Struktura Folderów

```
database-server/
├── api/                 # Serwer API Node.js
│   └── server.js       # Główny serwer Express z endpointami bazy danych
├── config/             # Pliki konfiguracyjne
│   └── .env.example    # Szablon zmiennych środowiskowych
├── schema/             # Schemat bazy danych
│   └── schema.sql      # Definicja tabel i struktur
├── scripts/            # Skrypty inicjalizacyjne
│   └── init-db.js      # Skrypt inicjalizacji bazy danych
├── .env                # Zmienne środowiskowe (NIE commituj!)
└── README.md           # Ta dokumentacja
```

## 🔧 Konfiguracja

### Zmienne Środowiskowe (.env)

Plik `.env` zawiera dane do połączenia z bazą danych:

```env
PORT=5000
DB_HOST=filipinka.myqnapcloud.com
DB_PORT=3307
DB_USER=rootMlechnaDroga
DB_PASSWORD=Filipinka2025
DB_NAME=MleczDroga
```

**Nie commituj `.env` do repozytorium!** Użyj `.env.example` jako szablonu.

### Inicjalizacja Nowego Pliku .env

```bash
cp config/.env.example .env
# Następnie edytuj wartości w .env
```

## 🗄️ Baza Danych

### Dane Połączenia

| Parametr | Wartość |
|----------|---------|
| **Host** | filipinka.myqnapcloud.com |
| **Port** | 3307 |
| **Użytkownik** | rootMlechnaDroga |
| **Hasło** | Filipinka2025 |
| **Baza Danych** | MleczDroga |
| **Typ** | MariaDB / MySQL |

### Tabele

#### `deliveries` - Dostawy
Przechowuje informacje o dostawach towarów.

```sql
CREATE TABLE deliveries (
    id VARCHAR(50) PRIMARY KEY,
    orderRef VARCHAR(100),
    supplier VARCHAR(100),
    deliveryDate DATE,
    status VARCHAR(50),
    items JSON,
    createdBy VARCHAR(50),
    createdAt DATETIME,
    requiresLab TINYINT(1) DEFAULT 0,
    warehouseStageCompletedAt DATETIME
);
```

#### `system_logs` - Logi Systemowe
Przechowuje logi systemowe dla diagnostyki.

```sql
CREATE TABLE system_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    timestamp DATETIME,
    level VARCHAR(20),
    message TEXT,
    context VARCHAR(100),
    user VARCHAR(50)
);
```

#### `users` - Użytkownicy
Przechowuje dane użytkowników systemu.

```sql
CREATE TABLE users (
    id VARCHAR(50) PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE,
    role VARCHAR(50),
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    lastLogin DATETIME,
    isActive TINYINT(1) DEFAULT 1
);
```

#### `warehouses` - Magazyny
Przechowuje informacje o magazynach.

```sql
CREATE TABLE warehouses (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    location VARCHAR(100),
    capacity INT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### `products` - Produkty
Przechowuje informacje o produktach.

```sql
CREATE TABLE products (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    sku VARCHAR(50) UNIQUE,
    description TEXT,
    category VARCHAR(50),
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## 🚀 Uruchamianie

### Inicjalizacja Bazy Danych

```bash
node scripts/init-db.js
```

Skrypt automatycznie:
1. Połączy się z bazą danych
2. Tworzy tabele jeśli nie istnieją
3. Pokaże status inicjalizacji

### Uruchamianie Serwera API

```bash
node api/server.js
```

Serwer będzie dostępny pod adresem:
```
http://localhost:5000
```

## 📡 API Endpoints

### Health Check
```bash
GET /api/health
```

Odpowiedź:
```json
{
  "status": "OK",
  "database": "connected",
  "host": "filipinka.myqnapcloud.com",
  "port": 3307,
  "database": "MleczDroga",
  "timestamp": "2026-01-03T13:..."
}
```

### Dostaw (Deliveries)

#### Pobierz wszystkie dostawy
```bash
GET /api/deliveries
```

#### Utwórz nową dostawę
```bash
POST /api/deliveries
Content-Type: application/json

{
  "orderRef": "ORD-2025-001",
  "supplier": "Dostawca XYZ",
  "deliveryDate": "2026-01-05",
  "status": "pending",
  "items": [{"product": "Mleko", "quantity": 100}],
  "createdBy": "admin",
  "requiresLab": false
}
```

#### Aktualizuj dostawę
```bash
PUT /api/deliveries/:id
Content-Type: application/json

{
  "status": "received",
  "items": [{"product": "Mleko", "quantity": 100}]
}
```

#### Usuń dostawę
```bash
DELETE /api/deliveries/:id
```

## 🔐 Bezpieczeństwo

- ⚠️ **Nigdy nie commituj `.env`** z hasłami do Git
- 🔒 Przechowuj hasła w zmiennych środowiskowych
- 🛡️ Używaj HTTPS w produkcji
- 📋 Loguj dostępy do bazy danych

## 🧪 Testowanie Połączenia

### Curl

```bash
# Health Check
curl http://localhost:5000/api/health

# Pobierz dostawy
curl http://localhost:5000/api/deliveries
```

### MySQL/MariaDB CLI

```bash
mysql -h filipinka.myqnapcloud.com \
       -P 3307 \
       -u rootMlechnaDroga \
       -p \
       MleczDroga

# Po logowaniu:
SHOW TABLES;
SELECT * FROM deliveries;
```

## 🔄 Przełączanie między Bazami Danych

### Localhost (Development)
```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=mleczna_droga
```

### QNAP (Production)
```env
DB_HOST=filipinka.myqnapcloud.com
DB_PORT=3307
DB_USER=rootMlechnaDroga
DB_PASSWORD=Filipinka2025
DB_NAME=MleczDroga
```

Po zmianie `.env`, restartuj serwer:
```bash
pkill -f "node api/server.js"
node api/server.js
```

## 📊 Monitorowanie

### Sprawdź Logi Systemowe
```sql
SELECT * FROM system_logs 
WHERE timestamp > DATE_SUB(NOW(), INTERVAL 1 HOUR)
ORDER BY timestamp DESC;
```

### Sprawdź Ostatnie Dostawy
```sql
SELECT * FROM deliveries 
ORDER BY createdAt DESC 
LIMIT 10;
```

## ⚙️ Konfiguracja zaawansowana

### Zwiększenie Limitu Połączeń

W `api/server.js`:
```javascript
let dbConfig = {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '3307'),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 20,  // Zwiększ z 10 na 20
    queueLimit: 0
};
```

### Timeout Połączenia

```javascript
connectTimeout: 10000 // 10 sekund
```

## 🐛 Troubleshooting

### Błąd: "connect ECONNREFUSED"
- Sprawdź czy backend jest uruchomiony
- Sprawdź czy QNAP jest dostępny
- Sprawdź dane logowania

### Błąd: "Authentication failed"
- Sprawdź hasło w `.env`
- Sprawdź użytkownika w `.env`
- Sprawdź uprawnienia na QNAP

### Błąd: "getaddrinfo ENOTFOUND"
- Sprawdź połączenie internetowe
- Sprawdź czy URL hosta jest prawidłowy
- Sprawdź DNS

### Błąd: "Table doesn't exist"
- Uruchom: `node scripts/init-db.js`
- Sprawdź czy nazwa bazy jest prawidłowa

## 📝 Logs i Debugging

### Włącz Verbose Logging

W `api/server.js` dodaj:
```javascript
console.log('Konfiguracja:', dbConfig);
```

### Monitoruj Połączenia

```sql
-- MariaDB/MySQL
SHOW PROCESSLIST;
SHOW STATUS LIKE 'Threads%';
```

## 📚 Powiązane Dokumenty

- [BAZA_DANYCH_QNAP.md](../BAZA_DANYCH_QNAP.md) - Konfiguracja QNAP
- [README.md](../README.md) - Główna dokumentacja projektu
- [package.json](../package.json) - Zależności projektu

## 👥 Licencja i Właściciel

**Projekt:** Mleczna Droga  
**Właściciel:** Arkadiusz Szwarocki  
**Data Utworzenia:** 2026-01-03

---

**Dla Support'u skontaktuj się z administratorem systemu.**
