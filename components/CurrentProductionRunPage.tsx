
import React, { useState, useMemo, useEffect, useCallback, useRef, useLayoutEffect } from 'react';
import ReactDOM from 'react-dom';
import { ProductionRun, RawMaterialLogEntry, FinishedGoodItem, Recipe, View, PsdBatch, Permission, AdjustmentOrder, User, AgroConsumedMaterial, ProductionEvent } from '../types';
import { useAppContext } from './contexts/AppContext';
import { useProductionContext } from './contexts/ProductionContext';
import Button from './Button';
import Alert from './Alert';
import ArrowLeftIcon from './icons/ArrowLeftIcon';
import PlayIcon from './icons/PlayIcon';
import PauseIcon from './icons/PauseIcon';
import StopIcon from './icons/StopIcon';
import { formatDate, getBlockInfo } from '../src/utils';
import EndProductionModal from './EndProductionModal';
import PauseProductionModal from './PauseProductionModal';
import ConfirmationModal from './ConfirmationModal';
import ArrowPathIcon from './icons/ArrowPathIcon';
import Input from './Input';
import ExclamationTriangleIcon from './icons/ExclamationTriangleIcon';
import CheckCircleIcon from './icons/CheckCircleIcon';
import { useAuth } from './contexts/AuthContext';
import EditIcon from './icons/EditIcon';
import TrashIcon from './icons/TrashIcon';
import ConsumeAdjustmentBucketModal from './ConsumeAdjustmentBucketModal';
import BeakerIcon from './icons/BeakerIcon';
import QrCodeIcon from './icons/QrCodeIcon';
import XCircleIcon from './icons/XCircleIcon';
import ShieldCheckIcon from './icons/ShieldCheckIcon';
import CubeIcon from './icons/CubeIcon';
import AdjustmentsHorizontalIcon from './icons/AdjustmentsHorizontalIcon';
import ClockRewindIcon from './icons/ClockRewindIcon';
import ArrowUturnLeftIcon from './icons/ArrowUturnLeftIcon';
import InformationCircleIcon from './icons/InformationCircleIcon';
import ProductionEventLog from './ProductionEventLog';
import ListBulletIcon from './icons/ListBulletIcon';
import PencilIcon from './icons/PencilIcon';
import ProductionStatusBar from './ProductionStatusBar';

