import React, { useMemo, useState } from 'react';
import { RawMaterialLogEntry, PackagingMaterialLogEntry } from '../types';
import { useWarehouseContext } from './contexts/WarehouseContext';
import { useUIContext } from './contexts/UIContext';
import Input from './Input';
import SearchIcon from './icons/SearchIcon';
import CubeIcon from './icons/CubeIcon';
import { KO01_WAREHOUSE_ID } from '../constants';

type SummaryItem = {
    productName: string;
    totalAmount: number;
    unit: 'kg' | 'szt.';
    type: 'Surowiec' | 'Opakowanie';
    itemCount: number;
};

const SummaryCard: React.FC<{ item: SummaryItem, onClick: () => void }> = ({ item, onClick }) => {
    const typeColor = item.type === 'Surowiec' 
        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200' 
        : 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200';
    
    return (
        <button
            onClick={onClick}
            className="w-full text-left p-4 bg-white dark:bg-secondary-800 rounded-lg shadow-md flex flex-col justify-between h-full transition-transform transform hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-primary-500 ring-offset-2 dark:ring-offset-secondary-900"
        >
            <div>
                <div className="flex justify-between items-start">
                    <p className="font-bold text-lg text-primary-700 dark:text-primary-300 truncate pr-2" title={item.productName}>{item.productName}</p>
                    <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${typeColor}`}>{item.type}</span>
                </div>
            </div>
            <div className="mt-2 pt-2 border-t dark:border-secondary-700 flex justify-between items-end">
                <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Całkowita ilość</p>
                    <p className="text-xl font-extrabold text-gray-800 dark:text-gray-200">{item.totalAmount.toFixed(0)} <span className="text-lg">{item.unit}</span></p>
                </div>
                <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Liczba partii</p>
                    <p className="text-xl font-bold text-right text-gray-800 dark:text-gray-200">{item.itemCount}</p>
                </div>
            </div>
        </button>
    );
};

const KO01ViewPage: React.FC = () => {
    const { rawMaterialsLogList, packagingMaterialsLog } = useWarehouseContext();
    const { modalHandlers } = useUIContext();
    const [searchTerm, setSearchTerm] = useState('');

    const summaryData = useMemo((): SummaryItem[] => {
        const summaryMap = new Map<string, { totalAmount: number; unit: 'kg' | 'szt.'; type: 'Surowiec' | 'Opakowanie'; itemCount: number }>();
        (rawMaterialsLogList || [])
            .filter(item => item.currentLocation === KO01_WAREHOUSE_ID)
            .forEach(item => {
                const name = item.palletData.nazwa;
                const current = summaryMap.get(name) || { totalAmount: 0, unit: 'kg', type: 'Surowiec', itemCount: 0 };
                current.totalAmount += item.palletData.currentWeight;
                current.itemCount += 1;
                summaryMap.set(name, current);
            });

        (packagingMaterialsLog || [])
            .filter(item => item.currentLocation === KO01_WAREHOUSE_ID)
            .forEach(item => {
                const name = item.productName;
                const isBag = name.toLowerCase().includes('worek');
                const unit = isBag ? 'szt.' : 'kg';
                const current = summaryMap.get(name) || { totalAmount: 0, unit: unit, type: 'Opakowanie', itemCount: 0 };
                current.totalAmount += item.currentWeight;
                current.itemCount += 1;
                summaryMap.set(name, current);
            });

        return Array.from(summaryMap.entries())
            .map(([productName, data]) => ({ productName, ...data }))
            .sort((a,b) => a.productName.localeCompare(b.productName));
    }, [rawMaterialsLogList, packagingMaterialsLog]);

    const filteredItems = useMemo(() => {
        if (!searchTerm.trim()) return summaryData;
        const lowerSearch = searchTerm.toLowerCase();
        return summaryData.filter(item => item.productName.toLowerCase().includes(lowerSearch));
    }, [summaryData, searchTerm]);

    return (
        <div className="bg-white dark:bg-secondary-800 shadow-xl rounded-lg h-full flex flex-col">
            <header className="p-4 md:px-6 py-3 flex-shrink-0 border-b dark:border-secondary-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                    <CubeIcon className="h-8 w-8 text-primary-600 dark:text-primary-400" />
                    <div>
                        <h2 className="text-2xl font-semibold text-primary-700 dark:text-primary-300">Strefa Konfekcji ({KO01_WAREHOUSE_ID})</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Podsumowanie surowców i opakowań w workach.</p>
                    </div>
                </div>
                 <div className="w-full sm:w-auto sm:max-w-xs">
                    <Input label="" id="ko01-search" placeholder="Szukaj materiału..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} icon={<SearchIcon className="h-5 w-5 text-gray-400" />} />
                </div>
            </header>
            <div className="flex-grow overflow-auto scrollbar-hide p-4">
                {filteredItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 dark:text-gray-400 p-4">
                        <CubeIcon className="h-16 w-16 text-gray-300 dark:text-gray-600 mb-4" />
                        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">Strefa {KO01_WAREHOUSE_ID} jest pusta</h3>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {filteredItems.map((item) => (
                           <SummaryCard key={item.productName} item={item} onClick={() => { if(item.type === 'Surowiec') modalHandlers.openRawMaterialListModal(item.productName); else modalHandlers.openPackagingMaterialListModal(item.productName); }} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default KO01ViewPage;