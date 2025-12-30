
import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from './contexts/AuthContext';
import { Permission, UserRole } from '../types';
import Button from './Button';
import Input from './Input';
import Alert from './Alert';
import ShieldCheckIcon from './icons/ShieldCheckIcon';
import PlusIcon from './icons/PlusIcon';
import TrashIcon from './icons/TrashIcon';
import ConfirmationModal from './ConfirmationModal';
import BuildingOfficeIcon from './icons/BuildingOfficeIcon';
import UserGroupIcon from './icons/UserGroupIcon';

const RolesManagementPage: React.FC = () => {
    const { 
        checkPermission,
        allRoles, handleAddNewRole, handleDeleteRole,
        allSubRoles, handleAddSubRole, handleDeleteSubRole,
        getRoleLabel
    } = useAuth();
    
    const canEdit = checkPermission(Permission.MANAGE_SYSTEM_SETTINGS);

    const [newRoleName, setNewRoleName] = useState('');
    const [newSubRoleName, setNewSubRoleName] = useState('');
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);
    const [roleToDelete, setRoleToDelete] = useState<string | null>(null);
    const [subRoleToDelete, setSubRoleToDelete] = useState<string | null>(null);

    useEffect(() => {
        if (feedback) {
            const timer = setTimeout(() => setFeedback(null), 4000);
            return () => clearTimeout(timer);
        }
    }, [feedback]);

    const handleAddRole = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newRoleName.trim()) return;
        const result = handleAddNewRole(newRoleName);
        if (result.success) {
            setNewRoleName('');
            setFeedback({ type: 'success', message: result.message });
        } else {
            setFeedback({ type: 'error', message: result.message });
        }
    };

    const handleAddSubRoleClick = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newSubRoleName.trim()) return;
        const result = handleAddSubRole(newSubRoleName);
        if (result.success) {
            setNewSubRoleName('');
            setFeedback({ type: 'success', message: result.message });
        } else {
            setFeedback({ type: 'error', message: result.message });
        }
    };

    const confirmDeleteRole = () => {
        if (roleToDelete) {
            const result = handleDeleteRole(roleToDelete);
            setFeedback({ type: result.success ? 'success' : 'error', message: result.message });
            setRoleToDelete(null);
        }
    };

    const confirmDeleteSubRole = () => {
        if (subRoleToDelete) {
            const result = handleDeleteSubRole(subRoleToDelete);
            setFeedback({ type: result.success ? 'success' : 'error', message: result.message });
            setSubRoleToDelete(null);
        }
    };

    return (
        <div className="p-4 md:p-6 bg-white dark:bg-secondary-800 shadow-xl rounded-lg h-full flex flex-col overflow-y-auto">
            <header className="flex items-center mb-8 border-b pb-4 dark:border-secondary-600">
                <ShieldCheckIcon className="h-8 w-8 text-primary-600 dark:text-primary-400 mr-3" />
                <div>
                    <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-200">Struktura Organizacyjna</h2>
                    <p className="text-gray-500 dark:text-gray-400">Zarządzaj rolami uprawnień oraz oddziałami firmy.</p>
                </div>
            </header>

            {feedback && <div className="mb-6 animate-fadeIn"><Alert type={feedback.type} message={feedback.message} /></div>}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* ROLE SYSTEMOWE */}
                <section className="flex flex-col h-full">
                    <div className="p-6 border rounded-xl bg-slate-50 dark:bg-secondary-900 dark:border-secondary-700 h-full flex flex-col">
                        <div className="flex items-center gap-3 mb-6 pb-2 border-b dark:border-secondary-700">
                            <UserGroupIcon className="h-6 w-6 text-indigo-500" />
                            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200">Role i Uprawnienia</h3>
                        </div>

                        {canEdit && (
                            <form onSubmit={handleAddRole} className="flex gap-2 mb-6">
                                <Input 
                                    label="" 
                                    placeholder="Nazwa nowej roli..." 
                                    value={newRoleName} 
                                    onChange={e => setNewRoleName(e.target.value)} 
                                    className="text-sm"
                                />
                                <Button type="submit" variant="secondary" className="px-4" disabled={!newRoleName.trim()}>
                                    <PlusIcon className="h-5 w-5"/>
                                </Button>
                            </form>
                        )}

                        <div className="flex-grow overflow-auto border dark:border-secondary-700 rounded-lg bg-white dark:bg-secondary-800">
                            <ul className="divide-y dark:divide-secondary-700">
                                {allRoles.map(role => {
                                    // ZMIANA: Tylko 'admin' jest chroniony
                                    const isRootAdmin = role.toLowerCase() === 'admin';
                                    return (
                                        <li key={role} className="p-3 flex justify-between items-center hover:bg-slate-50 dark:hover:bg-secondary-700 transition-colors">
                                            <div>
                                                <p className="font-semibold text-gray-800 dark:text-gray-200">{getRoleLabel(role)}</p>
                                                <p className="text-[10px] font-mono text-gray-400 uppercase tracking-tighter">{role}</p>
                                            </div>
                                            {!isRootAdmin && canEdit ? (
                                                <button 
                                                    onClick={() => setRoleToDelete(role)} 
                                                    className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                                                    title="Usuń rolę"
                                                >
                                                    <TrashIcon className="h-4 w-4" />
                                                </button>
                                            ) : isRootAdmin && (
                                                <span className="text-[10px] bg-primary-100 dark:bg-primary-900/30 px-2 py-0.5 rounded text-primary-600 dark:text-primary-400 uppercase font-bold">Admin</span>
                                            )}
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    </div>
                </section>

                {/* ODDZIAŁY */}
                <section className="flex flex-col h-full">
                    <div className="p-6 border rounded-xl bg-slate-50 dark:bg-secondary-900 dark:border-secondary-700 h-full flex flex-col">
                        <div className="flex items-center gap-3 mb-6 pb-2 border-b dark:border-secondary-700">
                            <BuildingOfficeIcon className="h-6 w-6 text-primary-500" />
                            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200">Oddziały (Podrole)</h3>
                        </div>

                        {canEdit && (
                            <form onSubmit={handleAddSubRoleClick} className="flex gap-2 mb-6">
                                <Input 
                                    label="" 
                                    placeholder="Nazwa oddziału (np. MGW06)..." 
                                    value={newSubRoleName} 
                                    onChange={e => setNewSubRoleName(e.target.value)} 
                                    className="text-sm"
                                />
                                <Button type="submit" variant="secondary" className="px-4" disabled={!newSubRoleName.trim()}>
                                    <PlusIcon className="h-5 w-5"/>
                                </Button>
                            </form>
                        )}

                        <div className="flex-grow overflow-auto border dark:border-secondary-700 rounded-lg bg-white dark:bg-secondary-800">
                            <ul className="divide-y dark:divide-secondary-700">
                                {allSubRoles.map(subRole => {
                                    const isDefault = subRole === 'AGRO';
                                    return (
                                        <li key={subRole} className="p-3 flex justify-between items-center hover:bg-slate-50 dark:hover:bg-secondary-700 transition-colors">
                                            <span className="font-bold text-primary-600 dark:text-primary-400">{subRole}</span>
                                            {!isDefault && canEdit ? (
                                                <button 
                                                    onClick={() => setSubRoleToDelete(subRole)} 
                                                    className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                                                    title="Usuń oddział"
                                                >
                                                    <TrashIcon className="h-4 w-4" />
                                                </button>
                                            ) : isDefault && (
                                                <span className="text-[10px] bg-slate-100 dark:bg-secondary-600 px-2 py-0.5 rounded text-gray-500 uppercase font-bold">Główny</span>
                                            )}
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                        <p className="text-[10px] text-gray-400 mt-4 italic">Uwaga: Oddziały pozwalają na izolację magazynierów przypisanych do konkretnych lokalizacji.</p>
                    </div>
                </section>
            </div>

            {/* MODALE POTWIERDZENIA */}
            <ConfirmationModal 
                isOpen={!!roleToDelete}
                onClose={() => setRoleToDelete(null)}
                onConfirm={confirmDeleteRole}
                title="Usuń Rolę"
                message={`Czy na pewno chcesz usunąć rolę "${roleToDelete}"? Użytkownicy przypisani do tej roli zostaną zdegradowani do roli domyślnej ("Użytkownik").`}
                confirmButtonText="Tak, usuń"
            />

            <ConfirmationModal 
                isOpen={!!subRoleToDelete}
                onClose={() => setSubRoleToDelete(null)}
                onConfirm={confirmDeleteSubRole}
                title="Usuń Oddział"
                message={`Czy na pewno chcesz usunąć oddział "${subRoleToDelete}"? Użytkownicy z tego oddziału zostaną przeniesieni do oddziału AGRO.`}
                confirmButtonText="Tak, usuń"
            />
        </div>
    );
};

export default RolesManagementPage;
