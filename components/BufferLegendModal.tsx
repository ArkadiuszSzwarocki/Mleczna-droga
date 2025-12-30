import React from 'react';
// FIX: Removed file extensions from all imports to fix module resolution errors.
import Button from './Button';
import XCircleIcon from './icons/XCircleIcon';
// FIX: Remove .tsx extension from icon import to fix module resolution error.
import InformationCircleIcon from './icons/InformationCircleIcon';
import CheckCircleIcon from './icons/CheckCircleIcon';
// FIX: Remove .tsx extension from icon import to fix module resolution error.
import ClipboardListIcon from './icons/ClipboardListIcon';
// FIX: Remove .tsx extension from icon import to fix module resolution error.
import DocumentTextIcon from './icons/DocumentTextIcon';

interface BufferLegendModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const LegendItem: React.FC<{ icon: React.ReactNode; label: string; description: string }> = ({ icon, label, description }) => (
  <div className="flex items-start space-x-4">
    <div className="flex-shrink-0 pt-1">{icon}</div>
    <div>
      <p className="font-semibold text-gray-800 dark:text-gray-200">{label}</p>
      <p className="text-sm text-gray-600 dark:text-gray-400">{description}</p>
    </div>
  </div>
);

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section>
    <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-3 border-b dark:border-secondary-600 pb-2">{title}</h3>
    <div className="space-y-4">{children}</div>
  </section>
);


const BufferLegendModal: React.FC<BufferLegendModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center p-4 z-[150] transition-opacity"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="buffer-legend-modal-title"
    >
      <div
        className="bg-white dark:bg-secondary-800 rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col transform transition-all"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b dark:border-secondary-700 flex justify-between items-center flex-shrink-0">
          <div className="flex items-center gap-3">
            <InformationCircleIcon className="h-7 w-7 text-blue-600" />
            <h2 id="buffer-legend-modal-title" className="text-2xl font-semibold text-primary-700 dark:text-primary-300">
              Legenda Statusów i Akcji
            </h2>
          </div>
          <Button onClick={onClose} variant="secondary" className="p-1.5 -mr-2" title="Zamknij">
            <XCircleIcon className="h-6 w-6 text-gray-500" />
          </Button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-grow overflow-y-auto p-6 space-y-8 text-base">
            <Section title="Kolorystyka Wierszy / Kafelków">
                <LegendItem 
                    icon={<div className="h-6 w-6 rounded-md bg-red-100 border-2 border-red-400" />}
                    label="Czerwony"
                    description="Paleta jest ZABLOKOWANA - manualnie przez laboratorium lub automatycznie z powodu przekroczenia terminu ważności. Paleta jest wyłączona z użytku."
                />
                <LegendItem 
                    icon={<div className="h-6 w-6 rounded-md bg-orange-50 border-2 border-orange-300" />}
                    label="Pomarańczowy"
                    description="Termin KRYTYCZNY. Pozostało mniej niż 7 dni do końca terminu ważności. Paleta wymaga pilnego zużycia."
                />
                <LegendItem 
                    icon={<div className="h-6 w-6 rounded-md bg-yellow-50 border-2 border-yellow-300" />}
                    label="Żółty"
                    description="OSTRZEŻENIE o terminie. Pozostało mniej niż 45 dni do końca terminu ważności. Paleta powinna być zużyta priorytetyowo (zgodnie z FEFO)."
                />
                <LegendItem 
                    icon={<div className="h-6 w-6 rounded-md bg-green-100 border-2 border-green-300" />}
                    label="Zielony (tylko kafelki)"
                    description="Lokalizacja ZAJĘTA przez paletę z bezpiecznym terminem ważności, gotową do użycia."
                />
                <LegendItem 
                    icon={<div className="h-6 w-6 rounded-md bg-gray-50 border-2 border-gray-200" />}
                    label="Biały / Szary"
                    description="Standardowy widok dla palety z bezpiecznym terminem w tabelach lub wolna lokalizacja w widoku kafelkowym."
                />
            </Section>
            <Section title="Ikony Statusów Palet">
                <LegendItem 
                    icon={<span className="flex items-center justify-center h-6 w-6 rounded-full bg-red-500 text-white text-xs font-bold border-2 border-white shadow">M</span>}
                    label="Status 'M' (Manual)"
                    description="Paleta została zablokowana manualnie przez uprawnionego użytkownika (np. z laboratorium)."
                />
                 <LegendItem 
                    icon={<span className="flex items-center justify-center h-6 w-6 rounded-full bg-red-500 text-white text-xs font-bold border-2 border-white shadow">A</span>}
                    label="Status 'A' (Automatic)"
                    description="Paleta została zablokowana automatycznie przez system z powodu przekroczenia terminu ważności."
                />
                <LegendItem 
                    icon={<span className="flex items-center justify-center h-6 w-6 rounded-full bg-green-500 text-white border-2 border-white shadow"><CheckCircleIcon className="h-4 w-4"/></span>}
                    label="Dostępna"
                    description="Paleta jest odblokowana i ma ważny termin przydatności. Jest gotowa do użycia w produkcji."
                />
            </Section>
             <Section title="Ikony Dodatkowe">
                <LegendItem 
                    icon={<ClipboardListIcon className="h-6 w-6 text-blue-500" />}
                    label="Notatki Laboratoryjne"
                    description="Wskazuje, że do palety dołączone są notatki z laboratorium."
                />
                 <LegendItem 
                    icon={<DocumentTextIcon className="h-6 w-6 text-green-600" />}
                    label="Dokumenty Laboratoryjne"
                    description="Wskazuje, że do palety załączono jeden lub więcej dokumentów (np. certyfikaty analizy)."
                />
            </Section>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex justify-end flex-shrink-0">
          <Button onClick={onClose} variant="primary">Rozumiem</Button>
        </div>
      </div>
    </div>
  );
};

export default BufferLegendModal;