
import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { RawMaterialLogEntry, FinishedGoodItem, PackagingMaterialLogEntry, User, View, Document, AnalysisRange } from '../types';
import { useAppContext } from './contexts/AppContext';
import { useUIContext } from './contexts/UIContext';
import { useAuth } from './contexts/AuthContext';
import Button from './Button';
import { formatDate, getActionLabel, getBlockInfo } from '../src/utils';
import BeakerIcon from './icons/BeakerIcon';
import { useSortableData } from '../src/useSortableData';
import SortableHeader from './SortableHeader';
import LockOpenIcon from './icons/LockOpenIcon';
import Alert from './Alert';
import CalendarSlashIcon from './icons/CalendarSlashIcon';
import XCircleIcon from './icons/XCircleIcon';
import Textarea from './Textarea';
import Input from './Input';
import PaperclipIcon from './icons/PaperclipIcon';
import CalendarDaysIcon from './icons/CalendarDaysIcon';
import SearchIcon from './icons/SearchIcon';
import LockClosedIcon from './icons/LockClosedIcon';
import ListBulletIcon from './icons/ListBulletIcon';
import DocumentTextIcon from './icons/DocumentTextIcon';
import ClipboardListIcon from './icons/ClipboardListIcon';
import CheckCircleIcon from './icons/CheckCircleIcon';

type LabItem = {
    id: string;
    itemType: 'raw' | 'fg' | 'pkg';
    displayId: string;
    productName: string;
    location: string | null;
    isExpired: boolean;
    isBlocked: boolean;
    reason: string;
    blockedAt: string;
    originalItem: RawMaterialLogEntry | FinishedGoodItem | PackagingMaterialLogEntry;
};

// Justification Modal Component for EXPIRED items
const JustificationModal: React.FC<{
    item: LabItem;
    onClose: () => void;
    onConfirm: (notes: string, file: File | null, newDate: string) => void;
}> = ({ item, onClose, onConfirm }) => {
    const itemData = item.originalItem;
    const expiryDate = item.itemType === 'raw' ? (itemData as RawMaterialLogEntry).palletData.dataPrzydatnosci : (itemData as FinishedGoodItem).expiryDate;
    
    const [notes, setNotes] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [newDate, setNewDate] = useState(expiryDate.split('T')[0]);
    const [error, setError] = useState<string | null>(null);

    const handleConfirm = () => {
        setError(null);
        if (!notes.trim()) {
            setError("Uzasadnienie jest wymagane.");
            return;
        }
        if (!newDate) {
            setError("Nowa data ważności jest wymagana.");
            return;
        }
        if (new Date(newDate) <= new Date(expiryDate)) {
            setError("Nowa data ważności musi być późniejsza niż obecna.");
            return;
        }
        onConfirm(notes, file, newDate);
    };

    return (
        <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center p-4 z-[150]" onClick={onClose}>
            <div className="bg-white dark:bg-secondary-800 rounded-lg shadow-xl p-6 w-full max-w-lg space-y-4" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-semibold text-primary-700 dark:text-primary-300">Zwolnij przeterminowaną paletę</h2>
                    <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600"><XCircleIcon className="h-6 w-6"/></button>
                </div>
                {error && <Alert type="error" message={error} />}
                <div className="text-sm p-3 bg-slate-100 dark:bg-secondary-700 rounded-lg">
                    <p><strong>Produkt:</strong> {item.productName}</p>
                    <p><strong>ID Palety:</strong> <span className="font-mono">{item.displayId}</span></p>
                    <p><strong>Obecna data ważności:</strong> {formatDate(expiryDate)}</p>
                </div>
                <Textarea label="Uzasadnienie zwolnienia (wymagane)" id="justification-notes" value={notes} onChange={e => setNotes(e.target.value)} autoFocus />
                <div className="relative">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Dokument (opcjonalnie)</label>
                    <div className="flex items-center">
                        <PaperclipIcon className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <Input
                            label=""
                            id="release-file"
                            type="file"
                            onChange={e => setFile(e.target.files ? e.target.files[0] : null)}
                        />
                    </div>
                </div>
                 <div className="relative">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nowa data ważności (wymagane)</label>
                    <div className="flex items-center">
                        <CalendarDaysIcon className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <Input
                            label=""
                            id="new-expiry-date"
                            type="date"
                            value={newDate}
                            onChange={e => setNewDate(e.target.value)}
                        />
                    </div>
                </div>
                <div className="flex justify-end space-x-2 pt-2">
                    <Button type="button" variant="secondary" onClick={onClose}>Anuluj</Button>
                    <Button type="button" onClick={handleConfirm}>Zwolnij i Przedłuż Termin</Button>
                </div>
            </div>
        </div>
    );
};

