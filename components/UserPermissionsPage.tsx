
import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from './contexts/AuthContext';
import { Permission, User } from '../types';
import { API_BASE_URL } from '../constants';
import Button from './Button';
import Alert from './Alert';
import Input from './Input';
import ShieldCheckIcon from './icons/ShieldCheckIcon';
import UserIcon from './icons/UserIcon';
import SearchIcon from './icons/SearchIcon';
import CheckCircleIcon from './icons/CheckCircleIcon';

interface PermissionGroup {
    name: string;
    permissions: Permission[];
}

const PERMISSION_GROUPS: PermissionGroup[] = [
    {
        name: 'Administracja i System',
        permissions: [Permission.MANAGE_USERS, Permission.MANAGE_PERMISSIONS, Permission.MANAGE_SYSTEM_SETTINGS, Permission.MANAGE_PRODUCTS, Permission.MANAGE_PRODUCTION_STATIONS]
    },
    {
        name: 'Logistyka i Przyjęcia',
        permissions: [Permission.CREATE_DELIVERY, Permission.MANAGE_DELIVERIES, Permission.PROCESS_DELIVERY_WAREHOUSE, Permission.PLAN_INTERNAL_TRANSFERS, Permission.MANAGE_INTERNAL_TRANSFERS]
    },
    {
        name: 'Produkcja AGRO',
        permissions: [Permission.PLAN_PRODUCTION_AGRO, Permission.EXECUTE_PRODUCTION_AGRO]
    },
    {
        name: 'Produkcja PSD i Miksowanie',
        permissions: [Permission.PLAN_PRODUCTION_PSD, Permission.EXECUTE_PRODUCTION_PSD, Permission.PLAN_MIXING, Permission.EXECUTE_MIXING]
    },
    {
        name: 'Logistyka i Wydania',
        permissions: [Permission.PLAN_DISPATCH_ORDERS, Permission.MANAGE_DISPATCH_ORDERS]
    },
    {
        name: 'Jakość i Laboratorium',
        permissions: [Permission.PROCESS_DELIVERY_LAB, Permission.PROCESS_ANALYSIS, Permission.MANAGE_ADJUSTMENTS, Permission.MANAGE_PALLET_LOCK, Permission.EXTEND_EXPIRY_DATE]
    }
];

const getPermissionLabel = (permission: Permission): string => {
    const labels: Record<Permission, string> = {
        [Permission.MANAGE_USERS]: 'Zarządzanie użytkownikami',
        [Permission.MANAGE_PERMISSIONS]: 'Zarządzanie uprawnieniami',
        [Permission.MANAGE_SYSTEM_SETTINGS]: 'Ustawienia systemowe',
        [Permission.MANAGE_PRODUCTS]: 'Katalog produktów',
        [Permission.MANAGE_PRODUCTION_STATIONS]: 'Stacje zasypowe',
        [Permission.CREATE_DELIVERY]: 'Tworzenie dostaw',
        [Permission.PROCESS_DELIVERY_LAB]: 'Badania laboratoryjne dostaw',
        [Permission.PROCESS_DELIVERY_WAREHOUSE]: 'Przyjęcia magazynowe',
        [Permission.MANAGE_DELIVERIES]: 'Edycja/Usuwanie dostaw',
        [Permission.PLAN_PRODUCTION_AGRO]: 'Planowanie AGRO',
        [Permission.EXECUTE_PRODUCTION_AGRO]: 'Realizacja AGRO',
        [Permission.PLAN_PRODUCTION_PSD]: 'Planowanie PSD',
        [Permission.EXECUTE_PRODUCTION_PSD]: 'Realizacja PSD',
        [Permission.PLAN_MIXING]: 'Planowanie Miksowania',
        [Permission.EXECUTE_MIXING]: 'Realizacja Miksowania',
        [Permission.PLAN_DISPATCH_ORDERS]: 'Planowanie Wydań',
        [Permission.MANAGE_DISPATCH_ORDERS]: 'Realizacja Wydań (Rampa)',
        [Permission.PROCESS_ANALYSIS]: 'Badania laboratoryjne (NIRS)',
        [Permission.MANAGE_ADJUSTMENTS]: 'Zarządzanie dosypkami',
        [Permission.MANAGE_PALLET_LOCK]: 'Blokowanie/Zwalnianie palet',
        [Permission.EXTEND_EXPIRY_DATE]: 'Przedłużanie terminów ważności',
        [Permission.PLAN_INTERNAL_TRANSFERS]: 'Planowanie transferów OSiP',
        [Permission.MANAGE_INTERNAL_TRANSFERS]: 'Realizacja transferów OSiP',
    };
    return labels[permission] || permission;
};

