
import React, { createContext, useContext, PropsWithChildren, useState, useCallback, useMemo } from 'react';
import { User, UserRole, Permission } from '../../types';
import { usePersistedState } from '../../src/usePersistedState';
import { INITIAL_USERS } from '../../src/initialData';
import { DEFAULT_SETTINGS, DEFAULT_PERMISSIONS, PREDEFINED_ROLES, DEFAULT_CUSTOM_PERMISSIONS } from '../../constants';

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
    // Zarządzanie podrolami (oddziałami)
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
    const [users, setUsers] = usePersistedState<User[]>('users_v2_subroles', INITIAL_USERS.map(u => ({...u, subRole: u.subRole || 'AGRO'})));
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [sessionTimeoutMinutes, setSessionTimeoutMinutes] = usePersistedState<number>('settings_sessionTimeout_v1', DEFAULT_SETTINGS.SESSION_TIMEOUT_MINUTES);
    const [promptTimeoutMinutes, setPromptTimeoutMinutes] = usePersistedState<number>('settings_promptTimeout_v1', DEFAULT_SETTINGS.PROMPT_TIMEOUT_MINUTES);
    
    const [rolePermissions, setRolePermissions] = usePersistedState<Record<string, Permission[]>>('rolePermissions', DEFAULT_PERMISSIONS);
    const [allSubRoles, setAllSubRoles] = usePersistedState<string[]>('app_subroles_list_v1', ['AGRO', 'OSIP']);

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
        
        setUsers(prev => prev.map(u => u.id === userId ? { 
            ...u, 
            isTemporaryPassword: true, 
            password: tempPassword,
            passwordLastChanged: new Date().toISOString() 
        } : u));

        return { success: true, message: 'Hasło zostało zresetowane pomyślnie.', tempPassword };
    };
    
    const handleAddUser = (userData: Omit<User, 'id' | 'passwordLastChanged' | 'permissions'>) => {
        const newUser: User = {
            id: `u-${Date.now()}`,
            ...userData,
            isTemporaryPassword: true,
            passwordLastChanged: new Date().toISOString(),
            permissions: rolePermissions[userData.role] || [],
        };
        setUsers(prev => [...prev, newUser]);
        return { success: true, message: 'Użytkownik dodany.' };
    };

    const handleEditUser = (userId: string, updates: Partial<User>) => {
        setUsers(prev => prev.map(u => {
            if (u.id === userId) {
                const updatedUser = { ...u, ...updates };
                if (updates.role && u.role !== updates.role) {
                    updatedUser.permissions = rolePermissions[updates.role] || DEFAULT_CUSTOM_PERMISSIONS;
                }
                return updatedUser;
            }
            return u;
        }));
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
        setRolePermissions(prev => ({
            ...prev,
            [normalizedRoleName]: DEFAULT_CUSTOM_PERMISSIONS
        }));
        return { success: true, message: `Rola '${normalizedRoleName}' została dodana.` };
    };

    const handleDeleteRole = (roleName: string) => {
        if (PREDEFINED_ROLES.includes(roleName.toLowerCase())) {
            return { success: false, message: `Nie można usunąć systemowej roli '${roleName}'.` };
        }

        setUsers(prev => prev.map(u => u.role === roleName ? { ...u, role: 'user' } : u));

        setRolePermissions(prev => {
            const newPermissions = { ...prev };
            delete newPermissions[roleName];
            return newPermissions;
        });
        return { success: true, message: `Rola '${roleName}' została usunięta, użytkownicy przeniesieni do 'user'.` };
    };

    const handleUpdateRolePermissions = (roleName: string, permissions: Permission[]) => {
        setRolePermissions(prev => ({
            ...prev,
            [roleName]: permissions
        }));
        return { success: true, message: `Uprawnienia dla roli '${roleName}' zaktualizowane.` };
    };

    const handleUpdateUserPermissions = (userId: string, newPermissions: Permission[]) => {
        let success = false;
        setUsers(prevUsers => {
            const userExists = prevUsers.some(u => u.id === userId);
            if (!userExists) return prevUsers;

            success = true;
            return prevUsers.map(user => 
                user.id === userId ? { ...user, permissions: newPermissions } : user
            );
        });
        
        if (currentUser?.id === userId) {
            setCurrentUser(prev => prev ? { ...prev, permissions: newPermissions } : null);
        }

        return { success, message: success ? "Uprawnienia zaktualizowane." : "Nie znaleziono użytkownika." };
    };

    const handleAddSubRole = (name: string) => {
        const normalized = name.trim().toUpperCase();
        if (allSubRoles.includes(normalized)) return { success: false, message: 'Taki oddział już istnieje.' };
        setAllSubRoles(prev => [...prev, normalized]);
        return { success: true, message: `Dodano oddział ${normalized}.` };
    };

    const handleDeleteSubRole = (name: string) => {
        if (['AGRO', 'OSIP'].includes(name)) return { success: false, message: 'Nie można usunąć oddziałów podstawowych.' };
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
