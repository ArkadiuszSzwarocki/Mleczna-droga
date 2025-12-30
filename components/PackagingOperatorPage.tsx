import React, { useMemo, useState } from 'react';
import { useProductionContext } from './contexts/ProductionContext';
import { usePsdContext } from './contexts/PsdContext'; // Import PsdContext
import { useUIContext } from './contexts/UIContext';
import { useAuth } from './contexts/AuthContext';
// FIX: Added View to the imports to resolve the 'Cannot find name View' error on line 128.
import { ProductionRun, PsdBatch, PsdTask, View } from '../types';
import Button from './Button';
import { formatDate } from '../src/utils';
import CubeIcon from './icons/CubeIcon';
import RegisterFinishedGoodPalletModal from './RegisterFinishedGoodPalletModal';
import Alert from './Alert';
import CheckCircleIcon from './icons/CheckCircleIcon';
import PlusIcon from './icons/PlusIcon';
import ClockIcon from './icons/ClockIcon';
import ConfirmationModal from './ConfirmationModal';
import ArrowUturnLeftIcon from './icons/ArrowUturnLeftIcon';
import XMarkIcon from './icons/XMarkIcon';

// Unified type for handling both Agro and PSD items
type PackagingTask = {
    type: 'AGRO' | 'PSD';
    run: ProductionRun | PsdTask;
    batch: PsdBatch;
    produced: number;
    pending: number;
    endTime: number;
    actualBatchWeight: number;
};

