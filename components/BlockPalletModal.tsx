
import React, { useState, useEffect } from 'react';
import Button from './Button';
import Input from './Input';
import Alert from './Alert';
import XCircleIcon from './icons/XCircleIcon';
import LockClosedIcon from './icons/LockClosedIcon';
import { RawMaterialLogEntry, FinishedGoodItem, User } from '../types';

interface BlockPalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: RawMaterialLogEntry | FinishedGoodItem | null;
  onConfirm: (itemId: string, reason: string, currentUser: User, isRaw: boolean) => void;
  currentUser: User | null;
}

const BlockPalletModal: React.FC<BlockPalletModalProps> = ({ isOpen, onClose, item, onConfirm, currentUser }) => {
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setReason('');
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen || !item) return null;

  const isRaw = 'palletData' in item;
  const displayId = isRaw ? item.palletData?.nrPalety : (item.finishedGoodPalletId || item.id);
  const productName = isRaw ? item.palletData?.nazwa : item.productName;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('Powód blokady jest wymagany.');
      return;
    }
    if (!currentUser) {
      setError('Błąd: Brak zalogowanego użytkownika.');
      return;
    }
    setError(null);
    onConfirm(item.id, reason.trim(), currentUser, isRaw);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-[180]" onClick={onClose}>
      <div className="bg-white dark:bg-secondary-800 rounded-lg shadow-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-red-700 dark:text-red-400 flex items-center gap-2">
            <LockClosedIcon className="h-6 w-6"/>
            Zablokuj Paletę
          </h2>
          <Button onClick={onClose} variant="secondary" className="p-1.5"><XCircleIcon className="h-5 w-5"/></Button>
        </div>
        <div className="text-sm mb-4">
          <p><strong>ID Palety:</strong> {displayId}</p>
          <p><strong>Produkt:</strong> {productName}</p>
        </div>
        {error && <Alert type="error" message={error} />}
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Powód blokady"
            id="blockReason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
            autoFocus
            placeholder="Np. Niezgodność jakościowa"
          />
          <div className="flex justify-end space-x-2 pt-2">
            <Button type="button" variant="secondary" onClick={onClose}>Anuluj</Button>
            <Button type="submit" variant="danger">Zablokuj</Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BlockPalletModal;
