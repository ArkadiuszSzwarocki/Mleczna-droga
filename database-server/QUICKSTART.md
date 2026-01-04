# Instrukcja Szybkiego Startu - Database Server

## ⚡ 5 Minut do Uruchomienia

### 1. Skopiuj Plik Konfiguracyjny
```bash
cd database-server
cp config/.env.example .env
```

### 2. Sprawdź Dane Połączenia w `.env`
```bash
cat .env
```

Powinna zawierać:
```env
DB_HOST=filipinka.myqnapcloud.com
DB_PORT=3307
DB_USER=rootMlecznaDroga
DB_PASSWORD=Filipinka2025
DB_NAME=MleczDroga
```

### 3. Inicjalizuj Bazę Danych
```bash
node scripts/init-db.js
```

Powinna pojawić się wiadomość:
```
⏳ Inicjalizacja bazy danych...
✅ Baza danych jest gotowa do pracy.
```

### 4. Uruchom Serwer API
```bash
node api/server.js
```

Powinna pojawić się wiadomość:
```
====================================================
🚀 SERWER API DZIAŁA: http://localhost:5000
📡 POŁĄCZENIE Z BAZĄ: filipinka.myqnapcloud.com:3307
====================================================
```

### 5. Sprawdź Połączenie
W nowym terminalu:
```bash
curl http://localhost:5000/api/health
```

Powinna pojawić się odpowiedź JSON z statusem "connected".

## 📋 Checklist

- [ ] Plik `.env` skopiowany z `.env.example`
- [ ] Dane logowania QNAP są prawidłowe
- [ ] Baza danych zainicjalizowana (`init-db.js` się powiódł)
- [ ] Serwer API uruchomiony na porcie 5000
- [ ] Health check zwraca status "connected"

## 🚨 Błędy Przy Starcie?

### Błąd: "ENOENT: no such file or directory, open '.env'"
```bash
cp config/.env.example .env
```

### Błąd: "ECONNREFUSED"
1. Sprawdź czy QNAP jest dostępny
2. Sprawdź dane w `.env`
3. Sprawdzę połączenie: `ping filipinka.myqnapcloud.com`

### Błąd: "Authentication failed"
Sprawdź czy dane logowania w `.env` są prawidłowe:
- Użytkownik: `rootMlechnaDroga`
- Hasło: `Filipinka2025`

## 📞 Potrzebna Pomoc?

Czytaj: [README.md](README.md) - Pełna dokumentacja
