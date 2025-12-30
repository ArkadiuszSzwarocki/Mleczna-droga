import React, { useMemo, useState } from 'react';
import { useUIContext } from './contexts/UIContext';
import { FinishedGoodItem } from '../types';
import Input from './Input';
import SearchIcon from './icons/SearchIcon';
import CubeIcon from './icons/CubeIcon';
import { useProductionContext } from './contexts/ProductionContext';
import { VIRTUAL_LOCATION_ARCHIVED } from '../constants';

type InventorySummaryItem = {
    name: string;
    totalWeight: number;
    palletCount: number;
};

const SummaryTile: React.FC<{
    item: InventorySummaryItem;
    onClick: () => void;
}> = ({ item, onClick }) => {
    return (
        <button
            onClick={onClick}
            className="w-full text-left p-4 bg-white dark:bg-secondary-800 rounded-lg shadow-md flex flex-col justify-between h-full transition-transform transform hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-primary-500 ring-offset-2 dark:ring-offset-secondary-900"
        >
            <div>
                <p className="font-bold text-lg text-primary-700 dark:text-primary-300 truncate" title={item.name}>{item.name}</p>
            </div>
            <div className="mt-2 pt-2 border-t dark:border-secondary-700 flex justify-between items-end">
                <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Całkowita waga</p>
                    <p className="text-xl font-extrabold text-gray-800 dark:text-gray-200">{item.totalWeight.toFixed(0)} kg</p>
                </div>
                <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Liczba palet</p>
                    <p className="text-xl font-bold text-right text-gray-800 dark:text-gray-200">{item.palletCount}</p>
                </div>
            </div>
        </button>
    );
};

const AllFinishedGoodsViewPage: React.FC = () => {
    const { finishedGoodsList } = useProductionContext();
    const { modalHandlers } = useUIContext();
    const [searchTerm, setSearchTerm] = useState('');

    const inventorySummary = useMemo((): InventorySummaryItem[] => {
        const summaryMap = new Map<string, { totalWeight: number, palletCount: number }>();
        (finishedGoodsList || []).forEach(pallet => {
            if ((pallet.status === 'available' || pallet.status === 'blocked') && pallet.currentLocation !== VIRTUAL_LOCATION_ARCHIVED) {
                const name = pallet.productName;
                const current = summaryMap.get(name) || { totalWeight: 0, palletCount: 0 };
                current.totalWeight += pallet.quantityKg;
                current.palletCount += 1;
                summaryMap.set(name, current);
            }
        });
        return Array.from(summaryMap.entries()).map(([name, data]) => ({ name, ...data })).sort((a, b) => a.name.localeCompare(b.name));
    }, [finishedGoodsList]);
    
    const filteredSummaryItems = useMemo(() => {
        if (!searchTerm.trim()) return inventorySummary;
        const lowerSearch = searchTerm.toLowerCase();
        return inventorySummary.filter(item => item.name.toLowerCase().includes(lowerSearch));
    }, [inventorySummary, searchTerm]);
    
    return (
        <div className="bg-white dark:bg-secondary-800 shadow-xl rounded-lg h-full flex flex-col">
             <header className="p-4 md:px-6 py-3 flex-shrink-0 border-b dark:border-secondary-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <h2 className="text-xl md:text-2xl font-semibold text-primary-700 dark:text-primary-300 break-words">Zestawienie Wyrobów Gotowych</h2>
                <div className="w-full sm:w-auto sm:max-w-xs">
                    <Input label="" id="finished-goods-search" placeholder="Filtruj zestawienie..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} icon={<SearchIcon className="h-5 w-5 text-gray-400" />} />
                </div>
            </header>
            <div className="flex-grow overflow-auto scrollbar-hide p-4">
                {filteredSummaryItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 dark:text-gray-400 py-10">
                        <CubeIcon className="h-16 w-16 text-gray-300 dark:text-gray-600 mb-4" />
                        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">{searchTerm ? 'Brak wyników' : 'Brak wyrobów gotowych w magazynie'}</h3>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-4">
                        {filteredSummaryItems.map((item: InventorySummaryItem) => (
                            <SummaryTile key={item.name} item={item} onClick={() => modalHandlers.openFinishedGoodListModal(item.name)} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AllFinishedGoodsViewPage;