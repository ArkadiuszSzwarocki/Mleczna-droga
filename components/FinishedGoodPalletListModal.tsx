
import React, { useState, useMemo } from 'react';
import { FinishedGoodItem } from '../types';
import { useProductionContext } from './contexts/ProductionContext';
import { useUIContext } from './contexts/UIContext';
import Button from './Button';
import XCircleIcon from './icons/XCircleIcon';
import { useSortableData } from '../src/useSortableData';
import SortableHeader from './SortableHeader';
import { formatDate, getFinishedGoodStatusLabel, getBlockInfo } from '../src/utils';
import ClipboardIcon from './icons/ClipboardIcon';
import CheckCircleIcon from './icons/CheckCircleIcon';
import Input from './Input';
import SearchIcon from './icons/SearchIcon';

interface FinishedGoodPalletListModalProps {
    isOpen: boolean;
    onClose: () => void;
    productName: string | null;
}

const FinishedGoodPalletListModal: React.FC<FinishedGoodPalletListModalProps> = ({ isOpen, onClose, productName }) => {
    const { finishedGoodsList } = useProductionContext();
    const { modalHandlers } = useUIContext();
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const items = useMemo(() => {
        if (!productName) return [];
        let filtered = (finishedGoodsList || []).filter(p => p.productName === productName && (p.status === 'available' || p.status === 'blocked'));
        if (searchTerm.trim()) {
            const lower = searchTerm.toLowerCase();
            filtered = filtered.filter(p => (p.displayId || p.id).toLowerCase().includes(lower));
        }
        return filtered;
    }, [productName, finishedGoodsList, searchTerm]);

    const { items: sortedItems, requestSort, sortConfig } = useSortableData<FinishedGoodItem>(items, { key: 'expiryDate', direction: 'ascending' });

    const handleRowClick = (item: FinishedGoodItem) => {
        onClose();
        modalHandlers.openFinishedGoodDetailModal(item);
    };
    
    if (!isOpen || !productName) return null;

    return (
        <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center p-4 z-[150]" onClick={onClose}>
            <div className="bg-white dark:bg-secondary-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <header className="px-6 py-4 border-b dark:border-secondary-700 flex justify-between items-center shrink-0">
                    <h2 className="text-xl font-bold text-primary-700 dark:text-primary-300">Palety dla: {productName} ({items.length})</h2>
                    <Button onClick={onClose} variant="secondary" className="p-1.5"><XCircleIcon className="h-6 w-6"/></Button>
                </header>
                <div className="p-4 border-b dark:border-secondary-700 shrink-0">
                    <Input
                        label=""
                        placeholder="Szukaj po ID palety..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        icon={<SearchIcon className="h-5 w-5 text-gray-400" />}
                    />
                </div>
                <div className="flex-grow overflow-y-auto p-6 scrollbar-hide">
                    {sortedItems.length === 0 ? (
                        <p className="text-center text-gray-500 dark:text-gray-400 p-8">Brak palet spełniających kryteria.</p>
                    ) : (
                        <table className="min-w-full text-sm">
                            <thead className="bg-slate-100 dark:bg-secondary-700 sticky top-0">
                                <tr>
                                    <SortableHeader columnKey="displayId" sortConfig={sortConfig} requestSort={requestSort}>ID Palety</SortableHeader>
                                    <SortableHeader columnKey="currentLocation" sortConfig={sortConfig} requestSort={requestSort}>Lokalizacja</SortableHeader>
                                    <SortableHeader columnKey="quantityKg" sortConfig={sortConfig} requestSort={requestSort} className="justify-end">Waga</SortableHeader>
                                    <SortableHeader columnKey="expiryDate" sortConfig={sortConfig} requestSort={requestSort}>Ważność</SortableHeader>
                                    <SortableHeader columnKey="status" sortConfig={sortConfig} requestSort={requestSort}>Status</SortableHeader>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-secondary-700">
                                {sortedItems.map(item => {
                                    const { isBlocked, reason } = getBlockInfo(item);
                                    return (
                                        <tr key={item.id} onClick={() => handleRowClick(item)} className="hover:bg-primary-50 dark:hover:bg-secondary-700 cursor-pointer">
                                            <td className="px-3 py-2 whitespace-nowrap">
                                                <div className="flex items-center gap-2 group">
                                                    <span className="font-mono">{item.displayId || item.id}</span>
                                                    <button onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(item.displayId || item.id); setCopiedId(item.displayId || item.id); setTimeout(() => setCopiedId(null), 2000); }} title={copiedId === (item.displayId || item.id) ? "Skopiowano!" : "Kopiuj ID"} className="p-1 rounded-full opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity">
                                                        {copiedId === (item.displayId || item.id) ? <CheckCircleIcon className="h-4 w-4 text-green-500" /> : <ClipboardIcon className="h-4 w-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200" />}
                                                    </button>
                                                </div>
                                            </td>
                                            <td className="px-3 py-2 font-mono">{item.currentLocation}</td>
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
                    )}
                </div>
                 <footer className="px-6 py-3 bg-gray-50 dark:bg-secondary-900/50 border-t dark:border-secondary-700 flex justify-end shrink-0">
                    <Button onClick={onClose}>Zamknij</Button>
                </footer>
            </div>
        </div>
    );
};

// FIX: Added missing default export to support lazy loading.
export default FinishedGoodPalletListModal;
