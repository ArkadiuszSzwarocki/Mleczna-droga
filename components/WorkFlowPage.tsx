import React, { useState } from 'react';
import ShareIcon from './icons/ShareIcon';
import TruckIcon from './icons/TruckIcon';
import BeakerIcon from './icons/BeakerIcon';
import LockClosedIcon from './icons/LockClosedIcon';
import LockOpenIcon from './icons/LockOpenIcon';
import InboxArrowDownIcon from './icons/InboxArrowDownIcon';
import WarehouseIcon from './icons/WarehouseIcon';
import ArchiveBoxIcon from './icons/ArchiveBoxIcon';
import CogIcon from './icons/CogIcon';
import MinusCircleIcon from './icons/MinusCircleIcon';
import DocumentTextIcon from './icons/DocumentTextIcon';
import ClipboardListIcon from './icons/ClipboardListIcon';
import ArrowRightIcon from './icons/ArrowRightIcon';
import ArrowDownIcon from './icons/ArrowDownIcon';
import PlayIcon from './icons/PlayIcon';
import CubeIcon from './icons/CubeIcon';
import MixerIcon from './icons/MixerIcon';
import CheckCircleIcon from './icons/CheckCircleIcon';
import CalendarDaysIcon from './icons/CalendarDaysIcon';
import { 
    SOURCE_WAREHOUSE_ID_MS01, 
    BUFFER_MS01_ID, 
    BUFFER_MP01_ID, 
    SUB_WAREHOUSE_ID, 
    MGW01_WAREHOUSE_ID, 
    MGW02_WAREHOUSE_ID,
    OSIP_WAREHOUSE_ID,
    MDM01_WAREHOUSE_ID,
    MOP01_WAREHOUSE_ID,
    PSD_WAREHOUSE_ID
} from '../constants';

// --- Komponenty pomocnicze dla Schematu Blokowego ---

const ZoneNode: React.FC<{ 
    title: string; 
    icon?: React.ReactNode; 
    colorClass: string; 
    subTitle?: string;
    isMain?: boolean;
}> = ({ title, icon, colorClass, subTitle, isMain }) => (
    <div className={`relative p-3 rounded-lg border-2 shadow-sm flex flex-col items-center text-center transition-transform hover:scale-105 z-10 ${colorClass} ${isMain ? 'w-full md:w-48 min-h-[100px] justify-center' : 'w-full md:w-40 min-h-[80px] justify-center'}`}>
        {icon && <div className="mb-1">{icon}</div>}
        <span className="font-bold text-sm">{title}</span>
        {subTitle && <span className="text-[10px] opacity-80 mt-1 font-mono">{subTitle}</span>}
    </div>
);

const ConnectionArrow: React.FC<{ 
    direction?: 'right' | 'down' | 'vertical-to-horizontal';
    label?: string;
}> = ({ direction = 'right', label }) => {
    return (
        <div className={`flex items-center justify-center relative ${direction === 'right' ? 'h-8 md:h-auto md:w-12 py-2 md:py-0' : 'h-12 w-full'}`}>
             {label && (
                <span className="absolute text-[9px] font-bold text-gray-500 dark:text-gray-400 bg-slate-50 dark:bg-secondary-900 px-1 z-20 whitespace-nowrap border border-gray-200 dark:border-secondary-700 rounded-full">
                    {label}
                </span>
            )}
            <div className={`absolute bg-gray-300 dark:bg-gray-600 ${direction === 'right' ? 'hidden md:block h-0.5 w-full' : 'w-0.5 h-full'}`}></div>
             <div className="hidden md:block absolute right-0 top-1/2 -translate-y-1/2">
                 {direction === 'right' && <ArrowRightIcon className="h-4 w-4 text-gray-400" />}
             </div>
             <div className="md:hidden absolute bottom-0 left-1/2 -translate-x-1/2">
                 <ArrowDownIcon className="h-4 w-4 text-gray-400" />
             </div>
        </div>
    );
};

// --- Komponent Opisu Kroku ---

