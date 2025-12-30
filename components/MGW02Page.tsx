
import React, { useMemo, useState } from 'react';
import { useProductionContext } from './contexts/ProductionContext';
import { useUIContext } from './contexts/UIContext';
import { MGW02_WAREHOUSE_ID } from '../constants';
import { FinishedGoodItem, Document } from '../types';
import PalletTile from './PalletTile';
import Input from './Input';
import SearchIcon from './icons/SearchIcon';
import WarehouseIcon from './icons/WarehouseIcon';
import { useSortableData } from '../src/useSortableData';
import SortableHeader from './SortableHeader';
import { formatDate, getActionLabel, getBlockInfo, getFinishedGoodStatusLabel } from '../src/utils';
import ClipboardListIcon from './icons/ClipboardListIcon';
import DocumentTextIcon from './icons/DocumentTextIcon';
import LockClosedIcon from './icons/LockClosedIcon';
import CheckCircleIcon from './icons/CheckCircleIcon';

export const MGW02Page: React.FC = () => {
    const { finishedGoodsList } = useProductionContext();
    const { modalHandlers } = useUIContext();
    const [searchTerm, setSearchTerm] = useState('');

    const itemsInLocation = useMemo(() =>
        (finishedGoodsList || []).filter((item: FinishedGoodItem) => item.currentLocation === MGW02_WAREHOUSE_ID),
        [finishedGoodsList]
    );

    const filteredItems = useMemo(() => {
        if (!searchTerm.trim()) return itemsInLocation;
        const lowerSearch = searchTerm.toLowerCase();
        return itemsInLocation.filter((item: FinishedGoodItem) =>
            (item.displayId || item.id).toLowerCase().includes(lowerSearch) ||
            item.productName.toLowerCase().includes(lowerSearch)
        );
    }, [itemsInLocation, searchTerm]);

    const { items: sortedItems, requestSort, sortConfig } = useSortableData(filteredItems, { key: 'productionDate', direction: 'descending' });

    const getNotes = (item: FinishedGoodItem): string => {
        if (!item) return '';
        const notes: string[] = [];
        if (item.labAnalysisNotes) {
            notes.push(`Notatki główne:\n${item.labAnalysisNotes}`);
        }
        const historyNotes = (item.locationHistory || [])
            .filter(h => h.notes && (h.action.includes('lab') || h.action.includes('block') || h.action.includes('note')))
            .map(h => `[${formatDate(h.movedAt, true)} / ${h.movedBy} / ${getActionLabel(h.action)}]:\n${h.notes}`);
        notes.push(...[...historyNotes].reverse());
        return [...new Set(notes)].join('\n\n---\n\n');
    };
    
    const getDocuments = (item: FinishedGoodItem): Document[] => {
        if (!item) return [];
        return item.documents || [];
    };

    return (
        <div className="bg-white dark:bg-secondary-800 shadow-xl rounded-lg h-full flex flex-col">
            <header className="p-4 md:px-6 py-3 flex-shrink-0 border-b dark:border-secondary-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                 <h2 className="text-2xl font-semibold text-primary-700 dark:text-primary-300 whitespace-nowrap">
                    Magazyn Wyrobów Gotowych ({MGW02_WAREHOUSE_ID})
                </h2>
                <div className="w-full sm:w-auto sm:max-w-xs">
                    <Input
                        label=""
                        id="mgw02-search"
                        placeholder={`Szukaj w magazynie ${MGW02_WAREHOUSE_ID}...`}
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        icon={<SearchIcon className="h-5 w-5 text-gray-400" />}
                    />
                </div>
            </header>

            <div className="flex-grow overflow-auto scrollbar-hide p-4">
                {sortedItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 dark:text-gray-400">
                        <WarehouseIcon className="h-16 w-16 text-gray-300 dark:text-gray-600 mb-4" />
                        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">Magazyn {MGW02_WAREHOUSE_ID} jest pusty</h3>
                    </div>
                ) : (
                    <>
                        {/* Mobile View */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 md:hidden">
                            {sortedItems.map((item: FinishedGoodItem) => (
                                <PalletTile
                                    key={item.id}
                                    item={item}
                                    onClick={() => modalHandlers.openFinishedGoodDetailModal(item)}
                                />
                            ))}
                        </div>

                        {/* Desktop View */}
                        <table className="min-w-full text-sm hidden md:table">
                            <thead className="bg-gray-100 dark:bg-secondary-700">
                                <tr>
                                    <SortableHeader columnKey="displayId" sortConfig={sortConfig} requestSort={requestSort}>ID Palety</SortableHeader>
                                    <SortableHeader columnKey="productName" sortConfig={sortConfig} requestSort={requestSort}>Produkt</SortableHeader>
                                    <SortableHeader columnKey="currentLocation" sortConfig={sortConfig} requestSort={requestSort}>Lokalizacja</SortableHeader>
                                    <th className="px-3 py-2 text-left font-medium text-gray-500 dark:text-gray-300">Typ</th>
                                    <SortableHeader columnKey="quantityKg" sortConfig={sortConfig} requestSort={requestSort} className="justify-end">Waga</SortableHeader>
                                    <SortableHeader columnKey="expiryDate" sortConfig={sortConfig} requestSort={requestSort}>Ważność</SortableHeader>
                                    <th className="px-3 py-2 text-left font-medium text-gray-500 dark:text-gray-300">Status</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-secondary-800 divide-y divide-gray-200 dark:divide-secondary-700">
                                {sortedItems.map((item: FinishedGoodItem) => {
                                    const allLabNotesText = getNotes(item);
                                    const hasNotes = allLabNotesText.trim().length > 0;
                                    const documents = getDocuments(item);
                                    const hasDocuments = documents.length > 0;
                                    const { isBlocked, reason } = getBlockInfo(item);

                                    return (
                                        <tr key={item.id} onClick={() => modalHandlers.openFinishedGoodDetailModal(item)} className="hover:bg-gray-50 dark:hover:bg-secondary-700/50 cursor-pointer">
                                            <td className="px-3 py-2 whitespace-nowrap font-mono">
                                                <div className="flex items-center gap-2">
                                                    {isBlocked 
                                                        ? <LockClosedIcon className="h-4 w-4 text-red-500 flex-shrink-0" title={reason || 'Zablokowana'} /> 
                                                        : <CheckCircleIcon className="h-4 w-4 text-green-500 flex-shrink-0" title="Dostępna" />
                                                    }
                                                    {item.displayId}
                                                    {hasNotes && (
                                                        <button onClick={(e) => { e.stopPropagation(); modalHandlers.openTextDisplayModal(`Notatki dla ${item.displayId}`, allLabNotesText); }} className="text-gray-400 hover:text-primary-500" title="Zobacz notatki"><ClipboardListIcon className="h-4 w-4"/></button>
                                                    )}
                                                    {hasDocuments && (
                                                        <button onClick={(e) => { e.stopPropagation(); modalHandlers.openDocumentListModal(`Dokumenty dla ${item.displayId}`, documents); }} className="text-gray-400 hover:text-primary-500" title="Zobacz dokumenty"><DocumentTextIcon className="h-4 w-4"/></button>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-3 py-2">{item.productName}</td>
                                            <td className="px-3 py-2 font-mono">{item.currentLocation}</td>
                                            <td className="px-3 py-2">
                                                 <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200">
                                                    Wyrób Gotowy
                                                </span>
                                            </td>
                                            <td className="px-3 py-2 text-right">{item.quantityKg.toFixed(0)} kg</td>
                                            <td className="px-3 py-2 whitespace-nowrap">{formatDate(item.expiryDate)}</td>
                                            <td className="px-3 py-2 whitespace-nowrap">
                                                {isBlocked 
                                                    ? <span className="text-red-600 font-semibold">{reason}</span> 
                                                    : getFinishedGoodStatusLabel(item.status)
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
