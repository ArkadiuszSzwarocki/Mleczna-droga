import React from 'react';
import { PsdFinishedGood } from '../types';
import Button from './Button';
import XCircleIcon from './icons/XCircleIcon';
import Alert from './Alert';

interface AnnulPsdFgModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  itemToAnnul: PsdFinishedGood;
}

const AnnulPsdFgModal: React.FC<AnnulPsdFgModalProps> = ({ isOpen, onClose, onConfirm, itemToAnnul }) => {
  if (!isOpen || !itemToAnnul) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-[150]" onClick={onClose}>
      <div className="bg-white dark:bg-secondary-800 rounded-lg shadow-xl p-6 w-full max-w-lg space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-red-700 dark:text-red-400">Potwierdź Anulowanie Produktu</h2>
            <Button onClick={onClose} variant="secondary" className="p-1.5 -mr-1.5"><XCircleIcon className="h-5 w-5"/></Button>
        </div>

        <Alert
            type="warning"
            message="Czy na pewno chcesz anulować ten produkt?"
            details={`Anulowanie palety <strong>${itemToAnnul.displayId}</strong> (${itemToAnnul.productName}, ${itemToAnnul.producedWeight} kg) jest operacją nieodwracalną.`}
        />
        
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Produkt zostanie oznaczony jako unieważniony, a powiązana z nim paleta wyrobu gotowego zostanie usunięta z systemu.
          Operacja ta zostanie zarejestrowana w historii w celach audytowych.
        </p>

        <div className="flex justify-end space-x-3 pt-2 border-t dark:border-secondary-700">
            <Button type="button" variant="secondary" onClick={onClose}>Nie, zostaw</Button>
            <Button type="button" variant="danger" onClick={onConfirm}>Tak, anuluj produkt</Button>
        </div>
      </div>
    </div>
  );
};

export default AnnulPsdFgModal;
