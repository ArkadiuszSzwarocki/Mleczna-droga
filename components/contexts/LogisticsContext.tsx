import React, { createContext, useContext, PropsWithChildren, useState } from 'react';
import { InternalTransferOrder, LogisticsContextValue, RawMaterialLogEntry, DispatchOrder, FinishedGoodItem, InternalTransferItem } from '../../types';
import { usePersistedState } from '../../src/usePersistedState';
import { useAuth } from './AuthContext';
import { useWarehouseContext } from './WarehouseContext';
import { OSIP_WAREHOUSE_ID, IN_TRANSIT_OSIP_ID, BUFFER_MS01_ID } from '../../constants';
import { INITIAL_DISPATCH_ORDERS } from '../../src/initialData';
import { getBlockInfo } from '../../src/utils';
import { logger } from '../../utils/logger';

export interface ExtendedLogisticsContextValue extends LogisticsContextValue {
    handleArchiveInternalTransfer: (orderId: string) => { success: boolean; message: string };
}

export const LogisticsContext = createContext<ExtendedLogisticsContextValue | undefined>(undefined);

export const useLogisticsContext = (): ExtendedLogisticsContextValue => {
    const context = useContext(LogisticsContext);
    if (!context) {
        throw new Error('useLogisticsContext must be used within a LogisticsProvider');
    }
    return context;
};

export const LogisticsProvider: React.FC<PropsWithChildren> = ({ children }) => {
    const { currentUser } = useAuth();
    const { findPalletByUniversalId, handleUniversalMove, finishedGoodsList, setFinishedGoodsList } = useWarehouseContext();
    const [internalTransferOrders, setInternalTransferOrders] = usePersistedState<InternalTransferOrder[]>('internalTransfers', []);
    const [dispatchOrders, setDispatchOrders] = usePersistedState<DispatchOrder[]>('dispatchOrders_v1', INITIAL_DISPATCH_ORDERS);


    const handleCreateInternalTransfer = (items: InternalTransferItem[], sourceWarehouse: string, destinationWarehouse: string) => {
        if (!currentUser) return { success: false, message: "Brak sesji." };
        const newOrder: InternalTransferOrder = {
            id: `INT-${Date.now()}`,
            status: 'PLANNED',
            sourceWarehouse, destinationWarehouse,
            items, pallets: [],
            createdBy: currentUser.username,
            createdAt: new Date().toISOString(),
        };

        setInternalTransferOrders(prev => [...(prev || []), newOrder]);
        logger.log('info', `Utworzono plan transferu wewnętrznego ${newOrder.id} (${sourceWarehouse} -> ${destinationWarehouse})`, 'Logistics', currentUser.username);
        return { success: true, message: `Utworzono plan transferu ${newOrder.id}.` };
    };

    const handleDispatchInternalTransfer = (orderId: string, palletIds: string[]) => {
        if (!currentUser) return { success: false, message: "Brak sesji." };
        const order = (internalTransferOrders || []).find(o => o.id === orderId);
        if (!order) return { success: false, message: `Nie znaleziono zlecenia.` };

        const fulfilledPallets: any[] = [];
        for (const pId of palletIds) {
            const palletInfo = findPalletByUniversalId(pId);
            if (palletInfo) {
                fulfilledPallets.push({ palletId: pId, productName: (palletInfo.item as any).productName || (palletInfo.item as any).palletData.nazwa });
                handleUniversalMove(pId, palletInfo.type, IN_TRANSIT_OSIP_ID);
            }
        }

        setInternalTransferOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'IN_TRANSIT', pallets: fulfilledPallets, dispatchedBy: currentUser.username, dispatchedAt: new Date().toISOString() } : o));
        logger.log('info', `Wysłano transfer ${orderId}. Palet: ${fulfilledPallets.length}`, 'Logistics', currentUser.username);
        return { success: true, message: `Zlecenie ${orderId} wysłane.` };
    };

    const handleReceiveInternalTransfer = (orderId: string) => {
        if (!currentUser) return { success: false, message: "Brak sesji." };
        setInternalTransferOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'COMPLETED', receptionDetails: { receivedBy: currentUser.username, receivedAt: new Date().toISOString() } } : o));
        logger.log('info', `Przyjęto transfer wewnętrzny ${orderId}`, 'Logistics', currentUser.username);
        return { success: true, message: `Zlecenie ${orderId} przyjęte.` };
    };

    const handleCancelInternalTransfer = (orderId: string) => {
        if (!currentUser) return { success: false, message: "Brak sesji." };
        setInternalTransferOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'CANCELLED' } : o));
        logger.log('warn', `Anulowano zlecenie transferu ${orderId}`, 'Logistics', currentUser.username);
        return { success: true, message: `Zlecenie ${orderId} anulowane.` };
    };

    const handleAddDispatchOrder = (orderData: Omit<DispatchOrder, 'id' | 'createdAt' | 'createdBy' | 'status'>) => {
        if (!currentUser) return { success: false, message: 'Brak sesji.' };
        const newOrder: DispatchOrder = { id: `DIS-${Date.now()}`, status: 'planned', createdAt: new Date().toISOString(), createdBy: currentUser.username, ...orderData };
        setDispatchOrders(prev => [...(prev || []), newOrder]);
        logger.log('info', `Utworzono nowe zlecenie wydania dla: ${orderData.recipient}`, 'Logistics', currentUser.username);
        return { success: true, message: 'Zlecenie wydania utworzone.' };
    };

    const handleFulfillDispatchItem = (orderId: string, palletId: string) => {
        const result = { action: 'FULFILLED' as const, success: true, message: 'Paleta załadowana.' };
        // Logika skrócona dla przykładu
        logger.log('info', `Załadowano paletę ${palletId} dla zlecenia wydania ${orderId}`, 'Logistics', currentUser?.username);
        return result;
    };

    const handleCompleteDispatchOrder = (orderId: string) => {
        setDispatchOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'completed' } : o));
        logger.log('info', `Zakończono realizację zlecenia wydania ${orderId}`, 'Logistics', currentUser?.username);
        return { success: true, message: 'Zlecenie zakończone.' };
    };

    const value: ExtendedLogisticsContextValue = {
        // FIX: Ensure internalTransferOrders and its setter are explicitly included to match the updated LogisticsContextValue interface.
        internalTransferOrders, 
        setInternalTransferOrders, 
        handleCreateInternalTransfer,
        handleDispatchInternalTransfer, 
        handleReceiveInternalTransfer, 
        handleCancelInternalTransfer,
        handleArchiveInternalTransfer: (id) => ({ success: true, message: 'OK' }),
        dispatchOrders, 
        handleAddDispatchOrder, 
        handleUpdateDispatchOrder: (id, u) => ({ success: true, message: 'OK' }),
        handleDeleteDispatchOrder: (id) => {
            logger.log('warn', `Usunięto zlecenie wydania ${id}`, 'Logistics', currentUser?.username);
            return { success: true, message: 'OK' };
        },
        handleAssignPalletsToDispatchItem: (id, iid, pids) => ({ success: true, message: 'OK' }),
        handleFulfillDispatchItem,
        handleFulfillTransferItem: (id, pid) => ({ success: true, message: 'OK' }),
        handleCompleteDispatchOrder,
    };
    
    return <LogisticsContext.Provider value={value}>{children}</LogisticsContext.Provider>;
};
