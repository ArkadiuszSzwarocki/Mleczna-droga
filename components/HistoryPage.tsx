import React, { useMemo, useState, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
// FIX: Corrected import path for WarehouseContext to be relative.
import { useWarehouseContext } from './contexts/WarehouseContext';
import { useProductionContext } from './contexts/ProductionContext';
import { useAuth } from './contexts/AuthContext';
import { useUIContext } from './contexts/UIContext';
import { useSortableData } from '../src/useSortableData';
import SortableHeader from './SortableHeader';
import Button from './Button';
import Input from './Input';
import Select from './Select';
import { formatDate, getActionLabel, getBlockInfo } from '../src/utils';
import ClockRewindIcon from './icons/ClockRewindIcon';
import FilterIcon from './icons/FilterIcon';
import SearchableSelect from './SearchableSelect';
import ClipboardIcon from './icons/ClipboardIcon';
import CheckCircleIcon from './icons/CheckCircleIcon';
import PrintLabelIcon from './icons/PrintLabelIcon';
import { RawMaterialLogEntry, FinishedGoodItem, Document, SavedView } from '../types';
import ClipboardListIcon from './icons/ClipboardListIcon';
import DocumentTextIcon from './icons/DocumentTextIcon';
import SaveIcon from './icons/SaveIcon';
import TrashIcon from './icons/TrashIcon';

const ALL_ACTIONS_KEYS = [
    'added_new_to_delivery_buffer', 'move', 'lab_pallet_blocked', 'lab_pallet_unblocked',
    'consumed_in_production', 'returned_from_production', 'inventory_adjustment',
    'produced', 'dispatched_from_loading_bay', 'finished_good_blocked',
    'finished_good_unblocked', 'consumed_in_mixing', 'returned_from_mixing',
    'lab_note_added', 'consumed_in_psd_production', 'label_printed_and_moved',
    'consumed_in_agro', 'lab_document_added', 'produced_from_mixing',
    'label_printed_move_to_receiving', 'label_skipped_move_to_pending',
    'lab_note_updated', 'consumed_in_split'
];

const ALL_ACTIONS = ALL_ACTIONS_KEYS
    .map(action => ({ value: action, label: getActionLabel(action) }))
    .sort((a, b) => a.label.localeCompare(b.label));

const initialFilters = {
    startDate: '',
    endDate: '',
    palletId: '',
    productName: 'all',
    user: 'all',
    action: 'all',
    fromLocation: '',
    toLocation: '',
    itemType: 'all' as 'all' | 'raw' | 'fg',
    status: 'all' as 'all' | 'blocked' | 'available',
};

const HistoryPage: React.FC = () => {
    const { rawMaterialsLogList, allProducts } = useWarehouseContext();
    const { finishedGoodsList } = useProductionContext();
    const { users } = useAuth();
    const { modalHandlers } = useUIContext();
    
    const [filters, setFilters] = useState(initialFilters);
    const [copiedId, setCopiedId] = useState<string | null>(null);

    const [savedViews, setSavedViews] = useState<SavedView[]>([]);
    const [selectedView, setSelectedView] = useState('none');
    
    const parentRef = useRef<HTMLDivElement>(null);

    const allMovements = useMemo(() => {
        const rawMovements = (rawMaterialsLogList || []).flatMap(pallet => {
            if (!pallet || !pallet.palletData) return [];
            return (pallet.locationHistory || []).map(hist => ({
                ...hist,
                palletId: pallet.palletData.nrPalety,
                productName: pallet.palletData.nazwa,
                isRaw: true,
                originalItem: pallet,
                uniqueId: `${pallet.id}-${hist.movedAt}-${Math.random()}`
            }));
        });
        const fgMovements = (finishedGoodsList || []).flatMap(pallet => 
            (pallet.locationHistory || []).map(hist => ({
                ...hist,
                palletId: pallet.finishedGoodPalletId || pallet.id,
                productName: pallet.productName,
                isRaw: false,
                originalItem: pallet,
                uniqueId: `${pallet.id}-${hist.movedAt}-${Math.random()}`
            }))
        );
        return [...rawMovements, ...fgMovements].map(m => {
             const { isBlocked, reason } = getBlockInfo(m.originalItem);
             return { ...m, isBlocked, blockReason: reason };
        });
    }, [rawMaterialsLogList, finishedGoodsList]);

    const filteredMovements = useMemo(() => {
        return allMovements.filter(m => {
            const moveDate = new Date(m.movedAt);
            if (filters.startDate && moveDate < new Date(filters.startDate)) return false;
            if (filters.endDate && moveDate > new Date(new Date(filters.endDate).setHours(23, 59, 59, 999))) return false;
            if (filters.palletId && !m.palletId.toLowerCase().includes(filters.palletId.toLowerCase())) return false;
            if (filters.productName !== 'all' && m.productName !== filters.productName) return false;
            if (filters.user !== 'all' && m.movedBy !== filters.user) return false;
            if (filters.action !== 'all' && m.action !== filters.action) return false;
            if (filters.fromLocation && !(m.previousLocation || '').toLowerCase().includes(filters.fromLocation.toLowerCase())) return false;
            if (filters.toLocation && !m.targetLocation.toLowerCase().includes(filters.toLocation.toLowerCase())) return false;
            if (filters.itemType !== 'all') {
                if (filters.itemType === 'raw' && !m.isRaw) return false;
                if (filters.itemType === 'fg' && m.isRaw) return false;
            }
            if (filters.status !== 'all') {
                if (filters.status === 'blocked' && !m.isBlocked) return false;
                if (filters.status === 'available' && m.isBlocked) return false;
            }
            return true;
        });
    }, [allMovements, filters]);

    const { items: sortedMovements, requestSort, sortConfig } = useSortableData(filteredMovements, { key: 'movedAt', direction: 'descending' });

    const rowVirtualizer = useVirtualizer({
        count: sortedMovements.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 37, // Estimate row height
        overscan: 10,
    });

    const handleFilterChange = (field: keyof typeof filters, value: string) => {
        setFilters(prev => ({ ...prev, [field]: value }));
        setSelectedView('none'); // Unselect saved view when filters change
    };
    
    const handleClearFilters = () => {
        setFilters(initialFilters);
        setSelectedView('none');
    };

    const handleSaveView = () => {
        const name = window.prompt("Wprowadź nazwę dla tego widoku:");
        if (name && name.trim()) {
            const newView: SavedView = { id: Date.now().toString(), name: name.trim(), page: 'history', filters };
            setSavedViews(prev => [...prev, newView]);
            setSelectedView(newView.id);
        }
    };

    const handleLoadView = (viewId: string) => {
        if (viewId === 'none') {
            handleClearFilters();
            return;
        }
        const view = savedViews.find(v => v.id === viewId);
        if (view) {
            setFilters(view.filters);
            setSelectedView(view.id);
        }
    };
    
    const handleDeleteView = () => {
        if (selectedView !== 'none') {
            setSavedViews(prev => prev.filter(v => v.id !== selectedView));
            handleClearFilters();
        }
    };

    const userOptions = useMemo(() => [{ value: 'all', label: 'Wszyscy' }, ...(users || []).map(u => ({ value: u.username, label: u.username }))], [users]);
    const productOptions = useMemo(() => [{ value: 'all', label: 'Wszystkie' }, ...(allProducts || []).map((p: any) => ({ value: p.name, label: p.name }))], [allProducts]);
    const actionOptions = useMemo(() => [{ value: 'all', label: 'Wszystkie' }, ...ALL_ACTIONS], []);
    const savedViewOptions = useMemo(() => [{ value: 'none', label: 'Wybierz zapisany widok...' }, ...savedViews.map(v => ({ value: v.id, label: v.name }))], [savedViews]);

    const handleRowClick = (item: any) => {
        if (item.isRaw) {
            modalHandlers.openPalletDetailModal(item.originalItem);
        } else {
            modalHandlers.openFinishedGoodDetailModal(item.originalItem);
        }
    };

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
        <div className="p-4 md:p-6 bg-white dark:bg-secondary-800 shadow-xl rounded-lg h-full flex flex-col" id="printable-history-report">
            <header className="flex-shrink-0 flex flex-col sm:flex-row justify-between items-center mb-4 border-b dark:border-secondary-600 pb-3 no-print">
                <div className="flex items-center">
                    <ClockRewindIcon className="h-8 w-8 text-primary-600 dark:text-primary-400 mr-3" />
                    <h2 className="text-2xl font-semibold text-primary-700 dark:text-primary-300">Historia Operacji na Paletach</h2>
                </div>
                <Button onClick={() => window.print()} leftIcon={<PrintLabelIcon className="h-5 w-5"/>}>
                    Drukuj Raport
                </Button>
            </header>
            
            <details className="flex-shrink-0 bg-slate-50 dark:bg-secondary-900 border dark:border-secondary-700 rounded-lg p-4 mb-4 no-print" open>
                <summary className="font-semibold text-lg text-gray-700 dark:text-gray-200 cursor-pointer flex items-center gap-2">
                    <FilterIcon className="h-5 w-5"/> Filtry
                </summary>
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    <Input label="Data od" type="date" value={filters.startDate} onChange={e => handleFilterChange('startDate', e.target.value)} />
                    <Input label="Data do" type="date" value={filters.endDate} onChange={e => handleFilterChange('endDate', e.target.value)} min={filters.startDate} />
                    <Input label="ID Palety" value={filters.palletId} onChange={e => handleFilterChange('palletId', e.target.value)} />
                    <SearchableSelect label="Produkt" options={productOptions} value={filters.productName} onChange={val => handleFilterChange('productName', val)} />
                    <Select label="Użytkownik" options={userOptions} value={filters.user} onChange={e => handleFilterChange('user', e.target.value)} />
                    <Select label="Typ Operacji" options={actionOptions} value={filters.action} onChange={e => handleFilterChange('action', e.target.value)} />
                    <Input label="Z Lokalizacji" value={filters.fromLocation} onChange={e => handleFilterChange('fromLocation', e.target.value)} uppercase />
                    <Input label="Do Lokalizacji" value={filters.toLocation} onChange={e => handleFilterChange('toLocation', e.target.value)} uppercase />
                    <Select label="Typ Pozycji" options={[{value: 'all', label: 'Wszystkie'}, {value: 'raw', label: 'Surowiec'}, {value: 'fg', label: 'Wyrób Gotowy'}]} value={filters.itemType} onChange={e => handleFilterChange('itemType', e.target.value)} />
                    <Select label="Status" options={[{value: 'all', label: 'Wszystkie'}, {value: 'blocked', label: 'Zablokowane'}, {value: 'available', label: 'Dostępne'}]} value={filters.status} onChange={e => handleFilterChange('status', e.target.value)} />
                </div>
                <div className="mt-4 pt-4 border-t dark:border-secondary-600 flex flex-wrap justify-between items-end gap-3">
                    <div className="flex items-end gap-2">
                        <Select label="Zapisane widoki" options={savedViewOptions} value={selectedView} onChange={e => handleLoadView(e.target.value)} />
                        <Button onClick={handleSaveView} variant="secondary" className="mb-1" leftIcon={<SaveIcon className="w-4 h-4" />}>Zapisz</Button>
                        <Button onClick={handleDeleteView} variant="danger" className="p-2 mb-1" disabled={selectedView === 'none'}><TrashIcon className="w-4 h-4" /></Button>
                    </div>
                    <Button onClick={handleClearFilters} variant="secondary">Wyczyść Filtry</Button>
                </div>
            </details>
            
            <p className="flex-shrink-0 text-sm text-gray-600 dark:text-gray-400 mb-2 no-print">Znaleziono {sortedMovements.length} operacji.</p>
            <div ref={parentRef} className="flex-grow overflow-auto scrollbar-hide relative">
                {sortedMovements.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-gray-500">Brak wyników dla podanych filtrów.</div>
                ) : (
                    <table className="min-w-full text-sm">
                        <thead className="bg-gray-100 dark:bg-secondary-700 sticky top-0 z-10">
                            <tr>
                                <SortableHeader columnKey="movedAt" sortConfig={sortConfig} requestSort={requestSort} thClassName="px-3 py-2 text-left font-medium text-gray-500 dark:text-gray-300">Data i Czas</SortableHeader>
                                <SortableHeader columnKey="palletId" sortConfig={sortConfig} requestSort={requestSort} thClassName="px-3 py-2 text-left font-medium text-gray-500 dark:text-gray-300">ID Palety</SortableHeader>
                                <SortableHeader columnKey="productName" sortConfig={sortConfig} requestSort={requestSort} thClassName="px-3 py-2 text-left font-medium text-gray-500 dark:text-gray-300">Produkt</SortableHeader>
                                <SortableHeader columnKey="action" sortConfig={sortConfig} requestSort={requestSort} thClassName="px-3 py-2 text-left font-medium text-gray-500 dark:text-gray-300">Operacja</SortableHeader>
                                <SortableHeader columnKey="previousLocation" sortConfig={sortConfig} requestSort={requestSort} thClassName="px-3 py-2 text-left font-medium text-gray-500 dark:text-gray-300">Z Lokalizacji</SortableHeader>
                                <SortableHeader columnKey="targetLocation" sortConfig={sortConfig} requestSort={requestSort} thClassName="px-3 py-2 text-left font-medium text-gray-500 dark:text-gray-300">Do Lokalizacji</SortableHeader>
                                <SortableHeader columnKey="movedBy" sortConfig={sortConfig} requestSort={requestSort} thClassName="px-3 py-2 text-left font-medium text-gray-500 dark:text-gray-300">Użytkownik</SortableHeader>
                            </tr>
                        </thead>
                        <tbody style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: 'relative' }}>
                            {rowVirtualizer.getVirtualItems().map(virtualRow => {
                                const item = sortedMovements[virtualRow.index];
                                if (!item) return null;

                                const allLabNotesText = getNotes(item.originalItem);
                                const hasNotes = allLabNotesText.trim().length > 0;
                                const documents = getDocuments(item.originalItem);
                                const hasDocuments = documents.length > 0;
                                
                                return (
                                <tr 
                                    key={item.uniqueId} 
                                    onClick={() => handleRowClick(item)} 
                                    className="flex w-full hover:bg-gray-50 dark:hover:bg-secondary-700/50 cursor-pointer absolute top-0 left-0"
                                    style={{ height: `${virtualRow.size}px`, transform: `translateY(${virtualRow.start}px)` }}
                                >
                                    <td className="flex-1 w-0 px-3 py-2 border-b dark:border-secondary-700 truncate">{formatDate(item.movedAt, true)}</td>
                                    <td className="flex-1 w-0 px-3 py-2 border-b dark:border-secondary-700 truncate">
                                        <div className="flex items-center gap-2 group">
                                            <span className="font-mono text-primary-600 dark:text-primary-400 truncate">{item.palletId}</span>
                                            {hasNotes && (
                                                <button onClick={(e) => { e.stopPropagation(); modalHandlers.openTextDisplayModal(`Notatki dla ${item.palletId}`, allLabNotesText); }} className="text-gray-400 hover:text-primary-500" title="Zobacz notatki"><ClipboardListIcon className="h-4 w-4"/></button>
                                            )}
                                            {hasDocuments && (
                                                <button onClick={(e) => { e.stopPropagation(); modalHandlers.openDocumentListModal(`Dokumenty dla ${item.palletId}`, documents); }} className="text-gray-400 hover:text-primary-500" title="Zobacz dokumenty"><DocumentTextIcon className="h-4 w-4"/></button>
                                            )}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    navigator.clipboard.writeText(item.palletId);
                                                    setCopiedId(item.palletId);
                                                    setTimeout(() => setCopiedId(null), 2000);
                                                }}
                                                title={copiedId === item.palletId ? "Skopiowano!" : "Kopiuj ID"}
                                                className="p-1 rounded-full opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity no-print"
                                            >
                                                {copiedId === item.palletId ? (
                                                    <CheckCircleIcon className="h-4 w-4 text-green-500" />
                                                ) : (
                                                    <ClipboardIcon className="h-4 w-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200" />
                                                )}
                                            </button>
                                        </div>
                                    </td>
                                    <td className="flex-1 w-0 px-3 py-2 border-b dark:border-secondary-700 truncate">{item.productName}</td>
                                    <td className="flex-1 w-0 px-3 py-2 border-b dark:border-secondary-700 truncate">{getActionLabel(item.action)}</td>
                                    <td className="flex-1 w-0 px-3 py-2 font-mono border-b dark:border-secondary-700 truncate">{item.previousLocation || '---'}</td>
                                    <td className="flex-1 w-0 px-3 py-2 font-mono border-b dark:border-secondary-700 truncate">{item.targetLocation}</td>
                                    <td className="flex-1 w-0 px-3 py-2 border-b dark:border-secondary-700 truncate">{item.movedBy}</td>
                                </tr>
                            )})}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default HistoryPage;