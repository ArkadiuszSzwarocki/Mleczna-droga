import React, { useState, useEffect } from 'react';
import Button from './Button';
import Textarea from './Textarea';
import XCircleIcon from './icons/XCircleIcon';

interface EditLabNotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: any;
  onSave: (notes: string) => void;
}

const EditLabNotesModal: React.FC<EditLabNotesModalProps> = ({ isOpen, onClose, item, onSave }) => {
    const [notes, setNotes] = useState('');

    useEffect(() => {
        if (isOpen) {
            setNotes(''); // Zawsze zaczynaj z pustą notatką
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!notes.trim()) {
            onClose(); // Po prostu zamknij, jeśli nie ma tekstu
            return;
        }
        onSave(notes);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-[180]" onClick={onClose}>
            <form onSubmit={handleSubmit} className="bg-white dark:bg-secondary-800 rounded-lg shadow-xl p-6 w-full max-w-lg space-y-4" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-semibold text-primary-700 dark:text-primary-300">Dodaj Notatkę Laboratoryjną</h2>
                    <Button onClick={onClose} variant="secondary" className="p-1.5 -mr-1.5"><XCircleIcon className="h-5 w-5"/></Button>
                </div>
                <Textarea
                    label="Nowa notatka"
                    id="lab-notes-add"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    autoFocus
                    rows={6}
                    placeholder="Wpisz treść nowej notatki..."
                />
                <div className="flex justify-end space-x-2 pt-2 border-t dark:border-secondary-700">
                    <Button type="button" variant="secondary" onClick={onClose}>Anuluj</Button>
                    <Button type="submit" disabled={!notes.trim()}>Dodaj Notatkę</Button>
                </div>
            </form>
        </div>
    );
};

export default EditLabNotesModal;
