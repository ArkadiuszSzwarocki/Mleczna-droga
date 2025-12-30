
import React, { createContext, useContext, PropsWithChildren, useState, useEffect, useCallback, useMemo } from 'react';

import { AuthProvider, useAuth } from './AuthContext';
import { WarehouseProvider, useWarehouseContext } from './WarehouseContext';
import { ProductionProvider, useProductionContext } from './ProductionContext';
import { RecipeAdjustmentProvider, useRecipeAdjustmentContext } from './RecipeAdjustmentContext';
import { MixingProvider, useMixingContext } from './MixingContext';
import { PsdProvider, usePsdContext } from './PsdContext';
import { LogisticsProvider, useLogisticsContext } from './LogisticsContext';
import { UIProvider, useUIContext } from './UIContext';
import { ConnectionStatusType, verifyConnection } from '../../src/useOnlineStatus';
import { User, ProductionRun, Recipe, RawMaterialLogEntry, AgroConsumedMaterial, InventorySession, FinishedGoodItem, PackagingMaterialLogEntry, AdjustmentOrder } from '../../types';
import { getBlockInfo } from '../../src/utils';
import { VIRTUAL_LOCATION_ARCHIVED, VIRTUAL_LOCATION_MISSING } from '../../constants';
import { logger } from '../../utils/logger';


const AppContext = createContext<any>(undefined);

export const useAppContext = () => {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error('useAppContext must be used within an AppProvider');
    }
    return context;
};

