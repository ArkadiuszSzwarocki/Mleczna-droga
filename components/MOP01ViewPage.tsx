
import React, { useMemo, useState } from 'react';
import { PackagingMaterialLogEntry, RawMaterialLogEntry, FinishedGoodItem, Document } from '../types';
import { useWarehouseContext } from './contexts/WarehouseContext';
import { useProductionContext } from './contexts/ProductionContext';
import { useUIContext } from './contexts/UIContext';
import { useSortableData } from '../src/useSortableData';
import { formatDate, getBlockInfo, getFinishedGoodStatusLabel } from '../src/utils';
import Input from './Input';
import SearchIcon from './icons/SearchIcon';
import ArchiveBoxIcon from './icons/ArchiveBoxIcon';
import SortableHeader from './SortableHeader';
import { MOP01_WAREHOUSE_ID } from '../constants';
import LockClosedIcon from './icons/LockClosedIcon';
import CheckCircleIcon from './icons/CheckCircleIcon';
import PalletTile from './PalletTile';

type CombinedItem = {
    id: string;
    isRaw: boolean;
    isPackaging: boolean;
    isFinishedGood: boolean;
    displayId: string;
    productName: string;
    location: string;
    date: string;
    typeLabel: 'Surowiec' | 'Opakowanie' | 'Wyrób Gotowy';
    originalItem: RawMaterialLogEntry | PackagingMaterialLogEntry | FinishedGoodItem;
    weight: number;
};

const PackagingTile: React.FC<{ item: PackagingMaterialLogEntry; onClick: () => void }> = ({ item, onClick }) => {
    const { isBlocked, reason } = getBlockInfo(item);
    const barColor = isBlocked ? 'bg-red-500' : 'bg-purple-500';

    return (
        <button
            onClick={onClick}
            className="w-full text-left bg-white dark:bg-secondary-800 rounded-lg shadow-md flex items-stretch h-full transition-transform transform hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-primary-500 ring-offset-2 dark:ring-offset-secondary-900"
        >
            <div className={`w-1.5 ${barColor} rounded-l-lg flex-shrink-0`}></div>
            <div className="flex-1 p-3 flex flex-col justify-between">
                <div>
                    <p className="font-bold text-gray-700 dark:text-gray-200 text-sm font-mono truncate" title={item.id}>{item.id}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-tight" title={item.productName}>{item.productName}</p>
                </div>
                <div className="mt-2 flex justify-between items-end">
                    <p className="text-lg sm:text-xl font-extrabold text-primary-700 dark:text-primary-300">{item.currentWeight.toFixed(2)} kg</p>
                    {isBlocked ? (
                        <div className="flex items-center" title={reason || ''}><LockClosedIcon className="h-5 w-5 text-red-500"/></div>
                    ) : (
                        <div className="flex items-center"><CheckCircleIcon className="h-5 w-5 text-green-500"/></div>
                    )}
                </div>
            </div>
        </button>
    );
};


