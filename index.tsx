import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './components/App';
import { logger } from './utils/logger';

const rootElement = document.getElementById('root');

if (!rootElement) {
  console.error("FATAL: Root element (#root) not found. Ensure index.html is correct and no critical errors occur before this script runs (e.g., in <head> scripts).");
  document.body.innerHTML = `
    <div style="padding: 20px; text-align: center; font-family: sans-serif; color: #b91c1c; background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; margin: 20px;">
      <h1 style="font-size: 1.5rem; color: #991b1b;">Błąd Krytyczny Aplikacji</h1>
      <p style="margin-top: 0.5rem;">Nie można załadować aplikacji, ponieważ kluczowy element interfejsu (#root) nie został znaleziony.</p>
      <p style="margin-top: 0.25rem;">Proszę sprawdzić konsolę przeglądarki (F12) aby uzyskać więcej informacji lub skontaktować się z pomocą techniczną. Możliwe przyczyny to błędy w ładowaniu skryptów w sekcji &lt;head&gt; pliku index.html.</p>
    </div>
  `;
} else {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
