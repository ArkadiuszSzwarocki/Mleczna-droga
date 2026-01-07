
import React, { useState, useMemo } from 'react';
// FIX: The interface is now exported from types.ts
import { FinishedGoodItem, MoveFinishedGoodModalProps } from '../types';
import { useAuth } from './contexts/AuthContext';
import { useProductionContext } from './contexts/ProductionContext';
// FIX: Corrected import path for constants.ts to be relative
// FIX: Removed import for MGW03_WAREHOUSE_ID which does not exist in constants.ts.
import { MGW01_WAREHOUSE_ID, MGW02_WAREHOUSE_ID } from '../constants';
import Button from './Button';
import Select from './Select';
import Alert from './Alert';
import XCircleIcon from './icons/XCircleIcon';

// FIX: Changed type to React.FC<MoveFinishedGoodModalProps> to use the correctly exported interface.
const MoveFinishedGoodModal: React.FC<MoveFinishedGoodModalProps> = ({
  isOpen,
  onClose,
  itemToMove,
}) => {
  const { handleMoveFinishedGood } = useProductionContext() as any; // Cast to access the new method
  const { currentUser } = useAuth();
  const [targetLocation, setTargetLocation] = useState(MGW01_WAREHOUSE_ID);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !itemToMove) return null;

  const locationOptions = [
    { value: MGW01_WAREHOUSE_ID, label: `Magazyn ${MGW01_WAREHOUSE_ID}` },
    { value: MGW02_WAREHOUSE_ID, label: `Magazyn ${MGW02_WAREHOUSE_ID}` },
  ].filter(opt => opt.value !== itemToMove.currentLocation);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!currentUser) {
      setError("Brak zalogowanego użytkownika.");
      return;
    }
    if (!handleMoveFinishedGood) {
      setError("Funkcja przenoszenia jest niedostępna.");
      return;
    }
    const result = handleMoveFinishedGood(itemToMove.id, targetLocation, currentUser);
    if (result.success) {
      onClose();
    } else {
      setError(result.message);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center p-4 z-[160]"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="move-fg-modal-title"
    >
      <div
        className="bg-white dark:bg-secondary-800 rounded-lg shadow-xl p-6 w-full max-w-md"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 id="move-fg-modal-title" className="text-xl font-semibold text-primary-700 dark:text-primary-300">
            Przenieś Paletę Wyrobu Gotowego
          </h2>
          <Button onClick={onClose} variant="secondary" className="p-1.5 -mr-1.5"><XCircleIcon className="h-5 w-5"/></Button>
        </div>
        
        <div className="text-sm mb-4">
            <p><strong>ID Palety:</strong> {itemToMove.finishedGoodPalletId || itemToMove.id}</p>
            <p><strong>Produkt:</strong> {itemToMove.productName}</p>
            <p><strong>Bieżąca Lokalizacja:</strong> {itemToMove.currentLocation}</p>
        </div>

        {error && <Alert type="error" message={error} />}

        <form onSubmit={handleSubmit} className="space-y-4">
            <Select
                label="Wybierz docelowy magazyn"
                id="target-location-select"
                options={locationOptions}
                value={targetLocation}
                onChange={e => setTargetLocation(e.target.value)}
                required
            />
            <div className="flex justify-end space-x-2 pt-2">
                <Button type="button" variant="secondary" onClick={onClose}>Anuluj</Button>
                <Button type="submit" variant="primary">Przenieś</Button>
            </div>
        </form>
      </div>
    </div>
  );
};

export default MoveFinishedGoodModal;
