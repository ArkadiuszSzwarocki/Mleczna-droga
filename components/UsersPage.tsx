
import React, { useState, useMemo } from 'react';
import { useAppContext } from './contexts/AppContext';
import { User, UserRole } from '../types';
import Button from './Button';
import Alert from './Alert';
import ConfirmationModal from './ConfirmationModal';
import UserGroupIcon from './icons/UserGroupIcon';
import PlusIcon from './icons/PlusIcon';
import EditIcon from './icons/EditIcon';
import ArrowPathIcon from './icons/ArrowPathIcon';
import TrashIcon from './icons/TrashIcon';
import { useSortableData } from '../src/useSortableData';
import SortableHeader from './SortableHeader';
import { formatDate } from '../src/utils';

const UsersPage: React.FC = () => {
    const { users, handleDeleteUser, currentUser, getRoleLabel, modalHandlers } = useAppContext();
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);
    const [userToDelete, setUserToDelete] = useState<User | null>(null);

    const { items: sortedUsers, requestSort, sortConfig } = useSortableData(users, { key: 'username', direction: 'ascending' });

    const handleOpenAddModal = () => {
        modalHandlers.openAddEditUserModal();
    };

    const handleOpenEditModal = (user: User) => {
        modalHandlers.openAddEditUserModal(user);
    };

    const handleOpenResetPasswordModal = (user: User) => {
        modalHandlers.openResetPasswordModal(user);
    };

    const confirmDeleteUser = () => {
        if (userToDelete) {
            const result = handleDeleteUser(userToDelete.id);
            setFeedback({ type: result.success ? 'success' : 'error', message: result.message });
            setUserToDelete(null);
        }
    };

    return (
        <>
            <div className="p-4 md:p-6 bg-white dark:bg-secondary-800 shadow-xl rounded-lg h-full flex flex-col">
                <header className="flex-shrink-0 flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 border-b dark:border-secondary-600 pb-3 gap-3">
                    <div className="flex items-center">
                        <UserGroupIcon className="h-8 w-8 text-primary-600 dark:text-primary-400 mr-3" />
                        <h2 className="text-2xl font-semibold text-primary-700 dark:text-primary-300">Zarządzanie Użytkownikami</h2>
                    </div>
                    <Button onClick={handleOpenAddModal} leftIcon={<PlusIcon className="h-5 w-5"/>}>
                        Dodaj Nowego Użytkownika
                    </Button>
                </header>

                {feedback && <div className="mb-4"><Alert type={feedback.type} message={feedback.message} /></div>}

                <div className="flex-grow overflow-auto">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-secondary-700 text-sm">
                            <thead className="bg-gray-50 dark:bg-secondary-700">
                                <tr>
                                    <SortableHeader columnKey="username" sortConfig={sortConfig} requestSort={requestSort}>Nazwa użytkownika</SortableHeader>
                                    <SortableHeader columnKey="role" sortConfig={sortConfig} requestSort={requestSort}>Rola</SortableHeader>
                                    <SortableHeader columnKey="subRole" sortConfig={sortConfig} requestSort={requestSort}>Oddział</SortableHeader>
                                    <SortableHeader columnKey="passwordLastChanged" sortConfig={sortConfig} requestSort={requestSort}>Ostatnia zmiana hasła</SortableHeader>
                                    <th className="px-4 py-3 text-right font-medium text-gray-500 dark:text-gray-300">Akcje</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-secondary-800 divide-y divide-gray-200 dark:divide-secondary-700">
                                {sortedUsers.map((user: User) => (
                                    <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-secondary-700/50">
                                        <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">{user.username}</td>
                                        <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{getRoleLabel(user.role)}</td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${user.subRole === 'OSIP' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                                {user.subRole || 'AGRO'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{formatDate(user.passwordLastChanged || '', true)}</td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button onClick={() => handleOpenEditModal(user)} variant="secondary" className="p-1.5" title="Edytuj">
                                                    <EditIcon className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    onClick={() => handleOpenResetPasswordModal(user)}
                                                    variant="secondary"
                                                    className="p-1.5"
                                                    title="Resetuj hasło"
                                                    disabled={currentUser?.id === user.id}
                                                >
                                                    <ArrowPathIcon className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    onClick={() => setUserToDelete(user)}
                                                    variant="secondary"
                                                    className="p-1.5 text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-900/50 dark:hover:bg-red-800"
                                                    title="Usuń"
                                                    disabled={currentUser?.id === user.id}
                                                >
                                                    <TrashIcon className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            {userToDelete && (
                <ConfirmationModal
                    isOpen={!!userToDelete}
                    onClose={() => setUserToDelete(null)}
                    onConfirm={confirmDeleteUser}
                    title="Potwierdź Usunięcie Użytkownika"
                    message={`Czy na pewno chcesz usunąć użytkownika "${userToDelete.username}"? Tej operacji nie można cofnąć.`}
                    confirmButtonText="Tak, usuń"
                />
            )}
        </>
    );
};

export default UsersPage;
