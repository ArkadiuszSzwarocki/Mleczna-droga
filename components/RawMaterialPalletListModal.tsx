import React, { useState, useMemo } from 'react';
import { RawMaterialLogEntry } from '../types';
import { useWarehouseContext } from './contexts/WarehouseContext';
import { useUIContext } from './contexts/UIContext';
import Button from './Button';
import XCircleIcon from './icons/XCircleIcon';
import { useSortableData } from '../src/useSortableData';
import SortableHeader from './SortableHeader';
import { formatDate, getBlockInfo } from '../src/utils';
import ClipboardIcon from './icons/ClipboardIcon';
import CheckCircleIcon from './icons/CheckCircleIcon';
import Input from './Input';
import SearchIcon from './icons/SearchIcon';

interface RawMaterialPalletListModalProps {
    isOpen: boolean;
    onClose: () => void;
    productName: string | null;
}

const RawMaterialPalletListModal: React.FC<RawMaterialPalletListModalProps> = ({ isOpen, onClose, productName }) => {
    const { rawMaterialsLogList } = useWarehouseContext();
    const { modalHandlers } = useUIContext();
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const items = useMemo(() => {
        if (!productName) return [];
        let filtered = (rawMaterialsLogList || []).filter(p => p.palletData.nazwa === productName && p.currentLocation);
        if (searchTerm.trim()) {
            const lower = searchTerm.toLowerCase();
            filtered = filtered.filter(p => p.palletData.nrPalety.toLowerCase().includes(lower));
        }
        return filtered;
    }, [productName, rawMaterialsLogList, searchTerm]);

    const { items: sortedItems, requestSort, sortConfig } = useSortableData<RawMaterialLogEntry>(items, { key: 'palletData.dataPrzydatnosci', direction: 'ascending' });

    const handleRowClick = (item: RawMaterialLogEntry) => {
        onClose();
        modalHandlers.openPalletDetailModal(item);
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
                                    <SortableHeader columnKey="palletData.nrPalety" sortConfig={sortConfig} requestSort={requestSort}>ID Palety</SortableHeader>
                                    <SortableHeader columnKey="currentLocation" sortConfig={sortConfig} requestSort={requestSort}>Lokalizacja</SortableHeader>
                                    <SortableHeader columnKey="palletData.currentWeight" sortConfig={sortConfig} requestSort={requestSort} className="justify-end">Waga</SortableHeader>
                                    <SortableHeader columnKey="palletData.dataPrzydatnosci" sortConfig={sortConfig} requestSort={requestSort}>Ważność</SortableHeader>
                                    <th className="px-3 py-2 text-left font-medium text-gray-500 dark:text-gray-300">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-secondary-700">
                                {sortedItems.map(item => {
                                    const { isBlocked, reason } = getBlockInfo(item);
                                    return (
                                        <tr key={item.id} onClick={() => handleRowClick(item)} className="hover:bg-primary-50 dark:hover:bg-secondary-700 cursor-pointer">
                                            <td className="px-3 py-2 whitespace-nowrap">
                                                <div className="flex items-center gap-2 group">
                                                    <span className="font-mono">{item.palletData.nrPalety}</span>
                                                    <button onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(item.palletData.nrPalety); setCopiedId(item.palletData.nrPalety); setTimeout(() => setCopiedId(null), 2000); }} title={copiedId === item.palletData.nrPalety ? "Skopiowano!" : "Kopiuj ID"} className="p-1 rounded-full opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity">
                                                        {copiedId === item.palletData.nrPalety ? <CheckCircleIcon className="h-4 w-4 text-green-500" /> : <ClipboardIcon className="h-4 w-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200" />}
                                                    </button>
                                                </div>
                                            </td>
                                            <td className="px-3 py-2 font-mono">{item.currentLocation}</td>
                                            <td className="px-3 py-2 text-right">{item.palletData.currentWeight.toFixed(0)} kg</td>
                                            <td className="px-3 py-2 whitespace-nowrap">{formatDate(item.palletData.dataPrzydatnosci)}</td>
                                            <td className="px-3 py-2 whitespace-nowrap">{isBlocked ? <span className="text-red-600 font-semibold">{reason}</span> : 'Dostępna'}</td>
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

// FIX: Added missing default export
export default RawMaterialPalletListModal;