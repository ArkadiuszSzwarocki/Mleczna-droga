

import React, { useState, useMemo } from 'react';
// FIX: Correct import path for types.ts
import { ProductionRun, View } from '../types';
// FIX: Corrected import path for AppContext to be relative from the current file's location.
import { useAppContext } from './contexts/AppContext';
import Button from './Button';
import { formatDate, getProductionRunStatusLabel } from '../src/utils';
import { useSortableData } from '../src/useSortableData';
import SortableHeader from './SortableHeader';
import ArchiveBoxIcon from './icons/ArchiveBoxIcon';
import FilterIcon from './icons/FilterIcon';
import Input from './Input';
import Select from './Select';
// FIX: Corrected import path for constants.ts to be relative
import { SAMPLE_RECIPES } from '../constants';

export const ArchivedProductionRunsPage: React.FC = () => {
    const { productionRunsList, handleSetView } = useAppContext();
    
    const [filters, setFilters] = useState({
        startDate: '',
        endDate: '',
        recipeName: 'all',
        status: 'all' as 'all' | 'completed' | 'archived' | 'cancelled',
    });

    const archivedRuns = useMemo(() =>
        (productionRunsList || []).filter(run => ['completed', 'archived', 'cancelled'].includes(run.status)),
        [productionRunsList]
    );

    const filteredRuns = useMemo(() => {
        return archivedRuns.filter(run => {
            const completedAt = run.endTime || run.createdAt || run.plannedDate;
            const runDate = new Date(completedAt);
            if (filters.startDate && runDate < new Date(filters.startDate)) return false;
            if (filters.endDate && runDate > new Date(new Date(filters.endDate).setHours(23, 59, 59, 999))) return false;
            if (filters.recipeName !== 'all' && run.recipeName !== filters.recipeName) return false;
            if (filters.status !== 'all' && run.status !== filters.status) return false;
            return true;
        });
    }, [archivedRuns, filters]);
    
    // FIX: Explicitly set the generic type for useSortableData to ensure sortedRuns is correctly typed as ProductionRun[].
    const { items: sortedRuns, requestSort, sortConfig } = useSortableData<ProductionRun>(filteredRuns, { key: 'endTime', direction: 'descending' });
    
    const handleFilterChange = (field: keyof typeof filters, value: string) => {
        setFilters(prev => ({ ...prev, [field]: value }));
    };

    const handleClearFilters = () => {
        setFilters({ startDate: '', endDate: '', recipeName: 'all', status: 'all' });
    };

    const recipeOptions = useMemo(() => [
        { value: 'all', label: 'Wszystkie produkty' },
        ...SAMPLE_RECIPES.map(r => ({ value: r.name, label: r.name }))
    ], []);

    const statusOptions = [
        { value: 'all', label: 'Wszystkie' },
        { value: 'completed', label: 'Zakończone' },
        { value: 'archived', label: 'Zarchiwizowane' },
        { value: 'cancelled', label: 'Anulowane' },
    ];

    return (
        <div className="p-4 md:p-6 bg-white dark:bg-secondary-800 shadow-xl rounded-lg h-full flex flex-col">
            <header className="flex-shrink-0 flex items-center mb-4 border-b dark:border-secondary-700 pb-3">
                <ArchiveBoxIcon className="h-8 w-8 text-primary-600 dark:text-primary-400 mr-3" />
                <h2 className="text-2xl font-semibold text-primary-700 dark:text-primary-300">Archiwum Zleceń Produkcyjnych (AGRO)</h2>
            </header>

            <details className="flex-shrink-0 bg-slate-50 dark:bg-secondary-900 border dark:border-secondary-700 rounded-lg p-4 mb-4">
                <summary className="font-semibold text-lg text-gray-700 dark:text-gray-200 cursor-pointer flex items-center gap-2"><FilterIcon className="h-5 w-5"/> Filtry</summary>
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Input label="Data od" type="date" value={filters.startDate} onChange={e => handleFilterChange('startDate', e.target.value)} />
                    <Input label="Data do" type="date" value={filters.endDate} onChange={e => handleFilterChange('endDate', e.target.value)} min={filters.startDate} />
                    <Select label="Produkt" options={recipeOptions} value={filters.recipeName} onChange={e => handleFilterChange('recipeName', e.target.value)} />
                    <Select label="Status" options={statusOptions} value={filters.status} onChange={e => handleFilterChange('status', e.target.value)} />
                </div>
                <div className="mt-4 text-right"><Button onClick={handleClearFilters} variant="secondary">Wyczyść Filtry</Button></div>
            </details>
            
            <div className="flex-grow overflow-auto">
                 {sortedRuns.length === 0 ? (
                    <div className="text-center py-10"><p className="text-gray-500 dark:text-gray-400">Brak zarchiwizowanych zleceń produkcyjnych.</p></div>
                 ) : (
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-secondary-700 text-sm">
                        <thead className="bg-gray-100 dark:bg-secondary-700">
                            <tr>
                                <SortableHeader columnKey="id" sortConfig={sortConfig} requestSort={requestSort}>ID Zlecenia</SortableHeader>
                                <SortableHeader columnKey="recipeName" sortConfig={sortConfig} requestSort={requestSort}>Produkt</SortableHeader>
                                <SortableHeader columnKey="endTime" sortConfig={sortConfig} requestSort={requestSort}>Data Zakończenia</SortableHeader>
                                <SortableHeader columnKey="status" sortConfig={sortConfig} requestSort={requestSort}>Status</SortableHeader>
                                <th className="px-3 py-2 text-right font-medium text-gray-500 dark:text-gray-300">Akcje</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-secondary-800 divide-y divide-gray-200 dark:divide-secondary-700">
                            {sortedRuns.map((run: ProductionRun) => (
                                <tr key={run.id} className="hover:bg-gray-50 dark:hover:bg-secondary-700/50">
                                    <td className="px-3 py-2 whitespace-nowrap font-mono">{run.id}</td>
                                    <td className="px-3 py-2 font-semibold">{run.recipeName}</td>
                                    <td className="px-3 py-2 whitespace-nowrap">{formatDate(run.endTime || run.createdAt || '', true)}</td>
                                    <td className="px-3 py-2 whitespace-nowrap">{getProductionRunStatusLabel(run.status)}</td>
                                    <td className="px-3 py-2 text-right">
                                        <Button onClick={() => handleSetView(View.ARCHIVED_PRODUCTION_RUN_REPORT, { runId: run.id })} variant="secondary" className="text-xs">Szczegóły</Button>
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

export default ArchivedProductionRunsPage;