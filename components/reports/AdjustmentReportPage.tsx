import React, { useState, useMemo } from 'react';
import { AdjustmentOrder } from '../../types';
import { useRecipeAdjustmentContext } from '../contexts/RecipeAdjustmentContext';
import { useSortableData } from '../../src/useSortableData';
import SortableHeader from '../SortableHeader';
import Button from '../Button';
import { formatDate } from '../../src/utils';
import ExclamationTriangleIcon from '../icons/ExclamationTriangleIcon';
import Input from '../Input';
import Alert from '../Alert';
import { ADJUSTMENT_REASONS } from '../../constants';

const getReasonLabel = (reasonValue: string) => {
    return ADJUSTMENT_REASONS.find(r => r.value === reasonValue)?.label || reasonValue;
};

const AdjustmentReportPage: React.FC = () => {
    const { adjustmentOrders } = useRecipeAdjustmentContext();
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const completedOrders = useMemo(() => 
        (adjustmentOrders || [])
            .filter(order => order.status === 'completed' && order.completedAt)
            .filter(order => {
                if (!startDate && !endDate) return true;
                const completedDate = new Date(order.completedAt!);
                if (startDate && completedDate < new Date(startDate)) return false;
                if (endDate && completedDate > new Date(new Date(endDate).setHours(23, 59, 59, 999))) return false;
                return true;
            }),
    [adjustmentOrders, startDate, endDate]);

    const { items: sortedOrders, requestSort, sortConfig } = useSortableData(completedOrders, { key: 'completedAt', direction: 'descending' });

    return (
        <div className="p-4 md:p-6 bg-white dark:bg-secondary-800 shadow-xl rounded-lg h-full flex flex-col">
            <header className="flex-shrink-0 flex items-center mb-4 border-b dark:border-secondary-700 pb-3">
                <ExclamationTriangleIcon className="h-8 w-8 text-primary-600 dark:text-primary-400 mr-3" />
                <h2 className="text-2xl font-semibold text-primary-700 dark:text-primary-300">Raport Odchyleń (Dosypek)</h2>
            </header>

            <div className="p-4 bg-gray-50 dark:bg-secondary-900 rounded-lg border dark:border-secondary-700 mb-4 flex-shrink-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input label="Data od" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                    <Input label="Data do" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} min={startDate} />
                </div>
            </div>

            <div className="flex-grow overflow-auto">
                {sortedOrders.length === 0 ? (
                    <Alert type="info" message="Brak zakończonych korekt w wybranym okresie." />
                ) : (
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-secondary-700 text-sm">
                        <thead className="bg-gray-100 dark:bg-secondary-700">
                            <tr>
                                <SortableHeader columnKey="id" sortConfig={sortConfig} requestSort={requestSort}>ID Korekty</SortableHeader>
                                <SortableHeader columnKey="completedAt" sortConfig={sortConfig} requestSort={requestSort}>Data Zakończenia</SortableHeader>
                                <SortableHeader columnKey="productionRunId" sortConfig={sortConfig} requestSort={requestSort}>ID Zlecenia</SortableHeader>
                                <SortableHeader columnKey="recipeName" sortConfig={sortConfig} requestSort={requestSort}>Produkt</SortableHeader>
                                <SortableHeader columnKey="reason" sortConfig={sortConfig} requestSort={requestSort}>Powód</SortableHeader>
                                <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-300">Materiały</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-secondary-800 divide-y divide-gray-200 dark:divide-secondary-700">
                            {sortedOrders.map(order => (
                                <tr key={order.id}>
                                    <td className="px-3 py-2 font-mono">{order.id.split('-')[1]}</td>
                                    <td className="px-3 py-2">{formatDate(order.completedAt!, true)}</td>
                                    <td className="px-3 py-2 font-mono">{order.productionRunId}</td>
                                    <td className="px-3 py-2 font-semibold">{order.recipeName}</td>
                                    <td className="px-3 py-2">{getReasonLabel(order.reason || 'inny')}</td>
                                    <td className="px-3 py-2">
                                        <ul className="text-xs">
                                            {order.materials.map((mat, idx) => (
                                                <li key={idx}>
                                                    {mat.productName}: <strong>{mat.pickedQuantityKg.toFixed(2)} kg</strong>
                                                </li>
                                            ))}
                                        </ul>
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

export default AdjustmentReportPage;