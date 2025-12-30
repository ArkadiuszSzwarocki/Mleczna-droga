import React, { useState, useEffect, useRef } from 'react';
import Button from './Button';
import Textarea from './Textarea';
import Alert from './Alert';
import XCircleIcon from './icons/XCircleIcon';
import PauseIcon from './icons/PauseIcon';

interface PauseProductionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}

const PauseProductionModal: React.FC<PauseProductionModalProps> = ({ isOpen, onClose, onConfirm }) => {
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen) {
      setReason('');
      setError(null);
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!reason.trim()) {
      setError('Powód wstrzymania produkcji jest wymagany.');
      return;
    }
    onConfirm(reason);
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-[150]" onClick={onClose}>
      <div className="bg-white dark:bg-secondary-800 rounded-lg shadow-xl p-6 w-full max-w-lg space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-primary-700 dark:text-primary-300 flex items-center gap-2">
                <PauseIcon className="h-6 w-6 text-yellow-500" />
                Wstrzymaj Produkcję
            </h2>
            <Button onClick={onClose} variant="secondary" className="p-1.5 -mr-1.5"><XCircleIcon className="h-5 w-5"/></Button>
        </div>

        {error && <Alert type="error" message={error} />}

        <p className="text-sm">Podaj przyczynę wstrzymania produkcji. Czas zostanie zarejestrowany jako przestój.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
            <Textarea
                ref={textareaRef}
                label="Powód wstrzymania"
                id="pause-reason"
                value={reason}
                onChange={e => setReason(e.target.value)}
                required
                autoFocus
            />
            <div className="flex justify-end space-x-3 pt-2 border-t dark:border-secondary-700">
                <Button type="button" variant="secondary" onClick={onClose}>Anuluj</Button>
                <Button type="submit" variant="primary">Potwierdź Wstrzymanie</Button>
            </div>
        </form>
      </div>
    </div>
  );
};

export default PauseProductionModal;