export const MOP01ViewPage: React.FC = () => {
    const { packagingMaterialsLog, rawMaterialsLogList } = useWarehouseContext();
    const { finishedGoodsList } = useProductionContext();
    const { modalHandlers } = useUIContext();
    const [searchTerm, setSearchTerm] = useState('');

    const combinedItems = useMemo((): CombinedItem[] => {
        const items: CombinedItem[] = [];

        (packagingMaterialsLog || []).forEach(p => {
            if (p.currentLocation === MOP01_WAREHOUSE_ID) {
                items.push({
                    id: p.id,
                    isRaw: false,
                    isPackaging: true,
                    isFinishedGood: false,
                    displayId: p.id,
                    productName: p.productName,
                    location: p.currentLocation || 'Brak',
                    date: p.dateAdded,
                    typeLabel: 'Opakowanie',
                    originalItem: p,
                    weight: p.currentWeight
                });
            }
        });
        
        (rawMaterialsLogList || []).forEach(p => {
            if (p.currentLocation === MOP01_WAREHOUSE_ID) {
                items.push({
                    id: p.id,
                    isRaw: true,
                    isPackaging: false,
                    isFinishedGood: false,
                    displayId: p.palletData.nrPalety,
                    productName: p.palletData.nazwa,
                    location: p.currentLocation || 'Brak',
                    date: p.palletData.dataPrzydatnosci,
                    typeLabel: 'Surowiec',
                    originalItem: p,
                    weight: p.palletData.currentWeight
                });
            }
        });

        (finishedGoodsList || []).forEach(p => {
            if (p.currentLocation === MOP01_WAREHOUSE_ID) {
                items.push({
                    id: p.id,
                    isRaw: false,
                    isPackaging: false,
                    isFinishedGood: true,
                    displayId: p.displayId || p.id,
                    productName: p.productName,
                    location: p.currentLocation || 'Brak',
                    date: p.expiryDate,
                    typeLabel: 'Wyrób Gotowy',
                    originalItem: p,
                    weight: p.quantityKg
                });
            }
        });

        return items;
    }, [packagingMaterialsLog, rawMaterialsLogList, finishedGoodsList]);


    const filteredItems = useMemo(() => {
        if (!searchTerm.trim()) return combinedItems;
        const lowerSearch = searchTerm.toLowerCase();
        return combinedItems.filter((item: CombinedItem) =>
            item.displayId.toLowerCase().includes(lowerSearch) ||
            item.productName.toLowerCase().includes(lowerSearch)
        );
    }, [combinedItems, searchTerm]);

    const { items: sortedItems, requestSort, sortConfig } = useSortableData(filteredItems, { key: 'date', direction: 'descending' });

    const handleItemClick = (item: CombinedItem) => {
        if (item.isPackaging) {
            modalHandlers.openPackagingMaterialDetailModal(item.originalItem as PackagingMaterialLogEntry);
        } else if (item.isRaw) {
            modalHandlers.openPalletDetailModal(item.originalItem as RawMaterialLogEntry);
        } else {
            modalHandlers.openFinishedGoodDetailModal(item.originalItem as FinishedGoodItem);
        }
    };

    return (
        <div className="bg-white dark:bg-secondary-800 shadow-xl rounded-lg h-full flex flex-col">
            <header className="p-4 md:px-6 py-3 flex-shrink-0 border-b dark:border-secondary-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                    <ArchiveBoxIcon className="h-8 w-8 text-primary-600 dark:text-primary-400" />
                    <div>
                        <h2 className="text-2xl font-semibold text-primary-700 dark:text-primary-300">Magazyn Opakowań (MOP01)</h2>
                    </div>
                </div>
                <div className="w-full sm:w-auto sm:max-w-xs">
                    <Input
                        label=""
                        id="mop01-search"
                        placeholder="Szukaj..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        icon={<SearchIcon className="h-5 w-5 text-gray-400" />}
                    />
                </div>
            </header>

            <div className="flex-grow overflow-auto scrollbar-hide p-4">
                {sortedItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 dark:text-gray-400">
                        <ArchiveBoxIcon className="h-16 w-16 text-gray-300 dark:text-gray-600 mb-4" />
                        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">Magazyn MOP01 jest pusty</h3>
                    </div>
                ) : (
                    <>
                        {/* Mobile View */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:hidden">
                            {sortedItems.map((item: CombinedItem) => (
                                item.isPackaging ? 
                                <PackagingTile
                                    key={item.id}
                                    item={item.originalItem as PackagingMaterialLogEntry}
                                    onClick={() => handleItemClick(item)}
                                />
                                :
                                <PalletTile
                                    key={item.id}
                                    item={item.originalItem as RawMaterialLogEntry | FinishedGoodItem}
                                    onClick={() => handleItemClick(item)}
                                />
                            ))}
                        </div>

                        {/* Desktop View */}
                        <table className="min-w-full text-sm hidden md:table">
                            <thead className="bg-gray-100 dark:bg-secondary-700 sticky top-0">
                                <tr>
                                    <SortableHeader columnKey="displayId" sortConfig={sortConfig} requestSort={requestSort}>ID</SortableHeader>
                                    <SortableHeader columnKey="productName" sortConfig={sortConfig} requestSort={requestSort}>Produkt</SortableHeader>
                                    <SortableHeader columnKey="location" sortConfig={sortConfig} requestSort={requestSort}>Lokalizacja</SortableHeader>
                                    <SortableHeader columnKey="typeLabel" sortConfig={sortConfig} requestSort={requestSort}>Typ</SortableHeader>
                                    <SortableHeader columnKey="weight" sortConfig={sortConfig} requestSort={requestSort} className="justify-end">Ilość</SortableHeader>
                                    <SortableHeader columnKey="date" sortConfig={sortConfig} requestSort={requestSort}>Data / Ważność</SortableHeader>
                                    <th className="px-3 py-2 text-left font-medium text-gray-500 dark:text-gray-300">Status</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-secondary-800 divide-y divide-gray-200 dark:divide-secondary-700">
                                {sortedItems.map((item: CombinedItem) => {
                                    const { isBlocked, reason } = getBlockInfo(item.originalItem);
                                    let typeColorClass = '';
                                    if(item.isPackaging) typeColorClass = 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200';
                                    else if(item.isRaw) typeColorClass = 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200';
                                    else typeColorClass = 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200';

                                    return (
                                        <tr key={item.id} onClick={() => handleItemClick(item)} className="hover:bg-gray-50 dark:hover:bg-secondary-700/50 cursor-pointer">
                                            <td className="px-3 py-2 font-mono flex items-center gap-2">
                                                {isBlocked 
                                                    ? <LockClosedIcon className="h-4 w-4 text-red-500 flex-shrink-0" title={reason || 'Zablokowana'} /> 
                                                    : <CheckCircleIcon className="h-4 w-4 text-green-500 flex-shrink-0" title="Dostępna" />
                                                }
                                                {item.displayId}
                                            </td>
                                            <td className="px-3 py-2 font-semibold text-gray-800 dark:text-gray-200">{item.productName}</td>
                                            <td className="px-3 py-2 font-mono">{item.location}</td>
                                            <td className="px-3 py-2">
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${typeColorClass}`}>
                                                    {item.typeLabel}
                                                </span>
                                            </td>
                                            <td className="px-3 py-2 text-right">{item.weight.toFixed(0)} kg</td>
                                            <td className="px-3 py-2 whitespace-nowrap">{formatDate(item.date)}</td>
                                            <td className="px-3 py-2 whitespace-nowrap">
                                                {isBlocked 
                                                    ? <span className="text-red-600 font-semibold">{reason}</span> 
                                                    : (item.isFinishedGood ? getFinishedGoodStatusLabel((item.originalItem as FinishedGoodItem).status) : 'Dostępne')
                                                }
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </>
                )}
            </div>
        </div>
    );
};
