import React, { useState, useMemo } from 'react';
import { useWarehouseContext } from './contexts/WarehouseContext';
import { useAuth } from './contexts/AuthContext';
import { Permission, PalletBalance, PalletType, PalletTransaction } from '../types';
import Button from './Button';
import Alert from './Alert';
import TruckIcon from './icons/TruckIcon';
import PlusIcon from './icons/PlusIcon';
import SearchIcon from './icons/SearchIcon';
import { useSortableData } from '../src/useSortableData';
import SortableHeader from './SortableHeader';
import AddPalletTransactionModal from './AddPalletTransactionModal';
import { formatDate } from '../src/utils';
import ArrowPathIcon from './icons/ArrowPathIcon';
import ArchiveBoxIcon from './icons/ArchiveBoxIcon';

const ManagePalletBalancesPage: React.FC = () => {
    const { palletBalances, palletTransactions } = useWarehouseContext();
    const { checkPermission } = useAuth();
    
    const [searchTerm, setSearchTerm] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'balances' | 'history'>('balances');

    const canManage = checkPermission(Permission.MANAGE_DISPATCH_ORDERS) || checkPermission(Permission.MANAGE_DELIVERIES);

    const filteredBalances = useMemo(() => {
        if (!searchTerm.trim()) return palletBalances;
        const lowerSearch = searchTerm.toLowerCase();
        return palletBalances.filter(b => b.contractorLabel.toLowerCase().includes(lowerSearch));
    }, [palletBalances, searchTerm]);

    const { items: sortedBalances, requestSort, sortConfig } = useSortableData(filteredBalances, { key: 'contractorLabel', direction: 'ascending' });

    const totalInCirculation = useMemo(() => {
        const totals: Record<PalletType, number> = { EUR: 0, EPAL: 0, H1: 0, IND: 0, PLASTIC: 0 };
        palletBalances.forEach(b => {
            Object.entries(b.balances).forEach(([type, qty]) => {
                totals[type as PalletType] += qty as number;
            });
        });
        return totals;
    }, [palletBalances]);

    return (
        <div className="p-4 md:p-6 bg-white dark:bg-secondary-800 shadow-xl rounded-lg h-full flex flex-col">
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 border-b dark:border-secondary-600 pb-4 gap-4">
                <div className="flex items-center">
                    <ArchiveBoxIcon className="h-8 w-8 text-primary-600 dark:text-primary-400 mr-3" />
                    <div>
                        <h2 className="text-2xl font-semibold text-primary-700 dark:text-primary-300">Saldy Opakowań Zwrotnych</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Monitoruj rozliczenia palet EUR, EPAL i H1 u kontrahentów.</p>
                    </div>
                </div>
                {canManage && (
                    <Button onClick={() => setIsAddModalOpen(true)} leftIcon={<PlusIcon className="h-5 w-5"/>}>
                        Rejestruj Ruch Palet
                    </Button>
                )}
            </header>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                {Object.entries(totalInCirculation).map(([type, qty]) => (
                    <div key={type} className="p-3 bg-slate-50 dark:bg-secondary-900 rounded-lg border dark:border-secondary-700 text-center">
                        <p className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">{type}</p>
                        {/* FIX: Cast qty to any to apply comparison operators safely. */}
                        <p className={`text-xl font-bold ${(qty as any) < 0 ? 'text-red-500' : ((qty as any) > 0 ? 'text-green-500' : 'text-gray-400')}`}>
                            {(qty as any) > 0 ? `+${qty}` : qty}
                        </p>
                    </div>
                ))}
            </div>

            <div className="flex bg-gray-100 dark:bg-secondary-700 p-1 rounded-lg mb-4 w-fit">
                <button 
                    onClick={() => setActiveTab('balances')}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'balances' ? 'bg-white dark:bg-secondary-600 shadow text-primary-700 dark:text-primary-300' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-200'}`}
                >
                    Aktualne Salda
                </button>
                <button 
                    onClick={() => setActiveTab('history')}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'history' ? 'bg-white dark:bg-secondary-600 shadow text-primary-700 dark:text-primary-300' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-200'}`}
                >
                    Historia Transakcji
                </button>
            </div>

            <div className="flex-grow overflow-auto border dark:border-secondary-700 rounded-lg shadow-inner bg-slate-50/30">
                {activeTab === 'balances' ? (
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-secondary-700 text-sm">
                        <thead className="bg-gray-100 dark:bg-secondary-800 sticky top-0 z-10">
                            <tr>
                                <SortableHeader columnKey="contractorLabel" sortConfig={sortConfig} requestSort={requestSort}>Kontrahent</SortableHeader>
                                <th className="px-4 py-3 text-right">EUR</th>
                                <th className="px-4 py-3 text-right">EPAL</th>
                                <th className="px-4 py-3 text-right">H1</th>
                                <th className="px-4 py-3 text-right">IND</th>
                                <th className="px-4 py-3 text-right">Plastik</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-secondary-700 bg-white dark:bg-secondary-900">
                            {sortedBalances.map(b => (
                                <tr key={b.contractorValue} className="hover:bg-gray-50 dark:hover:bg-secondary-800/50 transition-colors">
                                    <td className="px-4 py-3 font-semibold text-gray-900 dark:text-gray-100">{b.contractorLabel}</td>
                                    {Object.entries(b.balances).map(([type, qty]) => (
                                        /* FIX: Cast qty to any to apply comparison operators safely. */
                                        <td key={type} className={`px-4 py-3 text-right font-mono ${(qty as any) < 0 ? 'text-red-600 font-bold' : ((qty as any) > 0 ? 'text-green-600 font-bold' : 'text-gray-400')}`}>
                                            {(qty as any) !== 0 ? ((qty as any) > 0 ? `+${qty}` : qty) : '0'}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-secondary-700 text-sm">
                        <thead className="bg-gray-100 dark:bg-secondary-800 sticky top-0 z-10">
                            <tr>
                                <th className="px-4 py-3 text-left">Data</th>
                                <th className="px-4 py-3 text-left">Kontrahent</th>
                                <th className="px-4 py-3 text-center">Ruch</th>
                                <th className="px-4 py-3 text-left">Typ</th>
                                <th className="px-4 py-3 text-right">Ilość</th>
                                <th className="px-4 py-3 text-left">Ref / Doc</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-secondary-700 bg-white dark:bg-secondary-900">
                            {palletTransactions.slice().reverse().map(tx => (
                                <tr key={tx.id}>
                                    <td className="px-4 py-3 text-xs">{formatDate(tx.timestamp, true)}</td>
                                    <td className="px-4 py-3 font-medium">{palletBalances.find(b => b.contractorValue === tx.contractorValue)?.contractorLabel || tx.contractorValue}</td>
                                    <td className="px-4 py-3 text-center">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${tx.direction === 'IN' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}`}>
                                            {tx.direction === 'IN' ? 'PRZYJĘCIE' : 'WYDANIE'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 font-mono">{tx.type}</td>
                                    <td className={`px-4 py-3 text-right font-bold ${tx.quantity < 0 ? 'text-orange-600' : 'text-green-600'}`}>
                                        {Math.abs(tx.quantity)}
                                    </td>
                                    <td className="px-4 py-3 text-xs text-gray-500">{tx.referenceDoc || '---'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            <AddPalletTransactionModal 
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
            />
        </div>
    );
};

export default ManagePalletBalancesPage;