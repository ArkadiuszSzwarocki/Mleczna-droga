import React from 'react';
import Button from './Button';
import XCircleIcon from './icons/XCircleIcon';
import BeakerIcon from './icons/BeakerIcon';
import CogIcon from './icons/CogIcon';

interface ChooseProductionTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAgro: () => void;
  onSelectPsd: () => void;
  recipeName?: string;
}

const ChooseProductionTypeModal: React.FC<ChooseProductionTypeModalProps> = ({ isOpen, onClose, onSelectAgro, onSelectPsd, recipeName }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-[160]" onClick={onClose}>
            <div className="bg-white dark:bg-secondary-800 rounded-lg shadow-xl p-6 w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold text-primary-700 dark:text-primary-300">
                        Wybierz Typ Produkcji
                    </h2>
                    <Button onClick={onClose} variant="secondary" className="p-1.5 -mr-1.5"><XCircleIcon className="h-5 w-5"/></Button>
                </div>
                
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                    Wybierz, dla której linii produkcyjnej chcesz zaplanować produkcję produktu: <strong className="text-gray-800 dark:text-gray-200">{recipeName}</strong>.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button
                        onClick={onSelectAgro}
                        className="group flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-secondary-900 hover:bg-primary-50 dark:hover:bg-primary-900/50 border-2 border-slate-200 dark:border-secondary-700 hover:border-primary-400 dark:hover:border-primary-500 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                    >
                        <CogIcon className="h-12 w-12 text-primary-500 mb-3 transition-transform group-hover:scale-110" />
                        <span className="text-lg font-bold text-gray-800 dark:text-gray-200">Produkcja AGRO</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">Standardowa produkcja</span>
                    </button>
                    <button
                        onClick={onSelectPsd}
                        className="group flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-secondary-900 hover:bg-primary-50 dark:hover:bg-primary-900/50 border-2 border-slate-200 dark:border-secondary-700 hover:border-primary-400 dark:hover:border-primary-500 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                    >
                        <BeakerIcon className="h-12 w-12 text-primary-500 mb-3 transition-transform group-hover:scale-110" />
                        <span className="text-lg font-bold text-gray-800 dark:text-gray-200">Produkcja PSD</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">Produkcja specjalna</span>
                    </button>
                </div>
                 <div className="mt-6 text-right">
                    <Button onClick={onClose} variant="secondary">Anuluj</Button>
                </div>
            </div>
        </div>
    );
};

export default ChooseProductionTypeModal;
