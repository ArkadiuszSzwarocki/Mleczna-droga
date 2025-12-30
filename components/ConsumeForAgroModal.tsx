import React, { useState, useEffect, useRef } from 'react';
import { RawMaterialLogEntry } from '../types';
import Button from './Button';
import Input from './Input';
import Alert from './Alert';
import XCircleIcon from './icons/XCircleIcon';
import QrCodeIcon from './icons/QrCodeIcon';
import { useAppContext } from './contexts/AppContext';

interface ConsumeForAgroModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (pallet: RawMaterialLogEntry, weightToConsume: number) => { success: boolean, message: string };
  ingredientName: string;
}

const ConsumeForAgroModal: React.FC<ConsumeForAgroModalProps> = ({ isOpen, onClose, onConfirm, ingredientName }) => {
    const { findPalletByUniversalId } = useAppContext();
    const [scannedId, setScannedId] = useState('');
    const [weight, setWeight] = useState('');
    const [foundPallet, setFoundPallet] = useState<RawMaterialLogEntry | null>(null);
    const [error, setError] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            setScannedId('');
            setWeight('');
            setFoundPallet(null);
            setError(null);
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen]);

    const handleScan = () => {
        setError(null);
        const result = findPalletByUniversalId(scannedId.trim());

        if (result && result.type === 'raw') {
            const pallet = result.item as RawMaterialLogEntry;
            if (pallet.palletData.nazwa !== ingredientName) {
                setError(`Nieprawidłowy surowiec. Oczekiwano: ${ingredientName}, zeskanowano: ${pallet.palletData.nazwa}.`);
                setFoundPallet(null);
            } else {
                setFoundPallet(pallet);
                setWeight(String(pallet.palletData.currentWeight ?? ''));
            }
        } else {
            setFoundPallet(null);
            setError(`Nie znaleziono palety surowca o ID: ${scannedId}`);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        const weightToConsume = parseFloat(weight);

        if (!foundPallet) {
            setError("Najpierw znajdź paletę.");
            return;
        }
        if (isNaN(weightToConsume) || weightToConsume <= 0) {
            setError("Wprowadź prawidłową wagę.");
            return;
        }
        if (weightToConsume > foundPallet.palletData.currentWeight + 0.001) {
            setError(`Waga do zużycia (${weightToConsume} kg) nie może być większa niż dostępna waga na palecie (${foundPallet.palletData.currentWeight.toFixed(2)} kg).`);
            return;
        }

        const result = onConfirm(foundPallet, weightToConsume);
        if (result.success) {
            onClose();
        } else {
            setError(result.message);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-[150]" onClick={onClose}>
            <div className="bg-white dark:bg-secondary-800 rounded-lg shadow-xl p-6 w-full max-w-md space-y-4" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-semibold text-primary-700 dark:text-primary-300">Zużyj: {ingredientName}</h2>
                    <Button onClick={onClose} variant="secondary" className="p-1.5 -mr-1.5"><XCircleIcon className="h-5 w-5"/></Button>
                </div>

                {error && <Alert type="error" message={error} />}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="flex items-end gap-2">
                        <Input
                            ref={inputRef}
                            label="ID Palety Surowca"
                            id="agro-consume-scan"
                            value={scannedId}
                            onChange={e => setScannedId(e.target.value)}
                            icon={<QrCodeIcon className="h-5 w-5 text-gray-400"/>}
                            disabled={!!foundPallet}
                        />
                        <Button type="button" onClick={handleScan} disabled={!!foundPallet || !scannedId}>Znajdź</Button>
                    </div>

                    {foundPallet && (
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/40 rounded border border-blue-200 dark:border-blue-700 text-sm animate-fadeIn">
                            <p><strong>Dostępna waga:</strong> {foundPallet.palletData.currentWeight.toFixed(2)} kg</p>
                            <Input
                                label="Waga do zużycia (kg)"
                                id="agro-consume-weight"
                                type="number"
                                value={weight}
                                onChange={e => setWeight(e.target.value)}
                                min="0.01"
                                max={foundPallet.palletData.currentWeight.toFixed(2)}
                                step="0.01"
                                required
                                autoFocus
                                className="mt-2"
                            />
                        </div>
                    )}

                    <div className="flex justify-end space-x-3 pt-2 border-t dark:border-secondary-700">
                        <Button type="button" variant="secondary" onClick={() => { setFoundPallet(null); setScannedId(''); setError(null); }}>Anuluj</Button>
                        <Button type="submit" variant="primary" disabled={!foundPallet}>Zatwierdź Zużycie</Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ConsumeForAgroModal;
