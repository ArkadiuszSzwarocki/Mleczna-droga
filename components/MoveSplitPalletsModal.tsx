import React, { useState, useMemo } from 'react';
import { FinishedGoodItem } from '../types';
import { useAppContext } from './contexts/AppContext';
import { MGW01_WAREHOUSE_ID, MGW02_WAREHOUSE_ID } from '../constants';
import Button from './Button';
import Select from './Select';
import Alert from './Alert';
import XCircleIcon from './icons/XCircleIcon';
import ArrowRightIcon from './icons/ArrowRightIcon';

interface MoveSplitPalletsModalProps {
  isOpen: boolean;
  onClose: () => void;
  pallets: FinishedGoodItem[];
}

const MoveSplitPalletsModal: React.FC<MoveSplitPalletsModalProps> = ({ isOpen, onClose, pallets }) => {
    const { currentUser, handleMoveFinishedGood } = useAppContext();
    const [selectedPalletId, setSelectedPalletId] = useState<string>('');
    const [targetLocation, setTargetLocation] = useState(MGW01_WAREHOUSE_ID);
    const [error, setError] = useState<string | null>(null);

    const validPallets = useMemo(() => pallets.filter(p => p.quantityKg > 0.01), [pallets]);

    if (!isOpen) return null;

    const locationOptions = [
        { value: MGW01_WAREHOUSE_ID, label: `Magazyn ${MGW01_WAREHOUSE_ID}` },
        { value: MGW02_WAREHOUSE_ID, label: `Magazyn ${MGW02_WAREHOUSE_ID}` },
    ];

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!selectedPalletId) {
            setError("Wybierz paletę do przeniesienia.");
            return;
        }
        if (!currentUser) {
            setError("Brak zalogowanego użytkownika.");
            return;
        }
        const result = handleMoveFinishedGood(selectedPalletId, targetLocation, currentUser);
        if (result.success) {
            onClose();
        } else {
            setError(result.message);
        }
    };

    return (
        <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center p-4 z-[160]" onClick={onClose}>
            <div className="bg-white dark:bg-secondary-800 rounded-lg shadow-xl p-6 w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold text-primary-700 dark:text-primary-300 flex items-center gap-2">
                        <ArrowRightIcon className="h-6 w-6"/> Przenieś Paletę
                    </h2>
                    <Button onClick={onClose} variant="secondary" className="p-1.5 -mr-1.5"><XCircleIcon className="h-5 w-5"/></Button>
                </div>
                {error && <Alert type="error" message={error} />}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">1. Wybierz paletę do przeniesienia</label>
                        <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                            {validPallets.map(pallet => (
                                <label key={pallet.id} className={`flex items-center p-3 border rounded-lg cursor-pointer ${selectedPalletId === pallet.id ? 'bg-blue-50 border-blue-300 dark:bg-blue-900/40 dark:border-blue-700' : 'bg-white dark:bg-secondary-700 dark:border-secondary-600'}`}>
                                    <input type="radio" name="pallet-to-move" value={pallet.id} checked={selectedPalletId === pallet.id} onChange={(e) => setSelectedPalletId(e.target.value)} className="h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500" />
                                    <span className="ml-3 text-sm flex-grow">
                                        <p className="font-semibold text-gray-900 dark:text-gray-100">{pallet.productName}</p>
                                        <p className="font-mono text-xs text-gray-500 dark:text-gray-400">ID: {pallet.displayId}</p>
                                        <p className="font-mono text-xs text-gray-500 dark:text-gray-400">Waga: {pallet.quantityKg.toFixed(2)} kg</p>
                                    </span>
                                </label>
                            ))}
                        </div>
                    </div>
                    <Select
                        label="2. Wybierz docelowy magazyn"
                        id="target-location-move-split"
                        options={locationOptions}
                        value={targetLocation}
                        onChange={e => setTargetLocation(e.target.value)}
                        required
                    />
                    <div className="flex justify-end space-x-2 pt-2">
                        <Button type="button" variant="secondary" onClick={onClose}>Anuluj</Button>
                        <Button type="submit" variant="primary" disabled={!selectedPalletId}>Przenieś</Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default MoveSplitPalletsModal;
