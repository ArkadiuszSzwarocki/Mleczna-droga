import React, { useState, useEffect } from 'react';
import { PsdTask } from '../types';
import Button from './Button';
import Input from './Input';
import Alert from './Alert';
import XCircleIcon from './icons/XCircleIcon';
import ScissorsIcon from './icons/ScissorsIcon';

interface SetBatchSizeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (batchSize: number) => void;
  task: PsdTask;
}

const SetBatchSizeModal: React.FC<SetBatchSizeModalProps> = ({ isOpen, onClose, onConfirm, task }) => {
  const [batchSize, setBatchSize] = useState('1000');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setBatchSize('1000'); // Default to 1000kg
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const size = parseFloat(batchSize);

    if (isNaN(size) || size <= 0) {
      setError('Wprowadź prawidłową, dodatnią wielkość partii.');
      return;
    }
    if (size > task.targetQuantity) {
        setError(`Wielkość partii (${size} kg) nie może być większa niż całkowita planowana ilość (${task.targetQuantity} kg).`);
        return;
    }
    onConfirm(size);
  };
  
  const calculatedBatches = Math.ceil(task.targetQuantity / (parseFloat(batchSize) || 1));
  const isLastBatchDifferent = calculatedBatches > 1 && (task.targetQuantity % (parseFloat(batchSize) || 1) !== 0);
  const lastBatchSize = isLastBatchDifferent ? task.targetQuantity - (calculatedBatches - 1) * (parseFloat(batchSize) || 1) : 0;


  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-[150]" onClick={onClose}>
      <div className="bg-white dark:bg-secondary-800 rounded-lg shadow-xl p-6 w-full max-w-md space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-primary-700 dark:text-primary-300 flex items-center gap-2">
                <ScissorsIcon className="h-6 w-6"/>
                Podziel Zadanie na Partie
            </h2>
            <Button onClick={onClose} variant="secondary" className="p-1.5 -mr-1.5"><XCircleIcon className="h-5 w-5"/></Button>
        </div>

        {error && <Alert type="error" message={error} />}

        <p className="text-sm text-gray-600 dark:text-gray-400">
          Zlecenie na <strong>{task.targetQuantity} kg</strong> produktu <strong>{task.recipeName}</strong>.
          Podaj docelową wielkość partii (szarży). System automatycznie obliczy liczbę partii.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Docelowa wielkość partii (kg)"
            id="psd-batch-size"
            type="number"
            value={batchSize}
            onChange={e => setBatchSize(e.target.value)}
            min="1"
            step="1"
            required
            autoFocus
          />
          <div className="p-2 bg-blue-50 dark:bg-blue-900/40 rounded text-center text-sm">
              <p>Zlecenie zostanie podzielone na ~<strong>{calculatedBatches} partii</strong>.</p>
              {isLastBatchDifferent && lastBatchSize > 0 && (
                  <p className="text-xs mt-1">Ostatnia partia będzie miała wielkość ~<strong>{lastBatchSize.toFixed(2)} kg</strong>.</p>
              )}
          </div>
          <div className="flex justify-end space-x-3 pt-2 border-t dark:border-secondary-700">
            <Button type="button" variant="secondary" onClick={onClose}>Anuluj</Button>
            <Button type="submit" variant="primary">Potwierdź i Utwórz Partie</Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SetBatchSizeModal;
