import React, { createContext, useContext, PropsWithChildren, useState, useCallback } from 'react';
import { ProductionRun, FinishedGoodItem, Recipe, ProductionRunTemplate, Permission, AdjustmentOrder, PsdBatch, AgroConsumedMaterial, SplitProposalDetails, ProductionEvent } from '../../types';
import { usePersistedState } from '../../src/usePersistedState';
import { INITIAL_PRODUCTION_RUNS, INITIAL_FINISHED_GOODS } from '../../src/initialData';
import { SAMPLE_RECIPES, STATION_RAW_MATERIAL_MAPPING_DEFAULT, AGRO_LINE_PRODUCTION_RATE_KG_PER_MINUTE } from '../../constants';
import { useAuth } from './AuthContext';
import { getBlockInfo, generate18DigitId } from '../../src/utils';
import { logger } from '../../utils/logger';

export interface ProductionContextValue {
    productionRunsList: ProductionRun[];
    setProductionRunsList: React.Dispatch<React.SetStateAction<ProductionRun[]>>;
    finishedGoodsList: FinishedGoodItem[];
    setFinishedGoodsList: React.Dispatch<React.SetStateAction<FinishedGoodItem[]>>;
    recipes: Recipe[];
    stationRawMaterialMapping: Record<string, string>;
    handleUpdateStationMappings: (mappings: Record<string, string>) => void;
    handleAssignPalletToProductionStation: (palletId: string, stationId: string) => { success: boolean, message: string };
    getDailyCapacity: (date: string, excludeRunId?: string) => { 
        productionMinutes: number; 
        breakMinutes: number;      
        totalUsedMinutes: number;  
        totalMinutes: number;      
        remainingMinutes: number;  
    };
    handleAddOrUpdateAgroRun: (runData: Partial<ProductionRun>) => { success: boolean; message: string; splitProposal?: SplitProposalDetails };
    handleConfirmSplitRun: (details: SplitProposalDetails) => { success: boolean, message: string };
    handleDeletePlannedProductionRun: (runId: string) => { success: boolean, message: string };
    handleStartProductionRun: (runId: string) => { success: boolean, message: string };
    // FIX: Removed duplicate 'handlePauseProductionRun' declaration.
    handlePauseProductionRun: (runId: string, reason: string) => { success: boolean, message: string };
    handleResumeProductionRun: (runId: string) => { success: boolean, message: string };
    handleCompleteProductionRun: (runId: string, finalWeight: number) => { success: boolean, message: string };
    handleEndAgroBatch: (runId: string, batchId: string, callback: (result: { success: boolean, message: string }) => void) => void;
    handleStartNextAgroBatch: (runId: string) => { success: boolean, message: string };
    handleRegisterFgForAgro: (runId: string, weight: number) => { success: boolean, message: string, newPallet?: FinishedGoodItem };
    handleReturnRemainderToProduction: (runId: string, batchId: string, weight: number) => { success: boolean, message: string, newPallet?: FinishedGoodItem };
    handleConsumeFromBufferForAgro: (runId: string, batchId: string, productName: string, weight: number) => { success: boolean, message: string };
    handleMoveFinishedGood: (palletId: string, targetLocation: string, user: any) => { success: boolean, message: string };
    handleConfirmFinishedGoodLabeling: (itemId: string, user: any) => Promise<{ success: boolean, message: string }>;
    productionRunTemplates: ProductionRunTemplate[];
    handleDeleteTemplate: (templateId: string) => void;
    handleSplitPallet: (sourcePalletId: string, newWeights: number[]) => { 
        success: boolean; 
        message: string; 
        newPallets?: FinishedGoodItem[]; 
        updatedSourcePallet?: FinishedGoodItem; 
    };
    handleAddLabSample: (taskId: string, sampleBagNumber: string, archiveLocation?: string) => { success: boolean; message: string; newSample?: any };
    handleArchiveLabSample: (runId: string, sampleBagNumber: string, archiveLocation: string) => { success: boolean; message: string; };
    handleClearSuggestedTransfer: (runId: string) => void;
    handleUpdateBatchConfirmationStatus: (runId: string, batchId: string, step: 'nirs' | 'sampling', status: 'ok' | 'nok' | 'pending') => { success: boolean, message: string };
    handleConsumeAgroAdjustment: (runId: string, batchId: string, order: AdjustmentOrder) => { success: boolean, message: string };
    handleConsumeAdjustmentForPsd: (taskId: string, batchId: string, order: AdjustmentOrder) => { success: boolean; message: string };
    handleMarkAgroIngredientWeighingFinished: (runId: string, batchId: string, productName: string) => { success: boolean, message: string };
    handleAddRecipe: (recipe: Omit<Recipe, 'id'>) => { success: boolean, message: string };
    handleEditRecipe: (id: string, updates: Partial<Recipe>) => { success: boolean, message: string };
    handleAddProductionEvent: (runId: string, event: Omit<ProductionEvent, 'id' | 'timestamp' | 'user'>) => { success: boolean, message: string };
    handleDeleteProductionEvent: (runId: string, eventId: string) => { success: boolean, message: string };
}

