import React from 'react';
import { PsdTask } from '../types';
import Button from './Button';
import XCircleIcon from './icons/XCircleIcon';
import Alert from './Alert';
import CheckCircleIcon from './icons/CheckCircleIcon';

interface EndPsdTaskConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  task: PsdTask;
}

const EndPsdTaskConfirmModal: React.FC<EndPsdTaskConfirmModalProps> = ({ isOpen, onClose, onConfirm, task }) => {
  if (!isOpen) return null;

  const totalProduced = (task.batches || []).reduce((total, batch) => 
    total + (batch.producedGoods || []).filter(g => !g.isAnnulled).reduce((batchSum, good) => batchSum + good.producedWeight, 0), 0);
  
  const allBatchesCompleted = (task.batches || []).every(b => b.status === 'completed');

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-[150]" onClick={onClose}>
      <div className="bg-white dark:bg-secondary-800 rounded-lg shadow-xl p-6 w-full max-w-lg space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-primary-700 dark:text-primary-300 flex items-center gap-2">
                <CheckCircleIcon className="h-6 w-6 text-green-500" />
                Zakończyć Zadanie Produkcyjne?
            </h2>
            <Button onClick={onClose} variant="secondary" className="p-1.5 -mr-1.5"><XCircleIcon className="h-5 w-5"/></Button>
        </div>

        {!allBatchesCompleted && (
            <Alert type="warning" message="Nie wszystkie partie zostały zakończone!" details="Zaleca się zakończenie wszystkich partii przed finalizacją całego zlecenia." />
        )}

        <div>
            <p className="text-sm">Potwierdzasz zakończenie zadania <strong>{task.name}</strong> ({task.id}).</p>
            <ul className="text-sm mt-2 list-disc list-inside bg-gray-50 dark:bg-secondary-900 p-2 rounded">
                <li>Produkt: <strong>{task.recipeName}</strong></li>
                <li>Ilość planowana: <strong>{task.targetQuantity} kg</strong></li>
                <li>Ilość wyprodukowana: <strong>{totalProduced.toFixed(2)} kg</strong></li>
            </ul>
            <p className="text-xs text-red-600 dark:text-red-400 mt-2">Tej operacji nie można cofnąć. Zadanie zostanie oznaczone jako zakończone i przeniesione do raportów.</p>
        </div>

        <div className="flex justify-end space-x-3 pt-2 border-t dark:border-secondary-700">
            <Button type="button" variant="secondary" onClick={onClose}>Anuluj</Button>
            <Button type="button" variant="primary" onClick={onConfirm}>Tak, zakończ zadanie</Button>
        </div>
      </div>
    </div>
  );
};

export default EndPsdTaskConfirmModal;