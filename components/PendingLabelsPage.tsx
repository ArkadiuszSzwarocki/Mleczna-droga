import React, { useMemo, useState, useEffect } from 'react';
import { FinishedGoodItem, User, PalletData, Document } from '../types';
import { useAppContext } from './contexts/AppContext';
// FIX: Corrected import path for WarehouseContext to be relative.
import { useWarehouseContext } from './contexts/WarehouseContext';
// FIX: Added missing import for useProductionContext.
import { useProductionContext } from './contexts/ProductionContext';
import Button from './Button';
import Input from './Input';
// FIX: Remove .tsx extension from icon import to fix module resolution error.
import SearchIcon from './icons/SearchIcon';
import { formatDate, getActionLabel } from '../src/utils';
import { useSortableData } from '../src/useSortableData';
import SortableHeader from './SortableHeader';
import TagIcon from './icons/TagIcon';
import PrintLabelIcon from './icons/PrintLabelIcon';
import ClipboardIcon from './icons/ClipboardIcon';
import CheckCircleIcon from './icons/CheckCircleIcon';
import { useAuth } from './contexts/AuthContext';
import ClipboardListIcon from './icons/ClipboardListIcon';
import DocumentTextIcon from './icons/DocumentTextIcon';
// FIX: Add missing import for useUIContext.
import { useUIContext } from './contexts/UIContext';


