
import React, { useState, useMemo, useEffect } from 'react';
import { AdjustmentOrder, Permission, UserRole } from '../types';
import { useAppContext } from './contexts/AppContext';
import Button from './Button';
import { getAdjustmentOrderStatusLabel, formatDate } from '../src/utils';
import AdjustmentsHorizontalIcon from './icons/AdjustmentsHorizontalIcon';
import Alert from './Alert';
import ConfirmationModal from './ConfirmationModal';
import TrashIcon from './icons/TrashIcon';
import EditIcon from './icons/EditIcon';

const ManageAdjustmentsPage: React.FC = () => {
    const { adjustmentOrders, handleDeleteAdjustmentOrder, checkPermission, currentUser, modalHandlers } = useAppContext();

    const [orderToDelete, setOrderToDelete] = useState<AdjustmentOrder | null>(null);

    const activeOrders = useMemo(() => {
        let orders = (adjustmentOrders || []).filter(
            // Show planned, material_picking, and processing orders
            (order: AdjustmentOrder) => order.status !== 'completed' && order.status !== 'cancelled'
        );
        
        if (!currentUser) return [];

        const userRole = currentUser.role;

        // Filter based on user role
        if (userRole === 'operator_agro' || userRole === 'magazynier' || userRole === 'kierownik magazynu') {
            orders = orders.filter(o => o.productionType === 'AGRO');
        }
        if (userRole === 'operator_psd') {
            orders = orders.filter(o => o.productionType === 'PSD');
        }
        
        return orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [adjustmentOrders, currentUser]);

    const canPerformPicking = useMemo(() => {
        if (!currentUser) return false;
        // Admin, Boss, and specific operator roles can perform picking.
        const allowedRoles: UserRole[] = ['admin', 'boss', 'kierownik magazynu', 'magazynier', 'operator_agro', 'operator_psd'];
        return allowedRoles.includes(currentUser.role);
    }, [currentUser]);

    const canManage = checkPermission(Permission.MANAGE_ADJUSTMENTS);

    const handleStartPicking = (order: AdjustmentOrder) => {
        modalHandlers.openAssignAdjustmentToProductionModal(order, (updatedOrder: AdjustmentOrder) => {
             modalHandlers.openAdjustmentPickingModal(updatedOrder);
        });
    };
    
    const handleContinuePicking = (order: AdjustmentOrder) => {
        modalHandlers.openAdjustmentPickingModal(order);
    };

    const handleEditOrder = (order: AdjustmentOrder) => {
        modalHandlers.openEditAdjustmentOrderModal(order);
    };
    
    const confirmDelete = () => {
        if(orderToDelete) {
            handleDeleteAdjustmentOrder(orderToDelete.id);
            setOrderToDelete(null);
        }
    };


    return (
        <>
        <div className="p-4 md:p-6 bg-white dark:bg-secondary-800 shadow-xl rounded-lg h-full flex flex-col">
            <header className="flex-shrink-0 flex items-center mb-6 border-b dark:border-secondary-600 pb-3">
                <AdjustmentsHorizontalIcon className="h-8 w-8 text-primary-600 dark:text-primary-400 mr-3" />
                <h2 className="text-2xl font-semibold text-primary-700 dark:text-primary-300">Zarządzanie Zleceniami Dosypek</h2>
            </header>

            <div className="flex-grow overflow-auto">
                {activeOrders.length === 0 ? (
                    <Alert type="info" message="Brak aktywnych zleceń dosypek." />
                ) : (
                    <div className="space-y-4">
                        {activeOrders.map(order => {
                            const statusInfo = getAdjustmentOrderStatusLabel(order.status);
                            const totalWeight = order.materials.reduce((sum, m) => sum + m.quantityKg, 0);
                            return (
                                <div key={order.id} className="p-4 bg-slate-50 dark:bg-secondary-900 border-l-4 border-primary-500 rounded-r-lg shadow">
                                    <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-3">
                                        <div>
                                            <p className="font-bold text-gray-800 dark:text-gray-200">Zlecenie #{order.id.split('-')[1]}</p>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">Dla: <strong>{order.recipeName}</strong> (Zlecenie: {order.productionRunId})</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">Utworzono: {formatDate(order.createdAt, true)} przez {order.createdBy}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusInfo.color}`}>{statusInfo.label}</span>
                                            {order.preparationLocation && <span className="font-mono text-xs p-1 bg-gray-200 dark:bg-secondary-700 rounded">Pojemnik: {order.preparationLocation}</span>}
                                        </div>
                                    </div>
                                    <div className="mt-3 pt-3 border-t dark:border-secondary-700">
                                        <h4 className="text-sm font-semibold mb-1">Materiały do pobrania ({totalWeight.toFixed(2)} kg)</h4>
                                        <ul className="text-xs list-disc list-inside space-y-1">
                                            {order.materials.map((m, i) => <li key={i}>{m.productName} - {m.quantityKg} kg</li>)}
                                        </ul>
                                    </div>
                                    <div className="mt-4 flex justify-end gap-2">
                                        {order.status === 'planned' && canManage && (
                                            <>
                                                <Button onClick={() => handleEditOrder(order)} variant="secondary" className="p-1.5" title="Edytuj treść zlecenia">
                                                    <EditIcon className="h-4 w-4"/>
                                                </Button>
                                                <Button onClick={() => setOrderToDelete(order)} variant="danger" className="p-2" title="Usuń zlecenie">
                                                    <TrashIcon className="h-4 w-4"/>
                                                </Button>
                                            </>
                                        )}
                                        {order.status === 'planned' && canPerformPicking && <Button onClick={() => handleStartPicking(order)}>Rozpocznij kompletację</Button>}
                                        {order.status === 'material_picking' && canPerformPicking && <Button onClick={() => handleContinuePicking(order)}>Kontynuuj kompletację</Button>}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
        {orderToDelete && (
            <ConfirmationModal 
                isOpen={!!orderToDelete}
                onClose={() => setOrderToDelete(null)}
                onConfirm={confirmDelete}
                title="Anulować Zlecenie Dosypki?"
                message={`Czy na pewno chcesz anulować zlecenie dosypki #${orderToDelete.id.split('-')[1]}? Tej operacji nie można cofnąć.`}
                confirmButtonText="Tak, anuluj"
            />
        )}
        </>
    );
};

export default ManageAdjustmentsPage;