const UnblockReasonModal: React.FC<{
    isOpen: boolean;
    item: LabItem;
    onClose: () => void;
    onConfirm: (reason: string) => void;
}> = ({ isOpen, onClose, item, onConfirm }) => {
    const [reason, setReason] = useState('');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if(isOpen) {
            setReason('');
            setError(null);
        }
    }, [isOpen]);

    if (!isOpen || !item) return null;

    const displayId = 'palletData' in item.originalItem ? item.originalItem.palletData.nrPalety : (('displayId' in item.originalItem && (item.originalItem as FinishedGoodItem).displayId) || item.originalItem.id);
    const productName = 'palletData' in item.originalItem ? item.originalItem.palletData.nazwa : (item.originalItem as FinishedGoodItem).productName;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!reason.trim()) {
            setError('Powód zwolnienia jest wymagany.');
            return;
        }
        onConfirm(reason);
    };

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-[180]" onClick={onClose}>
            <div className="bg-white dark:bg-secondary-800 rounded-lg shadow-xl p-6 w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold text-primary-700 dark:text-primary-300 flex items-center gap-2">
                        <LockOpenIcon className="h-6 w-6"/> Zwolnij Paletę
                    </h2>
                    <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600"><XCircleIcon className="h-6 w-6"/></button>
                </div>

                <div className="text-sm p-3 bg-slate-100 dark:bg-secondary-700 rounded-lg">
                    <p><strong>ID Palety:</strong> <span className="font-mono">{displayId}</span></p>
                    <p><strong>Produkt:</strong> {productName}</p>
                    <p><strong>Aktualny powód blokady:</strong> {item.reason}</p>
                </div>
                
                {error && <Alert type="error" message={error} />}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <Textarea
                        label="Powód zwolnienia (wymagany)"
                        id="unblock-reason"
                        value={reason}
                        onChange={e => setReason(e.target.value)}
                        required
                        autoFocus
                    />
                    <div className="flex justify-end space-x-2 pt-2">
                        <Button type="button" variant="secondary" onClick={onClose}>Anuluj</Button>
                        <Button type="submit" disabled={!reason.trim()}>Zwolnij</Button>
                    </div>
                </form>
            </div>
        </div>
    );
};