const StartRequirementsInfo: React.FC<{ requirements: any[], triggerRect: DOMRect | null }> = ({ requirements, triggerRect }) => {
    const tooltipRef = useRef<HTMLDivElement>(null);
    const [coords, setCoords] = useState({ top: 0, left: 0 });

    useLayoutEffect(() => {
        if (!triggerRect || !tooltipRef.current) return;
        const tooltipHeight = tooltipRef.current.offsetHeight;
        const tooltipWidth = tooltipRef.current.offsetWidth;
        const padding = 10;
        let top = triggerRect.top;
        let left = triggerRect.left - tooltipWidth - 12;
        if (top + tooltipHeight > window.innerHeight - padding) top = window.innerHeight - tooltipHeight - padding;
        if (top < padding) top = padding;
        if (window.innerWidth < 640) {
            left = (window.innerWidth - tooltipWidth) / 2;
            top = (window.innerHeight - tooltipHeight) / 2;
        }
        setCoords({ top, left });
    }, [triggerRect, requirements]);

    if (!triggerRect) return null;

    return ReactDOM.createPortal(
        <div 
            ref={tooltipRef}
            style={{ top: `${coords.top}px`, left: `${coords.left}px` }}
            className="fixed w-72 bg-white dark:bg-secondary-800 border-2 border-primary-500/30 dark:border-secondary-600 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.4)] p-4 z-[9999] animate-fadeIn pointer-events-none max-h-[90vh] overflow-y-auto scrollbar-hide"
        >
            <h4 className="font-black text-[11px] text-gray-800 dark:text-gray-100 border-b dark:border-secondary-700 pb-2 mb-3 flex items-center gap-2 uppercase tracking-widest sticky top-0 bg-white dark:bg-secondary-800 z-10">
                <ShieldCheckIcon className="h-4 w-4 text-primary-500" />
                Checklista Stacji
            </h4>
            <div className="space-y-2.5">
                {requirements.map((req, idx) => (
                    <div key={idx} className="flex items-start gap-2.5">
                        {req.status === 'ok' ? (
                            <CheckCircleIcon className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                        ) : (
                            <XCircleIcon className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                        )}
                        <div className="flex-grow min-w-0">
                            <p className="font-bold text-gray-700 dark:text-gray-200 leading-none text-xs truncate" title={req.material}>
                                {req.stationId}: {req.material}
                            </p>
                            <p className={`text-[10px] mt-1 leading-tight ${req.status === 'ok' ? 'text-green-600 font-medium' : 'text-red-500 font-black uppercase'}`}>
                                {req.message}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </div>,
        document.body
    );
};

export const CurrentProductionRunPage: React.FC = () => {
    const { 
        viewParams, handleSetView, recipes, finishedGoodsList, 
        modalHandlers, adjustmentOrders, rawMaterialsLogList, 
        showToast, handleManualAgroConsumption,
        handleAnnulAgroConsumption, stationRawMaterialMapping
    } = useAppContext();
    const {
        productionRunsList, handlePauseProductionRun, handleResumeProductionRun,
        handleCompleteProductionRun, handleStartProductionRun, handleEndAgroBatch,
        handleStartNextAgroBatch, handleAddProductionEvent, handleDeleteProductionEvent,
        handleConsumeAgroAdjustment, handleMarkAgroIngredientWeighingFinished
    } = useProductionContext();
    const { currentUser, checkPermission } = useAuth();
    const canExecute = checkPermission(Permission.EXECUTE_PRODUCTION_AGRO);

    const [isEndModalOpen, setIsEndModalOpen] = useState(false);
    const [isPauseModalOpen, setIsPauseModalOpen] = useState(false);
    const [isEndBatchConfirmOpen, setIsEndBatchConfirmOpen] = useState(false);
    const [isConsumeAdjustmentModalOpen, setIsConsumeAdjustmentModalOpen] = useState(false);
    const [hoveredRunId, setHoveredRunId] = useState<string | null>(null);
    const [triggerRect, setTriggerRect] = useState<DOMRect | null>(null);
    const [isProcessingIngredient, setIsProcessingIngredient] = useState<string | null>(null);
    
    // Zarządzanie trybem AUTO / MANUAL
    const [isAutoMode, setIsAutoMode] = useState(true);
    
    // Lokalne wartości wag wpisane w pola input
    const [localWeights, setLocalWeights] = useState<Record<string, string>>({});

    const runId = viewParams?.runId;
    const run = useMemo(() => (productionRunsList || []).find(r => r.id === runId), [productionRunsList, runId]);
    const activeBatch = useMemo(() => run?.batches?.find(b => b.status === 'ongoing'), [run]);

    const adjustmentOrderForBatch = useMemo(() => 
        (adjustmentOrders || []).find((o: AdjustmentOrder) => o.batchId === activeBatch?.id && o.status !== 'completed' && o.status !== 'cancelled'),
    [adjustmentOrders, activeBatch]);

    const getRunRequirements = useCallback((r: ProductionRun) => {
        if (!r || !recipes) return [];
        const baseRecipe = (recipes as Recipe[]).find(recipe => recipe.id === r.recipeId);
        if (!baseRecipe) return [];
        return baseRecipe.ingredients.map(ing => {
            const stationId = Object.entries(stationRawMaterialMapping).find(([_, mat]) => mat === ing.productName)?.[0];
            const palletAtStation = stationId ? rawMaterialsLogList.find(p => p.currentLocation === stationId) : null;
            if (!stationId) return { material: ing.productName, stationId: 'BRAK', status: 'error', message: 'Brak przypisanej stacji' };
            if (!palletAtStation) return { material: ing.productName, stationId, status: 'error', message: `Stacja ${stationId} jest pusta` };
            const { isBlocked, reason } = getBlockInfo(palletAtStation);
            if (isBlocked) return { material: ing.productName, stationId, status: 'error', message: `Blokada: ${reason || 'nieznana'}` };
            return { material: ing.productName, stationId, status: 'ok', message: 'Gotowy' };
        });
    }, [recipes, stationRawMaterialMapping, rawMaterialsLogList]);

    const scaledIngredients = useMemo(() => {
        if (!activeBatch || !run || !recipes) return [];
        const baseRecipe = (recipes as Recipe[]).find(r => r.id === run.recipeId);
        if (!baseRecipe) return [];
        const baseWeight = baseRecipe.ingredients.reduce((sum, ing) => sum + ing.quantityKg, 0);
        const scale = activeBatch.targetWeight / (baseWeight || 1);
        return baseRecipe.ingredients.map(ing => ({
            ...ing,
            quantityKg: ing.quantityKg * scale,
        }));
    }, [run, recipes, activeBatch]);

    const consumedByIngredient = useMemo(() => {
        if (!run || !activeBatch) return {};
        return (run.actualIngredientsUsed || [])
            .filter(c => c.batchId === activeBatch.id && !c.isAnnulled)
            .reduce((acc: Record<string, number>, c) => {
                acc[c.productName] = (acc[c.productName] || 0) + c.actualConsumedQuantityKg;
                return acc;
            }, {});
    }, [run, activeBatch]);

    // Inicjalizacja localWeights z danych systemowych przy zmianie partii
    useEffect(() => {
        if (activeBatch) {
            const initial: Record<string, string> = {};
            scaledIngredients.forEach(ing => {
                const consumed = consumedByIngredient[ing.productName] || 0;
                if (consumed > 0) {
                    initial[ing.productName] = consumed.toFixed(1);
                }
            });
            setLocalWeights(initial);
        }
    }, [activeBatch?.id]);

    const totalConsumed = useMemo(() => 
        Object.values(consumedByIngredient).reduce((sum: number, val: any) => sum + (Number(val) || 0), 0),
    [consumedByIngredient]);

    const areAllIngredientsWeighed = useMemo(() => {
        if (!activeBatch || scaledIngredients.length === 0) return false;
        return scaledIngredients.every(ing => (consumedByIngredient[ing.productName] || 0) >= ing.quantityKg * 0.999);
    }, [activeBatch, scaledIngredients, consumedByIngredient]);

    const allStepsConfirmed = useMemo(() => {
        if (!activeBatch || !areAllIngredientsWeighed) return false;
        const conf = activeBatch.confirmationStatus;
        if (!conf) return false;
        return conf.nirs === 'ok' && conf.sampling === 'ok';
    }, [activeBatch, areAllIngredientsWeighed]);

    const handleConfirmOrCorrectWeight = async (productName: string) => {
        if (!run || !activeBatch) return;
        const typedValue = parseFloat(localWeights[productName]);
        
        if (isNaN(typedValue) || typedValue < 0) {
            showToast(`Wprowadź poprawną wagę dla ${productName}`, 'error');
            return;
        }

        setIsProcessingIngredient(productName);
        
        const currentSystemValue = consumedByIngredient[productName] || 0;
        const delta = typedValue - currentSystemValue;

        if (Math.abs(delta) > 0.001) {
            const res = handleManualAgroConsumption(run.id, activeBatch.id, productName, delta);
            if (res.type === 'success') {
                if (!activeBatch.weighingFinishedIngredients?.includes(productName)) {
                    handleMarkAgroIngredientWeighingFinished(run.id, activeBatch.id, productName);
                }
                showToast(`Zaktualizowano wagę ${productName}: ${typedValue.toFixed(1)} kg`, 'success');
            } else {
                showToast(res.message, 'error');
                // Przywracamy poprzednią wartość w razie błędu
                setLocalWeights(prev => ({ ...prev, [productName]: currentSystemValue.toFixed(1) }));
            }
        } else {
             // Jeśli wartość jest taka sama, tylko oznaczamy jako zakończone jeśli jeszcze nie jest
             if (!activeBatch.weighingFinishedIngredients?.includes(productName)) {
                handleMarkAgroIngredientWeighingFinished(run.id, activeBatch.id, productName);
             }
        }
        
        setIsProcessingIngredient(null);
    };

    const handleAutoWeighSingle = async (productName: string, targetWeight: number) => {
        if (!run || !activeBatch) return;
        setIsProcessingIngredient(productName);
        
        // Pokazujemy cel w oknie
        setLocalWeights(prev => ({ ...prev, [productName]: targetWeight.toFixed(1) }));
        
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const res = handleManualAgroConsumption(run.id, activeBatch.id, productName, targetWeight);
        if (res.type === 'success') {
            handleMarkAgroIngredientWeighingFinished(run.id, activeBatch.id, productName);
        } else {
            showToast(res.message, 'error');
            setIsAutoMode(false);
        }
        setIsProcessingIngredient(null);
    };

    // LOGIKA AUTOMATYZACJI
    useEffect(() => {
        if (!isAutoMode || !activeBatch || isProcessingIngredient || !canExecute) return;

        const nextIngredient = scaledIngredients.find(ing => {
            const isFinished = activeBatch.weighingFinishedIngredients?.includes(ing.productName);
            const stationId = Object.entries(stationRawMaterialMapping).find(([_, mat]) => mat === ing.productName)?.[0];
            return !isFinished && !!stationId;
        });

        if (nextIngredient) {
            handleAutoWeighSingle(nextIngredient.productName, nextIngredient.quantityKg);
        }
    }, [isAutoMode, activeBatch?.weighingFinishedIngredients, activeBatch?.status, isProcessingIngredient, scaledIngredients, stationRawMaterialMapping, canExecute]);

    const handleAutoAdjustmentConsume = async (productName: string, quantity: number) => {
        if (!run || !activeBatch || !adjustmentOrderForBatch) return;
        setIsProcessingIngredient(`adj-${productName}`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        const res = handleManualAgroConsumption(run.id, activeBatch.id, productName, quantity);
        if (res.type === 'success') {
            showToast(`[AUTO] Korekta: naważono ${quantity} kg ${productName}`, 'success');
            const remainingMaterials = adjustmentOrderForBatch.materials.filter(m => 
                m.productName !== productName && (m.quantityKg - m.pickedQuantityKg) > 0.01
            );
            if (remainingMaterials.length === 0) {
                 handleConfirmAdjustmentConsumption('STACJA', adjustmentOrderForBatch.id);
            }
        } else {
            showToast(res.message, 'error');
        }
        setIsProcessingIngredient(null);
    };

    const handleStartActions = () => {
        if (!run) return;
        if (run.status === 'planned') handleStartProductionRun(run.id);
        else handleStartNextAgroBatch(run.id);
    };

    const handleConfirmAdjustmentConsumption = (bucketId: string, orderId: string) => {
        if (!run || !activeBatch) return { success: false, message: 'Błąd sesji' };
        const order = (adjustmentOrders as AdjustmentOrder[]).find(o => o.id === orderId);
        if (!order) return { success: false, message: 'Nie znaleziono zlecenia dosypki' };
        const res = handleConsumeAgroAdjustment(run.id, activeBatch.id, order);
        if (res.success) {
            showToast(res.message, 'success');
            setIsConsumeAdjustmentModalOpen(false);
        }
        return res;
    };

    const handleUndoWeight = (productName: string) => {
        if (!run || !activeBatch) return;
        const lastConsumption = [...(run.actualIngredientsUsed || [])]
            .reverse()
            .find(c => c.batchId === activeBatch.id && c.productName === productName && !c.isAnnulled);
            
        if (lastConsumption) {
            handleAnnulAgroConsumption(run.id, lastConsumption.consumptionId);
            handleMarkAgroIngredientWeighingFinished(run.id, activeBatch.id, productName); 
            setLocalWeights(prev => {
                const next = { ...prev };
                delete next[productName];
                return next;
            });
            showToast(`Cofnięto naważanie dla ${productName}`, 'info');
        }
    };

    const getStatusBadge = (status: string) => {
        const styles: Record<string, string> = {
            planned: 'bg-gray-200 text-gray-800',
            ongoing: 'bg-blue-100 text-blue-800 animate-pulse',
            paused: 'bg-yellow-100 text-yellow-800',
            completed: 'bg-green-100 text-green-800'
        };
        return <span className={`px-2 py-1 text-[10px] font-bold rounded-full ${styles[status]}`}>{status.toUpperCase()}</span>;
    };

    if (!runId || !run) {
        return (
            <div className="p-6 h-full flex flex-col overflow-hidden">
                <h2 className="text-2xl font-black mb-6 tracking-tighter uppercase text-primary-700 dark:text-primary-300">Linia Produkcyjna AGRO</h2>
                <div className="flex-grow overflow-y-auto space-y-4 pr-2 scrollbar-hide">
                    {productionRunsList.filter(r => ['planned', 'ongoing', 'paused'].includes(r.status)).map(r => {
                        const requirements = getRunRequirements(r);
                        const canStart = requirements.every(req => req.status === 'ok');
                        const isHovered = hoveredRunId === r.id;
                        return (
                            <div key={r.id} className={`p-4 bg-white dark:bg-secondary-800 rounded-xl shadow-md flex flex-col sm:flex-row justify-between items-center border-l-4 border-primary-500 gap-4 transition-all hover:shadow-lg ${isHovered ? 'z-50 ring-2 ring-primary-500/50' : 'z-10'}`}>
                                <div className="flex-grow">
                                    <div className="flex items-center gap-3 mb-1">
                                        {getStatusBadge(r.status)}
                                        <span className="text-[10px] font-mono text-gray-400 font-bold uppercase">{r.id}</span>
                                    </div>
                                    <p className="font-black text-xl text-gray-800 dark:text-gray-100 uppercase tracking-tighter">{r.recipeName}</p>
                                    <p className="text-sm text-gray-500 font-bold">{r.targetBatchSizeKg.toLocaleString()} kg | {formatDate(r.plannedDate)}</p>
                                </div>
                                <div className="flex items-center gap-4 w-full sm:w-auto">
                                    <div className="relative">
                                        <button 
                                            onMouseEnter={(e) => { setHoveredRunId(r.id); setTriggerRect(e.currentTarget.getBoundingClientRect()); }}
                                            onMouseLeave={() => { setHoveredRunId(null); setTriggerRect(null); }}
                                            className={`p-3 rounded-full border-2 transition-all ${canStart ? 'bg-green-50 text-green-600 border-green-200' : 'bg-red-50 text-red-600 border-red-200 animate-pulse'}`}
                                        >
                                            <InformationCircleIcon className="h-7 w-7" />
                                        </button>
                                        {isHovered && <StartRequirementsInfo requirements={requirements} triggerRect={triggerRect} />}
                                    </div>
                                    <Button onClick={() => handleSetView(View.CurrentProductionRun, { runId: r.id })} disabled={!canStart} className="px-8 py-3 text-sm font-black uppercase tracking-tighter shadow-lg">
                                        {r.status === 'planned' ? 'Otwórz' : 'Kontynuuj'}
                                    </Button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-slate-100 dark:bg-secondary-900 overflow-hidden">
            <header className="flex-shrink-0 bg-white dark:bg-secondary-800 px-6 py-3 border-b dark:border-secondary-700 flex justify-between items-center shadow-sm">
                <div className="flex items-center gap-4">
                    <Button onClick={() => handleSetView(View.CurrentProductionRun, null)} variant="secondary" className="p-2"><ArrowLeftIcon className="h-5 w-5"/></Button>
                    <div>
                        <div className="flex items-center gap-2">
                             <h2 className="text-xl font-black tracking-tighter text-gray-800 dark:text-gray-200 uppercase">{run.recipeName}</h2>
                             <button onClick={() => modalHandlers.openAddEditRunModal({ runToEdit: run })} className="p-1 text-gray-400 hover:text-primary-500"><PencilIcon className="h-4 w-4" /></button>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400">
                            <span className="bg-slate-100 dark:bg-secondary-700 px-1.5 py-0.5 rounded">ID: {run.id}</span>
                            <span className="bg-slate-100 dark:bg-secondary-700 px-1.5 py-0.5 rounded uppercase">{run.targetBatchSizeKg.toLocaleString()} KG TOTAL</span>
                        </div>
                    </div>
                </div>
                
                <div className="flex items-center gap-4">
                    <div className="flex bg-gray-100 dark:bg-secondary-700 p-1 rounded-lg border dark:border-secondary-600 shadow-inner">
                        <button 
                            onClick={() => setIsAutoMode(true)}
                            className={`px-4 py-1.5 rounded-md text-[10px] font-black uppercase transition-all flex items-center gap-1.5 ${isAutoMode ? 'bg-white dark:bg-primary-600 text-primary-600 dark:text-white shadow-md' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                        >
                            {isAutoMode && <ArrowPathIcon className="h-3 w-3 animate-spin" />}
                            Auto
                        </button>
                        <button 
                            onClick={() => setIsAutoMode(false)}
                            className={`px-4 py-1.5 rounded-md text-[10px] font-black uppercase transition-all ${!isAutoMode ? 'bg-white dark:bg-primary-600 text-primary-600 dark:text-white shadow-md' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                        >
                            Manual
                        </button>
                    </div>

                    <div className="flex items-center gap-2">
                        {getStatusBadge(run.status)}
                        {run.status !== 'planned' && (
                            <>
                                <Button onClick={() => setIsPauseModalOpen(true)} variant="secondary" className="bg-yellow-50 text-yellow-700" leftIcon={<PauseIcon className="h-4 w-4"/>}>Wstrzymaj</Button>
                                <Button onClick={() => setIsEndModalOpen(true)} variant="danger" leftIcon={<StopIcon className="h-4 w-4"/>}>Zakończ Zlecenie</Button>
                            </>
                        )}
                    </div>
                </div>
            </header>

            <div className="flex-grow flex overflow-hidden">
                <main className="flex-grow overflow-y-auto p-6 scrollbar-hide space-y-8">
                    {activeBatch && areAllIngredientsWeighed && !allStepsConfirmed && (
                         <Alert 
                            type="info" 
                            message="Oczekiwanie na Kontrolę LAB" 
                            details="Składniki naważone. System oczekuje na wyniki analizy NIRS i potwierdzenie pobrania próbek."
                         />
                    )}

                    {adjustmentOrderForBatch && (
                        <div className="bg-orange-50 dark:bg-orange-900/20 border-2 border-orange-500 rounded-2xl shadow-xl p-6 animate-fadeIn">
                             <div className="flex justify-between items-center mb-4 border-b border-orange-200 dark:border-orange-800 pb-2">
                                <h3 className="text-xl font-black text-orange-800 dark:text-orange-200 uppercase tracking-tighter flex items-center gap-3">
                                    <AdjustmentsHorizontalIcon className="h-6 w-6" />
                                    Zlecona Korekta Szarży (Dosypka)
                                </h3>
                                <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${adjustmentOrderForBatch.status === 'processing' ? 'bg-orange-600 text-white' : 'bg-orange-200 text-orange-800'}`}>
                                    {adjustmentOrderForBatch.status === 'processing' ? 'Gotowa do dodania' : 'W przygotowaniu'}
                                </div>
                             </div>
                             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {adjustmentOrderForBatch.materials.map((mat, idx) => {
                                    const stationId = Object.entries(stationRawMaterialMapping).find(([_, name]) => name === mat.productName)?.[0];
                                    const isOnStation = !!stationId;
                                    const isDone = mat.pickedQuantityKg >= mat.quantityKg * 0.999;
                                    const isProcessing = isProcessingIngredient === `adj-${mat.productName}`;
                                    return (
                                        <div key={idx} className={`p-4 rounded-xl border-2 transition-all ${isDone ? 'bg-green-50 border-green-500 opacity-60' : 'bg-white border-orange-200 shadow-sm'}`}>
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <p className="font-black text-sm uppercase tracking-tight">{mat.productName}</p>
                                                    <p className="text-[10px] font-bold text-gray-400">Do dodania: <span className="text-orange-600">{mat.quantityKg} kg</span></p>
                                                </div>
                                                <span className={`text-[9px] font-black px-2 py-0.5 rounded ${isOnStation ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                                                    {isOnStation ? `STACJA ${stationId}` : 'MAGAZYN'}
                                                </span>
                                            </div>
                                            {!isDone && canExecute && (
                                                <div className="mt-3">
                                                    {isOnStation ? (
                                                        <Button onClick={() => handleAutoAdjustmentConsume(mat.productName, mat.quantityKg)} disabled={isProcessing} className="w-full text-[10px] py-1.5 bg-blue-600 h-10" leftIcon={isProcessing ? <ArrowPathIcon className="h-4 w-4 animate-spin"/> : <ArrowPathIcon className="h-4 w-4"/>}>
                                                            {isProcessing ? 'Naważanie...' : 'Naważ ze stacji (Auto)'}
                                                        </Button>
                                                    ) : (
                                                        <Button onClick={() => modalHandlers.openAdjustmentPickingModal(adjustmentOrderForBatch)} variant="secondary" className="w-full text-[10px] py-1.5 font-black border-orange-300 h-10" leftIcon={<CubeIcon className="h-4 w-4"/>}>Przygotuj wiadro</Button>
                                                    )}
                                                </div>
                                            )}
                                            {isDone && <div className="mt-3 flex items-center justify-center gap-2 text-green-600 font-bold text-xs uppercase"><CheckCircleIcon className="h-4 w-4" /> Naważono</div>}
                                        </div>
                                    );
                                })}
                             </div>
                             {adjustmentOrderForBatch.status === 'processing' && canExecute && (
                                <div className="mt-6 p-4 bg-orange-600 rounded-xl flex items-center justify-between text-white shadow-lg animate-bounce">
                                    <div className="flex items-center gap-3">
                                        <BeakerIcon className="h-8 w-8" />
                                        <div>
                                            <p className="font-black text-lg uppercase leading-none">Naważka manualna gotowa</p>
                                            <p className="text-xs font-bold opacity-80 uppercase tracking-widest mt-1">Pojemnik: {adjustmentOrderForBatch.preparationLocation}</p>
                                        </div>
                                    </div>
                                    <Button onClick={() => setIsConsumeAdjustmentModalOpen(true)} className="bg-white text-orange-700 font-black px-8 py-3">Zatwierdź zużycie wiadra</Button>
                                </div>
                             )}
                        </div>
                    )}

                    <section className="bg-white dark:bg-secondary-800 p-8 rounded-2xl shadow-xl border-2 border-primary-500/20 relative overflow-hidden">
                        <div className="flex flex-col items-center justify-center py-6">
                            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-2">Masa w mieszalniku (Szarża #{activeBatch?.batchNumber || '?'})</p>
                            <div className="flex items-baseline gap-4">
                                <span className="text-8xl font-black font-mono text-gray-800 dark:text-white tabular-nums tracking-tighter">{totalConsumed.toFixed(1)}</span>
                                <span className="text-4xl font-bold text-primary-500">kg</span>
                            </div>
                        </div>
                        <div className="mt-8 flex justify-center gap-4">
                            {!activeBatch ? (
                                <Button onClick={handleStartActions} disabled={!getRunRequirements(run).every(req => req.status === 'ok')} className="px-12 py-4 text-xl font-black uppercase tracking-tighter shadow-2xl">
                                    {run.status === 'planned' ? 'Rozpocznij Zlecenie' : 'Rozpocznij kolejną szarżę'}
                                </Button>
                            ) : (
                                <>
                                    <Button onClick={() => handleSetView(View.ProductionRelease, { runId: run.id, batchId: activeBatch.id, returnView: View.CurrentProductionRun, returnViewParams: { runId: run.id } })} variant="secondary" leftIcon={<ShieldCheckIcon className="h-5 w-5"/>} disabled={!areAllIngredientsWeighed}>Potwierdzenia LAB</Button>
                                    <Button onClick={() => setIsEndBatchConfirmOpen(true)} variant="primary" className="bg-green-600" leftIcon={<CheckCircleIcon className="h-5 w-5"/>} disabled={!allStepsConfirmed}>Zakończ szarżę</Button>
                                </>
                            )}
                        </div>
                    </section>
                </main>

                <aside className="w-96 bg-white dark:bg-secondary-800 border-l dark:border-secondary-700 flex flex-col shadow-2xl">
                    <header className="p-4 border-b bg-slate-50 dark:bg-secondary-900/50">
                        <h3 className="font-black text-xs uppercase tracking-widest text-gray-500 flex items-center gap-2">
                            <ListBulletIcon className="h-4 w-4" /> Zawartość i Plan Naważania
                        </h3>
                    </header>
                    <div className="flex-grow overflow-y-auto p-4 space-y-4 scrollbar-hide">
                        {scaledIngredients.map(ing => {
                            const consumed = consumedByIngredient[ing.productName] || 0;
                            const needed = ing.quantityKg;
                            const isDone = consumed >= needed * 0.999;
                            const stationId = Object.entries(stationRawMaterialMapping).find(([_, mat]) => mat === ing.productName)?.[0];
                            const isProcessing = isProcessingIngredient === ing.productName;
                            const isFinishedState = activeBatch?.weighingFinishedIngredients?.includes(ing.productName);

                            return (
                                <div key={ing.productName} className={`p-3 rounded-xl border-2 transition-all ${isFinishedState ? 'bg-green-50 border-green-500/50' : (isProcessing ? 'bg-blue-50 border-primary-500 animate-pulse' : 'bg-slate-50 dark:bg-secondary-900 border-slate-200 dark:border-secondary-700')}`}>
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="min-w-0 flex-grow">
                                            <p className="text-xs font-black uppercase truncate text-gray-800 dark:text-gray-100">{ing.productName}</p>
                                            <p className="text-[10px] font-bold text-gray-400">{stationId ? `STACJA ${stationId}` : 'MANUAL'}</p>
                                        </div>
                                        {isFinishedState && (
                                            <button 
                                                onClick={() => handleUndoWeight(ing.productName)}
                                                className="text-gray-400 hover:text-red-500 p-1"
                                                title="Cofnij naważanie"
                                            >
                                                <ArrowUturnLeftIcon className="h-4 w-4" />
                                            </button>
                                        )}
                                    </div>
                                    
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="flex-grow">
                                            {/* POLE INPUT DO PRZEPISYWANIA WAGI - Zawsze odblokowane dla operatora z uprawnieniami */}
                                            <div className="relative">
                                                <input 
                                                    type="number"
                                                    step="0.1"
                                                    value={localWeights[ing.productName] || ''}
                                                    onChange={(e) => setLocalWeights({...localWeights, [ing.productName]: e.target.value})}
                                                    onBlur={() => handleConfirmOrCorrectWeight(ing.productName)}
                                                    onKeyDown={(e) => e.key === 'Enter' && handleConfirmOrCorrectWeight(ing.productName)}
                                                    placeholder={needed.toFixed(1)}
                                                    disabled={isProcessing || !canExecute}
                                                    className={`w-full bg-white dark:bg-secondary-800 border-2 rounded-lg px-3 py-2 font-mono text-xl font-black focus:ring-2 focus:ring-primary-500 outline-none transition-all ${isFinishedState ? 'border-green-500 text-green-600' : 'border-slate-300 dark:border-secondary-600 text-primary-600'}`}
                                                />
                                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400 uppercase">kg</span>
                                            </div>
                                        </div>
                                        
                                        {/* PRZYCISK ZATWIERDZENIA MANUALNEGO / KOREKTY */}
                                        {canExecute && (
                                            <button 
                                                onClick={() => handleConfirmOrCorrectWeight(ing.productName)}
                                                disabled={isProcessing || !localWeights[ing.productName]}
                                                className={`h-11 w-11 shrink-0 rounded-lg flex items-center justify-center shadow-md transition-all ${isFinishedState ? 'bg-green-600 text-white' : 'bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-30'}`}
                                            >
                                                {isProcessing ? <ArrowPathIcon className="h-5 w-5 animate-spin" /> : (isFinishedState ? <CheckCircleIcon className="h-6 w-6" /> : <PlayIcon className="h-5 w-5" />)}
                                            </button>
                                        )}
                                    </div>

                                    <div className="flex justify-between items-baseline mb-1">
                                        <span className="text-[10px] font-bold text-gray-400">CEL: {needed.toFixed(1)} kg</span>
                                        <span className="text-[10px] font-bold text-gray-400">{Math.min((consumed / needed) * 100, 100).toFixed(0)}%</span>
                                    </div>
                                    <div className="w-full h-1 bg-gray-200 dark:bg-secondary-700 rounded-full overflow-hidden">
                                        <div className={`h-full transition-all duration-500 ${isFinishedState ? 'bg-green-500' : 'bg-primary-500'}`} style={{ width: `${Math.min((consumed / needed) * 100, 100)}%` }}></div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </aside>
            </div>

            <ProductionStatusBar batch={activeBatch || null} adjustment={adjustmentOrderForBatch} isWeighingFinished={areAllIngredientsWeighed} />
            <EndProductionModal 
                isOpen={isEndModalOpen} 
                onClose={() => setIsEndModalOpen(false)} 
                onConfirm={(w) => {
                    const result = handleCompleteProductionRun(run.id, w);
                    if (result.success) {
                        setIsEndModalOpen(false);
                        showToast(result.message, 'success');
                        handleSetView(View.CurrentProductionRun, null);
                    }
                    return result;
                }} 
                run={run} 
            />
            <PauseProductionModal isOpen={isPauseModalOpen} onClose={() => setIsPauseModalOpen(false)} onConfirm={(r) => handlePauseProductionRun(run.id, r)} />
            <ConfirmationModal isOpen={isEndBatchConfirmOpen} onClose={() => setIsEndBatchConfirmOpen(false)} onConfirm={() => handleEndAgroBatch(run.id, activeBatch!.id, (res) => { if(res.success) setIsEndBatchConfirmOpen(false); showToast(res.message, res.success ? 'success' : 'error'); })} title="Zakończyć szarżę?" message="Czy na pewno chcesz zamknąć tę szarżę?" confirmButtonText="Tak, zakończ" />
            <ConsumeAdjustmentBucketModal isOpen={isConsumeAdjustmentModalOpen} onClose={() => setIsConsumeAdjustmentModalOpen(false)} onConfirm={handleConfirmAdjustmentConsumption} order={adjustmentOrderForBatch} />
        </div>
    );
};

export default CurrentProductionRunPage;
