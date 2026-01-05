

import React, { useState, useMemo } from 'react';
import { Delivery, View } from '../types';
import { useAppContext } from './contexts/AppContext';
import Button from './Button';
import { formatDate, getDeliveryStatusLabel } from '../src/utils';
import { useSortableData } from '../src/useSortableData';
import SortableHeader from './SortableHeader';
import ArchiveBoxIcon from './icons/ArchiveBoxIcon';
import FilterIcon from './icons/FilterIcon';
import Input from './Input';
import { SUPPLIERS_LIST } from '../constants';
import SearchableSelect from './SearchableSelect';

export const ArchivedDeliveriesPage: React.FC = () => {
    const { deliveries, handleSetView } = useAppContext();
    
    const [filters, setFilters] = useState({
        startDate: '',
        endDate: '',
        orderRef: '',
        supplier: 'all',
    });

    const archivedDeliveries = useMemo(() =>
        (deliveries || []).filter(d => d.status === 'ARCHIVED' || d.status === 'COMPLETED'),
        [deliveries]
    );

    const filteredDeliveries = useMemo(() => {
        return archivedDeliveries.filter(d => {
            const completedAt = d.warehouseStageCompletedAt || d.createdAt;
            const deliveryDate = new Date(completedAt);
            if (filters.startDate && deliveryDate < new Date(filters.startDate)) return false;
            if (filters.endDate && deliveryDate > new Date(new Date(filters.endDate).setHours(23, 59, 59, 999))) return false;
            if (filters.orderRef && !d.orderRef?.toLowerCase().includes(filters.orderRef.toLowerCase())) return false;
            if (filters.supplier !== 'all' && d.supplier !== filters.supplier) return false;
            return true;
        });
    }, [archivedDeliveries, filters]);
    
    // FIX: Explicitly set the generic type for useSortableData to ensure sortedDeliveries is correctly typed as Delivery[].
    const { items: sortedDeliveries, requestSort, sortConfig } = useSortableData<Delivery>(filteredDeliveries, { key: 'warehouseStageCompletedAt', direction: 'descending' });
    
    const handleFilterChange = (field: keyof typeof filters, value: string) => {
        setFilters(prev => ({ ...prev, [field]: value }));
    };

    const handleClearFilters = () => {
        setFilters({ startDate: '', endDate: '', orderRef: '', supplier: 'all' });
    };

    const supplierOptions = useMemo(() => [
        { value: 'all', label: 'Wszyscy dostawcy' }, 
        ...SUPPLIERS_LIST
    ], []);

    return (
        <div className="p-4 md:p-6 bg-white dark:bg-secondary-800 shadow-xl rounded-lg h-full flex flex-col">
            <header className="flex-shrink-0 flex items-center mb-4 border-b dark:border-secondary-700 pb-3">
                <ArchiveBoxIcon className="h-8 w-8 text-primary-600 dark:text-primary-400 mr-3" />
                <h2 className="text-2xl font-semibold text-primary-700 dark:text-primary-300">Archiwum Dostaw</h2>
            </header>

            <details className="flex-shrink-0 bg-slate-50 dark:bg-secondary-900 border dark:border-secondary-700 rounded-lg p-4 mb-4">
                <summary className="font-semibold text-lg text-gray-700 dark:text-gray-200 cursor-pointer flex items-center gap-2"><FilterIcon className="h-5 w-5"/> Filtry</summary>
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Input label="Data od" type="date" value={filters.startDate} onChange={e => handleFilterChange('startDate', e.target.value)} />
                    <Input label="Data do" type="date" value={filters.endDate} onChange={e => handleFilterChange('endDate', e.target.value)} min={filters.startDate} />
                    <Input label="Nr Zamówienia / WZ" value={filters.orderRef} onChange={e => handleFilterChange('orderRef', e.target.value)} />
                    <SearchableSelect label="Dostawca" options={supplierOptions} value={filters.supplier} onChange={val => handleFilterChange('supplier', val)} />
                </div>
                <div className="mt-4 text-right"><Button onClick={handleClearFilters} variant="secondary">Wyczyść Filtry</Button></div>
            </details>
            
            <div className="flex-grow overflow-auto">
                 {sortedDeliveries.length === 0 ? (
                    <div className="text-center py-10"><p className="text-gray-500 dark:text-gray-400">Brak zarchiwizowanych dostaw.</p></div>
                 ) : (
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-secondary-700 text-sm">
                        <thead className="bg-gray-100 dark:bg-secondary-700">
                            <tr>
                                <SortableHeader columnKey="id" sortConfig={sortConfig} requestSort={requestSort}>ID Dostawy</SortableHeader>
                                <SortableHeader columnKey="orderRef" sortConfig={sortConfig} requestSort={requestSort}>Nr Zam./WZ</SortableHeader>
                                <SortableHeader columnKey="warehouseStageCompletedAt" sortConfig={sortConfig} requestSort={requestSort}>Data Zakończenia</SortableHeader>
                                <SortableHeader columnKey="supplier" sortConfig={sortConfig} requestSort={requestSort}>Dostawca</SortableHeader>
                                <th className="px-3 py-2 text-right font-medium text-gray-500 dark:text-gray-300">Akcje</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-secondary-800 divide-y divide-gray-200 dark:divide-secondary-700">
                            {sortedDeliveries.map((delivery: Delivery) => (
                                <tr key={delivery.id} className="hover:bg-gray-50 dark:hover:bg-secondary-700/50">
                                    <td className="px-3 py-2 whitespace-nowrap font-mono">{delivery.id}</td>
                                    <td className="px-3 py-2">{delivery.orderRef}</td>
                                    <td className="px-3 py-2 whitespace-nowrap">{formatDate(delivery.warehouseStageCompletedAt || delivery.createdAt, true)}</td>
                                    <td className="px-3 py-2">{SUPPLIERS_LIST.find(s => s.value === delivery.supplier)?.label || delivery.supplier}</td>
                                    <td className="px-3 py-2 text-right">
                                        <Button onClick={() => handleSetView(View.GoodsDeliveryReception, { deliveryId: delivery.id })} variant="secondary" className="text-xs">Szczegóły</Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                 )}
            </div>
        </div>
    );
};

export default ArchivedDeliveriesPage;
