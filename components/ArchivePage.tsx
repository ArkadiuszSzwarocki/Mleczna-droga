import React, { useMemo, useState } from 'react';
import ArchiveBoxIcon from './icons/ArchiveBoxIcon';
import { useAppContext } from './contexts/AppContext';
import { RawMaterialLogEntry, FinishedGoodItem, PackagingMaterialLogEntry, Document } from '../types';
import { VIRTUAL_LOCATION_ARCHIVED } from '../constants';
import { formatDate, getBlockInfo, getActionLabel, getFinishedGoodStatusLabel } from '../src/utils';
import Input from './Input';
import Select from './Select';
import SearchIcon from './icons/SearchIcon';
import SortableHeader from './SortableHeader';
import { useSortableData } from '../src/useSortableData';
import { useUIContext } from './contexts/UIContext';
import ClipboardListIcon from './icons/ClipboardListIcon';
import DocumentTextIcon from './icons/DocumentTextIcon';
import LockClosedIcon from './icons/LockClosedIcon';
import CheckCircleIcon from './icons/CheckCircleIcon';

type ArchivedItem = {
    id: string;
    displayId: string;
    productName: string;
    typeLabel: 'Surowiec' | 'Wyrób Gotowy' | 'Opakowanie';
    archivedAt: string;
    originalItem: RawMaterialLogEntry | FinishedGoodItem | PackagingMaterialLogEntry;
    isBlocked: boolean;
    blockReason?: string;
};

