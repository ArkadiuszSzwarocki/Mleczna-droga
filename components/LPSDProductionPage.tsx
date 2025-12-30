
import React, { useState, useMemo, useRef } from 'react';
import { PsdTask, PsdBatch, PsdFinishedGood, View, Recipe, PsdConsumedMaterial, AdjustmentOrder, RawMaterialLogEntry, Permission, ProductionEvent } from '../types';
import Button from './Button';
import Alert from './Alert';
import BeakerIcon from './icons/BeakerIcon';
import PlayIcon from './icons/PlayIcon';
import CheckCircleIcon from './icons/CheckCircleIcon';
import PlusIcon from './icons/PlusIcon';
import StopIcon from './icons/StopIcon';
import AnnulPsdFgModal from './AnnulPsdFgModal';
import RegisterPsdFgModal from './RegisterPsdFgModal';
import EndPsdTaskConfirmModal from './EndPsdTaskConfirmModal';
import SetBatchSizeModal from './SetBatchSizeModal';
import { formatDate, getBlockInfo } from '../src/utils';
import ConfirmationModal from './ConfirmationModal';
import ClipboardListIcon from './icons/ClipboardListIcon';
import AddPsdBatchNotesModal from './AddPsdBatchNotesModal';
import { useAppContext } from './contexts/AppContext';
import { useUIContext } from './contexts/UIContext';
import { useAuth } from './contexts/AuthContext';
import { usePsdContext } from './contexts/PsdContext';
import ConsumeForPsdModal from './ConsumeForPsdModal';
import ReturnPsdConsumptionModal from './ReturnPsdConsumptionModal';
import XCircleIcon from './icons/XCircleIcon';
import ConsumeAdjustmentBucketModal from './ConsumeAdjustmentBucketModal';
import { useWarehouseContext } from './contexts/WarehouseContext';
import ShieldCheckIcon from './icons/ShieldCheckIcon';
import AdjustmentsHorizontalIcon from './icons/AdjustmentsHorizontalIcon';
import ExclamationTriangleIcon from './icons/ExclamationTriangleIcon';
import CubeIcon from './icons/CubeIcon';
import Input from './Input';
import QrCodeIcon from './icons/QrCodeIcon';
import ChevronLeftIcon from './icons/ChevronLeftIcon';
import ChevronRightIcon from './icons/ChevronRightIcon';
import ArrowUturnLeftIcon from './icons/ArrowUturnLeftIcon';
import { PSD_WAREHOUSE_ID } from '../constants';
import ProductionEventLog from './ProductionEventLog';
import ProductionStatusBar from './ProductionStatusBar';

const BatchStatusCard: React.FC<{ batch: PsdBatch, isActive: boolean, isCollapsed: boolean, onClick: () => void }> = ({ batch, isActive, isCollapsed, onClick }) => {
    let statusClass = 'bg-gray-100 dark:bg-secondary-700 border-gray-300 dark:border-gray-600';
    let dotClass = 'bg-gray-400';
    if (batch.status === 'completed') {
        statusClass = 'bg-green-50 dark:bg-green-900/30 border-green-300 dark:border-green-700';
        dotClass = 'bg-green-500';
    } else if (batch.status === 'ongoing') {
        statusClass = 'bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-600';
        dotClass = 'bg-blue-500 animate-pulse';
    }

    if (isCollapsed) {
        return null;
    }

    return (
        <button 
            onClick={onClick}
            disabled={batch.status !== 'planned'}
            className={`
                p-2 rounded-lg border-2 text-left w-full transition-all 
                ${statusClass} 
                ${isActive ? 'ring-2 ring-primary-500 border-primary-500' : ''} 
                ${batch.status === 'planned' ? 'hover:bg-blue-50 dark:hover:bg-secondary-600' : 'cursor-default'}
            `}
        >
            <div className="flex justify-between items-center mb-1">
                <p className="font-bold text-sm text-gray-800 dark:text-gray-200">#{batch.batchNumber}</p>
                <div className={`w-2 h-2 rounded-full ${dotClass}`} />
            </div>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">{batch.targetWeight} kg</p>
        </button>
    );
};

