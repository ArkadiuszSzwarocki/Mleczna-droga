import React, { useState, useMemo } from 'react';
import Button from './Button';
import Input from './Input';
import Select from './Select';
import Alert from './Alert';
import CubeIcon from './icons/CubeIcon';
import PlusIcon from './icons/PlusIcon';
import TrashIcon from './icons/TrashIcon';
import ConfirmationModal from './ConfirmationModal';
import { useSortableData } from '../src/useSortableData';
import SortableHeader from './SortableHeader';
import { useWarehouseContext } from './contexts/WarehouseContext';
import { API_BASE_URL } from '../constants';

// FIX: Changed Product['type'] to any
const getProductTypeLabel = (type: any) => {
    switch (type) {
        case 'raw_material': return 'Surowiec';
        case 'packaging': return 'Opakowanie';
        case 'finished_good': return 'Wyrób Gotowy';
        default: return type;
    }
};

const ProductManagementPage: React.FC = () => {
    const { allProducts, handleAddProduct, handleDeleteProduct, refreshProducts } = useWarehouseContext() as any;

    const [newProductName, setNewProductName] = useState('');
    const [newProductType, setNewProductType] = useState<'raw_material' | 'packaging' | 'finished_good'>('raw_material');
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
    // FIX: Changed Product to any
    const [productToDelete, setProductToDelete] = useState<any | null>(null);

    // FIX: Changed Product to any
    const { items: sortedProducts, requestSort, sortConfig } = useSortableData<any>(allProducts || [], { key: 'name', direction: 'ascending' });

    const handleAddClick = () => {
        setFeedback(null);
        if (!newProductName.trim()) {
            setFeedback({ type: 'error', message: 'Nazwa produktu nie może być pusta.' });
            return;
        }
        if (!handleAddProduct) {
            setFeedback({ type: 'error', message: 'Funkcja niedostępna.'});
            return;
        }
        const result = handleAddProduct({ name: newProductName.trim(), type: newProductType });
        setFeedback({ type: result.success ? 'success' : 'error', message: result.message });
        if (result.success) {
            setNewProductName('');
            setNewProductType('raw_material');
        }
    };
    
    // FIX: Changed Product to any
    const handleDeleteClick = (product: any) => {
        setProductToDelete(product);
    };

    const handleConfirmDelete = () => {
        if (productToDelete && handleDeleteProduct) {
            const result = handleDeleteProduct(productToDelete.name);
            setFeedback({ type: result.success ? 'success' : 'error', message: result.message });
            setProductToDelete(null);
        }
    };
    
    const productTypeOptions = [
        { value: 'raw_material', label: 'Surowiec' },
        { value: 'packaging', label: 'Opakowanie' },
        { value: 'finished_good', label: 'Wyrób Gotowy' },
    ];

    const [importFile, setImportFile] = useState<File | null>(null);
    const [importing, setImporting] = useState(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) setImportFile(e.target.files[0]);
    };

    const uploadCsv = async (endpoint: string) => {
        if (!importFile) return setFeedback({ type: 'error', message: 'Wybierz plik CSV lub PDF.' });
        setImporting(true);
        try {
            const form = new FormData();
            form.append('file', importFile);
            const res = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: 'POST',
                body: form
            });
            const data = await res.json();
            if (res.ok) setFeedback({ type: 'success', message: `Zaimportowano ${data.inserted}/${data.total}` });
            else setFeedback({ type: 'error', message: data.error || 'Błąd importu' });
            // refresh products if importing products
            if (endpoint === '/api/import-products' && refreshProducts) await refreshProducts();
        } catch (err: any) {
            setFeedback({ type: 'error', message: err.message || 'Błąd importu' });
        } finally {
            setImporting(false);
            setImportFile(null);
        }
    };

    return (
        <>
            <div className="p-4 md:p-6 bg-white dark:bg-secondary-800 shadow-xl rounded-lg">
                <header className="flex items-center mb-6 border-b dark:border-secondary-600 pb-4">
                    <CubeIcon className="h-8 w-8 text-primary-600 dark:text-primary-400 mr-3" />
                    <h2 className="text-2xl font-semibold text-primary-700 dark:text-primary-300">Zarządzanie Katalogiem Produktów</h2>
                </header>

                {feedback && <div className="mb-4"><Alert type={feedback.type} message={feedback.message} /></div>}

                <section className="mb-6 p-4 border dark:border-secondary-700 rounded-lg bg-slate-50 dark:bg-secondary-900">
                    <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-3">Dodaj Nowy Produkt</h3>
                    <form onSubmit={(e) => { e.preventDefault(); handleAddClick(); }} className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-4 items-end">
                        <Input 
                            label="Nazwa produktu" 
                            id="new-product-name"
                            value={newProductName}
                            onChange={e => setNewProductName(e.target.value)}
                            placeholder="np. Laktoza, Worek papierowy 25kg"
                        />
                        <Select 
                            label="Typ produktu"
                            id="new-product-type"
                            options={productTypeOptions}
                            value={newProductType}
                            onChange={e => setNewProductType(e.target.value as 'raw_material' | 'packaging' | 'finished_good')}
                        />
                        <Button type="submit" leftIcon={<PlusIcon className="h-5 w-5"/>} disabled={!newProductName.trim()}>Dodaj</Button>
                    </form>
                </section>

                <section className="mt-6 p-4 border dark:border-secondary-700 rounded-lg bg-slate-50 dark:bg-secondary-900">
                    <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-3">Import CSV (surowce / receptury)</h3>
                    <div className="flex items-center gap-3">
                        <input type="file" accept=".csv,.txt" onChange={handleFileChange} />
                        <Button variant="secondary" onClick={() => uploadCsv('/api/import-products')} disabled={importing || !importFile}>Importuj surowce</Button>
                        <Button variant="secondary" onClick={() => uploadCsv('/api/import-recipes')} disabled={importing || !importFile}>Importuj receptury</Button>
                    </div>
                    <p className="mt-2 text-xs text-slate-400">Plik CSV: każda linia: <code>KOD GRUPA</code> lub <code>nazwa;kod1:qty,kod2:qty</code> dla receptur.</p>
                </section>

                <section>
                    <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-3">Lista Produktów ({sortedProducts.length})</h3>
                    {sortedProducts.length === 0 ? (
                        <div className="text-center py-10 bg-slate-50 dark:bg-secondary-900/50 rounded-lg">
                            <CubeIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
                            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-200">Brak zdefiniowanych produktów</h3>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Użyj formularza powyżej, aby dodać pierwszy produkt do katalogu.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-secondary-700 text-sm">
                                <thead className="bg-gray-100 dark:bg-secondary-700">
                                    <tr>
                                        <SortableHeader columnKey="name" sortConfig={sortConfig} requestSort={requestSort} thClassName="px-4 py-2 text-left font-semibold text-gray-600 dark:text-gray-300">Nazwa Produktu</SortableHeader>
                                        <SortableHeader columnKey="type" sortConfig={sortConfig} requestSort={requestSort} thClassName="px-4 py-2 text-left font-semibold text-gray-600 dark:text-gray-300">Typ</SortableHeader>
                                        <th className="px-4 py-2 text-right font-semibold text-gray-600 dark:text-gray-300">Akcje</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-secondary-800 divide-y divide-gray-200 dark:divide-secondary-700">
                                    {sortedProducts.map(product => (
                                        <tr key={product.name}>
                                            <td className="px-4 py-2 font-medium text-gray-900 dark:text-gray-200">{product.name}</td>
                                            <td className="px-4 py-2 text-gray-700 dark:text-gray-300">{getProductTypeLabel(product.type)}</td>
                                            <td className="px-4 py-2 text-right">
                                                <Button 
                                                    onClick={() => handleDeleteClick(product)} 
                                                    variant="secondary" 
                                                    className="p-1.5 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 hover:bg-red-200"
                                                    title={`Usuń produkt ${product.name}`}
                                                >
                                                    <TrashIcon className="h-4 w-4"/>
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            </div>
            {productToDelete && (
                <ConfirmationModal
                    isOpen={!!productToDelete}
                    onClose={() => setProductToDelete(null)}
                    onConfirm={handleConfirmDelete}
                    title="Potwierdź Usunięcie Produktu"
                    message={
                        <span>
                            Czy na pewno chcesz usunąć produkt: <strong className="font-bold">{productToDelete.name}</strong>?
                            <br />
                            <span className="text-sm text-red-600">Ta operacja jest nieodwracalna. Produkt zostanie usunięty z głównego katalogu.</span>
                        </span>
                    }
                    confirmButtonText="Tak, usuń"
                />
            )}
        </>
    );
};

export default ProductManagementPage;