

import React, { useState, useMemo } from 'react';
import { RawMaterialLogEntry, FinishedGoodItem } from '../types';
import { useAppContext } from './contexts/AppContext';
import Button from './Button';
import Input from './Input';
import Alert from './Alert';
import XCircleIcon from './icons/XCircleIcon';
import DocumentPlusIcon from './icons/DocumentPlusIcon';
import TrashIcon from './icons/TrashIcon';
import DocumentTextIcon from './icons/DocumentTextIcon';

interface ManageLabDocumentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: RawMaterialLogEntry | FinishedGoodItem | null;
}

const ManageLabDocumentsModal: React.FC<ManageLabDocumentsModalProps> = ({ isOpen, onClose, item }) => {
    const { handleAddDocument, handleDeleteDocument, rawMaterialsLogList, finishedGoodsList } = useAppContext();
    const [newDocumentName, setNewDocumentName] = useState('');
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    const currentItemState = useMemo(() => {
        if (!item) return null;
        if ('palletData' in item) {
            return (rawMaterialsLogList || []).find(p => p.id === item.id) || item;
        }
        return (finishedGoodsList || []).find(p => p.id === item.id) || item;
    }, [item, rawMaterialsLogList, finishedGoodsList]);

    const documents = useMemo(() => {
        if (!currentItemState || !currentItemState.locationHistory) return [];
        // FIX: Correctly filter out undefined/null values and ensure the resulting array is of type string[], which resolves downstream type errors.
        return [...new Set(currentItemState.locationHistory.map((h: any) => h.documentName).filter((name: any): name is string => !!name))];
    }, [currentItemState]);
    
    if (!isOpen || !item) return null;

    const isRaw = 'palletData' in item;

    const handleAdd = () => {
        setFeedback(null);
        const result = handleAddDocument(item.id, isRaw, newDocumentName);
        setFeedback(result);
        if (result.success) {
            setNewDocumentName('');
        }
    };

    const handleDelete = (docName: string) => {
        setFeedback(null);
        const result = handleDeleteDocument(item.id, isRaw, docName);
        setFeedback(result);
    };
    
    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-[190]" onClick={onClose}>
            <div className="bg-white dark:bg-secondary-800 rounded-lg shadow-xl p-6 w-full max-w-2xl" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold text-primary-700 dark:text-primary-300 flex items-center gap-2">
                        <DocumentPlusIcon className="h-6 w-6"/> Zarządzaj Dokumentami
                    </h2>
                    <Button onClick={onClose} variant="secondary" className="p-1.5"><XCircleIcon className="h-5 w-5"/></Button>
                </div>

                {feedback && <div className="mb-2"><Alert type={feedback.type} message={feedback.message} /></div>}

                <div className="mt-4">
                    <h3 className="font-semibold mb-2 text-gray-800 dark:text-gray-200">Załączone Dokumenty</h3>
                    {documents.length === 0 ? (
                        <p className="text-sm text-gray-500 dark:text-gray-400 italic">Brak załączonych dokumentów.</p>
                    ) : (
                        <ul className="space-y-2 max-h-48 overflow-y-auto pr-2">
                            {/* FIX: Explicitly typing `doc` as `string` to resolve type errors. */}
                            {documents.map((doc: string, index) => (
                                <li key={index} className="flex items-center justify-between p-2 bg-slate-100 dark:bg-secondary-700 rounded-md">
                                    <div className="flex items-center gap-2">
                                        <DocumentTextIcon className="h-5 w-5 text-gray-500"/>
                                        <span className="text-sm text-gray-800 dark:text-gray-200">{doc}</span>
                                    </div>
                                    <Button onClick={() => handleDelete(doc)} variant="secondary" className="p-1.5 text-red-500 bg-red-50 hover:bg-red-100 dark:bg-red-900/40 dark:hover:bg-red-800/80"><TrashIcon className="h-4 w-4"/></Button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <div className="mt-4 pt-4 border-t dark:border-secondary-600">
                    <h3 className="font-semibold mb-2 text-gray-800 dark:text-gray-200">Dodaj nowy dokument</h3>
                    <div className="flex items-end gap-2">
                        <Input 
                            label="Nazwa dokumentu (np. 'Analiza_2024_07.pdf')" 
                            id="new-doc-name" 
                            value={newDocumentName} 
                            onChange={e => setNewDocumentName(e.target.value)}
                        />
                        <Button onClick={handleAdd} disabled={!newDocumentName.trim()}>Dodaj</Button>
                    </div>
                     <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">To jest symulacja. Wpisz nazwę pliku, który chcesz "dodać".</p>
                </div>

                <div className="flex justify-end gap-3 pt-4 mt-4 border-t dark:border-secondary-700">
                    <Button onClick={onClose} variant="primary">Gotowe</Button>
                </div>
            </div>
        </div>
    );
};

export default ManageLabDocumentsModal;
