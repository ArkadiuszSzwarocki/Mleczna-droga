import React, { useState, useMemo } from 'react';
import { RawMaterialLogEntry, FinishedGoodItem } from '../../types';
import { useAppContext } from '../contexts/AppContext';
import { formatDate, getBlockInfo } from '../../src/utils';
import Input from '../Input';
import Select from '../Select';
import { useSortableData } from '../../src/useSortableData';
import SortableHeader from '../SortableHeader';
import Alert from '../Alert';
import ArchiveBoxXMarkIcon from '../icons/ArchiveBoxXMarkIcon';
import InformationCircleIcon from '../icons/InformationCircleIcon';

type BlockedItem = {
    id: string;
    displayId: string;
    productName: string;
    type: 'Surowiec' | 'Wyrób Gotowy';
    location: string;
    blockReason: string;
    blockedAt: string;
};

const BlockedPalletsReportPage: React.FC = () => {
    const { rawMaterialsLogList, allProducts, finishedGoodsList } = useAppContext();
    
    const [productFilter, setProductFilter] = useState('all');
    const [typeFilter, setTypeFilter] = useState<'all' | 'raw' | 'fg'>('all');

    const blockedItems = useMemo((): BlockedItem[] => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStr = today.toISOString().split('T')[0];

        const rawBlocked = (rawMaterialsLogList || [])
            .filter(p => p && p.palletData && p.currentLocation !== null && (p.palletData.isBlocked || p.palletData.dataPrzydatnosci < todayStr))
            .map(p => {
                const isExpired = p.palletData.dataPrzydatnosci < todayStr;
                const blockHistory = (p.locationHistory || []).slice().reverse().find((h: any) => h.action === 'lab_pallet_blocked');
                return {
                    id: p.id,
                    displayId: p.palletData.nrPalety,
                    productName: p.palletData.nazwa,
                    type: 'Surowiec' as const,
                    location: p.currentLocation!,
                    blockReason: isExpired ? `Przeterminowana (${formatDate(p.palletData.dataPrzydatnosci)})` : p.palletData.blockReason || 'Brak powodu',
                    blockedAt: blockHistory?.movedAt || (isExpired ? p.palletData.dataPrzydatnosci : p.lastValidatedAt),
                };
            });

        const fgBlocked = (finishedGoodsList || [])
            .filter(fg => fg.currentLocation !== null && (fg.status === 'blocked' || new Date(fg.expiryDate).toISOString().split('T')[0] < todayStr))
            .map(fg => {
                const isExpired = new Date(fg.expiryDate).toISOString().split('T')[0] < todayStr;
                const blockHistory = (fg.locationHistory || []).slice().reverse().find((h: any) => h.action === 'finished_good_blocked');
                return {
                    id: fg.id,
                    displayId: fg.finishedGoodPalletId || fg.id,
                    productName: fg.productName,
                    type: 'Wyrób Gotowy' as const,
                    location: fg.currentLocation,
                    blockReason: isExpired ? `Przeterminowana (${formatDate(fg.expiryDate)})` : fg.blockReason || 'Brak powodu',
                    blockedAt: blockHistory?.movedAt || (isExpired ? fg.expiryDate : (fg.locationHistory.slice(-1)[0]?.movedAt || fg.productionDate)),
                };
            });
        
        return [...rawBlocked, ...fgBlocked];
    }, [rawMaterialsLogList, finishedGoodsList]);

    const allProductsOptions = useMemo(() => [
        { value: 'all', label: 'Wszystkie produkty' },
        ...(allProducts || []).map((p: any) => ({ value: p.name, label: p.name }))
    ], [allProducts]);
    
    const filteredItems = useMemo(() => {
        return blockedItems.filter(item => {
            const matchesProduct = !productFilter || productFilter === 'all' || item.productName.toLowerCase().includes(productFilter.toLowerCase());
            const matchesType = typeFilter === 'all' || (typeFilter === 'raw' && item.type === 'Surowiec') || (typeFilter === 'fg' && item.type === 'Wyrób Gotowy');
            return matchesProduct && matchesType;
        });
    }, [blockedItems, productFilter, typeFilter]);

    const { items: sortedItems, requestSort, sortConfig } = useSortableData<BlockedItem>(filteredItems, { key: 'blockedAt', direction: 'descending' });

    return (
        <div className="p-4 md:p-6 bg-white dark:bg-secondary-800 shadow-xl rounded-lg">
            <div className="space-y-6">
                 <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">Raport Zablokowanych Palet</h2>
                    {/* FIX: Removed unsupported `title` prop to fix type error. */}
                    <InformationCircleIcon className="h-5 w-5 text-gray-400"/>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300 -mt-5">
                    Ten raport dostarcza listę w czasie rzeczywistym wszystkich palet (surowców i wyrobów gotowych), które są aktualnie zablokowane. Blokada może wynikać z decyzji laboratorium (manualna) lub z powodu przekroczenia terminu ważności (automatyczna).
                </p>

                <div className="p-4 bg-gray-50 dark:bg-secondary-900 rounded-lg border dark:border-secondary-700">
                    <h3 className="text-md font-semibold text-gray-700 dark:text-gray-200 mb-2">Filtry Raportu</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Select 
                            label="Filtruj po nazwie produktu"
                            id="product-filter"
                            options={allProductsOptions}
                            value={productFilter}
                            onChange={(e: any) => setProductFilter(e.target.value)}
                            error={undefined}
                            className=""
                        />
                        <Select 
                            label="Filtruj po typie"
                            id="type-filter"
                            value={typeFilter}
                            onChange={(e: any) => setTypeFilter(e.target.value as any)}
                            options={[
                                { value: 'all', label: 'Wszystkie' },
                                { value: 'raw', label: 'Surowce' },
                                { value: 'fg', label: 'Wyroby Gotowe' },
                            ]}
                            error={undefined}
                            className=""
                        />
                    </div>
                </div>

                {sortedItems.length === 0 ? (
                    <Alert type="info" message="Brak zablokowanych lub przeterminowanych palet." />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-secondary-700 text-sm">
                            <thead className="bg-gray-100 dark:bg-secondary-700">
                                <tr>
                                    <SortableHeader columnKey="displayId" sortConfig={sortConfig} requestSort={requestSort} thClassName="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-300">ID Palety</SortableHeader>
                                    <SortableHeader columnKey="productName" sortConfig={sortConfig} requestSort={requestSort} thClassName="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-300">Produkt</SortableHeader>
                                    <SortableHeader columnKey="type" sortConfig={sortConfig} requestSort={requestSort} thClassName="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-300">Typ</SortableHeader>
                                    <SortableHeader columnKey="location" sortConfig={sortConfig} requestSort={requestSort} thClassName="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-300">Lokalizacja</SortableHeader>
                                    <SortableHeader columnKey="blockedAt" sortConfig={sortConfig} requestSort={requestSort} thClassName="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-300">Data Blokady/Ważności</SortableHeader>
                                    <th scope="col" className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-300">Powód Blokady</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-secondary-800 divide-y divide-gray-200 dark:divide-secondary-700">
                                {sortedItems.map(item => (
                                    <tr key={item.id} className="bg-red-50 dark:bg-red-900/40 hover:bg-red-100 dark:hover:bg-red-900/60">
                                        <td className="px-3 py-2 whitespace-nowrap font-mono text-red-800 dark:text-red-200">{item.displayId}</td>
                                        <td className="px-3 py-2 whitespace-nowrap text-gray-900 dark:text-gray-200">{item.productName}</td>
                                        <td className="px-3 py-2 whitespace-nowrap text-gray-900 dark:text-gray-200">{item.type}</td>
                                        <td className="px-3 py-2 whitespace-nowrap text-gray-900 dark:text-gray-200">{item.location}</td>
                                        <td className="px-3 py-2 whitespace-nowrap text-gray-900 dark:text-gray-200">{formatDate(item.blockedAt, true)}</td>
                                        <td className="px-3 py-2 text-gray-900 dark:text-gray-200">{item.blockReason}</td>
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
export default BlockedPalletsReportPage;
