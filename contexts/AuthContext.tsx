
import React, { createContext, useContext, PropsWithChildren, useState, useCallback, useMemo, useEffect } from 'react';
import { User, UserRole, Permission } from '../../types';
import { INITIAL_USERS } from '../../src/initialData';
import { DEFAULT_SETTINGS, PREDEFINED_ROLES, API_BASE_URL } from '../../constants';

export interface AuthContextValue {
    currentUser: User | null;
    users: User[];
    handleLogin: (user: User) => void;
    handleLogout: () => void;
    forcePasswordUpdate: (userId: string, newPassword: string) => { success: boolean; message: string, updatedUser?: User };
    checkPermission: (permission: Permission) => boolean;
    handleResetPassword: (userId: string) => { success: boolean, message: string, tempPassword?: string };
    handleAddUser: (userData: Omit<User, 'id' | 'passwordLastChanged' | 'permissions'>) => { success: boolean, message: string };
    handleEditUser: (userId: string, updates: Partial<User>) => { success: boolean, message: string };
    handleDeleteUser: (userId: string) => { success: boolean, message: string };
    sessionTimeoutMinutes: number;
    setSessionTimeoutMinutes: React.Dispatch<React.SetStateAction<number>>;
    promptTimeoutMinutes: number;
    setPromptTimeoutMinutes: React.Dispatch<React.SetStateAction<number>>;
    allRoles: string[];
    rolePermissions: Record<string, Permission[]>;
    handleAddNewRole: (roleName: string) => { success: boolean, message: string };
    handleDeleteRole: (roleName: string) => { success: boolean, message: string };
    handleUpdateRolePermissions: (roleName: string, permissions: Permission[]) => { success: boolean, message: string };
    handleUpdateUserPermissions: (userId: string, permissions: Permission[]) => { success: boolean, message: string };
    getRoleLabel: (roleName: string) => string;
    allSubRoles: string[];
    handleAddSubRole: (name: string) => { success: boolean, message: string };
    handleDeleteSubRole: (name: string) => { success: boolean, message: string };
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const useAuth = (): AuthContextValue => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider: React.FC<PropsWithChildren> = ({ children }) => {
    const [users, setUsers] = useState<User[]>([]);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [sessionTimeoutMinutes, setSessionTimeoutMinutes] = useState<number>(DEFAULT_SETTINGS.SESSION_TIMEOUT_MINUTES);
    const [promptTimeoutMinutes, setPromptTimeoutMinutes] = useState<number>(DEFAULT_SETTINGS.PROMPT_TIMEOUT_MINUTES);
    
    const [rolePermissions, setRolePermissions] = useState<Record<string, Permission[]>>({});
    const [allSubRoles, setAllSubRoles] = useState<string[]>(['AGRO', 'OSIP']);

    // Pobieranie użytkowników z API
    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/users`);
                if (response.ok) {
                    const data = await response.json();
                    // Transformuj dane z bazy na format aplikacji
                    const transformed: User[] = await Promise.all(data.map(async (row: any) => {
                        // Pobierz uprawnienia dla każdego użytkownika z API
                        let permissions: Permission[] = [];
                        try {
                            const permResponse = await fetch(`${API_BASE_URL}/permissions/${row.id}`);
                            if (permResponse.ok) {
                                const permData = await permResponse.json();
                                permissions = permData.permissions as Permission[];
                            } else {
                                // Uprawnienia będą puste jeśli nie ma w bazie
                                permissions = [];
                            }
                        } catch (err) {
                            console.warn(`Błąd pobierania uprawnień dla użytkownika ${row.id}:`, err);
                            // Uprawnienia będą puste jeśli wystąpił błąd
                            permissions = [];
                        }

                        return {
                            id: row.id,
                            username: row.username,
                            password: '', // Nie przechowujemy hasła na froncie
                            role: row.role as UserRole,
                            subRole: row.sub_role || 'AGRO',
                            pin: row.pin,
                            passwordLastChanged: row.password_last_changed || new Date().toISOString(),
                            isTemporaryPassword: row.is_temporary_password === 1,
                            permissions,
                        };
                    }));
                    setUsers(transformed);
                } else {
                    // Fallback na INITIAL_USERS jeśli API zwróci błąd
                    setUsers(INITIAL_USERS.map(u => ({...u, subRole: u.subRole || 'AGRO'})));
                }
            } catch (err) {
                console.error('Błąd pobierania użytkowników z API:', err);
                // Fallback na INITIAL_USERS
                setUsers(INITIAL_USERS.map(u => ({...u, subRole: u.subRole || 'AGRO'})));
            }
        };
        fetchUsers();
    }, []);

    const allRoles = useMemo(() => {
        return Array.from(new Set([...PREDEFINED_ROLES, ...Object.keys(rolePermissions)]))
            .sort((a,b) => a.localeCompare(b));
    }, [rolePermissions]);

    const handleLogin = (user: User) => setCurrentUser(user);
    const handleLogout = () => setCurrentUser(null);
    
    const forcePasswordUpdate = (userId: string, newPass: string): { success: boolean; message: string, updatedUser?: User } => {
        const foundUser = users.find(u => u.id === userId);
        if (!foundUser) {
            return { success: false, message: 'Nie znaleziono użytkownika.' };
        }

        const updatedUser = { 
            ...foundUser, 
            password: newPass, 
            isTemporaryPassword: false, 
            passwordLastChanged: new Date().toISOString() 
        };

        setUsers(prev => prev.map(u => u.id === userId ? updatedUser : u));
        
        // Synchronizacja z API
        fetch(`${API_BASE_URL}/users/${userId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                password: newPass,
                passwordLastChanged: updatedUser.passwordLastChanged
            })
        }).catch(err => console.error('Błąd synchronizacji hasła z bazą:', err));
        
        return { success: true, message: 'Hasło zostało zaktualizowane.', updatedUser };
    };

    const checkPermission = useCallback((permission: Permission): boolean => {
        if (!currentUser) return false;
        
        if (currentUser.role === 'admin' || currentUser.role === 'boss') {
            return true;
        }

        return currentUser.permissions?.includes(permission) || false;
    }, [currentUser]);
    
    const handleResetPassword = (userId: string) => {
        const foundUser = users.find(u => u.id === userId);
        if (!foundUser) {
            return { success: false, message: 'Nie udało się odnaleźć użytkownika do resetu.' };
        }

        const tempPassword = Math.random().toString(36).slice(-8);
        const passwordLastChanged = new Date().toISOString();
        
        setUsers(prev => prev.map(u => u.id === userId ? { 
            ...u, 
            isTemporaryPassword: true, 
            password: tempPassword,
            passwordLastChanged 
        } : u));

        // Synchronizacja z API
        fetch(`${API_BASE_URL}/users/${userId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                password: tempPassword,
                isTemporaryPassword: true,
                passwordLastChanged
            })
        }).catch(err => console.error('Błąd synchronizacji resetu hasła z bazą:', err));

        return { success: true, message: 'Hasło zostało zresetowane pomyślnie.', tempPassword };
    };
    
    const handleAddUser = (userData: Omit<User, 'id' | 'passwordLastChanged' | 'permissions'>) => {
        const passwordLastChanged = new Date().toISOString();
        const newUser: User = {
            id: `u-${Date.now()}`,
            ...userData,
            isTemporaryPassword: true,
            passwordLastChanged,
            permissions: [],
        };
        setUsers(prev => [...prev, newUser]);
        
        // Synchronizacja z API - generuj tymczasowe hasło
        const tempPassword = Math.random().toString(36).slice(-8);
        fetch(`${API_BASE_URL}/users`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: userData.username,
                password: tempPassword,
                role: userData.role,
                subRole: userData.subRole || 'AGRO',
                pin: userData.pin,
                isTemporaryPassword: true,
                passwordLastChanged
            })
        }).catch(err => console.error('Błąd dodawania użytkownika do bazy:', err));
        
        return { success: true, message: 'Użytkownik dodany.' };
    };

    const handleEditUser = (userId: string, updates: Partial<User>) => {
        setUsers(prev => prev.map(u => {
            if (u.id === userId) {
                const updatedUser = { ...u, ...updates };
                // Nie nadpisuj uprawnień - pozostają z bazy danych
                return updatedUser;
            }
            return u;
        }));
        
        // Synchronizacja z API
        const apiPayload: any = {};
        if (updates.username !== undefined) apiPayload.username = updates.username;
        if (updates.password !== undefined) {
            apiPayload.password = updates.password;
            apiPayload.passwordLastChanged = new Date().toISOString();
        }
        if (updates.role !== undefined) apiPayload.role = updates.role;
        if (updates.subRole !== undefined) apiPayload.subRole = updates.subRole;
        if (updates.pin !== undefined) apiPayload.pin = updates.pin;
        
        if (Object.keys(apiPayload).length > 0) {
            fetch(`${API_BASE_URL}/users/${userId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(apiPayload)
            }).catch(err => console.error('Błąd aktualizacji użytkownika w bazie:', err));
        }
        
        return { success: true, message: 'Dane użytkownika zaktualizowane.' };
    };

    const handleDeleteUser = (userId: string) => {
        setUsers(prev => prev.filter(u => u.id !== userId));
        return { success: true, message: 'Użytkownik usunięty.' };
    };

    const handleAddNewRole = (roleName: string) => {
        const normalizedRoleName = roleName.trim();
        if (rolePermissions[normalizedRoleName]) {
            return { success: false, message: `Rola '${normalizedRoleName}' już istnieje.` };
        }

        // Optymistyczne dodanie po stronie klienta
        setRolePermissions(prev => ({
            ...prev,
            [normalizedRoleName]: []
        }));

        // Wyślij do API, jeśli nie uda się zapisać na serwerze - cofamy zmianę
        try {
            const roleId = normalizedRoleName.toLowerCase().replace(/\s+/g, '_');
            fetch(`${API_BASE_URL}/roles`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: roleId, label: roleName })
            }).then(res => {
                if (!res.ok) {
                    setRolePermissions(prev => {
                        const cp = { ...prev } as any;
                        delete cp[normalizedRoleName];
                        return cp;
                    });
                    console.error('Błąd zapisu roli na serwerze', res.statusText);
                } else {
                    console.log('Rola zapisana na serwerze', roleId);
                }
            }).catch(err => {
                setRolePermissions(prev => {
                    const cp = { ...prev } as any;
                    delete cp[normalizedRoleName];
                    return cp;
                });
                console.error('Błąd sieci przy zapisie roli', err);
            });
        } catch (err) {
            console.error('Błąd wysyłania żądania dodania roli:', err);
        }

        return { success: true, message: `Rola '${normalizedRoleName}' została dodana.` };
    };

    const handleDeleteRole = (roleName: string) => {
        // ZMIANA: Tylko 'admin' jest zablokowany przed usunięciem w logice biznesowej
        if (roleName.toLowerCase() === 'admin') {
            return { success: false, message: `Nie można usunąć roli administratora.` };
        }

        // Degradacja użytkowników usuniętej roli
        setUsers(prev => prev.map(u => u.role === roleName ? { ...u, role: 'user' } : u));

        setRolePermissions(prev => {
            const newPermissions = { ...prev };
            delete newPermissions[roleName];
            return newPermissions;
        });
        return { success: true, message: `Rola '${roleName}' została usunięta, użytkownicy przeniesieni do 'Użytkownik'.` };
    };

    const handleUpdateRolePermissions = (roleName: string, permissions: Permission[]) => {
        setRolePermissions(prev => ({
            ...prev,
            [roleName]: permissions
        }));
        return { success: true, message: `Uprawnienia dla roli '${roleName}' zaktualizowane.` };
    };

    const handleUpdateUserPermissions = async (userId: string, newPermissions: Permission[]) => {
        const token = localStorage.getItem('jwt_token');
        try {
            // 1. Wyślij uprawnienia do API
            const response = await fetch(`${API_BASE_URL}/user-permissions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token || ''}`
                },
                body: JSON.stringify({
                    userId,
                    permissions: newPermissions
                })
            });

            if (!response.ok) {
                console.error('Błąd zapisywania uprawnień:', response.statusText);
                return { success: false, message: 'Błąd zapisywania uprawnień na serwerze' };
            }

            // 2. Pobierz aktualne uprawnienia z API
            const permResponse = await fetch(`${API_BASE_URL}/permissions/${userId}`);
            if (permResponse.ok) {
                const permData = await permResponse.json();
                const updatedPermissions = permData.permissions as Permission[];

                // 3. Aktualizuj state lokalnie
                setUsers(prevUsers => 
                    prevUsers.map(user => 
                        user.id === userId ? { ...user, permissions: updatedPermissions } : user
                    )
                );
                
                if (currentUser?.id === userId) {
                    setCurrentUser(prev => prev ? { ...prev, permissions: updatedPermissions } : null);
                }

                console.log(`✅ Uprawnienia dla użytkownika ${userId} zostały zaktualizowane`);
                return { success: true, message: 'Uprawnienia zostały zapisane' };
            }

            return { success: true, message: 'Uprawnienia zostały zapisane' };
        } catch (err) {
            console.error('Błąd:', err);
            return { success: false, message: 'Błąd połączenia z serwerem' };
        }
    };

    const handleAddSubRole = (name: string) => {
        const normalized = name.trim().toUpperCase();
        if (allSubRoles.includes(normalized)) return { success: false, message: 'Taki oddział już istnieje.' };
        setAllSubRoles(prev => [...prev, normalized]);
        return { success: true, message: `Dodano oddział ${normalized}.` };
    };

    const handleDeleteSubRole = (name: string) => {
        if (name === 'AGRO') return { success: false, message: 'Nie można usunąć oddziału głównego.' };
        setAllSubRoles(prev => prev.filter(r => r !== name));
        setUsers(prev => prev.map(u => u.subRole === name ? {...u, subRole: 'AGRO'} : u));
        return { success: true, message: 'Oddział usunięty.' };
    };
    
    const getRoleLabel = useCallback((roleName: string): string => {
        switch (roleName) {
            case 'admin': return 'Administrator';
            case 'planista': return 'Planista';
            case 'magazynier': return 'Magazynier';
            case 'kierownik magazynu': return 'Kierownik Magazynu';
            case 'lab': return 'Laborant';
            case 'operator_psd': return 'Operator PSD';
            case 'operator_agro': return 'Operator AGRO';
            case 'operator_procesu': return 'Operator Procesu';
            case 'user': return 'Użytkownik';
            case 'boss': return 'Szef';
            case 'lider': return 'Lider';
            default: return roleName.charAt(0).toUpperCase() + roleName.slice(1).replace(/_/g, ' ');
        }
    }, []);

    const value: AuthContextValue = {
        currentUser,
        users,
        handleLogin,
        handleLogout,
        forcePasswordUpdate,
        checkPermission,
        handleResetPassword,
        handleAddUser,
        handleEditUser,
        handleDeleteUser,
        sessionTimeoutMinutes,
        setSessionTimeoutMinutes,
        promptTimeoutMinutes,
        setPromptTimeoutMinutes,
        allRoles,
        rolePermissions,
        handleAddNewRole,
        handleDeleteRole,
        handleUpdateRolePermissions,
        handleUpdateUserPermissions,
        getRoleLabel,
        allSubRoles,
        handleAddSubRole,
        handleDeleteSubRole
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
