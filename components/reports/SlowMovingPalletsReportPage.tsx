import React, { useState, useMemo } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { RawMaterialLogEntry } from '../../types';
import { formatDate } from '../../src/utils';
import Input from '../Input';
import Select from '../Select';
import { useSortableData } from '../../src/useSortableData';
import SortableHeader from '../SortableHeader';
import Alert from '../Alert';
import InformationCircleIcon from '../icons/InformationCircleIcon';

type SlowMovingItem = {
    id: string;
    displayId: string;
    productName: string;
    location: string;
    currentWeight: number;
    lastActivityAt: string;
    idleDays: number;
};

const SlowMovingPalletsReportPage: React.FC = () => {
    const { rawMaterialsLogList, allProducts } = useAppContext();
    
    const [idleDaysThreshold, setIdleDaysThreshold] = useState(30);
    const [productFilter, setProductFilter] = useState('all');

    const slowMovingItems = useMemo((): SlowMovingItem[] => {
        const now = new Date();
        const items: SlowMovingItem[] = [];

        (rawMaterialsLogList || []).forEach(pallet => {
            if (pallet && pallet.palletData && pallet.currentLocation !== null) {
                const lastActivity = pallet.locationHistory[pallet.locationHistory.length - 1];
                if (lastActivity) {
                    const lastActivityDate = new Date(lastActivity.movedAt);
                    const idleDays = Math.floor((now.getTime() - lastActivityDate.getTime()) / (1000 * 3600 * 24));

                    if (idleDays >= idleDaysThreshold) {
                        items.push({
                            id: pallet.id,
                            displayId: pallet.palletData.nrPalety,
                            productName: pallet.palletData.nazwa,
                            location: pallet.currentLocation,
                            currentWeight: pallet.palletData.currentWeight,
                            lastActivityAt: lastActivity.movedAt,
                            idleDays: idleDays,
                        });
                    }
                }
            }
        });
        return items;
    }, [rawMaterialsLogList, idleDaysThreshold]);

    const allProductsOptions = useMemo(() => [
        { value: 'all', label: 'Wszystkie produkty' },
        ...(allProducts || []).map((p: any) => ({ value: p.name, label: p.name }))
    ], [allProducts]);
    
    const filteredItems = useMemo(() => {
        return slowMovingItems.filter(item => {
            return !productFilter || productFilter === 'all' || item.productName.toLowerCase().includes(productFilter.toLowerCase());
        });
    }, [slowMovingItems, productFilter]);

    const { items: sortedItems, requestSort, sortConfig } = useSortableData<SlowMovingItem>(filteredItems, { key: 'idleDays', direction: 'descending' });

    return (
        <div className="p-4 md:p-6 bg-white dark:bg-secondary-800 shadow-xl rounded-lg">
            <div className="space-y-6">
                 <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">Raport Palet Wolno Rotujących</h2>
                    <InformationCircleIcon className="h-5 w-5 text-gray-400"/>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300 -mt-5">
                   Ten raport identyfikuje surowce, które nie były przemieszczane przez określony czas, pomagając zoptymalizować wykorzystanie przestrzeni magazynowej i zarządzać zapasami.
                </p>

                <div className="p-4 bg-gray-50 dark:bg-secondary-900 rounded-lg border dark:border-secondary-700">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input label="Pokaż palety nieaktywne przez ponad (dni)" type="number" value={String(idleDaysThreshold)} onChange={e => setIdleDaysThreshold(Number(e.target.value) || 0)} min="1" />
                        <Select 
                            label="Filtruj po nazwie produktu"
                            id="product-filter"
                            options={allProductsOptions}
                            value={productFilter}
                            onChange={e => setProductFilter(e.target.value)}
                        />
                    </div>
                </div>

                {sortedItems.length === 0 ? (
                    <Alert type="info" message={`Brak palet nieaktywnych przez ponad ${idleDaysThreshold} dni.`} />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-secondary-700 text-sm">
                            <thead className="bg-gray-100 dark:bg-secondary-700">
                                <tr>
                                    <SortableHeader columnKey="displayId" sortConfig={sortConfig} requestSort={requestSort} thClassName="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-300">ID Palety</SortableHeader>
                                    <SortableHeader columnKey="productName" sortConfig={sortConfig} requestSort={requestSort} thClassName="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-300">Produkt</SortableHeader>
                                    <SortableHeader columnKey="location" sortConfig={sortConfig} requestSort={requestSort} thClassName="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-300">Lokalizacja</SortableHeader>
                                    <SortableHeader columnKey="idleDays" sortConfig={sortConfig} requestSort={requestSort} thClassName="px-3 py-2 text-right font-medium text-gray-600 dark:text-gray-300">Dni bez ruchu</SortableHeader>
                                    <SortableHeader columnKey="lastActivityAt" sortConfig={sortConfig} requestSort={requestSort} thClassName="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-300">Ostatnia Aktywność</SortableHeader>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-secondary-800 divide-y divide-gray-200 dark:divide-secondary-700">
                                {sortedItems.map(item => (
                                    <tr key={item.id}>
                                        <td className="px-3 py-2 whitespace-nowrap font-mono">{item.displayId}</td>
                                        <td className="px-3 py-2 whitespace-nowrap">{item.productName}</td>
                                        <td className="px-3 py-2 whitespace-nowrap">{item.location}</td>
                                        <td className="px-3 py-2 text-right font-semibold text-orange-600">{item.idleDays}</td>
                                        <td className="px-3 py-2 whitespace-nowrap">{formatDate(item.lastActivityAt, true)}</td>
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

export default SlowMovingPalletsReportPage;