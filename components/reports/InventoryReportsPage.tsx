
import React, { useMemo, useState } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { InventorySession, View } from '../../types';
import { formatDate } from '../../src/utils';
import { useSortableData } from '../../src/useSortableData';
import SortableHeader from '../SortableHeader';
import Button from '../Button';
import Input from '../Input';
import Alert from '../Alert';
import ListBulletIcon from '../icons/ListBulletIcon';
import DocumentTextIcon from '../icons/DocumentTextIcon';
import SearchIcon from '../icons/SearchIcon';
import ArrowRightIcon from '../icons/ArrowRightIcon';
import { useUIContext } from '../contexts/UIContext';

const InventoryReportsPage: React.FC = () => {
    const { inventorySessions } = useAppContext();
    const { handleSetView } = useUIContext();
    const [searchTerm, setSearchTerm] = useState('');

    const completedSessions = useMemo(() => 
        (inventorySessions || []).filter(s => s.status === 'completed' || s.status === 'cancelled'),
    [inventorySessions]);

    const filteredSessions = useMemo(() => {
        if (!searchTerm) return completedSessions;
        const lowerTerm = searchTerm.toLowerCase();
        return completedSessions.filter(s => 
            s.name.toLowerCase().includes(lowerTerm) || 
            s.createdBy.toLowerCase().includes(lowerTerm) ||
            s.id.toLowerCase().includes(lowerTerm)
        );
    }, [completedSessions, searchTerm]);

    const { items: sortedSessions, requestSort, sortConfig } = useSortableData<InventorySession>(filteredSessions, { key: 'createdAt', direction: 'descending' });

    return (
        <div className="p-4 md:p-6 bg-white dark:bg-secondary-800 shadow-xl rounded-lg h-full flex flex-col">
            <header className="flex flex-col sm:flex-row justify-between items-center mb-6 border-b dark:border-secondary-600 pb-3 gap-4">
                <div className="flex items-center">
                    <DocumentTextIcon className="h-8 w-8 text-primary-600 dark:text-primary-400 mr-3" />
                    <div>
                        <h2 className="text-2xl font-semibold text-primary-700 dark:text-primary-300">Archiwum Inwentaryzacji</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Historia zakończonych i anulowanych spisów.</p>
                    </div>
                </div>
                <div className="w-full sm:w-64">
                    <Input 
                        label=""
                        placeholder="Szukaj sesji..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        icon={<SearchIcon className="h-5 w-5 text-gray-400"/>}
                    />
                </div>
            </header>

            <div className="flex-grow overflow-auto">
                {sortedSessions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-center">
                        <ListBulletIcon className="h-16 w-16 text-gray-300 dark:text-gray-600 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-200">Brak raportów</h3>
                        <p className="text-gray-500 dark:text-gray-400">Nie znaleziono zakończonych inwentaryzacji.</p>
                    </div>
                ) : (
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-secondary-700 text-sm">
                        <thead className="bg-gray-100 dark:bg-secondary-700">
                            <tr>
                                <SortableHeader columnKey="name" sortConfig={sortConfig} requestSort={requestSort}>Nazwa Sesji</SortableHeader>
                                <SortableHeader columnKey="createdAt" sortConfig={sortConfig} requestSort={requestSort}>Data Utworzenia</SortableHeader>
                                <SortableHeader columnKey="createdBy" sortConfig={sortConfig} requestSort={requestSort}>Utworzył</SortableHeader>
                                <SortableHeader columnKey="status" sortConfig={sortConfig} requestSort={requestSort}>Status</SortableHeader>
                                <th className="px-4 py-3 text-right">Wyniki</th>
                                <th className="px-4 py-3 text-right">Akcje</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-secondary-800 divide-y divide-gray-200 dark:divide-secondary-700">
                            {sortedSessions.map(session => (
                                <tr key={session.id} className="hover:bg-gray-50 dark:hover:bg-secondary-700/50">
                                    <td className="px-4 py-3">
                                        <p className="font-semibold text-gray-900 dark:text-gray-100">{session.name}</p>
                                        <p className="text-xs text-gray-500 font-mono">{session.id}</p>
                                    </td>
                                    <td className="px-4 py-3">{formatDate(session.createdAt, true)}</td>
                                    <td className="px-4 py-3">{session.createdBy}</td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                            session.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                                        }`}>
                                            {session.status === 'completed' ? 'Zakończona' : 'Anulowana'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-right font-mono text-xs">
                                        {session.status === 'completed' && session.resolvedDiscrepancies ? (
                                            <>
                                                <span className="text-green-600">{session.resolvedDiscrepancies.length}</span> wyjaśnień
                                            </>
                                        ) : '-'}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        {session.status === 'completed' && (
                                            <Button 
                                                onClick={() => handleSetView(View.InventoryReview, { sessionId: session.id })} 
                                                variant="secondary" 
                                                className="text-xs" 
                                                leftIcon={<ArrowRightIcon className="h-4 w-4"/>}
                                            >
                                                Szczegóły
                                            </Button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default InventoryReportsPage;
