import React, { useState, useMemo, lazy, Suspense } from 'react';
import Squares2X2Icon from './icons/Squares2X2Icon';
import { useAuth } from './contexts/AuthContext';
import { useUIContext } from './contexts/UIContext';
import { View } from '../types';
import Button from './Button';
import UserCircleIcon from './icons/UserCircleIcon';
import InformationCircleIcon from './icons/InformationCircleIcon';
import CustomizeDashboardModal, { WidgetDefinition } from './CustomizeDashboardModal';
import AdjustmentsHorizontalIcon from './icons/AdjustmentsHorizontalIcon';
import { StatCard } from './StatCard';

// FIX: Uproszczone importy lazy, bez niebezpiecznego mapowania m.DefaultName, co powodowało błąd #306
const AdminDashboard = lazy(() => import('./dashboards/AdminDashboard'));
const LabDashboard = lazy(() => import('./dashboards/LabDashboard'));
const MagazynierDashboard = lazy(() => import('./dashboards/MagazynierDashboard'));
const PlanistaDashboard = lazy(() => import('./dashboards/PlanistaDashboard'));
const PsdDashboard = lazy(() => import('./dashboards/PsdDashboard'));
const OperatorProcesuDashboard = lazy(() => import('./dashboards/OperatorProcesuDashboard'));
const OperatorAgroDashboard = lazy(() => import('./dashboards/OperatorAgroDashboard'));

// --- Definitions of available widgets per role ---
const WIDGET_DEFINITIONS: Record<string, WidgetDefinition[]> = {
    'admin': [
        { id: 'stats_row', label: 'Kluczowe Wskaźniki (KPI)', description: 'Liczba użytkowników, akcje w kolejce, zgodność dostaw, zajętość.' },
        { id: 'quick_actions', label: 'Szybkie Akcje', description: 'Przyciski skrótów do zarządzania.' },
        { id: 'recent_activity', label: 'Ostatnia Aktywność', description: 'Log ostatnich zdarzeń w systemie.' }
    ],
    'lab': [
        { id: 'stats_row', label: 'Statystyki Laboratorium', description: 'Dostawy do zatwierdzenia, zablokowane palety, dosypki.' },
        { id: 'quick_actions', label: 'Szybkie Akcje', description: 'Skróty do zwalniania palet i receptur.' },
        { id: 'pending_deliveries', label: 'Oczekujące Dostawy', description: 'Lista dostaw wymagających działania laboratorium.' }
    ],
    'magazynier': [
        { id: 'stats_row', label: 'Statystyki Magazynowe', description: 'Strefa przyjęć, bufory, palety krytyczne.' },
        { id: 'quick_actions', label: 'Szybkie Akcje', description: 'Skanowanie, przegląd magazynów.' },
        { id: 'mixing_tasks', label: 'Zlecenia Miksowania', description: 'Lista aktywnych zleceń miksowania.' },
        { id: 'dispatch_orders', label: 'Zlecenia Wydania', description: 'Lista oczekujących wydań.' },
        { id: 'urgent_pallets', label: 'Palety Pilne', description: 'Palety z krótkim terminem ważności.' }
    ],
    'planista': [
        { id: 'stats_row', label: 'Wskaźniki Planistyczne', description: 'Nowe zlecenia, palety krytyczne, zlecenia miksowania.' },
        { id: 'quick_actions', label: 'Szybkie Akcje', description: 'Skróty do planerów.' },
        { id: 'production_calculator', label: 'Kalkulator Produkcji', description: 'Narzędzie do obliczania możliwości produkcyjnych.' }
    ],
    'operator_procesu': [
        { id: 'quick_actions', label: 'Menu Główne', description: 'Przyciski startowe dla procesów.' },
        { id: 'production_status', label: 'Status Produkcji', description: 'Informacja o aktywnej produkcji AGRO.' },
        { id: 'critical_stations', label: 'Krytyczne Stacje', description: 'Stacje wymagające uzupełnienia.' }
    ],
    'operator_agro': [
        { id: 'main_actions', label: 'Zadania Operatora', description: 'Główne kafelki akcji produkcyjnych.' }
    ],
    'operator_psd': [
        { id: 'tasks_list', label: 'Lista Zleceń', description: 'Karty zleceń produkcyjnych PSD.' }
    ]
};

