import React, { useState } from 'react';
// FIX: Removed file extensions from all imports to fix module resolution errors.
import Button from './Button';
import Input from './Input';
import Alert from './Alert';
import XCircleIcon from './icons/XCircleIcon';
// FIX: Remove .tsx extension from icon import to fix module resolution error.
import TruckIcon from './icons/TruckIcon';

interface AskForPalletCountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (count: number, requiresLab: boolean) => void;
}

const AskForPalletCountModal: React.FC<AskForPalletCountModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [palletCount, setPalletCount] = useState<string>('1');
  const [requiresLab, setRequiresLab] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const count = parseInt(palletCount, 10);

    if (isNaN(count)) {
      setError('Wprowadzona wartość musi być liczbą.');
      return;
    }
    if (count <= 0) {
      setError('Liczba palet musi być większa od zera.');
      return;
    }
    if (count > 100) {
      setError('Maksymalna liczba palet to 100.');
      return;
    }
    onSubmit(count, requiresLab);
  };

  return (
    <div
      className="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center p-4 z-[150]"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="pallet-count-modal-title"
    >
      <div
        className="bg-white dark:bg-secondary-800 rounded-lg shadow-xl p-6 w-full max-w-md space-y-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center">
            <div className="flex items-center">
                <TruckIcon className="h-6 w-6 text-primary-600 dark:text-primary-400 mr-2" />
                <h2 id="pallet-count-modal-title" className="text-xl font-semibold text-primary-700 dark:text-primary-300">Nowa Dostawa</h2>
            </div>
            <Button onClick={onClose} variant="secondary" className="p-1 text-gray-400 hover:text-gray-600 rounded-full -mr-1 -mt-1" title="Zamknij">
                <XCircleIcon className="h-6 w-6" />
            </Button>
        </div>

        {error && <Alert type="error" message={error} />}

        <form onSubmit={handleSubmit} className="space-y-4">
            <Input
                label="Ile palet znajduje się w dostawie?"
                id="palletCountInput"
                type="number"
                value={palletCount}
                onChange={(e) => setPalletCount(e.target.value)}
                min="1"
                max="100"
                step="1"
                required
                autoFocus
                error={error}
            />
            <div className="flex items-center justify-between py-2">
                <label htmlFor="requires-lab-toggle-modal" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Wymaga kontroli Lab?
                </label>
                <button
                    type="button"
                    id="requires-lab-toggle-modal"
                    onClick={() => {}}
                    disabled={true}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-default rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        requiresLab ? 'bg-primary-600' : 'bg-gray-200 dark:bg-secondary-600'
                    }`}
                    aria-pressed={requiresLab}
                >
                    <span className="sr-only">Wymaga kontroli Lab?</span>
                    <span
                        aria-hidden="true"
                        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            requiresLab ? 'translate-x-5' : 'translate-x-0'
                        }`}
                    />
                </button>
            </div>
             <div className="flex justify-end space-x-3 pt-2">
                <Button type="button" variant="secondary" onClick={onClose}>
                    Anuluj
                </Button>
                <Button type="submit" variant="primary">
                    Utwórz Dostawę
                </Button>
            </div>
        </form>
      </div>
    </div>
  );
};

export default AskForPalletCountModal;