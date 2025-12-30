

import React, { useState, useMemo } from 'react';
import { useProductionContext } from '../contexts/ProductionContext';
// FIX: Removed non-existent OeeMetrics from import.
import type { ProductionRun } from '../../types';
import { formatDate, formatProductionTime } from '../../src/utils';
import { PRODUCTION_RATE_KG_PER_MINUTE } from '../../constants';
import Input from '../Input';
import Select from '../Select';
import GaugeChart from '../charts/GaugeChart';
import Alert from '../Alert';
import InformationCircleIcon from '../icons/InformationCircleIcon';
// FIX: Remove .tsx extension from icon import to fix module resolution error.
import ChevronDownIcon from '../icons/ChevronDownIcon';
// FIX: Remove .tsx extension from icon import to fix module resolution error.
import ChevronUpIcon from '../icons/ChevronUpIcon';
import { SAMPLE_RECIPES } from '../../constants';
// FIX: Add missing imports for useSortableData and SortableHeader.
import { useSortableData } from '../../src/useSortableData';
import SortableHeader from '../SortableHeader';

type VarianceData = {
    run: any;
    totalConsumed: number;
    totalProduced: number;
    productionVarianceKg: number;
    productionVariancePercent: number;
    yieldPercent: number;
};

// FIX: Changed type annotations to `any` to match project's type structure.
// FIX: Removed OeeMetrics annotation as it does not exist.
const calculateOeeForRun = (run: any): any | null => {
    if (!run.startTime || !run.endTime) return null;

    const startTime = new Date(run.startTime);
    const endTime = new Date(run.endTime);
    const totalTimeMinutes = (endTime.getTime() - startTime.getTime()) / 60000;

    const totalDowntimeMinutes = (run.downtimes || []).reduce((sum, dt) => sum + (dt.durationMinutes || 0), 0);
    const runningTimeMinutes = totalTimeMinutes - totalDowntimeMinutes;

    if (totalTimeMinutes <= 0 || runningTimeMinutes < 0) return null;
    
    // 1. Availability
    const availability = (runningTimeMinutes / totalTimeMinutes);

    // 2. Performance
    const actualProductionKg = run.actualProducedQuantityKg || 0;
    const idealProductionKg = runningTimeMinutes * PRODUCTION_RATE_KG_PER_MINUTE;
    const performance = idealProductionKg > 0 ? (actualProductionKg / idealProductionKg) : 0;
    
    // 3. Quality (assumed to be 100% as per spec)
    const quality = 1.0;

    // 4. OEE
    const oee = availability * performance * quality;

    return {
        availability: availability * 100,
        performance: performance * 100,
        quality: quality * 100,
        oee: oee * 100,
    };
};


