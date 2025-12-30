
import React, { useMemo, useState } from 'react';
import { useProductionContext } from './contexts/ProductionContext';
import { useRecipeAdjustmentContext } from './contexts/RecipeAdjustmentContext';
import { useUIContext } from './contexts/UIContext';
import { useAuth } from './contexts/AuthContext';
import { View, ProductionRun, PsdBatch, PsdTask, Recipe } from '../types';
import Button from './Button';
import ArrowLeftIcon from './icons/ArrowLeftIcon';
import Alert from './Alert';
import CheckCircleIcon from './icons/CheckCircleIcon';
import XCircleIcon from './icons/XCircleIcon';
import ClockIcon from './icons/ClockIcon';
import BeakerIcon from './icons/BeakerIcon';
import DocumentTextIcon from './icons/DocumentTextIcon';
import { usePsdContext } from './contexts/PsdContext';
import ShieldCheckIcon from './icons/ShieldCheckIcon';
import ArrowUturnLeftIcon from './icons/ArrowUturnLeftIcon';
import ClockRewindIcon from './icons/ClockRewindIcon';
import Input from './Input';
import SearchIcon from './icons/SearchIcon';

const StatusCard: React.FC<{ title: string, icon: React.ReactNode, status: 'pending' | 'ok' | 'nok', children?: React.ReactNode }> = ({ title, icon, status, children }) => {
    const statusInfo = {
        pending: { label: 'Oczekuje', color: 'border-gray-400 dark:border-gray-500', icon: <ClockIcon className="h-6 w-6 text-gray-500" /> },
        ok: { label: 'Zatwierdzone', color: 'border-green-500', icon: <CheckCircleIcon className="h-6 w-6 text-green-500" /> },
        nok: { label: 'Wymaga Działań', color: 'border-red-500', icon: <XCircleIcon className="h-6 w-6 text-red-500" /> }
    };
    return (
        <div className={`p-4 bg-white dark:bg-secondary-800 rounded-lg shadow-md border-l-4 ${statusInfo[status].color}`}>
            <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                    {icon}
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">{title}</h3>
                </div>
                <div className="flex items-center gap-2 text-sm font-bold">
                    {statusInfo[status].icon}
                    <span>{statusInfo[status].label}</span>
                </div>
            </div>
            {children && <div className="mt-4 pt-4 border-t dark:border-secondary-700 space-y-3">{children}</div>}
        </div>
    );
};

