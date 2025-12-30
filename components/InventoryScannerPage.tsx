
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAppContext } from './contexts/AppContext';
import { InventorySession, RawMaterialLogEntry, FinishedGoodItem, View } from '../types';
import Button from './Button';
import Input from './Input';
import QrCodeIcon from './icons/QrCodeIcon';
import Alert from './Alert';
import ArrowLeftIcon from './icons/ArrowLeftIcon';
import LocationMarkerIcon from './icons/LocationMarkerIcon';
import CheckCircleIcon from './icons/CheckCircleIcon';
import { normalizeLocationId } from '../src/utils';
import ConfirmationModal from './ConfirmationModal';
import { useUIContext } from './contexts/UIContext';
import { useAuth } from './contexts/AuthContext';

const InventoryScannerPage: React.FC = () => {
    const { 
        viewParams, 
        inventorySessions, 
        handleRecordInventoryScan,
        handleUpdateInventoryLocationStatus,
        findPalletByUniversalId,
        handleCompleteScanningSession 
    } = useAppContext();
    
    const { handleSetView, showToast } = useUIContext();
    const { currentUser } = useAuth();
    
    const [session, setSession] = useState<InventorySession | null>(null);
    const [currentLocationId, setCurrentLocationId] = useState<string | null>(null);
    const [scannedValue, setScannedValue] = useState('');
    const [quantityInput, setQuantityInput] = useState('');
    const [scannedPalletId, setScannedPalletId] = useState<string | null>(null);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info', message: string } | null>(null);
    
    // Modal states
    const [showRecountModal, setShowRecountModal] = useState(false);
    const [showFinishLocationModal, setShowFinishLocationModal] = useState(false);
    
    const inputRef = useRef<HTMLInputElement>(null);
    const qtyInputRef = useRef<HTMLInputElement>(null);

    // Roles allowed to verify inventory. Magazynier is excluded.
    const canVerify = ['admin', 'boss', 'planista', 'lider', 'kierownik magazynu'].includes(currentUser?.role || '');

    useEffect(() => {
        const foundSession = (inventorySessions || []).find(s => s.id === viewParams?.sessionId);
        setSession(foundSession || null);
    }, [viewParams, inventorySessions]);

    // Added Effect to pre-select location if passed via params (from Review Page)
    useEffect(() => {
        if (session && viewParams?.locationIdToRecount) {
            const locId = viewParams.locationIdToRecount;
            const locationData = session.locations.find(l => l.locationId === locId);
            // Only set if location is part of this session
            if (locationData) {
                setCurrentLocationId(locId);
            }
        }
    }, [session, viewParams]);

    const currentLocationStatus = useMemo(() => {
        if (!session || !currentLocationId) return null;
        return session.locations.find(l => l.locationId === currentLocationId);
    }, [session, currentLocationId]);

    // Check if all locations are marked as scanned
    const allLocationsScanned = useMemo(() => {
        if (!session) return false;
        return session.locations.every(l => l.status === 'scanned');
    }, [session]);

    const handleLocationScan = () => {
        setFeedback(null);
        const userInput = scannedValue.trim();
        const locationId = normalizeLocationId(userInput);
        const locationData = session?.locations.find(l => l.locationId === locationId);

        if (locationData) {
            if (locationData.status === 'scanned') {
                 setFeedback({ type: 'info', message: `Lokalizacja "${locationId}" została już zakończona. Otwieram do ponownego przeliczenia.` });
                 // Implicitly reopen for recount
                 handleUpdateInventoryLocationStatus(session!.id, locationId, 'pending');
            }
            setCurrentLocationId(locationId);
            setScannedValue('');
            setFeedback({ type: 'success', message: `Rozpoczęto skanowanie lokalizacji: ${locationId}` });
        } else {
            setFeedback({ type: 'error', message: `Lokalizacja "${userInput}" nie należy do tej sesji inwentaryzacyjnej.` });
        }
    };

    const handlePalletScan = (e: React.FormEvent) => {
        e.preventDefault();
        if (!session || !currentLocationId) return;
        setFeedback(null);
        
        const palletId = scannedValue.trim();
        const palletInfo = findPalletByUniversalId(palletId);

        if (!palletInfo) {
             setFeedback({ type: 'error', message: `Nie znaleziono palety o ID ${palletId} w systemie.` });
             return;
        }

        // Check if this pallet was already scanned in this location during this session
        if (currentLocationStatus?.scannedPallets.some(p => p.palletId === palletId)) {
            setFeedback({ type: 'info', message: `Paleta ${palletId} została już zeskanowana w tej lokalizacji. Wprowadź nową ilość, aby zaktualizować (Korekta).` });
            // Continue to quantity input to allow correction
        }
        
        setScannedPalletId(palletId);
        setScannedValue(''); // Clear scan input
        // Focus quantity input
        setTimeout(() => qtyInputRef.current?.focus(), 100);
    };

    const submitQuantity = (force: boolean = false) => {
        if (!session || !currentLocationId || !scannedPalletId) return;

        const qty = parseFloat(quantityInput);
        if (isNaN(qty) || qty < 0) {
            setFeedback({ type: 'error', message: 'Wprowadź poprawną ilość.' });
            return;
        }

        const result = handleRecordInventoryScan(session.id, currentLocationId, scannedPalletId, qty, force);
        
        if (result.warning === 'RECOUNT_NEEDED') {
            setShowRecountModal(true);
            return; // Don't clear inputs yet, let user decide
        }

        setFeedback({ type: result.success ? 'success' : 'error', message: result.message });
        setScannedPalletId(null);
        setQuantityInput('');
        setShowRecountModal(false); // Ensure modal is closed
        // Focus back to scan input
        setTimeout(() => inputRef.current?.focus(), 100);
    };

    const handleForceSubmit = () => {
        submitQuantity(true);
    };

    const handleRecount = () => {
        setQuantityInput(''); // Clear input to force re-entry
        setShowRecountModal(false);
        setTimeout(() => qtyInputRef.current?.focus(), 100);
    };

    // Triggered when clicking "Zakończ tę lokalizację"
    const requestFinishLocation = () => {
        setShowFinishLocationModal(true);
    };

    const confirmFinishLocation = () => {
        if (!session || !currentLocationId) return;
        
        handleUpdateInventoryLocationStatus(session.id, currentLocationId, 'scanned');
        setCurrentLocationId(null);
        setShowFinishLocationModal(false);

        // Navigation Logic: If we came here for a specific recount (returnView is set), go back there immediately.
        if (viewParams?.returnView) {
            handleSetView(viewParams.returnView, { sessionId: session.id });
            return;
        }
        
        setFeedback({ type: 'success', message: `Zakończono skanowanie lokalizacji ${currentLocationId}.` });
    };

    const handleCompleteSession = () => {
        if (!session) return;
        const result = handleCompleteScanningSession(session.id);
        
        if (result.success) {
            if (canVerify) {
                // Managers go to verification
                handleSetView(View.InventoryReview, { sessionId: session.id });
            } else {
                // Workers go to dashboard with success message
                showToast("Skanowanie zakończone. Powiadom przełożonego o gotowości do weryfikacji.", "success");
                handleSetView(View.InventoryDashboard);
            }
        } else {
            setFeedback({ type: 'error', message: result.message });
        }
    };

    if (!session) {
        return <div className="p-4"><Alert type="error" message="Nie znaleziono sesji inwentaryzacyjnej." /></div>;
    }

    const scannedItems = currentLocationStatus?.scannedPallets.map(p => {
        const palletInfo = findPalletByUniversalId(p.palletId);
        return { ...p, info: palletInfo };
    }) || [];

    return (
        <div className="p-4 md:p-6 bg-slate-50 dark:bg-secondary-900 h-full">
            <header className="flex items-center mb-4 pb-3 border-b dark:border-secondary-700">
                <Button onClick={() => handleSetView(View.InventoryDashboard)} variant="secondary" className="mr-4 p-2"><ArrowLeftIcon className="h-5 w-5"/></Button>
                <div>
                    <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">{session.name} (Ślepy Spis)</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">{session.id}</p>
                </div>
            </header>

            {feedback && <div className="mb-4"><Alert type={feedback.type} message={feedback.message} /></div>}

            {!currentLocationId ? (
                // LOCATION SCAN VIEW or SESSION COMPLETE VIEW
                allLocationsScanned ? (
                    <div className="flex flex-col items-center justify-center p-8 bg-white dark:bg-secondary-800 rounded-lg shadow-md text-center animate-fadeIn">
                        <CheckCircleIcon className="h-20 w-20 text-green-500 mb-4" />
                        <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-2">Skanowanie Zakończone</h3>
                        <p className="text-gray-600 dark:text-gray-400 mb-6">
                            Wszystkie lokalizacje w tej sesji zostały oznaczone jako zakończone.
                        </p>
                        <div className="flex flex-col gap-3 w-full max-w-xs">
                             <Button onClick={handleCompleteSession} className="w-full justify-center py-3 text-lg">
                                {canVerify ? "Weryfikuj (Menadżer)" : "Zgłoś Zakończenie"}
                            </Button>
                            <div className="relative flex py-2 items-center">
                                <div className="flex-grow border-t border-gray-300 dark:border-gray-600"></div>
                                <span className="flex-shrink-0 mx-2 text-gray-400 text-xs">lub popraw lokalizację</span>
                                <div className="flex-grow border-t border-gray-300 dark:border-gray-600"></div>
                            </div>
                            {/* Allow re-opening a location if needed */}
                            <form onSubmit={(e) => { e.preventDefault(); handleLocationScan(); }}>
                                <Input
                                    ref={inputRef}
                                    label="Zeskanuj lokalizację ponownie aby poprawić"
                                    id="location-rescan-input"
                                    value={scannedValue}
                                    onChange={(e) => setScannedValue(e.target.value)}
                                    icon={<LocationMarkerIcon className="h-5 w-5 text-gray-400" />}
                                    uppercase
                                    className="text-sm"
                                />
                                <Button type="submit" variant="secondary" className="w-full mt-2">Otwórz Lokalizację</Button>
                            </form>
                        </div>
                    </div>
                ) : (
                    <div className="p-4 bg-white dark:bg-secondary-800 rounded-lg shadow-md">
                        <h3 className="text-lg font-semibold text-primary-700 dark:text-primary-300 mb-2">1. Zeskanuj Lokalizację</h3>
                        <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
                             Pozostało do sprawdzenia: <strong>{session.locations.filter(l => l.status === 'pending').length}</strong> lokalizacji.
                        </div>
                        <form onSubmit={(e) => { e.preventDefault(); handleLocationScan(); }}>
                            <Input
                                ref={inputRef}
                                label="ID Lokalizacji"
                                id="location-scan-input"
                                value={scannedValue}
                                onChange={(e) => setScannedValue(e.target.value)}
                                icon={<LocationMarkerIcon className="h-5 w-5 text-gray-400" />}
                                autoFocus
                                uppercase
                            />
                            <Button type="submit" className="w-full mt-3">Zatwierdź Lokalizację</Button>
                        </form>
                    </div>
                )
            ) : !scannedPalletId ? (
                // PALLET SCAN VIEW
                <div className="p-4 bg-white dark:bg-secondary-800 rounded-lg shadow-md">
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="text-lg font-semibold text-primary-700 dark:text-primary-300">Skanowanie: {currentLocationId}</h3>
                        <Button onClick={() => setCurrentLocationId(null)} variant="secondary" className="text-xs">Zmień Lokalizację</Button>
                    </div>

                    <form onSubmit={handlePalletScan}>
                        <Input
                            ref={inputRef}
                            label="2. Zeskanuj ID Palety"
                            id="pallet-scan-input"
                            value={scannedValue}
                            onChange={(e) => setScannedValue(e.target.value)}
                            icon={<QrCodeIcon className="h-5 w-5 text-gray-400" />}
                            autoFocus
                        />
                        <Button type="submit" className="w-full mt-3">Dalej</Button>
                    </form>
                     <div className="mt-4">
                        <h4 className="font-semibold text-sm mb-2">Zeskanowane w tej strefie ({scannedItems.length}):</h4>
                        <ul className="text-xs space-y-1 max-h-40 overflow-y-auto pr-2 bg-slate-50 dark:bg-secondary-900 p-2 rounded scrollbar-hide">
                            {scannedItems.map((item, idx) => (
                                <li key={idx} className="p-1 rounded bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200">
                                    <span className="font-mono">{item.palletId}</span> - Ilość: {item.countedQuantity}
                                </li>
                            ))}
                        </ul>
                    </div>
                     <div className="mt-4 pt-4 border-t dark:border-secondary-700 text-right">
                        <Button onClick={requestFinishLocation} variant="primary">Zakończ tę Lokalizację</Button>
                    </div>
                </div>
            ) : (
                // QUANTITY INPUT VIEW
                 <div className="p-4 bg-white dark:bg-secondary-800 rounded-lg shadow-md">
                    <h3 className="text-lg font-semibold text-primary-700 dark:text-primary-300 mb-3">Wprowadź Ilość</h3>
                    <div className="mb-4 p-3 bg-slate-100 dark:bg-secondary-700 rounded">
                         <p className="text-sm text-gray-600 dark:text-gray-400">Paleta:</p>
                         <p className="font-mono font-bold text-lg">{scannedPalletId}</p>
                    </div>
                    <form onSubmit={(e) => { e.preventDefault(); submitQuantity(false); }}>
                        <Input
                            ref={qtyInputRef}
                            label="Ilość (kg / szt.)"
                            id="quantity-input"
                            type="number"
                            step="0.01"
                            value={quantityInput}
                            onChange={(e) => setQuantityInput(e.target.value)}
                            autoFocus
                        />
                        <div className="flex gap-3 mt-4">
                             <Button type="button" variant="secondary" onClick={() => { setScannedPalletId(null); setQuantityInput(''); }} className="flex-1">Anuluj</Button>
                             <Button type="submit" className="flex-1">Zatwierdź</Button>
                        </div>
                    </form>
                </div>
            )}
            
             <ConfirmationModal
                isOpen={showRecountModal}
                onClose={() => setShowRecountModal(false)}
                onConfirm={handleForceSubmit}
                onCancel={handleRecount}
                title="Wymagane Przeliczenie"
                message="Wykryto znaczną różnicę względem oczekiwanego stanu. Czy waga na pewno jest poprawna?"
                confirmButtonText="Tak, zatwierdź mimo to"
                cancelButtonText="Przelicz ponownie"
            />
            
            <ConfirmationModal
                isOpen={showFinishLocationModal}
                onClose={() => setShowFinishLocationModal(false)}
                onConfirm={confirmFinishLocation}
                title="Zakończyć lokalizację?"
                message={`Czy na pewno chcesz zakończyć skanowanie lokalizacji ${currentLocationId}? Upewnij się, że wszystkie palety zostały zeskanowane.`}
                confirmButtonText="Tak, zakończ"
                cancelButtonText="Anuluj"
            />
        </div>
    );
};

export default InventoryScannerPage;