const UserDashboard: React.FC = () => {
    const { handleSetView } = useUIContext();
    const { currentUser } = useAuth();
    
    return (
        <div className="p-4 md:p-6 bg-white dark:bg-secondary-800 shadow-xl rounded-lg h-full flex flex-col items-center justify-center">
            <UserCircleIcon className="h-24 w-24 text-gray-300 dark:text-gray-600 mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">
                Witaj, {currentUser?.username || 'Użytkowniku'}!
            </h2>
            <p className="mt-2 text-center text-gray-500 dark:text-gray-400 max-w-md">
                To jest Twój pulpit główny. Masz dostęp do podstawowych funkcji systemu. Użyj menu po lewej stronie, aby nawigować po aplikacji.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-4">
                <Button 
                    onClick={() => handleSetView(View.MyAccount)}
                    leftIcon={<UserCircleIcon className="h-5 w-5"/>}
                >
                    Moje Konto
                </Button>
                <Button 
                    onClick={() => handleSetView(View.Information)}
                    variant="secondary"
                    leftIcon={<InformationCircleIcon className="h-5 w-5"/>}
                >
                    Informacje o Systemie
                </Button>
            </div>
        </div>
    );
};

const DashboardPage: React.FC = () => {
    const { currentUser } = useAuth();
    const [hiddenWidgets, setHiddenWidgets] = useState<string[]>([]);
    const [isCustomizeModalOpen, setIsCustomizeModalOpen] = useState(false);
    
    const availableWidgets = useMemo(() => {
        return currentUser ? (WIDGET_DEFINITIONS[currentUser.role] || []) : [];
    }, [currentUser]);

    const isWidgetVisible = (id: string) => !hiddenWidgets.includes(id);

    const renderDashboard = () => {
        switch (currentUser?.role) {
            case 'admin':
                return <AdminDashboard isWidgetVisible={isWidgetVisible} />;
            case 'lab':
                return <LabDashboard isWidgetVisible={isWidgetVisible} />;
            case 'magazynier':
            case 'kierownik magazynu':
                return <MagazynierDashboard isWidgetVisible={isWidgetVisible} />;
            case 'operator_agro':
                return <OperatorAgroDashboard isWidgetVisible={isWidgetVisible} />;
            case 'operator_procesu':
                return <OperatorProcesuDashboard isWidgetVisible={isWidgetVisible} />;
            case 'planista':
                return <PlanistaDashboard isWidgetVisible={isWidgetVisible} />;
            case 'user':
                return <UserDashboard />;
            case 'operator_psd':
                return <PsdDashboard isWidgetVisible={isWidgetVisible} />;
            default:
                return (
                     <div className="p-4 md:p-6 bg-white dark:bg-secondary-800 shadow-xl rounded-lg h-full flex flex-col items-center justify-center">
                        <Squares2X2Icon className="h-24 w-24 text-gray-300 dark:text-gray-600 mb-4" />
                        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">Pulpit Główny</h2>
                        <p className="mt-2 text-gray-500 dark:text-gray-400">Brak dedykowanego pulpitu dla Twojej roli.</p>
                    </div>
                );
        }
    }

    return (
         <div className="p-4 md:p-6 relative">
            {availableWidgets.length > 0 && (
                <div className="absolute top-4 right-6 z-10">
                    <Button onClick={() => setIsCustomizeModalOpen(true)} variant="secondary" className="text-xs p-2 shadow-sm" title="Personalizuj Pulpit">
                        <AdjustmentsHorizontalIcon className="h-5 w-5 text-gray-600 dark:text-gray-300"/>
                    </Button>
                </div>
            )}
            
            <Suspense fallback={<div className="h-64 flex items-center justify-center"><div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div></div>}>
                {renderDashboard()}
            </Suspense>

            <CustomizeDashboardModal 
                isOpen={isCustomizeModalOpen}
                onClose={() => setIsCustomizeModalOpen(false)}
                availableWidgets={availableWidgets}
                hiddenWidgetIds={hiddenWidgets}
                onSave={setHiddenWidgets}
            />
        </div>
    );
};

export default DashboardPage;