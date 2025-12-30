
import React, { useState, useMemo, useEffect } from 'react';
import { useWarehouseContext } from './contexts/WarehouseContext';
import { useAuth } from './contexts/AuthContext';
import { Permission, Customer } from '../types';
import Button from './Button';
import Input from './Input';
import Alert from './Alert';
import UserGroupIcon from './icons/UserGroupIcon';
import PlusIcon from './icons/PlusIcon';
import TrashIcon from './icons/TrashIcon';
import SearchIcon from './icons/SearchIcon';
import ConfirmationModal from './ConfirmationModal';
import { useSortableData } from '../src/useSortableData';
import SortableHeader from './SortableHeader';
import CustomerDetailModal from './CustomerDetailModal';

const ManageCustomersPage: React.FC = () => {
    const { customers, handleAddCustomer, handleDeleteCustomer } = useWarehouseContext();
    const { checkPermission } = useAuth();
    
    const [searchTerm, setSearchTerm] = useState('');
    const [newCustomerName, setNewCustomerName] = useState('');
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info', message: string } | null>(null);
    const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

    const canEdit = checkPermission(Permission.MANAGE_SYSTEM_SETTINGS) || checkPermission(Permission.PLAN_DISPATCH_ORDERS);

    useEffect(() => {
        if (feedback) {
            const timer = setTimeout(() => setFeedback(null), 4000);
            return () => clearTimeout(timer);
        }
    }, [feedback]);

    const filteredCustomers = useMemo(() => {
        if (!searchTerm.trim()) return customers;
        const lowerSearch = searchTerm.toLowerCase();
        return customers.filter(c => 
            c.label.toLowerCase().includes(lowerSearch) || 
            String(c.value).toLowerCase().includes(lowerSearch) ||
            (c.nip && c.nip.includes(lowerSearch))
        );
    }, [customers, searchTerm]);

    const { items: sortedCustomers, requestSort, sortConfig } = useSortableData(filteredCustomers, { key: 'label', direction: 'ascending' });

    const handleAddClick = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCustomerName.trim()) return;
        
        const result = handleAddCustomer(newCustomerName.trim());
        if (result.success) {
            setNewCustomerName('');
            setFeedback({ type: 'success', message: result.message });
        } else {
            setFeedback({ type: 'error', message: result.message });
        }
    };

    const confirmDelete = () => {
        if (customerToDelete) {
            const result = handleDeleteCustomer(String(customerToDelete.value));
            setFeedback({ type: 'info', message: result.message });
            setCustomerToDelete(null);
        }
    };

    return (
        <div className="p-4 md:p-6 bg-white dark:bg-secondary-800 shadow-xl rounded-lg h-full flex flex-col">
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 border-b dark:border-secondary-600 pb-4 gap-4">
                <div className="flex items-center">
                    <UserGroupIcon className="h-8 w-8 text-primary-600 dark:text-primary-400 mr-3" />
                    <div>
                        <h2 className="text-2xl font-semibold text-primary-700 dark:text-primary-300">Baza Klientów (Odbiorców)</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Zarządzaj listą kontrahentów, do których wysyłasz towar.</p>
                    </div>
                </div>
            </header>

            {feedback && <div className="mb-4 animate-fadeIn"><Alert type={feedback.type} message={feedback.message} /></div>}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                <section className="lg:col-span-1">
                    <div className="p-4 border dark:border-secondary-700 rounded-lg bg-slate-50 dark:bg-secondary-900 shadow-sm">
                        <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
                            <PlusIcon className="h-5 w-5 text-primary-500" />
                            Dodaj Klienta
                        </h3>
                        <form onSubmit={handleAddClick} className="space-y-4">
                            <Input 
                                label="Nazwa klienta" 
                                id="new-customer" 
                                value={newCustomerName} 
                                onChange={e => setNewCustomerName(e.target.value)} 
                                placeholder="np. Rol-Pas Sp. z o.o."
                                disabled={!canEdit}
                            />
                            <Button 
                                type="submit" 
                                className="w-full justify-center" 
                                disabled={!canEdit || !newCustomerName.trim()}
                                leftIcon={<PlusIcon className="h-5 w-5"/>}
                            >
                                Dodaj Klienta
                            </Button>
                        </form>
                    </div>
                </section>

                <section className="lg:col-span-2 flex flex-col">
                    <div className="mb-4">
                        <Input 
                            label="" 
                            placeholder="Wyszukaj po nazwie lub NIP..." 
                            value={searchTerm} 
                            onChange={e => setSearchTerm(e.target.value)} 
                            icon={<SearchIcon className="h-5 w-5 text-gray-400"/>}
                        />
                    </div>

                    <div className="flex-grow overflow-auto border dark:border-secondary-700 rounded-lg bg-white dark:bg-secondary-900 shadow-sm">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-secondary-700 text-sm">
                            <thead className="bg-gray-50 dark:bg-secondary-800 sticky top-0 z-10">
                                <tr>
                                    <SortableHeader columnKey="label" sortConfig={sortConfig} requestSort={requestSort}>Klient</SortableHeader>
                                    <SortableHeader columnKey="nip" sortConfig={sortConfig} requestSort={requestSort}>NIP</SortableHeader>
                                    <SortableHeader columnKey="city" sortConfig={sortConfig} requestSort={requestSort}>Miasto</SortableHeader>
                                    <th className="px-4 py-3 text-right font-medium text-gray-500 dark:text-gray-300">Akcje</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-secondary-700">
                                {sortedCustomers.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-4 py-8 text-center text-gray-500 italic">Brak klientów spełniających kryteria.</td>
                                    </tr>
                                ) : (
                                    sortedCustomers.map(c => (
                                        <tr 
                                            key={c.value} 
                                            className="hover:bg-gray-50 dark:hover:bg-secondary-800/50 cursor-pointer transition-colors"
                                            onClick={() => setSelectedCustomer(c)}
                                        >
                                            <td className="px-4 py-3 font-semibold text-gray-900 dark:text-gray-100">{c.label}</td>
                                            <td className="px-4 py-3 font-mono text-xs text-gray-500 dark:text-gray-400 uppercase">{c.nip || '---'}</td>
                                            <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{c.city || '---'}</td>
                                            <td className="px-4 py-3 text-right">
                                                <div className="flex justify-end gap-2" onClick={e => e.stopPropagation()}>
                                                    <Button 
                                                        onClick={() => setCustomerToDelete(c)} 
                                                        variant="secondary" 
                                                        className="p-1.5 text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-900/40 dark:hover:bg-red-800"
                                                        disabled={!canEdit}
                                                        title="Usuń klienta"
                                                    >
                                                        <TrashIcon className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>

            {selectedCustomer && (
                <CustomerDetailModal 
                    isOpen={!!selectedCustomer}
                    onClose={() => setSelectedCustomer(null)}
                    customer={selectedCustomer}
                />
            )}

            {customerToDelete && (
                <ConfirmationModal 
                    isOpen={!!customerToDelete}
                    onClose={() => setCustomerToDelete(null)}
                    onConfirm={confirmDelete}
                    title="Potwierdź Usunięcie Klienta"
                    message={
                        <span>
                            Czy na pewno chcesz usunąć klienta <strong className="font-bold text-gray-900 dark:text-white">{customerToDelete.label}</strong> z bazy?
                        </span>
                    }
                    confirmButtonText="Tak, usuń"
                />
            )}
        </div>
    );
};

export default ManageCustomersPage;