const LabPalletReleasePage: React.FC = () => {
    const { rawMaterialsLogList, finishedGoodsList, packagingMaterialsLog, handleUnblockPallet, handleAddDocument, handleSetView, modalHandlers } = useAppContext();
    const { currentUser } = useAuth();
    
    const [itemForJustification, setItemForJustification] = useState<LabItem | null>(null);
    const [itemForUnblockReason, setItemForUnblockReason] = useState<LabItem | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState<'all' | 'blocked' | 'available'>('all');

    const allItems = useMemo((): LabItem[] => {
        const today = new Date().toISOString().split('T')[0];
        const items: LabItem[] = [];

        (rawMaterialsLogList || []).forEach(p => {
            if (p && p.palletData) {
                 const { isBlocked, reason } = getBlockInfo(p);
                 const isExpired = p.palletData.dataPrzydatnosci < today;
                 const blockHistory = (p.locationHistory || []).slice().reverse().find(h => h.action === 'lab_pallet_blocked');
                 items.push({
                    id: p.id,
                    itemType: 'raw',
                    displayId: p.palletData.nrPalety,
                    productName: p.palletData.nazwa,
                    location: p.currentLocation,
                    isExpired,
                    isBlocked,
                    reason: reason || 'Dostępna',
                    blockedAt: blockHistory?.movedAt || (isExpired ? p.palletData.dataPrzydatnosci : p.dateAdded),
                    originalItem: p
                 });
            }
        });

        (finishedGoodsList || []).forEach(fg => {
            const { isBlocked, reason } = getBlockInfo(fg);
            const isExpired = new Date(fg.expiryDate).toISOString().split('T')[0] < today;
            const blockHistory = (fg.locationHistory || []).slice().reverse().find(h => h.action === 'finished_good_blocked');
            items.push({
                id: fg.id,
                itemType: 'fg',
                displayId: fg.finishedGoodPalletId || fg.id,
                productName: fg.productName,
                location: fg.currentLocation,
                isExpired,
                isBlocked,
                reason: reason || 'Dostępna',
                blockedAt: blockHistory?.movedAt || (isExpired ? fg.expiryDate : (fg.locationHistory.slice(-1)[0]?.movedAt || fg.productionDate)),
                originalItem: fg
            });
        });

        (packagingMaterialsLog || []).forEach(pkg => {
            if(pkg.currentLocation) {
                 const { isBlocked, reason } = getBlockInfo(pkg);
                 const blockHistory = (pkg.locationHistory || []).slice().reverse().find(h => h.action === 'lab_pallet_blocked');
                 items.push({
                    id: pkg.id,
                    itemType: 'pkg',
                    displayId: pkg.id,
                    productName: pkg.productName,
                    location: pkg.currentLocation,
                    isExpired: false,
                    isBlocked,
                    reason: reason || 'Dostępne',
                    blockedAt: blockHistory?.movedAt || pkg.dateAdded,
                    originalItem: pkg
                 });
            }
        });
        
        return items;
    }, [rawMaterialsLogList, finishedGoodsList, packagingMaterialsLog]);

    const filteredItems = useMemo(() => {
        let items = allItems;

        if (filterType === 'blocked') {
            items = items.filter(item => item.isBlocked);
        } else if (filterType === 'available') {
            items = items.filter(item => !item.isBlocked);
        }

        if (searchTerm.trim()) {
            const lowerSearch = searchTerm.toLowerCase();
            items = items.filter(item =>
                item.displayId.toLowerCase().includes(lowerSearch) ||
                item.productName.toLowerCase().includes(lowerSearch) ||
                (item.location || '').toLowerCase().includes(lowerSearch)
            );
        }

        return items;
    }, [allItems, filterType, searchTerm]);

    const { items: sortedItems, requestSort, sortConfig } = useSortableData(filteredItems, { key: 'blockedAt', direction: 'descending' });

    const handleRelease = (item: LabItem) => {
        if (!currentUser) return;
        if(item.isExpired && item.itemType !== 'pkg') {
            setItemForJustification(item);
        } else {
            setItemForUnblockReason(item);
        }
    };
    
    const handleConfirmJustification = (notes: string, file: File | null, newDate: string) => {
        if (!currentUser || !itemForJustification) return;
        handleUnblockPallet(itemForJustification.id, itemForJustification.itemType, currentUser, notes, newDate);
        if (file) {
            handleAddDocument(itemForJustification.id, itemForJustification.itemType, file);
        }
        setItemForJustification(null);
    };
    
    const handleConfirmUnblockReason = (notes: string) => {
        if (!currentUser || !itemForUnblockReason) return;
        handleUnblockPallet(itemForUnblockReason.id, itemForUnblockReason.itemType, currentUser, notes);
        setItemForUnblockReason(null);
    };
    
    const getTypeLabel = (type: LabItem['itemType']) => {
        switch(type) {
            case 'raw': return 'Surowiec';
            case 'fg': return 'Wyrób Gotowy';
            case 'pkg': return 'Opakowanie';
            default: return 'Nieznany';
        }
    };
    
    const getNotes = (item: LabItem): string => {
        const original = item.originalItem;
        if (!original) return '';
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

    const getDocuments = (item: LabItem): Document[] => {
        const original = item.originalItem;
        if (!original) return [];
        if ('palletData' in original) return (original as RawMaterialLogEntry).palletData.documents || [];
        return (original as FinishedGoodItem).documents || [];
    };

    const handleRowClick = (item: LabItem) => {
        handleSetView(View.LabAnalysisPage, { palletId: item.originalItem.id, itemType: item.itemType });
    };

    const LabItemCard: React.FC<{
        item: LabItem;
    }> = ({ item }) => {
        const { itemType, displayId, productName, location, reason, isBlocked, isExpired } = item;
        
        const typeLabel = getTypeLabel(itemType);
        const typeColor = 
            itemType === 'raw' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200' : 
            (itemType === 'fg' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200' : 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200');

        const expiryDate = item.itemType === 'raw' 
            ? (item.originalItem as RawMaterialLogEntry).palletData.dataPrzydatnosci 
            : (item.itemType === 'fg' ? (item.originalItem as FinishedGoodItem).expiryDate : '---');

        return (
            <div 
                onClick={() => handleRowClick(item)}
                className={`bg-white dark:bg-secondary-800 p-3 rounded-lg shadow-md border-l-4 ${isBlocked ? 'border-red-500' : 'border-green-500'} flex flex-col justify-between cursor-pointer hover:shadow-lg transition-shadow`}
            >
                <div>
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="font-semibold text-gray-800 dark:text-gray-200 truncate" title={productName}>{productName}</p>
                            <p className="text-sm font-mono text-primary-600 dark:text-primary-400 truncate" title={displayId}>{displayId}</p>
                        </div>
                        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${typeColor}`}>{typeLabel}</span>
                    </div>
                    <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                        <p><strong>Lokalizacja:</strong> {location}</p>
                        <p><strong>Status:</strong> {reason}</p>
                        <p><strong>Ważność:</strong> {formatDate(expiryDate)}</p>
                    </div>
                </div>
                <div className="mt-3 pt-2 border-t dark:border-secondary-700 flex justify-end gap-2">
                    <Button onClick={(e) => { e.stopPropagation(); handleRowClick(item); }} variant="secondary" className="text-xs" leftIcon={<BeakerIcon className="h-4 w-4"/>}>
                        Analizuj
                    </Button>
                    {isBlocked ? (
                        <Button onClick={(e) => { e.stopPropagation(); handleRelease(item); }} variant="secondary" className="text-xs bg-green-100 text-green-800" leftIcon={<LockOpenIcon className="h-4 w-4"/>}>
                            {isExpired ? 'Zwolnij i Przedłuż' : 'Zwolnij'}
                        </Button>
                    ) : (
                        <Button onClick={(e) => { e.stopPropagation(); modalHandlers.openBlockPalletModal(item.originalItem); }} variant="secondary" className="text-xs bg-red-100 text-red-800" leftIcon={<LockClosedIcon className="h-4 w-4"/>}>
                            Zablokuj
                        </Button>
                    )}
                </div>
            </div>
        );
    };

    return (
        <>
        <div className="p-4 md:p-6 bg-white dark:bg-secondary-800 shadow-xl rounded-lg h-full flex flex-col">
            <header className="flex-shrink-0 flex flex-col sm:flex-row justify-between items-center mb-6 border-b dark:border-secondary-600 pb-3 gap-4">
                <div className="flex items-center">
                    <BeakerIcon className="h-8 w-8 text-primary-600 dark:text-primary-400 mr-3" />
                    <h2 className="text-2xl font-semibold text-primary-700 dark:text-primary-300">Zwalnianie i Blokowanie Palet</h2>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <div className="flex-grow">
                        <Input
                            label=""
                            id="lab-release-search"
                            placeholder="Wyszukaj po ID, nazwie, lokalizacji..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            icon={<SearchIcon className="h-5 w-5 text-gray-400" />}
                            className="text-sm"
                        />
                    </div>
                    <Button variant={filterType === 'all' ? 'primary' : 'secondary'} onClick={() => setFilterType('all')} title="Wszystkie">Wszystkie</Button>
                    <Button variant={filterType === 'blocked' ? 'primary' : 'secondary'} onClick={() => setFilterType('blocked')} title="Zablokowane">Zablokowane</Button>
                    <Button variant={filterType === 'available' ? 'primary' : 'secondary'} onClick={() => setFilterType('available')} title="Dostępne">Dostępne</Button>
                </div>
            </header>

            <div className="flex-grow overflow-auto">
                {sortedItems.length === 0 ? (
                    <Alert type="info" message={searchTerm || filterType !== 'all' ? 'Brak pozycji spełniających kryteria.' : 'Brak palet w systemie.'} />
                ) : (
                <>
                    {/* Mobile View */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:hidden">
                        {sortedItems.map((item: LabItem) => (
                            <LabItemCard
                                key={`${item.id}-${item.itemType}`}
                                item={item}
                            />
                        ))}
                    </div>

                    {/* Desktop View */}
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-secondary-700 text-sm hidden md:table">
                        <thead className="bg-gray-100 dark:bg-secondary-700">
                            <tr>
                                <SortableHeader columnKey="displayId" sortConfig={sortConfig} requestSort={requestSort}>ID Palety</SortableHeader>
                                <SortableHeader columnKey="productName" sortConfig={sortConfig} requestSort={requestSort}>Produkt</SortableHeader>
                                <SortableHeader columnKey="type" sortConfig={sortConfig} requestSort={requestSort}>Typ</SortableHeader>
                                <SortableHeader columnKey="location" sortConfig={sortConfig} requestSort={requestSort}>Lokalizacja</SortableHeader>
                                <SortableHeader columnKey="date" sortConfig={sortConfig} requestSort={requestSort}>Ważność</SortableHeader>
                                <SortableHeader columnKey="reason" sortConfig={sortConfig} requestSort={requestSort}>Status</SortableHeader>
                                <th className="px-3 py-2 text-right">Akcje</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-secondary-800 divide-y divide-gray-200 dark:divide-secondary-700">
                            {sortedItems.map((item: LabItem) => {
                                const { originalItem, itemType, isBlocked } = item;
                                
                                const documents = getDocuments(item);
                                const hasDocuments = documents.length > 0;
                                const allLabNotesText = getNotes(item);
                                const hasNotes = allLabNotesText.trim().length > 0;
                                const expiryDate = itemType === 'raw' 
                                    ? (originalItem as RawMaterialLogEntry).palletData.dataPrzydatnosci 
                                    : (itemType === 'fg' ? (originalItem as FinishedGoodItem).expiryDate : '---');

                                return (
                                <tr key={`${item.id}-${item.itemType}`} onClick={() => handleRowClick(item)} className={`hover:bg-slate-50 dark:hover:bg-secondary-700/50 cursor-pointer`}>
                                    <td className="px-3 py-2 whitespace-nowrap font-mono text-xs">
                                        <div className="flex items-center gap-2">
                                            {isBlocked 
                                                ? <LockClosedIcon className="h-4 w-4 text-red-500 flex-shrink-0" title={item.reason || 'Zablokowana'} /> 
                                                : <CheckCircleIcon className="h-4 w-4 text-green-500 flex-shrink-0" title="Dostępna" />
                                            }
                                            <span>{item.displayId}</span>
                                            {hasNotes && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        modalHandlers.openTextDisplayModal(`Notatki dla ${item.displayId}`, allLabNotesText);
                                                    }}
                                                    className="text-gray-400 hover:text-primary-500"
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
                                                    className="text-gray-400 hover:text-primary-500"
                                                    title="Zobacz dokumenty"
                                                >
                                                    <DocumentTextIcon className="h-4 w-4" />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-3 py-2">{item.productName}</td>
                                    <td className="px-3 py-2">
                                        <span className={`px-2 inline-flex items-center text-[10px] leading-5 font-semibold rounded-full ${
                                            item.itemType === 'raw' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200' : 
                                            (item.itemType === 'fg' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200' : 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200')
                                        }`}>
                                            {getTypeLabel(item.itemType)}
                                        </span>
                                    </td>
                                    <td className="px-3 py-2 text-xs font-mono">{item.location || '---'}</td>
                                    <td className="px-3 py-2 whitespace-nowrap text-xs">{formatDate(expiryDate)}</td>
                                    <td className={`px-3 py-2 font-semibold text-xs ${isBlocked ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>{item.reason}</td>
                                    <td className="px-3 py-2 text-right">
                                         <div className="flex items-center justify-end gap-1.5" onClick={e => e.stopPropagation()}>
                                            <Button onClick={() => handleRowClick(item)} variant="secondary" className="p-1" title="Analizuj">
                                                <BeakerIcon className="h-4 w-4"/>
                                            </Button>
                                            {isBlocked ? (
                                                <Button onClick={() => handleRelease(item)} variant="secondary" className="p-1 bg-green-100 text-green-800 border-green-200" title={item.isExpired ? 'Zwolnij i Przedłuż' : 'Zwolnij'}>
                                                    <LockOpenIcon className="h-4 w-4"/>
                                                </Button>
                                            ) : (
                                                <Button onClick={() => modalHandlers.openBlockPalletModal(item.originalItem)} variant="secondary" className="p-1 bg-red-100 text-red-800 border-red-200" title="Zablokuj">
                                                    <LockClosedIcon className="h-4 w-4"/>
                                                </Button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            )})}
                        </tbody>
                    </table>
                </>
                )}
            </div>
        </div>
        {itemForJustification && (
            <JustificationModal 
                item={itemForJustification}
                onClose={() => setItemForJustification(null)}
                onConfirm={handleConfirmJustification}
            />
        )}
        {itemForUnblockReason && (
            <UnblockReasonModal
                isOpen={!!itemForUnblockReason}
                item={itemForUnblockReason}
                onClose={() => setItemForUnblockReason(null)}
                onConfirm={handleConfirmUnblockReason}
            />
        )}
        </>
    );
};

export default LabPalletReleasePage;
