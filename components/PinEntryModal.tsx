import React, { useState, useEffect, useRef } from 'react';
import Button from './Button';
import Input from './Input';
import Alert from './Alert';
import PadlockIcon from './icons/PadlockIcon';

interface PinEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (pin: string) => void;
  error?: string | null;
}

const PinEntryModal: React.FC<PinEntryModalProps> = ({ isOpen, onClose, onSubmit, error }) => {
  const [pin, setPin] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setPin('');
      // Focus the input when the modal opens
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(pin);
  };

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow only digits and limit length
    if (/^\d*$/.test(value) && value.length <= 6) {
      setPin(value);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center p-4 z-[170]">
      <div className="bg-white dark:bg-secondary-800 rounded-lg shadow-xl p-6 w-full max-w-sm space-y-4" onClick={e => e.stopPropagation()}>
        <div className="text-center">
            <PadlockIcon className="h-12 w-12 text-primary-500 mx-auto mb-2"/>
            <h2 className="text-xl font-semibold text-primary-700 dark:text-primary-300">Wprowadź Kod PIN</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Wymagana autoryzacja operatora.</p>
        </div>

        {error && <Alert type="error" message={error} />}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            ref={inputRef}
            label=""
            id="pin-input"
            type="password"
            value={pin}
            onChange={handlePinChange}
            required
            autoFocus
            className="text-center text-2xl tracking-[0.5em]"
            maxLength={6}
          />
          <div className="flex justify-end space-x-3 pt-2">
            <Button type="button" variant="secondary" onClick={onClose}>Anuluj</Button>
            <Button type="submit" variant="primary">Zatwierdź</Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PinEntryModal;