
import React, { useState, useMemo, useEffect } from 'react';
import { useUIContext } from './contexts/UIContext';
import { useLogisticsContext } from './contexts/LogisticsContext';
import { DispatchOrder, FinishedGoodItem } from '../types';
import Button from './Button';
import Input from './Input';
import Alert from './Alert';
import ArrowLeftIcon from './icons/ArrowLeftIcon';
import QrCodeIcon from './icons/QrCodeIcon';
import TruckIcon from './icons/TruckIcon';
import CheckCircleIcon from './icons/CheckCircleIcon';
import { View } from '../types';
import { useAppContext } from './contexts/AppContext';
import { formatDate, getBlockInfo } from '../src/utils';
import ConfirmationModal from './ConfirmationModal';

const DispatchFulfillmentPage: React.FC = () => {
    const { viewParams, handleSetView } = useUIContext();
    const { dispatchOrders, handleFulfillDispatchItem, handleCompleteDispatchOrder } = useLogisticsContext();
    const { finishedGoodsList } = useAppContext();

    const [order, setOrder] = useState<DispatchOrder | null>(null);
    const [scannedValue, setScannedValue] = useState('');
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [splitSuggestion, setSplitSuggestion] = useState<{ palletToSplit: FinishedGoodItem; neededWeight: number } | null>(null);

    useEffect(() => {
        const orderId = viewParams?.orderId;
        const foundOrder = (dispatchOrders || []).find(o => o.id === orderId);
        setOrder(foundOrder || null);
    }, [viewParams, dispatchOrders]);

    const isFulfillmentComplete = useMemo(() => 
        order && order.items.every(item => item.fulfilledWeightKg >= item.requestedWeightKg),
    [order]);

    const fefoSuggestions = useMemo(() => {
        if (!order) return [];
        const allFulfilledPalletIds = new Set(order.items.flatMap(item => item.fulfilledPallets.map(p => p.palletId)));
        
        const suggestions = order.items
            .filter(item => item.fulfilledWeightKg < item.requestedWeightKg)
            .map(item => {
                const availablePallets = (finishedGoodsList || [])
                    .filter(p => 
                        p.productName === item.productName && 
                        p.status === 'available' && 
                        !getBlockInfo(p).isBlocked &&
                        !allFulfilledPalletIds.has(p.id)
                    )
                    .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());
                
                return {
                    itemId: item.id,
                    productName: item.productName,
                    suggestion: availablePallets[0]
                };
            })
            .filter(s => s.suggestion);
        return suggestions;
    }, [order, finishedGoodsList]);

    const handleScanSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!order || !scannedValue.trim() || isLoading) return;
        
        setIsLoading(true);
        setFeedback(null);
        setSplitSuggestion(null);
        
        // Simulate network delay
        setTimeout(() => {
            const result = handleFulfillDispatchItem(order.id, scannedValue.trim());
            
            if (result.action === 'SPLIT_SUGGESTED' && result.splitDetails) {
                setSplitSuggestion(result.splitDetails);
            } else {
                setFeedback({ type: result.success ? 'success' : 'error', message: result.message });
            }

            setScannedValue('');
            setIsLoading(false);
        }, 300);
    };

    const handleCompleteFulfillment = () => {
        if (!order) return;
        const result = handleCompleteDispatchOrder(order.id);
        if (result.success) {
            handleSetView(View.Logistics);
        } else {
            setFeedback({ type: 'error', message: result.message });
        }
    };

    if (!order) {
        return <div className="p-4"><Alert type="error" message="Nie można załadować zlecenia." /></div>;
    }

    return (
        <>
            <div className="p-4 md:p-6 bg-slate-50 dark:bg-secondary-900 h-full flex flex-col">
                <header className="flex-shrink-0 flex items-center gap-3 mb-4 pb-3 border-b dark:border-secondary-700">
                    <Button onClick={() => handleSetView(View.Logistics)} variant="secondary" className="p-2">
                        <ArrowLeftIcon className="h-5 w-5"/>
                    </Button>
                    <div>
                        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">Realizacja Wydania: <span className="text-primary-600 dark:text-primary-400">{order.recipient}</span></h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">{order.id}</p>
                    </div>
                </header>
                
                <div className="flex-grow grid grid-cols-1 lg:grid-cols-2 gap-6 overflow-hidden">
                    <div className="p-4 bg-white dark:bg-secondary-800 rounded-lg shadow-md flex flex-col">
                        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                            <TruckIcon className="h-6 w-6 text-primary-500"/> Postęp Załadunku
                        </h3>
                        <div className="flex-grow overflow-y-auto pr-2 space-y-4 scrollbar-hide">
                            {order.items.map(item => {
                                const progress = item.requestedWeightKg > 0 ? Math.min((item.fulfilledWeightKg / item.requestedWeightKg) * 100, 100) : 0;
                                const isComplete = item.fulfilledWeightKg >= item.requestedWeightKg;
                                return (
                                    <div key={item.id} className="p-3 bg-slate-50 dark:bg-secondary-900/70 rounded-md">
                                        <div className="flex justify-between items-baseline mb-1">
                                            <p className="font-semibold text-gray-800 dark:text-gray-200">{item.productName}</p>
                                            {isComplete && <CheckCircleIcon className="h-5 w-5 text-green-500"/>}
                                        </div>
                                        <div className="w-full bg-gray-200 dark:bg-secondary-700 rounded-full h-2.5 mb-2">
                                            <div className="bg-primary-600 h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
                                        </div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 text-right">
                                            {item.fulfilledWeightKg.toFixed(2)} / {item.requestedWeightKg.toFixed(2)} kg
                                        </p>
                                        {item.fulfilledPallets.length > 0 && (
                                            <div className="mt-2 pt-2 border-t dark:border-secondary-700">
                                                <ul className="text-xs space-y-1">
                                                    {item.fulfilledPallets.map(p => (
                                                        <li key={p.palletId} className="flex justify-between items-center">
                                                            <span className="font-mono">{p.displayId}</span>
                                                            <span>{p.weight.toFixed(2)} kg</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="p-4 bg-white dark:bg-secondary-800 rounded-lg shadow-md space-y-4">
                        <div>
                            <h3 className="text-lg font-semibold mb-3">Skanuj Paletę</h3>
                            {feedback && <div className="mb-4"><Alert type={feedback.type} message={feedback.message} /></div>}
                            <form onSubmit={handleScanSubmit}>
                                <Input
                                    label="Zeskanuj kod QR palety"
                                    id="dispatch-scan-input"
                                    value={scannedValue}
                                    onChange={e => setScannedValue(e.target.value)}
                                    icon={<QrCodeIcon className="h-5 w-5 text-gray-400" />}
                                    autoFocus
                                    disabled={isLoading}
                                />
                                <Button type="submit" className="w-full mt-3" disabled={isLoading}>
                                    {isLoading ? 'Przetwarzanie...' : 'Zatwierdź'}
                                </Button>
                            </form>
                        </div>

                        {fefoSuggestions.length > 0 && (
                            <div>
                                <h3 className="text-lg font-semibold mb-2">Sugestia FEFO</h3>
                                {fefoSuggestions.map(s => (
                                    <div key={s.itemId} className="p-3 bg-blue-50 dark:bg-blue-900/40 rounded-lg border border-blue-200 dark:border-blue-700">
                                        <p className="text-sm font-semibold text-blue-800 dark:text-blue-200">Pobierz dla: {s.productName}</p>
                                        <p className="text-lg font-mono text-gray-800 dark:text-gray-200">{s.suggestion.displayId}</p>
                                        <p className="text-xs">Ważność: {formatDate(s.suggestion.expiryDate)} | Waga: {s.suggestion.quantityKg} kg | Lok: {s.suggestion.currentLocation}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                        
                        <div className="pt-4 border-t dark:border-secondary-700">
                            <Button 
                                onClick={handleCompleteFulfillment} 
                                disabled={!isFulfillmentComplete}
                                className="w-full text-lg py-3"
                            >
                                Zakończ Załadunek
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
            {splitSuggestion && (
                <ConfirmationModal
                    isOpen={!!splitSuggestion}
                    onClose={() => setSplitSuggestion(null)}
                    onConfirm={() => {
                        handleSetView(View.SplitPallet, {
                            palletId: splitSuggestion.palletToSplit.id,
                            suggestedWeight: splitSuggestion.neededWeight.toFixed(2)
                        });
                        setSplitSuggestion(null);
                    }}
                    title="Wymagany podział palety"
                    message={
                        <span>
                            Waga palety <strong>{splitSuggestion.palletToSplit.displayId}</strong> ({splitSuggestion.palletToSplit.quantityKg.toFixed(2)} kg) przekracza zapotrzebowanie ({splitSuggestion.neededWeight.toFixed(2)} kg).
                            <br/><br/>
                            Czy chcesz przejść do ekranu podziału palety, aby pobrać wymaganą ilość?
                        </span>
                    }
                    confirmButtonText="Tak, podziel paletę"
                    cancelButtonText="Anuluj"
                />
            )}
        </>
    );
};

export default DispatchFulfillmentPage;