const LPSDProductionPage: React.FC = () => {
    const { handleSetView, recipes, adjustmentOrders, handleUpdateAdjustmentOrder, modalHandlers, findPalletByUniversalId, showToast, rawMaterialsLogList } = useAppContext();
    const { setRawMaterialsLogList } = useWarehouseContext();
    const { currentUser, checkPermission } = useAuth();
    const { psdTasks, handleUpdatePsdTask, handleConsumeForPsd, handleReturnPsdConsumption, handleAddProductionEvent, handleDeleteProductionEvent } = usePsdContext();
    
    const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
    const [itemToAnnul, setItemToAnnul] = useState<PsdFinishedGood | null>(null);
    const [isEndTaskConfirmOpen, setIsEndTaskConfirmOpen] = useState(false);
    const [isEndBatchConfirmOpen, setIsEndBatchConfirmOpen] = useState(false);
    const [isSetBatchSizeModalOpen, setIsSetBatchSizeModalOpen] = useState(false);
    const [taskToStart, setTaskToStart] = useState<PsdTask | null>(null);
    const [batchForNotes, setBatchForNotes] = useState<PsdBatch | null>(null);
    const [feedback, setFeedback] = useState<{type: 'success' | 'error' | 'info', message: string} | null>(null);
    const [isConsumeModalOpen, setIsConsumeModalOpen] = useState(false);
    const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
    const [isConsumeAdjustmentModalOpen, setIsConsumeAdjustmentModalOpen] = useState(false);
    
    const [isSidePanelOpen, setIsSidePanelOpen] = useState(true);

    const [quickScanValue, setQuickScanValue] = useState('');
    const [preScannedPallet, setPreScannedPallet] = useState<RawMaterialLogEntry | null>(null);
    const [scannedRequirement, setScannedRequirement] = useState<number | null>(null);

    const canExecute = checkPermission(Permission.EXECUTE_PRODUCTION_PSD);
    const canVerify = checkPermission(Permission.PROCESS_ANALYSIS) || currentUser?.role === 'lab' || currentUser?.role === 'admin';

    const activeTask = useMemo(() => (psdTasks || []).find(t => t.status === 'ongoing'), [psdTasks]);
    const activeBatch = useMemo(() => activeTask?.batches.find(b => b.status === 'ongoing'), [activeTask]);
    const isReadOnly = useMemo(() => !activeTask || activeTask.status !== 'ongoing', [activeTask]);

    const totalProduced = activeBatch ? activeBatch.producedGoods.filter(g => !g.isAnnulled).reduce((sum, p) => sum + p.producedWeight, 0) : 0;

    const adjustmentOrderForBatch = useMemo(() =>
        (adjustmentOrders || []).find((o: any) => o.batchId === activeBatch?.id && o.status !== 'completed' && o.status !== 'cancelled'),
    [adjustmentOrders, activeBatch]);

    const adjustmentReadyForPicking = useMemo(() =>
        (adjustmentOrders || []).find((o: any) => o.productionRunId === activeTask?.id && o.status === 'planned'),
    [adjustmentOrders, activeTask]);

    const activeTaskRecipe = useMemo(() => {
        if (!activeTask || !recipes) return null;
        return (recipes as Recipe[]).find(r => r.id === activeTask.recipeId);
    }, [activeTask, recipes]);
    
    const areAllIngredientsWeighed = useMemo(() => {
        if (!activeBatch || !activeTaskRecipe) return false;
        const finishedList = activeBatch.weighingFinishedIngredients || [];
        if (activeTaskRecipe.ingredients.length === 0) return false;
        return activeTaskRecipe.ingredients.every(ingredient => finishedList.includes(ingredient.productName));
    }, [activeBatch, activeTaskRecipe]);

    const allStepsConfirmed = useMemo(() => {
        if (!activeBatch) return false;
        const confirmation = activeBatch.confirmationStatus;
        if (!confirmation) return false;
        let nirsOk = confirmation.nirs === 'ok';
        if (confirmation.nirs === 'nok' && !isReadOnly) {
            const correctionOrder = (adjustmentOrders || []).find(o => o.batchId === activeBatch.id && o.status === 'completed');
            if (confirmation.nirs === 'nok' && correctionOrder) nirsOk = true;
        }
        return nirsOk && confirmation.sampling === 'ok';
    }, [activeBatch, adjustmentOrders, isReadOnly]);

    const scaledIngredients = useMemo(() => {
        if (!activeBatch || !activeTaskRecipe) return [];
        const baseWeight = activeTaskRecipe.ingredients.reduce((sum, ing) => sum + ing.quantityKg, 0);
        if (baseWeight === 0) return activeTaskRecipe.ingredients;
        const scale = activeBatch.targetWeight / baseWeight;
        return activeTaskRecipe.ingredients.map(ing => ({
            ...ing,
            quantityKg: ing.quantityKg * scale
        }));
    }, [activeTaskRecipe, activeBatch]);

    const consumedQuantities = useMemo(() => {
        if (!activeBatch) return {};
        return (activeBatch.consumedPallets || []).reduce((acc: Record<string, number>, consumed) => {
            acc[consumed.productName] = (acc[consumed.productName] || 0) + consumed.consumedWeight;
            return acc;
        }, {});
    }, [activeBatch]);

    const progress = activeBatch ? (totalProduced / activeBatch.targetWeight) * 100 : 0;
    const allBatchesCompleted = activeTask ? activeTask.batches.every(b => b.status === 'completed') : false;

    const handleStartProduction = (task: PsdTask) => {
        setTaskToStart(task);
        setIsSetBatchSizeModalOpen(true);
    };

    const handleInitializeBatches = (batchSize: number) => {
        if (!currentUser) { setFeedback({type: 'error', message: 'Błąd sesji użytkownika.'}); return; }
        if (taskToStart) {
            const result = handleUpdatePsdTask(taskToStart.id, { type: 'INITIALIZE_BATCHES', payload: { batchSize } });
            if (result.success) {
                handleSetView(View.LPSD_PRODUCTION);
            } else {
                alert(result.message);
            }
        }
        setIsSetBatchSizeModalOpen(false);
        setTaskToStart(null);
    };
    
    const handleStartNextBatch = () => {
        if (!currentUser) { setFeedback({type: 'error', message: 'Błąd sesji użytkownika.'}); return; }
        if (activeTask) {
            handleUpdatePsdTask(activeTask.id, { type: 'START_PLANNED_BATCH' });
        }
    };
    
    const handleConfirmRegistration = (weight: number) => {
        if (!currentUser || !activeTask || !activeBatch) return { success: false, message: 'Błąd: brak aktywnego zlecenia, partii lub sesji użytkownika.' };
        const result = handleUpdatePsdTask(activeTask.id, {
            type: 'REGISTER_FG',
            payload: { batchId: activeBatch.id, producedWeight: weight }
        });
        setFeedback({type: result.success ? 'success' : 'error', message: result.message});
        return result;
    };

    const handleAnnulFg = () => {
        if (!currentUser) { setFeedback({type: 'error', message: 'Błąd sesji użytkownika.'}); return; }
        if (!activeTask || !activeBatch || !itemToAnnul) return;
        handleUpdatePsdTask(activeTask.id, {
            type: 'ANNUL_FG',
            payload: { batchId: activeBatch.id, finishedGoodId: itemToAnnul.id }
        });
        setItemToAnnul(null);
    };

    const handleEndBatch = () => {
        if (!currentUser) { setFeedback({type: 'error', message: 'Błąd sesji użytkownika.'}); return; }
        if (activeTask && activeBatch) {
            handleUpdatePsdTask(activeTask.id, { type: 'END_BATCH', payload: { batchId: activeBatch.id } });
        }
        setIsEndBatchConfirmOpen(false);
    };

    const handleEndTask = () => {
        if (!currentUser) { setFeedback({type: 'error', message: 'Błąd sesji użytkownika.'}); return; }
        if(activeTask) {
            handleUpdatePsdTask(activeTask.id, { type: 'END_TASK' });
        }
        setIsEndTaskConfirmOpen(false);
    };
    
    const handleSaveBatchNotes = (notes: string) => {
        if (!currentUser) { setFeedback({type: 'error', message: 'Błąd sesji użytkownika.'}); return; }
        if (activeTask && batchForNotes) {
            handleUpdatePsdTask(activeTask.id, { type: 'UPDATE_BATCH_NOTES', payload: { batchId: batchForNotes.id, notes } });
        }
        setBatchForNotes(null);
    };
    
    const handleToggleWeighingFinished = (productName: string) => {
        if (!activeTask || !activeBatch) return;
        handleUpdatePsdTask(activeTask.id, { 
            type: 'TOGGLE_WEIGHING_STATUS', 
            payload: { batchId: activeBatch.id, productName } 
        });
    };

    const handleConfirmConsumption = (pallet: RawMaterialLogEntry, weightToConsume: number) => {
        if (!activeTask || !activeBatch) return { success: false, message: 'Brak aktywnego zlecenia.' };
        const consumeResult = handleConsumeForPsd(activeTask.id, activeBatch.id, pallet, weightToConsume);
        if (consumeResult.success && consumeResult.updatedPallet) {
            setRawMaterialsLogList(prev => 
                prev.map(p => p.id === consumeResult.updatedPallet.id ? consumeResult.updatedPallet : p)
            );
        }
        return { success: consumeResult.success, message: consumeResult.message };
    };
    
    const handleReturnPsdConsumptionLocal = (itemToReturn: PsdConsumedMaterial) => {
        if (!activeTask || !activeBatch) return;
        const result = handleReturnPsdConsumption(activeTask.id, activeBatch.id, itemToReturn);
        setFeedback({type: result.success ? 'success' : 'error', message: result.message});
        setIsReturnModalOpen(false);
    };

    const handleConsumeAdjustment = (bucketId: string, orderId: string) => {
        if (!activeTask || !activeBatch) return { success: false, message: 'Brak aktywnego zlecenia.' };
        const order = (adjustmentOrders as AdjustmentOrder[]).find(o => o.id === orderId);
        if (!order) return { success: false, message: 'Nie znaleziono zlecenia dosypki.' };
        const updateResult = handleUpdateAdjustmentOrder(orderId, { status: 'completed', completedAt: new Date().toISOString() });
        if (!updateResult.success) return { success: false, message: `Błąd aktualizacji: ${updateResult.message}` };
        const newConsumedItems: PsdConsumedMaterial[] = order.materials.map(mat => ({
            palletId: mat.sourcePalletId || `DOSYPKA-${bucketId}`,
            displayId: mat.sourcePalletId ? mat.sourcePalletId.slice(-6) : `DOSYPKA-${bucketId}`,
            productName: mat.productName,
            consumedWeight: mat.pickedQuantityKg,
            isAdjustment: true,
        }));
        const result = handleUpdatePsdTask(activeTask.id, { type: 'CONSUME_ADJUSTMENT', payload: { batchId: activeBatch.id, consumedItems: newConsumedItems } });
        return { success: result.success, message: result.success ? `Dosypka z pojemnika ${bucketId} została zużyta.` : result.message };
    };
    
    const handleQuickScanSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const scanValue = quickScanValue.trim();
        if (!scanValue) return;
        setFeedback(null);

        const result = findPalletByUniversalId(scanValue);
        if (!result || result.type !== 'raw') {
            setFeedback({ type: 'error', message: `Nie znaleziono palety surowca o ID: ${scanValue}` });
            setQuickScanValue('');
            return;
        }
        const pallet = result.item as RawMaterialLogEntry;
        const blockInfo = getBlockInfo(pallet);
        if (blockInfo.isBlocked) {
            setFeedback({ type: 'error', message: `Paleta ${pallet.palletData.nrPalety} jest zablokowana: ${blockInfo.reason}` });
             setQuickScanValue('');
            return;
        }

        if (pallet.currentLocation !== PSD_WAREHOUSE_ID) {
            setFeedback({ 
                type: 'error', 
                message: `Błąd: Paleta ${pallet.palletData.nrPalety} znajduje się w lokalizacji ${pallet.currentLocation || 'brak'}. Surowiec musi znajdować się w magazynie ${PSD_WAREHOUSE_ID}, aby mógł zostać zużyty in tej produkcji.` 
            });
            setQuickScanValue('');
            return;
        }

        const ingredientDef = activeTaskRecipe?.ingredients.find(i => i.productName === pallet.palletData.nazwa);
        if (!ingredientDef || !activeBatch || !activeTaskRecipe) {
            setFeedback({ type: 'error', message: `Produkt "${pallet.palletData.nazwa}" nie występuje w recepturze.` });
             setQuickScanValue('');
            return;
        }
        
        const baseWeight = activeTaskRecipe.ingredients.reduce((sum, ing) => sum + ing.quantityKg, 0);
        const scale = activeBatch.targetWeight / baseWeight;
        const targetForBatch = ingredientDef.quantityKg * scale;
        const remaining = Math.max(0, targetForBatch - (consumedQuantities[ingredientDef.productName] || 0));

        setScannedRequirement(remaining);
        setPreScannedPallet(pallet);
        setIsConsumeModalOpen(true);
        setQuickScanValue('');
    };
    
    const handleStartPickingLocal = (order: AdjustmentOrder) => {
        modalHandlers.openAssignAdjustmentToProductionModal(order, (updatedOrder: AdjustmentOrder) => {
             modalHandlers.openAdjustmentPickingModal(updatedOrder);
        });
    };

    const handleAddEventLocal = (event: Omit<ProductionEvent, 'id' | 'timestamp' | 'user'>) => {
        if (!activeTask) return;
        handleAddProductionEvent(activeTask.id, event);
    };

    const handleDeleteEventLocal = (eventId: string) => {
        if (!activeTask) return;
        handleDeleteProductionEvent(activeTask.id, eventId);
    };

    const getBatchStatusIndicator = () => {
        if (!activeBatch || totalProduced === 0) return null;
        if (allStepsConfirmed) {
            return (
                <div className="bg-green-100 dark:bg-green-900/50 border border-green-500 text-green-800 dark:text-green-200 px-3 py-1 rounded-full flex items-center gap-2 font-bold shadow-sm whitespace-nowrap">
                    <ShieldCheckIcon className="h-4 w-4" />
                    <span className="text-xs">OK</span>
                </div>
            );
        }
        if (activeBatch.confirmationStatus?.nirs === 'nok' && adjustmentOrderForBatch) {
             return (
                <div className="bg-orange-100 dark:bg-orange-900/50 border border-orange-500 text-orange-800 dark:text-orange-200 px-3 py-1 rounded-full flex items-center gap-2 font-bold shadow-md animate-fadeIn">
                    <AdjustmentsHorizontalIcon className="h-4 w-4" />
                    <span className="text-xs">Korekta</span>
                </div>
            );
        }
        return (
            <div className="bg-yellow-100 dark:bg-yellow-900/50 border border-yellow-500 text-yellow-800 dark:text-yellow-200 px-3 py-1 rounded-full flex items-center gap-2 font-bold shadow-sm whitespace-nowrap">
                <ExclamationTriangleIcon className="h-4 w-4" />
                <span className="text-xs">LAB?</span>
            </div>
        );
    };

    if (!activeTask) {
        const plannedTasks = (psdTasks || []).filter(t => t.status === 'planned');
        return (
            <div className="p-4 md:p-6">
                 <h2 className="text-2xl font-semibold text-primary-700 dark:text-primary-300 mb-4">Wybierz Zlecenie do Rozpoczęcia</h2>
                 {plannedTasks.length > 0 ? (
                    <div className="space-y-3">
                        {plannedTasks.map(task => (
                             <div key={task.id} className="p-4 bg-white dark:bg-secondary-800 rounded-lg shadow-md flex justify-between items-center">
                                <div>
                                    <p className="font-bold">{task.name}</p>
                                    <p className="text-sm">{task.recipeName} - {task.targetQuantity} kg</p>
                                </div>
                                {canExecute && <Button onClick={() => handleStartProduction(task)} leftIcon={<PlayIcon className="h-5 w-5"/>}>Rozpocznij</Button>}
                            </div>
                        ))}
                    </div>
                 ) : (
                    <Alert type="info" message="Brak zaplanowanych zleceń produkcyjnych PSD." />
                 )}
                 {taskToStart && (
                    <SetBatchSizeModal
                        isOpen={isSetBatchSizeModalOpen}
                        onClose={() => setIsSetBatchSizeModalOpen(false)}
                        task={taskToStart}
                        onConfirm={handleInitializeBatches}
                    />
                 )}
            </div>
        );
    }
    
    return (
        <div className="h-full flex flex-col bg-slate-100 dark:bg-secondary-900 overflow-hidden relative">
            
            {/* --- MAIN CONTENT AREA --- */}
            <main className="flex-grow overflow-auto scrollbar-hide p-4 md:p-6">
                {!activeBatch ? (
                    <div className="flex flex-col items-center justify-center h-full bg-white dark:bg-secondary-800 rounded-xl p-8 shadow-sm">
                        {allBatchesCompleted ? (
                             <>
                                <CheckCircleIcon className="h-16 w-16 text-green-500 mb-4" />
                                <h3 className="text-xl font-semibold">Wszystkie partie zakończone!</h3>
                                <p className="text-gray-600 dark:text-gray-400 mb-4">Możesz teraz zakończyć całe zlecenie produkcyjne.</p>
                                {canExecute && <Button onClick={() => setIsEndTaskConfirmOpen(true)} variant="primary" className="bg-green-600 hover:bg-green-700">Zakończ Zlecenie</Button>}
                            </>
                        ) : (
                            <>
                                <PlayIcon className="h-16 w-16 text-primary-500 mb-4" />
                                <h3 className="text-xl font-semibold">Brak aktywnej partii</h3>
                                <p className="text-gray-600 dark:text-gray-400 mb-4">Wybierz zaplanowaną partię z panelu bocznego, aby rozpocząć produkcję.</p>
                                {canExecute && <Button onClick={handleStartNextBatch} variant="primary">Rozpocznij Następną Partię</Button>}
                            </>
                        )}
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Alerts & Context */}
                        {adjustmentReadyForPicking && canExecute && (
                             <div className="animate-pulse">
                                <Alert type="info" message="Nowa Dosypka do Przygotowania" details={
                                    <div className="flex justify-between items-center">
                                        <span>Nowe zlecenie korekty czeka na przygotowanie materiałów.</span>
                                        <Button onClick={() => handleStartPickingLocal(adjustmentReadyForPicking)} className="text-xs">Rozpocznij kompletację</Button>
                                    </div>
                                }/>
                            </div>
                        )}

                        {adjustmentOrderForBatch && adjustmentOrderForBatch.status === 'processing' && canExecute && (
                            <div className="animate-pulse">
                                <Alert type="warning" message="Oczekująca Dosypka" details={
                                    <div className="flex justify-between items-center">
                                        <span>Skompletowana dosypka w pojemniku <strong>{adjustmentOrderForBatch.preparationLocation}</strong> jest gotowa do dodania.</span>
                                        <Button onClick={() => setIsConsumeAdjustmentModalOpen(true)} className="text-xs">Potwierdź zużycie</Button>
                                    </div>
                                }/>
                            </div>
                        )}

                        {feedback && (
                            <div className="transition-all animate-fadeIn">
                                <Alert type={feedback.type} message={feedback.message}/>
                            </div>
                        )}

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Progress info */}
                            <div className="bg-white dark:bg-secondary-800 p-4 rounded-xl shadow-sm border dark:border-secondary-700 space-y-4 h-fit">
                                <div className="flex justify-between items-center border-b pb-2 dark:border-secondary-700">
                                    <h3 className="text-lg font-bold">Postęp Partii #{activeBatch.batchNumber}</h3>
                                    <div className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-bold uppercase tracking-wider">W toku</div>
                                </div>

                                <div>
                                    <div className="flex justify-between text-xs mb-1 font-medium text-gray-500">
                                        <span>Realizacja produkcji</span>
                                        <span>{totalProduced.toFixed(2)} / {activeBatch.targetWeight.toFixed(2)} kg</span>
                                    </div>
                                    <div className="w-full bg-gray-100 dark:bg-secondary-700 rounded-full h-4 shadow-inner overflow-hidden">
                                        <div className="bg-primary-600 h-4 rounded-full transition-all duration-500" style={{width: `${Math.min(progress, 100)}%` }}></div>
                                    </div>
                                </div>
                            </div>

                            {/* Recipe & Consumption */}
                             <div className="bg-white dark:bg-secondary-800 p-4 rounded-xl shadow-sm border dark:border-secondary-700 flex flex-col h-fit pb-12">
                                <h3 className="text-lg font-bold border-b pb-2 dark:border-secondary-700 mb-3 flex items-center gap-2">
                                    <BeakerIcon className="h-5 w-5 text-primary-500" />
                                    Receptura ({activeBatch.targetWeight} kg)
                                </h3>
                                
                                {canExecute && (
                                    <form onSubmit={handleQuickScanSubmit} className="mb-4 flex gap-2">
                                        <div className="flex-grow">
                                            <Input
                                                label=""
                                                placeholder="Skanuj paletę..."
                                                value={quickScanValue}
                                                onChange={e => setQuickScanValue(e.target.value)}
                                                icon={<QrCodeIcon className="h-5 w-5 text-gray-400" />}
                                                className="text-sm !py-1.5"
                                                autoFocus
                                            />
                                        </div>
                                        <Button type="submit" className="!py-1.5">Zużyj</Button>
                                    </form>
                                )}
                                
                                <div className="flex-grow overflow-y-auto scrollbar-hide space-y-2 pr-2">
                                   {scaledIngredients.map(ing => {
                                        const consumed = consumedQuantities[ing.productName] || 0;
                                        const progress = ing.quantityKg > 0 ? (consumed / ing.quantityKg) * 100 : 0;
                                        const isConsumed = progress >= 99.9;
                                        const isWeighingFinished = activeBatch.weighingFinishedIngredients?.includes(ing.productName);
                                        const borderColor = isWeighingFinished ? 'border-green-500' : 'border-slate-100 dark:border-secondary-700';
                                        const bgColor = isWeighingFinished ? 'bg-green-50 dark:bg-green-900/40' : 'bg-slate-50 dark:bg-secondary-900/50';

                                        return (
                                            <div key={ing.productName} className={`p-2 rounded-lg border transition-all ${borderColor} ${bgColor}`}>
                                                <div className="flex justify-between items-center mb-1">
                                                    <p className="font-semibold text-sm">{ing.productName}</p>
                                                    {canExecute && (
                                                        <div className="flex gap-1">
                                                            {isWeighingFinished && (
                                                                <button onClick={() => handleToggleWeighingFinished(ing.productName)} className="p-1 rounded-full bg-green-500 text-white hover:bg-green-600 transition-colors" title="Cofnij">
                                                                    <ArrowUturnLeftIcon className="h-3 w-3" />
                                                                </button>
                                                            )}
                                                            <button onClick={() => handleToggleWeighingFinished(ing.productName)} className={`p-1 rounded-full ${isWeighingFinished ? 'bg-green-100 text-white' : 'bg-gray-200 dark:bg-secondary-700 text-gray-400 hover:text-green-600 hover:bg-green-50 transition-all'}`} title={isWeighingFinished ? "Zakończono" : "Zakończ"} disabled={isWeighingFinished}>
                                                                <CheckCircleIcon className="h-3 w-3" />
                                                            </button>
                                                        </div>
                                                    )}
                                                    {!canExecute && isWeighingFinished && <CheckCircleIcon className="h-4 w-4 text-green-500" />}
                                                </div>
                                                <p className="text-[10px] text-gray-500 dark:text-gray-400">
                                                    Zużyto: {consumed.toFixed(2)} kg / {ing.quantityKg.toFixed(2)} kg
                                                </p>
                                                 <div className="w-full bg-gray-200 dark:bg-secondary-700 rounded-full h-1 mt-1">
                                                    <div className={`h-1 rounded-full ${isConsumed ? 'bg-green-500' : 'bg-primary-600'}`} style={{ width: `${Math.min(progress, 100)}%` }}></div>
                                                </div>
                                            </div>
                                        )
                                   })}
                                </div>
                                {canExecute && (
                                    <div className="mt-4 pt-4 border-t dark:border-secondary-700 grid grid-cols-1 gap-2">
                                        <Button onClick={() => setIsReturnModalOpen(true)} variant="secondary" className="text-xs">Zwróć Surowiec</Button>
                                    </div>
                                )}
                             </div>
                        </div>

                        <div className="grid grid-cols-1">
                             <ProductionEventLog 
                                events={activeTask.events || []} 
                                onAddEvent={handleAddEventLocal} 
                                onDeleteEvent={handleDeleteEventLocal}
                                isReadOnly={isReadOnly}
                            />
                        </div>
                    </div>
                )}
            </main>

            {/* --- SIDE CONTROL PANEL --- */}
            <aside 
                className={`flex-shrink-0 bg-white dark:bg-secondary-800 border-l dark:border-secondary-700 shadow-xl transition-all duration-300 relative flex flex-col overflow-visible ${isSidePanelOpen ? 'w-full sm:w-72' : 'w-0'}`}
            >
                {/* Toggle Button "Tab" - Always visible outside the container when collapsed */}
                <button 
                    onClick={() => setIsSidePanelOpen(!isSidePanelOpen)}
                    className="absolute top-1/2 -left-5 bg-white dark:bg-secondary-800 border dark:border-secondary-700 rounded-full p-1.5 shadow-xl z-[100] hover:text-primary-600 transition-colors text-gray-600 dark:text-gray-200"
                    title={isSidePanelOpen ? "Zwiń panel" : "Rozwiń panel"}
                >
                    {isSidePanelOpen ? <ChevronRightIcon className="h-6 w-6" /> : <ChevronLeftIcon className="h-6 w-6" />}
                </button>

                {isSidePanelOpen && (
                    <div className="flex flex-col h-full animate-fadeIn overflow-hidden">
                        {/* Sidebar Header (Recipe Info) */}
                        <div className="p-4 border-b dark:border-secondary-700 flex flex-col">
                            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200 leading-tight">{activeTask.recipeName}</h2>
                            <p className="text-[10px] text-gray-500 dark:text-gray-400 font-mono mt-1">{activeTask.name}</p>
                        </div>

                        {/* Sidebar Actions */}
                        <div className="p-4 space-y-3 flex flex-col items-center">
                            {activeBatch && canExecute && (
                                <>
                                    <Button 
                                        onClick={() => setBatchForNotes(activeBatch)} 
                                        variant="secondary" 
                                        className="h-10 shadow-sm font-bold w-full max-w-[240px] text-sm flex justify-center items-center" 
                                        leftIcon={<ClipboardListIcon className="h-5 w-5"/>}
                                        title="Notatki"
                                    >
                                        Notatki
                                    </Button>
                                    
                                    {(canExecute || canVerify) && (
                                        <Button 
                                            onClick={() => handleSetView(View.ProductionRelease, { runId: activeTask.id, batchId: activeBatch.id, returnView: View.LPSD_PRODUCTION, returnViewParams: { taskId: activeTask.id } })} 
                                            variant="secondary" 
                                            className="h-10 shadow-sm font-bold w-full max-w-[240px] text-sm flex justify-center items-center"
                                            disabled={!areAllIngredientsWeighed}
                                            title={!areAllIngredientsWeighed ? "Wymagane zakończenie naważania wszystkich składników" : "Potwierdzenia LAB"}
                                            leftIcon={<ShieldCheckIcon className="h-5 w-5" />}
                                        >
                                            Potwierdzenia LAB
                                        </Button>
                                    )}

                                    <Button 
                                        onClick={() => handleSetView(View.PackagingOperator, { typeFilter: 'PSD' })} 
                                        variant="secondary" 
                                        className="h-10 shadow-sm font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-300 border-indigo-200 w-full max-w-[240px] text-sm flex justify-center items-center" 
                                        leftIcon={<CubeIcon className="h-5 w-5"/>}
                                        title="Pakowanie"
                                    >
                                        Pakowanie
                                    </Button>

                                    <Button 
                                        onClick={() => setIsEndBatchConfirmOpen(true)} 
                                        variant="danger" 
                                        leftIcon={<StopIcon className="h-5 w-5"/>} 
                                        className="h-10 shadow-sm font-bold w-full max-w-[240px] text-sm flex justify-center items-center mt-2"
                                        disabled={!allStepsConfirmed}
                                        title={totalProduced === 0 ? 'Brak wyprodukowanych towarów.' : (!allStepsConfirmed ? 'Wymagane ukończenie LAB' : 'Zakończ partię')}
                                    >
                                        Zakończ Partię
                                    </Button>
                                </>
                            )}
                        </div>

                        {/* Sidebar Batch List */}
                        <div className="flex-grow flex flex-col overflow-hidden px-4">
                            <div className="py-2 border-t dark:border-secondary-700 flex justify-between items-center">
                                <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Status Partii</h3>
                                {getBatchStatusIndicator()}
                            </div>
                            
                            <div className="pb-3 grid grid-cols-2 gap-2 overflow-y-auto scrollbar-hide">
                                {activeTask.batches.map(batch => (
                                    <BatchStatusCard 
                                        key={batch.id} 
                                        batch={batch} 
                                        isCollapsed={false}
                                        isActive={activeBatch?.id === batch.id}
                                        onClick={() => {
                                            if (!currentUser) { setFeedback({type: 'error', message: 'Błąd sesji użytkownika.'}); return; }
                                            if (batch.status === 'planned' && !activeBatch && canExecute) {
                                                handleUpdatePsdTask(activeTask.id, { type: 'START_PLANNED_BATCH', payload: { batchId: batch.id } });
                                            }
                                        }}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Sidebar Footer */}
                        <div className="p-4 border-t dark:border-secondary-700 bg-slate-50 dark:bg-secondary-900/50">
                            <div className="flex justify-between items-center text-[10px] text-gray-500 uppercase font-bold mb-2">
                                <span>Suma zamówienia</span>
                                <span>{activeTask.targetQuantity} kg</span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-secondary-700 rounded-full h-1.5 overflow-hidden">
                                 <div className="bg-primary-500 h-1.5 rounded-full" style={{width: `${Math.min((totalProduced / activeTask.targetQuantity) * 100, 100)}%`}}></div>
                            </div>
                        </div>
                    </div>
                )}
            </aside>

            {/* Pasek statusu MES na dole */}
            <ProductionStatusBar 
                batch={activeBatch || null} 
                adjustment={adjustmentOrderForBatch} 
                isWeighingFinished={areAllIngredientsWeighed}
            />

            {/* Modals */}
            {activeBatch && <>
                <ConsumeForPsdModal isOpen={isConsumeModalOpen} onClose={() => { setIsConsumeModalOpen(false); setPreScannedPallet(null); setScannedRequirement(null); }} onConfirm={handleConfirmConsumption} rawMaterialsLogList={rawMaterialsLogList} batch={activeBatch} preScannedPallet={preScannedPallet} requiredQuantity={scannedRequirement} />
                <ReturnPsdConsumptionModal isOpen={isReturnModalOpen} onClose={() => setIsReturnModalOpen(false)} onConfirm={handleReturnPsdConsumptionLocal} batch={activeBatch} />
                <RegisterPsdFgModal isOpen={isRegisterModalOpen} onClose={() => setIsRegisterModalOpen(false)} onConfirm={handleConfirmRegistration} batch={activeBatch} recipeName={activeTask.recipeName} />
                <AnnulPsdFgModal isOpen={!!itemToAnnul} onClose={() => setItemToAnnul(null)} onConfirm={handleAnnulFg} itemToAnnul={itemToAnnul!} />
                <ConfirmationModal isOpen={isEndBatchConfirmOpen} onClose={() => setIsEndBatchConfirmOpen(false)} onConfirm={handleEndBatch} title="Zakończyć Partię?" message={`Czy na pewno chcesz zakończyć bieżącą partię #${activeBatch.batchNumber}?`} confirmButtonText="Tak, zakończ" />
                {batchForNotes && <AddPsdBatchNotesModal isOpen={!!batchForNotes} onClose={() => setBatchForNotes(null)} batch={batchForNotes} onSave={handleSaveBatchNotes} />}
                {canExecute && <ConsumeAdjustmentBucketModal isOpen={isConsumeAdjustmentModalOpen} onClose={() => setIsConsumeAdjustmentModalOpen(false)} onConfirm={handleConsumeAdjustment} order={adjustmentOrderForBatch} />}
            </>}
            {activeTask && <EndPsdTaskConfirmModal isOpen={isEndTaskConfirmOpen} onClose={() => setIsEndTaskConfirmOpen(false)} onConfirm={handleEndTask} task={activeTask} />}
        </div>
    );
};
export default LPSDProductionPage;
