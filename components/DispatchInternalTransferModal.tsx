
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { InternalTransferOrder, RawMaterialLogEntry, FinishedGoodItem, View } from '../types';
import { useLogisticsContext } from './contexts/LogisticsContext';
import { useWarehouseContext } from './contexts/WarehouseContext';
import { useUIContext } from './contexts/UIContext';
import Button from './Button';
import Input from './Input';
import Alert from './Alert';
import XCircleIcon from './icons/XCircleIcon';
import QrCodeIcon from './icons/QrCodeIcon';
import TruckIcon from './icons/TruckIcon';
import CheckCircleIcon from './icons/CheckCircleIcon';
import ConfirmationModal from './ConfirmationModal';
import { getBlockInfo } from '../src/utils';

interface DispatchInternalTransferModalProps {
    isOpen: boolean;
    onClose: () => void;
    order: InternalTransferOrder | null;
}

const DispatchInternalTransferModal: React.FC<DispatchInternalTransferModalProps> = ({ isOpen, onClose, order }) => {
    const { handleDispatchInternalTransfer } = useLogisticsContext();
    const { findPalletByUniversalId } = useWarehouseContext();
    const { showToast, handleSetView } = useUIContext();

    const [scannedInput, setScannedInput] = useState('');
    const [pickedPalletIds, setPickedPalletIds] = useState<Set<string>>(new Set<string>());
    const [error, setError] = useState<string | null>(null);
    const [splitSuggestion, setSplitSuggestion] = useState<{ pallet: any; needed: number } | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // HOOKI MUSZĄ BYĆ ZADEKLAROWANE PRZED JAKIMKOLWIEK WARUNKOWYM RETURNEM
    const progressStats = useMemo(() => {
        const stats: Record<string, { requested: number, picked: number, unit: string }> = {};
        if (!order) return stats;
        
        (order.items || []).forEach(item => {
            stats[item.productName] = { requested: item.requestedQty, picked: 0, unit: item.unit };
        });

        [...pickedPalletIds].forEach(pId => {
            const palletInfo = findPalletByUniversalId(pId);
            if (palletInfo) {
                const name = palletInfo.type === 'raw' 
                    ? (palletInfo.item as RawMaterialLogEntry).palletData.nazwa 
                    : (palletInfo.item as FinishedGoodItem).productName;
                
                const weight = palletInfo.type === 'raw' 
                    ? (palletInfo.item as RawMaterialLogEntry).palletData.currentWeight 
                    : (palletInfo.item as FinishedGoodItem).quantityKg;

                if (stats[name]) {
                    stats[name].picked += weight;
                }
            }
        });

        return stats;
    }, [order, pickedPalletIds, findPalletByUniversalId]);

    const isComplete = useMemo(() => {
        if (!order) return false;
        const values = Object.values(progressStats) as { requested: number, picked: number, unit: string }[];
        if (values.length === 0) return false;
        return values.every(s => s.picked >= s.requested - 0.1);
    }, [progressStats, order]);

    useEffect(() => {
        if (isOpen) {
            setPickedPalletIds(new Set<string>());
            setScannedInput('');
            setError(null);
            setSplitSuggestion(null);
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen]);

    // WARUNKOWY RETURN DOPIERO PO WSZYSTKICH HOOKACH
    if (!isOpen || !order) return null;

    const handleScan = (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        const input = scannedInput.trim();
        if (!input) return;

        if (pickedPalletIds.has(input)) {
            setError('Ta paleta została już zeskanowana.');
            setScannedInput('');
            return;
        }

        const palletInfo = findPalletByUniversalId(input);
        if (!palletInfo) {
            setError(`Nie znaleziono palety o ID: ${input}`);
            setScannedInput('');
            return;
        }

        const { isBlocked, reason } = getBlockInfo(palletInfo.item);
        if (isBlocked) {
            setError(`Paleta ${input} jest zablokowana: ${reason}`);
            setScannedInput('');
            return;
        }

        const productName = palletInfo.type === 'raw' 
            ? (palletInfo.item as RawMaterialLogEntry).palletData.nazwa 
            : (palletInfo.item as FinishedGoodItem).productName;

        const stat = progressStats[productName];
        if (!stat) {
            setError(`Produkt "${productName}" nie widnieje na tym zleceniu transferu.`);
            setScannedInput('');
            return;
        }

        const palletWeight = palletInfo.type === 'raw' 
            ? (palletInfo.item as RawMaterialLogEntry).palletData.currentWeight 
            : (palletInfo.item as FinishedGoodItem).quantityKg;

        const remainingNeeded = stat.requested - stat.picked;

        // WERYFIKACJA WAGI: Jeśli paleta jest cięższa niż zapotrzebowanie (+1kg tolerancji)
        if (palletWeight > remainingNeeded + 1.0) {
            setSplitSuggestion({ pallet: palletInfo.item, needed: remainingNeeded });
            setScannedInput('');
            return;
        }

        setPickedPalletIds(prev => {
            const next = new Set<string>(prev);
            next.add(palletInfo.item.id);
            return next;
        });
        setScannedInput('');
        showToast(`Dodano paletę ${productName}`, 'success');
    };

    const handleConfirmDispatch = () => {
        if (!order) return;
        const result = handleDispatchInternalTransfer(order.id, [...pickedPalletIds]);
        if (result.success) {
            showToast(result.message, 'success');
            onClose();
        } else {
            setError(result.message);
        }
    };

    const goToSplit = () => {
        if (!splitSuggestion) return;
        handleSetView(View.SplitPallet, { 
            palletId: splitSuggestion.pallet.id, 
            suggestedWeight: splitSuggestion.needed.toFixed(2) 
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center p-4 z-[160]" onClick={onClose}>
            <div className="bg-white dark:bg-secondary-800 rounded-lg shadow-xl p-6 w-full max-w-3xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center pb-3 border-b dark:border-secondary-600 mb-4">
                    <h2 className="text-xl font-semibold text-primary-700 dark:text-primary-300 flex items-center gap-2">
                        <TruckIcon className="h-6 w-6" />
                        Załadunek Transferu: {order.id}
                    </h2>
                    <Button onClick={onClose} variant="secondary" className="p-1.5 -mr-1.5"><XCircleIcon className="h-5 w-5"/></Button>
                </div>

                <div className="flex flex-col gap-4 flex-grow overflow-hidden">
                    {error && <Alert type="error" message={error} />}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-3">
                            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest">Wymagane produkty</h3>
                            {(Object.entries(progressStats) as [string, { requested: number, picked: number, unit: string }][]).map(([name, stat]) => (
                                <div key={name} className="p-3 bg-slate-50 dark:bg-secondary-900 rounded-lg border dark:border-secondary-700">
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="font-semibold text-gray-700 dark:text-gray-300">{name}</span>
                                        <span className={`font-bold ${stat.picked >= stat.requested - 0.1 ? 'text-green-600' : 'text-primary-600'}`}>
                                            {stat.picked.toFixed(0)} / {stat.requested.toFixed(0)} {stat.unit}
                                        </span>
                                    </div>
                                    <div className="w-full bg-gray-200 dark:bg-secondary-700 rounded-full h-2">
                                        <div 
                                            className={`h-2 rounded-full transition-all duration-300 ${stat.picked >= stat.requested - 0.1 ? 'bg-green-500' : 'bg-primary-600'}`} 
                                            style={{ width: `${Math.min((stat.picked / (stat.requested || 1)) * 100, 100)}%` }}
                                        ></div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="flex flex-col gap-4">
                            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest">Skanuj wybrane palety</h3>
                            <form onSubmit={handleScan} className="flex gap-2">
                                <Input
                                    ref={inputRef}
                                    label=""
                                    placeholder="Zeskanuj paletę..."
                                    value={scannedInput}
                                    onChange={e => setScannedInput(e.target.value)}
                                    icon={<QrCodeIcon className="h-5 w-5 text-gray-400" />}
                                    autoFocus
                                    className="flex-grow"
                                />
                                <Button type="submit" disabled={!scannedInput}>Dodaj</Button>
                            </form>

                            <div className="flex-grow overflow-y-auto border dark:border-secondary-700 rounded-md p-2 bg-slate-50 dark:bg-secondary-900">
                                <h4 className="text-xs font-bold text-gray-400 mb-2">Zeskanowane jednostki ({pickedPalletIds.size}):</h4>
                                <ul className="space-y-1">
                                    {[...pickedPalletIds].map(pId => {
                                        const info = findPalletByUniversalId(pId);
                                        const displayId = info?.type === 'raw' 
                                            ? (info.item as RawMaterialLogEntry).palletData.nrPalety 
                                            : ((info?.item as FinishedGoodItem)?.displayId || pId);
                                        return (
                                            <li key={pId} className="text-xs flex justify-between items-center bg-white dark:bg-secondary-800 p-2 rounded shadow-sm border border-green-200 dark:border-green-900">
                                                <span className="font-mono text-gray-800 dark:text-gray-200">{displayId}</span>
                                                <button onClick={() => setPickedPalletIds(prev => {
                                                    const next = new Set<string>(prev);
                                                    next.delete(pId);
                                                    return next;
                                                })} className="text-red-500 hover:text-red-700 font-bold px-1">X</button>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="pt-4 border-t dark:border-secondary-700 flex justify-end gap-3 mt-4">
                    <Button onClick={onClose} variant="secondary">Anuluj</Button>
                    <Button 
                        onClick={handleConfirmDispatch} 
                        disabled={pickedPalletIds.size === 0} 
                        variant="primary"
                        className={isComplete ? 'bg-green-600 hover:bg-green-700' : ''}
                        leftIcon={<TruckIcon className="h-5 w-5"/>}
                    >
                        {isComplete ? 'Zakończ i Wyślij' : 'Wyślij Częściowo'}
                    </Button>
                </div>
            </div>
            {splitSuggestion && (
                <ConfirmationModal
                    isOpen={!!splitSuggestion}
                    onClose={() => setSplitSuggestion(null)}
                    onConfirm={goToSplit}
                    title="Wymagany podział palety"
                    message={
                        <span>
                            Paleta <strong>{splitSuggestion.pallet.palletData?.nrPalety || splitSuggestion.pallet.displayId}</strong> ma wagę przekraczającą pozostałe zapotrzebowanie.
                            <br/><br/>
                            Zapotrzebowanie: <strong>{splitSuggestion.needed.toFixed(2)} kg</strong>.
                            <br/>
                            Waga palety: <strong>{(splitSuggestion.pallet.palletData?.currentWeight || splitSuggestion.pallet.quantityKg).toFixed(2)} kg</strong>.
                            <br/><br/>
                            Czy chcesz przejść do ekranu podziału palety?
                        </span>
                    }
                    confirmButtonText="Tak, podziel paletę"
                    cancelButtonText="Anuluj"
                />
            )}
        </div>
    );
};

export default DispatchInternalTransferModal;
