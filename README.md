<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Mleczna-droga

This repository contains everything you need to run the app locally.

**Wersja zapoznawcza**
- **Wersja**: 0.1.0 (wersja zapoznawcza)
- **Autor**: ArkadiuszSzwarocki
- **Data**: 2026-01-05

**Opis aplikacji**
- **Cel**: System do zarządzania produkcją i magazynowaniem (m.in. receptury, zlecenia produkcyjne, mieszanki, palety, przesunięcia magazynowe).
- **Technologie**: Frontend: React + Vite; Backend: Node.js / Express; Baza danych: MySQL (skrypty w [database/schema.sql](database/schema.sql)).
- **Użytkownicy**: operatorzy produkcji, magazynierzy, planowanie produkcji i administracja.

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`
