

import React from 'react';
// FIX: Corrected import path for constants.ts to be relative
import { SUB_WAREHOUSE_ID, SOURCE_WAREHOUSE_ID_MS01, BUFFER_MS01_ID, BUFFER_MP01_ID, M_LOCATIONS_BIG_BAGS, MZ_LOCATIONS_BAGS, R_LOCATIONS_R04_CONST, R_LOCATIONS_R05_CONST, R_LOCATIONS_R06_CONST, R_LOCATIONS_R07_CONST, KO01_WAREHOUSE_ID } from '../constants';

const LocationHighlight: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <code className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded font-mono text-xs">{children}</code>
);
const ActionButtonHighlight: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <span className="px-1 py-0.5 bg-yellow-100 text-yellow-800 rounded font-semibold text-xs">{children}</span>
);

const PalletMovementLogicInfo: React.FC = () => {
  return (
    <div className="space-y-3 text-sm text-gray-700">
      <p className="font-semibold text-gray-800">
        Poniżej opisano zasady przemieszczania palet wyłącznie za pomocą strony "Skanowanie Palet".
        Inne widoki (np. dedykowane strony buforów, magazynów) mogą mieć własne, specyficzne reguły i opcje przemieszczania.
      </p>

      <section className="mt-2">
        <h4 className="font-medium text-primary-600 mb-1">1. Z Bufora Magazynu Surowców (<LocationHighlight>{BUFFER_MS01_ID}</LocationHighlight>):</h4>
        <ul className="list-disc list-inside pl-4 space-y-0.5">
          <li>
            Można przenieść TYLKO do:
            <ul className="list-circle list-inside pl-5">
              <li>Bufora Magazynu Produkcyjnego: <LocationHighlight>{BUFFER_MP01_ID}</LocationHighlight></li>
              <li>Magazynu Surowców Głównych: <LocationHighlight>{SOURCE_WAREHOUSE_ID_MS01}</LocationHighlight></li>
            </ul>
          </li>
          <li>
            Próba przeniesienia do innych lokalizacji (np. strefy <LocationHighlight>{SUB_WAREHOUSE_ID}</LocationHighlight>, lokalizacji <LocationHighlight>BBx</LocationHighlight>, <LocationHighlight>MZx</LocationHighlight>) zostanie zablokowana.
          </li>
          <li>
            <span className="text-orange-700 italic">Wskazówka:</span> Aby przenieść paletę z <LocationHighlight>{BUFFER_MS01_ID}</LocationHighlight> na produkcję (np. <LocationHighlight>{SUB_WAREHOUSE_ID}</LocationHighlight>, <LocationHighlight>BBx</LocationHighlight>), użyj dedykowanej strony "Bufor <LocationHighlight>{BUFFER_MS01_ID}</LocationHighlight>".
          </li>
        </ul>
      </section>

      <section className="mt-2">
        <h4 className="font-medium text-primary-600 mb-1">2. Z Magazynu Surowców Głównych (<LocationHighlight>{SOURCE_WAREHOUSE_ID_MS01}</LocationHighlight>):</h4>
        <ul className="list-disc list-inside pl-4 space-y-0.5">
          <li>
            Można przenieść TYLKO do:
            <ul className="list-circle list-inside pl-5">
              <li>Bufora Magazynu Produkcyjnego: <LocationHighlight>{BUFFER_MP01_ID}</LocationHighlight></li>
              <li>Bufora Magazynu Surowców: <LocationHighlight>{BUFFER_MS01_ID}</LocationHighlight></li>
            </ul>
          </li>
          <li>Próba przeniesienia na inne lokalizacje (np. bezpośrednio na produkcję) zostanie zablokowana na stronie skanowania.</li>
           <li>
            <span className="text-orange-700 italic">Wskazówka:</span> Standardową operacją jest wysłanie palety z <LocationHighlight>{SOURCE_WAREHOUSE_ID_MS01}</LocationHighlight> do <LocationHighlight>{BUFFER_MS01_ID}</LocationHighlight> za pomocą przycisku <ActionButtonHighlight>Wyślij do Bufora</ActionButtonHighlight> na stronie magazynu <LocationHighlight>{SOURCE_WAREHOUSE_ID_MS01}</LocationHighlight>.
          </li>
        </ul>
      </section>

      <section className="mt-2">
        <h4 className="font-medium text-primary-600 mb-1">3. Z Bufora Magazynu Produkcyjnego (<LocationHighlight>{BUFFER_MP01_ID}</LocationHighlight>):</h4>
        <ul className="list-disc list-inside pl-4 space-y-0.5">
          <li>
            Można przenieść do:
            <ul className="list-circle list-inside pl-5">
              <li>Strefy Produkcyjnej <LocationHighlight>{SUB_WAREHOUSE_ID}</LocationHighlight> (podłoga lub regały <LocationHighlight>R0x</LocationHighlight>).</li>
              <li>Lokalizacji produkcyjnych (<LocationHighlight>BBx</LocationHighlight>, <LocationHighlight>MZx</LocationHighlight>, <LocationHighlight>{M_LOCATIONS_BIG_BAGS.join(' / ')}</LocationHighlight>).</li>
              <li>Bufora Magazynu Surowców: <LocationHighlight>{BUFFER_MS01_ID}</LocationHighlight></li>
              <li>Magazynu Surowców Głównych: <LocationHighlight>{SOURCE_WAREHOUSE_ID_MS01}</LocationHighlight></li>
            </ul>
          </li>
          <li>Próba przeniesienia do samego siebie (<LocationHighlight>{BUFFER_MP01_ID}</LocationHighlight>) lub innych nieautoryzowanych miejsc zostanie zablokowana.</li>
           <li>
            <span className="text-orange-700 italic">Wskazówka:</span> Dedykowana strona "Bufor <LocationHighlight>{BUFFER_MP01_ID}</LocationHighlight>" jest preferowanym miejscem do wykonywania tych operacji.
          </li>
        </ul>
      </section>

      <section className="mt-2">
        <h4 className="font-medium text-primary-600 mb-1">4. Wewnątrz Strefy <LocationHighlight>{SUB_WAREHOUSE_ID}</LocationHighlight> (Regały/Podłoga):</h4>
        <ul className="list-disc list-inside pl-4 space-y-0.5">
          <li>Palety mogą być swobodnie przemieszczane między podłogą a regałami w obrębie tej strefy.</li>
          <li>
            Dozwolone ruchy wewnętrzne:
            <ul className="list-circle list-inside pl-5">
              <li>Z miejsca na regale (<LocationHighlight>R0xxxx</LocationHighlight>) na podłogę (<LocationHighlight>{SUB_WAREHOUSE_ID}</LocationHighlight>).</li>
              <li>Z podłogi (<LocationHighlight>{SUB_WAREHOUSE_ID}</LocationHighlight>) na wolne miejsce na regale (<LocationHighlight>R0xxxx</LocationHighlight>).</li>
            </ul>
          </li>
          <li>Przeniesienia z regału na inny regał za pomocą strony "Skanowanie Palet" nie są obsługiwane.</li>
        </ul>
      </section>

      <section className="mt-2">
        <h4 className="font-medium text-primary-600 mb-1">5. Z Lokalizacji Produkcyjnych (<LocationHighlight>BBx</LocationHighlight>, <LocationHighlight>MZx</LocationHighlight>, etc.):</h4>
        <ul className="list-disc list-inside pl-4 space-y-0.5">
          <li>
            Palety stojące na bezpośrednich lokalizacjach produkcyjnych można wycofać do następujących miejsc:
            <ul className="list-circle list-inside pl-5">
              <li>Bufora Magazynu Produkcyjnego: <LocationHighlight>{BUFFER_MP01_ID}</LocationHighlight>.</li>
              <li>Strefy Produkcyjnej <LocationHighlight>{SUB_WAREHOUSE_ID}</LocationHighlight> (podłoga).</li>
              <li>Dowolnego regału magazynowego (<LocationHighlight>R01-R07</LocationHighlight>).</li>
              <li>Strefy Konfekcjonowania: <LocationHighlight>{KO01_WAREHOUSE_ID}</LocationHighlight>.</li>
            </ul>
          </li>
          <li>Próba przeniesienia w inne miejsce przez stronę "Skanowanie Palet" zostanie zablokowana.</li>
          <li>
            <span className="text-orange-700 italic">Wskazówka:</span> Użyj strony "Skanowanie Palet", aby elastycznie zarządzać paletami wracającymi z produkcji.
          </li>
        </ul>
      </section>
      
      <p className="text-xs italic mt-3">
        Pamiętaj, że zawsze obowiązują standardowe walidacje, takie jak zgodność typu produktu z lokalizacją (np. Big Bag na BBx), dozwolone produkty na danej lokalizacji (jeśli skonfigurowano), oraz termin ważności palety (palety przeterminowane generalnie nie mogą trafiać na aktywne lokalizacje produkcyjne). Pojemność lokalizacji (np. podłogi MP01) jest również sprawdzana.
      </p>
    </div>
  );
};

export default PalletMovementLogicInfo;