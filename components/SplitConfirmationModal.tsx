
import React from 'react';
import Button from './Button';
import XCircleIcon from './icons/XCircleIcon';
import Alert from './Alert';
import { formatProductionTime } from '../src/utils';

const SplitConfirmationModal: React.FC<any> = ({ isOpen, onClose, onConfirm, recipeName, originalBatchSize, numParts, partsDetails }) => {
    if (!isOpen) return null;
    
    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-[1060]">
            <div className="bg-white dark:bg-secondary-800 rounded-lg shadow-xl p-6 w-full max-w-lg space-y-4" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-semibold text-primary-700 dark:text-primary-300">Podzielić Zlecenie?</h2>
                    <Button onClick={onClose} variant="secondary" className="p-1.5 -mr-1.5"><XCircleIcon className="h-5 w-5"/></Button>
                </div>
                <Alert
                    type="warning"
                    message="Zlecenie przekracza dostępny czas."
                    details={`Zlecenie na ${originalBatchSize}kg ${recipeName} nie zmieści się w dostępnym czasie produkcyjnym na wybrany dzień.`}
                />
                <div>
                    <p className="text-sm text-gray-700 dark:text-gray-300">System proponuje podział zlecenia na <strong>{numParts} części</strong>:</p>
                    <ul className="mt-2 space-y-1 text-xs list-disc list-inside">
                        {(partsDetails || []).map((part: any, index: number) => (
                            <li key={index}>
                                <strong>Część {index + 1}:</strong> {part.batchSize} kg na {part.date} (szac. {formatProductionTime(part.productionTimeMinutes)})
                            </li>
                        ))}
                    </ul>
                </div>
                <div className="flex justify-end space-x-2 pt-2">
                    <Button type="button" variant="secondary" onClick={onClose}>Anuluj</Button>
                    <Button type="button" variant="primary" onClick={onConfirm}>Potwierdź Podział</Button>
                </div>
            </div>
        </div>
    );
};

export default SplitConfirmationModal;
