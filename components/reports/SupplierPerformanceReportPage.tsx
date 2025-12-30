
import React, { useState, useMemo } from 'react';
import { useWarehouseContext } from '../contexts/WarehouseContext';
import { SUPPLIERS_LIST } from '../../constants';
import Input from '../Input';
import Select from '../Select';
import { formatDate } from '../../src/utils';
import { useSortableData } from '../../src/useSortableData';
import SortableHeader from '../SortableHeader';
import InformationCircleIcon from '../icons/InformationCircleIcon';
// FIX: Remove .tsx extension from icon import to fix module resolution error.
import ChevronDownIcon from '../icons/ChevronDownIcon';
// FIX: Remove .tsx extension from icon import to fix module resolution error.
import ChevronUpIcon from '../icons/ChevronUpIcon';
import Alert from '../Alert';

type SupplierPerformanceData = {
    supplierId: string;
    supplierLabel: string;
    totalDeliveries: number;
    totalPallets: number;
    blockedPallets: number;
    avgReleaseTimeHours: number | null;
    // FIX: Changed type to `any[]` to resolve type incompatibility error during assignment.
    deliveries: any[];
};

export const SupplierPerformanceReportPage: React.FC = () => {
    // FIX: Destructured `deliveries` which is the correct name provided by the context.
    const { deliveries } = useWarehouseContext();
    
    const [startDate, setStartDate] = useState(() => {
        const date = new Date();
        date.setMonth(date.getMonth() - 3); // Default to last 3 months
        return date.toISOString().split('T')[0];
    });
    const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [selectedSupplier, setSelectedSupplier] = useState('all');
    const [expandedSupplier, setExpandedSupplier] = useState<string | null>(null);

    const performanceData = useMemo((): SupplierPerformanceData[] => {
        const completedDeliveries = (deliveries || []).filter(d => {
            if (d.status !== 'COMPLETED' || !d.warehouseStageCompletedAt) return false;
            const deliveryDate = new Date(d.warehouseStageCompletedAt);
            const start = new Date(startDate);
            const end = new Date(new Date(endDate).setHours(23, 59, 59, 999));
            return deliveryDate >= start && deliveryDate <= end;
        });

        const groupedBySupplier = completedDeliveries.reduce((acc: Record<string, any[]>, delivery) => {
            const supplierId = delivery.supplier || 'unknown';
            if (!acc[supplierId]) {
                acc[supplierId] = [];
            }
            acc[supplierId].push(delivery);
            return acc;
        }, {});

        return Object.entries(groupedBySupplier).map(([supplierId, deliveries]: [string, any[]]) => {
            const totalPallets = deliveries.reduce((sum, d) => sum + (d.items || []).length, 0);
            const blockedPallets = deliveries.reduce((sum, d) => sum + (d.items || []).filter((item: any) => item.isBlocked).length, 0);
            
            const releaseTimes = deliveries
                .map(d => {
                    if (d.warehouseStageCompletedAt && d.deliveryDate) {
                        return new Date(d.warehouseStageCompletedAt).getTime() - new Date(d.deliveryDate).getTime();
                    }
                    return null;
                })
                .filter(time => time !== null) as number[];

            const avgReleaseTimeHours = releaseTimes.length > 0
                ? (releaseTimes.reduce((sum, time) => sum + time, 0) / releaseTimes.length) / (1000 * 60 * 60)
                : null;

            return {
                supplierId,
                supplierLabel: SUPPLIERS_LIST.find(s => s.value === supplierId)?.label || 'Nieznany Dostawca',
                totalDeliveries: deliveries.length,
                totalPallets,
                blockedPallets,
                avgReleaseTimeHours,
                deliveries,
            };
        });
    }, [deliveries, startDate, endDate]);
    
    const { items: sortedData, requestSort, sortConfig } = useSortableData(performanceData, { key: 'totalDeliveries', direction: 'descending' });

    const filteredData = useMemo(() => {
        if (selectedSupplier === 'all') return sortedData;
        return sortedData.filter(s => s.supplierId === selectedSupplier);
    }, [sortedData, selectedSupplier]);
    
    const supplierOptions = useMemo(() => [
        { value: 'all', label: 'Wszyscy Dostawcy' },
        ...SUPPLIERS_LIST.map(s => ({ value: s.value, label: s.label }))
    ], []);

    const toggleExpand = (supplierId: string) => {
        setExpandedSupplier(prev => prev === supplierId ? null : supplierId);
    };

    return (
        <div className="p-4 md:p-6 bg-white dark:bg-secondary-800 shadow-xl rounded-lg">
            <div className="space-y-6">
                <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">Raport Efektywności Dostawców</h2>
                    <InformationCircleIcon className="h-5 w-5 text-gray-400"/>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300 -mt-5">
                    Raport ten dostarcza twardych danych do oceny i negocjacji z dostawcami, analizując kluczowe wskaźniki, takie jak procent zablokowanych palet i średni czas od dostawy do zwolnienia palety.
                </p>

                <div className="p-4 bg-gray-50 dark:bg-secondary-900 rounded-lg border dark:border-secondary-700">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Input label="Data od" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                        <Input label="Data do" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} min={startDate} />
                        <Select label="Filtruj Dostawcę" id="supplier-filter" options={supplierOptions} value={selectedSupplier} onChange={(e: any) => setSelectedSupplier(e.target.value)} error={undefined} className="" />
                    </div>
                </div>

                {filteredData.length === 0 ? (
                    <Alert type="info" message="Brak danych dla wybranych kryteriów." />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-secondary-700 text-sm">
                            <thead className="bg-gray-100 dark:bg-secondary-700">
                                <tr>
                                    <th className="px-3 py-2 w-8"></th>
                                    <SortableHeader columnKey="supplierLabel" sortConfig={sortConfig} requestSort={requestSort}>Dostawca</SortableHeader>
                                    <SortableHeader columnKey="totalDeliveries" sortConfig={sortConfig} requestSort={requestSort} className="justify-end">Liczba Dostaw</SortableHeader>
                                    <SortableHeader columnKey="totalPallets" sortConfig={sortConfig} requestSort={requestSort} className="justify-end">Liczba Palet</SortableHeader>
                                    <SortableHeader columnKey="blockedPallets" sortConfig={sortConfig} requestSort={requestSort} className="justify-end">Palety Zablokowane</SortableHeader>
                                    <th scope="col" className="px-3 py-2 text-right font-medium text-gray-600 dark:text-gray-300">% Zablokowanych</th>
                                    <SortableHeader columnKey="avgReleaseTimeHours" sortConfig={sortConfig} requestSort={requestSort} className="justify-end">Śr. Czas Zwolnienia (godz.)</SortableHeader>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-secondary-800 divide-y divide-gray-200 dark:divide-secondary-700">
                            {filteredData.map(data => {
                                const blockedPercent = data.totalPallets > 0 ? (data.blockedPallets / data.totalPallets) * 100 : 0;
                                const isExpanded = expandedSupplier === data.supplierId;
                                return (
                                    <React.Fragment key={data.supplierId}>
                                        <tr className="hover:bg-gray-50 dark:hover:bg-secondary-700/50" onClick={() => toggleExpand(data.supplierId)}>
                                            <td className="px-3 py-2 w-8">{isExpanded ? <ChevronUpIcon className="h-4 w-4"/> : <ChevronDownIcon className="h-4 w-4"/>}</td>
                                            <td className="px-3 py-2 whitespace-nowrap">{data.supplierLabel}</td>
                                            <td className="px-3 py-2 text-right">{data.totalDeliveries}</td>
                                            <td className="px-3 py-2 text-right">{data.totalPallets}</td>
                                            <td className="px-3 py-2 text-right">{data.blockedPallets}</td>
                                            <td className={`px-3 py-2 text-right font-semibold ${blockedPercent > 10 ? 'text-red-600' : (blockedPercent > 5 ? 'text-orange-500' : '')}`}>{blockedPercent.toFixed(1)}%</td>
                                            <td className="px-3 py-2 text-right">{data.avgReleaseTimeHours?.toFixed(1) || 'N/A'}</td>
                                        </tr>
                                        {isExpanded && (
                                            <tr>
                                                <td colSpan={7} className="p-0">
                                                    <div className="p-3 bg-blue-50/50 dark:bg-blue-900/40">
                                                        <h5 className="font-semibold text-xs mb-2 text-gray-600 dark:text-gray-300">Dostawy od {data.supplierLabel}:</h5>
                                                        <ul className="list-disc list-inside pl-2 text-xs">
                                                            {(data.deliveries || []).map((d) => (
                                                                <li key={d.id}>
                                                                    {formatDate(d.deliveryDate)} - Zam. {d.orderRef} - {(d.items || []).length} palet
                                                                </li>
                                                            ))}
                                                        </ul>
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

// FIX: Added missing default export to support lazy loading.
export default SupplierPerformanceReportPage;