const ProcessStep: React.FC<{
    number: number;
    title: string;
    icon: React.ReactNode;
    description: React.ReactNode;
    details: string[];
    color: string;
}> = ({ number, title, icon, description, details, color }) => (
    <div className="flex gap-4 mb-8 relative last:mb-0">
        <div className="flex flex-col items-center">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shadow-md z-10 ${color}`}>
                {number}
            </div>
            <div className="w-0.5 bg-gray-200 dark:bg-gray-700 h-full absolute top-10 left-5 -translate-x-1/2 z-0 last:hidden"></div>
        </div>
        <div className="flex-1 pb-8 border-b dark:border-secondary-700 last:border-0 last:pb-0">
            <div className="flex items-center gap-2 mb-2">
                <div className={`p-1.5 rounded-md bg-opacity-20 ${color.replace('bg-', 'text-').replace('500', '700')} dark:text-white`}>
                    {icon}
                </div>
                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200">{title}</h3>
            </div>
            <div className="text-sm text-gray-700 dark:text-gray-300 mb-3 leading-relaxed">
                {description}
            </div>
            <ul className="space-y-1.5">
                {details.map((detail, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-secondary-800/50 p-2 rounded">
                        <div className={`mt-0.5 w-1.5 h-1.5 rounded-full ${color} flex-shrink-0`}></div>
                        <span>{detail}</span>
                    </li>
                ))}
            </ul>
        </div>
    </div>
);

const WorkFlowPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'warehouse' | 'production'>('warehouse');

    return (
        <div className="p-4 md:p-6 bg-slate-50 dark:bg-secondary-900/50 min-h-full flex flex-col">
            <header className="flex flex-col md:flex-row md:items-center justify-between mb-6 border-b dark:border-secondary-600 pb-4 gap-4">
                <div className="flex items-center">
                    <ShareIcon className="h-8 w-8 text-primary-600 dark:text-primary-400 mr-3" />
                    <div>
                        <h2 className="text-2xl font-semibold text-primary-700 dark:text-primary-300">Schemat Procesów Systemu</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Kompletny przewodnik po logistyce i produkcji.</p>
                    </div>
                </div>
                
                <div className="flex bg-gray-200 dark:bg-secondary-700 p-1 rounded-lg self-start md:self-center">
                    <button 
                        onClick={() => setActiveTab('warehouse')}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'warehouse' ? 'bg-white dark:bg-secondary-600 shadow text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                    >
                        Logistyka Magazynowa
                    </button>
                    <button 
                        onClick={() => setActiveTab('production')}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'production' ? 'bg-white dark:bg-secondary-600 shadow text-orange-600 dark:text-orange-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                    >
                        Proces Produkcyjny
                    </button>
                </div>
            </header>

            {activeTab === 'warehouse' && (
                <div className="animate-fadeIn space-y-8">
                    {/* --- SCHEMAT WIZUALNY MAGAZYNU --- */}
                    <section className="overflow-x-auto pb-4">
                        <div className="bg-white dark:bg-secondary-800 p-6 rounded-xl shadow-md min-w-[1000px] md:min-w-0 border border-slate-200 dark:border-secondary-700">
                            <div className="flex flex-col gap-6 items-center">
                                {/* Rząd 1: Dostawa -> Bufor */}
                                <div className="flex gap-4 items-center w-full justify-center">
                                    <ZoneNode title="Dostawca" icon={<TruckIcon className="h-6 w-6"/>} colorClass="bg-slate-100 dark:bg-secondary-700 border-slate-300 text-slate-700" />
                                    <ConnectionArrow label="Rozładunek" />
                                    <div className="flex flex-col gap-4 items-center border-2 border-dashed border-blue-300 p-2 rounded-lg bg-blue-50 dark:bg-blue-900/10">
                                        <span className="text-[10px] font-bold text-blue-700 uppercase mb-1">STREFA PRZYJĘĆ</span>
                                        <ZoneNode title="Bufor Przyjęć" subTitle={BUFFER_MS01_ID} icon={<InboxArrowDownIcon className="h-6 w-6"/>} colorClass="bg-blue-100 border-blue-400 text-blue-800 font-bold !min-h-[80px] !w-48" isMain />
                                    </div>
                                    <ConnectionArrow label="Pobranie Próbki" />
                                    <ZoneNode title="Laboratorium" subTitle="Kwarantanna" icon={<BeakerIcon className="h-6 w-6"/>} colorClass="bg-yellow-100 border-yellow-400 text-yellow-800" />
                                </div>

                                {/* Strzałka w dół */}
                                <div className="h-8 border-l-2 border-gray-300 dark:border-secondary-600"></div>

                                {/* Rząd 2: Magazyny (Po zwolnieniu) */}
                                <div className="flex gap-4 items-start w-full justify-center">
                                    {/* Lewa strona: Magazyny Surowców */}
                                    <div className="flex flex-col gap-3 items-center">
                                        <div className="border-2 border-blue-500 p-2 rounded-lg bg-blue-50 dark:bg-blue-900/10">
                                            <span className="block text-center text-[10px] font-bold text-blue-700 uppercase mb-1">CENTRALA</span>
                                            <ZoneNode title="Magazyn Główny" subTitle={SOURCE_WAREHOUSE_ID_MS01} colorClass="bg-blue-200 border-blue-500 text-blue-900 font-bold !w-48" />
                                        </div>
                                        <div className="flex gap-2">
                                             <ZoneNode title="Dodatki" subTitle={MDM01_WAREHOUSE_ID} colorClass="bg-purple-100 border-purple-400 text-purple-800 !w-24 !min-h-[50px] text-xs" />
                                             <ZoneNode title="Opakowania" subTitle={MOP01_WAREHOUSE_ID} colorClass="bg-purple-100 border-purple-400 text-purple-800 !w-24 !min-h-[50px] text-xs" />
                                        </div>
                                        <ZoneNode title="Magazyn Zew." subTitle={OSIP_WAREHOUSE_ID} colorClass="bg-slate-200 border-slate-400 text-slate-800 !w-32" />
                                    </div>

                                    <div className="self-center px-4">
                                         <ConnectionArrow label="Przesunięcie" />
                                    </div>

                                    {/* Prawa strona: Bufory Produkcyjne */}
                                    <div className="flex flex-col gap-3 items-center justify-center">
                                         <div className="border-2 border-indigo-400 p-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/10">
                                            <span className="block text-center text-[10px] font-bold text-indigo-700 uppercase mb-1">ZASILANIE PRODUKCJI</span>
                                            <ZoneNode title="Bufor Produkcyjny" subTitle={BUFFER_MP01_ID} colorClass="bg-indigo-100 border-indigo-400 text-indigo-800 font-bold !w-48" />
                                        </div>
                                    </div>
                                </div>
                                
                                 {/* Strzałka w dół */}
                                <div className="h-8 border-l-2 border-gray-300 dark:border-secondary-600"></div>

                                {/* Rząd 3: Produkcja */}
                                <div className="flex gap-4 items-center w-full justify-center">
                                    <ZoneNode title="Produkcja AGRO" subTitle="Linia Główna" icon={<PlayIcon className="h-6 w-6"/>} colorClass="bg-orange-100 border-orange-500 text-orange-800 !w-48" />
                                    <span className="text-xs text-gray-400 font-bold">LUB</span>
                                    <ZoneNode title="Produkcja PSD" subTitle="Specjalna" icon={<BeakerIcon className="h-6 w-6"/>} colorClass="bg-orange-100 border-orange-500 text-orange-800 !w-48" />
                                </div>

                            </div>
                        </div>
                    </section>

                    {/* --- SZCZEGÓŁOWY OPIS PROCESU MAGAZYNOWEGO --- */}
                    <section className="max-w-5xl">
                        <h3 className="text-xl font-bold text-blue-800 dark:text-blue-300 mb-6 pl-2 border-l-4 border-blue-500">Szczegółowy Opis Przepływu (Logistyka)</h3>
                        
                        <ProcessStep 
                            number={1}
                            color="bg-blue-600"
                            icon={<InboxArrowDownIcon className="h-5 w-5"/>}
                            title="Rejestracja w Buforze Przyjęć (BF_MS01)"
                            description="Każda dostawa fizycznie trafia najpierw do strefy przyjęć (BF_MS01). Magazynier wprowadza dane do systemu."
                            details={[
                                "Wpisanie danych z dokumentów WZ (dostawca, nr zamówienia).",
                                "Wprowadzenie danych palet (produkt, waga, data produkcji/ważności, nr partii).",
                                "Palety otrzymują status 'Oczekuje na Lab' i są wirtualnie w lokalizacji BF_MS01.",
                                "System generuje unikalne ID dla każdej palety."
                            ]}
                        />
                        
                        <ProcessStep 
                            number={2}
                            color="bg-yellow-500"
                            icon={<BeakerIcon className="h-5 w-5"/>}
                            title="Kontrola Jakości (Laboratorium)"
                            description="Laborant pobiera próbki z palet znajdujących się w strefie przyjęć (BF_MS01)."
                            details={[
                                "Laborant widzi w systemie listę 'Oczekujące na Lab'.",
                                "Wprowadzenie wyników analizy jakościowej.",
                                "Decyzja: Zablokowanie (status 'Blocked') lub Zwolnienie (status 'Available').",
                                "Tylko zwolnione palety mogą przejść do kolejnego etapu."
                            ]}
                        />

                        <ProcessStep 
                            number={3}
                            color="bg-green-600"
                            icon={<DocumentTextIcon className="h-5 w-5"/>}
                            title="Potwierdzenie i Etykietowanie"
                            description="Po akceptacji przez laboratorium, magazynier finalizuje przyjęcie."
                            details={[
                                "Zmiana statusu dostawy na 'Zakończona'.",
                                "Wygenerowanie i wydruk etykiet kodów kreskowych dla każdej palety.",
                                "Fizyczne naklejenie etykiet na palety."
                            ]}
                        />

                        <ProcessStep 
                            number={4}
                            color="bg-indigo-500"
                            icon={<WarehouseIcon className="h-5 w-5"/>}
                            title="Rozlokowanie (Put-away)"
                            description="Fizyczne przewiezienie palet z bufora przyjęć (BF_MS01) do docelowych miejsc składowania."
                            details={[
                                "Magazynier skanuje etykietę palety i kod lokalizacji docelowej.",
                                "Główne surowce trafiają do Centrali (MS01) lub bezpośrednio do Bufora Produkcyjnego (BF_MP01).",
                                "Dodatki trafiają do MDM01, a opakowania do MOP01.",
                                "System aktualizuje stan magazynowy w czasie rzeczywistym."
                            ]}
                        />
                        
                         <ProcessStep 
                            number={5}
                            color="bg-orange-500"
                            icon={<ArrowRightIcon className="h-5 w-5"/>}
                            title="Wydanie na Produkcję"
                            description="Zasilanie linii produkcyjnych surowcami."
                            details={[
                                "Przesunięcie z magazynów (MS01) do Bufora Produkcyjnego (BF_MP01).",
                                "Zasypywanie stacji (BBxx/MZxx) - system weryfikuje zgodność surowca ze stacją.",
                                "Zużycie surowca jest rejestrowane podczas realizacji zleceń produkcyjnych."
                            ]}
                        />
                    </section>
                </div>
            )}

            {activeTab === 'production' && (
                <div className="animate-fadeIn space-y-8">
                     {/* --- SCHEMAT WIZUALNY PRODUKCJI --- */}
                    <section className="overflow-x-auto pb-4">
                        <div className="bg-white dark:bg-secondary-800 p-6 rounded-xl shadow-md min-w-[1000px] md:min-w-0 border border-slate-200 dark:border-secondary-700">
                             <div className="grid grid-cols-1 md:grid-cols-[auto_auto_auto_auto_auto_auto_auto_auto_auto] gap-y-4 items-center justify-items-center">
                                {/* Surowce */}
                                <div className="flex flex-col gap-2">
                                    <ZoneNode title="Surowce" subTitle="Dostępne palety" icon={<CubeIcon className="h-6 w-6"/>} colorClass="bg-blue-100 border-blue-400 text-blue-800" />
                                    <ZoneNode title="Miksowanie" subTitle="Premiksy" icon={<MixerIcon className="h-6 w-6"/>} colorClass="bg-purple-100 border-purple-400 text-purple-800 !w-32 !min-h-[60px]" />
                                </div>
                                <ConnectionArrow label="Pobranie" />
                                {/* Stacje */}
                                <div className="flex flex-col gap-3 border-2 border-dashed border-gray-300 p-3 rounded-lg">
                                    <span className="text-[10px] font-bold text-gray-500 uppercase mb-1 text-center w-full block">Przygotowanie</span>
                                    <div className="grid grid-cols-2 gap-2">
                                        <ZoneNode title="Big Bag" subTitle="BBxx" colorClass="bg-orange-50 border-orange-300 text-orange-800 !w-auto !min-h-[60px]" />
                                        <ZoneNode title="Worki" subTitle="MZxx" colorClass="bg-orange-50 border-orange-300 text-orange-800 !w-auto !min-h-[60px]" />
                                    </div>
                                     <ZoneNode title="Dosypki" subTitle="Ręczne/Wiadra" colorClass="bg-yellow-50 border-yellow-300 text-yellow-800 !min-h-[50px]" />
                                </div>
                                <ConnectionArrow label="Dozowanie" />
                                {/* Proces */}
                                <div className="flex flex-col gap-4 p-4 bg-slate-100 dark:bg-secondary-700/50 rounded-xl border border-slate-300">
                                     <ZoneNode title="Linia AGRO" subTitle="Mieszanie główne" icon={<PlayIcon className="h-6 w-6 text-green-600"/>} colorClass="bg-white border-green-500 text-green-800 font-bold !w-48" />
                                    <div className="flex justify-center"><ArrowDownIcon className="h-4 w-4 text-gray-400" /></div>
                                    <ZoneNode title="Linia PSD" subTitle="Produkcja Specjalna" icon={<BeakerIcon className="h-6 w-6 text-blue-500"/>} colorClass="bg-white border-blue-500 text-blue-800 font-bold !w-48" />
                                </div>
                                <ConnectionArrow />
                                {/* Kontrola */}
                                <div className="flex flex-col gap-2 items-center">
                                     <ZoneNode title="NIRS" subTitle="Analiza on-line" colorClass="bg-yellow-100 border-yellow-400 text-yellow-800 !w-32 !min-h-[60px]" />
                                     <ZoneNode title="Próbki" subTitle="Archiwum" colorClass="bg-yellow-100 border-yellow-400 text-yellow-800 !w-32 !min-h-[60px]" />
                                </div>
                                <ConnectionArrow label="Gotowe" />
                                {/* Pakowanie */}
                                <div className="flex flex-col gap-2">
                                    <ZoneNode title="Pakowanie" subTitle="Workowanie" icon={<ArchiveBoxIcon className="h-6 w-6"/>} colorClass="bg-indigo-100 border-indigo-500 text-indigo-800" />
                                     <ZoneNode title="Etykietowanie" subTitle="Rejestracja WG" colorClass="bg-indigo-50 border-indigo-300 text-indigo-800 !min-h-[50px]" />
                                </div>
                                <ConnectionArrow />
                                {/* Koniec */}
                                 <div className="flex flex-col gap-2">
                                    <ZoneNode title="Magazyn WG" subTitle={MGW01_WAREHOUSE_ID} icon={<WarehouseIcon className="h-6 w-6"/>} colorClass="bg-green-100 border-green-500 text-green-800" />
                                </div>
                             </div>
                        </div>
                    </section>

                    {/* --- SZCZEGÓŁOWY OPIS PROCESU PRODUKCYJNEGO --- */}
                    <section className="max-w-5xl">
                        <h3 className="text-xl font-bold text-orange-800 dark:text-orange-300 mb-6 pl-2 border-l-4 border-orange-500">Szczegółowy Opis Procesu Produkcyjnego</h3>
                        
                        <ProcessStep 
                            number={1}
                            color="bg-blue-500"
                            icon={<CalendarDaysIcon className="h-5 w-5"/>}
                            title="Planowanie Produkcji"
                            description="Planista tworzy zlecenie produkcyjne na podstawie receptury. Określa ilość docelową, datę realizacji oraz linię (AGRO lub PSD)."
                            details={[
                                "System sprawdza dostępność surowców (fizyczną i wolną od rezerwacji).",
                                "Zlecenie zostaje podzielone na mniejsze partie (szarże) zgodnie z pojemnością mieszalnika (np. 2000 kg).",
                                "System generuje listę braków materiałowych, jeśli surowce nie są dostępne."
                            ]}
                        />

                        <ProcessStep 
                            number={2}
                            color="bg-orange-500"
                            icon={<CogIcon className="h-5 w-5"/>}
                            title="Przygotowanie Stacji Zasypowych"
                            description="Przed rozpoczęciem produkcji, operatorzy muszą zasilić stacje zasypowe odpowiednimi surowcami."
                            details={[
                                "Skanowanie ID palety surowca i ID stacji (np. BB01).",
                                "System blokuje zasypanie stacji niewłaściwym surowcem (weryfikacja z recepturą).",
                                "Palety zablokowane przez Lab lub przeterminowane są odrzucane przez system."
                            ]}
                        />

                        <ProcessStep 
                            number={3}
                            color="bg-green-600"
                            icon={<PlayIcon className="h-5 w-5"/>}
                            title="Realizacja Zlecenia (Mieszanie)"
                            description="Operator rozpoczyna partię. System śledzi zużycie surowców w czasie rzeczywistym."
                            details={[
                                "Dla surowców głównych: automatyczne pobieranie wagi z palet na stacjach.",
                                "Dla mikroskładników: ręczne odważanie i skanowanie wiader (Dosypki).",
                                "Proces miksowania tworzy nowy półprodukt lub produkt gotowy."
                            ]}
                        />

                        <ProcessStep 
                            number={4}
                            color="bg-yellow-500"
                            icon={<BeakerIcon className="h-5 w-5"/>}
                            title="Kontrola Procesu (NIRS i Próbki)"
                            description="Przed zwolnieniem partii do pakowania, mieszanka musi przejść kontrolę jakości."
                            details={[
                                "Analiza NIRS: badanie on-line składu mieszanki. Wynik negatywny wymusza korektę receptury (dodatkową dosypkę).",
                                "Próbkowanie: pobranie fizycznej próbki do woreczka i jej archiwizacja (skanowanie kodu QR woreczka i lokalizacji w archiwum ALA)."
                            ]}
                        />

                        <ProcessStep 
                            number={5}
                            color="bg-indigo-500"
                            icon={<CubeIcon className="h-5 w-5"/>}
                            title="Pakowanie i Etykietowanie"
                            description="Gotowa mieszanka trafia do strefy pakowania. Operator pakowania tworzy jednostki handlowe (palety)."
                            details={[
                                "Operator wybiera zakończoną szarżę.",
                                "System oblicza wagę netto na podstawie wagi worków/Big Bagów.",
                                "Generowana jest etykieta Wyrobu Gotowego (WG) z unikalnym kodem SSCC.",
                                "System drukuje etykietę, a paleta trafia wirtualnie do strefy 'Oczekuje na etykietę', a po potwierdzeniu do strefy przyjęć magazynu."
                            ]}
                        />
                    </section>
                </div>
            )}
        </div>
    );
};

export default WorkFlowPage;