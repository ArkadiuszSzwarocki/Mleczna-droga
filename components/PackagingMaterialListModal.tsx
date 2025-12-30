import React, { useState, useMemo } from 'react';
import { PackagingMaterialLogEntry } from '../types';
import { useAppContext } from './contexts/AppContext';
import Button from './Button';
import XCircleIcon from './icons/XCircleIcon';
import { useSortableData } from '../src/useSortableData';
import SortableHeader from './SortableHeader';
import { formatDate, getBlockInfo } from '../src/utils';
import ClipboardIcon from './icons/ClipboardIcon';
import CheckCircleIcon from './icons/CheckCircleIcon';

interface PackagingMaterialListModalProps {
    isOpen: boolean;
    onClose: () => void;
    productName: string | null;
    onItemSelect: (item: PackagingMaterialLogEntry) => void;
}

const PackagingMaterialListModal: React.FC<PackagingMaterialListModalProps> = ({ isOpen, onClose, productName, onItemSelect }) => {
    const { packagingMaterialsLog } = useAppContext();
    const [copiedId, setCopiedId] = useState<string | null>(null);

    const items = useMemo(() => {
        if (!productName) return [];
        return (packagingMaterialsLog || []).filter(p => p.productName === productName && p.currentLocation);
    }, [productName, packagingMaterialsLog]);

    const { items: sortedItems, requestSort, sortConfig } = useSortableData<PackagingMaterialLogEntry>(items, { key: 'dateAdded', direction: 'ascending' });

    const handleRowClick = (item: PackagingMaterialLogEntry) => {
        onItemSelect(item);
    };
    
    if (!isOpen || !productName) return null;

    return (
        <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center p-4 z-[150]" onClick={onClose}>
            <div className="bg-white dark:bg-secondary-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <header className="px-6 py-4 border-b dark:border-secondary-700 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-primary-700 dark:text-primary-300">Pozycje dla: {productName} ({items.length})</h2>
                    <Button onClick={onClose} variant="secondary" className="p-1.5"><XCircleIcon className="h-6 w-6"/></Button>
                </header>
                <div className="flex-grow overflow-y-auto p-6">
                    {sortedItems.length === 0 ? (
                        <p className="text-center text-gray-500 dark:text-gray-400 p-8">Brak pozycji dla tego produktu.</p>
                    ) : (
                        <table className="min-w-full text-sm">
                            <thead className="bg-slate-100 dark:bg-secondary-700 sticky top-0">
                                <tr>
                                    <SortableHeader columnKey="id" sortConfig={sortConfig} requestSort={requestSort}>ID</SortableHeader>
                                    <SortableHeader columnKey="productName" sortConfig={sortConfig} requestSort={requestSort}>Produkt</SortableHeader>
                                    <SortableHeader columnKey="currentLocation" sortConfig={sortConfig} requestSort={requestSort}>Lokalizacja</SortableHeader>
                                    <th className="px-3 py-2 text-left font-medium text-gray-500 dark:text-gray-300">Typ</th>
                                    <th className="px-3 py-2 text-left font-medium text-gray-500 dark:text-gray-300">Ważność</th>
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
                                                    <span className="font-mono">{item.id}</span>
                                                    <button onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(item.id); setCopiedId(item.id); setTimeout(() => setCopiedId(null), 2000); }} title={copiedId === item.id ? "Skopiowano!" : "Kopiuj ID"} className="p-1 rounded-full opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity">
                                                        {copiedId === item.id ? <CheckCircleIcon className="h-4 w-4 text-green-500" /> : <ClipboardIcon className="h-4 w-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200" />}
                                                    </button>
                                                </div>
                                            </td>
                                            <td className="px-3 py-2">{item.productName}</td>
                                            <td className="px-3 py-2 font-mono">{item.currentLocation}</td>
                                            <td className="px-3 py-2">
                                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200">
                                                    Opakowanie
                                                </span>
                                            </td>
                                            <td className="px-3 py-2 whitespace-nowrap">---</td>
                                            <td className="px-3 py-2 whitespace-nowrap">{isBlocked ? <span className="text-red-600 font-semibold">{reason}</span> : 'Dostępne'}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
                 <footer className="px-6 py-3 bg-gray-50 dark:bg-secondary-900/50 border-t dark:border-secondary-700 flex justify-end">
                    <Button onClick={onClose}>Zamknij</Button>
                </footer>
            </div>
        </div>
    );
};

export default PackagingMaterialListModal;