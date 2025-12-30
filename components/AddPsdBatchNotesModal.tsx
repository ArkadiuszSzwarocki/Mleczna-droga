import React, { useState, useEffect } from 'react';
import { PsdBatch } from '../types';
import Button from './Button';
import Textarea from './Textarea';
import Alert from './Alert';
import XCircleIcon from './icons/XCircleIcon';
import ClipboardListIcon from './icons/ClipboardListIcon';

interface AddPsdBatchNotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (notes: string) => void;
  batch: PsdBatch;
}

const AddPsdBatchNotesModal: React.FC<AddPsdBatchNotesModalProps> = ({ isOpen, onClose, onSave, batch }) => {
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (isOpen) {
      setNotes(batch.notes || '');
    }
  }, [isOpen, batch]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(notes);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-[150]" onClick={onClose}>
      <div className="bg-white dark:bg-secondary-800 rounded-lg shadow-xl p-6 w-full max-w-lg space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-primary-700 dark:text-primary-300 flex items-center gap-2">
                <ClipboardListIcon className="h-6 w-6"/>
                Notatki do Partii #{batch.batchNumber}
            </h2>
            <Button onClick={onClose} variant="secondary" className="p-1.5 -mr-1.5"><XCircleIcon className="h-5 w-5"/></Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Textarea
            label="Dodaj lub edytuj notatki"
            id="psd-batch-notes"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Wpisz uwagi dotyczące tej partii produkcyjnej..."
            autoFocus
          />

          <div className="flex justify-end space-x-3 pt-2 border-t dark:border-secondary-700">
            <Button type="button" variant="secondary" onClick={onClose}>Anuluj</Button>
            <Button type="submit" variant="primary">Zapisz Notatki</Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddPsdBatchNotesModal;
