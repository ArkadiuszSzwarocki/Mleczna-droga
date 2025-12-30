import React, { createContext, useContext, PropsWithChildren } from 'react';
import { AdjustmentOrder } from '../../types';
import { usePersistedState } from '../../src/usePersistedState';
// FIX: Corrected import path for initialData to be relative
import { INITIAL_ADJUSTMENT_ORDERS } from '../../src/initialData';
import { useAuth } from './AuthContext';

export interface RecipeAdjustmentContextValue {
    adjustmentOrders: AdjustmentOrder[];
    handleUpdateAdjustmentOrder: (orderId: string, updates: Partial<AdjustmentOrder>) => { success: boolean, message: string, updatedOrder?: AdjustmentOrder };
    handleAddAdjustmentOrder: (orderData: Omit<AdjustmentOrder, 'id' | 'status' | 'createdAt' | 'createdBy' | 'preparationLocation' | 'completedAt' | 'productionType'>) => { success: boolean; message: string; newOrder?: AdjustmentOrder };
    handleDeleteAdjustmentOrder: (orderId: string) => { success: boolean; message: string };
}

export const RecipeAdjustmentContext = createContext<RecipeAdjustmentContextValue | undefined>(undefined);

export const useRecipeAdjustmentContext = (): RecipeAdjustmentContextValue => {
    const context = useContext(RecipeAdjustmentContext);
    if (!context) {
        throw new Error('useRecipeAdjustmentContext must be used within a RecipeAdjustmentProvider');
    }
    return context;
};

export const RecipeAdjustmentProvider: React.FC<PropsWithChildren> = ({ children }) => {
    const [adjustmentOrders, setAdjustmentOrders] = usePersistedState<AdjustmentOrder[]>('adjustmentOrders', INITIAL_ADJUSTMENT_ORDERS);
    const { currentUser } = useAuth();

    const handleUpdateAdjustmentOrder = (orderId: string, updates: Partial<AdjustmentOrder>) => {
        let updatedOrder: AdjustmentOrder | undefined;
        setAdjustmentOrders(prev => prev.map(o => {
            if (o.id === orderId) {
                updatedOrder = { ...o, ...updates };
                return updatedOrder;
            }
            return o;
        }));
        return { success: true, message: 'Zlecenie dosypki zaktualizowane.', updatedOrder };
    };
    
    const handleAddAdjustmentOrder = (orderData: any) => {
        const productionType = orderData.productionRunId.startsWith('ZLEAGR') ? 'AGRO' : 'PSD';

        const newOrder: AdjustmentOrder = {
            id: `ADJ-${Date.now()}`,
            status: 'planned',
            createdAt: new Date().toISOString(),
            createdBy: currentUser?.username || 'user',
            materials: orderData.materials,
            productionRunId: orderData.productionRunId,
            recipeName: orderData.recipeName,
            productionType: productionType,
            batchId: orderData.batchId, // Add batchId if it exists
            reason: orderData.reason,
        };
        setAdjustmentOrders(prev => [...prev, newOrder]);
        return { success: true, message: 'Dodano zlecenie dosypki.', newOrder };
    };

    const handleDeleteAdjustmentOrder = (orderId: string) => {
        setAdjustmentOrders(prev => prev.filter(o => o.id !== orderId));
        return { success: true, message: 'Usunięto zlecenie dosypki.' };
    };

    const value = {
        adjustmentOrders,
        handleUpdateAdjustmentOrder,
        handleAddAdjustmentOrder,
        handleDeleteAdjustmentOrder,
    };

    return <RecipeAdjustmentContext.Provider value={value}>{children}</RecipeAdjustmentContext.Provider>
}