

import React, { useState, useMemo } from 'react';
import type { Delivery } from '../../types';
// FIX: Corrected import path for `useWarehouseContext` from a root-based path to a relative one.
import { useWarehouseContext } from '../contexts/WarehouseContext';
import { SUPPLIERS_LIST } from '../../constants';
import Input from '../Input';
import { formatDate } from '../../src/utils';
import { useSortableData } from '../../src/useSortableData';
import SortableHeader from '../SortableHeader';
import InformationCircleIcon from '../icons/InformationCircleIcon';
import Alert from '../Alert';
// FIX: Remove .tsx extension from icon import to fix module resolution error.
import TruckIcon from '../icons/TruckIcon';

const DeliveryReportPage: React.FC = () => {
    // FIX: Destructured `deliveries` which is the correct name provided by the context.
    const { deliveries } = useWarehouseContext();
    
    const [startDate, setStartDate] = useState(() => {
        const date = new Date();
        date.setMonth(date.getMonth() - 1); // Default to last month
        return date.toISOString().split('T')[0];
    });
    const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

    const filteredDeliveries = useMemo(() => {
        return (deliveries || []).filter(d => {
            if (d.status !== 'COMPLETED' || !d.deliveryDate) return false;
            const deliveryDate = new Date(d.deliveryDate);
            const start = new Date(startDate);
            const end = new Date(new Date(endDate).setHours(23, 59, 59, 999));
            return deliveryDate >= start && deliveryDate <= end;
        });
    }, [deliveries, startDate, endDate]);
    
    const { items: sortedDeliveries, requestSort, sortConfig } = useSortableData(filteredDeliveries, { key: 'deliveryDate', direction: 'descending' });

    const getSupplierLabel = (supplierId?: string) => {
        if (!supplierId) return 'Nieznany';
        return SUPPLIERS_LIST.find(s => s.value === supplierId)?.label || supplierId;
    };

    return (
        <div className="p-4 md:p-6 bg-white dark:bg-secondary-800 shadow-xl rounded-lg">
            <div className="space-y-6">
                <div className="flex items-center gap-2">
                    <TruckIcon className="h-6 w-6 text-gray-700 dark:text-gray-200"/>
                    <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">Raport Dostaw</h2>
                    {/* FIX: Removed unsupported `title` prop to fix type error. */}
                    <InformationCircleIcon className="h-5 w-5 text-gray-400"/>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300 -mt-5">
                    Raport ten przedstawia listę wszystkich zakończonych dostaw w wybranym okresie.
                </p>

                <div className="p-4 bg-gray-50 dark:bg-secondary-900 rounded-lg border dark:border-secondary-700">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input label="Data od" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                        <Input label="Data do" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} min={startDate} />
                    </div>
                </div>

                {sortedDeliveries.length === 0 ? (
                    <Alert type="info" message="Brak zakończonych dostaw w wybranym okresie." />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-secondary-700 text-sm">
                            <thead className="bg-gray-100 dark:bg-secondary-700">
                                <tr>
                                    <SortableHeader columnKey="deliveryDate" sortConfig={sortConfig} requestSort={requestSort}>Data Dostawy</SortableHeader>
                                    <SortableHeader columnKey="orderRef" sortConfig={sortConfig} requestSort={requestSort}>Nr Zamówienia</SortableHeader>
                                    <SortableHeader columnKey="supplier" sortConfig={sortConfig} requestSort={requestSort}>Dostawca</SortableHeader>
                                    <th className="px-3 py-2 text-right font-medium text-gray-600 dark:text-gray-300">Ilość Palet</th>
                                    <th className="px-3 py-2 text-right font-medium text-gray-600 dark:text-gray-300">Ilość zablokowanych</th>
                                    <SortableHeader columnKey="createdBy" sortConfig={sortConfig} requestSort={requestSort}>Utworzone przez</SortableHeader>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-secondary-800 divide-y divide-gray-200 dark:divide-secondary-700">
                                {/* FIX: Replaced `Delivery` type with `any` to match project's type structure. */}
                                {sortedDeliveries.map((delivery: any) => (
                                    <tr key={delivery.id}>
                                        <td className="px-3 py-2 whitespace-nowrap">{formatDate(delivery.deliveryDate)}</td>
                                        <td className="px-3 py-2 whitespace-nowrap">{delivery.orderRef}</td>
                                        <td className="px-3 py-2 whitespace-nowrap">{getSupplierLabel(delivery.supplier)}</td>
                                        <td className="px-3 py-2 text-right">{(delivery.items || []).length}</td>
                                        <td className="px-3 py-2 text-right">{(delivery.items || []).filter((i: any) => i.isBlocked).length}</td>
                                        <td className="px-3 py-2 whitespace-nowrap">{delivery.createdBy}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DeliveryReportPage;
