

import React, { useState, useEffect } from 'react';
// FIX: Correct import path for types.ts to be relative
import { RawMaterialLogEntry } from '../types';
import Button from './Button';
import Input from './Input';
import Alert from './Alert';
import XCircleIcon from './icons/XCircleIcon';
import CalendarDaysIcon from './icons/CalendarDaysIcon';

interface ExtendExpiryDateModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: RawMaterialLogEntry;
  onSave: (itemId: string, newDate: string, reason: string) => { success: boolean, message: string };
}

const ExtendExpiryDateModal: React.FC<ExtendExpiryDateModalProps> = ({ isOpen, onClose, item, onSave }) => {
    const [newDate, setNewDate] = useState('');
    const [reason, setReason] = useState('');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && item) {
            setNewDate(item.palletData.dataPrzydatnosci.split('T')[0]);
            setReason('');
            setError(null);
        }
    }, [isOpen, item]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!newDate) {
            setError('Nowa data ważności jest wymagana.');
            return;
        }
        if (newDate <= item.palletData.dataPrzydatnosci.split('T')[0]) {
            setError('Nowa data musi być późniejsza niż obecna.');
            return;
        }
        if (!reason.trim()) {
            setError('Powód przedłużenia terminu jest wymagany.');
            return;
        }
        const result = onSave(item.id, newDate, reason);
        if (result.success) {
            onClose();
        } else {
            setError(result.message);
        }
    };

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-[180]" onClick={onClose}>
            <div className="bg-white dark:bg-secondary-800 rounded-lg shadow-xl p-6 w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold text-primary-700 dark:text-primary-300 flex items-center gap-2">
                        <CalendarDaysIcon className="h-6 w-6"/> Przedłuż Termin Ważności
                    </h2>
                    <Button onClick={onClose} variant="secondary" className="p-1.5"><XCircleIcon className="h-5 w-5"/></Button>
                </div>

                <div className="text-sm mb-4">
                    <p><strong>ID Palety:</strong> {item.palletData.nrPalety}</p>
                    <p><strong>Produkt:</strong> {item.palletData.nazwa}</p>
                    <p><strong>Obecna data ważności:</strong> {new Date(item.palletData.dataPrzydatnosci).toLocaleDateString('pl-PL')}</p>
                </div>
                
                {error && <Alert type="error" message={error} />}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <Input
                        label="Nowa data ważności"
                        id="new-expiry-date"
                        type="date"
                        value={newDate}
                        onChange={e => setNewDate(e.target.value)}
                        required
                        autoFocus
                    />
                    <Input
                        label="Powód (np. numer analizy)"
                        id="expiry-reason"
                        value={reason}
                        onChange={e => setReason(e.target.value)}
                        required
                    />
                    <div className="flex justify-end space-x-2 pt-2">
                        <Button type="button" variant="secondary" onClick={onClose}>Anuluj</Button>
                        <Button type="submit">Zapisz Nowy Termin</Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ExtendExpiryDateModal;