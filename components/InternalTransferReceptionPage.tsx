
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { InternalTransferOrder, View, RawMaterialLogEntry, FinishedGoodItem } from '../types';
import { useUIContext } from './contexts/UIContext';
import { useLogisticsContext } from './contexts/LogisticsContext';
import { useWarehouseContext } from './contexts/WarehouseContext';
import Button from './Button';
import Input from './Input';
import Alert from './Alert';
import { formatDate, normalizeLocationId } from '../src/utils';
import ArrowLeftIcon from './icons/ArrowLeftIcon';
import QrCodeIcon from './icons/QrCodeIcon';
import LocationMarkerIcon from './icons/LocationMarkerIcon';
import { OSIP_WAREHOUSE_ID } from '../constants';

const InternalTransferReceptionPage: React.FC = () => {
    const { viewParams, handleSetView, showToast } = useUIContext();
    const { internalTransferOrders, handleReceiveInternalTransfer } = useLogisticsContext();
    const { findPalletByUniversalId, handleUniversalMove, validatePalletMove } = useWarehouseContext();

    const [order, setOrder] = useState<InternalTransferOrder | null>(null);
    const [mode, setMode] = useState<'scanning' | 'summary'>('scanning');
    
    // Scanning state
    const [scanStep, setScanStep] = useState<'pallet' | 'location'>('pallet');
    const [scannedValue, setScannedValue] = useState('');
    const [scannedPalletId, setScannedPalletId] = useState<string | null>(null);
    const [scannedPallets, setScannedPallets] = useState<Map<string, { displayId: string, location: string }>>(new Map());
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info', message: string } | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const foundOrder = (internalTransferOrders || []).find(o => o.id === viewParams?.orderId);
        setOrder(foundOrder || null);
        if (foundOrder?.status !== 'IN_TRANSIT') {
            setFeedback({ type: 'error', message: 'To zlecenie nie jest w tranzycie i nie może być przyjęte.' });
        }
    }, [viewParams, internalTransferOrders]);

    const totalPallets = order?.pallets.length || 0;
    const scannedCount = scannedPallets.size;
    const remainingCount = totalPallets - scannedCount;

    const handleScanSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const value = scannedValue.trim();
        if (!value || !order) return;

        setFeedback(null);

        if (scanStep === 'pallet') {
            const palletInOrder = order.pallets.find(p => p.palletId === value || p.displayId === value);
            if (!palletInOrder) {
                setFeedback({ type: 'error', message: `Paleta ${value} nie należy do tego zlecenia transferu.` });
            } else if (scannedPallets.has(palletInOrder.palletId)) {
                setFeedback({ type: 'info', message: `Paleta ${palletInOrder.displayId} została już zeskanowana.` });
            } else {
                setScannedPalletId(palletInOrder.palletId);
                setScanStep('location');
                setFeedback({ type: 'info', message: `Zeskanowano paletę ${palletInOrder.displayId}. Teraz zeskanuj lokalizację docelową.` });
            }
        } else { // scanStep === 'location'
            if (!scannedPalletId) return;

            // Normalize location ID (e.g., bfms01 -> BF_MS01)
            const normalizedLocation = normalizeLocationId(value);

            // Strict destination validation based on Order Destination
            // Case 1: Order is for OSIP, but user scans something else (e.g. MS01)
            if (order.destinationWarehouse === OSIP_WAREHOUSE_ID && normalizedLocation !== OSIP_WAREHOUSE_ID) {
                setFeedback({ type: 'error', message: `Błąd: Ten transfer jest skierowany do OSiP. Musisz zeskanować lokalizację '${OSIP_WAREHOUSE_ID}'.` });
                setScannedValue('');
                return;
            }

            // Case 2: Order is NOT for OSIP (e.g. Centrala), but user scans OSIP
            if (order.destinationWarehouse !== OSIP_WAREHOUSE_ID && normalizedLocation === OSIP_WAREHOUSE_ID) {
                setFeedback({ type: 'error', message: `Błąd: Ten transfer jest skierowany do Centrali. Nie można przyjąć na '${OSIP_WAREHOUSE_ID}'.` });
                setScannedValue('');
                return;
            }

            // Find pallet info first to get the correct type ('raw' vs 'fg')
            const palletInfo = findPalletByUniversalId(scannedPalletId);
            
            if (!palletInfo) {
                setFeedback({ type: 'error', message: `Błąd krytyczny: Nie znaleziono danych palety ${scannedPalletId} w systemie.` });
                return;
            }
            
            // Validate the move based on the specific item type rules (e.g., FG only to MGW)
            const validation = validatePalletMove(palletInfo.item, normalizedLocation);
            if (!validation.isValid) {
                setFeedback({ type: 'error', message: validation.message });
                return;
            }

            // Execute move with the CORRECT type found from findPalletByUniversalId
            const moveResult = handleUniversalMove(scannedPalletId, palletInfo.type, normalizedLocation);
            
            if (moveResult.success) {
                setScannedPallets(prev => {
                    const newMap = new Map(prev);
                    let displayId = scannedPalletId;
                    if (palletInfo.item) {
                        if (palletInfo.type === 'raw') {
                             displayId = (palletInfo.item as RawMaterialLogEntry).palletData.nrPalety;
                        } else if (palletInfo.type === 'fg') {
                             displayId = (palletInfo.item as FinishedGoodItem).displayId || (palletInfo.item as FinishedGoodItem).id;
                        }
                    }
                    newMap.set(scannedPalletId, { displayId, location: normalizedLocation });
                    return newMap;
                });
                setFeedback({ type: 'success', message: `Paleta przeniesiona do ${normalizedLocation}.` });
                setScanStep('pallet');
                setScannedPalletId(null);
            } else {
                setFeedback({ type: 'error', message: moveResult.message });
            }
        }
        setScannedValue('');
        // Keep focus
        setTimeout(() => {
             if(inputRef.current) inputRef.current.focus();
        }, 100);
    };

    const handleFinishScanning = () => {
        if (remainingCount === 0) {
            setFeedback(null);
            setMode('summary');
        } else {
            showToast('Musisz zeskanować wszystkie palety przed przejściem do podsumowania.', 'error');
        }
    };

    const handleFinalSubmit = () => {
        if (!order) return;
        setFeedback(null);
        
        const result = handleReceiveInternalTransfer(order.id);
        
        if (result.success) {
            showToast(result.message, 'success');
            handleSetView(View.InternalTransfers);
        } else {
            setFeedback({type: 'error', message: result.message});
        }
    };

    if (!order) {
        return (
            <div className="p-4">
                <Alert type="error" message="Nie znaleziono zlecenia transferu." />
                <Button onClick={() => handleSetView(View.InternalTransfers)} className="mt-4">Wróć do listy</Button>
            </div>
        );
    }

    if (mode === 'scanning') {
        return (
            <div className="p-4 md:p-6 bg-slate-50 dark:bg-secondary-900 min-h-full flex flex-col pb-24">
                <header className="flex-shrink-0 flex items-center gap-3 mb-4 pb-3 border-b dark:border-secondary-700">
                    <Button onClick={() => handleSetView(View.InternalTransfers)} variant="secondary" className="p-2"><ArrowLeftIcon className="h-5 w-5"/></Button>
                    <div>
                        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">Przyjęcie Transferu: {order.id}</h2>
                        <div className="flex gap-4 text-sm text-gray-500 dark:text-gray-400">
                            <span>Do zeskanowania: <strong>{totalPallets}</strong></span>
                            <span>Zeskanowano: <strong className="text-green-600">{scannedCount}</strong></span>
                            <span>Pozostaje: <strong className="text-orange-600">{remainingCount}</strong></span>
                        </div>
                    </div>
                </header>

                {feedback && <div className="mb-4"><Alert type={feedback.type} message={feedback.message} /></div>}

                <div className="flex flex-col lg:flex-row-reverse gap-6">
                    {/* Formularz skanowania - na górze na mobile, po prawej na desktop */}
                    <div className="bg-white dark:bg-secondary-800 p-4 rounded-lg shadow-md flex flex-col h-fit lg:w-1/3">
                        <h3 className="text-lg font-semibold mb-3">
                            {scanStep === 'pallet' ? 'Krok 1: Zeskanuj Paletę' : `Krok 2: Zeskanuj Lokalizację dla ${scannedPallets.get(scannedPalletId!)?.displayId || scannedPalletId}`}
                        </h3>
                        <form onSubmit={handleScanSubmit} className="flex-grow">
                            <Input
                                ref={inputRef}
                                label={scanStep === 'pallet' ? 'ID Palety' : 'ID Lokalizacji'}
                                id="transfer-scan-input"
                                value={scannedValue}
                                onChange={(e) => setScannedValue(e.target.value)}
                                icon={scanStep === 'pallet' ? <QrCodeIcon className="h-5 w-5 text-gray-400" /> : <LocationMarkerIcon className="h-5 w-5 text-gray-400" />}
                                autoFocus
                                autoComplete="off"
                                uppercase={scanStep === 'location'}
                            />
                            <Button type="submit" className="w-full mt-3 py-4 text-lg">Zatwierdź</Button>
                        </form>
                    </div>

                    {/* Lista palet - na dole na mobile, po lewej na desktop */}
                    <div className="bg-white dark:bg-secondary-800 p-4 rounded-lg shadow-md flex flex-col lg:w-2/3">
                        <h3 className="text-lg font-semibold mb-3">Lista Palet do Przyjęcia</h3>
                        {/* Usunięto max-h na mobile, aby lista była w pełni przewijalna w oknie przeglądarki */}
                        <div className="lg:overflow-y-auto lg:max-h-[60vh]"> 
                            <ul className="space-y-2">
                                {order.pallets.map(pallet => {
                                    const isScanned = scannedPallets.has(pallet.palletId);
                                    return (
                                        <li key={pallet.palletId} className={`p-2 rounded-md ${isScanned ? 'bg-green-100 dark:bg-green-900/50' : 'bg-slate-100 dark:bg-secondary-900'}`}>
                                            <div className="flex justify-between items-center">
                                                <div>
                                                    <p className="font-semibold text-sm">{pallet.productName}</p>
                                                    <p className="font-mono text-xs">{pallet.displayId}</p>
                                                </div>
                                                {isScanned && <span className="text-xs font-semibold text-green-700 dark:text-green-300">Zeskanowano: {scannedPallets.get(pallet.palletId)?.location}</span>}
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    </div>
                </div>
                
                <div className="mt-6 flex-shrink-0 text-right">
                    <Button onClick={handleFinishScanning} disabled={remainingCount > 0} className="w-full sm:w-auto py-3 text-lg">
                        Dalej do podsumowania
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-6 bg-slate-50 dark:bg-secondary-900/50 min-h-full flex flex-col pb-24">
            <header className="flex items-center gap-3 mb-6">
                 <Button onClick={() => setMode('scanning')} variant="secondary" className="p-2 flex-shrink-0"><ArrowLeftIcon className="h-5 w-5"/></Button>
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">Podsumowanie Przyjęcia: {order.id}</h2>
                </div>
            </header>
            
            {feedback && <div className="mb-4 max-w-4xl mx-auto"><Alert type={feedback.type} message={feedback.message} /></div>}

            <div className="max-w-4xl mx-auto space-y-6">
                 <div className="bg-white dark:bg-secondary-800 p-6 rounded-lg shadow-md">
                    <h3 className="text-lg font-semibold text-primary-700 dark:text-primary-300 mb-3">Dane zlecenia</h3>
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                         <div><strong className="block text-gray-500">Nr Zamówienia / WZ</strong><span>{order.id}</span></div>
                         <div><strong className="block text-gray-500">Dostawca</strong><span>Transfer Wewnętrzny</span></div>
                         <div><strong className="block text-gray-500">Data Dostawy</strong><span>{formatDate(new Date().toISOString())}</span></div>
                         <div><strong className="block text-gray-500">Magazyn Docelowy</strong><span>{order.destinationWarehouse}</span></div>
                    </div>
                </div>

                <div className="bg-white dark:bg-secondary-800 p-6 rounded-lg shadow-md">
                     <h3 className="text-lg font-semibold text-primary-700 dark:text-primary-300 mb-3">Pozycje Dostawy ({totalPallets})</h3>
                     <div className="space-y-2">
                        {order.pallets.map(pallet => (
                             <div key={pallet.palletId} className="p-3 rounded-md bg-slate-100 dark:bg-secondary-900">
                                 <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
                                     <div><strong className="block text-xs text-gray-500">Produkt</strong><span className="font-semibold">{pallet.productName}</span></div>
                                     <div><strong className="block text-xs text-gray-500">Nr partii</strong><span className="font-mono">{pallet.displayId}</span></div>
                                     <div><strong className="block text-xs text-gray-500">Waga netto (kg)</strong><span>
                                        {(() => {
                                            const palletInfo = findPalletByUniversalId(pallet.palletId);
                                            if (palletInfo && palletInfo.item) {
                                                if (palletInfo.type === 'raw') {
                                                    return (palletInfo.item as RawMaterialLogEntry).palletData.currentWeight.toFixed(2);
                                                } else if (palletInfo.type === 'fg') {
                                                    return (palletInfo.item as FinishedGoodItem).quantityKg.toFixed(2);
                                                }
                                            }
                                            return 'N/A';
                                        })()}
                                    </span></div>
                                     <div><strong className="block text-xs text-gray-500">Lokalizacja</strong><span className="font-mono font-bold text-green-600">{scannedPallets.get(pallet.palletId)?.location}</span></div>
                                 </div>
                             </div>
                         ))}
                    </div>
                </div>
                
                <div className="flex justify-end gap-3 pt-4">
                    <Button type="button" variant="secondary" onClick={() => handleSetView(View.InternalTransfers)}>Anuluj</Button>
                    <Button type="button" onClick={handleFinalSubmit} className="bg-green-600 hover:bg-green-700">Zakończ i Potwierdź Przyjęcie</Button>
                </div>
            </div>
        </div>
    );
};

export default InternalTransferReceptionPage;