const AppContextComposer: React.FC<PropsWithChildren> = ({ children }) => {
    const auth = useAuth();
    const warehouse = useWarehouseContext();
    const production = useProductionContext();
    const recipeAdjustment = useRecipeAdjustmentContext();
    const mixing = useMixingContext();
    const psd = usePsdContext();
    const logistics = useLogisticsContext();
    const ui = useUIContext();

    const [connectionStatus, setConnectionStatus] = useState<ConnectionStatusType>(navigator.onLine ? 'good' : 'offline');
    const [latency, setLatency] = useState<number | null>(null);

    const verifyConnectionNow = useCallback(() => {
        return verifyConnection(setConnectionStatus, setLatency);
    }, []);

    useEffect(() => {
        verifyConnectionNow();
        const handleOnline = () => verifyConnectionNow();
        const handleOffline = () => {
            setConnectionStatus('offline');
            setLatency(null);
        };
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        const interval = setInterval(verifyConnectionNow, 60000);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            clearInterval(interval);
        };
    }, [verifyConnectionNow]);
    
    // --- SYNCHRONIZACJA Z BRAMĄ DLA ZARZĄDU ---
    useEffect(() => {
        if (!auth.currentUser || !ui.gatewayServerUrl) return;

        const syncToGateway = async () => {
            try {
                // Używamy dynamicznego adresu URL z ustawień
                const response = await fetch(`${ui.gatewayServerUrl}/api/update`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        productionRuns: production.productionRunsList,
                        psdTasks: psd.psdTasks,
                        rawMaterials: warehouse.rawMaterialsLogList,
                        finishedGoods: warehouse.finishedGoodsList,
                        deliveries: warehouse.deliveries.filter(d => d.status !== 'COMPLETED'),
                        usersCount: auth.users.length,
                        activeUser: auth.currentUser?.username,
                        systemTime: new Date().toISOString()
                    })
                });
                
                if (response.ok) {
                    console.debug('[GATEWAY] State synced successfully');
                }
            } catch (err) {
                console.debug('[GATEWAY] Sync unavailable at', ui.gatewayServerUrl);
            }
        };

        const timer = setTimeout(syncToGateway, 5000);
        return () => clearTimeout(timer);
    }, [
        production.productionRunsList, 
        psd.psdTasks, 
        warehouse.rawMaterialsLogList, 
        warehouse.finishedGoodsList, 
        warehouse.deliveries,
        auth.users.length,
        auth.currentUser,
        ui.gatewayServerUrl
    ]);

    const handleAssignPalletToProductionStation = useCallback((palletId: string, stationId: string) => {
        const pallet = warehouse.rawMaterialsLogList.find((p: RawMaterialLogEntry) => p.id === palletId);
        if (!pallet) return { success: false, message: 'Nie znaleziono palety.' };

        const requiredMaterial = production.stationRawMaterialMapping[stationId];
        if (pallet.palletData.nazwa !== requiredMaterial) {
            return { success: false, message: `Błąd: Na stacji ${stationId} wymagany jest surowiec: ${requiredMaterial}.` };
        }

        const res = warehouse.handleUniversalMove(palletId, 'raw', stationId, `Zasyp stacji produkcyjnej ${stationId}`);
        
        if (res.success) {
            logger.log('info', `Zasypano stację ${stationId} paletą ${pallet.palletData.nrPalety} (${pallet.palletData.nazwa})`, 'Production', auth.currentUser?.username);
        }
        return res;
    }, [warehouse.rawMaterialsLogList, warehouse.handleUniversalMove, production.stationRawMaterialMapping, auth.currentUser]);

    const handleManualAgroConsumption = (runId: string, batchId: string, productName: string, weightToConsume: number) => {
        const run = production.productionRunsList.find((r: ProductionRun) => r.id === runId);
        if (!run) return { type: 'error', message: 'Nie znaleziono zlecenia produkcyjnego.' };
    
        const stationId = Object.keys(production.stationRawMaterialMapping).find(key => production.stationRawMaterialMapping[key] === productName);
        if (!stationId) return { type: 'error', message: `Brak przypisanej stacji zasypowej dla surowca: ${productName}.` };
    
        const pallet = warehouse.rawMaterialsLogList.find((p: RawMaterialLogEntry) => p.currentLocation === stationId);
        if (!pallet) return { type: 'error', message: `Stacja ${stationId} jest pusta. Uzupełnij surowiec ${productName}.` };
        
        const activeSession = warehouse.inventorySessions.find(s => s.status === 'ongoing');
        if (activeSession && activeSession.locations.some(l => l.locationId === pallet.currentLocation)) {
             return { type: 'error', message: `Stacja ${pallet.currentLocation} jest objęta aktywną inwentaryzacją. Zużycie zablokowane.` };
        }

        const { isBlocked, reason } = getBlockInfo(pallet);
        if (isBlocked || pallet.palletData.nazwa !== productName) {
            return { type: 'error', message: `Nieprawidłowa lub zablokowana paleta na stacji ${stationId}. Powód: ${reason || 'Zły produkt'}` };
        }
    
        const batch = run.batches.find(b => b.id === batchId);
        const recipe = production.recipes.find((r: Recipe) => r.id === run.recipeId);
        if (!batch || !recipe) return { type: 'error', message: 'Nie znaleziono partii lub receptury.' };
        
        const recipeBatchWeight = recipe.ingredients.reduce((sum, ing) => sum + ing.quantityKg, 0);
        if (recipeBatchWeight <= 0) return { type: 'error', message: 'Błąd w recepturze.' };
        
        const availableWeight = pallet.palletData.currentWeight;
        const amountToConsume = Math.min(weightToConsume, availableWeight); 
        
        warehouse.setRawMaterialsLogList(prev => prev.map(p => {
            if (p.id === pallet!.id) {
                const newWeight = p.palletData.currentWeight - amountToConsume;
                const wasEmptied = newWeight < 0.001;
                return {
                    ...p,
                    palletData: { ...p.palletData, currentWeight: newWeight },
                    currentLocation: wasEmptied ? VIRTUAL_LOCATION_ARCHIVED : p.currentLocation,
                    locationHistory: [
                        ...p.locationHistory,
                        {
                            movedBy: auth.currentUser?.username || 'system',
                            movedAt: new Date().toISOString(),
                            previousLocation: stationId,
                            targetLocation: wasEmptied ? VIRTUAL_LOCATION_ARCHIVED : stationId,
                            action: wasEmptied ? 'consumed_and_archived' : 'consumed_in_agro',
                            notes: `Ręczne zużycie ${amountToConsume.toFixed(3)} kg dla zlecenia ${runId}.`
                        }
                    ]
                };
            }
            return p;
        }));
        
        production.setProductionRunsList(prevRuns => prevRuns.map(r => {
            if (r.id === runId) {
                const newConsumption: AgroConsumedMaterial = {
                    consumptionId: `cons-${Date.now()}-${Math.random()}`,
                    isAnnulled: false,
                    productName: productName,
                    actualConsumedQuantityKg: amountToConsume,
                    actualSourcePalletId: pallet!.id,
                    batchId: batchId,
                    isAdjustment: false,
                };
                return {
                    ...r,
                    actualIngredientsUsed: [...(r.actualIngredientsUsed || []), newConsumption]
                };
            }
            return r;
        }));
    
        return { type: 'success', message: `Zatwierdzono zużycie ${amountToConsume.toFixed(3)} kg ${productName}.` };
    };
    
    const handleConsumeAgroAdjustment = (runId: string, batchId: string, order: AdjustmentOrder) => {
        const res = production.handleConsumeAgroAdjustment(runId, batchId, order);
        if (res.success) {
            recipeAdjustment.handleUpdateAdjustmentOrder(order.id, { 
                status: 'completed', 
                completedAt: new Date().toISOString() 
            });
            logger.log('info', `Zatwierdzono zużycie wiadra ${order.preparationLocation} dla szarży ${batchId}`, 'Production', auth.currentUser?.username);
        }
        return res;
    };

    const handleAnnulAgroConsumption = (runId: string, consumptionId: string) => {
         let consumedItem: AgroConsumedMaterial | undefined;
         production.setProductionRunsList(prevRuns => prevRuns.map(r => {
            if (r.id === runId) {
                const updatedIngredients = r.actualIngredientsUsed?.map(c => {
                    if (c.consumptionId === consumptionId && !c.isAnnulled) {
                        consumedItem = c;
                        return { ...c, isAnnulled: true };
                    }
                    return c;
                });
                return { ...r, actualIngredientsUsed: updatedIngredients };
            }
            return r;
        }));

        if (consumedItem) {
             warehouse.setRawMaterialsLogList(prev => prev.map(p => {
                 if (p.id === consumedItem!.actualSourcePalletId) {
                     return {
                         ...p,
                         palletData: { ...p.palletData, currentWeight: p.palletData.currentWeight + consumedItem!.actualConsumedQuantityKg },
                         currentLocation: p.currentLocation === VIRTUAL_LOCATION_ARCHIVED ? 'MS01' : p.currentLocation
                     };
                 }
                 return p;
             }));
             ui.showToast('Zużycie anulowane.', 'success');
        }
    };
    
    const reservedForTransferPalletIds = useMemo(() => {
        const reserved = new Set<string>();
        (logistics.internalTransferOrders || []).forEach(order => {
             if (order.status === 'PLANNED' || order.status === 'IN_TRANSIT') {
                 order.pallets.forEach(p => reserved.add(p.palletId));
             }
        });
        return reserved;
    }, [logistics.internalTransferOrders]);


    const combinedValue = {
        ...auth,
        ...warehouse,
        ...production,
        ...recipeAdjustment,
        ...mixing,
        ...psd,
        ...logistics,
        ...ui,
        handleManualAgroConsumption,
        handleAnnulAgroConsumption,
        handleConsumeAgroAdjustment, 
        handleAssignPalletToProductionStation,
        reservedForTransferPalletIds,
        connectionStatus,
        latency,
        verifyConnectionNow,
        handleUnblockPallet: warehouse.handleUnblockPallet,
        handleBlockPallet: warehouse.handleBlockPallet,
    };

    return (
        <AppContext.Provider value={combinedValue}>
            {children}
        </AppContext.Provider>
    );
};

export const AppProvider: React.FC<PropsWithChildren> = ({ children }) => {
    return (
        <AuthProvider>
            <WarehouseProvider>
                <ProductionProvider>
                    <RecipeAdjustmentProvider>
                        <MixingProvider>
                            <PsdProvider>
                                <LogisticsProvider>
                                    <UIProvider>
                                        <AppContextComposer>
                                            {children}
                                        </AppContextComposer>
                                    </UIProvider>
                                </LogisticsProvider>
                            </PsdProvider>
                        </MixingProvider>
                    </RecipeAdjustmentProvider>
                </ProductionProvider>
            </WarehouseProvider>
        </AuthProvider>
    );
};