const ArchivePage: React.FC = () => {
    const { rawMaterialsLogList, finishedGoodsList, packagingMaterialsLog, allProducts } = useAppContext();
    const { modalHandlers } = useUIContext();
    const [searchTerm, setSearchTerm] = useState('');
    const [typeFilter, setTypeFilter] = useState<'all' | 'raw' | 'fg' | 'pkg'>('all');
    const [productFilter, setProductFilter] = useState('all');

    const allArchivedItems = useMemo((): ArchivedItem[] => {
        const archived: ArchivedItem[] = [];

        (rawMaterialsLogList || []).forEach(item => {
            if (item.currentLocation === VIRTUAL_LOCATION_ARCHIVED) {
                const { isBlocked, reason } = getBlockInfo(item);
                archived.push({
                    id: item.id,
                    displayId: item.palletData.nrPalety,
                    productName: item.palletData.nazwa,
                    typeLabel: 'Surowiec',
                    archivedAt: item.locationHistory.find(h => h.targetLocation === VIRTUAL_LOCATION_ARCHIVED)?.movedAt || item.lastValidatedAt,
                    originalItem: item,
                    isBlocked,
                    blockReason: reason,
                });
            }
        });

        (finishedGoodsList || []).forEach(item => {
            if (item.currentLocation === VIRTUAL_LOCATION_ARCHIVED || item.status === 'consumed_in_split' || item.status === 'consumed_in_mixing') {
                const { isBlocked, reason } = getBlockInfo(item);
                archived.push({
                    id: item.id,
                    displayId: item.displayId || item.id,
                    productName: item.productName,
                    typeLabel: 'Wyrób Gotowy',
                    archivedAt: item.locationHistory.find(h => h.targetLocation === VIRTUAL_LOCATION_ARCHIVED || h.action.includes('consumed'))?.movedAt || item.producedAt,
                    originalItem: item,
                    isBlocked,
                    blockReason: reason,
                });
            }
        });

        (packagingMaterialsLog || []).forEach(item => {
            if (item.currentLocation === VIRTUAL_LOCATION_ARCHIVED) {
                const { isBlocked, reason } = getBlockInfo(item);
                archived.push({
                    id: item.id,
                    displayId: item.id,
                    productName: item.productName,
                    typeLabel: 'Opakowanie',
                    archivedAt: item.locationHistory.find(h => h.targetLocation === VIRTUAL_LOCATION_ARCHIVED)?.movedAt || item.dateAdded,
                    originalItem: item,
                    isBlocked,
                    blockReason: reason,
                });
            }
        });

        return archived;
    }, [rawMaterialsLogList, finishedGoodsList, packagingMaterialsLog]);

    const filteredItems = useMemo(() => {
        let items = allArchivedItems;

        if (typeFilter !== 'all') {
            items = items.filter(item => {
                if (typeFilter === 'raw' && item.typeLabel === 'Surowiec') return true;
                if (typeFilter === 'fg' && item.typeLabel === 'Wyrób Gotowy') return true;
                if (typeFilter === 'pkg' && item.typeLabel === 'Opakowanie') return true;
                return false;
            });
        }

        if (productFilter !== 'all') {
            items = items.filter(item => item.productName === productFilter);
        }

        if (searchTerm.trim()) {
            const lowerSearch = searchTerm.toLowerCase();
            items = items.filter(item =>
                item.displayId.toLowerCase().includes(lowerSearch) ||
                item.productName.toLowerCase().includes(lowerSearch)
            );
        }

        return items;
    }, [allArchivedItems, typeFilter, productFilter, searchTerm]);

    const { items: sortedItems, requestSort, sortConfig } = useSortableData(filteredItems, { key: 'archivedAt', direction: 'descending' });

    const getTypeColorClass = (type: ArchivedItem['typeLabel']) => {
        switch (type) {
            case 'Surowiec': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200';
            case 'Wyrób Gotowy': return 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200';
            case 'Opakowanie': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const handleRowClick = (item: ArchivedItem) => {
        if (item.typeLabel === 'Surowiec') {
            modalHandlers.openPalletDetailModal(item.originalItem as RawMaterialLogEntry);
        } else if (item.typeLabel === 'Wyrób Gotowy') {
            modalHandlers.openFinishedGoodDetailModal(item.originalItem as FinishedGoodItem);
        } else {
            modalHandlers.openPackagingMaterialDetailModal(item.originalItem as PackagingMaterialLogEntry);
        }
    };

    const getNotes = (item: ArchivedItem): string => {
        const original = item.originalItem;
        const notes: string[] = [];
        let labNotes: string | undefined;

        if ('palletData' in original) {
            labNotes = original.palletData.labAnalysisNotes;
        } else if ('labAnalysisNotes' in original) {
            labNotes = (original as FinishedGoodItem).labAnalysisNotes;
        }

        if (labNotes) {
            notes.push(`Notatki główne:\n${labNotes}`);
        }
        const historyNotes = (original.locationHistory || [])
            .filter(h => h.notes && (h.action.includes('lab') || h.action.includes('block') || h.action.includes('note')))
            .map(h => `[${formatDate(h.movedAt, true)} / ${h.movedBy} / ${getActionLabel(h.action)}]:\n${h.notes}`);
        notes.push(...[...historyNotes].reverse());
        return [...new Set(notes)].join('\n\n---\n\n');
    };

    const getDocuments = (item: ArchivedItem): Document[] => {
        const original = item.originalItem;
        if ('palletData' in original) return (original as RawMaterialLogEntry).palletData.documents || [];
        if ('documents' in original) return (original as FinishedGoodItem).documents || [];
        return [];
    };

    const productOptions = useMemo(() => [
        { value: 'all', label: 'Wszystkie produkty' },
        ...(allProducts || []).map((p: any) => ({ value: p.name, label: p.name }))
    ], [allProducts]);

    return (
        <div className="p-4 md:p-6 bg-white dark:bg-secondary-800 shadow-xl rounded-lg h-full flex flex-col">
            <header className="flex-shrink-0 flex items-center mb-4 border-b dark:border-secondary-600 pb-3">
                <ArchiveBoxIcon className="h-8 w-8 text-primary-600 dark:text-primary-400 mr-3" />
                <h2 className="text-2xl font-semibold text-primary-700 dark:text-primary-300">Archiwum Materiałów</h2>
            </header>

            <details className="flex-shrink-0 bg-slate-50 dark:bg-secondary-900 border dark:border-secondary-700 rounded-lg p-4 mb-4" open>
                <summary className="font-semibold text-lg text-gray-700 dark:text-gray-200 cursor-pointer flex items-center gap-2">
                    <SearchIcon className="h-5 w-5"/> Filtry
                </summary>
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <Select
                        label="Filtruj po typie"
                        options={[
                            { value: 'all', label: 'Wszystkie' },
                            { value: 'raw', label: 'Surowce' },
                            { value: 'fg', label: 'Wyroby Gotowe' },
                            { value: 'pkg', label: 'Opakowania' },
                        ]}
                        value={typeFilter}
                        onChange={e => setTypeFilter(e.target.value as 'all' | 'raw' | 'fg' | 'pkg')}
                    />
                    <Select
                        label="Filtruj po produkcie"
                        options={productOptions}
                        value={productFilter}
                        onChange={e => setProductFilter(e.target.value)}
                    />
                    <Input
                        label="Szukaj ID / nazwy"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        icon={<SearchIcon className="h-5 w-5 text-gray-400" />}
                    />
                </div>
            </details>
            
            <div className="flex-grow overflow-auto">
                {sortedItems.length === 0 ? (
                    <div className="text-center py-10">
                        <ArchiveBoxIcon className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-2"/>
                        <p className="text-gray-500 dark:text-gray-400">Brak zarchiwizowanych pozycji spełniających kryteria.</p>
                    </div>
                ) : (
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-secondary-700 text-sm">
                        <thead className="bg-gray-100 dark:bg-secondary-700 sticky top-0">
                            <tr>
                                <SortableHeader columnKey="displayId" sortConfig={sortConfig} requestSort={requestSort}>ID</SortableHeader>
                                <SortableHeader columnKey="productName" sortConfig={sortConfig} requestSort={requestSort}>Produkt</SortableHeader>
                                <SortableHeader columnKey="typeLabel" sortConfig={sortConfig} requestSort={requestSort}>Typ</SortableHeader>
                                <SortableHeader columnKey="archivedAt" sortConfig={sortConfig} requestSort={requestSort}>Data Archiwizacji</SortableHeader>
                                <th className="px-3 py-2 text-left font-medium text-gray-500 dark:text-gray-300">Status</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-secondary-800 divide-y divide-gray-200 dark:divide-secondary-700">
                            {sortedItems.map(item => {
                                const allLabNotesText = getNotes(item);
                                const hasNotes = allLabNotesText.trim().length > 0;
                                const documents = getDocuments(item);
                                const hasDocuments = documents.length > 0;
                                
                                // Logic for default status label
                                const defaultStatusLabel = item.typeLabel === 'Wyrób Gotowy' ? 'Wydana' : 'Zużyta';
                                
                                return (
                                    <tr key={item.id} onClick={() => handleRowClick(item)} className="hover:bg-gray-50 dark:hover:bg-secondary-700/50 cursor-pointer">
                                        <td className="px-3 py-2 whitespace-nowrap font-mono">
                                             <div className="flex items-center gap-2">
                                                {item.isBlocked 
                                                    ? <LockClosedIcon className="h-4 w-4 text-red-500 flex-shrink-0" title={item.blockReason || 'Zablokowana'} /> 
                                                    : <CheckCircleIcon className="h-4 w-4 text-green-500 flex-shrink-0" title="Dostępna" />
                                                }
                                                <span>{item.displayId}</span>
                                                {hasNotes && (
                                                    <button onClick={(e) => { e.stopPropagation(); modalHandlers.openTextDisplayModal(`Notatki dla ${item.displayId}`, allLabNotesText); }} className="text-gray-400 hover:text-primary-500" title="Zobacz notatki"><ClipboardListIcon className="h-4 w-4"/></button>
                                                )}
                                                {hasDocuments && (
                                                    <button onClick={(e) => { e.stopPropagation(); modalHandlers.openDocumentListModal(`Dokumenty dla ${item.displayId}`, documents); }} className="text-gray-400 hover:text-primary-500" title="Zobacz dokumenty"><DocumentTextIcon className="h-4 w-4"/></button>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-3 py-2 font-semibold">{item.productName}</td>
                                        <td className="px-3 py-2">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getTypeColorClass(item.typeLabel)}`}>
                                                {item.typeLabel}
                                            </span>
                                        </td>
                                        <td className="px-3 py-2 whitespace-nowrap">{formatDate(item.archivedAt, true)}</td>
                                        <td className={`px-3 py-2 font-semibold ${item.isBlocked ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-300'}`}>
                                            {item.isBlocked ? item.blockReason : defaultStatusLabel}
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default ArchivePage;