const UserPermissionsPage: React.FC = () => {
    const { users, handleUpdateUserPermissions, getRoleLabel, checkPermission } = useAuth();
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    const [userSearch, setUserSearch] = useState('');
    const [draftPermissions, setDraftPermissions] = useState<Permission[]>([]);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    const hasManagePermissionsPermission = checkPermission(Permission.MANAGE_PERMISSIONS);

    const filteredUsers = useMemo(() => {
        return (users || []).filter(u => 
            u.username.toLowerCase().includes(userSearch.toLowerCase()) ||
            getRoleLabel(u.role).toLowerCase().includes(userSearch.toLowerCase())
        );
    }, [users, userSearch, getRoleLabel]);

    const selectedUser = useMemo(() => 
        users.find(u => u.id === selectedUserId), 
    [users, selectedUserId]);

    // Pobierz uprawnienia TYLKO z API/bazy danych, nigdy z local state
    useEffect(() => {
        if (selectedUserId) {
            console.log('👤 Pobieranie uprawnień dla użytkownika ID:', selectedUserId);
            const fetchPermissions = async () => {
                try {
                    const response = await fetch(`${API_BASE_URL}/user-permissions/${selectedUserId}`, {
                        cache: 'no-cache',
                        headers: {
                            'Cache-Control': 'no-cache, no-store, must-revalidate'
                        }
                    });
                    if (response.ok) {
                        const data = await response.json();
                        console.log('📥 Pobrane uprawnienia z bazy danych (API):', data.permissions);
                        setDraftPermissions([...(data.permissions || [])]);
                    } else {
                        console.error('❌ Błąd pobierania uprawnień, status:', response.status);
                        setDraftPermissions([]);
                    }
                } catch (err) {
                    console.error('❌ Błąd połączenia z API:', err);
                    setDraftPermissions([]);
                }
            };
            fetchPermissions();
            setFeedback(null);
        }
    }, [selectedUserId]); // Zależy TYLKO od selectedUserId, zawsze pobiera z API

    const handlePermissionToggle = (permission: Permission) => {
        if (!hasManagePermissionsPermission) return;
        setDraftPermissions(prev => 
            prev.includes(permission) 
                ? prev.filter(p => p !== permission) 
                : [...prev, permission]
        );
    };

    const handleSave = async () => {
        if (!selectedUserId) return;
        console.log('💾 Zapisuję uprawnienia do bazy danych:', draftPermissions);
        const result = await handleUpdateUserPermissions(selectedUserId, draftPermissions);
        setFeedback({ 
            type: result.success ? 'success' : 'error', 
            message: result.message 
        });
        if (result.success) {
            setTimeout(() => setFeedback(null), 3000);
        }
    };

    return (
        <div className="h-full flex flex-col overflow-hidden bg-slate-50 dark:bg-secondary-900">
            <header className="p-4 md:p-6 bg-white dark:bg-secondary-800 border-b dark:border-secondary-700 shrink-0">
                <div className="flex items-center gap-3">
                    <ShieldCheckIcon className="h-8 w-8 text-primary-600 dark:text-primary-400" />
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Uprawnienia Użytkowników</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Wybierz osobę, aby zarządzać jej dostępem do funkcji systemu.</p>
                    </div>
                </div>
            </header>

            <div className="flex-grow flex overflow-hidden">
                {/* LISTA UŻYTKOWNIKÓW (Master) */}
                <aside className="w-full md:w-80 border-r dark:border-secondary-700 bg-white dark:bg-secondary-800 flex flex-col">
                    <div className="p-4 border-b dark:border-secondary-700">
                        <Input 
                            label="" 
                            placeholder="Szukaj użytkownika..." 
                            value={userSearch}
                            onChange={e => setUserSearch(e.target.value)}
                            icon={<SearchIcon className="h-4 w-4" />}
                        />
                    </div>
                    <div className="flex-grow overflow-y-auto scrollbar-hide">
                        {filteredUsers.map(user => (
                            <button
                                key={user.id}
                                onClick={() => setSelectedUserId(user.id)}
                                className={`w-full p-4 text-left border-b dark:border-secondary-700 transition-colors flex items-center gap-3 ${selectedUserId === user.id ? 'bg-primary-50 dark:bg-primary-900/20 border-r-4 border-r-primary-600' : 'hover:bg-gray-50 dark:hover:bg-secondary-700/50'}`}
                            >
                                <div className={`p-2 rounded-full ${selectedUserId === user.id ? 'bg-primary-100 text-primary-600' : 'bg-gray-100 text-gray-400 dark:bg-secondary-700'}`}>
                                    <UserIcon className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="font-bold text-gray-900 dark:text-white">{user.username}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">{getRoleLabel(user.role)}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                </aside>

                {/* DETALE UPRAWNIEŃ (Detail) */}
                <main className="flex-grow overflow-y-auto p-4 md:p-8 scrollbar-hide">
                    {selectedUser ? (
                        <div className="max-w-4xl mx-auto space-y-8 animate-fadeIn">
                            <div className="flex justify-between items-center bg-white dark:bg-secondary-800 p-6 rounded-xl shadow-sm border dark:border-secondary-700">
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">Uprawnienia dla: {selectedUser.username}</h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Rola systemowa: {getRoleLabel(selectedUser.role)}</p>
                                </div>
                                {hasManagePermissionsPermission && (
                                    <Button onClick={handleSave} className="shadow-lg px-8">Zapisz uprawnienia</Button>
                                )}
                            </div>

                            {feedback && <Alert type={feedback.type} message={feedback.message} />}

                            {(selectedUser.role === 'admin' || selectedUser.role === 'boss') && (
                                <Alert type="info" message="Użytkownik nadrzędny" details="Ten użytkownik posiada pełny dostęp do wszystkich funkcji systemu ze względu na swoją rolę." />
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-20">
                                {PERMISSION_GROUPS.map(group => (
                                    <section key={group.name} className="bg-white dark:bg-secondary-800 rounded-xl shadow-sm border dark:border-secondary-700 overflow-hidden">
                                        <div className="bg-slate-50 dark:bg-secondary-700/50 px-4 py-3 border-b dark:border-secondary-700">
                                            <h4 className="font-bold text-sm text-gray-700 dark:text-gray-200 uppercase tracking-widest">{group.name}</h4>
                                        </div>
                                        <div className="p-4 space-y-3">
                                            {group.permissions.map(permission => {
                                                const isEnabled = draftPermissions.includes(permission) || selectedUser.role === 'admin' || selectedUser.role === 'boss';
                                                return (
                                                    <button
                                                        key={permission}
                                                        onClick={() => handlePermissionToggle(permission)}
                                                        disabled={!hasManagePermissionsPermission || selectedUser.role === 'admin' || selectedUser.role === 'boss'}
                                                        className={`w-full flex items-center justify-between p-3 rounded-lg border-2 transition-all ${isEnabled ? 'bg-primary-50 dark:bg-primary-900/10 border-primary-200 dark:border-primary-800' : 'bg-white dark:bg-secondary-800 border-gray-100 dark:border-secondary-700 opacity-60'}`}
                                                    >
                                                        <span className={`text-sm font-medium ${isEnabled ? 'text-primary-900 dark:text-primary-100' : 'text-gray-600 dark:text-gray-400'}`}>
                                                            {getPermissionLabel(permission)}
                                                        </span>
                                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center ${isEnabled ? 'bg-primary-600 text-white' : 'bg-gray-200 dark:bg-secondary-700 text-transparent'}`}>
                                                            <CheckCircleIcon className="h-4 w-4" />
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </section>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-600 text-center">
                            <ShieldCheckIcon className="h-20 w-20 mb-4 opacity-20" />
                            <h3 className="text-xl font-medium">Brak wybranego użytkownika</h3>
                            <p className="max-w-xs mt-2">Wybierz osobę z listy po lewej stronie, aby wyświetlić jej uprawnienia i dokonać zmian.</p>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

export default UserPermissionsPage;