const PackagingOperatorPage: React.FC = () => {
    const { productionRunsList, finishedGoodsList, handleRegisterFgForAgro, handleReturnRemainderToProduction } = useProductionContext();
    const { psdTasks, handleUpdatePsdTask } = usePsdContext(); // Use PsdContext
    const { viewParams, handleSetView, modalHandlers, showToast } = useUIContext();
    const { currentUser } = useAuth();
    
    const [selectedItemForRegistration, setSelectedItemForRegistration] = useState<PackagingTask | null>(null);
    const [itemToReturn, setItemToReturn] = useState<PackagingTask | null>(null);

    const typeFilter = viewParams?.typeFilter;
    const isPsdOperator = currentUser?.role === 'operator_psd';

    const readyBatches = useMemo(() => {
        const batches: PackagingTask[] = [];

        // 1. Process AGRO runs
        if (!typeFilter || typeFilter === 'AGRO') {
            (productionRunsList || []).forEach(run => {
                if (run.status !== 'ongoing' && run.status !== 'paused' && run.status !== 'completed') {
                    return;
                }

                (run.batches || []).forEach(batch => {
                    if (batch.status === 'completed') {
                         const producedForBatch = (finishedGoodsList || [])
                            .reduce((sum, fg) => {
                                let weightFromThisBatch = 0;
                                if (fg.batchSplit && fg.batchSplit.length > 0) {
                                    const part = fg.batchSplit.find(s => s.batchId === batch.id);
                                    if (part) {
                                        weightFromThisBatch = part.weight;
                                    }
                                } else if (fg.batchId === batch.id) {
                                    // Fallback for items created before batchSplit logic
                                    weightFromThisBatch = fg.quantityKg;
                                }
                                return sum + weightFromThisBatch;
                            }, 0);
                        
                        const actualBatchWeight = (run.actualIngredientsUsed || [])
                            .filter(c => c.batchId === batch.id && !c.isAnnulled)
                            .reduce((sum, c) => sum + c.actualConsumedQuantityKg, 0);

                        if (actualBatchWeight > 0 && Math.round(producedForBatch * 100) < Math.round(actualBatchWeight * 100)) {
                             batches.push({
                                type: 'AGRO',
                                run,
                                batch,
                                produced: producedForBatch,
                                pending: actualBatchWeight - producedForBatch,
                                endTime: batch.endTime ? new Date(batch.endTime).getTime() : 0,
                                actualBatchWeight: actualBatchWeight
                            });
                        }
                    }
                });
            });
        }

        // 2. Process PSD tasks
        if (!typeFilter || typeFilter === 'PSD') {
            (psdTasks || []).forEach(task => {
                 if (task.status !== 'ongoing' && task.status !== 'completed') {
                    return;
                }

                (task.batches || []).forEach(batch => {
                    if (batch.status === 'completed') {
                        // PSD tracks production directly in the batch
                        const producedForBatch = (batch.producedGoods || [])
                            .filter(g => !g.isAnnulled)
                            .reduce((sum, g) => sum + g.producedWeight, 0);

                        // PSD tracks consumption in consumedPallets
                        const actualBatchWeight = (batch.consumedPallets || [])
                            .reduce((sum, c) => sum + c.consumedWeight, 0);

                        if (actualBatchWeight > 0 && Math.round(producedForBatch * 100) < Math.round(actualBatchWeight * 100)) {
                             batches.push({
                                type: 'PSD',
                                run: task,
                                batch,
                                produced: producedForBatch,
                                pending: actualBatchWeight - producedForBatch,
                                endTime: batch.endTime ? new Date(batch.endTime).getTime() : 0,
                                actualBatchWeight: actualBatchWeight
                            });
                        }
                    }
                });
            });
        }

        return batches.sort((a, b) => a.endTime - b.endTime);
    }, [productionRunsList, psdTasks, finishedGoodsList, typeFilter]);

    const handleRegisterClick = (item: PackagingTask) => {
        setSelectedItemForRegistration(item);
    };

    const handleClearFilter = () => {
        handleSetView(View.PackagingOperator, {});
    };

    const handleConfirmRegistration = (weight: number) => {
        if (!selectedItemForRegistration) return { success: false, message: 'Błąd danych.' };
        
        const { type, run, batch } = selectedItemForRegistration;
        
        if (type === 'AGRO') {
            const result = handleRegisterFgForAgro(run.id, weight);
            if (result.success && result.newPallet) {
                modalHandlers.openNetworkPrintModal({
                    type: 'finished_good',
                    data: result.newPallet,
                    onSuccess: () => {
                        showToast(`Wysłano etykietę ${result.newPallet!.displayId} do druku.`, 'success');
                    }
                });
                setSelectedItemForRegistration(null);
            } else {
                 showToast(result.message, 'error');
            }
            return result;
        } else {
            // Handle PSD
             const result = handleUpdatePsdTask(run.id, {
                type: 'REGISTER_FG',
                payload: { batchId: batch.id, producedWeight: weight }
            });

            if (result.success && result.newPallet) {
                modalHandlers.openNetworkPrintModal({
                    type: 'finished_good',
                    data: result.newPallet,
                    context: 'psd_production', // Special context for PSD labels if needed
                    onSuccess: () => {
                         showToast(`Wysłano etykietę PSD ${result.newPallet!.displayId} do druku.`, 'success');
                    }
                });
                setSelectedItemForRegistration(null);
            } else {
                showToast(result.message, 'error');
            }
            return result;
        }
    };
    
    const handleConfirmReturn = () => {
        if (!itemToReturn) return;
        const { type, run, batch, pending } = itemToReturn;

        if (type === 'AGRO') {
            const result = handleReturnRemainderToProduction(run.id, batch.id, pending);
            if (result.success && result.newPallet) {
                modalHandlers.openNetworkPrintModal({
                    type: 'finished_good',
                    data: result.newPallet,
                    context: 'remainder_return'
                });
                showToast('Resztka produkcyjna została zarejestrowana.', 'success');
            } else {
                showToast(result.message, 'error');
            }
        } else {
             // PSD doesn't have a dedicated return-to-production flow that creates a pallet yet.
             // We'll just show a toast for now or implement if needed.
             showToast('Zwrot resztek dla PSD nie jest jeszcze w pełni obsługiwany (brak generowania etykiety).', 'info');
             // Ideally we should call a function in PsdContext to mark it as returned/closed.
        }
        setItemToReturn(null);
    };
    
    // We need to adapt the ProductionRun prop for the modal since it expects ProductionRun but PsdTask has similar structure
    const getRunForModal = (task: PackagingTask | null) => {
        if (!task) return null;
        // Force casting because PsdTask is compatible enough for display purposes in the modal
        return task.run as any as ProductionRun; 
    };

    return (
        <>
            <div className="p-4 md:p-6 bg-slate-50 dark:bg-secondary-900 h-full flex flex-col">
                <header className="flex-shrink-0 flex flex-col sm:flex-row sm:items-center justify-between mb-6 border-b dark:border-secondary-700 pb-3 gap-4">
                    <div className="flex items-center">
                        <CubeIcon className="h-8 w-8 text-primary-600 dark:text-primary-400 mr-3" />
                        <h2 className="text-2xl font-semibold text-primary-700 dark:text-primary-300">Panel Operatora Pakowania</h2>
                    </div>
                    {typeFilter && (
                        <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/30 px-3 py-1.5 rounded-full border border-blue-200 dark:border-blue-800">
                            <span className="text-sm font-medium text-blue-700 dark:text-blue-300 uppercase tracking-wider">Filtr: {typeFilter}</span>
                            {!isPsdOperator && (
                                <button 
                                    onClick={handleClearFilter}
                                    className="p-0.5 rounded-full hover:bg-blue-100 dark:hover:bg-blue-800 text-blue-500"
                                    title="Wyczyść filtr"
                                >
                                    <XMarkIcon className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                    )}
                </header>
                
                <div className="flex-grow overflow-auto">
                    {readyBatches.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full bg-white dark:bg-secondary-800 rounded-lg shadow-sm p-8 text-center">
                            <CheckCircleIcon className="h-20 w-20 text-green-500 mb-6" />
                            <h3 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-2">Brak partii do spakowania</h3>
                            <p className="text-gray-600 dark:text-gray-400 max-w-md">
                                {typeFilter 
                                    ? `Nie znaleziono żadnych szarż typu ${typeFilter} oczekujących na rejestrację.`
                                    : "Nie ma żadnych szarż zakończonych przez produkcję (Agro/PSD), które wymagałyby rejestracji."
                                }
                            </p>
                            {typeFilter && !isPsdOperator && (
                                <Button onClick={handleClearFilter} variant="secondary" className="mt-4">Pokaż wszystkie zlecenia</Button>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <Alert 
                                type="info" 
                                message={`Gotowe do pakowania: ${readyBatches.length} szarż`} 
                                details="Poniższa lista zawiera wyłącznie szarże, których produkcja została oficjalnie zakończona." 
                            />
                            
                            {readyBatches.map((item) => {
                                const { type, run, batch, produced, pending, endTime, actualBatchWeight } = item;
                                const recipeName = (run as any).recipeName || (run as any).name; // PsdTask uses name/recipeName
                                return (
                                <div key={`${type}-${batch.id}`} className="bg-white dark:bg-secondary-800 p-4 rounded-lg shadow-md border-l-4 border-green-500 flex flex-col sm:flex-row justify-between items-center gap-4 transition-transform hover:scale-[1.01]">
                                    <div className="flex-grow w-full">
                                        <div className="flex flex-wrap items-center gap-2 mb-2">
                                            <span className="px-2 py-1 text-xs font-bold rounded bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200 flex items-center gap-1">
                                                <CheckCircleIcon className="h-3 w-3"/>
                                                {type}
                                            </span>
                                            <span className="px-2 py-1 text-xs font-medium rounded bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 flex items-center gap-1">
                                                <ClockIcon className="h-3 w-3"/>
                                                {formatDate(new Date(endTime).toISOString(), true)}
                                            </span>
                                            <span className="text-sm font-mono text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-secondary-700 px-2 py-0.5 rounded">{run.id} / {batch.id.split('-').pop()}</span>
                                        </div>
                                        <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200">{recipeName}</h3>
                                        <p className="text-md text-gray-600 dark:text-gray-300 mt-1">
                                            Szarża #{batch.batchNumber} | Cel całkowity: <strong>{actualBatchWeight.toFixed(2)} kg</strong>
                                        </p>
                                        <div className="mt-3 flex items-center gap-4 text-sm">
                                            <div className="flex flex-col">
                                                <span className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wide">Już spakowano</span>
                                                <span className="text-orange-600 font-bold text-lg">
                                                    {produced.toFixed(2)} kg
                                                </span>
                                            </div>
                                            <div className="w-px h-8 bg-gray-300 dark:bg-gray-600"></div>
                                            <div className="flex flex-col">
                                                <span className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wide">Pozostało do spakowania</span>
                                                <span className="font-bold text-lg text-gray-800 dark:text-gray-200">{pending > 0.001 ? pending.toFixed(2) : '0.00'} kg</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex-shrink-0 flex flex-col gap-2 w-full sm:w-auto">
                                        <Button 
                                            onClick={() => handleRegisterClick(item)} 
                                            className="w-full sm:w-auto py-4 px-8 text-lg shadow-lg hover:shadow-xl transition-all bg-green-600 hover:bg-green-700"
                                            leftIcon={<PlusIcon className="h-6 w-6" />}
                                            disabled={pending < 0.01}
                                        >
                                            Rejestruj Paletę
                                        </Button>
                                        {pending > 0.01 && (
                                            <Button
                                                onClick={() => setItemToReturn(item)}
                                                variant="secondary"
                                                className="w-full sm:w-auto text-xs"
                                                leftIcon={<ArrowUturnLeftIcon className="h-4 w-4" />}
                                            >
                                                Zwróć Resztę ({pending.toFixed(2)} kg)
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            )})}
                        </div>
                    )}
                </div>
            </div>
            <RegisterFinishedGoodPalletModal 
                isOpen={!!selectedItemForRegistration} 
                onClose={() => setSelectedItemForRegistration(null)} 
                onConfirm={handleConfirmRegistration} 
                run={getRunForModal(selectedItemForRegistration)} 
            />
            {itemToReturn && (
                <ConfirmationModal
                    isOpen={!!itemToReturn}
                    onClose={() => setItemToReturn(null)}
                    onConfirm={handleConfirmReturn}
                    title="Potwierdź Zwrot Resztki"
                    message={`Czy na pewno chcesz zwrócić pozostałe ${itemToReturn.pending.toFixed(2)} kg produktu do ponownego użycia? ${itemToReturn.type === 'AGRO' ? 'Zostanie wygenerowana osobna etykieta.' : ''}`}
                    confirmButtonText={itemToReturn.type === 'AGRO' ? "Tak, zwróć i drukuj etykietę" : "Tak, zwróć"}
                />
            )}
        </>
    );
};

export default PackagingOperatorPage;