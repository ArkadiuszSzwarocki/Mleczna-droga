
# Instrukcja Obsługi i Testowania Systemu Mleczna Droga

## Uruchamianie Testów Automatycznych

To, gdzie i jak uruchamia się testy, zależy od Twojego środowiska pracy. W przeciwieństwie do samej aplikacji, która działa w przeglądarce, **testy automatyczne uruchamia się w terminalu (konsoli)** przy użyciu środowiska Node.js.

Oto instrukcja, jak przygotować projekt do uruchamiania tych testów. Zakładam, że używasz nowoczesnego stacku (np. Vite).

### 1. Przygotowanie środowiska (Jednorazowo)

Musisz zainstalować biblioteki, które "rozumieją" i wykonują testy. Wpisz te komendy w terminalu swojego projektu:

**A. Dla testów jednostkowych (Unit Tests - pliki `.test.tsx` / `.ts`):**
Użyjemy **Vitest** (jest szybszy i łatwiejszy w konfiguracji niż Jest dla nowych projektów) oraz **React Testing Library**.

```bash
npm install -D vitest jsdom @testing-library/react @testing-library/jest-dom @types/node
```

**B. Dla testów E2E (End-to-End - pliki `.spec.ts`):**
Użyjemy **Playwright**.

```bash
npm init playwright@latest
```
*(Postępuj zgodnie z instrukcjami na ekranie, wybierz folder `integration` lub domyślny `tests`).*

---

### 2. Konfiguracja Projektu

Aby testy działały z Twoim kodem, w projekcie znajdują się następujące pliki konfiguracyjne:
*   `vite.config.ts`: Konfiguracja Vitest (środowisko `jsdom`).
*   `src/setupTests.ts`: Importuje rozszerzenia matchers (`toBeInTheDocument`).

---

### 3. Jak uruchomić testy?

Gdy już zainstalujesz paczki (z punktu 1), możesz uruchamiać testy w terminalu:

**A. Uruchomienie Testów Jednostkowych (Logika i Komponenty)**
To sprawdzi pliki takie jak `src/utils.test.ts`, `components/__tests__/*.test.tsx` itp.

Wpisz w terminalu:
```bash
npx vitest
```
*   Pojawi się zielony lub czerwony wynik w konsoli.
*   Tryb ten działa w tle ("watch mode") – jak zmienisz kod, testy same się powtórzą.

**B. Uruchomienie Testów E2E (Scenariusze Użytkownika)**
To sprawdzi pliki w folderze `integration/`. Playwright otworzy w tle prawdziwą przeglądarkę i przeklika aplikację.

Wpisz w terminalu:
```bash
npx playwright test
```

Aby zobaczyć test w oknie przeglądarki (nie w tle), wpisz:
```bash
npx playwright test --ui
```

### Podsumowanie struktury
Twoje pliki testowe znajdują się w:
1.  `src/utils.test.ts` (Testy logiki)
2.  `components/__tests__/` (Testy komponentów i kontekstu)
3.  `integration/` (Testy pełnych procesów E2E)

System automatycznie wykryje te pliki dzięki rozszerzeniom `.test.ts`, `.test.tsx` oraz `.spec.ts`.
