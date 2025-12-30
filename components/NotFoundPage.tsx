
import React from 'react';
import { useUIContext } from './contexts/UIContext';
import { View } from '../types';
import Button from './Button';
import SadBotIcon from './icons/SadBotIcon';

const NotFoundPage: React.FC = () => {
    const { handleSetView } = useUIContext();

    return (
        <div className="flex flex-col items-center justify-center h-full p-6 text-center bg-slate-50 dark:bg-secondary-900">
            <SadBotIcon className="w-32 h-32 text-gray-400 mb-6" />
            <h1 className="text-4xl font-bold text-gray-800 dark:text-gray-200 mb-2">404</h1>
            <h2 className="text-2xl font-semibold text-gray-700 dark:text-gray-300 mb-4">Strona nie znaleziona</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md">
                Wygląda na to, że zabłądziłeś w Mlecznej Drodze. Strona, której szukasz, nie istnieje lub została przeniesiona.
            </p>
            <Button onClick={() => handleSetView(View.Dashboard)} className="text-lg px-6 py-3">
                Wróć na Pulpit
            </Button>
        </div>
    );
};

export default NotFoundPage;