const YieldVarianceReportPage: React.FC = () => {
    const { productionRunsList } = useProductionContext();
    // FIX: Changed type annotation to `any` to match project's type structure.
    const recipes: any[] = SAMPLE_RECIPES;
    const [startDate, setStartDate] = useState(() => {
        const date = new Date();
        date.setDate(date.getDate() - 30);
        return date.toISOString().split('T')[0];
    });
    const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [recipeFilter, setRecipeFilter] = useState('all');
    const [expandedRunId, setExpandedRunId] = useState<string | null>(null);

    const varianceData = useMemo((): VarianceData[] => {
        return (productionRunsList || [])
            .filter((run: any) => {
                if (run.status !== 'completed' && run.status !== 'archived') return false;
                if (!run.endTime) return false;
                const runDate = new Date(run.endTime);
                const start = new Date(startDate);
                const end = new Date(new Date(endDate).setHours(23, 59, 59, 999));
                const matchesDate = runDate >= start && runDate <= end;
                const matchesRecipe = recipeFilter === 'all' || run.recipeId === recipeFilter;
                return matchesDate && matchesRecipe;
            })
            .map((run: any) => {
                const totalConsumed = (run.actualIngredientsUsed || []).reduce((sum: number, ing: any) => sum + (ing.actualConsumedQuantityKg || 0), 0);
                const totalProduced = run.actualProducedQuantityKg || 0;
                const productionVarianceKg = totalProduced - run.targetBatchSizeKg;
                const productionVariancePercent = run.targetBatchSizeKg > 0 ? (productionVarianceKg / run.targetBatchSizeKg) * 100 : 0;
                const yieldPercent = totalConsumed > 0 ? (totalProduced / totalConsumed) * 100 : 0;
                return { run, totalConsumed, totalProduced, productionVarianceKg, productionVariancePercent, yieldPercent };
            });
    }, [productionRunsList, startDate, endDate, recipeFilter]);

    const { items: sortedData, requestSort, sortConfig } = useSortableData(varianceData, { key: 'run.endTime', direction: 'descending' });

    const toggleExpand = (runId: string) => {
        setExpandedRunId(prev => (prev === runId ? null : runId));
    };
    
    const recipeOptions = useMemo(() => [
        { value: 'all', label: 'Wszystkie receptury' },
        ...recipes.map(r => ({ value: r.id, label: r.name }))
    ], [recipes]);

    return (
        <div className="p-4 md:p-6 bg-white dark:bg-secondary-800 shadow-xl rounded-lg">
            <div className="space-y-6">
                <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">Raport Wydajności i Odchyleń Produkcyjnych</h2>
                    <InformationCircleIcon className="h-5 w-5 text-gray-400"/>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300 -mt-5">
                    Raport analizuje odchylenia między planowanym a rzeczywistym zużyciem surowców oraz planowaną a rzeczywistą produkcją. Kluczowy dla technologów, planistów i kierowników produkcji.
                </p>

                <div className="p-4 bg-gray-50 dark:bg-secondary-900 rounded-lg border dark:border-secondary-700">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Input label="Data od" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                        <Input label="Data do" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} min={startDate} />
                        <Select label="Filtruj Recepturę" id="recipe-filter-select" options={recipeOptions} value={recipeFilter} onChange={e => setRecipeFilter(e.target.value)} />
                    </div>
                </div>

                {sortedData.length === 0 ? (
                    <Alert type="info" message="Brak danych dla wybranych kryteriów." />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-secondary-700 text-sm">
                            <thead className="bg-gray-100 dark:bg-secondary-700">
                                <tr>
                                    <th className="px-2 py-2 w-8"></th>
                                    <SortableHeader columnKey="run.recipeName" sortConfig={sortConfig} requestSort={requestSort}>Receptura / ID Zlecenia</SortableHeader>
                                    <SortableHeader columnKey="run.endTime" sortConfig={sortConfig} requestSort={requestSort}>Data Zakończenia</SortableHeader>
                                    <SortableHeader columnKey="run.targetBatchSizeKg" sortConfig={sortConfig} requestSort={requestSort} className="justify-end">Produkcja Plan (kg)</SortableHeader>
                                    <SortableHeader columnKey="totalProduced" sortConfig={sortConfig} requestSort={requestSort} className="justify-end">Produkcja Rzeczywista (kg)</SortableHeader>
                                    <SortableHeader columnKey="productionVariancePercent" sortConfig={sortConfig} requestSort={requestSort} className="justify-end">Odchylenie Prod. (%)</SortableHeader>
                                    <SortableHeader columnKey="yieldPercent" sortConfig={sortConfig} requestSort={requestSort} className="justify-end">Wydajność (%)</SortableHeader>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-secondary-800 divide-y divide-gray-200 dark:divide-secondary-700">
                                {sortedData.map(({ run, ...data }) => {
                                    const isExpanded = expandedRunId === run.id;
                                    return (
                                        <React.Fragment key={run.id}>
                                            <tr className="hover:bg-gray-50 dark:hover:bg-secondary-700/50 cursor-pointer" onClick={() => toggleExpand(run.id)}>
                                                <td className="px-2 py-2">{isExpanded ? <ChevronUpIcon className="h-4 w-4"/> : <ChevronDownIcon className="h-4 w-4"/>}</td>
                                                <td className="px-2 py-2"><p className="font-semibold text-gray-900 dark:text-gray-200">{run.recipeName}</p><p className="text-xs text-gray-500 dark:text-gray-400 font-mono">{run.id}</p></td>
                                                <td className="px-2 py-2 text-gray-900 dark:text-gray-200">{formatDate(run.endTime, true)}</td>
                                                <td className="px-2 py-2 text-right text-gray-900 dark:text-gray-200">{run.targetBatchSizeKg.toFixed(2)}</td>
                                                <td className="px-2 py-2 text-right font-medium text-gray-900 dark:text-gray-200">{data.totalProduced.toFixed(2)}</td>
                                                <td className={`px-2 py-2 text-right font-semibold ${Math.abs(data.productionVariancePercent) > 5 ? 'text-red-600 dark:text-red-400' : 'text-gray-800 dark:text-gray-200'}`}>{data.productionVariancePercent.toFixed(2)}%</td>
                                                <td className={`px-2 py-2 text-right font-bold ${data.yieldPercent < 98 ? 'text-orange-600 dark:text-orange-400' : 'text-green-700 dark:text-green-300'}`}>{data.yieldPercent.toFixed(2)}%</td>
                                            </tr>
                                            {isExpanded && (
                                                <tr>
                                                    <td colSpan={7} className="p-0">
                                                        <div className="p-3 bg-blue-50/50 dark:bg-blue-900/40">
                                                            <h5 className="font-semibold text-xs mb-2 text-gray-600 dark:text-gray-300">Szczegółowe zużycie surowców:</h5>
                                                            <table className="min-w-full text-xs bg-white dark:bg-secondary-800">
                                                                <thead className="bg-blue-100 dark:bg-blue-900/60">
                                                                    <tr>
                                                                        <th className="px-2 py-1 text-left text-gray-700 dark:text-gray-200">Składnik</th>
                                                                        <th className="px-2 py-1 text-right text-gray-700 dark:text-gray-200">Plan (kg)</th>
                                                                        <th className="px-2 py-1 text-right text-gray-700 dark:text-gray-200">Rzeczywiste (kg)</th>
                                                                        <th className="px-2 py-1 text-right text-gray-700 dark:text-gray-200">Odchylenie (kg)</th>
                                                                        <th className="px-2 py-1 text-right text-gray-700 dark:text-gray-200">Odchylenie (%)</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-gray-200 dark:divide-secondary-700">
                                                                    {(run.plannedIngredients || []).map((planned: any) => {
                                                                        const actual = (run.actualIngredientsUsed as any[])?.find(a => a.productName === planned.productName);
                                                                        const actualQty = actual?.actualConsumedQuantityKg || 0;
                                                                        const varianceKg = actualQty - planned.requiredQuantityKg;
                                                                        const variancePercent = planned.requiredQuantityKg > 0 ? (varianceKg / planned.requiredQuantityKg) * 100 : 0;
                                                                        return (
                                                                            <tr key={planned.productName} className="border-t dark:border-secondary-700">
                                                                                <td className="px-2 py-1 text-gray-800 dark:text-gray-200">{planned.productName}</td>
                                                                                <td className="px-2 py-1 text-right text-gray-800 dark:text-gray-200">{planned.requiredQuantityKg.toFixed(3)}</td>
                                                                                <td className="px-2 py-1 text-right text-gray-800 dark:text-gray-200">{actualQty.toFixed(3)}</td>
                                                                                <td className={`px-2 py-1 text-right font-medium ${Math.abs(varianceKg) > 0.1 ? 'text-red-600 dark:text-red-400' : 'text-gray-800 dark:text-gray-200'}`}>{varianceKg.toFixed(3)}</td>
                                                                                <td className={`px-2 py-1 text-right font-semibold ${Math.abs(variancePercent) > 2 ? 'text-red-600 dark:text-red-400' : 'text-gray-800 dark:text-gray-200'}`}>{variancePercent.toFixed(2)}%</td>
                                                                            </tr>
                                                                        );
                                                                    })}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default YieldVarianceReportPage;