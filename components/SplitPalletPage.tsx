import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { FinishedGoodItem, View } from '../types';
import { useAppContext } from './contexts/AppContext';
import { useAuth } from './contexts/AuthContext';
import Button from './Button';
import Input from './Input';
import Alert from './Alert';
import ScissorsIcon from './icons/ScissorsIcon';
import PlusIcon from './icons/PlusIcon';
import TrashIcon from './icons/TrashIcon';
import { formatDate } from '../src/utils';
import ConfirmationModal from './ConfirmationModal';
import MoveSplitPalletsModal from './MoveSplitPalletsModal';
import { useUIContext } from './contexts/UIContext';

interface NewWeightEntry {
    id: string;
    weight: string;
}

export const SplitPalletPage: React.FC = () => {
    const { finishedGoodsList, handleSplitPallet, viewParams, handleSetView } = useAppContext();
    const { modalHandlers, addRecentlySplitPalletIds } = useUIContext();
    const { currentUser } = useAuth();

    const [sourcePalletIdInput, setSourcePalletIdInput] = useState('');
    const [sourcePallet, setSourcePallet] = useState<FinishedGoodItem | null>(null);
    const [newWeights, setNewWeights] = useState<NewWeightEntry[]>([{ id: `w-${Date.now()}`, weight: '' }]);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [splitResult, setSplitResult] = useState<{ newPallets: FinishedGoodItem[], updatedSourcePallet: FinishedGoodItem } | null>(null);
    const [showMovePrompt, setShowMovePrompt] = useState(false);
    const [showMoveModal, setShowMoveModal] = useState(false);

    const resetState = useCallback(() => {
        setSourcePalletIdInput('');
        setSourcePallet(null);
        setNewWeights([{ id: `w-${Date.now()}`, weight: '' }]);
        setFeedback(null);
        setIsLoading(false);
        setSplitResult(null);
        setShowMovePrompt(false);
        setShowMoveModal(false);
        handleSetView(View.SplitPallet, null);
    }, [handleSetView]);

    const findAndSetPallet = useCallback((palletId: string) => {
        setFeedback(null);
        if (!palletId) return;

        const found = (finishedGoodsList || []).find(p => p && (p.id === palletId || p.finishedGoodPalletId === palletId));
        
        if (!found) {
            setFeedback({ type: 'error', message: `Nie znaleziono palety wyrobu gotowego o ID: ${palletId}` });
            setSourcePallet(null);
        } else if (found.quantityKg <= 0) {
            setFeedback({ type: 'error', message: `Paleta ${palletId} ma zerową wagę i nie może być podzielona.` });
            setSourcePallet(null);
        } else {
            setSourcePallet(found);
            setSourcePalletIdInput(found.id);
        }
    }, [finishedGoodsList]);

    useEffect(() => {
        if (viewParams?.palletId && !sourcePallet) {
            findAndSetPallet(viewParams.palletId);
        }
    }, [viewParams, findAndSetPallet, sourcePallet]);

    useEffect(() => {
        if (sourcePallet && viewParams?.suggestedWeight && newWeights.length === 1 && newWeights[0].weight === '') {
            const weightStr = String(viewParams.suggestedWeight);
            setNewWeights([{ id: `w-${Date.now()}`, weight: weightStr }]);
        }
    }, [sourcePallet, viewParams, newWeights]);

    const handleAddWeight = () => {
        setNewWeights([...newWeights, { id: `w-${Date.now()}`, weight: '' }]);
    };

    const handleRemoveWeight = (id: string) => {
        if(newWeights.length > 1) {
            setNewWeights(newWeights.filter(w => w.id !== id));
        }
    };

    const handleWeightChange = (id: string, value: string) => {
        setNewWeights(newWeights.map(w => w.id === id ? { ...w, weight: value } : w));
    };

    const { totalNewWeight, remainingWeight, isValid } = useMemo(() => {
        if (!sourcePallet) return { totalNewWeight: 0, remainingWeight: 0, isValid: false };

        const total = newWeights.reduce((sum, entry) => sum + (parseFloat(entry.weight) || 0), 0);
        const remaining = sourcePallet.quantityKg - total;
        
        const valid = total > 0 && remaining >= -0.001; 
        return { totalNewWeight: total, remainingWeight: remaining, isValid: valid };
    }, [newWeights, sourcePallet]);

    const handleSubmit = async () => {
        if (!sourcePallet || !isValid) {
            setFeedback({ type: 'error', message: 'Sprawdź wprowadzone dane. Suma wag nowych palet jest nieprawidłowa.' });
            return;
        }
        if (!currentUser) {
            setFeedback({ type: 'error', message: 'Błąd sesji. Zaloguj się ponownie, aby wykonać podział.' });
            return;
        }
        setIsLoading(true);
        setFeedback(null);
        
        const weights = newWeights.map(w => parseFloat(w.weight)).filter(w => w > 0);
        const result = handleSplitPallet(sourcePallet.id, weights);

        if (result.success && result.newPallets && result.updatedSourcePallet) {
            setSplitResult({ newPallets: result.newPallets, updatedSourcePallet: result.updatedSourcePallet });
            addRecentlySplitPalletIds(result.newPallets.map(p => p.id));
        } else {
            setFeedback({ type: 'error', message: result.message });
        }
        setIsLoading(false);
    };

    if (splitResult) {
        return (
            <div className="p-4 md:p-6 bg-slate-50 dark:bg-secondary-900/50 h-full flex items-center justify-center">
                <div className="max-w-xl w-full text-center bg-white dark:bg-secondary-800 p-8 rounded-lg shadow-2xl">
                    <h2 className="text-2xl font-bold text-green-600 dark:text-green-400">Podział zakończony pomyślnie</h2>
                    <p className="mt-2 text-gray-600 dark:text-gray-300">
                        Utworzono {splitResult.newPallets.length} nowych palet.
                    </p>
                    <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
                        <Button onClick={() => modalHandlers.openNetworkPrintModal({ type: 'finished_good_batch', data: [...splitResult.newPallets, splitResult.updatedSourcePallet].filter(p => p.quantityKg > 0.01), onSuccess: resetState })}>Drukuj Etykiety</Button>
                        <Button onClick={resetState} variant="secondary">Zakończ</Button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-6 bg-slate-50 dark:bg-secondary-900/50 h-full">
            <div className="max-w-4xl mx-auto">
                <header className="flex items-center mb-6">
                    <ScissorsIcon className="h-8 w-8 text-primary-600 dark:text-primary-400 mr-3" />
                    <h2 className="text-2xl font-semibold text-primary-700 dark:text-primary-300">Podziel Paletę Wyrobu Gotowego</h2>
                </header>
                {feedback && <div className="mb-4"><Alert type={feedback.type} message={feedback.message} /></div>}
                <div className="bg-white dark:bg-secondary-800 p-4 rounded-lg shadow-md mb-6 space-y-4">
                    <h3 className="text-lg font-semibold border-b pb-2 dark:border-secondary-700">1. Paleta Źródłowa (WG)</h3>
                    <div className="flex items-end gap-2">
                        <Input label="ID palety" id="source-pallet-id" value={sourcePalletIdInput} onChange={e => setSourcePalletIdInput(e.target.value)} disabled={!!sourcePallet} />
                        <Button onClick={() => findAndSetPallet(sourcePalletIdInput)} disabled={!!sourcePallet}>Znajdź</Button>
                        {sourcePallet && <Button onClick={() => { setSourcePallet(null); setSourcePalletIdInput(''); }} variant="secondary">Zmień</Button>}
                    </div>
                    {sourcePallet && (
                        <div className="p-4 bg-blue-50 dark:bg-blue-900/40 rounded border border-blue-200 dark:border-blue-700">
                            <p className="text-xl font-bold text-blue-800 dark:text-blue-200">{sourcePallet.productName}</p>
                            <p className="text-4xl font-mono text-gray-800 dark:text-gray-200">{sourcePallet.displayId || sourcePallet.id}</p>
                        </div>
                    )}
                </div>
                {sourcePallet && (
                    <div className="bg-white dark:bg-secondary-800 p-4 rounded-lg shadow-md mb-6 space-y-4">
                        <h3 className="text-lg font-semibold border-b pb-2 dark:border-secondary-700">2. Nowe Palety</h3>
                        {newWeights.map((entry, index) => (
                            <div key={entry.id} className="flex items-end gap-2">
                                <Input label={`Waga palety #${index + 1} (kg)`} id={`new-weight-${entry.id}`} type="number" value={entry.weight} onChange={e => handleWeightChange(entry.id, e.target.value)} />
                                <Button onClick={() => handleRemoveWeight(entry.id)} variant="secondary" className="p-2 mb-1" disabled={newWeights.length <= 1}><TrashIcon className="h-5 w-5 text-red-500"/></Button>
                            </div>
                        ))}
                        <Button onClick={handleAddWeight} variant="secondary" leftIcon={<PlusIcon className="h-5 w-5"/>}>Dodaj kolejną</Button>
                        <div className="pt-4 border-t flex justify-between items-center">
                             <div className="text-sm">Pozostanie: <strong>{remainingWeight.toFixed(2)} kg</strong></div>
                             <Button onClick={handleSubmit} disabled={!isValid || isLoading}>Wykonaj Podział</Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SplitPalletPage;