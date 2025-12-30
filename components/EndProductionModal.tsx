

import React, { useState, useEffect } from 'react';
// FIX: Corrected import path for types.ts
import { ProductionRun } from '../types';
import Button from './Button';
import Input from './Input';
import Alert from './Alert';
import XCircleIcon from './icons/XCircleIcon';
import CheckCircleIcon from './icons/CheckCircleIcon';

interface EndProductionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (finalWeight: number) => { success: boolean, message: string };
  run: ProductionRun | null;
}

const EndProductionModal: React.FC<EndProductionModalProps> = ({ isOpen, onClose, onConfirm, run }) => {
  const [finalWeight, setFinalWeight] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && run) {
      setFinalWeight(String(run.actualProducedQuantityKg || run.targetBatchSizeKg || ''));
      setError(null);
    }
  }, [isOpen, run]);

  if (!isOpen || !run) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const weight = parseFloat(finalWeight);

    if (isNaN(weight) || weight < 0) {
      setError('Wprowadź prawidłową, nieujemną wagę.');
      return;
    }

    const result = onConfirm(weight);
    if (!result.success) {
      setError(result.message);
    }
    // Parent component will handle closing on success
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-[150]" onClick={onClose}>
      <div className="bg-white dark:bg-secondary-800 rounded-lg shadow-xl p-6 w-full max-w-lg space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-primary-700 dark:text-primary-300 flex items-center gap-2">
                <CheckCircleIcon className="h-6 w-6 text-green-500" />
                Zakończ Zlecenie Produkcyjne
            </h2>
            <Button onClick={onClose} variant="secondary" className="p-1.5 -mr-1.5"><XCircleIcon className="h-5 w-5"/></Button>
        </div>

        {error && <Alert type="error" message={error} />}

        <div>
            <p className="text-sm">Potwierdzasz zakończenie zlecenia <strong>{run.recipeName}</strong> ({run.id}).</p>
            <p className="text-sm mt-1">Wprowadź końcową wagę wyprodukowanej partii.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
            <Input
                label="Rzeczywista Waga Wyprodukowana (kg)"
                id="final-produced-weight"
                type="number"
                value={finalWeight}
                onChange={e => setFinalWeight(e.target.value)}
                min="0"
                step="0.01"
                required
                autoFocus
            />
            <div className="flex justify-end space-x-3 pt-2 border-t dark:border-secondary-700">
                <Button type="button" variant="secondary" onClick={onClose}>Anuluj</Button>
                <Button type="submit" variant="primary">Potwierdź i Zakończ Zlecenie</Button>
            </div>
        </form>
      </div>
    </div>
  );
};

export default EndProductionModal;