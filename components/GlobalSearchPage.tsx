
import React, { useState, useMemo, useCallback } from 'react';
// FIX: Removed file extensions from all imports to fix module resolution errors.
import { useUIContext } from './contexts/UIContext';
// FIX: Add missing import for useAppContext.
import { useAppContext } from './contexts/AppContext';
import { CombinedSearchResult, RawMaterialLogEntry, FinishedGoodItem, PackagingMaterialLogEntry, Document } from '../types';
import { useSortableData } from '../src/useSortableData';
import SortableHeader from './SortableHeader';
import { formatDate, getFinishedGoodStatusLabel, getActionLabel } from '../src/utils';
// FIX: Remove .tsx extension from icon import to fix module resolution error.
import SearchIcon from './icons/SearchIcon';
import CheckCircleIcon from './icons/CheckCircleIcon';
import LockClosedIcon from './icons/LockClosedIcon';
import ClipboardIcon from './icons/ClipboardIcon';
import Input from './Input';
import ClipboardListIcon from './icons/ClipboardListIcon';
import DocumentTextIcon from './icons/DocumentTextIcon';

interface CombinedSearchResultWithPackaging extends CombinedSearchResult {
    isPackaging?: boolean;
    quantity?: number;
    unit?: string;
}

const SearchResultCard: React.FC<{
    item: CombinedSearchResultWithPackaging;
    onClick: () => void;
    getNotes: (item: CombinedSearchResultWithPackaging) => string;
    getDocuments: (item: CombinedSearchResultWithPackaging) => Document[];
}> = ({ item, onClick, getNotes, getDocuments }) => {
    const { modalHandlers } = useUIContext();
    
    let typeLabel = '';
    let typeBadge = null;

    if (item.isPackaging) {
        const pkg = item.originalItem as PackagingMaterialLogEntry;
        const isPcs = pkg.packageForm === 'packaging_pcs' || (pkg.productName.toLowerCase().includes('worek') && !pkg.productName.toLowerCase().includes('folia'));
        typeLabel = isPcs ? 'Opakowanie (szt.)' : 'Opakowanie (kg)';
        typeBadge = <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200 text-xs font-bold border border-purple-200 dark:border-purple-800" title={typeLabel}>O</span>;
    } else if (item.isRaw) {
        typeLabel = 'Surowiec';
        typeBadge = <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200 text-xs font-bold border border-yellow-200 dark:border-yellow-800" title={typeLabel}>S</span>;
    } else {
        typeLabel = 'Wyrób Gotowy';
        typeBadge = <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200 text-xs font-bold border border-green-200 dark:border-green-800" title={typeLabel}>W</span>;
    }

    const allLabNotesText = getNotes(item);
    const hasNotes = allLabNotesText.trim().length > 0;
    const documents = getDocuments(item);
    const hasDocuments = documents.length > 0;

    return (
        <div onClick={onClick} className="p-3 bg-white dark:bg-secondary-800 rounded-lg shadow cursor-pointer border-l-4 border-primary-500">
            <div className="flex justify-between items-start">
                <div className="flex-grow min-w-0 pr-2">
                    <div className="font-mono font-bold text-primary-600 dark:text-primary-400 truncate flex items-center gap-1" title={item.displayId}>
                        <span className="truncate">{item.displayId}</span>
                         {hasNotes && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    modalHandlers.openTextDisplayModal(`Notatki dla ${item.displayId}`, allLabNotesText);
                                }}
                                className="text-gray-400 hover:text-primary-500 flex-shrink-0"
                                title="Zobacz notatki"
                            >
                                <ClipboardListIcon className="h-4 w-4" />
                            </button>
                        )}
                        {hasDocuments && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    modalHandlers.openDocumentListModal(`Dokumenty dla ${item.displayId}`, documents);
                                }}
                                className="text-gray-400 hover:text-primary-500 flex-shrink-0"
                                title="Zobacz dokumenty"
                            >
                                <DocumentTextIcon className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                        {typeBadge}
                        <p className="font-semibold text-gray-800 dark:text-gray-200 truncate" title={item.name}>{item.name}</p>
                    </div>
                </div>
                <div className="flex-shrink-0 ml-2">
                    {item.isBlocked ? (
                        <LockClosedIcon className="h-6 w-6 text-red-500" title={item.blockReason} />
                    ) : (
                        <CheckCircleIcon className="h-6 w-6 text-green-500" title={item.status} />
                    )}
                </div>
            </div>
            <div className="mt-2 pt-2 border-t border-gray-200 dark:border-secondary-700 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Ilość / Waga</p>
                    <p className="text-gray-900 dark:text-gray-100 font-semibold">{item.quantity?.toFixed(2)} {item.unit}</p>
                </div>
                <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Lokalizacja</p>
                    <p className="font-mono text-gray-900 dark:text-gray-100 truncate" title={item.location || 'Brak'}>{item.location || 'Brak'}</p>
                </div>
                <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Data Ważności / Dodania</p>
                    <p className="text-gray-900 dark:text-gray-100">{formatDate(item.date, item.isPackaging)}</p>
                </div>
            </div>
        </div>
    );
};


