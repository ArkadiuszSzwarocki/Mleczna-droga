import React, { useState, useEffect } from 'react';
import { RawMaterialLogEntry, FinishedGoodItem, PackagingMaterialLogEntry } from '../types';
import Button from './Button';
import Textarea from './Textarea';
import Alert from './Alert';
import XCircleIcon from './icons/XCircleIcon';
import LockOpenIcon from './icons/LockOpenIcon';

type LabItem = RawMaterialLogEntry | FinishedGoodItem | PackagingMaterialLogEntry;

interface UnblockReasonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  item: LabItem | null;
}

const UnblockReasonModal: React.FC<UnblockReasonModalProps> = ({ onClose, isOpen, item, onConfirm }) => {
    const [reason, setReason] = useState('');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if(isOpen) {
            setReason('');
            setError(null);
        }
    }, [isOpen]);

    if (!isOpen || !item) return null;

    const { isBlocked, blockReason } = 'palletData' in item ? item.palletData : item;
    const displayId = 'palletData' in item ? item.palletData.nrPalety : (('displayId' in item && item.displayId) || item.id);
    const productName = 'palletData' in item ? item.palletData.nazwa : item.productName;
    
    const today = new Date().toISOString().split('T')[0];
    const expiryDate = 'palletData' in item ? item.palletData.dataPrzydatnosci : ('expiryDate' in item ? item.expiryDate : null);
    const isExpired = expiryDate ? expiryDate < today : false;


    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (isExpired) {
            setError("Nie można zwolnić przeterminowanej palety. Wróć i użyj opcji 'Przedłuż Termin' (dostępne dla uprawnionych ról).");
            return;
        }

        if (!reason.trim()) {
            setError('Powód zwolnienia jest wymagany.');
            return;
        }
        onConfirm(reason);
    };

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-[180]" onClick={onClose}>
            <div className="bg-white dark:bg-secondary-800 rounded-lg shadow-xl p-6 w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold text-primary-700 dark:text-primary-300 flex items-center gap-2">
                        <LockOpenIcon className="h-6 w-6"/> Zwolnij Paletę
                    </h2>
                    <Button onClick={onClose} variant="secondary" className="p-1.5"><XCircleIcon className="h-5 w-5"/></Button>
                </div>

                <div className="text-sm p-3 bg-slate-100 dark:bg-secondary-700 rounded-lg">
                    <p><strong>ID Palety:</strong> <span className="font-mono">{displayId}</span></p>
                    <p><strong>Produkt:</strong> {productName}</p>
                    <p><strong>Aktualny powód blokady:</strong> {blockReason}</p>
                </div>
                
                {error && <Alert type="error" message={error} />}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <Textarea
                        label="Powód zwolnienia (wymagany)"
                        id="unblock-reason"
                        value={reason}
                        onChange={e => setReason(e.target.value)}
                        required
                        autoFocus
                    />
                    <div className="flex justify-end space-x-2 pt-2">
                        <Button type="button" variant="secondary" onClick={onClose}>Anuluj</Button>
                        <Button type="submit" disabled={!reason.trim()}>Zwolnij</Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default UnblockReasonModal;