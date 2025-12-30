import React, { useState, useMemo } from 'react';
import { DispatchOrder, View } from '../types';
import { useAppContext } from './contexts/AppContext';
import Button from './Button';
import { formatDate, getDispatchOrderStatusLabel } from '../src/utils';
import { useSortableData } from '../src/useSortableData';
import SortableHeader from './SortableHeader';
import ArchiveBoxIcon from './icons/ArchiveBoxIcon';
import FilterIcon from './icons/FilterIcon';
import Input from './Input';
import Select from './Select';

export const ArchivedDispatchOrdersPage: React.FC = () => {
    const { dispatchOrders, handleSetView, modalHandlers } = useAppContext();
    
    const [filters, setFilters] = useState({
        startDate: '',
        endDate: '',
        recipient: '',
        status: 'all' as 'all' | 'completed' | 'cancelled',
    });

    const archivedOrders = useMemo(() =>
        (dispatchOrders || []).filter(order => order.status === 'completed' || order.status === 'cancelled'),
        [dispatchOrders]
    );

    const filteredOrders = useMemo(() => {
        return archivedOrders.filter(order => {
            const createdAt = new Date(order.createdAt);
            if (filters.startDate && createdAt < new Date(filters.startDate)) return false;
            if (filters.endDate && createdAt > new Date(new Date(filters.endDate).setHours(23, 59, 59, 999))) return false;
            if (filters.recipient && !order.recipient.toLowerCase().includes(filters.recipient.toLowerCase())) return false;
            if (filters.status !== 'all' && order.status !== filters.status) return false;
            return true;
        });
    }, [archivedOrders, filters]);
    
    const { items: sortedOrders, requestSort, sortConfig } = useSortableData(filteredOrders, { key: 'createdAt', direction: 'descending' });
    
    const handleFilterChange = (field: keyof typeof filters, value: string) => {
        setFilters(prev => ({ ...prev, [field]: value }));
    };

    const handleClearFilters = () => {
        setFilters({ startDate: '', endDate: '', recipient: '', status: 'all' });
    };

    const statusOptions = [
        { value: 'all', label: 'Wszystkie' },
        { value: 'completed', label: 'Zakończone' },
        { value: 'cancelled', label: 'Anulowane' },
    ];

    return (
        <div className="p-4 md:p-6 bg-white dark:bg-secondary-800 shadow-xl rounded-lg h-full flex flex-col">
            <header className="flex-shrink-0 flex items-center mb-4 border-b dark:border-secondary-700 pb-3">
                <ArchiveBoxIcon className="h-8 w-8 text-primary-600 dark:text-primary-400 mr-3" />
                <h2 className="text-2xl font-semibold text-primary-700 dark:text-primary-300">Archiwum Zleceń Wydania</h2>
            </header>

            <details className="flex-shrink-0 bg-slate-50 dark:bg-secondary-900 border dark:border-secondary-700 rounded-lg p-4 mb-4">
                <summary className="font-semibold text-lg text-gray-700 dark:text-gray-200 cursor-pointer flex items-center gap-2"><FilterIcon className="h-5 w-5"/> Filtry</summary>
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Input label="Data od" type="date" value={filters.startDate} onChange={e => handleFilterChange('startDate', e.target.value)} />
                    <Input label="Data do" type="date" value={filters.endDate} onChange={e => handleFilterChange('endDate', e.target.value)} min={filters.startDate} />
                    <Input label="Odbiorca" value={filters.recipient} onChange={e => handleFilterChange('recipient', e.target.value)} />
                    <Select label="Status" options={statusOptions} value={filters.status} onChange={e => handleFilterChange('status', e.target.value)} />
                </div>
                <div className="mt-4 text-right"><Button onClick={handleClearFilters} variant="secondary">Wyczyść Filtry</Button></div>
            </details>
            
            <div className="flex-grow overflow-auto">
                 {sortedOrders.length === 0 ? (
                    <div className="text-center py-10"><p className="text-gray-500 dark:text-gray-400">Brak zarchiwizowanych zleceń wydania.</p></div>
                 ) : (
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-secondary-700 text-sm">
                        <thead className="bg-gray-100 dark:bg-secondary-700">
                            <tr>
                                <SortableHeader columnKey="id" sortConfig={sortConfig} requestSort={requestSort}>ID Zlecenia</SortableHeader>
                                <SortableHeader columnKey="recipient" sortConfig={sortConfig} requestSort={requestSort}>Odbiorca</SortableHeader>
                                <SortableHeader columnKey="createdAt" sortConfig={sortConfig} requestSort={requestSort}>Data Utworzenia</SortableHeader>
                                <SortableHeader columnKey="status" sortConfig={sortConfig} requestSort={requestSort}>Status</SortableHeader>
                                <th className="px-3 py-2 text-right font-medium text-gray-500 dark:text-gray-300">Akcje</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-secondary-800 divide-y divide-gray-200 dark:divide-secondary-700">
                            {sortedOrders.map((order: DispatchOrder) => (
                                <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-secondary-700/50">
                                    <td className="px-3 py-2 whitespace-nowrap font-mono">{order.id}</td>
                                    <td className="px-3 py-2 font-semibold">{order.recipient}</td>
                                    <td className="px-3 py-2 whitespace-nowrap">{formatDate(order.createdAt, true)}</td>
                                    <td className="px-3 py-2 whitespace-nowrap">{getDispatchOrderStatusLabel(order.status)}</td>
                                    <td className="px-3 py-2 text-right">
                                        <Button onClick={() => modalHandlers.openDispatchOrderDetailModal(order)} variant="secondary" className="text-xs">Szczegóły</Button>
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

export default ArchivedDispatchOrdersPage;