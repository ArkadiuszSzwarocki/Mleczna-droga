
import React from 'react';
import Button from './Button';
import Alert from './Alert';
import XCircleIcon from './icons/XCircleIcon';
import TrashIcon from './icons/TrashIcon'; // Import TrashIcon

interface DeleteRoleConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  roleName: string;
}

const DeleteRoleConfirmModal: React.FC<DeleteRoleConfirmModalProps> = ({ isOpen, onClose, onConfirm, roleName }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center p-4 z-[170]" onClick={onClose}>
      <div className="bg-white dark:bg-secondary-800 rounded-lg shadow-xl p-6 w-full max-w-md space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-red-700 dark:text-red-400 flex items-center gap-2">
            <TrashIcon className="h-6 w-6"/>
            Potwierdź Usunięcie Roli
          </h2>
          <Button onClick={onClose} variant="secondary" className="p-1.5 -mr-1.5"><XCircleIcon className="h-5 w-5"/></Button>
        </div>

        <Alert
          type="warning"
          message={`Czy na pewno chcesz usunąć rolę "${roleName}"?`}
          details={
            <span>
              Wszyscy użytkownicy przypisani do tej roli zostaną automatycznie przeniesieni do roli "Użytkownik".
              <br /><strong className="text-sm text-red-600">Tej operacji nie można cofnąć.</strong>
            </span>
          }
        />
        
        <div className="flex justify-end space-x-3 pt-2 border-t dark:border-secondary-700">
            <Button type="button" variant="secondary" onClick={onClose}>Anuluj</Button>
            <Button type="button" variant="danger" onClick={onConfirm}>Usuń Rolę</Button>
        </div>
      </div>
    </div>
  );
};

export default DeleteRoleConfirmModal;