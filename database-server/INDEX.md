# 📦 Database Server - Centralne Repozytorium Bazy Danych i Serwera SQL

## 🎯 Cel Folderu

Folder `database-server` zawiera **wszystkie pliki** niezbędne do konfiguracji, zarządzania i obsługi **bazy danych MySQL/MariaDB** oraz **serwera API Node.js** dla aplikacji **Mleczna Droga**.

---

## 📂 Kompletna Struktura

```
database-server/
│
├── 📋 README.md                 ← CZYTAJ JAKO PIERWSZY (pełna dokumentacja)
├── 📋 INSTALLATION.md           ← Instrukcja instalacji
├── 📋 QUICKSTART.md             ← Szybki start (5 minut)
├── 📋 INDEX.md                  ← Ta teka (spis treści)
│
├── 🔧 .env                      ← Zmienne środowiskowe (NIE commituj!)
├── 🔧 .env.local                ← Alternatywne zmienne (opcjonalnie)
│
├── ⚙️ config/                   ← Pliki konfiguracyjne
│   └── .env.example             ← Szablon .env (commituj!)
│
├── 🚀 api/                      ← Serwer API Express.js
│   └── server.js                ← Główny serwer z endpointami
│
├── 🗄️ schema/                   ← Schemat bazy danych
│   └── schema.sql               ← Definicja tabel i struktur SQL
│
└── 🛠️ scripts/                  ← Skrypty pomocnicze
    └── init-db.js               ← Inicjalizacja bazy danych
```

---

## 🚀 Szybki Start (2 Minuty)

```bash
# 1. Przejdź do folderu
cd database-server

# 2. Skopiuj konfigurację
cp config/.env.example .env

# 3. Inicjalizuj bazę
node scripts/init-db.js

# 4. Uruchom serwer API
node api/server.js

# 5. W innym terminalu sprawdź
curl http://localhost:5000/api/health
```

---

## 📚 Dokumentacja

| Plik | Opis | Dla Kogo |
|------|------|---------|
| **README.md** | 📖 Pełna dokumentacja, tabele, endpoints, troubleshooting | Wszyscy |
| **QUICKSTART.md** | ⚡ Szybki start w 5 minut | Nowe osoby |
| **INSTALLATION.md** | 🔧 Szczegółowe kroki instalacji | DevOps, Setup |
| **INDEX.md** | 📋 Ta teka (spis treści) | Orientacja |

---

## 🔑 Dane Dostępu do Bazy Danych

```
HOST:     filipinka.myqnapcloud.com
PORT:     3307
USER:     rootMlechnaDroga
PASSWORD: Filipinka2025
DATABASE: MleczDroga
TYPE:     MariaDB / MySQL
```

---

## 📋 Pliki Konfiguracyjne

### `.env.example` (Bezpieczny - commituj!)
Szablon zmiennych środowiskowych. Zawiera wszystkie wymagane parametry bez haseł.

```env
PORT=5000
DB_HOST=filipinka.myqnapcloud.com
DB_PORT=3307
DB_USER=rootMlechnaDroga
DB_PASSWORD=Filipinka2025
DB_NAME=MleczDroga
```

### `.env` (TAJNY - nie commituj!)
Rzeczywisty plik konfiguracyjny z hasłami. Jest w `.gitignore`.

---

## 🔌 API Endpoints

### Health Check
```bash
curl http://localhost:5000/api/health
```

### Dostawy (Deliveries)
```bash
GET    /api/deliveries          # Pobierz wszystkie
POST   /api/deliveries          # Utwórz nową
PUT    /api/deliveries/:id      # Aktualizuj
DELETE /api/deliveries/:id      # Usuń
```

---

## 🗄️ Tabele Bazy Danych

### deliveries
Dostawy towarów
- `id` - Identyfikator dostawy
- `orderRef` - Numer zamówienia
- `supplier` - Dostawca
- `deliveryDate` - Data dostawy
- `status` - Status (pending, received, processed)
- `items` - JSON z towarami
- `createdAt` - Data utworzenia
- `requiresLab` - Czy wymaga badań

### system_logs
Logi systemowe dla diagnostyki
- `id` - ID logu
- `timestamp` - Data/czas
- `level` - INFO/WARNING/ERROR/DEBUG
- `message` - Wiadomość
- `context` - Moduł/funkcja
- `user` - Użytkownik

### users
Użytkownicy systemu
- `id` - ID użytkownika
- `username` - Nazwa użytkownika
- `email` - Email
- `role` - admin/operator/viewer
- `lastLogin` - Ostatnia sesja
- `isActive` - Aktywny?

### warehouses
Magazyny
- `id` - ID magazynu
- `name` - Nazwa
- `location` - Lokalizacja
- `capacity` - Pojemność

### products
Produkty
- `id` - ID produktu
- `name` - Nazwa
- `sku` - Kod SKU
- `description` - Opis
- `category` - Kategoria

---

## 🔧 Główne Pliki Źródłowe

### api/server.js
Główny serwer Express.js z API endpoints'ami.