const BatchDetailView: React.FC<{ run: ProductionRun | PsdTask, batch: PsdBatch, onReturn: () => void }> = ({ run, batch, onReturn }) => {
    const { handleUpdateBatchConfirmationStatus } = useProductionContext();
    const { handleUpdatePsdBatchConfirmationStatus } = usePsdContext();
    const { adjustmentOrders } = useRecipeAdjustmentContext();
    const { currentUser } = useAuth();
    const { handleSetView } = useUIContext();
    const isLabUser = currentUser?.role === 'lab' || currentUser?.role === 'admin' || currentUser?.role === 'boss';

    const adjustmentOrderForBatch = useMemo(() => (adjustmentOrders || []).find(o => o.batchId === batch?.id), [adjustmentOrders, batch]);

    const nirsStatus = batch.confirmationStatus?.nirs || 'pending';
    const samplingStatus = batch.confirmationStatus?.sampling || 'pending';
    const isCorrectionDone = adjustmentOrderForBatch?.status === 'completed';

    // Count how many adjustments have been made for this batch
    const adjustmentCount = useMemo(() => {
        // For Agro, check actualIngredientsUsed
        if ('actualIngredientsUsed' in run) {
            return (run.actualIngredientsUsed || []).filter(i => i.batchId === batch.id && i.isAdjustment).length;
        }
        // For PSD, check consumedPallets in batch
        if ('consumedPallets' in batch) {
            return (batch.consumedPallets || []).filter(i => i.isAdjustment).length;
        }
        return 0;
    }, [run, batch]);

    const isPsdTask = (run.id || '').startsWith('ZLEPSD');

    const handleNirsStatusChange = (status: 'ok' | 'nok' | 'pending') => {
        if (isPsdTask) {
            handleUpdatePsdBatchConfirmationStatus(run.id, batch.id, 'nirs', status);
        } else {
            handleUpdateBatchConfirmationStatus(run.id, batch.id, 'nirs', status);
        }
    };
    
    const handleSamplingStatusChange = (status: 'ok' | 'pending') => {
        if (isPsdTask) {
            handleUpdatePsdBatchConfirmationStatus(run.id, batch.id, 'sampling', status);
        } else {
            handleUpdateBatchConfirmationStatus(run.id, batch.id, 'sampling', status);
        }
    };

    const handleCreateCorrection = () => {
        handleSetView(View.CreateAdjustmentOrder, { 
            productionRunId: run.id, 
            batchId: batch.id, 
            recipeName: (run as any).recipeName, 
            returnView: View.ProductionRelease, 
            returnViewParams: { runId: run.id, batchId: batch.id } 
        });
    };

    const allConfirmed = nirsStatus === 'ok' && samplingStatus === 'ok';

    return (
        <div className="p-4 md:p-6 bg-slate-50 dark:bg-secondary-900/50 h-full">
            <header className="flex items-center gap-3 mb-6">
                <Button onClick={onReturn} variant="secondary" className="p-2"><ArrowLeftIcon className="h-5 w-5"/></Button>
                <div>
                    <h2 className="text-2xl font-semibold text-primary-700 dark:text-primary-300">Potwierdzenia LAB</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Zlecenie: {(run as any).recipeName || (run as any).name} ({run.id}), Partia #{batch.batchNumber}</p>
                </div>
            </header>
            
            <div className="max-w-4xl mx-auto space-y-6">
                <StatusCard title="Badanie NIRS" icon={<BeakerIcon className="h-8 w-8 text-gray-500"/>} status={nirsStatus}>
                    {adjustmentCount > 0 && (
                         <div className="mb-2 p-2 bg-blue-50 dark:bg-blue-900/30 rounded border border-blue-200 dark:border-blue-800 text-sm text-blue-800 dark:text-blue-300">
                             <span className="font-semibold">Liczba wykonanych korekt (dosypek): {adjustmentCount}</span>
                         </div>
                    )}
                    {(nirsStatus === 'pending') && (
                        <div className="space-y-3">
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                {adjustmentCount > 0 
                                    ? "Wykonano korektę (dosypkę). Wymagane ponowne badanie NIRS." 
                                    : "Oczekuje na wynik badania NIRS."
                                }
                            </p>
                            <div className="flex gap-4">
                                <Button onClick={() => handleNirsStatusChange('ok')} disabled={!isLabUser} className="w-full" variant="secondary">Wynik OK</Button>
                                <Button onClick={() => handleNirsStatusChange('nok')} disabled={!isLabUser} className="w-full" variant="danger">Wynik NOK</Button>
                            </div>
                        </div>
                    )}
                    {(nirsStatus === 'ok') && (
                        <div className="flex justify-between items-center bg-green-50 dark:bg-green-900/30 p-3 rounded">
                            <span className="text-green-800 dark:text-green-200 font-medium">Wynik pozytywny. Można kontynuować.</span>
                            <Button onClick={() => handleNirsStatusChange('pending')} disabled={!isLabUser} variant="secondary" className="text-xs" leftIcon={<ArrowUturnLeftIcon className="h-4 w-4"/>}>Zmień</Button>
                        </div>
                    )}
                    {(nirsStatus === 'nok') && (
                        <div className="space-y-3">
                            <div className="flex justify-end">
                                <Button onClick={() => handleNirsStatusChange('pending')} disabled={!isLabUser} variant="secondary" className="text-xs text-gray-500" leftIcon={<ArrowUturnLeftIcon className="h-4 w-4"/>}>To była pomyłka (Cofnij)</Button>
                            </div>
                            <Alert type="warning" message="Wynik NIRS negatywny. Wymagana korekta receptury."/>
                            <div className="flex justify-between items-center p-3 bg-slate-100 dark:bg-secondary-700 rounded-md">
                                <span>Korekta Receptury (dosypka)</span>
                                {adjustmentOrderForBatch ? (
                                    <Button onClick={() => handleSetView(View.ManageAdjustments)} variant="secondary" className="text-xs">Zobacz zlecenie</Button>
                                ) : (
                                    <Button onClick={handleCreateCorrection} disabled={!isLabUser}>Utwórz</Button>
                                )}
                            </div>
                        </div>
                    )}
                </StatusCard>

                <StatusCard title="Próbkowanie / Rozwadnianie" icon={<DocumentTextIcon className="h-8 w-8 text-gray-500"/>} status={samplingStatus}>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Potwierdź pobranie próbek oraz ewentualne rozwadnianie zgodnie z procedurą.</p>
                    {samplingStatus === 'pending' && <Button onClick={() => handleSamplingStatusChange('ok')} disabled={!isLabUser} className="w-full mt-2">Potwierdzam</Button>}
                    {samplingStatus === 'ok' && (
                        <div className="flex justify-end mt-2">
                            <Button onClick={() => handleSamplingStatusChange('pending')} disabled={!isLabUser} variant="secondary" className="text-xs" leftIcon={<ArrowUturnLeftIcon className="h-4 w-4"/>}>Cofnij zatwierdzenie</Button>
                        </div>
                    )}
                </StatusCard>
                
                <div className={`p-4 rounded-lg shadow-md text-center transition-all ${allConfirmed ? 'bg-green-100 dark:bg-green-900/50' : 'bg-gray-100 dark:bg-secondary-800'}`}>
                    <h3 className="text-lg font-bold">{allConfirmed ? 'Wszystkie kroki zatwierdzone!' : 'Oczekuje na potwierdzenia'}</h3>
                    <p className="text-sm">{allConfirmed ? 'Można teraz zakończyć partię na ekranie produkcji.' : 'Po zatwierdzeniu obu kroków, przycisk "Zakończ Szarżę" zostanie aktywowany.'}</p>
                </div>
            </div>
        </div>
    );
};

