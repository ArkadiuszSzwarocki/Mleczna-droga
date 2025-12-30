
import React, { useMemo, useState, useEffect } from 'react';
import { FinishedGoodItem, User, PalletData, Document } from '../types';
import { useAppContext } from './contexts/AppContext';
import { useWarehouseContext } from './contexts/WarehouseContext';
// FIX: Added missing import for useProductionContext.
import { useProductionContext } from './contexts/ProductionContext';
import Button from './Button';
import Input from './Input';
// FIX: Remove .tsx extension from icon import to fix module resolution error.
import SearchIcon from './icons/SearchIcon';
import { formatDate, getExpiryStatusClass, getExpiryStatus, exportToCsv, getActionLabel } from '../src/utils';
// FIX: Corrected import path for constants.ts to be relative
import { MGW01_RECEIVING_AREA_ID } from '../constants';
import WarehouseIcon from './icons/WarehouseIcon';
import ArrowRightIcon from './icons/ArrowRightIcon';
// FIX: Remove .tsx extension from icon import to fix module resolution error.
import ArrowDownOnSquareIcon from './icons/ArrowDownOnSquareIcon';
import { useSortableData } from '../src/useSortableData';
import SortableHeader from './SortableHeader';
import ClipboardIcon from './icons/ClipboardIcon';
import CheckCircleIcon from './icons/CheckCircleIcon';
import PalletTile from './PalletTile';
import ClipboardListIcon from './icons/ClipboardListIcon';
import DocumentTextIcon from './icons/DocumentTextIcon';

interface MGW01ReceivingPageProps {
}