**Funkcje:**
- Konfiguracja bazy danych z `.env`
- Health check endpoint
- CRUD dla dostaw
- CORS middleware
- Obsługa JSON

**Uruchomienie:**
```bash
node api/server.js
```

**Port:** 5000

### scripts/init-db.js
Skrypt inicjalizacji bazy danych.

**Funkcje:**
- Łączy się z bazą danych
- Tworzy tabele jeśli nie istnieją
- Loguje status

**Uruchomienie:**
```bash
node scripts/init-db.js
```

### schema/schema.sql
Pełny schemat bazy danych.

**Zawiera:**
- CREATE TABLE dla wszystkich tabel
- Indeksy dla wydajności
- Komentarze do każdej kolumny
- Ustawienia UTF-8

**Import:**
```bash
mysql -h filipinka.myqnapcloud.com -u rootMlecznaDroga -p MleczDroga < schema/schema.sql
```

---

## 🚀 Uruchamianie

### Opcja 1: Tylko API (z tego folderu)
```bash
cd database-server
node api/server.js
```

### Opcja 2: Pełny Stack (z głównego folderu)
```bash
npm run dev           # Backend + Frontend
npm run backend       # Tylko backend
npm run frontend      # Tylko frontend
```

### Opcja 3: Inicjalizacja + API
```bash
cd database-server
node scripts/init-db.js && node api/server.js
```

---

## 🧪 Testowanie

### Curl
```bash
# Health check
curl http://localhost:5000/api/health

# Pobierz dostawy
curl http://localhost:5000/api/deliveries

# Utwórz dostawę
curl -X POST http://localhost:5000/api/deliveries \
  -H "Content-Type: application/json" \
  -d '{"orderRef":"ORD-001","supplier":"XYZ","deliveryDate":"2026-01-05"}'
```

### MySQL CLI
```bash
mysql -h filipinka.myqnapcloud.com \
       -P 3307 \
       -u rootMlechnaDroga \
       -p MleczDroga

# Po logowaniu:
SHOW TABLES;
SELECT * FROM deliveries;
```

---

## ⚠️ Bezpieczeństwo

### 🔒 Nigdy nie commituj `.env`!
```bash
# Sprawdź .gitignore
cat ../.gitignore | grep "\.env"
```

### Bezpieczne Praktyki
1. ✅ Commituj: `.env.example` (bez haseł)
2. ❌ Nie commituj: `.env` (z hasłami)
3. ✅ Używaj: Zmienne środowiskowe w CI/CD
4. ✅ Przechowuj: Hasła w secrets

---

## 🔄 Przełączanie między Bazami

### Localhost (Development)
Zmień w `.env`:
```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=mleczna_droga
```

### QNAP (Production)
Zmień w `.env`:
```env
DB_HOST=filipinka.myqnapcloud.com
DB_PORT=3307
DB_USER=rootMlechnaDroga
DB_PASSWORD=Filipinka2025
DB_NAME=MleczDroga
```

Restartuj serwer:
```bash
pkill -f "node api/server.js"
node api/server.js
```

---

## 🐛 Troubleshooting

| Problem | Przyczyna | Rozwiązanie |
|---------|-----------|------------|
| ECONNREFUSED | Baza niedostępna | `ping filipinka.myqnapcloud.com` |
| Authentication failed | Błędne hasło | Sprawdź `.env` |
| Table doesn't exist | DB nie zainicjalizowana | `node scripts/init-db.js` |
| ENOENT .env | Brak pliku | `cp config/.env.example .env` |

---

## 📊 Monitorowanie

### Sprawdź Status Bazy
```bash
curl http://localhost:5000/api/health
```

### Pobierz Ostatnie Dostawy
```sql
SELECT * FROM deliveries ORDER BY createdAt DESC LIMIT 10;
```

### Sprawdź Logi
```sql
SELECT * FROM system_logs WHERE timestamp > DATE_SUB(NOW(), INTERVAL 1 HOUR);
```

---

## 🔗 Powiązane Dokumenty

- [../README.md](../README.md) - Główna dokumentacja projektu
- [../BAZA_DANYCH_QNAP.md](../BAZA_DANYCH_QNAP.md) - Konfiguracja QNAP
- [../package.json](../package.json) - Zależności projektu

---

## 👥 Kontakt i Wsparcie

| Kwestia | Dokumentacja |
|---------|--------------|
| Nie wiem jak zacząć | Czytaj [QUICKSTART.md](QUICKSTART.md) |
| Szczegółowa instalacja | Czytaj [INSTALLATION.md](INSTALLATION.md) |
| API endpoints i tabele | Czytaj [README.md](README.md) |
| Błąd przy starcie | Czytaj [README.md](README.md#troubleshooting) |

---

## 📝 Historia

| Data | Wersja | Zmiany |
|------|--------|--------|
| 2026-01-03 | 1.0 | Inicjalna struktura z konfiguracją QNAP |

---

## 👨‍💻 Autorzy

- **Arkadiusz Szwarocki** - Twórca projektu

---

**Ostatnia Aktualizacja:** 2026-01-03  
**Status:** ✅ Aktywny i Testowany
