import React from 'react';
import MapIcon from './icons/MapIcon';

const Section: React.FC<{ title: string; children: React.ReactNode; id: string }> = ({ title, children, id }) => (
    <section aria-labelledby={id} className="mb-6 p-4 bg-secondary-50 dark:bg-secondary-900 rounded-lg shadow-md transition-all duration-300">
        <h3 id={id} className="text-xl font-semibold text-primary-700 dark:text-primary-300 mb-2 border-b dark:border-secondary-700 pb-2">{title}</h3>
        <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">{children}</div>
    </section>
);

const DevelopmentRoadmapPage: React.FC = () => {
  return (
    <div className="p-4 md:p-6 bg-white dark:bg-secondary-800 shadow-xl rounded-lg">
      <header className="flex items-center mb-6 border-b dark:border-secondary-600 pb-4">
        <MapIcon className="h-8 w-8 text-primary-600 dark:text-primary-400 mr-3" />
        <div>
            <h2 className="text-2xl font-semibold text-primary-700 dark:text-primary-300">Plan Rozwoju Aplikacji</h2>
            <p className="text-md text-gray-500 dark:text-gray-400">Faza II: Inteligentna Automatyzacja i Optymalizacja</p>
        </div>
      </header>

      <div className="space-y-8">
        <p className="text-gray-600 dark:text-gray-400">
          Poniżej znajduje się udokumentowany plan dalszych prac nad aplikacją. Po wdrożeniu całego początkowego scenariusza,
          przechodzimy do Fazy II, której celem jest przekształcenie systemu w proaktywnego asystenta planisty.
        </p>

        <Section title="Krok 5: Pełna Integracja Ograniczeń (Maszyny i Personel)" id="step-5">
            <p><strong>Cel:</strong> Wzbogacenie systemu o kluczowe ograniczenia zasobów, aby plany były jeszcze bardziej realistyczne.</p>
            <ul className="list-disc list-inside pl-4 space-y-1">
                <li>
                    <strong>Dostępność Maszyn:</strong> Wprowadzenie na oś czasu nowej, wizualnej warstwy pokazującej zaplanowane przeglądy, konserwacje czy awarie maszyn. System automatycznie uwzględni te "okienka" niedostępności podczas planowania.
                </li>
                <li>
                    <strong>Dostępność Personelu:</strong> Dodanie możliwości definiowania grafików pracy dla kluczowych operatorów lub zespołów. Harmonogram będzie respektował te grafiki, zapobiegając planowaniu produkcji bez wymaganej obsady.
                </li>
            </ul>
        </Section>

        <Section title="Krok 6: Silnik Automatycznego Planowania ('Auto-Plan')" id="step-6">
            <p><strong>Cel:</strong> Przekształcenie systemu w proaktywnego asystenta, który sam optymalizuje harmonogram.</p>
            <ul className="list-disc list-inside pl-4 space-y-1">
                <li>Implementacja przycisku <strong>"Zaplanuj Optymalnie"</strong>.</li>
                <li>Stworzenie algorytmu, który na podstawie wszystkich znanych ograniczeń (surowce, maszyny, personel, priorytety zleceń) <strong>automatycznie ułoży cały harmonogram</strong>, dążąc do maksymalizacji OEE i minimalizacji przestojów.</li>
                <li>Planista otrzyma gotową, najlepszą możliwą propozycję planu do zatwierdzenia.</li>
            </ul>
        </Section>

        <Section title="Krok 7: Optymalizacja Czasów Przezbrojeń (Setup Times)" id="step-7">
            <p><strong>Cel:</strong> Wprowadzenie inteligencji związanej ze zmianą produkcji w celu minimalizacji strat czasowych.</p>
             <ul className="list-disc list-inside pl-4 space-y-1">
                <li>Dodanie do systemu logiki czasów przezbrojeń (np. zmiana z produktu A na B trwa 45 minut).</li>
                <li>Rozbudowa silnika "Auto-Plan" o funkcję <strong>inteligentnego grupowania podobnych zleceń</strong>, aby zminimalizować liczbę przezbrojeń.</li>
            </ul>
        </Section>

        <Section title="Krok 8: Panel Analityczny i Identyfikacja 'Wąskich Gardeł'" id="step-8">
            <p><strong>Cel:</strong> Dostarczenie narzędzi do analizy danych historycznych i ciągłego doskonalenia procesu.</p>
            <ul className="list-disc list-inside pl-4 space-y-1">
                <li>Stworzenie nowej zakładki "Analizy" z wizualizacją trendów OEE.</li>
                <li>Implementacja mechanizmu, który <strong>automatycznie zidentyfikuje i zaraportuje najczęstsze przyczyny przestojów</strong> i odchyleń od planu, wskazując "wąskie gardła" w procesie.</li>
            </ul>
        </Section>
      </div>
    </div>
  );
};

export default DevelopmentRoadmapPage;