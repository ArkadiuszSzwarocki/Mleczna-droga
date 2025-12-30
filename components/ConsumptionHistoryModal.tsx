
import React, { useMemo, useState } from 'react';
import { ProductionRun, AgroConsumedMaterial } from '../types';
import { useAppContext } from './contexts/AppContext';
import Button from './Button';
import XCircleIcon from './icons/XCircleIcon';
import { formatDate } from '../src/utils';
import ConfirmationModal from './ConfirmationModal';
import ArrowUturnLeftIcon from './icons/ArrowUturnLeftIcon';
import Alert from './Alert';
import LockClosedIcon from './icons/LockClosedIcon';

interface ConsumptionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  run: ProductionRun | null;
  batchId: string | null;
  productName: string | null;
  isWeighingFinished?: boolean;
}

const ConsumptionHistoryModal: React.FC<ConsumptionHistoryModalProps> = ({ isOpen, onClose, run, batchId, productName, isWeighingFinished }) => {
    const { handleAnnulAgroConsumption } = useAppContext();
    const [consumptionToAnnul, setConsumptionToAnnul] = useState<AgroConsumedMaterial | null>(null);

    const consumptions = useMemo(() => {
        if (!run || !batchId || !productName) return [];
        return (run.actualIngredientsUsed || [])
            .filter(c => c.batchId === batchId && c.productName === productName)
            .sort((a, b) => {
                const timeA = a.consumptionId ? parseInt(a.consumptionId.split('cons-')[1], 10) : 0;
                const timeB = b.consumptionId ? parseInt(b.consumptionId.split('cons-')[1], 10) : 0;
                return timeB - timeA;
            });
    }, [run, batchId, productName]);

    if (!isOpen || !run) return null;

    const handleConfirmAnnul = () => {
        if (consumptionToAnnul) {
            handleAnnulAgroConsumption(run.id, consumptionToAnnul.consumptionId);
            setConsumptionToAnnul(null);
            onClose(); // Close the history modal after annulment
        }
    };

    return (
        <>
            <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-[160]" onClick={onClose}>
                <div className="bg-white dark:bg-secondary-800 rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                    <div className="flex justify-between items-center pb-3 border-b dark:border-secondary-600 mb-4">
                        <h2 className="text-xl font-semibold text-primary-700 dark:text-primary-300">Historia Zużycia: {productName}</h2>
                        <Button onClick={onClose} variant="secondary" className="p-1.5 -mr-1.5"><XCircleIcon className="h-5 w-5"/></Button>
                    </div>
                    
                    {isWeighingFinished && (
                        <Alert 
                            type="info" 
                            message="Naważanie zakończone" 
                            details="Edycja (anulowanie) wpisów jest zablokowana, ponieważ proces naważania dla tego składnika został zatwierdzony." 
                        />
                    )}

                    <div className="flex-grow overflow-y-auto pr-2 mt-2">
                        {consumptions.length === 0 ? (
                            <p className="text-center text-gray-500">Brak historii zużycia dla tego składnika w tej partii.</p>
                        ) : (
                            <table className="min-w-full text-sm">
                                <thead className="bg-slate-100 dark:bg-secondary-700">
                                    <tr>
                                        <th className="p-2 text-left">Czas</th>
                                        <th className="p-2 text-right">Ilość (kg)</th>
                                        <th className="p-2 text-left">Z Palety</th>
                                        <th className="p-2 text-center">Status</th>
                                        <th className="p-2 text-right">Akcja</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y dark:divide-secondary-700">
                                    {consumptions.map(c => (
                                        <tr key={c.consumptionId} className={c.isAnnulled ? 'bg-red-50 dark:bg-red-900/40 opacity-60' : ''}>
                                            <td className="p-2 whitespace-nowrap">{formatDate(new Date(Number(c.consumptionId.split('cons-')[1])).toISOString(), true)}</td>
                                            <td className="p-2 text-right font-semibold">{c.actualConsumedQuantityKg.toFixed(3)}</td>
                                            <td className="p-2 font-mono">{c.actualSourcePalletId}</td>
                                            <td className="p-2 text-center">{c.isAnnulled ? 'Anulowano' : 'Zatwierdzono'}</td>
                                            <td className="p-2 text-right">
                                                {!c.isAnnulled && (
                                                    isWeighingFinished ? (
                                                        <span className="text-gray-400 cursor-not-allowed" title="Edycja zablokowana"><LockClosedIcon className="h-4 w-4"/></span>
                                                    ) : (
                                                        <Button onClick={() => setConsumptionToAnnul(c)} variant="secondary" className="text-xs" leftIcon={<ArrowUturnLeftIcon className="h-4 w-4"/>}>
                                                            Anuluj
                                                        </Button>
                                                    )
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                    
                    <div className="pt-4 border-t dark:border-secondary-700 flex justify-end mt-4">
                        <Button onClick={onClose}>Zamknij</Button>
                    </div>
                </div>
            </div>

            {consumptionToAnnul && (
                <ConfirmationModal
                    isOpen={!!consumptionToAnnul}
                    onClose={() => setConsumptionToAnnul(null)}
                    onConfirm={handleConfirmAnnul}
                    title="Potwierdź Anulowanie Zużycia"
                    message={`Czy na pewno chcesz anulować zużycie ${consumptionToAnnul.actualConsumedQuantityKg.toFixed(3)} kg surowca ${consumptionToAnnul.productName}? Ta operacja zwróci surowiec na paletę źródłową.`}
                    confirmButtonText="Tak, anuluj"
                />
            )}
        </>
    );
};

export default ConsumptionHistoryModal;
