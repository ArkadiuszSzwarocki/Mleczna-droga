
import React, { useState, useEffect, useMemo } from 'react';
import { User, UserRole } from '../types';
import { useAppContext } from './contexts/AppContext';
import Button from './Button';
import Input from './Input';
import Select from './Select';
import Alert from './Alert';
import XCircleIcon from './icons/XCircleIcon';
import UserCircleIcon from './icons/UserCircleIcon';

interface AddEditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  userToEdit?: User | null;
}

const AddEditUserModal: React.FC<AddEditUserModalProps> = ({ isOpen, onClose, userToEdit }) => {
  const { handleAddUser, handleEditUser, allRoles, getRoleLabel, allSubRoles } = useAppContext();
  
  const isEditing = !!userToEdit;

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<UserRole>('user');
  const [subRole, setSubRole] = useState('AGRO');
  const [errors, setErrors] = useState<any>({});

  const userRoleOptions = useMemo(() => 
    (allRoles || [])
        .map(role => ({ value: role, label: getRoleLabel(role) })), 
    [allRoles, getRoleLabel]
  );

  const subRoleOptions = useMemo(() => 
    (allSubRoles || ['AGRO', 'OSIP'])
        .map(r => ({ value: r, label: r })), 
    [allSubRoles]
  );
  
  useEffect(() => {
    if (isOpen) {
      if (isEditing && userToEdit) {
        setUsername(userToEdit.username);
        setRole(userToEdit.role);
        setSubRole(userToEdit.subRole || 'AGRO');
      } else {
        setUsername('');
        setPassword('');
        setConfirmPassword('');
        setRole('user');
        setSubRole('AGRO');
      }
      setErrors({});
    }
  }, [isOpen, userToEdit, isEditing]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    let validationErrors: any = {};

    if (!username.trim()) validationErrors.username = 'Nazwa użytkownika jest wymagana.';

    if (!isEditing) {
        if (password.length < 6) validationErrors.password = 'Hasło musi mieć co najmniej 6 znaków.';
        if (password !== confirmPassword) validationErrors.confirmPassword = 'Hasła nie są identyczne.';
    }

    if (Object.keys(validationErrors).length > 0) {
        setErrors(validationErrors);
        return;
    }

    let result;
    if (isEditing && userToEdit) {
        result = handleEditUser(userToEdit.id, { username: username.trim(), role, subRole });
    } else {
        result = handleAddUser({ username: username.trim(), password, role, subRole, pin: '0000' } as any);
    }

    if (result.success) {
        onClose();
    } else {
        setErrors({ form: result.message });
    }
  };
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-[150]" onClick={onClose}>
        <div className="bg-white dark:bg-secondary-800 rounded-lg shadow-xl p-6 w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center pb-3 border-b dark:border-secondary-600 mb-4">
                <h2 className="text-xl font-semibold text-primary-700 dark:text-primary-300 flex items-center gap-2">
                    <UserCircleIcon className="h-6 w-6"/>
                    {isEditing ? 'Edytuj Użytkownika' : 'Dodaj Nowego Użytkownika'}
                </h2>
                <Button onClick={onClose} variant="secondary" className="p-1.5 -mr-1.5"><XCircleIcon className="h-5 w-5"/></Button>
            </div>

            {errors.form && <Alert type="error" message={errors.form} />}

            <form onSubmit={handleSubmit} className="space-y-4">
                <Input label="Nazwa użytkownika" id="username" value={username} onChange={e => setUsername(e.target.value)} required autoFocus error={errors.username} />
                {!isEditing && (
                    <>
                        <Input label="Hasło tymczasowe" id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required error={errors.password} />
                        <Input label="Potwierdź hasło" id="confirmPassword" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required error={errors.confirmPassword} />
                    </>
                )}
                <div className="grid grid-cols-2 gap-4">
                    <Select label="Rola (Uprawnienia)" id="role" options={userRoleOptions} value={role} onChange={e => setRole(e.target.value as UserRole)} />
                    <Select label="Oddział (Podrola)" id="subrole" options={subRoleOptions} value={subRole} onChange={e => setSubRole(e.target.value)} />
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t dark:border-secondary-700">
                    <Button type="button" variant="secondary" onClick={onClose}>Anuluj</Button>
                    <Button type="submit">{isEditing ? 'Zapisz Zmiany' : 'Dodaj Użytkownika'}</Button>
                </div>
            </form>
        </div>
    </div>
  );
};

export default AddEditUserModal;
