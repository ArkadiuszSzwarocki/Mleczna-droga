
import React, { useState, useEffect } from 'react';
import Button from './Button';
import Input from './Input';
import Alert from './Alert';
import XCircleIcon from './icons/XCircleIcon';
import { useAuth } from './contexts/AuthContext';
import PlusIcon from './icons/PlusIcon'; // Import PlusIcon
import { PREDEFINED_ROLES } from '../constants'; // Import predefined roles

interface AddRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRoleAdded: (message: string) => void;
}

const AddRoleModal: React.FC<AddRoleModalProps> = ({ isOpen, onClose, onRoleAdded }) => {
  const { handleAddNewRole } = useAuth();
  const [newRoleName, setNewRoleName] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setNewRoleName('');
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!handleAddNewRole) {
      setError("Funkcja niedostępna.");
      return;
    }

    const trimmedRoleName = newRoleName.trim();

    if (!trimmedRoleName) {
        setError("Nazwa roli nie może być pusta.");
        return;
    }

    // Check if role name is a predefined role that cannot be overwritten
    if (PREDEFINED_ROLES.includes(trimmedRoleName.toLowerCase())) {
        setError(`Rola "${trimmedRoleName}" jest rolą systemową i nie może zostać nadpisana.`);
        return;
    }

    const result = handleAddNewRole(trimmedRoleName);
    if (result.success) {
      onRoleAdded(result.message || `Rola "${trimmedRoleName}" została pomyślnie dodana.`);
      onClose();
    } else {
      setError(result.message || 'Wystąpił nieznany błąd.');
    }
  };

  return (
    <div
      className="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center p-4 z-[160] transition-opacity duration-300 ease-in-out"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-role-modal-title"
    >
      <div
        className="bg-white dark:bg-secondary-800 rounded-lg shadow-xl p-6 w-full max-w-lg space-y-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center">
          <h2 id="add-role-modal-title" className="text-xl font-semibold text-primary-700 dark:text-primary-300 flex items-center gap-2">
            <PlusIcon className="h-6 w-6"/>
            Utwórz Nową Rolę
          </h2>
          <Button onClick={onClose} variant="secondary" className="p-1.5 -mr-1.5"><XCircleIcon className="h-5 w-5"/></Button>
        </div>

        {error && <Alert type="error" message={error} />}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nazwa Nowej Roli"
            id="newRoleNameInputModal"
            value={newRoleName}
            onChange={(e) => setNewRoleName(e.target.value)}
            placeholder="Np. Kontroler Jakości, Operator Wózka"
            required
            autoFocus
          />
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Role systemowe (np. admin, planista) są zarezerwowane. Nowa rola domyślnie nie będzie miała żadnych uprawnień.
          </p>
          <div className="flex justify-end space-x-2 pt-2">
            <Button type="button" variant="secondary" onClick={onClose}>Anuluj</Button>
            <Button type="submit" variant="primary" disabled={!newRoleName.trim()}>Utwórz Rolę</Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddRoleModal;