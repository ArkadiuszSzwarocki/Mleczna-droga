import React, { useMemo } from 'react';
import { useLogisticsContext } from './contexts/LogisticsContext';
import { useProductionContext } from './contexts/ProductionContext'; 
import { usePsdContext } from './contexts/PsdContext';
import { useUIContext } from './contexts/UIContext';
import { useAuth } from './contexts/AuthContext';
import { useWarehouseContext } from './contexts/WarehouseContext';
import { InternalTransferOrder, ProductionRun, PsdTask, Permission } from '../types';
import Button from './Button';
import { formatDate } from '../src/utils';
import ArrowLeftRightIcon from './icons/ArrowLeftRightIcon';
import CheckBadgeIcon from './icons/CheckBadgeIcon';
import ClockIcon from './icons/ClockIcon';
import TruckIcon from './icons/TruckIcon';
import XCircleIcon from './icons/XCircleIcon';
import PlusIcon from './icons/PlusIcon';
import ArchiveBoxIcon from './icons/ArchiveBoxIcon';

const getStatusInfo = (status: InternalTransferOrder['status']) => {
    switch (status) {
        case 'PLANNED':
            return { label: 'Zaplanowane', icon: <ClockIcon className="h-5 w-5" />, color: 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-200', border: 'border-yellow-500' };
        case 'IN_TRANSIT':
            return { label: 'W Tranzycie', icon: <TruckIcon className="h-5 w-5" />, color: 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200', border: 'border-blue-500' };
        case 'COMPLETED':
            return { label: 'Zakończone', icon: <CheckBadgeIcon className="h-5 w-5" />, color: 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200', border: 'border-green-500' };
        case 'CANCELLED':
            return { label: 'Anulowane', icon: <XCircleIcon className="h-5 w-5" />, color: 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200', border: 'border-red-500' };
    }
};

const TransferCard: React.FC<{ order: InternalTransferOrder }> = ({ order }) => {
    const { handleCancelInternalTransfer, handleArchiveInternalTransfer } = useLogisticsContext();
    const { showToast, modalHandlers } = useUIContext();
    const { currentUser } = useAuth();

    const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'boss';

    const onDispatch = () => {
        modalHandlers.openDispatchInternalTransferModal(order);
    };
    
    const onCancel = () => {
        const title = order.status === 'IN_TRANSIT' ? "Potwierdź Zawrócenie" : "Potwierdź Anulowanie";
        const message = order.status === 'IN_TRANSIT' 
            ? `Zlecenie ${order.id} jest w tranzycie. Czy na pewno chcesz je anulować i ZWRÓCIĆ palety do magazynu źródłowego?`
            : `Czy na pewno chcesz anulować zlecenie transferu ${order.id}?`;

        modalHandlers.openConfirmationModal({
            title,
            message,
            onConfirm: () => {
                const result = handleCancelInternalTransfer(order.id);
                showToast(result.message, result.success ? 'success' : 'error');
                modalHandlers.closeConfirmationModal();
            }
        });
    };

    const onArchive = () => {
        const result = handleArchiveInternalTransfer(order.id);
        showToast(result.message, result.success ? 'success' : 'error');
    };
    
    const statusInfo = getStatusInfo(order.status);
    const isPlanned = order.status === 'PLANNED';

    return (
        <div className={`p-4 bg-white dark:bg-secondary-800 rounded-lg shadow-md border-l-4 ${statusInfo.border} h-full flex flex-col`}>
            <div className="flex justify-between items-start">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-mono font-bold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-secondary-900 px-1.5 py-0.5 rounded">{order.sourceWarehouse} &rarr; {order.destinationWarehouse}</span>
                    </div>
                    <p className="font-bold text-primary-700 dark:text-primary-300">{order.id}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Utworzono: {formatDate(order.createdAt, true)} przez {order.createdBy}</p>
                </div>
                <div className={`px-2 py-1 text-xs font-semibold rounded-full flex items-center gap-1 ${statusInfo.color}`}>
                    {statusInfo.icon}
                    {statusInfo.label}
                </div>
            </div>
            <div className="mt-3 pt-3 border-t dark:border-secondary-700 flex-grow">
                <h4 className="text-sm font-semibold mb-1">{isPlanned ? 'Planowane pozycje' : 'Załadowane palety'} ({isPlanned ? order.items?.length : order.pallets?.length})</h4>
                <ul className="text-xs list-disc list-inside max-h-40 overflow-y-auto pr-2 space-y-1">
                    {isPlanned ? (
                        order.items?.map((item, idx) => <li key={idx} className="truncate">{item.productName} - <strong>{item.requestedQty} {item.unit}</strong></li>)
                    ) : (
                        order.pallets?.map(p => <li key={p.palletId} className="truncate">{p.productName} - <span className="font-mono">{p.displayId}</span></li>)
                    )}
                </ul>
            </div>
            <div className="mt-4 flex justify-end gap-2 pt-3 border-t dark:border-secondary-700">
                {order.status === 'PLANNED' && <Button onClick={onDispatch} leftIcon={<TruckIcon className="h-4 w-4"/>}>Załadunek</Button>}
                
                {(order.status === 'PLANNED' || (order.status === 'IN_TRANSIT' && isAdmin)) && (
                    <Button onClick={onCancel} variant="danger" className="text-xs">
                        {order.status === 'IN_TRANSIT' ? 'Anuluj i Zawróć' : 'Anuluj'}
                    </Button>
                )}

                {(order.status === 'COMPLETED' || order.status === 'CANCELLED') && (
                    <Button onClick={onArchive} variant="secondary" className="text-xs" leftIcon={<ArchiveBoxIcon className="h-4 w-4"/>}>Archiwizuj</Button>
                )}
            </div>
        </div>
    );
};

const SuggestedTransferCard: React.FC<{ type: 'agro' | 'psd', item: ProductionRun | PsdTask, onCreate: (type: 'agro' | 'psd', item: ProductionRun | PsdTask) => void }> = ({ type, item, onCreate }) => {
    return (
        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/40 rounded-lg shadow-md border-l-4 border-yellow-500">
            <div>
                <p className="font-semibold text-yellow-800 dark:text-yellow-200">
                    Sugerowany transfer dla zlecenia {type.toUpperCase()}: {item.id}
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                    Produkt: {item.recipeName}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                    Liczba palet do transferu: {item.suggestedTransferPallets?.length || 0}
                </p>
            </div>
            <div className="mt-4 flex justify-end">
                <Button onClick={() => onCreate(type, item)}>Utwórz transfer</Button>
            </div>
        </div>
    );
};

const InternalTransfersPage: React.FC = () => {
    const { internalTransferOrders, handleCreateInternalTransfer } = useLogisticsContext();
    const { productionRunsList, handleClearSuggestedTransfer: handleClearAgroSuggestions } = useProductionContext();
    const { psdTasks, handleClearSuggestedTransfer: handleClearPsdSuggestions } = usePsdContext();
    const { rawMaterialsLogList } = useWarehouseContext();
    const { showToast, modalHandlers } = useUIContext();
    const { currentUser, checkPermission } = useAuth();

    const canPlanTransfers = checkPermission(Permission.PLAN_INTERNAL_TRANSFERS);

    const suggestedTransfers = useMemo(() => {
        if (!canPlanTransfers) return [];
        const agro = (productionRunsList || []).filter(run => run.suggestedTransferPallets && run.suggestedTransferPallets.length > 0).map(run => ({ type: 'agro' as const, item: run }));
        const psd = (psdTasks || []).filter(task => task.suggestedTransferPallets && task.suggestedTransferPallets.length > 0).map(task => ({ type: 'psd' as const, item: task }));
        return [...agro, ...psd];
    }, [productionRunsList, psdTasks, canPlanTransfers]);

    const handleCreateFromSuggestion = (type: 'agro' | 'psd', item: ProductionRun | PsdTask) => {
        if (!item.suggestedTransferPallets) return;
        
        // Map pallet IDs to InternalTransferItems for the new request-based model
        const itemsMap = new Map<string, number>();
        item.suggestedTransferPallets.forEach(id => {
            const pallet = rawMaterialsLogList.find(p => p.id === id);
            if (pallet) {
                const name = pallet.palletData.nazwa;
                const weight = pallet.palletData.currentWeight;
                itemsMap.set(name, (itemsMap.get(name) || 0) + weight);
            }
        });

        const itemsToRequest = Array.from(itemsMap.entries()).map(([name, qty]) => ({
            productName: name,
            requestedQty: qty,
            unit: 'kg'
        }));

        const result = handleCreateInternalTransfer(itemsToRequest, 'OSIP', 'MS01');
        showToast(result.message, result.success ? 'success' : 'error');
        if (result.success) {
            if (type === 'agro') {
                handleClearAgroSuggestions(item.id);
            } else {
                handleClearPsdSuggestions(item.id);
            }
        }
    };

    const { planned, inTransit, completed, cancelled } = useMemo(() => {
        const p: InternalTransferOrder[] = [];
        const i: InternalTransferOrder[] = [];
        const c: InternalTransferOrder[] = [];
        const x: InternalTransferOrder[] = [];
        
        // LOGIKA WIDOCZNOŚCI: 
        // 1. Admin/Boss widzą wszystko.
        // 2. Magazynier widzi:
        //    - Status PLANNED: tylko jeśli jego oddział jest ŹRÓDŁEM (musi załadować).
        //    - Status IN_TRANSIT: tylko jeśli jego oddział jest CELEM (musi przyjąć).
        const filteredOrders = (internalTransferOrders || []).filter(order => {
            if (!currentUser) return false;
            if (currentUser.role === 'admin' || currentUser.role === 'boss' || currentUser.role === 'planista') return true;
            
            const userBranch = currentUser.subRole || 'AGRO';
            const sourceBranch = order.sourceWarehouse === 'OSIP' ? 'OSIP' : 'AGRO';
            const destBranch = order.destinationWarehouse === 'OSIP' ? 'OSIP' : 'AGRO';

            if (order.status === 'PLANNED') return userBranch === sourceBranch;
            if (order.status === 'IN_TRANSIT') return userBranch === destBranch;

            return userBranch === sourceBranch || userBranch === destBranch;
        });

        filteredOrders.forEach(order => {
            switch(order.status) {
                case 'PLANNED': p.push(order); break;
                case 'IN_TRANSIT': i.push(order); break;
                case 'COMPLETED': c.push(order); break;
                case 'CANCELLED': x.push(order); break;
            }
        });
        
        const sortByDate = (a: InternalTransferOrder, b: InternalTransferOrder) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        return {
            planned: p.sort(sortByDate),
            inTransit: i.sort(sortByDate),
            completed: c.sort(sortByDate).slice(0, 20),
            cancelled: x.sort(sortByDate).slice(0, 10),
        };
    }, [internalTransferOrders, currentUser]);

    return (
        <div className="p-4 md:p-6 h-full flex flex-col bg-slate-50 dark:bg-secondary-900/50 overflow-y-auto scrollbar-hide">
            <header className="flex-shrink-0 flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 border-b dark:border-secondary-600 pb-3 gap-3">
                <div className="flex items-center gap-3">
                    <ArrowLeftRightIcon className="h-8 w-8 text-primary-600 dark:text-primary-400" />
                    <h2 className="text-2xl font-semibold text-primary-700 dark:text-primary-300">Transfery Wewnętrzne</h2>
                </div>
                {canPlanTransfers && (
                    <Button onClick={() => modalHandlers.openCreateInternalTransferModal()} leftIcon={<PlusIcon className="h-5 w-5" />}>
                        Utwórz Transfer
                    </Button>
                )}
            </header>

            {suggestedTransfers.length > 0 && (
                <section className="flex-shrink-0 mb-6">
                    <h3 className="text-xl font-bold mb-3 text-yellow-700 dark:text-yellow-300">Sugerowane Transfery ({suggestedTransfers.length})</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {suggestedTransfers.map(({ type, item }) => (
                            <SuggestedTransferCard key={item.id} type={type} item={item} onCreate={handleCreateFromSuggestion} />
                        ))}
                    </div>
                </section>
            )}

            <div className="flex-grow grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="flex flex-col gap-3">
                    <h3 className="text-lg font-bold text-center py-2 rounded bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300">Zaplanowane ({planned.length})</h3>
                    <div className="space-y-4">
                        {planned.map(order => <TransferCard key={order.id} order={order} />)}
                        {planned.length === 0 && <p className="text-center text-xs text-gray-400 italic py-10 border-2 border-dashed rounded-lg">Brak zadań do załadunku</p>}
                    </div>
                </div>
                <div className="flex flex-col gap-3">
                    <h3 className="text-lg font-bold text-center py-2 rounded bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300">W Tranzycie ({inTransit.length})</h3>
                    <div className="space-y-4">
                        {inTransit.map(order => <TransferCard key={order.id} order={order} />)}
                        {inTransit.length === 0 && <p className="text-center text-xs text-gray-400 italic py-10 border-2 border-dashed rounded-lg">Brak zadań do przyjęcia</p>}
                    </div>
                </div>
                <div className="flex flex-col gap-3">
                    <h3 className="text-lg font-bold text-center py-2 rounded bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300">Zakończone ({completed.length})</h3>
                     <div className="space-y-4 opacity-80">
                        {completed.map(order => <TransferCard key={order.id} order={order} />)}
                    </div>
                </div>
                <div className="flex flex-col gap-3">
                    <h3 className="text-lg font-bold text-center py-2 rounded bg-gray-100 dark:bg-secondary-800 text-gray-600 dark:text-gray-400">Anulowane ({cancelled.length})</h3>
                     <div className="space-y-4 opacity-50">
                        {cancelled.map(order => <TransferCard key={order.id} order={order} />)}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InternalTransfersPage;