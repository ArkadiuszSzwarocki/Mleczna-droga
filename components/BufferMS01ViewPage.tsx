
import React, { useMemo, useState } from 'react';
import { RawMaterialLogEntry, View, Document, FinishedGoodItem } from '../types';
import { useWarehouseContext } from './contexts/WarehouseContext';
import { useUIContext } from './contexts/UIContext';
import { BUFFER_MS01_ID } from '../constants';
import PalletTile from './PalletTile';
import Input from './Input';
import SearchIcon from './icons/SearchIcon';
import WarehouseIcon from './icons/WarehouseIcon';
import { useSortableData } from '../src/useSortableData';
import SortableHeader from './SortableHeader';
import { formatDate, getActionLabel, getBlockInfo } from '../src/utils';
import LockClosedIcon from './icons/LockClosedIcon';
import CheckCircleIcon from './icons/CheckCircleIcon';
import ClipboardListIcon from './icons/ClipboardListIcon';
import DocumentTextIcon from './icons/DocumentTextIcon';

const BufferMS01ViewPage: React.FC = () => {
    const { rawMaterialsLogList } = useWarehouseContext();
    const { modalHandlers } = useUIContext();
    const [searchTerm, setSearchTerm] = useState('');

    const itemsInLocation = useMemo(() =>
        (rawMaterialsLogList || []).filter(item => item.currentLocation === BUFFER_MS01_ID),
        [rawMaterialsLogList]
    );

    const filteredItems = useMemo(() => {
        if (!searchTerm.trim()) return itemsInLocation;
        const lowerSearch = searchTerm.toLowerCase();
        return itemsInLocation.filter(item =>
            item.palletData.nrPalety.toLowerCase().includes(lowerSearch) ||
            item.palletData.nazwa.toLowerCase().includes(lowerSearch)
        );
    }, [itemsInLocation, searchTerm]);

    const { items: sortedItems, requestSort, sortConfig } = useSortableData<RawMaterialLogEntry>(filteredItems, { key: 'dateAdded', direction: 'descending' });
    
    const getNotes = (item: any): string => {
        if (!item) return '';
        const isRaw = 'palletData' in item;
        const notes: string[] = [];
        const labNotes = isRaw ? item.palletData.labAnalysisNotes : item.labAnalysisNotes;
        if (labNotes) {
            notes.push(`Notatki główne:\n${labNotes}`);
        }
        const historyNotes = (item.locationHistory || [])
            .filter((h: any) => h.notes && (h.action.includes('lab') || h.action.includes('block') || h.action.includes('note')))
            .map((h: any) => `[${formatDate(h.movedAt, true)} / ${h.movedBy} / ${getActionLabel(h.action)}]:\n${h.notes}`);
        notes.push(...[...historyNotes].reverse());
        return [...new Set(notes)].join('\n\n---\n\n');
    };

    const getDocuments = (item: any): Document[] => {
        if (!item) return [];
        if ('palletData' in item) {
            return (item as RawMaterialLogEntry).palletData.documents || [];
        }
        return (item as FinishedGoodItem).documents || [];
    };

    return (
        <div className="bg-white dark:bg-secondary-800 shadow-xl rounded-lg h-full flex flex-col">
            <header className="p-4 md:px-6 py-3 flex-shrink-0 border-b dark:border-secondary-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                 <h2 className="text-xl md:text-2xl font-semibold text-primary-700 dark:text-primary-300 whitespace-nowrap">
                    Bufor Surowców ({BUFFER_MS01_ID})
                </h2>
                <div className="w-full sm:w-auto sm:max-w-xs">
                    <Input
                        label=""
                        id="buffer-ms01-search"
                        placeholder="Szukaj palet..."
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
                        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">Bufor jest pusty</h3>
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:hidden">
                            {sortedItems.map((item) => (
                                <PalletTile
                                    key={item.id}
                                    item={item}
                                    onClick={() => modalHandlers.openPalletDetailModal(item)}
                                />
                            ))}
                        </div>
                        
                        <table className="min-w-full text-sm hidden md:table">
                            <thead className="bg-gray-100 dark:bg-secondary-700">
                                <tr>
                                    <SortableHeader columnKey="palletData.nrPalety" sortConfig={sortConfig} requestSort={requestSort}>ID Palety</SortableHeader>
                                    <SortableHeader columnKey="palletData.nazwa" sortConfig={sortConfig} requestSort={requestSort}>Produkt</SortableHeader>
                                    <SortableHeader columnKey="currentLocation" sortConfig={sortConfig} requestSort={requestSort}>Lokalizacja</SortableHeader>
                                    <SortableHeader columnKey="palletData.currentWeight" sortConfig={sortConfig} requestSort={requestSort} className="justify-end">Waga</SortableHeader>
                                    <SortableHeader columnKey="palletData.dataPrzydatnosci" sortConfig={sortConfig} requestSort={requestSort}>Ważność</SortableHeader>
                                    <th className="px-3 py-2 text-left font-medium text-gray-500 dark:text-gray-300">Status</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-secondary-800 divide-y divide-gray-200 dark:divide-secondary-700">
                                {sortedItems.map((item) => {
                                    const allLabNotesText = getNotes(item);
                                    const hasNotes = allLabNotesText.trim().length > 0;
                                    const documents = getDocuments(item);
                                    const hasDocuments = documents.length > 0;
                                    const { isBlocked, reason } = getBlockInfo(item);

                                    return (
                                        <tr key={item.id} onClick={() => modalHandlers.openPalletDetailModal(item)} className="hover:bg-gray-50 dark:hover:bg-secondary-700/50 cursor-pointer">
                                            <td className="px-3 py-2 whitespace-nowrap font-mono">
                                                <div className="flex items-center gap-2">
                                                     {isBlocked 
                                                        ? <LockClosedIcon className="h-4 w-4 text-red-500 flex-shrink-0" title={reason || 'Zablokowana'} /> 
                                                        : <CheckCircleIcon className="h-4 w-4 text-green-500 flex-shrink-0" title="Dostępna" />
                                                    }
                                                    {item.palletData.nrPalety}
                                                    {hasNotes && (
                                                        <button onClick={(e) => { e.stopPropagation(); modalHandlers.openTextDisplayModal(`Notatki dla ${item.palletData.nrPalety}`, allLabNotesText); }} className="text-gray-400 hover:text-primary-500" title="Zobacz notatki"><ClipboardListIcon className="h-4 w-4"/></button>
                                                    )}
                                                    {hasDocuments && (
                                                        <button onClick={(e) => { e.stopPropagation(); modalHandlers.openDocumentListModal(`Dokumenty dla ${item.palletData.nrPalety}`, documents); }} className="text-gray-400 hover:text-primary-500" title="Zobacz dokumenty"><DocumentTextIcon className="h-4 w-4"/></button>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-3 py-2">{item.palletData.nazwa}</td>
                                            <td className="px-3 py-2 font-mono">{item.currentLocation}</td>
                                            <td className="px-3 py-2 text-right">{item.palletData.currentWeight.toFixed(0)} kg</td>
                                            <td className="px-3 py-2 whitespace-nowrap">{formatDate(item.palletData.dataPrzydatnosci)}</td>
                                            <td className="px-3 py-2 whitespace-nowrap">{isBlocked ? <span className="text-red-600 font-semibold">{reason}</span> : 'Dostępna'}</td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </>
                )}
            </div>
        </div>
    );
};

export default BufferMS01ViewPage;