const MGW01ReceivingPage: React.FC<MGW01ReceivingPageProps> = () => {
    const { modalHandlers, recentlySplitPalletIds, clearRecentlySplitPalletIds } = useAppContext();
    const { expiringPalletsDetails, expiryWarningDays, expiryCriticalDays } = useWarehouseContext();
    const { finishedGoodsList } = useProductionContext();
    const [searchTerm, setSearchTerm] = useState('');
    const [isSearchVisible, setIsSearchVisible] = useState(false);
    const [copiedId, setCopiedId] = useState<string | null>(null);

    useEffect(() => {
        if (recentlySplitPalletIds && recentlySplitPalletIds.length > 0) {
            const timer = setTimeout(() => {
                clearRecentlySplitPalletIds();
            }, 2000); // Animation is 1.5s, 2s is a safe buffer
            return () => clearTimeout(timer);
        }
    }, [recentlySplitPalletIds, clearRecentlySplitPalletIds]);

    const goodsInReceiving = useMemo(() => 
        (finishedGoodsList as any[]).filter(item => item.currentLocation === MGW01_RECEIVING_AREA_ID && (item.status === 'available' || item.status === 'blocked' || item.status === 'pending_label')),
        [finishedGoodsList]
    );

    const filteredGoods = useMemo(() => {
        if (!searchTerm.trim()) return goodsInReceiving;
        const lowerSearch = searchTerm.toLowerCase();
        return goodsInReceiving.filter(item =>
            (item.finishedGoodPalletId || item.id).toLowerCase().includes(lowerSearch) ||
            item.productName.toLowerCase().includes(lowerSearch)
        );
    }, [goodsInReceiving, searchTerm]);


    const groupedByDate = useMemo(() => {
        // FIX: Explicitly typed the initial value for `reduce` to avoid type inference issues.
        // FIX: Added a defensive check for item.productionDate to prevent crashes on undefined values.
        return filteredGoods.reduce((acc: Record<string, any[]>, item: any) => {
            if (item && item.productionDate && typeof item.productionDate === 'string') {
                const date = item.productionDate.split('T')[0];
                if (!acc[date]) {
                    acc[date] = [];
                }
                acc[date].push(item);
            } else {
                // Group items with no date under a special key to prevent crashes and identify bad data
                const noDateKey = 'Brak daty';
                if (!acc[noDateKey]) {
                    acc[noDateKey] = [];
                }
                acc[noDateKey].push(item);
            }
            return acc;
        }, {} as Record<string, any[]>);
    }, [filteredGoods]);

    const sortedItems = useMemo(() => {
        return Object.entries(groupedByDate)
            .sort(([dateA], [dateB]) => {
                if (dateA === 'Brak daty') return 1;
                if (dateB === 'Brak daty') return -1;
                return new Date(dateB).getTime() - new Date(dateA).getTime();
            })
            .flatMap(([date, items]: [string, any[]]) => [{ productionDate: date, isHeader: true }, ...items]);
    }, [groupedByDate]);

    const handleMoveClick = (item: any) => {
        modalHandlers.openMoveFinishedGoodModal(item);
    };

    const handleRowClick = (item: any) => {
        modalHandlers.openFinishedGoodDetailModal(item);
    };
    
    const handleExportToCsv = () => {
        const dataForExport = filteredGoods.map(item => ({
            'ID Palety WG': item.finishedGoodPalletId || item.id,
            'Produkt': item.productName,
            'Ilość (kg)': item.quantityKg.toFixed(2),
            'Data Produkcji': formatDate(item.productionDate),
            'Data Ważności': formatDate(item.expiryDate),
        }));
        exportToCsv(`przyjecia_mgw01_${new Date().toISOString().split('T')[0]}.csv`, dataForExport);
    };
    
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
            <div className="p-4 md:px-6 py-3 flex-shrink-0 flex justify-end items-center gap-2 border-b dark:border-secondary-700">
                <button onClick={() => setIsSearchVisible(p => !p)} title="Wyszukaj" className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-secondary-700 transition-colors">
                    <SearchIcon className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                </button>
                <button
                    onClick={handleExportToCsv}
                    className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-secondary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Eksportuj Stan"
                    disabled={filteredGoods.length === 0}
                >
                    <ArrowDownOnSquareIcon className="h-6 w-6 text-gray-600 dark:text-gray-300" />
                </button>
            </div>

            <div className="px-4 md:px-6 pt-4 flex-grow overflow-auto scrollbar-hide">
                {isSearchVisible && (
                    <div className="mb-4 animate-fadeIn">
                        <Input
                            label=""
                            id="receiving-search"
                            type="text"
                            placeholder="Wyszukaj po ID palety lub nazwie produktu..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            icon={<SearchIcon className="h-5 w-5 text-gray-400" />}
                            autoFocus
                        />
                    </div>
                )}

                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Poniżej znajdują się palety, które zostały wyprodukowane i opatrzone etykietą. Przenieś je do docelowego magazynu składowania.
                </p>
                {sortedItems.length === 0 ? (
                    <p className="text-gray-500 dark:text-gray-400 text-center py-8">Strefa przyjęć jest pusta.</p>
                ) : (
                    <>
                        {/* Mobile View */}
                         <div className="space-y-6 md:hidden">
                            {Object.entries(groupedByDate)
                                .sort(([dateA], [dateB]) => {
                                    if (dateA === 'Brak daty') return 1;
                                    if (dateB === 'Brak daty') return -1;
                                    return new Date(dateB).getTime() - new Date(dateA).getTime();
                                })
                                .map(([date, items]) => (
                                <div key={date}>
                                    <h3 className="px-2 py-1 font-semibold text-gray-800 dark:text-gray-200 bg-gray-100 dark:bg-secondary-700/50 rounded-md">
                                        Data Produkcji: {formatDate(date)}
                                    </h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                                        {(items as FinishedGoodItem[]).map((item: FinishedGoodItem) => (
                                            <PalletTile
                                                key={item.id}
                                                item={item}
                                                onClick={() => handleRowClick(item)}
                                            />
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Desktop View */}
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-secondary-700 text-sm hidden md:table">
                            <thead className="bg-gray-50 dark:bg-secondary-700/50">
                                <tr>
                                    <th className="px-3 py-2 text-left font-medium text-gray-500 dark:text-gray-300">ID Palety WG</th>
                                    <th className="px-3 py-2 text-left font-medium text-gray-500 dark:text-gray-300">Produkt</th>
                                    <th className="px-3 py-2 text-right font-medium text-gray-500 dark:text-gray-300">Ilość (kg)</th>
                                    <th className="px-3 py-2 text-left font-medium text-gray-500 dark:text-gray-300">Data Ważności</th>
                                    <th className="px-3 py-2 text-left font-medium text-gray-500 dark:text-gray-300">Akcje</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-secondary-800 divide-y divide-gray-200 dark:divide-secondary-700">
                                {sortedItems.map((item: any) => {
                                    if (item.isHeader) {
                                        return (
                                            <tr key={item.productionDate} className="bg-gray-100 dark:bg-secondary-700">
                                                <td colSpan={5} className="px-3 py-2 font-semibold text-gray-700 dark:text-gray-300">
                                                    Data Produkcji: {formatDate(item.productionDate)}
                                                </td>
                                            </tr>
                                        );
                                    }
                                    
                                    const fgItem = item;
                                    const palletDataForStatusCheck: any = {
                                        nrPalety: fgItem.id,
                                        nazwa: fgItem.productName,
                                        dataProdukcji: fgItem.productionDate,
                                        dataPrzydatnosci: fgItem.expiryDate,
                                        initialWeight: fgItem.quantityKg,
                                        currentWeight: fgItem.quantityKg,
                                    };
                                    // FIX: Removed extra `expiringPalletsDetails` argument from getExpiryStatus call. The function expects 3 arguments, but was given 4.
                                    const expiryStatus = getExpiryStatus(palletDataForStatusCheck, expiryWarningDays, expiryCriticalDays);
                                    const isNew = recentlySplitPalletIds?.includes(fgItem.id) || false;
                                    const allLabNotesText = getNotes(fgItem);
                                    const hasNotes = allLabNotesText.trim().length > 0;
                                    const documents = getDocuments(fgItem);
                                    const hasDocuments = documents.length > 0;

                                    return (
                                        <tr key={fgItem.id} className={`dark:hover:bg-secondary-700/50 hover:bg-slate-50 cursor-pointer ${isNew ? 'animate-flash-new' : ''}`} onClick={() => handleRowClick(fgItem)}>
                                            <td className="px-3 py-2 whitespace-nowrap font-mono">
                                                 <div className="flex items-center gap-2 group">
                                                    <span className="text-gray-900 dark:text-gray-200">{fgItem.finishedGoodPalletId || fgItem.id}</span>
                                                    {hasNotes && (
                                                        <button onClick={(e) => { e.stopPropagation(); modalHandlers.openTextDisplayModal(`Notatki dla ${fgItem.displayId}`, allLabNotesText); }} className="text-gray-400 hover:text-primary-500" title="Zobacz notatki"><ClipboardListIcon className="h-4 w-4"/></button>
                                                    )}
                                                    {hasDocuments && (
                                                        <button onClick={(e) => { e.stopPropagation(); modalHandlers.openDocumentListModal(`Dokumenty dla ${fgItem.displayId}`, documents); }} className="text-gray-400 hover:text-primary-500" title="Zobacz dokumenty"><DocumentTextIcon className="h-4 w-4"/></button>
                                                    )}
                                                    <button onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(fgItem.finishedGoodPalletId || fgItem.id); setCopiedId(fgItem.finishedGoodPalletId || fgItem.id); setTimeout(() => setCopiedId(null), 2000); }} title={copiedId === (fgItem.finishedGoodPalletId || fgItem.id) ? "Skopiowano!" : "Kopiuj ID"} className="p-1 rounded-full opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity">
                                                        {copiedId === (fgItem.finishedGoodPalletId || fgItem.id) ? <CheckCircleIcon className="h-4 w-4 text-green-500" /> : <ClipboardIcon className="h-4 w-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200" />}
                                                    </button>
                                                </div>
                                            </td>
                                            <td className="px-3 py-2 text-gray-900 dark:text-gray-200">{fgItem.productName}</td>
                                            <td className="px-3 py-2 text-right text-gray-900 dark:text-gray-200">{fgItem.quantityKg.toFixed(2)}</td>
                                            <td className={`px-3 py-2 whitespace-nowrap`}>
                                                {formatDate(fgItem.expiryDate)}
                                            </td>
                                            <td>
                                                <Button onClick={(e) => { e.stopPropagation(); handleMoveClick(fgItem); }} variant="secondary" className="text-xs" leftIcon={<ArrowRightIcon className="h-4 w-4" />}>
                                                    Przenieś
                                                </Button>
                                            </td>
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

export default MGW01ReceivingPage;
