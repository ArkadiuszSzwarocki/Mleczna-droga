import React from 'react';
import { PsdConsumedMaterial, PsdBatch } from '../types';
import Button from './Button';
import XCircleIcon from './icons/XCircleIcon';
import ArrowUturnLeftIcon from './icons/ArrowUturnLeftIcon';

interface ReturnPsdConsumptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (itemToReturn: PsdConsumedMaterial) => void;
  batch: PsdBatch;
}

const ReturnPsdConsumptionModal: React.FC<ReturnPsdConsumptionModalProps> = ({ isOpen, onClose, onConfirm, batch }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-[150]" onClick={onClose}>
      <div className="bg-white dark:bg-secondary-800 rounded-lg shadow-xl p-6 w-full max-w-lg space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-primary-700 dark:text-primary-300 flex items-center gap-2">
                <ArrowUturnLeftIcon className="h-6 w-6"/>
                Zwróć Zużyty Surowiec
            </h2>
            <Button onClick={onClose} variant="secondary" className="p-1.5 -mr-1.5"><XCircleIcon className="h-5 w-5"/></Button>
        </div>

        <div className="max-h-80 overflow-y-auto space-y-2 pr-2">
            {(batch.consumedPallets || []).length > 0 ? (
                (batch.consumedPallets || []).map((item, index) => (
                    <div key={index} className="p-2 border dark:border-secondary-700 rounded-md flex justify-between items-center">
                        <div>
                            <p className="font-semibold">{item.productName}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                <span className="font-mono">{item.displayId}</span> - {item.consumedWeight} kg
                            </p>
                        </div>
                        <Button onClick={() => onConfirm(item)} variant="secondary" className="text-xs">
                            Zwróć
                        </Button>
                    </div>
                ))
            ) : (
                <p className="text-center text-gray-500 dark:text-gray-400 italic py-4">Brak surowców do zwrotu w tej partii.</p>
            )}
        </div>

        <div className="flex justify-end pt-2 border-t dark:border-secondary-700">
            <Button type="button" onClick={onClose}>Zamknij</Button>
        </div>
      </div>
    </div>
  );
};

export default ReturnPsdConsumptionModal;