export const ProductionContext = createContext<ProductionContextValue | undefined>(undefined);

export const useProductionContext = (): ProductionContextValue => {
    const context = useContext(ProductionContext);
    if (!context) throw new Error('useProductionContext must be used within a ProductionProvider');
    return context;
};

export const ProductionProvider: React.FC<PropsWithChildren> = ({ children }) => {
    const { currentUser } = useAuth();
    const [productionRunsList, setProductionRunsList] = usePersistedState<ProductionRun[]>('productionRuns', INITIAL_PRODUCTION_RUNS);
    const [finishedGoodsList, setFinishedGoodsList] = usePersistedState<FinishedGoodItem[]>('finishedGoods', INITIAL_FINISHED_GOODS);
    const [recipes, setRecipes] = usePersistedState<Recipe[]>('app_recipes_v1', SAMPLE_RECIPES);
    const [stationRawMaterialMapping, setStationRawMaterialMapping] = usePersistedState<Record<string, string>>('stationMapping_v2', STATION_RAW_MATERIAL_MAPPING_DEFAULT);
    const [productionRunTemplates, setProductionRunTemplates] = usePersistedState<ProductionRunTemplate[]>('productionRunTemplates', []);

    // FIX: Rozbudowana funkcja startu zlecenia AGRO
    const handleStartProductionRun = useCallback((runId: string) => {
        setProductionRunsList(prev => prev.map(r => {
            if (r.id === runId) {
                const now = new Date().toISOString();
                let updatedBatches = [...(r.batches || [])];
                
                // 1. Jeśli brak szarż, wygeneruj je (standardowo po 2000 kg)
                if (updatedBatches.length === 0) {
                    const capacity = 2000;
                    const numBatches = Math.ceil(r.targetBatchSizeKg / capacity);
                    for (let i = 0; i < numBatches; i++) {
                        const targetWeight = (i === numBatches - 1) 
                            ? r.targetBatchSizeKg - (i * capacity) 
                            : capacity;
                        updatedBatches.push({
                            id: `${r.id}-B${i + 1}`,
                            batchNumber: i + 1,
                            targetWeight,
                            status: 'planned',
                            consumedPallets: [],
                            producedGoods: []
                        } as PsdBatch);
                    }
                }

                // 2. Aktywuj pierwszą wolną szarżę
                const firstPlannedIdx = updatedBatches.findIndex(b => b.status === 'planned');
                if (firstPlannedIdx !== -1) {
                    updatedBatches[firstPlannedIdx] = { 
                        ...updatedBatches[firstPlannedIdx], 
                        status: 'ongoing', 
                        startTime: now 
                    };
                }

                return { ...r, status: 'ongoing', startTime: now, batches: updatedBatches };
            }
            return r;
        }));
        return { success: true, message: 'Zlecenie rozpoczęte.' };
    }, [setProductionRunsList]);

    // FIX: Poprawiona funkcja startu kolejnej szarży
    const handleStartNextAgroBatch = useCallback((runId: string) => {
        setProductionRunsList(prev =>
            prev.map(r => {
                if (r.id === runId && r.status === 'ongoing' && !r.batches.some(b => b.status === 'ongoing')) {
                    const nextBatchIndex = r.batches.findIndex(b => b.status === 'planned');
                    if (nextBatchIndex !== -1) {
                        const updatedBatches = [...r.batches];
                        updatedBatches[nextBatchIndex] = {
                            ...updatedBatches[nextBatchIndex],
                            status: 'ongoing',
                            startTime: new Date().toISOString(),
                        };
                        return { ...r, batches: updatedBatches };
                    }
                }
                return r;
            })
        );
        return { success: true, message: 'Rozpoczęto następną szarżę.' };
    }, [setProductionRunsList]);

    const handleEndAgroBatch = (runId: string, batchId: string, callback: any) => {
        setProductionRunsList(prev => {
            const runIndex = prev.findIndex(r => r.id === runId);
            if (runIndex === -1) {
                callback({ success: false, message: "Nie znaleziono zlecenia." });
                return prev;
            }
            const run = prev[runIndex];
            const batch = run.batches.find(b => b.id === batchId);
            if (!batch || batch.status !== 'ongoing') {
                callback({ success: false, message: "Brak aktywnej szarży." });
                return prev;
            }
            callback({ success: true, message: `Szarża #${batch.batchNumber} zakończona.` });
            const updatedRun = {
                ...run,
                batches: run.batches.map(b => b.id === batchId ? { ...b, status: 'completed' as const, endTime: new Date().toISOString() } : b)
            };
            const newRuns = [...prev];
            newRuns[runIndex] = updatedRun;
            return newRuns;
        });
    };

    // FIX: Removed duplicate non-useCallback implementation of handleAddProductionEvent and handleDeleteProductionEvent.

    const handleUpdateBatchConfirmationStatus = (runId: string, batchId: string, step: any, status: any) => {
        setProductionRunsList(prev => prev.map(r => r.id === runId ? {
            ...r, batches: r.batches.map(b => b.id === batchId ? { ...b, confirmationStatus: { ...b.confirmationStatus, [step]: status } } : b)
        } : r));
        return { success: true, message: 'OK' };
    };

    const handleConsumeAgroAdjustment = (runId: string, batchId: string, order: AdjustmentOrder) => {
        let success = false;
        setProductionRunsList(prev => prev.map(run => {
            if (run.id === runId) {
                const newConsumedItems: AgroConsumedMaterial[] = order.materials.map(mat => ({
                    consumptionId: `cons-adj-${Date.now()}-${Math.random()}`,
                    isAnnulled: false,
                    productName: mat.productName,
                    actualConsumedQuantityKg: mat.pickedQuantityKg,
                    actualSourcePalletId: mat.sourcePalletId || `ADJ-BUCKET-${order.preparationLocation}`,
                    batchId: batchId,
                    isAdjustment: true,
                    adjustmentBucketId: order.preparationLocation
                }));

                const updatedBatches = run.batches.map(b => {
                    if (b.id === batchId) {
                        return {
                            ...b,
                            confirmationStatus: {
                                ...b.confirmationStatus,
                                nirs: 'pending' as const // Reset NIRS po dosypce
                            }
                        };
                    }
                    return b;
                });

                success = true;
                return {
                    ...run,
                    batches: updatedBatches,
                    actualIngredientsUsed: [...(run.actualIngredientsUsed || []), ...newConsumedItems]
                };
            }
            return run;
        }));
        
        return { success, message: success ? 'Dosypka została odnotowana w rejestrze szarży. Wymagane ponowne badanie NIRS.' : 'Błąd zapisu.' };
    };

    const handleMarkAgroIngredientWeighingFinished = (runId: string, batchId: string, productName: string) => {
        setProductionRunsList(prev => prev.map(r => r.id === runId ? {
            ...r, batches: r.batches.map(b => b.id === batchId ? { ...b, weighingFinishedIngredients: [...(b.weighingFinishedIngredients || []), productName] } : b)
        } : r));
        return { success: true, message: 'OK' };
    };

    const handlePauseProductionRun = useCallback((runId: string, reason: string) => {
        setProductionRunsList(prev => prev.map(r => {
            if (r.id === runId && r.status === 'ongoing') {
                return {
                    ...r,
                    status: 'paused',
                    downtimes: [
                        ...(r.downtimes || []),
                        { type: 'manual_pause', startTime: new Date().toISOString(), endTime: '', durationMinutes: 0, description: reason }
                    ]
                };
            }
            return r;
        }));
        return { success: true, message: 'Produkcja wstrzymana.' };
    }, [setProductionRunsList]);

    // FIX: Removed duplicate 'handlePauseProductionRun' implementation.

    const handleResumeProductionRun = useCallback((runId: string) => {
        setProductionRunsList(prev => prev.map(r => {
            if (r.id === runId && r.status === 'paused') {
                const downtimes = [...(r.downtimes || [])];
                const lastDowntime = downtimes[downtimes.length - 1];
                if (lastDowntime && lastDowntime.type === 'manual_pause' && !lastDowntime.endTime) {
                    lastDowntime.endTime = new Date().toISOString();
                    lastDowntime.durationMinutes = (new Date(lastDowntime.endTime).getTime() - new Date(lastDowntime.startTime).getTime()) / 60000;
                }
                return { ...r, status: 'ongoing', downtimes };
            }
            return r;
        }));
        return { success: true, message: 'Produkcja wznowiona.' };
    }, [setProductionRunsList]);

    const handleCompleteProductionRun = useCallback((runId: string, finalWeight: number) => {
        setProductionRunsList(prev => prev.map(r => {
            if (r.id === runId && (r.status === 'ongoing' || r.status === 'paused' || r.status === 'planned')) {
                const endTime = new Date().toISOString();
                return {
                    ...r,
                    status: 'completed',
                    endTime,
                    actualProducedQuantityKg: finalWeight !== undefined ? finalWeight : (r.actualProducedQuantityKg || 0)
                };
            }
            return r;
        }));
        return { success: true, message: 'Zlecenie zakończone.' };
    }, [setProductionRunsList]);

    const getDailyCapacity = (date: string) => ({ productionMinutes: 100, breakMinutes: 10, totalUsedMinutes: 110, totalMinutes: 480, remainingMinutes: 370 });

    const handleSplitPallet = (sourcePalletId: string, newWeights: number[]) => {
        let sourcePallet: FinishedGoodItem | undefined;
        let sourcePalletIndex = -1;

        const currentList = finishedGoodsList;
        sourcePalletIndex = currentList.findIndex(p => p.id === sourcePalletId || p.finishedGoodPalletId === sourcePalletId);
        
        if (sourcePalletIndex === -1) {
            return { success: false, message: 'Nie znaleziono palety źródłowej.' };
        }
        
        sourcePallet = currentList[sourcePalletIndex];
        const totalNewWeight = newWeights.reduce((sum, w) => sum + w, 0);

        if (totalNewWeight > sourcePallet.quantityKg + 0.01) { 
            return { success: false, message: `Suma nowych wag (${totalNewWeight.toFixed(2)} kg) przekracza wagę palety źródłowej (${sourcePallet.quantityKg.toFixed(2)} kg).` };
        }

        const newPallets: FinishedGoodItem[] = [];
        
        for (const weight of newWeights) {
            if (weight <= 0) continue;
            
            const newId = generate18DigitId();
            const tareWeight = sourcePallet.grossWeightKg - sourcePallet.quantityKg;

            const newPallet: FinishedGoodItem = {
                ...sourcePallet,
                id: newId,
                finishedGoodPalletId: newId,
                displayId: newId,
                quantityKg: weight,
                producedWeight: weight,
                grossWeightKg: weight + tareWeight,
                status: 'available',
                producedAt: new Date().toISOString(),
                locationHistory: [
                    ...sourcePallet.locationHistory,
                    {
                        movedBy: currentUser?.username || 'system',
                        movedAt: new Date().toISOString(),
                        previousLocation: sourcePallet.currentLocation,
                        targetLocation: sourcePallet.currentLocation!,
                        action: `split_into_${newId}_from_${sourcePallet.id}`,
                        notes: `Utworzono z podziału palety ${sourcePallet.displayId}`
                    }
                ]
            };
            newPallets.push(newPallet);
        }
        
        const remainingWeight = sourcePallet.quantityKg - totalNewWeight;
        const tareWeight = sourcePallet.grossWeightKg - sourcePallet.quantityKg;

        const updatedSourcePallet: FinishedGoodItem = {
            ...sourcePallet,
            quantityKg: remainingWeight,
            producedWeight: remainingWeight,
            grossWeightKg: remainingWeight > 0.01 ? remainingWeight + tareWeight : 0,
            status: remainingWeight > 0.01 ? sourcePallet.status : 'consumed_in_split',
            currentLocation: remainingWeight > 0.01 ? sourcePallet.currentLocation : null,
            locationHistory: [
                ...sourcePallet.locationHistory,
                {
                    movedBy: currentUser?.username || 'system',
                    movedAt: new Date().toISOString(),
                    previousLocation: sourcePallet.currentLocation,
                    targetLocation: remainingWeight > 0.01 ? sourcePallet.currentLocation! : null!,
                    action: `split_from_${sourcePallet.id}`,
                    notes: `Podzielono na ${newPallets.length} nowych palet. Pozostało ${remainingWeight.toFixed(2)} kg.`
                }
            ]
        };
        
        const newList = [...currentList];
        newList[sourcePalletIndex] = updatedSourcePallet;
        newList.push(...newPallets);
        
        setFinishedGoodsList(newList);

        return { 
            success: true, 
            message: 'Podział palety zakończony pomyślnie.', 
            newPallets, 
            updatedSourcePallet 
        };
    };

    const handleAddProductionEvent = useCallback((runId: string, eventData: Omit<ProductionEvent, 'id' | 'timestamp' | 'user'>) => {
        if (!currentUser) return { success: false, message: 'Brak aktywnej sesji użytkownika.' };
        const newEvent = { id: `evt-${Date.now()}`, timestamp: new Date().toISOString(), user: currentUser.username, ...eventData };
        setProductionRunsList(prev => prev.map(run => run.id === runId ? { ...run, events: [...(run.events || []), newEvent] } : run));
        return { success: true, message: 'Zdarzenie dodane do raportu.' };
    }, [currentUser, setProductionRunsList]);

    const handleDeleteProductionEvent = useCallback((runId: string, eventId: string) => {
        setProductionRunsList(prev => prev.map(run => {
            if (run.id === runId) {
                return {
                    ...run,
                    events: (run.events || []).filter(e => e.id !== eventId)
                };
            }
            return run;
        }));
        return { success: true, message: 'Wpis usunięty z raportu.' };
    }, [setProductionRunsList]);

    const handleUpdateStationMappings = (mappings: Record<string, string>) => setStationRawMaterialMapping(mappings);

    const value: ProductionContextValue = {
        productionRunsList, setProductionRunsList,
        finishedGoodsList, setFinishedGoodsList,
        recipes, stationRawMaterialMapping, 
        handleUpdateStationMappings,
        handleAssignPalletToProductionStation: () => ({ success: true, message: 'OK' }),
        getDailyCapacity,
        handleAddOrUpdateAgroRun: () => ({ success: true, message: 'OK' }),
        handleConfirmSplitRun: () => ({ success: true, message: 'OK' }),
        handleDeletePlannedProductionRun: () => ({ success: true, message: 'OK' }),
        handleStartProductionRun,
        handlePauseProductionRun,
        handleResumeProductionRun,
        handleCompleteProductionRun,
        handleEndAgroBatch,
        handleStartNextAgroBatch,
        handleRegisterFgForAgro: () => ({ success: true, message: 'OK' }),
        handleReturnRemainderToProduction: () => ({ success: true, message: 'OK' }),
        handleConsumeFromBufferForAgro: () => ({ success: true, message: 'OK' }),
        handleMoveFinishedGood: () => ({ success: true, message: 'OK' }),
        handleConfirmFinishedGoodLabeling: async () => ({ success: true, message: 'OK' }),
        productionRunTemplates,
        handleDeleteTemplate: (id) => setProductionRunTemplates(p => p.filter(t => t.id !== id)),
        handleSplitPallet,
        // FIX: Replaced 'boolean' type with 'true' value in mock implementation.
        handleAddLabSample: (tid: any, s: any, a: any) => ({ success: true, message: 'OK', newSample: {} }),
        handleArchiveLabSample: () => ({ success: true, message: 'OK' }),
        handleClearSuggestedTransfer: (tid: any) => {},
        handleUpdateBatchConfirmationStatus,
        handleConsumeAgroAdjustment,
        handleConsumeAdjustmentForPsd: () => ({ success: true, message: 'OK' }),
        handleMarkAgroIngredientWeighingFinished,
        handleAddRecipe: () => ({ success: true, message: 'OK' }),
        handleEditRecipe: () => ({ success: true, message: 'OK' }),
        handleAddProductionEvent,
        handleDeleteProductionEvent
    };

    return <ProductionContext.Provider value={value}>{children}</ProductionContext.Provider>
};