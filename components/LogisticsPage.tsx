import React, { useState, useMemo } from 'react';
import { DispatchOrder, View, Permission, InternalTransferOrder } from '../types';
import { useLogisticsContext } from './contexts/LogisticsContext';
import { useAuth } from './contexts/AuthContext';
import { useUIContext } from './contexts/UIContext';
import Button from './Button';
import { formatDate, getDispatchOrderStatusLabel } from '../src/utils';
import { useSortableData } from '../src/useSortableData';
import SortableHeader from './SortableHeader';
import TruckIcon from './icons/TruckIcon';
import PlusIcon from './icons/PlusIcon';
import NewDispatchOrderForm from './NewDispatchOrderForm';
import DispatchOrderDetailModal from './DispatchOrderDetailModal';
import ConfirmationModal from './ConfirmationModal';
import TrashIcon from './icons/TrashIcon';
import XCircleIcon from './icons/XCircleIcon';
import WarehouseIcon from './icons/WarehouseIcon';
import ArrowLeftRightIcon from './icons/ArrowLeftRightIcon';

type CombinedDispatchItem = (DispatchOrder | InternalTransferOrder) & { _type: 'CLIENT' | 'INTERNAL' };

const LogisticsPage: React.FC = () => {
    const { dispatchOrders, internalTransferOrders, handleAddDispatchOrder, handleUpdateDispatchOrder, handleDeleteDispatchOrder, handleCancelInternalTransfer } = useLogisticsContext();
    const { currentUser, checkPermission } = useAuth();
    const { handleSetView, modalHandlers } = useUIContext();

    const [isFormVisible, setIsFormVisible] = useState(false);
    const [selectedWarehouse, setSelectedWarehouse] = useState<'Centrala' | 'OSIP'>('Centrala');
    const [orderToEdit, setOrderToEdit] = useState<DispatchOrder | null>(null);
    const [orderToView, setOrderToView] = useState<DispatchOrder | null>(null);
    const [orderToDelete, setOrderToDelete] = useState<CombinedDispatchItem | null>(null);

    const combinedOrders = useMemo(() => {
        const clients = (dispatchOrders || []).map(o => ({ ...o, _type: 'CLIENT' as const }));
        const internal = (internalTransferOrders || []).filter(o => o.status === 'PLANNED').map(o => ({ ...o, _type: 'INTERNAL' as const }));
        return [...clients, ...internal];
    }, [dispatchOrders, internalTransferOrders]);

    const { items: sortedOrders, requestSort, sortConfig } = useSortableData(combinedOrders, { key: 'createdAt', direction: 'descending' });

    if (isFormVisible) {
        return <NewDispatchOrderForm onBack={() => setIsFormVisible(false)} onSave={() => setIsFormVisible(false)} currentUser={currentUser} orderToEdit={orderToEdit} sourceWarehouse={selectedWarehouse} />;
    }
    
    return (
        <div className="p-4 md:p-6 bg-white dark:bg-secondary-800 shadow-xl rounded-lg h-full flex flex-col">
            <header className="flex justify-between items-center mb-6 border-b dark:border-secondary-600 pb-3 gap-3">
                <div className="flex items-center gap-3">
                    <TruckIcon className="h-8 w-8 text-primary-600 dark:text-primary-400" />
                    <h2 className="text-2xl font-semibold text-primary-700 dark:text-primary-300">Zlecenia Wydania</h2>
                </div>
                {checkPermission(Permission.PLAN_DISPATCH_ORDERS) && <Button onClick={() => setIsFormVisible(true)} leftIcon={<PlusIcon className="h-5 w-5"/>}>Nowe Zlecenie</Button>}
            </header>
            <div className="flex-grow overflow-auto">
                <table className="min-w-full text-sm">
                    <thead>
                        <tr className="bg-gray-50 dark:bg-secondary-700">
                            <SortableHeader columnKey="id" sortConfig={sortConfig} requestSort={requestSort}>ID</SortableHeader>
                            <th className="px-4 py-3 text-left">Odbiorca</th>
                            <th className="px-4 py-3 text-right">Akcje</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y dark:divide-secondary-700">
                        {sortedOrders.map(order => (
                            <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-secondary-700/50">
                                <td className="px-4 py-3 font-mono">{order.id}</td>
                                <td className="px-4 py-3">{(order as any).recipient || (order as any).destinationWarehouse}</td>
                                <td className="px-4 py-3 text-right">
                                    <Button onClick={() => handleSetView(View.DispatchFulfillment, { orderId: order.id })}>Realizuj</Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default LogisticsPage;