const PendingLabelsPage: React.FC = () => {
    const { modalHandlers, showToast } = useUIContext();
    const { finishedGoodsList, handleConfirmFinishedGoodLabeling } = useProductionContext();
    const { currentUser } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');
    const [copiedId, setCopiedId] = useState<string | null>(null);

    const pendingItems = useMemo(() =>
        (finishedGoodsList || []).filter((item: FinishedGoodItem) => item.status === 'pending_label'),
        [finishedGoodsList]
    );

    const filteredItems = useMemo(() => {
        if (!searchTerm.trim()) return pendingItems;
        const lowerSearch = searchTerm.toLowerCase();
        return pendingItems.filter((item: FinishedGoodItem) =>
            (item.displayId || item.id).toLowerCase().includes(lowerSearch) ||
            item.productName.toLowerCase().includes(lowerSearch)
        );
    }, [pendingItems, searchTerm]);

    const { items: sortedItems, requestSort, sortConfig } = useSortableData(filteredItems, { key: 'producedAt', direction: 'descending' });

    const handlePrintLabel = (item: FinishedGoodItem) => {
        modalHandlers.openNetworkPrintModal({
            type: 'finished_good',
            data: item,
            context: 'pending_label',
            onSuccess: () => {
                showToast(`Wysłano etykietę ${item.displayId} do druku.`, 'success');
                // The confirmation logic will be handled separately by the user
            }
        });
    };
    
    const handleConfirmLabeling = async (item: FinishedGoodItem) => {
        if (!currentUser) {
            showToast('Błąd: Brak informacji o użytkowniku.', 'error');
            return;
        }
        // The handleConfirmFinishedGoodLabeling function is asynchronous
        const result = await handleConfirmFinishedGoodLabeling(item.id, currentUser);
        showToast(result.message, result.success ? 'success' : 'error');
    };
    
    const getNotes = (item: any): string => {
        if (!item) return '';
        const notes: string[] = [];
        if (item.labAnalysisNotes) {
            notes.push(`Notatki główne:\n${item.labAnalysisNotes}`);
        }
        const historyNotes = (item.locationHistory || [])
            .filter((h: any) => h.notes && (h.action.includes('lab') || h.action.includes('block') || h.action.includes('note')))
            .map((h: any) => `[${formatDate(h.movedAt, true)} / ${h.movedBy} / ${getActionLabel(h.action)}]:\n${h.notes}`);
        notes.push(...[...historyNotes].reverse());
        return [...new Set(notes)].join('\n\n---\n\n');
    };

    const getDocuments = (item: any): Document[] => {
        if (!item) return [];
        return item.documents || [];
    };

    return (
        <div className="bg-white dark:bg-secondary-800 shadow-xl rounded-lg h-full flex flex-col">
            <header className="p-4 md:px-6 py-3 flex-shrink-0 border-b dark:border-secondary-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                    <TagIcon className="h-8 w-8 text-primary-600 dark:text-primary-400" />
                    <div>
                        <h2 className="text-2xl font-semibold text-primary-700 dark:text-primary-300">Etykiety Oczekujące na Druk</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Palety wyprodukowane, które nie zostały jeszcze oklejone.</p>
                    </div>
                </div>
                <div className="w-full sm:w-auto sm:max-w-xs">
                    <Input
                        label=""
                        id="pending-labels-search"
                        placeholder="Filtruj listę..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        icon={<SearchIcon className="h-5 w-5 text-gray-400" />}
                    />
                </div>
            </header>

            <div className="flex-grow overflow-auto scrollbar-hide p-4">
                {sortedItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 dark:text-gray-400">
                        <TagIcon className="h-16 w-16 text-gray-300 dark:text-gray-600 mb-4" />
                        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">Brak etykiet oczekujących</h3>
                        <p className="mt-1 text-sm">
                            Wszystkie wyprodukowane palety zostały oklejone.
                        </p>
                    </div>
                ) : (
                    <table className="min-w-full text-sm">
                        <thead className="bg-gray-100 dark:bg-secondary-700">
                            <tr>
                                <SortableHeader columnKey="displayId" sortConfig={sortConfig} requestSort={requestSort} thClassName="px-3 py-2 text-left font-medium text-gray-500 dark:text-gray-300">ID Palety</SortableHeader>
                                <SortableHeader columnKey="productName" sortConfig={sortConfig} requestSort={requestSort} thClassName="px-3 py-2 text-left font-medium text-gray-500 dark:text-gray-300">Produkt</SortableHeader>
                                <SortableHeader columnKey="producedAt" sortConfig={sortConfig} requestSort={requestSort} thClassName="px-3 py-2 text-left font-medium text-gray-500 dark:text-gray-300">Data Produkcji</SortableHeader>
                                <th className="px-3 py-2 text-right font-medium text-gray-500 dark:text-gray-300">Akcje</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-secondary-800 divide-y divide-gray-200 dark:divide-secondary-700">
                            {sortedItems.map((item: FinishedGoodItem) => {
                                const allLabNotesText = getNotes(item);
                                const hasNotes = allLabNotesText.trim().length > 0;
                                const documents = getDocuments(item);
                                const hasDocuments = documents.length > 0;

                                return (
                                <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-secondary-700/50">
                                    <td className="px-3 py-2 whitespace-nowrap">
                                        <div className="flex items-center gap-2 group">
                                            <span className="font-mono text-primary-600 dark:text-primary-400">{item.displayId}</span>
                                            {hasNotes && (
                                                <button onClick={(e) => { e.stopPropagation(); modalHandlers.openTextDisplayModal(`Notatki dla ${item.displayId}`, allLabNotesText); }} className="text-gray-400 hover:text-primary-500" title="Zobacz notatki"><ClipboardListIcon className="h-4 w-4"/></button>
                                            )}
                                            {hasDocuments && (
                                                <button onClick={(e) => { e.stopPropagation(); modalHandlers.openDocumentListModal(`Dokumenty dla ${item.displayId}`, documents); }} className="text-gray-400 hover:text-primary-500" title="Zobacz dokumenty"><DocumentTextIcon className="h-4 w-4"/></button>
                                            )}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    navigator.clipboard.writeText(item.displayId || '');
                                                    setCopiedId(item.displayId || '');
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
                                    <td className="px-3 py-2">{item.productName}</td>
                                    <td className="px-3 py-2">{formatDate(item.producedAt, true)}</td>
                                    <td className="px-3 py-2 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <Button onClick={() => handlePrintLabel(item)} variant="secondary" className="text-xs" leftIcon={<PrintLabelIcon className="h-4 w-4"/>}>Drukuj</Button>
                                            <Button onClick={() => handleConfirmLabeling(item)} variant="primary" className="text-xs" leftIcon={<CheckCircleIcon className="h-4 w-4"/>}>Potwierdź</Button>
                                        </div>
                                    </td>
                                </tr>
                            )})}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default PendingLabelsPage;