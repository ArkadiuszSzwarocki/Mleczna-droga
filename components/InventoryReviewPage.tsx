
import React, { useState, useEffect, useMemo } from 'react';
import { useAppContext } from './contexts/AppContext';
import { InventorySession, RawMaterialLogEntry, FinishedGoodItem, View } from '../types';
import Button from './Button';
import Alert from './Alert';
import ArrowLeftIcon from './icons/ArrowLeftIcon';
import ConfirmationModal from './ConfirmationModal';
import { formatDate } from '../src/utils';
import ChevronDownIcon from './icons/ChevronDownIcon';
import ChevronUpIcon from './icons/ChevronUpIcon';

const DiscrepancyItem: React.FC<{
    palletId: string;
    productName: string;
    expected: number;
    counted: number;
    diff: number;
    actionLabel: string;
    onAction: () => void;
    onRecount: () => void;
    isResolved: boolean;
    locationId: string;
    previousLocation?: string;
    type: 'missing' | 'unexpected' | 'quantity_mismatch' | 'moved';
}> = ({ palletId, productName, expected, counted, diff, actionLabel, onAction, onRecount, isResolved, locationId, type, previousLocation }) => (
    <div className={`p-3 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${isResolved ? 'bg-green-50 dark:bg-green-900/40' : 'bg-red-50 dark:bg-red-900/40'}`}>
        <div>
            <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold font-mono text-gray-800 dark:text-gray-200">{palletId}</p>
                {type === 'moved' && <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-bold uppercase">Przesunięcie</span>}
                {type === 'unexpected' && <span className="px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 text-[10px] font-bold uppercase">Nadwyżka</span>}
                {type === 'quantity_mismatch' && <span className="px-1.5 py-0.5 rounded bg-orange-100 text-orange-800 text-[10px] font-bold uppercase">Różnica Wagi</span>}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                <span className="font-medium">{productName}</span>
                <span className="block mt-0.5">
                    Znaleziono w: <strong>{locationId}</strong>
                    {previousLocation && type !== 'moved' && type !== 'missing' && (
                        <span className="ml-1 text-gray-500">(Oczekiwano w: {previousLocation})</span>
                    )}
                    {type === 'moved' && previousLocation && (
                        <span className="ml-1 text-blue-600 dark:text-blue-400 font-semibold">&larr; Przyszło z: {previousLocation}</span>
                    )}
                </span>
            </div>
             <div className="flex gap-4 mt-2 text-xs">
                <span>Sys: <strong>{expected}</strong></span>
                <span>Spis: <strong>{counted}</strong></span>
                <span className={diff !== 0 ? 'text-red-600 font-bold' : 'text-green-600'}>Różnica: {diff > 0 ? `+${diff}` : diff}</span>
            </div>
        </div>
        {isResolved ? (
            <span className="text-sm font-semibold text-green-700 dark:text-green-300">Zatwierdzone</span>
        ) : (
            <div className="flex gap-2">
                 <Button onClick={onRecount} variant="secondary" className="text-xs bg-white hover:bg-gray-100">Zleć przeliczenie</Button>
                 <Button onClick={onAction} variant="secondary" className="text-xs bg-white hover:bg-gray-100">{actionLabel}</Button>
            </div>
        )}
    </div>
);


const InventoryReviewPage: React.FC = () => {
    const { 
        viewParams, 
        inventorySessions, 
        handleSetView,
        findPalletByUniversalId,
        handleResolveMissingPallet,
        handleResolveUnexpectedPallet,
        handleFinalizeInventorySession,
        handleUpdateInventoryLocationStatus
    } = useAppContext();
    
    const [session, setSession] = useState<InventorySession | null>(null);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info', message: string } | null>(null);
    const [isFinalizeConfirmOpen, setIsFinalizeConfirmOpen] = useState(false);
    const [isMatchesExpanded, setIsMatchesExpanded] = useState(false);

    useEffect(() => {
        const foundSession = (inventorySessions || []).find(s => s.id === viewParams?.sessionId);
        setSession(foundSession || null);
    }, [viewParams, inventorySessions]);

    const analysis = useMemo(() => {
        if (!session) return null;

        const discrepancies: any[] = [];
        const matches: any[] = [];
        
        // Track which pallet IDs from the snapshot have been accounted for
        const processedSnapshotIds = new Set<string>();

        // 1. Iterate through expected items (Snapshot)
        session.snapshot.forEach(snapItem => {
            // Find if scanned anywhere in THIS session
            let totalCounted = 0;
            let scannedEntry = null;
            let scannedLocationId = null;
            
            session.locations.forEach(loc => {
                const scan = loc.scannedPallets.find(s => s.palletId === snapItem.palletId);
                if (scan) {
                    totalCounted = scan.countedQuantity;
                    scannedEntry = scan;
                    scannedLocationId = loc.locationId;
                }
            });

            if (!scannedEntry) {
                // Not found anywhere -> MISSING
                discrepancies.push({
                    type: 'missing',
                    palletId: snapItem.palletId,
                    productName: snapItem.productName,
                    expected: snapItem.expectedQuantity,
                    counted: 0,
                    diff: -snapItem.expectedQuantity,
                    locationId: snapItem.locationId // Original location from snapshot
                });
            } else {
                processedSnapshotIds.add(snapItem.palletId);
                const weightDiff = totalCounted - snapItem.expectedQuantity;
                const isLocationDifferent = scannedLocationId !== snapItem.locationId;

                // Priority 1: Quantity Mismatch (Check Weight First)
                if (Math.abs(weightDiff) > 0.01) {
                    discrepancies.push({
                        type: 'quantity_mismatch',
                        palletId: snapItem.palletId,
                        productName: snapItem.productName,
                        expected: snapItem.expectedQuantity,
                        counted: totalCounted,
                        diff: weightDiff,
                        locationId: scannedLocationId,
                        previousLocation: isLocationDifferent ? snapItem.locationId : undefined // Pass expected location context if moved
                    });
                } 
                // Priority 2: Location Mismatch (Moved) - ONLY if weight is correct
                else if (isLocationDifferent) {
                     discrepancies.push({
                        type: 'moved',
                        palletId: snapItem.palletId,
                        productName: snapItem.productName,
                        expected: snapItem.expectedQuantity,
                        counted: totalCounted,
                        diff: 0,
                        locationId: scannedLocationId,
                        previousLocation: snapItem.locationId
                    });
                } 
                // Priority 3: Perfect Match
                else {
                    matches.push({
                        ...snapItem,
                        counted: totalCounted,
                        locationId: scannedLocationId
                    });
                }
            }
        });

        // 2. Analyze Scanned items that were NOT in the Snapshot for the selected locations
        session.locations.forEach(loc => {
            loc.scannedPallets.forEach(scan => {
                // If we already processed this ID in step 1, skip it
                if (processedSnapshotIds.has(scan.palletId)) return;

                // If not in snapshot, it means it wasn't expected in the INVENTORY SCOPE.
                const info = findPalletByUniversalId(scan.palletId);
                
                if (info && info.item) {
                     // Item exists in system globally (e.g. was in MS01, scanned in OSIP)
                     let productName = 'Nieznany';
                     let previousLocation = 'Nieznana';
                     let systemWeight = 0;
                     
                     if ('palletData' in info.item) {
                         productName = info.item.palletData.nazwa;
                         previousLocation = info.item.currentLocation || 'Brak';
                         systemWeight = info.item.palletData.currentWeight;
                     } else {
                         productName = info.item.productName;
                         previousLocation = info.item.currentLocation || 'Brak';
                         systemWeight = info.item.quantityKg;
                     }

                     const weightDiff = scan.countedQuantity - systemWeight;

                     // Determine Type based on weight difference first
                     if (Math.abs(weightDiff) > 0.01) {
                        discrepancies.push({
                            type: 'quantity_mismatch',
                            palletId: scan.palletId,
                            productName: productName,
                            expected: systemWeight, // Use Global System Weight
                            counted: scan.countedQuantity,
                            diff: weightDiff, // Calculate diff against Global System Weight
                            locationId: loc.locationId,
                            previousLocation: previousLocation
                        });
                     } else {
                        // Weight is correct, so it must be just a move (since it wasn't in snapshot)
                        discrepancies.push({
                            type: 'moved', 
                            palletId: scan.palletId,
                            productName: productName,
                            expected: systemWeight,
                            counted: scan.countedQuantity,
                            diff: 0, 
                            locationId: loc.locationId,
                            previousLocation: previousLocation
                        });
                     }

                 } else {
                     // Item does NOT exist in system at all (e.g. new or deleted previously).
                     // Treat as UNEXPECTED / SURPLUS (Sys: 0).
                     discrepancies.push({
                        type: 'unexpected',
                        palletId: scan.palletId,
                        productName: 'Nieznany (Nowa/Usunięta)',
                        expected: 0,
                        counted: scan.countedQuantity,
                        diff: scan.countedQuantity,
                        locationId: loc.locationId
                    });
                 }
            });
        });

        return { discrepancies, matches };
    }, [session, findPalletByUniversalId]);
    
    const handleResolve = (type: 'missing' | 'unexpected' | 'quantity_mismatch' | 'moved', palletId: string, locationId?: string) => {
        if (!session) return;
        
        let result;
        if (type === 'missing') {
            const pallet = findPalletByUniversalId(palletId);
            result = handleResolveMissingPallet(session.id, palletId, pallet?.item.currentLocation || 'unknown');
        } else {
            // Unexpected, Quantity Mismatch, and Moved all effectively accept the new state (qty + location)
            result = handleResolveUnexpectedPallet(session.id, palletId, locationId || 'unknown'); 
        }

        setFeedback({ type: result.success ? 'success' : 'error', message: result.message });
    };

    const handleRecount = (locationId: string) => {
        if (!session || !locationId) return;
        // 1. Reset location status to pending so it can be edited
        handleUpdateInventoryLocationStatus(session.id, locationId, 'pending');
        // 2. Navigate to scanner with this location pre-selected AND return view set
        handleSetView(View.InventorySession, { 
            sessionId: session.id, 
            locationIdToRecount: locationId,
            returnView: View.InventoryReview // IMPORTANT: Tell scanner to come back here
        });
    };

    const confirmFinalize = () => {
        if (!session) return;
        const result = handleFinalizeInventorySession(session.id);
        if (result.success) {
            handleSetView(View.InventoryReports); // Back to reports/dashboard
        } else {
            setFeedback({ type: 'error', message: result.message });
        }
        setIsFinalizeConfirmOpen(false);
    };

    if (!session || !analysis) {
        return <div className="p-4"><Alert type="error" message="Nie znaleziono sesji inwentaryzacyjnej." /></div>;
    }
    
    const allResolved = analysis.discrepancies.length === (session.resolvedDiscrepancies || []).length;

    return (
        <>
            <div className="p-4 md:p-6 bg-slate-50 dark:bg-secondary-900 h-full">
                <header className="flex items-center mb-4 pb-3 border-b dark:border-secondary-700">
                    <Button onClick={() => handleSetView(View.InventoryDashboard)} variant="secondary" className="mr-4 p-2"><ArrowLeftIcon className="h-5 w-5"/></Button>
                    <div>
                        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">Weryfikacja (Raport Wariancji): {session.name}</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Utworzono: {formatDate(session.createdAt, true)} przez {session.createdBy}</p>
                    </div>
                </header>

                {feedback && <div className="mb-4"><Alert type={feedback.type} message={feedback.message} /></div>}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                        <h3 className="text-lg font-bold mb-2">Rozbieżności do wyjaśnienia ({analysis.discrepancies.length})</h3>
                        
                        {analysis.discrepancies.length === 0 && (
                            <Alert type="success" message="Idealna zgodność! Brak różnic między systemem a spisem." />
                        )}
                        
                        <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2 scrollbar-hide">
                            {analysis.discrepancies.map(item => {
                                const isResolved = session.resolvedDiscrepancies?.some(d => d.palletId === item.palletId);
                                let label = '';
                                if (item.type === 'missing') label = 'Zatwierdź Brak';
                                else if (item.type === 'unexpected') label = 'Przyjmij Nadwyżkę';
                                else if (item.type === 'moved') label = 'Akceptuj Przesunięcie';
                                else label = 'Koryguj Stan'; // For quantity mismatch

                                return (
                                    <DiscrepancyItem
                                        key={item.palletId}
                                        palletId={item.palletId}
                                        productName={item.productName}
                                        expected={item.expected}
                                        counted={item.counted}
                                        diff={item.diff}
                                        actionLabel={label}
                                        locationId={item.locationId || 'Nieznana'}
                                        previousLocation={item.previousLocation}
                                        type={item.type as any}
                                        onAction={() => handleResolve(item.type as any, item.palletId, item.locationId)}
                                        onRecount={() => handleRecount(item.locationId || 'unknown')}
                                        isResolved={!!isResolved}
                                    />
                                )
                            })}
                        </div>

                         <div className="p-4 bg-white dark:bg-secondary-800 rounded-lg shadow-md mt-4 border-l-4 border-green-500">
                            <button 
                                onClick={() => setIsMatchesExpanded(!isMatchesExpanded)}
                                className="w-full flex justify-between items-center"
                            >
                                <div>
                                    <h3 className="text-lg font-semibold text-green-700 dark:text-green-400">Zgodne pozycje ({analysis.matches.length})</h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 text-left">Palety policzone poprawnie (waga i lokalizacja zgodna).</p>
                                </div>
                                {isMatchesExpanded ? <ChevronUpIcon className="h-5 w-5 text-gray-500" /> : <ChevronDownIcon className="h-5 w-5 text-gray-500" />}
                            </button>
                            
                            {isMatchesExpanded && (
                                <div className="mt-4 overflow-x-auto">
                                    <table className="min-w-full text-xs text-left">
                                        <thead className="bg-slate-100 dark:bg-secondary-700 text-gray-600 dark:text-gray-300">
                                            <tr>
                                                <th className="px-2 py-2">ID Palety</th>
                                                <th className="px-2 py-2">Produkt</th>
                                                <th className="px-2 py-2 text-right">Ilość</th>
                                                <th className="px-2 py-2 text-right">Lok.</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y dark:divide-secondary-700">
                                            {analysis.matches.map(m => (
                                                <tr key={m.palletId}>
                                                    <td className="px-2 py-1 font-mono">{m.palletId}</td>
                                                    <td className="px-2 py-1">{m.productName}</td>
                                                    <td className="px-2 py-1 text-right">{m.expected}</td>
                                                    <td className="px-2 py-1 text-right">{m.locationId}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="p-4 bg-white dark:bg-secondary-800 rounded-lg shadow-md h-fit">
                        <h3 className="text-lg font-semibold">Zakończ Inwentaryzację</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 my-2">Zatwierdzenie spowoduje zaktualizowanie stanów magazynowych (nadpisanie ilościami ze spisu) i odblokowanie lokalizacji.</p>
                        <Button 
                            onClick={() => setIsFinalizeConfirmOpen(true)} 
                            disabled={!allResolved} 
                            className="w-full"
                        >
                            Zaksięguj Różnice i Zamknij
                        </Button>
                        {!allResolved && <p className="text-xs text-red-500 mt-2 text-center">Musisz podjąć decyzję dla wszystkich rozbieżności.</p>}
                    </div>
                </div>
            </div>
            <ConfirmationModal 
                isOpen={isFinalizeConfirmOpen}
                onClose={() => setIsFinalizeConfirmOpen(false)}
                onConfirm={confirmFinalize}
                title="Zakończyć i Zaksięgować?"
                message="System zaktualizuje stany magazynowe zgodnie z wynikami spisu. Operacja jest nieodwracalna."
                confirmButtonText="Tak, księguj"
            />
        </>
    );
};

export default InventoryReviewPage;
