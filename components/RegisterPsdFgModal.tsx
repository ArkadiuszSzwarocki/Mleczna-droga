import React, { useState, useEffect, useRef } from 'react';
import { PsdBatch } from '../types';
import Button from './Button';
import Input from './Input';
import Alert from './Alert';
import XCircleIcon from './icons/XCircleIcon';
import CubeIcon from './icons/CubeIcon';

interface RegisterPsdFgModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (weight: number) => { success: boolean, message: string };
  batch: PsdBatch;
  recipeName: string;
}

const RegisterPsdFgModal: React.FC<RegisterPsdFgModalProps> = ({ isOpen, onClose, onConfirm, batch, recipeName }) => {
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const producedWeight = parseFloat(weight);

    if (isNaN(producedWeight) || producedWeight <= 0) {
      setError('Wprowadź prawidłową wagę wyprodukowanego towaru.');
      return;
    }

    const result = onConfirm(producedWeight);
    if (result.success) {
      onClose();
    } else {
      setError(result.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-[150]" onClick={onClose}>
      <div className="bg-white dark:bg-secondary-800 rounded-lg shadow-xl p-6 w-full max-w-md space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-primary-700 dark:text-primary-300 flex items-center gap-2">
                <CubeIcon className="h-6 w-6"/>
                Zarejestruj Wyrób Gotowy
            </h2>
            <Button onClick={onClose} variant="secondary" className="p-1.5 -mr-1.5"><XCircleIcon className="h-5 w-5"/></Button>
        </div>

        <p className="text-sm text-gray-600 dark:text-gray-400">
            Rejestracja produktu <strong>{recipeName}</strong> dla partii <strong>#{batch.batchNumber}</strong>. Po zatwierdzeniu zostanie wygenerowana nowa paleta i etykieta.
        </p>

        {error && <Alert type="error" message={error} />}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            ref={inputRef}
            label="Waga wyprodukowana (kg)"
            id="psd-fg-weight"
            type="number"
            value={weight}
            onChange={e => setWeight(e.target.value)}
            min="0.01"
            step="0.01"
            required
            autoFocus
          />
          <div className="flex justify-end space-x-3 pt-2 border-t dark:border-secondary-700">
            <Button type="button" variant="secondary" onClick={onClose}>Anuluj</Button>
            <Button type="submit" variant="primary">Zarejestruj i Drukuj Etykietę</Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RegisterPsdFgModal;
