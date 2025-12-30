
import React, { useState, useEffect, useRef } from 'react';
// FIX: Corrected import path for types.ts
import { AdjustmentOrder } from '../types';
import { useRecipeAdjustmentContext } from './contexts/RecipeAdjustmentContext';
import Button from './Button';
import Input from './Input';
import XCircleIcon from './icons/XCircleIcon';
import Alert from './Alert';
import QrCodeIcon from './icons/QrCodeIcon';

interface AssignAdjustmentToProductionModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: AdjustmentOrder | null;
  onAssignSuccess: (order: AdjustmentOrder) => void;
}

const AssignAdjustmentToProductionModal: React.FC<AssignAdjustmentToProductionModalProps> = ({ isOpen, onClose, order, onAssignSuccess }) => {
    const { handleUpdateAdjustmentOrder } = useRecipeAdjustmentContext();
    const [bucketId, setBucketId] = useState('');
    const [error, setError] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            setBucketId('');
            setError(null);
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen]);

    if (!isOpen || !order) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!bucketId.trim()) {
            setError('ID pojemnika (wiadra) jest wymagane.');
            return;
        }

        const bucketNum = parseInt(bucketId, 10);
        if (isNaN(bucketNum) || bucketNum < 1 || bucketNum > 999) {
            setError('Numer wiadra musi być liczbą od 1 do 999.');
            return;
        }

        const result = handleUpdateAdjustmentOrder(order.id, {
            status: 'material_picking',
            preparationLocation: bucketId.trim(),
        });
        
        if (result.success && result.updatedOrder) {
            onClose(); // Close immediately
            onAssignSuccess(result.updatedOrder);
        } else {
            setError(result.message);
        }
    };

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-[160]" onClick={onClose}>
            <div className="bg-white dark:bg-secondary-800 rounded-lg shadow-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold text-primary-700 dark:text-primary-300">Rozpocznij Kompletację</h2>
                    <Button onClick={onClose} variant="secondary" className="p-1.5"><XCircleIcon className="h-5 w-5"/></Button>
                </div>

                {error && <Alert type="error" message={error} />}

                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Zeskanuj lub wprowadź unikalny identyfikator pojemnika (wiadra), w którym będą kompletowane surowce dla zlecenia <span className="font-mono font-semibold">#{order.id.split('-')[1]}</span>.
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <Input
                        ref={inputRef}
                        label="ID Pojemnika"
                        id="bucket-id"
                        value={bucketId}
                        onChange={e => setBucketId(e.target.value)}
                        required
                        autoFocus
                        icon={<QrCodeIcon className="h-5 w-5 text-gray-400" />}
                        placeholder="np. 01, 123"
                    />
                    <div className="flex justify-end gap-3 pt-4 border-t dark:border-secondary-700">
                        <Button onClick={onClose} variant="secondary">Anuluj</Button>
                        <Button type="submit">Przypisz i Rozpocznij</Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AssignAdjustmentToProductionModal;
