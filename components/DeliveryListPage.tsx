
import React, { useState, useMemo } from 'react';
import { Delivery, DeliveryStatus, User, View, Permission, InternalTransferOrder } from '../types';
import { useAppContext } from './contexts/AppContext';
import { useAuth } from './contexts/AuthContext';
import Button from './Button';
import { formatDate, getBlockInfo, getArchivizationCountdown } from '../src/utils';
import TruckIcon from './icons/TruckIcon';
import PlusIcon from './icons/PlusIcon';
import TrashIcon from './icons/TrashIcon';
import PencilIcon from './icons/PencilIcon';
import { useSortableData } from '../src/useSortableData';
import SortableHeader from './SortableHeader';
import { SUPPLIERS_LIST } from '../constants';
import ConfirmationModal from './ConfirmationModal';
import ClockIcon from './icons/ClockIcon';

const getStatusInfo = (status: any): { label: string; colorClass: string, borderClass: string } => {
  switch (status) {
    case 'REGISTRATION':
        return { label: 'Rejestracja', colorClass: 'bg-gray-200 text-gray-800 dark:bg-secondary-700 dark:text-gray-200', borderClass: 'border-gray-400' };
    case 'PENDING_LAB':
      return { label: 'Oczekuje na Laboratorium', colorClass: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200', borderClass: 'border-yellow-400' };
    case 'PENDING_WAREHOUSE':
      return { label: 'Oczekuje na Magazyn', colorClass: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200', borderClass: 'border-blue-400' };
    case 'COMPLETED':
      return { label: 'Zakończona', colorClass: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200', borderClass: 'border-green-400' };
    default:
      return { label: status, colorClass: 'bg-gray-100 text-gray-800 dark:bg-secondary-700 dark:text-gray-200', borderClass: 'border-gray-300 dark:border-secondary-600' };
  }
};

const getActionForDelivery = (delivery: any, currentUser: User | null, checkPermission: (p: Permission) => boolean): { label: string; disabled: boolean } => {
  const { status } = delivery;

  if (status === 'COMPLETED') {
      // Dla zakończonych zawsze pokazujemy "Podgląd". 
      // Administrator wewnątrz widoku będzie miał opcję zapisu korekty.
      return { label: 'Podgląd', disabled: false };
  }

  if (status === 'REGISTRATION' && (checkPermission(Permission.CREATE_DELIVERY) || checkPermission(Permission.MANAGE_DELIVERIES))) {
      return { label: 'Edytuj', disabled: false };
  }
  
  if (checkPermission(Permission.PROCESS_DELIVERY_LAB) && status === 'PENDING_LAB') {
      return { label: 'Przetwórz (Lab)', disabled: false };
  }

  if (checkPermission(Permission.PROCESS_DELIVERY_WAREHOUSE) && status === 'PENDING_WAREHOUSE') {
      return { label: 'Przetwórz (Magazyn)', disabled: false };
  }
  
  return { label: 'Podgląd', disabled: false };
};


const DeliveryListPage: React.FC = () => {
  const { 
      deliveries, 
      handleDeleteDelivery, 
      rawMaterialsLogList,
      internalTransferOrders,
      handleSetView,
      showToast
  } = useAppContext();
  const { checkPermission, currentUser } = useAuth();
  
  const [deliveryToDelete, setDeliveryToDelete] = useState<any | null>(null);

  const isAdmin = useMemo(() => currentUser?.role === 'admin' || currentUser?.role === 'boss', [currentUser]);

  const combinedList = useMemo(() => {
    const activeDeliveries = (deliveries || [])
        .filter(d => {
            if (d.status !== 'COMPLETED') return true;
            return getArchivizationCountdown(d.warehouseStageCompletedAt) !== null;
        })
        .map(d => ({ ...d, isTransfer: false }));

    const mappedTransfers = (internalTransferOrders || [])
        .filter(order => {
            if (order.status !== 'IN_TRANSIT') return false;
            if (!currentUser) return false;
            if (currentUser.role === 'admin' || currentUser.role === 'boss') return true;
            const userBranch = currentUser.subRole || 'AGRO';
            const destBranch = order.destinationWarehouse === 'OSIP' ? 'OSIP' : 'AGRO';
            return userBranch === destBranch;
        })
        .map(order => {
            const supplierInfo = SUPPLIERS_LIST.find(s => s.value === 'transfer_wewnetrzny');
            const orderItems = (order.pallets || []).map(p => {
                const palletDetails = (rawMaterialsLogList || []).find(raw => raw.id === p.palletId);
                return {
                    id: p.palletId,
                    isBlocked: palletDetails ? getBlockInfo(palletDetails).isBlocked : false,
                };
            });

            return {
                id: `transfer-${order.id}`,
                orderRef: order.id,
                supplier: supplierInfo ? supplierInfo.label : 'Transfer Wewnętrzny',
                deliveryDate: order.dispatchedAt || order.createdAt,
                status: 'PENDING_WAREHOUSE' as DeliveryStatus,
                items: orderItems,
                createdAt: order.createdAt,
                requiresLab: false,
                isTransfer: true,
                originalId: order.id,
            };
        });

    return [...activeDeliveries, ...mappedTransfers];
  }, [deliveries, internalTransferOrders, rawMaterialsLogList, currentUser]);

  const { items: sortedDeliveries, requestSort, sortConfig } = useSortableData<any>(combinedList, { key: 'createdAt', direction: 'descending' });
  
  const onSelectDelivery = (delivery: any) => {
    if (delivery.isTransfer) {
        handleSetView(View.InternalTransferReception, { orderId: delivery.originalId });
    } else {
        handleSetView(View.GoodsDeliveryReception, { deliveryId: delivery.id });
    }
  };

  const handleOpenNewDeliveryFlow = () => {
    handleSetView(View.GoodsDeliveryReception, { deliveryId: null });
  };

  const canDelete = (delivery: any): boolean => {
    if (delivery.isTransfer) return false;
    // Administrator może usuwać każdą dostawę (nawet zakończoną)
    if (isAdmin) return true;
    
    const isDeletableStatus = delivery.status === 'REGISTRATION' || delivery.status === 'PENDING_LAB' || delivery.status === 'PENDING_WAREHOUSE';
    if (!isDeletableStatus) return false;
    return checkPermission(Permission.MANAGE_DELIVERIES);
  };

  const onConfirmDelete = () => {
      if (deliveryToDelete) {
          const result = handleDeleteDelivery(deliveryToDelete.id);
          showToast(result.message, result.success ? 'success' : 'error');
          setDeliveryToDelete(null);
      }
  };

  const canCreate = checkPermission(Permission.CREATE_DELIVERY);

  return (
    <div className="p-4 md:p-6 bg-white dark:bg-secondary-800 shadow-xl rounded-lg">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 border-b dark:border-secondary-600 pb-3 gap-3">
        <div className="flex items-center">
            <TruckIcon className="h-8 w-8 text-primary-600 dark:text-primary-400 mr-3" />
            <h2 className="text-2xl font-semibold text-primary-700 dark:text-primary-300">Lista Przyjęć</h2>
        </div>
        <Button
            onClick={handleOpenNewDeliveryFlow}
            variant="primary"
            leftIcon={<PlusIcon className="h-5 w-5"/>}
            disabled={!canCreate}
            title={!canCreate ? 'Brak uprawnień do dodawania nowych dostaw' : 'Dodaj nową dostawę'}
        >
            Dodaj Nową Dostawę
        </Button>
      </header>

      {sortedDeliveries.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400 text-center py-10">Brak aktywnych przyjęć. Zakończone dostawy (starsze niż 7 dni) znajdziesz w archiwum.</p>
      ) : (
        <>
            <div className="hidden lg:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-secondary-700">
                    <thead className="bg-gray-50 dark:bg-secondary-700">
                    <tr>
                        <SortableHeader thClassName="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider" columnKey="orderRef" sortConfig={sortConfig} requestSort={requestSort}>ID / Nr Zamówienia</SortableHeader>
                        <SortableHeader thClassName="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider" columnKey="supplier" sortConfig={sortConfig} requestSort={requestSort}>Dostawca</SortableHeader>
                        <SortableHeader thClassName="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider" columnKey="deliveryDate" sortConfig={sortConfig} requestSort={requestSort}>Data Dostawy/Wysłania</SortableHeader>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Ilość Palet</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Kontrola Lab.</th>
                        <SortableHeader thClassName="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider" columnKey="status" sortConfig={sortConfig} requestSort={requestSort}>Status</SortableHeader>
                        <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Akcje
                        </th>
                    </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-secondary-800 divide-y divide-gray-200 dark:divide-secondary-700">
                    {sortedDeliveries.map((delivery) => {
                        const statusInfo = getStatusInfo(delivery.status);
                        const action = getActionForDelivery(delivery, currentUser, checkPermission);
                        const isCorrected = delivery.correctionLog && delivery.correctionLog.length > 0;
                        const archTime = delivery.status === 'COMPLETED' ? getArchivizationCountdown(delivery.warehouseStageCompletedAt) : null;
                        
                        return (
                        <tr key={delivery.id} className="hover:bg-gray-50 dark:hover:bg-secondary-700/50">
                            <td className="px-4 py-3 whitespace-nowrap text-sm font-mono text-primary-600 dark:text-primary-400">{delivery.orderRef}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{delivery.supplier}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{formatDate(delivery.deliveryDate)}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-center text-gray-700 dark:text-gray-300">{(delivery.items || []).length}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm">
                                {delivery.requiresLab === false ? (
                                    <span className="px-2 inline-flex text-xs font-semibold rounded-full bg-gray-200 text-gray-700 dark:bg-secondary-600 dark:text-gray-200">Nie</span>
                                ) : (
                                    <span className="px-2 inline-flex text-xs font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200" title="Wymagane ze względu na formę opakowania (Big Bag / Worek)">
                                        Tak (Big Bag / Worek)
                                    </span>
                                )}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm">
                                <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-2">
                                        <span className={`px-2 inline-flex text-xs font-semibold rounded-full ${statusInfo.colorClass}`}>
                                            {statusInfo.label}
                                        </span>
                                        {isCorrected && (
                                            <PencilIcon className="h-4 w-4 text-orange-500" title={`Korygowano ${delivery.correctionLog.length} razy`} />
                                        )}
                                    </div>
                                    {archTime && (
                                        <span className="text-[9px] font-bold text-gray-400 flex items-center gap-1 uppercase tracking-tighter">
                                            <ClockIcon className="h-3 w-3" /> Archiwizacja za: {archTime}
                                        </span>
                                    )}
                                </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-right">
                            <div className="flex items-center space-x-2 justify-end">
                                <Button
                                onClick={() => onSelectDelivery(delivery)}
                                variant="secondary"
                                className="text-xs"
                                disabled={action.disabled}
                                title={action.disabled ? 'Brak uprawnień do tej akcji w tym stanie' : action.label}
                                >
                                {action.label}
                                </Button>
                                {canDelete(delivery) && (
                                    <Button
                                        onClick={(e) => { e.stopPropagation(); setDeliveryToDelete(delivery); }}
                                        variant="secondary"
                                        className="p-1.5 text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-900/50 dark:hover:bg-red-800"
                                        title={`Usuń dostawę ${delivery.id}`}
                                    >
                                        <TrashIcon className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                            </td>
                        </tr>
                        );
                    })}
                    </tbody>
                </table>
            </div>

            <div className="block lg:hidden space-y-4">
                {sortedDeliveries.map((delivery) => {
                    const statusInfo = getStatusInfo(delivery.status);
                    const action = getActionForDelivery(delivery, currentUser, checkPermission);
                    const isCorrected = delivery.correctionLog && delivery.correctionLog.length > 0;
                    const archTime = delivery.status === 'COMPLETED' ? getArchivizationCountdown(delivery.warehouseStageCompletedAt) : null;

                    return (
                        <div key={delivery.id} className={`bg-white dark:bg-secondary-800 p-4 rounded-lg shadow-md border-l-4 ${statusInfo.borderClass}`}>
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="font-semibold text-primary-700 dark:text-primary-300">{delivery.orderRef || 'Brak numeru'}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{delivery.supplier}</p>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                    <div className="flex items-center gap-2">
                                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusInfo.colorClass}`}>{statusInfo.label}</span>
                                        {isCorrected && <PencilIcon className="h-4 w-4 text-orange-500" />}
                                    </div>
                                    {archTime && <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Za: {archTime}</span>}
                                </div>
                            </div>
                            <div className="mt-3 pt-3 border-t dark:border-secondary-700 text-sm space-y-1">
                                <div className="flex justify-between">
                                    <span className="text-gray-500 dark:text-gray-400">Data dostawy:</span>
                                    <span className="font-medium text-gray-800 dark:text-gray-200">{formatDate(delivery.deliveryDate)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500 dark:text-gray-400">Ilość palet:</span>
                                    <span className="font-medium text-gray-800 dark:text-gray-200">{(delivery.items || []).length}</span>
                                </div>
                                {delivery.requiresLab && (
                                    <div className="flex justify-between text-blue-600 dark:text-blue-400 font-bold">
                                        <span>Kontrola Lab:</span>
                                        <span>Wymagana (Big Bag)</span>
                                    </div>
                                )}
                            </div>
                            <div className="mt-4 pt-3 border-t dark:border-secondary-700 flex items-center justify-end space-x-2">
                                {canDelete(delivery) && (
                                    <Button
                                        onClick={(e) => { e.stopPropagation(); setDeliveryToDelete(delivery); }}
                                        variant="secondary"
                                        className="p-2 text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-900/50 dark:hover:bg-red-800"
                                    >
                                        <TrashIcon className="h-5 w-5" />
                                    </Button>
                                )}
                                <Button
                                    onClick={() => onSelectDelivery(delivery)}
                                    variant="primary"
                                    className="text-sm flex-grow"
                                    disabled={action.disabled}
                                >
                                    {action.label}
                                </Button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </>
      )}

      {deliveryToDelete && (
          <ConfirmationModal 
            isOpen={!!deliveryToDelete}
            onClose={() => setDeliveryToDelete(null)}
            onConfirm={onConfirmDelete}
            title="Usuń całą dostawę?"
            message={`Czy na pewno chcesz trwale usunąć dostawę ${deliveryToDelete.orderRef} (${deliveryToDelete.supplier})? Tej operacji nie można cofnąć.`}
            confirmButtonText="Tak, usuń wszystko"
          />
      )}
    </div>
  );
};

export default DeliveryListPage;
