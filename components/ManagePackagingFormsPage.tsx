import React, { useEffect, useState } from 'react';
import { API_BASE_URL } from '../constants';

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

    const handleAdd = async () => {
        const name = window.prompt('Nazwa formy opakowania (np. Big Bag, Worek)');
        if (!name) return;
        const code = window.prompt('Kod (opcjonalnie)');
        const type = window.prompt('Typ (np. big_bag, bags, box)');
        const description = window.prompt('Opis (opcjonalnie)');
        try {
            const res = await fetch(`${API_BASE_URL}/packaging-forms`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, code, type, description })
            });
            if (res.ok) fetchItems();
        } catch (err) { console.error(err); }
    };

    const handleEdit = async (it: any) => {
        const name = window.prompt('Nazwa formy opakowania', it.name) || it.name;
        const code = window.prompt('Kod', it.code || '') || it.code;
        const type = window.prompt('Typ', it.type || '') || it.type;
        const description = window.prompt('Opis', it.description || '') || it.description;
        try {
            const res = await fetch(`${API_BASE_URL}/packaging-forms/${it.id}`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, code, type, description, is_active: true })
            });
            if (res.ok) fetchItems();
        } catch (err) { console.error(err); }
    };

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
                <h1 className="text-2xl font-bold">Formy Opakowań</h1>
                <div>
                    <button className="px-3 py-2 bg-primary-600 text-white rounded" onClick={handleAdd}>Dodaj</button>
                </div>
            </div>

            {loading ? (
                <div>Ładowanie...</div>
            ) : (
                <div className="bg-white shadow rounded">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-2 text-left">Nazwa</th>
                                <th className="px-4 py-2 text-left">Kod</th>
                                <th className="px-4 py-2 text-left">Typ</th>
                                <th className="px-4 py-2 text-left">Opis</th>
                                <th className="px-4 py-2 text-left">Akcje</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map(it => (
                                <tr key={it.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-2">{it.name}</td>
                                    <td className="px-4 py-2">{it.code}</td>
                                    <td className="px-4 py-2">{it.type}</td>
                                    <td className="px-4 py-2">{it.description}</td>
                                    <td className="px-4 py-2">
                                        <button className="mr-2 text-sm text-blue-600" onClick={() => handleEdit(it)}>Edytuj</button>
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
