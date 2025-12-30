import React, { useState, useEffect, useRef } from 'react';
import { FinishedGoodItem } from '../types';
import Button from './Button';
import Input from './Input';
import Alert from './Alert';
import XCircleIcon from './icons/XCircleIcon';
import MixerIcon from './icons/MixerIcon';

interface ConsumePartialPalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (weightToConsume: number) => void;
  pallet: FinishedGoodItem;
  remainingNeededWeight: number;
}

const ConsumePartialPalletModal: React.FC<ConsumePartialPalletModalProps> = ({ isOpen, onClose, onConfirm, pallet, remainingNeededWeight }) => {
  const [weight, setWeight] = useState('');
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setWeight('');
      setError(null);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const validateWeight = (value: string): string | null => {
    const weightToConsume = parseFloat(value);
    if (isNaN(weightToConsume) || weightToConsume <= 0) {
      return "Wprowadź prawidłową wagę (większą od zera).";
    }
    if (weightToConsume > pallet.quantityKg + 0.001) { // tolerance
      return `Waga do pobrania (${weightToConsume} kg) nie może być większa niż dostępna waga na palecie (${pallet.quantityKg.toFixed(2)} kg).`;
    }
    if (weightToConsume > remainingNeededWeight + 0.001) { // tolerance
      return `Waga do pobrania (${weightToConsume} kg) nie może być większa niż pozostała wymagana ilość (${remainingNeededWeight.toFixed(2)} kg).`;
    }
    return null;
  };

  const handleWeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setWeight(value);
      setError(validateWeight(value));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validateWeight(weight);
    if (validationError) {
        setError(validationError);
        return;
    }
    onConfirm(parseFloat(weight));
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-[150]" onClick={onClose}>
      <div className="bg-white dark:bg-secondary-800 rounded-lg shadow-xl p-6 w-full max-w-md space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-primary-700 dark:text-primary-300 flex items-center gap-2">
                <MixerIcon className="h-6 w-6"/>
                Pobierz Składnik
            </h2>
            <Button onClick={onClose} variant="secondary" className="p-1.5 -mr-1.5"><XCircleIcon className="h-5 w-5"/></Button>
        </div>

        {error && <Alert type="error" message={error} />}

        <div className="p-3 bg-blue-50 dark:bg-blue-900/40 rounded border border-blue-200 dark:border-blue-700 space-y-2">
            <div>
                <p className="text-sm font-semibold text-blue-800 dark:text-blue-200">{pallet.productName}</p>
                <p className="text-4xl font-mono text-gray-800 dark:text-gray-200">{pallet.displayId}</p>
            </div>
            <div className="grid grid-cols-2 gap-x-4 text-sm pt-2 border-t border-blue-200 dark:border-blue-700">
                <p><strong>Dostępna waga:</strong> {pallet.quantityKg.toFixed(2)} kg</p>
                <p><strong>Pozostało do pobrania:</strong> {remainingNeededWeight.toFixed(2)} kg</p>
            </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            ref={inputRef}
            label="Waga do pobrania (kg)"
            id="consume-weight-input"
            type="number"
            value={weight}
            onChange={handleWeightChange}
            min="0.01"
            max={pallet.quantityKg.toFixed(2)}
            step="0.01"
            required
            autoFocus
            error={error || undefined}
          />
          <div className="flex justify-end space-x-3 pt-2 border-t dark:border-secondary-700">
            <Button type="button" variant="secondary" onClick={onClose}>Anuluj</Button>
            <Button type="submit" variant="primary" disabled={!!error || !weight}>Zatwierdź Pobranie</Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ConsumePartialPalletModal;