export const GlobalSearchPage: React.FC = () => {
    const { globalSearchTerm, setGlobalSearchTerm, modalHandlers, globalSearchResults } = useUIContext();
    const [copiedId, setCopiedId] = useState<string | null>(null);

    const { items: sortedItems, requestSort, sortConfig } = useSortableData<any>(globalSearchResults || [], { key: 'date', direction: 'descending' });

    const getNotes = useCallback((item: CombinedSearchResultWithPackaging): string => {
        if (!item || !item.originalItem || item.isPackaging) return '';
        
        const originalItem = item.originalItem as RawMaterialLogEntry | FinishedGoodItem;
        const notes: string[] = [];

        const labNotes = 'palletData' in originalItem 
            ? originalItem.palletData.labAnalysisNotes 
            : originalItem.labAnalysisNotes;

        if (labNotes) {
            notes.push(`Notatki główne:\n${labNotes}`);
        }

        const historyNotes = (originalItem.locationHistory || [])
            .filter(h => h.notes && (h.action.includes('lab') || h.action.includes('block') || h.action.includes('note')))
            .map(h => `[${formatDate(h.movedAt, true)} / ${h.movedBy} / ${getActionLabel(h.action)}]:\n${h.notes}`);
        
        notes.push(...[...historyNotes].reverse());
        return [...new Set(notes)].join('\n\n---\n\n');
    }, []);

    const getDocuments = useCallback((item: CombinedSearchResultWithPackaging): Document[] => {
        if (!item || !item.originalItem || item.isPackaging) return [];
        
        if ('palletData' in item.originalItem) {
            return (item.originalItem as RawMaterialLogEntry).palletData.documents || [];
        }
        return (item.originalItem as FinishedGoodItem).documents || [];
    }, []);

    const handleRowClick = (item: CombinedSearchResultWithPackaging) => {
        if (item.isPackaging) {
            modalHandlers.openPackagingMaterialDetailModal(item.originalItem as PackagingMaterialLogEntry)
        } else if (item.isRaw) {
            modalHandlers.openPalletDetailModal(item.originalItem as RawMaterialLogEntry);
        } else {
            modalHandlers.openFinishedGoodDetailModal(item.originalItem as FinishedGoodItem);
        }
    };

    // Helper to enrich search results with quantity/weight info for display
    const enrichedItems = useMemo(() => {
        return sortedItems.map(item => {
            let quantity = 0;
            let unit = 'kg';

            if (item.isPackaging) {
                const pkg = item.originalItem as PackagingMaterialLogEntry;
                const isPcs = pkg.packageForm === 'packaging_pcs' || (pkg.productName.toLowerCase().includes('worek') && !pkg.productName.toLowerCase().includes('folia'));
                quantity = pkg.currentWeight;
                unit = isPcs ? 'szt.' : 'kg';
            } else if (item.isRaw) {
                // Defensive check to prevent crash on malformed data
                if ((item.originalItem as RawMaterialLogEntry).palletData) {
                    quantity = (item.originalItem as RawMaterialLogEntry).palletData.currentWeight;
                }
            } else { // Finished Good
                quantity = (item.originalItem as FinishedGoodItem).quantityKg;
            }
            return { ...item, quantity, unit };
        });
    }, [sortedItems]);

    return (
        <div className="p-4 md:p-6 bg-white dark:bg-secondary-800 shadow-xl rounded-lg h-full flex flex-col">
            <header className="flex-shrink-0 flex flex-col gap-4 mb-4 border-b dark:border-secondary-600 pb-3">
                <div className="flex items-center">
                    <SearchIcon className="h-8 w-8 text-primary-600 dark:text-primary-400 mr-3" />
                    <h2 className="text-2xl font-semibold text-primary-700 dark:text-primary-300">Wyszukiwanie globalne</h2>
                </div>
                <Input
                    id="global-search-page-input"
                    label=""
                    placeholder="Wpisz ID palety, nazwę produktu, lokalizację..."
                    value={globalSearchTerm}
                    onChange={(e) => setGlobalSearchTerm(e.target.value)}
                    icon={<SearchIcon className="h-5 w-5 text-gray-400" />}
                    autoFocus
                    className="w-full text-lg"
                />
            </header>

            <div className="flex-grow overflow-auto scrollbar-hide">
                {globalSearchTerm.trim() === '' ? (
                     <div className="text-center text-gray-500 dark:text-gray-400 pt-16">
                        <SearchIcon className="h-16 w-16 mx-auto text-gray-300 dark:text-gray-600"/>
                        <p className="mt-4">Zacznij pisać, aby wyszukać palety surowców, wyrobów gotowych i opakowań.</p>
                    </div>
                ) : (
                <>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">Znaleziono {enrichedItems.length} wyników dla: "{globalSearchTerm}"</p>
                
                {/* Card view for mobile/tablet */}
                <div className="lg:hidden space-y-3">
                    {enrichedItems.map(item => (
                        <SearchResultCard key={`${item.id}-${item.isRaw}`} item={item} onClick={() => handleRowClick(item)} getNotes={getNotes} getDocuments={getDocuments} />
                    ))}
                </div>

                {/* Table view for desktop */}
                <div className="hidden lg:block">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-secondary-700 text-sm table-fixed">
                        <thead className="bg-gray-100 dark:bg-secondary-700">
                            <tr>
                                <SortableHeader columnKey="displayId" sortConfig={sortConfig} requestSort={requestSort} thClassName="px-3 py-2 text-left font-semibold text-gray-600 dark:text-gray-300 w-[18%]">ID Palety</SortableHeader>
                                <SortableHeader columnKey="name" sortConfig={sortConfig} requestSort={requestSort} thClassName="px-3 py-2 text-left font-semibold text-gray-600 dark:text-gray-300 w-[32%]">Nazwa</SortableHeader>
                                <SortableHeader columnKey="location" sortConfig={sortConfig} requestSort={requestSort} thClassName="px-3 py-2 text-center font-semibold text-gray-600 dark:text-gray-300 w-[15%]">Lok.</SortableHeader>
                                <th className="px-3 py-2 text-right font-semibold text-gray-600 dark:text-gray-300 w-[10%]">Ilość</th>
                                <SortableHeader columnKey="date" sortConfig={sortConfig} requestSort={requestSort} thClassName="px-3 py-2 text-center font-semibold text-gray-600 dark:text-gray-300 w-[10%]">Data</SortableHeader>
                                <SortableHeader columnKey="status" sortConfig={sortConfig} requestSort={requestSort} thClassName="px-3 py-2 text-left font-semibold text-gray-600 dark:text-gray-300 w-[15%]">Status</SortableHeader>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-secondary-800 divide-y divide-gray-200 dark:divide-secondary-700">
                            {enrichedItems.map(item => {
                                const allLabNotesText = getNotes(item);
                                const hasNotes = allLabNotesText.trim().length > 0;
                                const documents = getDocuments(item);
                                const hasDocuments = documents.length > 0;

                                return (
                                <tr key={`${item.id}-${item.isRaw}`} onClick={() => handleRowClick(item)} className="hover:bg-primary-50 dark:hover:bg-secondary-700/50 cursor-pointer">
                                    <td className="px-3 py-2 whitespace-normal break-all font-mono text-xs">
                                        <div className="flex items-center gap-2 group">
                                            <span className="text-primary-600 dark:text-primary-400">{item.displayId}</span>
                                             {hasNotes && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); modalHandlers.openTextDisplayModal(`Notatki dla ${item.displayId}`, allLabNotesText); }}
                                                    className="text-gray-400 hover:text-primary-500"
                                                    title="Zobacz notatki"
                                                >
                                                    <ClipboardListIcon className="h-4 w-4" />
                                                </button>
                                            )}
                                            {hasDocuments && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); modalHandlers.openDocumentListModal(`Dokumenty dla ${item.displayId}`, documents); }}
                                                    className="text-gray-400 hover:text-primary-500"
                                                    title="Zobacz dokumenty"
                                                >
                                                    <DocumentTextIcon className="h-4 w-4" />
                                                </button>
                                            )}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    navigator.clipboard.writeText(item.displayId);
                                                    setCopiedId(item.displayId);
                                                    setTimeout(() => setCopiedId(null), 2000);
                                                }}
                                                title={copiedId === item.displayId ? "Skopiowano!" : "Kopiuj ID"}
                                                className="p-1 rounded-full opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                                            >
                                                {copiedId === item.displayId ? (
                                                    <CheckCircleIcon className="h-4 w-4 text-green-500" />
                                                ) : (
                                                    <ClipboardIcon className="h-4 w-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200" />
                                                )}
                                            </button>
                                        </div>
                                    </td>
                                    <td className="px-3 py-2">
                                        <div className="flex items-center gap-2">
                                            {item.isPackaging ? (
                                                <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200 text-xs font-bold border border-purple-200 dark:border-purple-800" title="Opakowanie">O</span>
                                            ) : item.isRaw ? (
                                                <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200 text-xs font-bold border border-yellow-200 dark:border-yellow-800" title="Surowiec">S</span>
                                            ) : (
                                                <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200 text-xs font-bold border border-green-200 dark:border-green-800" title="Wyrób Gotowy">W</span>
                                            )}
                                            <span className="font-medium text-gray-900 dark:text-gray-200 truncate" title={item.name}>
                                                {item.name}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-3 py-2 font-mono text-xs text-gray-900 dark:text-gray-200 truncate text-center" title={item.location}>{item.location}</td>
                                    <td className="px-3 py-2 text-right font-semibold text-gray-900 dark:text-gray-200">
                                        {item.quantity?.toFixed(2)} <span className="text-xs font-normal text-gray-500">{item.unit}</span>
                                    </td>
                                    <td className="px-3 py-2 whitespace-nowrap text-gray-900 dark:text-gray-200 text-xs text-center">{formatDate(item.date, (item as CombinedSearchResultWithPackaging).isPackaging)}</td>
                                    <td className="px-3 py-2 whitespace-nowrap text-gray-900 dark:text-gray-200 text-xs">
                                        {item.isBlocked ? (
                                            <div className="flex items-center" title={item.blockReason}>
                                                <LockClosedIcon className="h-4 w-4 text-red-500 mr-1" />
                                                <span className="text-red-600 dark:text-red-400 font-semibold truncate max-w-[100px]">{item.blockReason || 'Zablokowana'}</span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center">
                                                <CheckCircleIcon className="h-4 w-4 text-green-500 mr-1" />
                                                <span>{item.isRaw ? 'Dostępny' : getFinishedGoodStatusLabel(item.status as any)}</span>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            )})}
                        </tbody>
                    </table>
                </div>
                </>
                )}
            </div>
        </div>
    );
};

// FIX: Added missing default export to support lazy loading.
export default GlobalSearchPage;
