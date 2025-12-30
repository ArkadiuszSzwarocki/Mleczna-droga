
import React from 'react';
import CheckCircleIcon from './icons/CheckCircleIcon';
import Button from './Button';
import { useUIContext } from './contexts/UIContext';
import { View } from '../types';

const InventoryFinalizationPage: React.FC = () => {
    const { handleSetView } = useUIContext();

    return (
        <div className="flex flex-col items-center justify-center h-full p-6 text-center bg-slate-50 dark:bg-secondary-900">
            <div className="w-24 h-24 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-6 shadow-lg animate-bounce">
                <CheckCircleIcon className="h-14 w-14 text-green-600 dark:text-green-400" />
            </div>
            <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200 mb-3">Inwentaryzacja Zakończona</h1>
            <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 max-w-md">
                Sesja została pomyślnie zamknięta. Stany magazynowe zostały zaktualizowane, a różnice zaksięgowane w systemie.
            </p>
            <div className="flex gap-4">
                <Button onClick={() => handleSetView(View.Dashboard)} className="px-6 py-3 text-lg">
                    Wróć na Pulpit
                </Button>
                 <Button onClick={() => handleSetView(View.InventoryReports)} variant="secondary" className="px-6 py-3 text-lg">
                    Zobacz Raport
                </Button>
            </div>
        </div>
    );
};

export default InventoryFinalizationPage;
