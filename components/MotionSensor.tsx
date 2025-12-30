import React, { useEffect, useRef } from 'react';

const MOTION_DETECTION_INTERVAL = 10000; // Wykrywaj ruch co 10 sekund dla celów symulacji

/**
 * Komponent logiczny symulujący czujnik ruchu.
 * Okresowo wysyła zdarzenie 'motionDetected' na obiekcie window,
 * które może być nasłuchiwane przez inne komponenty w aplikacji.
 */
const MotionSensor: React.FC = () => {
  const intervalId = useRef<number | null>(null);

  useEffect(() => {
    // Rozpocznij wykrywanie ruchu po zamontowaniu komponentu
    intervalId.current = window.setInterval(() => {
      // Symuluj zdarzenie wykrycia ruchu
      const motionEvent = new CustomEvent('motionDetected', {
        detail: {
          timestamp: Date.now(),
          message: `Wykryto ruch o ${new Date().toLocaleTimeString()}`,
          sensorId: 'MS-01'
        },
      });
      
      // Wysłanie zdarzenia, które może być przechwycone globalnie
      window.dispatchEvent(motionEvent);

    }, MOTION_DETECTION_INTERVAL);

    // Sprzątanie po odmontowaniu komponentu
    return () => {
      if (intervalId.current) {
        clearInterval(intervalId.current);
      }
    };
  }, []); // Pusta tablica zależności oznacza, że efekt uruchomi się raz po zamontowaniu i posprząta po odmontowaniu

  // Komponent jest czysto logiczny i nie renderuje niczego w DOM
  return null;
};

export default MotionSensor;
