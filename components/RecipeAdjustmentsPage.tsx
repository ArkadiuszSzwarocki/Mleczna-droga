import React from 'react';
import { useUIContext } from './contexts/UIContext';
import { View } from '../types';
import BeakerIcon from './icons/BeakerIcon';
import PlusIcon from './icons/PlusIcon';
import AdjustmentsHorizontalIcon from './icons/AdjustmentsHorizontalIcon';

const ActionCard: React.FC<{ title: string; description: string; icon: React.ReactNode; onClick: () => void; }> = ({ title, description, icon, onClick }) => (
    <button onClick={onClick} className="group flex flex-col items-start p-6 bg-slate-50 dark:bg-secondary-900/50 hover:bg-primary-50 dark:hover:bg-secondary-700 border border-slate-200 dark:border-secondary-700 rounded-lg transition-all w-full text-left">
        <div className="p-4 bg-white dark:bg-secondary-800 rounded-lg shadow-sm mb-4 text-primary-600 dark:text-primary-300">{icon}</div>
        <p className="font-semibold text-lg text-gray-800 dark:text-gray-200">{title}</p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{description}</p>
    </button>
);

const RecipeAdjustmentsPage: React.FC = () => {
    const { handleSetView } = useUIContext();
    return (
        <div className="p-4 md:p-6 bg-white dark:bg-secondary-800 shadow-xl rounded-lg h-full">
            <header className="flex items-center mb-6 border-b dark:border-secondary-600 pb-4">
                <BeakerIcon className="h-8 w-8 text-primary-600 dark:text-primary-400 mr-3" />
                <h2 className="text-2xl font-semibold text-primary-700 dark:text-primary-300">Korekty Receptur</h2>
            </header>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ActionCard title="Nowa Korekta" description="Stwórz zlecenie dosypki." icon={<PlusIcon className="h-8 w-8" />} onClick={() => handleSetView(View.CreateAdjustmentOrder)} />
                <ActionCard title="Zarządzaj Korektami" description="Lista aktywnych korekt." icon={<AdjustmentsHorizontalIcon className="h-8 w-8" />} onClick={() => handleSetView(View.ManageAdjustments)} />
            </div>
        </div>
    );
};

export default RecipeAdjustmentsPage;