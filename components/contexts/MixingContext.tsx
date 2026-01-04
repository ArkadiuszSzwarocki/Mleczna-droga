
import React, { createContext, useContext, PropsWithChildren, useState } from 'react';
import { MixingContextValue, MixingTask } from '../../types';
import { INITIAL_MIXING_TASKS } from '../../src/initialData';
import { useProductionContext } from './ProductionContext';
import { useWarehouseContext } from './WarehouseContext';
import { MIXING_ZONE_ID, VIRTUAL_LOCATION_ARCHIVED } from '../../constants';
import { getBlockInfo } from '../../src/utils';

export const MixingContext = createContext<MixingContextValue | undefined>(undefined);

export const useMixingContext = (): MixingContextValue => {
    const context = useContext(MixingContext);
    if (!context) {
        throw new Error('useMixingContext must be used within a MixingProvider');
    }
    return context;
};

export const MixingProvider: React.FC<PropsWithChildren> = ({ children }) => {
    const { finishedGoodsList, setFinishedGoodsList } = useProductionContext();
    const { inventorySessions } = useWarehouseContext();
    const [mixingTasks, setMixingTasks] = useState<MixingTask[]>(INITIAL_MIXING_TASKS);

    const handleUpdateMixingTask = (taskId: string, updates: Partial<MixingTask>) => {
        setMixingTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updates } : t));
        return { success: true, message: 'Zlecenie zaktualizowane.' };
    };
    
    const handleAddMixingTask = (taskData: Omit<MixingTask, 'id' | 'status' | 'createdAt' | 'createdBy' | 'consumedSourcePallets'>) => {
        const newTask: MixingTask = {
            id: `MIX-${Date.now()}`,
            status: 'planned',
            createdAt: new Date().toISOString(),
            createdBy: 'system', // Should be current user
            consumedSourcePallets: [],
            ...taskData
        };
        setMixingTasks(prev => [...prev, newTask]);
        return { success: true, message: 'Zlecenie utworzone.', newTask };
    };

    const handleDeleteMixingTask = (taskId: string) => {
        setMixingTasks(prev => prev.filter(t => t.id !== taskId));
        return { success: true, message: 'Zlecenie usunięte.' };
    };
    
    const handleCancelMixingTask = (taskId: string) => {
        // Return consumed pallets to available? Simplified: just mark as cancelled.
        setMixingTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'cancelled' } : t));
        return { success: true, message: 'Zlecenie anulowane.' };
    };

    const handleConsumeForMixing = (taskId: string, palletId: string, weightToConsume: number) => {
        const palletIndex = finishedGoodsList.findIndex(p => p.id === palletId);
        if (palletIndex === -1) {
            return { success: false, message: `Nie znaleziono palety o ID ${palletId}.` };
        }
        
        const pallet = finishedGoodsList[palletIndex];
        const { isBlocked } = getBlockInfo(pallet);
        if (isBlocked) {
             return { success: false, message: `Paleta ${palletId} jest zablokowana.` };
        }

        // --- INVENTORY LOCK CHECK ---
        const activeSession = inventorySessions.find(s => s.status === 'ongoing');
        if (activeSession && pallet.currentLocation && activeSession.locations.some(l => l.locationId === pallet.currentLocation)) {
             return { success: false, message: `Lokalizacja ${pallet.currentLocation} jest objęta aktywną inwentaryzacją. Zużycie zablokowane.` };
        }
        // ----------------------------
        
        const taskIndex = mixingTasks.findIndex(t => t.id === taskId);
        if (taskIndex === -1) {
            return { success: false, message: `Nie znaleziono zlecenia miksowania o ID ${taskId}.` };
        }
        
        // Update task consumption
        const updatedTasks = [...mixingTasks];
        const task = { ...updatedTasks[taskIndex] };
        
        task.consumedSourcePallets.push({
            palletId: pallet.id,
            displayId: pallet.displayId || pallet.id,
            productName: pallet.productName,
            consumedWeight: weightToConsume
        });
        updatedTasks[taskIndex] = task;
        setMixingTasks(updatedTasks);
        
        // Update source pallet
        const updatedPallets = [...finishedGoodsList];
        const remaining = pallet.quantityKg - weightToConsume;
        if (remaining < 0.01) {
             updatedPallets[palletIndex] = { ...pallet, quantityKg: 0, status: 'consumed_in_mixing', currentLocation: VIRTUAL_LOCATION_ARCHIVED };
        } else {
             updatedPallets[palletIndex] = { ...pallet, quantityKg: remaining };
        }
        setFinishedGoodsList(updatedPallets);

        return { success: true, message: `Zużyto ${weightToConsume} kg z palety ${palletId}.` };
    };
    
    const handleCompleteMixingTask = (taskId: string) => {
        const task = mixingTasks.find(t => t.id === taskId);
        if (!task) return { success: false, message: 'Nie znaleziono zlecenia.' };
        
        // Create new pallet
        const totalWeight = task.consumedSourcePallets.reduce((sum, p) => sum + p.consumedWeight, 0);
        const newPalletId = `WGMIX-${Date.now()}`;
        const newPallet: any = {
            id: newPalletId,
            displayId: newPalletId,
            finishedGoodPalletId: newPalletId,
            productName: task.name, // Using task name as product name for mix
            quantityKg: totalWeight,
            producedWeight: totalWeight,
            grossWeightKg: totalWeight + 25,
            status: 'pending_label',
            productionDate: new Date().toISOString(),
            expiryDate: new Date(new Date().setMonth(new Date().getMonth() + 6)).toISOString().split('T')[0], // Default 6 months
            sourceMixingTaskId: taskId,
            currentLocation: MIXING_ZONE_ID,
            palletType: 'EUR',
            locationHistory: []
        };
        
        setFinishedGoodsList(prev => [...prev, newPallet]);
        setMixingTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'completed' } : t));

        return { success: true, message: 'Miksowanie zakończone.', newPallet };
    };

    const value = {
        mixingTasks,
        handleAddMixingTask,
        handleUpdateMixingTask,
        handleDeleteMixingTask,
        handleConsumeForMixing,
        handleCompleteMixingTask,
        handleCancelMixingTask
    };

    return <MixingContext.Provider value={value}>{children}</MixingContext.Provider>;
};
