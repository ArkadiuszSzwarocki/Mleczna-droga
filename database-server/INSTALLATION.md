# Instalacja i Konfiguracja Database Server

## 📦 Wymagania

- Node.js >= 16.x
- npm >= 8.x
- Dostęp do QNAP: `filipinka.myqnapcloud.com:3307`
- Dane logowania do bazy danych

## 🔧 Kroki Instalacji

### Krok 1: Przejdź do Folderu Database Server
```bash
cd database-server
```

### Krok 2: Zainstaluj Zależności (jeśli wymagane)
```bash
npm install mysql2 dotenv
```

### Krok 3: Skopiuj Plik .env
```bash
cp config/.env.example .env
```

### Krok 4: Edytuj Plik .env (opcjonalnie)
```bash
# Jeśli chcesz zmienić dane
nano .env
```

### Krok 5: Testuj Połączenie
```bash
node scripts/init-db.js
```

## 🚀 Uruchamianie Serwera

### Opcja 1: Pojedynczy Serwer API
```bash
node api/server.js
```

### Opcja 2: Oba Serwery (Backend + Frontend)
Z katalogu głównego:
```bash
npm run dev
```

## 📝 Struktura Plików

```
database-server/
├── api/
│   └── server.js              # Główny serwer API
├── config/
│   └── .env.example           # Szablon konfiguracji
├── schema/
│   └── schema.sql             # Schemat bazy danych
├── scripts/
│   └── init-db.js             # Skrypt inicjalizacji
├── README.md                  # Pełna dokumentacja
├── QUICKSTART.md              # Szybki start (5 minut)
├── INSTALLATION.md            # Ta instrukcja
└── .env                       # Plik konfiguracyjny (NIE commituj!)
```

## 🗄️ Inicjalizacja Bazy Danych

Baza danych będzie automatycznie inicjalizowana przy:
1. Pierwszym uruchomieniu `init-db.js`
2. Każdym starcie serwera (jeśli tabele nie istnieją)

### Ręczna Inicjalizacja

```bash
node scripts/init-db.js
```

### Inicjalizacja z Poziomu MySQL CLI

```bash
mysql -h filipinka.myqnapcloud.com \
       -P 3307 \
       -u rootMlechnaDroga \
       -p \
       MleczDroga < schema/schema.sql
```

## ✅ Weryfikacja Instalacji

### Test 1: Sprawdź Konfigurację
```bash
cat .env
```

### Test 2: Sprawdź Połączenie z Bazą
```bash
node scripts/init-db.js
```

Powinna pojawić się wiadomość:
```
✅ Baza danych jest gotowa do pracy.
```

### Test 3: Uruchom Serwer API
```bash
node api/server.js
```

### Test 4: Sprawdź Health Check
W nowym terminalu:
```bash
curl http://localhost:5000/api/health
```

Powinna pojawić się odpowiedź:
```json
{
  "status": "OK",
  "database": "connected",
  "host": "filipinka.myqnapcloud.com",
  "port": 3307,
  "database": "MleczDroga",
  "timestamp": "..."
}
```

## 🐛 Rozwiązywanie Problemów

### Problem: "ECONNREFUSED"
**Przyczyna:** Brak połączenia z QNAP  
**Rozwiązanie:**
```bash
# Sprawdź dostępność QNAP
ping filipinka.myqnapcloud.com

# Sprawdź dane w .env
cat .env
```

### Problem: "Authentication failed"
**Przyczyna:** Błędne dane logowania  
**Rozwiązanie:**
```bash
# Sprawdź hasło i użytkownika
nano .env

# Hasło powinno być: Filipinka2025
# Użytkownik powinien być: rootMlechnaDroga
```

### Problem: "Table doesn't exist"
**Przyczyna:** Baza danych nie została zainicjalizowana  
**Rozwiązanie:**
```bash
node scripts/init-db.js
```

## 🔐 Bezpieczeństwo

### ⚠️ Nigdy nie commituj `.env`!

Plik `.env` zawiera hasła. Dodaj go do `.gitignore`:
```bash
echo ".env" >> ../../.gitignore
echo ".env.local" >> ../../.gitignore
```

### Bezpieczne Przechowywanie Hasła

1. **Development**: Użyj `.env.example` (bez haseł)
2. **Production**: Używaj zmiennych środowiskowych systemu
3. **CI/CD**: Używaj CI/CD secrets

## 📚 Dokumentacja Dodatkowa

- [README.md](README.md) - Pełna dokumentacja
- [QUICKSTART.md](QUICKSTART.md) - Szybki start (5 minut)
- [../BAZA_DANYCH_QNAP.md](../BAZA_DANYCH_QNAP.md) - Konfiguracja QNAP

## 🆘 Potrzebna Pomoc?

1. Czytaj [README.md](README.md)
2. Czytaj [QUICKSTART.md](QUICKSTART.md)
3. Sprawdzaj logi: `node api/server.js` (verbose mode)

---

**Wersja:** 1.0  
**Data:** 2026-01-03  
**Autor:** Arkadiusz Szwarocki
