import React, { useMemo, useState } from 'react';
import { useProductionContext } from './contexts/ProductionContext';
import { useUIContext } from './contexts/UIContext';
import { MIXING_ZONE_ID } from '../constants';
import { FinishedGoodItem, Document } from '../types';
import PalletTile from './PalletTile';
import Input from './Input';
import SearchIcon from './icons/SearchIcon';
import MixerIcon from './icons/MixerIcon';
import { useSortableData } from '../src/useSortableData';
import SortableHeader from './SortableHeader';
import { formatDate, getActionLabel } from '../src/utils';
import ClipboardListIcon from './icons/ClipboardListIcon';
import DocumentTextIcon from './icons/DocumentTextIcon';

export const MIX01ViewPage: React.FC = () => {
    const { finishedGoodsList } = useProductionContext();
    const { modalHandlers } = useUIContext();
    const [searchTerm, setSearchTerm] = useState('');

    const itemsInMixZone = useMemo(() =>
        (finishedGoodsList || []).filter((item: FinishedGoodItem) => item.currentLocation === MIXING_ZONE_ID),
        [finishedGoodsList]
    );

    const filteredItems = useMemo(() => {
        if (!searchTerm.trim()) return itemsInMixZone;
        const lowerSearch = searchTerm.toLowerCase();
        return itemsInMixZone.filter((item: FinishedGoodItem) =>
            (item.finishedGoodPalletId || item.id).toLowerCase().includes(lowerSearch) ||
            item.productName.toLowerCase().includes(lowerSearch)
        );
    }, [itemsInMixZone, searchTerm]);

    const { items: sortedItems, requestSort, sortConfig } = useSortableData(filteredItems, { key: 'productionDate', direction: 'descending' });

    return (
        <div className="bg-white dark:bg-secondary-800 shadow-xl rounded-lg h-full flex flex-col">
            <div className="p-4 md:px-6 py-3 flex-shrink-0 border-b dark:border-secondary-700">
                 <Input label="" id="mix-zone-search" placeholder="Szukaj w strefie miksowania..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} icon={<SearchIcon className="h-5 w-5 text-gray-400" />} />
            </div>
            <div className="flex-grow overflow-auto scrollbar-hide p-4">
                {sortedItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 dark:text-gray-400">
                        <MixerIcon className="h-16 w-16 text-gray-300 dark:text-gray-600 mb-4" />
                        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">Strefa Miksowania jest pusta</h3>
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 lg:hidden">
                            {sortedItems.map((item: FinishedGoodItem) => (
                                <PalletTile key={item.id} item={item} onClick={() => modalHandlers.openFinishedGoodDetailModal(item)} />
                            ))}
                        </div>
                        <table className="min-w-full text-sm hidden lg:table">
                            <thead className="bg-gray-100 dark:bg-secondary-700">
                                <tr>
                                    <SortableHeader columnKey="displayId" sortConfig={sortConfig} requestSort={requestSort}>ID Palety</SortableHeader>
                                    <SortableHeader columnKey="productName" sortConfig={sortConfig} requestSort={requestSort}>Produkt</SortableHeader>
                                    <SortableHeader columnKey="quantityKg" sortConfig={sortConfig} requestSort={requestSort} className="justify-end">Waga</SortableHeader>
                                    <SortableHeader columnKey="expiryDate" sortConfig={sortConfig} requestSort={requestSort}>Ważność</SortableHeader>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-secondary-800 divide-y divide-gray-200 dark:divide-secondary-700">
                                {sortedItems.map((item: FinishedGoodItem) => (
                                    <tr key={item.id} onClick={() => modalHandlers.openFinishedGoodDetailModal(item)} className="hover:bg-gray-50 dark:hover:bg-secondary-700/50 cursor-pointer">
                                        <td className="px-3 py-2 whitespace-nowrap font-mono">{item.displayId}</td>
                                        <td className="px-3 py-2">{item.productName}</td>
                                        <td className="px-3 py-2 text-right">{item.quantityKg.toFixed(0)} kg</td>
                                        <td className="px-3 py-2 whitespace-nowrap">{formatDate(item.expiryDate)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </>
                )}
            </div>
        </div>
    );
};

export default MIX01ViewPage;