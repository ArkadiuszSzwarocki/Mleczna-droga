import React, { useState, useEffect } from 'react';
import { PsdTask } from '../types';
import Button from './Button';
import Input from './Input';
import Alert from './Alert';
import XCircleIcon from './icons/XCircleIcon';
import PlayIcon from './icons/PlayIcon';

interface StartPsdBatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: PsdTask;
  onConfirm: (targetWeight: number) => void;
}

const StartPsdBatchModal: React.FC<StartPsdBatchModalProps> = ({ isOpen, onClose, task, onConfirm }) => {
  const [targetWeight, setTargetWeight] = useState('1000');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setTargetWeight('1000');
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const weight = parseFloat(targetWeight);

    if (isNaN(weight) || weight <= 0) {
      setError('Wprowadź prawidłową wagę.');
      return;
    }
    
    if (weight > task.targetQuantity) {
        setError(`Waga partii (${weight} kg) nie może być większa niż całkowita planowana ilość (${task.targetQuantity} kg).`);
        return;
    }

    onConfirm(weight);
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-[150]" onClick={onClose}>
      <div className="bg-white dark:bg-secondary-800 rounded-lg shadow-xl p-6 w-full max-w-md space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-primary-700 dark:text-primary-300 flex items-center gap-2">
                <PlayIcon className="h-6 w-6"/>
                Rozpocznij Produkcję
            </h2>
            <Button onClick={onClose} variant="secondary" className="p-1.5 -mr-1.5"><XCircleIcon className="h-5 w-5"/></Button>
        </div>

        {error && <Alert type="error" message={error} />}

        <p className="text-sm text-gray-600 dark:text-gray-400">
          Rozpoczynasz produkcję dla <strong>{task.recipeName}</strong> (Zlecenie: {task.name}).
          Podaj docelową wagę dla pierwszej partii (szarży).
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Waga partii (kg)"
            id="psd-batch-weight"
            type="number"
            value={targetWeight}
            onChange={e => setTargetWeight(e.target.value)}
            min="0.01"
            step="0.01"
            required
            autoFocus
          />
          <div className="flex justify-end space-x-3 pt-2 border-t dark:border-secondary-700">
            <Button type="button" variant="secondary" onClick={onClose}>Anuluj</Button>
            <Button type="submit" variant="primary">Potwierdź i Rozpocznij</Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StartPsdBatchModal;