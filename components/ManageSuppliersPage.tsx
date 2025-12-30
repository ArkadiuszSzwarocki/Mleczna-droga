
import React, { useState, useMemo, useEffect } from 'react';
import { useWarehouseContext } from './contexts/WarehouseContext';
import { useAuth } from './contexts/AuthContext';
import { Permission, Supplier } from '../types';
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
import SupplierDetailModal from './SupplierDetailModal';

const ManageSuppliersPage: React.FC = () => {
    const { suppliers, handleAddSupplier, handleDeleteSupplier } = useWarehouseContext();
    const { checkPermission } = useAuth();
    
    const [searchTerm, setSearchTerm] = useState('');
    const [newSupplierName, setNewSupplierName] = useState('');
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info', message: string } | null>(null);
    const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(null);
    const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);

    const canEdit = checkPermission(Permission.MANAGE_SYSTEM_SETTINGS) || checkPermission(Permission.MANAGE_DELIVERIES);

    useEffect(() => {
        if (feedback) {
            const timer = setTimeout(() => setFeedback(null), 4000);
            return () => clearTimeout(timer);
        }
    }, [feedback]);

    const filteredSuppliers = useMemo(() => {
        if (!searchTerm.trim()) return suppliers;
        const lowerSearch = searchTerm.toLowerCase();
        return suppliers.filter(s => 
            s.label.toLowerCase().includes(lowerSearch) || 
            String(s.value).toLowerCase().includes(lowerSearch) ||
            (s.nip && s.nip.includes(lowerSearch))
        );
    }, [suppliers, searchTerm]);

    const { items: sortedSuppliers, requestSort, sortConfig } = useSortableData(filteredSuppliers, { key: 'label', direction: 'ascending' });

    const handleAddClick = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newSupplierName.trim()) return;
        
        const result = handleAddSupplier(newSupplierName.trim());
        if (result.success) {
            setNewSupplierName('');
            setFeedback({ type: 'success', message: result.message });
        } else {
            setFeedback({ type: 'error', message: result.message });
        }
    };

    const confirmDelete = () => {
        if (supplierToDelete) {
            const result = handleDeleteSupplier(String(supplierToDelete.value));
            setFeedback({ type: 'info', message: result.message });
            setSupplierToDelete(null);
        }
    };

    return (
        <div className="p-4 md:p-6 bg-white dark:bg-secondary-800 shadow-xl rounded-lg h-full flex flex-col">
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 border-b dark:border-secondary-600 pb-4 gap-4">
                <div className="flex items-center">
                    <UserGroupIcon className="h-8 w-8 text-primary-600 dark:text-primary-400 mr-3" />
                    <div>
                        <h2 className="text-2xl font-semibold text-primary-700 dark:text-primary-300">Baza Dostawców</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Zarządzaj listą kontrahentów i ich kartotekami.</p>
                    </div>
                </div>
            </header>

            {feedback && <div className="mb-4 animate-fadeIn"><Alert type={feedback.type} message={feedback.message} /></div>}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                <section className="lg:col-span-1">
                    <div className="p-4 border dark:border-secondary-700 rounded-lg bg-slate-50 dark:bg-secondary-900 shadow-sm">
                        <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
                            <PlusIcon className="h-5 w-5 text-primary-500" />
                            Szybkie Dodawanie
                        </h3>
                        <form onSubmit={handleAddClick} className="space-y-4">
                            <Input 
                                label="Nazwa firmy" 
                                id="new-supplier" 
                                value={newSupplierName} 
                                onChange={e => setNewSupplierName(e.target.value)} 
                                placeholder="np. Mlekovita Sp. z o.o."
                                disabled={!canEdit}
                            />
                            <Button 
                                type="submit" 
                                className="w-full justify-center" 
                                disabled={!canEdit || !newSupplierName.trim()}
                                leftIcon={<PlusIcon className="h-5 w-5"/>}
                            >
                                Dodaj Szybko
                            </Button>
                        </form>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-4 italic">
                            Wskazówka: Kliknij w wiersz tabeli, aby uzupełnić NIP i adres kontrahenta.
                        </p>
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
                                    <SortableHeader columnKey="label" sortConfig={sortConfig} requestSort={requestSort}>Dostawca</SortableHeader>
                                    <SortableHeader columnKey="nip" sortConfig={sortConfig} requestSort={requestSort}>NIP</SortableHeader>
                                    <SortableHeader columnKey="city" sortConfig={sortConfig} requestSort={requestSort}>Miasto</SortableHeader>
                                    <th className="px-4 py-3 text-right font-medium text-gray-500 dark:text-gray-300">Akcje</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-secondary-700">
                                {sortedSuppliers.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-4 py-8 text-center text-gray-500 italic">Brak dostawców spełniających kryteria.</td>
                                    </tr>
                                ) : (
                                    sortedSuppliers.map(s => (
                                        <tr 
                                            key={s.value} 
                                            className="hover:bg-gray-50 dark:hover:bg-secondary-800/50 cursor-pointer transition-colors"
                                            onClick={() => setSelectedSupplier(s)}
                                        >
                                            <td className="px-4 py-3 font-semibold text-gray-900 dark:text-gray-100">{s.label}</td>
                                            <td className="px-4 py-3 font-mono text-xs text-gray-500 dark:text-gray-400 uppercase">{s.nip || '---'}</td>
                                            <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{s.city || '---'}</td>
                                            <td className="px-4 py-3 text-right">
                                                <div className="flex justify-end gap-2" onClick={e => e.stopPropagation()}>
                                                    <Button 
                                                        onClick={() => setSupplierToDelete(s)} 
                                                        variant="secondary" 
                                                        className="p-1.5 text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-900/40 dark:hover:bg-red-800"
                                                        disabled={!canEdit || s.value === 'transfer_wewnetrzny'}
                                                        title={s.value === 'transfer_wewnetrzny' ? "Rola systemowa - nieusuwalna" : "Usuń dostawcę"}
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

            {selectedSupplier && (
                <SupplierDetailModal 
                    isOpen={!!selectedSupplier}
                    onClose={() => setSelectedSupplier(null)}
                    supplier={selectedSupplier}
                />
            )}

            {supplierToDelete && (
                <ConfirmationModal 
                    isOpen={!!supplierToDelete}
                    onClose={() => setSupplierToDelete(null)}
                    onConfirm={confirmDelete}
                    title="Potwierdź Usunięcie Dostawcy"
                    message={
                        <span>
                            Czy na pewno chcesz usunąć dostawcę <strong className="font-bold text-gray-900 dark:text-white">{supplierToDelete.label}</strong> z bazy?
                        </span>
                    }
                    confirmButtonText="Tak, usuń"
                />
            )}
        </div>
    );
};

export default ManageSuppliersPage;
