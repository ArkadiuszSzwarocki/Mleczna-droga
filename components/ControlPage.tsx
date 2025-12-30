
import React from 'react';
import { View } from '../types';
import { useUIContext } from './contexts/UIContext';
import ShieldCheckIcon from './icons/ShieldCheckIcon';
import LinkIcon from './icons/LinkIcon';
import ClockRewindIcon from './icons/ClockRewindIcon';

const ControlItemCard: React.FC<{
    item: { view: View; label: string; description: string; icon: React.ReactNode; };
    onClick: (view: View) => void;
}> = ({ item, onClick }) => (
    <button
        onClick={() => onClick(item.view)}
        className="group flex flex-col items-start p-4 bg-slate-50 dark:bg-secondary-900/50 hover:bg-primary-50 dark:hover:bg-secondary-700 border border-slate-200 dark:border-secondary-700 hover:border-primary-300 dark:hover:border-primary-600 rounded-lg transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 w-full text-left"
    >
        <div className="p-3 bg-white dark:bg-secondary-800 rounded-lg shadow-sm mb-3 group-hover:bg-primary-100 dark:group-hover:bg-primary-900/40 text-primary-600 dark:text-primary-300">
            {item.icon}
        </div>
        <div>
            <p className="font-semibold text-gray-800 dark:text-gray-200">{item.label}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{item.description}</p>
        </div>
    </button>
);


export const ControlPage: React.FC = () => {
    const { handleSetView } = useUIContext();

    const controlItems = [
        {
            view: View.Traceability,
            label: 'Śledzenie Palet',
            description: 'Prześledź pełną historię dowolnej palety w systemie.',
            icon: <LinkIcon className="h-8 w-8" />
        },
        {
            view: View.History,
            label: 'Historia Operacji',
            description: 'Przeglądaj szczegółowy dziennik wszystkich operacji na paletach.',
            icon: <ClockRewindIcon className="h-8 w-8" />
        },
        {
            view: View.UserPermissions,
            label: 'Zarządzanie Uprawnieniami',
            description: 'Definiuj role i przypisuj uprawnienia użytkownikom.',
            icon: <ShieldCheckIcon className="h-8 w-8" />
        }
    ];
    
    return (
        <div className="p-4 md:p-6 bg-white dark:bg-secondary-800 shadow-xl rounded-lg h-full">
            <header className="flex items-center mb-6 border-b dark:border-secondary-600 pb-4">
                <ShieldCheckIcon className="h-8 w-8 text-primary-600 dark:text-primary-400 mr-3" />
                <h2 className="text-2xl font-semibold text-primary-700 dark:text-primary-300">Panel Kontrolny</h2>
            </header>

            <p className="text-md text-gray-600 dark:text-gray-300 mb-6">
                Narzędzia do śledzenia i audytu operacji w systemie.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {controlItems.map(item => (
                    <ControlItemCard key={item.view} item={item} onClick={handleSetView} />
                ))}
            </div>
        </div>
    );
};

export default ControlPage;