const BatchListView: React.FC<{ onSelectBatch: (run: ProductionRun | PsdTask, batch: PsdBatch) => void }> = ({ onSelectBatch }) => {
    const { productionRunsList, recipes } = useProductionContext();
    const { psdTasks } = usePsdContext();

    const batchesToReview = useMemo(() => {
        const agroBatches = (productionRunsList || [])
            .filter(r => r.status === 'ongoing')
            .flatMap(run => (run.batches || [])
                .filter(b => b.status === 'ongoing' && (b.confirmationStatus?.nirs !== 'ok' || b.confirmationStatus?.sampling !== 'ok'))
                .map(batch => ({ run, batch, type: 'AGRO' }))
            );
        
        const psdBatches = (psdTasks || [])
            .filter(t => t.status === 'ongoing')
            .flatMap(task => (task.batches || [])
                .filter(b => b.status === 'ongoing' && (b.confirmationStatus?.nirs !== 'ok' || b.confirmationStatus?.sampling !== 'ok'))
                .map(batch => ({ run: task, batch, type: 'PSD' }))
            );

        return [...agroBatches, ...psdBatches];
    }, [productionRunsList, psdTasks]);

    return (
        <div className="p-4 md:p-6 h-full">
            {batchesToReview.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 bg-slate-50 dark:bg-secondary-800 rounded-lg">
                     <CheckCircleIcon className="h-16 w-16 text-gray-300 dark:text-gray-600 mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">Brak partii oczekujących na zatwierdzenie.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {batchesToReview.map(({ run, batch, type }) => {
                        // Check if weighing is finished for all ingredients
                        const finishedList = batch.weighingFinishedIngredients || [];
                        let isWeighingComplete = false;
                        if (type === 'AGRO') {
                             const recipe = recipes.find(r => r.id === run.recipeId);
                             if (recipe) {
                                 isWeighingComplete = recipe.ingredients.every(ing => finishedList.includes(ing.productName));
                             }
                        } else {
                             // For PSD, check against recipe in psdTask if possible, or allow for now as recipes structure might differ
                             // Assuming PSD recipe logic matches or is simpler:
                             const recipe = recipes.find(r => r.id === run.recipeId);
                             if (recipe) {
                                  isWeighingComplete = recipe.ingredients.every(ing => finishedList.includes(ing.productName));
                             }
                        }

                        return (
                            <div key={batch.id} className="p-4 bg-white dark:bg-secondary-800 rounded-lg shadow-md flex flex-col sm:flex-row justify-between items-start gap-4 border-l-4 border-blue-500">
                                <div>
                                    <p className="font-bold text-lg text-gray-800 dark:text-gray-200">{(run as any).recipeName || (run as any).name} - Partia #{batch.batchNumber}</p>
                                    <p className="text-sm font-mono text-gray-500 dark:text-gray-400">{run.id} ({type})</p>
                                    <div className="flex gap-4 mt-2 text-xs">
                                        <span className={`flex items-center gap-1 font-semibold ${batch.confirmationStatus?.nirs === 'nok' ? 'text-red-600' : 'text-gray-600 dark:text-gray-300'}`}>
                                            NIRS: {batch.confirmationStatus?.nirs === 'nok' ? 'KOREKTA' : (batch.confirmationStatus?.nirs || 'pending')}
                                        </span>
                                        <span className="flex items-center gap-1 text-gray-600 dark:text-gray-300">
                                            Próbki: {batch.confirmationStatus?.sampling || 'pending'}
                                        </span>
                                        {!isWeighingComplete && (
                                            <span className="text-orange-600 font-bold flex items-center gap-1">
                                                <XCircleIcon className="h-3 w-3" /> Naważanie w toku
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                    <Button 
                                        onClick={() => onSelectBatch(run, batch)} 
                                        disabled={!isWeighingComplete}
                                        title={!isWeighingComplete ? "Naważanie składników nie zostało zakończone przez operatora." : ""}
                                    >
                                        Przejdź do potwierdzeń
                                    </Button>
                                    {!isWeighingComplete && <span className="text-[10px] text-red-500">Wymagane zakończenie naważania</span>}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

const BatchHistoryView: React.FC<{ onSelectBatch: (run: ProductionRun | PsdTask, batch: PsdBatch) => void }> = ({ onSelectBatch }) => {
    const { productionRunsList } = useProductionContext();
    const { psdTasks } = usePsdContext();
    const [searchTerm, setSearchTerm] = useState('');

    const historyBatches = useMemo(() => {
        const agroBatches = (productionRunsList || [])
            .flatMap(run => (run.batches || [])
                .filter(b => b.confirmationStatus && (b.confirmationStatus.nirs !== 'pending' || b.confirmationStatus.sampling !== 'pending'))
                .map(batch => ({ run, batch, type: 'AGRO' }))
            );
        
        const psdBatches = (psdTasks || [])
            .flatMap(task => (task.batches || [])
                .filter(b => b.confirmationStatus && (b.confirmationStatus.nirs !== 'pending' || b.confirmationStatus.sampling !== 'pending'))
                .map(batch => ({ run: task, batch, type: 'PSD' }))
            );

        return [...agroBatches, ...psdBatches].sort((a,b) => {
            // Sort by batch end time if available, else start time, else production run date
             const dateA = a.batch.endTime || a.batch.startTime || (a.run as any).createdAt;
             const dateB = b.batch.endTime || b.batch.startTime || (b.run as any).createdAt;
             return new Date(dateB).getTime() - new Date(dateA).getTime();
        });
    }, [productionRunsList, psdTasks]);

    const filteredBatches = useMemo(() => {
        if (!searchTerm) return historyBatches;
        const lowerTerm = searchTerm.toLowerCase();
        return historyBatches.filter(item => 
            (item.run as any).recipeName?.toLowerCase().includes(lowerTerm) ||
            item.run.id.toLowerCase().includes(lowerTerm) ||
            (item.run as any).name?.toLowerCase().includes(lowerTerm)
        );
    }, [historyBatches, searchTerm]);

    return (
         <div className="p-4 md:p-6 h-full flex flex-col">
             <div className="mb-4">
                 <Input 
                    label="" 
                    placeholder="Szukaj zlecenia..." 
                    value={searchTerm} 
                    onChange={e => setSearchTerm(e.target.value)} 
                    icon={<SearchIcon className="h-5 w-5 text-gray-400"/>}
                />
             </div>
             
             <div className="flex-grow overflow-auto">
                {filteredBatches.length === 0 ? (
                    <div className="text-center py-10 text-gray-500 dark:text-gray-400">Brak historii potwierdzeń.</div>
                ) : (
                    <table className="min-w-full text-sm divide-y divide-gray-200 dark:divide-secondary-700">
                        <thead className="bg-gray-100 dark:bg-secondary-800">
                            <tr>
                                <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-300">Zlecenie</th>
                                <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-300">Partia</th>
                                <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-300">NIRS</th>
                                <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-300">Próbki</th>
                                <th className="px-3 py-2 text-right font-medium text-gray-600 dark:text-gray-300">Akcja</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-secondary-900 divide-y divide-gray-200 dark:divide-secondary-700">
                            {filteredBatches.map(({ run, batch, type }) => (
                                <tr key={`${run.id}-${batch.id}`} className="hover:bg-gray-50 dark:hover:bg-secondary-800">
                                    <td className="px-3 py-2">
                                        <div className="font-semibold text-gray-800 dark:text-gray-200">{(run as any).recipeName || (run as any).name}</div>
                                        <div className="text-xs text-gray-500 font-mono">{run.id}</div>
                                    </td>
                                    <td className="px-3 py-2 font-mono text-gray-700 dark:text-gray-300">#{batch.batchNumber}</td>
                                    <td className="px-3 py-2">
                                        {batch.confirmationStatus?.nirs === 'ok' && <span className="text-green-600 font-bold">OK</span>}
                                        {batch.confirmationStatus?.nirs === 'nok' && <span className="text-red-600 font-bold">NOK</span>}
                                        {batch.confirmationStatus?.nirs === 'pending' && <span className="text-gray-400">-</span>}
                                    </td>
                                    <td className="px-3 py-2">
                                         {batch.confirmationStatus?.sampling === 'ok' && <span className="text-green-600 font-bold">OK</span>}
                                         {batch.confirmationStatus?.sampling === 'pending' && <span className="text-gray-400">-</span>}
                                    </td>
                                    <td className="px-3 py-2 text-right">
                                        <Button onClick={() => onSelectBatch(run, batch)} variant="secondary" className="text-xs p-1.5">Podgląd</Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
             </div>
         </div>
    )
};

const ProductionReleasePage: React.FC = () => {
    const { viewParams, handleSetView } = useUIContext();
    const { productionRunsList } = useProductionContext();
    const { psdTasks } = usePsdContext();
    const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');

    const runId = viewParams?.runId;
    const batchId = viewParams?.batchId;

    const selectedRun = useMemo(() =>
        (productionRunsList || []).find(r => r.id === runId) || (psdTasks || []).find(t => t.id === runId),
        [productionRunsList, psdTasks, runId]
    );

    const selectedBatch = useMemo(() =>
        selectedRun?.batches.find(b => b.id === batchId),
        [selectedRun, batchId]
    );

    const handleSelectBatch = (run: ProductionRun | PsdTask, batch: PsdBatch) => {
        handleSetView(View.ProductionRelease, { 
            runId: run.id, 
            batchId: batch.id, 
            returnView: View.ProductionRelease,
        });
    };

    const handleReturn = () => {
        if (viewParams?.returnView) {
            handleSetView(viewParams.returnView, viewParams.returnViewParams || {});
        } else {
            handleSetView(View.ProductionRelease, {});
        }
    };

    if (runId && batchId && selectedRun && selectedBatch) {
        return <BatchDetailView run={selectedRun} batch={selectedBatch} onReturn={handleReturn} />;
    }

    return (
        <div className="h-full flex flex-col">
            <div className="bg-white dark:bg-secondary-800 border-b dark:border-secondary-700 px-6 py-4 flex items-center justify-between">
                 <div className="flex items-center gap-3">
                    <ShieldCheckIcon className="h-8 w-8 text-primary-600 dark:text-primary-400" />
                    <h2 className="text-2xl font-semibold text-primary-700 dark:text-primary-300">Potwierdzenia LAB</h2>
                </div>
                <div className="flex bg-gray-100 dark:bg-secondary-700 p-1 rounded-lg">
                    <button 
                        onClick={() => setActiveTab('pending')}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'pending' ? 'bg-white dark:bg-secondary-600 shadow text-primary-700 dark:text-primary-300' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                    >
                        Oczekujące
                    </button>
                    <button 
                        onClick={() => setActiveTab('history')}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'history' ? 'bg-white dark:bg-secondary-600 shadow text-primary-700 dark:text-primary-300' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                    >
                        Historia
                    </button>
                </div>
            </div>
            
            <div className="flex-grow bg-slate-50 dark:bg-secondary-900/50 overflow-hidden">
                {activeTab === 'pending' ? (
                     <BatchListView onSelectBatch={handleSelectBatch} />
                ) : (
                     <BatchHistoryView onSelectBatch={handleSelectBatch} />
                )}
            </div>
        </div>
    );
};

export default ProductionReleasePage;
