import React, { useEffect, useState } from 'react';
import { API_BASE_URL } from '../constants';
import { useUIContext } from './contexts/UIContext';

const ManagePackagingFormsPage: React.FC = () => {
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchItems = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/packaging-forms`);
            if (res.ok) {
                const data = await res.json();
                setItems(data);
            }
        } catch (err) {
            console.error('Błąd pobierania form opakowań', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchItems(); }, []);

    const { modalHandlers } = useUIContext();
    const openAddEditModal = (form?: any) => modalHandlers.openAddEditPackagingFormModal(form);

    const handleDelete = async (it: any) => {
        if (!window.confirm(`Usunąć formę opakowania "${it.name}"?`)) return;
        try {
            const res = await fetch(`${API_BASE_URL}/packaging-forms/${it.id}`, { method: 'DELETE' });
            if (res.ok) fetchItems();
        } catch (err) { console.error(err); }
    };

    return (
        <div className="p-6">
            <div className="flex items-center justify-between mb-4">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Formy Opakowań</h1>
                <div>
                    <button className="px-3 py-2 bg-primary-600 text-white rounded" onClick={() => openAddEditModal(null)}>Dodaj</button>
                </div>
            </div>

            {loading ? (
                <div className="text-gray-700 dark:text-gray-300">Ładowanie...</div>
            ) : (
                <div className="bg-white dark:bg-secondary-800 shadow rounded">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-secondary-700">
                        <thead className="bg-gray-50 dark:bg-secondary-800">
                            <tr>
                                <th className="px-4 py-2 text-left text-gray-700 dark:text-gray-300">Nazwa</th>
                                <th className="px-4 py-2 text-left text-gray-700 dark:text-gray-300">Kod</th>
                                <th className="px-4 py-2 text-left text-gray-700 dark:text-gray-300">Typ</th>
                                <th className="px-4 py-2 text-left text-gray-700 dark:text-gray-300">Opis</th>
                                <th className="px-4 py-2 text-left text-gray-700 dark:text-gray-300">Akcje</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-secondary-800">
                            {items.map(it => (
                                <tr key={it.id} className="hover:bg-gray-50 dark:hover:bg-secondary-700">
                                    <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{it.name}</td>
                                    <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{it.code}</td>
                                    <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{it.type}</td>
                                    <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{it.description}</td>
                                    <td className="px-4 py-2">
                                        <button className="mr-2 text-sm text-blue-600" onClick={() => openAddEditModal(it)}>Edytuj</button>
                                        <button className="text-sm text-red-600" onClick={() => handleDelete(it)}>Usuń</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default ManagePackagingFormsPage;
