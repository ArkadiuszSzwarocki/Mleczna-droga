
import React, { createContext, useContext, PropsWithChildren, useCallback, useState } from 'react';
import { PsdContextValue, PsdTask, RawMaterialLogEntry, PsdConsumedMaterial, ProductionEvent } from '../../types';
import { INITIAL_PSD_TASKS } from '../../src/initialData';
import { useAuth } from './AuthContext';
import { useWarehouseContext } from './WarehouseContext';
import { VIRTUAL_LOCATION_ARCHIVED, PSD_WAREHOUSE_ID } from '../../constants';
import { logger } from '../../utils/logger';

export const PsdContext = createContext<PsdContextValue | undefined>(undefined);

export const usePsdContext = (): PsdContextValue => {
    const context = useContext(PsdContext);
    if (!context) {
        throw new Error('usePsdContext must be used within a PsdProvider');
    }
    return context;
};

export const PsdProvider: React.FC<PropsWithChildren> = ({ children }) => {
    const [psdTasks, setPsdTasks] = useState<PsdTask[]>(INITIAL_PSD_TASKS);
    const { setFinishedGoodsList, setRawMaterialsLogList, rawMaterialsLogList, inventorySessions } = useWarehouseContext();
    const { currentUser } = useAuth();

    const handleSavePsdTask = (taskData: PsdTask) => {
        let isNew = true;
        setPsdTasks(prev => {
            const exists = prev.some(t => t.id === taskData.id);
            if (exists) {
                isNew = false;
                return prev.map(t => t.id === taskData.id ? { ...t, ...taskData, updatedAt: new Date().toISOString() } : t);
            }
            return [...prev, taskData];
        });
        logger.log('info', `${isNew ? 'Utworzono' : 'Zaktualizowano'} zlecenie PSD: ${taskData.recipeName} (${taskData.targetQuantity} kg)`, 'Planner', currentUser?.username);
        return { success: true, message: 'Zlecenie zapisane.', task: taskData };
    };
    
    const handleUpdatePsdTask = (taskId: string, action: { type: string; payload?: any }) => {
        let result = { success: false, message: '', newPallet: undefined as any };
        setPsdTasks(prev => {
            const index = prev.findIndex(t => t.id === taskId);
            if (index === -1) return prev;
            const task = { ...prev[index] };
            
            switch (action.type) {
                case 'INITIALIZE_BATCHES':
                    task.status = 'ongoing';
                    logger.log('info', `Zainicjowano produkcję zlecenia PSD ${taskId}`, 'Production', currentUser?.username);
                    break;
                case 'REGISTER_FG':
                     const { producedWeight } = action.payload;
                     logger.log('info', `Zarejestrowano wyrób gotowy PSD (${producedWeight} kg) dla zlecenia ${taskId}`, 'Production', currentUser?.username);
                     break;
                case 'END_TASK':
                    task.status = 'completed';
                    task.completedAt = new Date().toISOString();
                    logger.log('info', `Zakończono realizację zlecenia PSD ${taskId}`, 'Production', currentUser?.username);
                    break;
            }
            
            const newTasks = [...prev];
            newTasks[index] = task;
            return newTasks;
        });
        return result;
    };
    
    const handleConsumeForPsd = (taskId: string, batchId: string, pallet: RawMaterialLogEntry, weightToConsume: number) => {
        logger.log('info', `Zużyto ${weightToConsume} kg surowca ${pallet.palletData.nazwa} (z ${pallet.palletData.nrPalety}) dla PSD: ${taskId}`, 'Production', currentUser?.username);
        return { success: true, message: `Zużyto ${weightToConsume} kg.`, updatedPallet: pallet };
    };

    const value = {
        psdTasks, handleSavePsdTask, handleUpdatePsdTask,
        handleDeletePsdTask: (id: string) => {
            logger.log('warn', `Usunięto zlecenie PSD: ${id}`, 'Planner', currentUser?.username);
            setPsdTasks(prev => prev.filter(t => t.id !== id));
            return { success: true, message: 'Usunięto.' };
        },
        handleConsumeForPsd,
        handleReturnPsdConsumption: (tid: any, bid: any, c: any) => ({ success: true, message: 'OK' }),
        handleAddLabSample: (tid: any, s: any, a: any) => ({ success: true, message: 'OK', newSample: {} }),
        handleArchiveLabSample: () => ({ success: true, message: 'OK' }),
        handleClearSuggestedTransfer: (tid: any) => {},
        handleUpdatePsdBatchConfirmationStatus: (tid: any, bid: any, step: any, s: any) => ({ success: true, message: 'OK' }),
        handleAddProductionEvent: (tid: any, e: any) => ({ success: true, message: 'OK' }),
        handleDeleteProductionEvent: (tid: any, eid: any) => ({ success: true, message: 'OK' })
    };

    return <PsdContext.Provider value={value as any}>{children}</PsdContext.Provider>;
};
