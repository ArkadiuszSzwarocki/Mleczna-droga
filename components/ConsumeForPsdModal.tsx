
import React, { useState, useEffect, useRef } from 'react';
import { RawMaterialLogEntry, PsdBatch } from '../types';
import Button from './Button';
import Input from './Input';
import Alert from './Alert';
import XCircleIcon from './icons/XCircleIcon';
import QrCodeIcon from './icons/QrCodeIcon';
// FIX: Corrected import path for WarehouseContext to be relative.
import { useWarehouseContext } from './contexts/WarehouseContext';

interface ConsumeForPsdModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (pallet: RawMaterialLogEntry, weightToConsume: number) => { success: boolean, message: string };
  rawMaterialsLogList: RawMaterialLogEntry[];
  batch: PsdBatch;
  preScannedPallet?: RawMaterialLogEntry | null;
  requiredQuantity?: number | null;
}

const ConsumeForPsdModal: React.FC<ConsumeForPsdModalProps> = ({ isOpen, onClose, onConfirm, rawMaterialsLogList, batch, preScannedPallet, requiredQuantity }) => {
    const { findPalletByUniversalId } = useWarehouseContext();
    const [scannedId, setScannedId] = useState('');
    const [weight, setWeight] = useState('');
    const [foundPallet, setFoundPallet] = useState<RawMaterialLogEntry | null>(null);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    
    const scanInputRef = useRef<HTMLInputElement>(null);
    const weightInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            setFeedback(null);
            setIsLoading(false);
            setWeight(''); // Always start empty

            if (preScannedPallet) {
                // Workflow for quick scan from parent
                setFoundPallet(preScannedPallet);
                setScannedId(preScannedPallet.palletData.nrPalety);
                
                // NOTE: Auto-fill logic removed per request. 
                // The operator must type the value manually.
                
                // Focus weight input immediately
                setTimeout(() => weightInputRef.current?.focus(), 100);
            } else {
                // Standard workflow
                setScannedId('');
                setFoundPallet(null);
                // Focus scan input
                setTimeout(() => scanInputRef.current?.focus(), 100);
            }
        }
    }, [isOpen, preScannedPallet]);

    const handleScan = () => {
        setFeedback(null);
        const result = findPalletByUniversalId(scannedId.trim());

        if (result && result.type === 'raw') {
            const pallet = result.item as RawMaterialLogEntry;
            setFoundPallet(pallet);
            setWeight(''); // Clear weight for new pallet
            setTimeout(() => weightInputRef.current?.focus(), 100);
        } else {
            setFoundPallet(null);
            setFeedback({ type: 'error', message: `Nie znaleziono palety surowca o ID: ${scannedId}` });
            scanInputRef.current?.focus();
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setFeedback(null);
        const weightToConsume = parseFloat(weight);

        if (!foundPallet) {
            setFeedback({ type: 'error', message: "Najpierw znajdź paletę." });
            return;
        }
        if (isNaN(weightToConsume) || weightToConsume <= 0) {
            setFeedback({ type: 'error', message: "Wprowadź prawidłową wagę." });
            return;
        }
        if (weightToConsume > foundPallet.palletData.currentWeight + 0.001) { // tolerance
            setFeedback({ type: 'error', message: `Waga do zużycia (${weightToConsume} kg) nie może być większa niż dostępna waga na palecie (${foundPallet.palletData.currentWeight.toFixed(2)} kg).` });
            return;
        }
        
        // Tolerance Check
        if (requiredQuantity) {
             const min = requiredQuantity * 0.95;
             const max = requiredQuantity * 1.05;
             if (weightToConsume < min || weightToConsume > max) {
                 setFeedback({ type: 'error', message: `Błąd tolerancji: Wymagana waga to ${requiredQuantity.toFixed(2)} kg. Wprowadzona wartość musi mieścić się w przedziale ${min.toFixed(2)} - ${max.toFixed(2)} kg (+/- 5%).` });
                 return;
             }
        }

        setIsLoading(true);
        const result = onConfirm(foundPallet, weightToConsume);
        
        if (result.success) {
            setFeedback({ type: 'success', message: result.message });
            setTimeout(() => {
                onClose();
            }, 1500);
        } else {
            setFeedback({ type: 'error', message: result.message });
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-[150]" onClick={onClose}>
            {/* Added flex-col and max-h to container for sticky footer layout */}
            <div className="bg-white dark:bg-secondary-800 rounded-lg shadow-xl w-full max-w-md max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                
                {/* Header - Fixed */}
                <div className="flex justify-between items-center p-4 border-b dark:border-secondary-700 flex-shrink-0">
                    <h2 className="text-lg md:text-xl font-semibold text-primary-700 dark:text-primary-300 truncate pr-2">
                        Zużyj Surowiec: Partia #{batch.batchNumber}
                    </h2>
                    <Button onClick={onClose} variant="secondary" className="p-1.5 -mr-1.5 flex-shrink-0"><XCircleIcon className="h-5 w-5"/></Button>
                </div>

                {/* Content - Scrollable */}
                <div className="flex-grow overflow-y-auto p-4">
                    {feedback && <div className="mb-4"><Alert type={feedback.type} message={feedback.message} /></div>}

                    <form id="consume-form" onSubmit={handleSubmit} className="space-y-4">
                        <div className="flex items-end gap-2">
                            <Input
                                ref={scanInputRef}
                                label="ID Palety Surowca"
                                id="psd-consume-scan"
                                value={scannedId}
                                onChange={e => setScannedId(e.target.value)}
                                icon={<QrCodeIcon className="h-5 w-5 text-gray-400"/>}
                                disabled={!!foundPallet || isLoading}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleScan();
                                    }
                                }}
                                className="text-sm" // Smaller text on mobile
                            />
                            <Button type="button" onClick={handleScan} disabled={!!foundPallet || !scannedId || isLoading}>Znajdź</Button>
                        </div>

                        {foundPallet && (
                            <div className="p-3 bg-blue-50 dark:bg-blue-900/40 rounded border border-blue-200 dark:border-blue-700 text-sm animate-fadeIn">
                                <div className="mb-2">
                                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold">Produkt</p>
                                    <p className="font-medium text-gray-900 dark:text-gray-100">{foundPallet.palletData.nazwa}</p>
                                </div>
                                <div className="mb-3">
                                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold">Dostępna waga</p>
                                    <p className="font-medium text-gray-900 dark:text-gray-100">{foundPallet.palletData.currentWeight.toFixed(2)} kg</p>
                                </div>
                                
                                {requiredQuantity !== undefined && requiredQuantity !== null && requiredQuantity > 0 && (
                                    <p className="mb-3 text-sm font-bold text-primary-600 dark:text-primary-400 border-t border-blue-200 dark:border-blue-700 pt-2">
                                        Oczekiwana ilość do partii: {requiredQuantity.toFixed(2)} kg
                                    </p>
                                )}
                                
                                <Input
                                    ref={weightInputRef}
                                    label="Waga do zużycia (kg)"
                                    id="psd-consume-weight"
                                    type="number"
                                    value={weight}
                                    onChange={e => setWeight(e.target.value)}
                                    min="0.01"
                                    max={foundPallet.palletData.currentWeight.toFixed(2)}
                                    step="0.01"
                                    required
                                    disabled={isLoading}
                                    autoComplete="off"
                                    className="text-lg font-bold"
                                />
                            </div>
                        )}
                    </form>
                </div>

                {/* Footer - Fixed */}
                <div className="flex justify-end space-x-3 p-4 border-t dark:border-secondary-700 bg-gray-50 dark:bg-secondary-800/50 flex-shrink-0 rounded-b-lg">
                    <Button 
                        type="button" 
                        variant="secondary" 
                        onClick={() => { 
                            setFoundPallet(null); 
                            setScannedId(''); 
                            setFeedback(null); 
                            setTimeout(() => scanInputRef.current?.focus(), 100); 
                        }} 
                        disabled={isLoading}
                    >
                        Wyczyść
                    </Button>
                    <Button 
                        type="submit" 
                        form="consume-form" // Connect button to form
                        variant="primary" 
                        disabled={!foundPallet || isLoading}
                        className="min-w-[100px]"
                    >
                        {isLoading ? 'Zapis...' : 'Zatwierdź'}
                    </Button>
                </div>

            </div>
        </div>
    );
};

export default ConsumeForPsdModal;
