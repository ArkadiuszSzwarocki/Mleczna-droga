
import React, { createContext, useContext, PropsWithChildren, useState, useCallback, useMemo, useEffect } from 'react';
import { User, UserRole, Permission } from '../../types';
import { INITIAL_USERS } from '../../src/initialData';
// FIX: Added missing PREDEFINED_ROLES to the import from constants.
import { DEFAULT_SETTINGS, PREDEFINED_ROLES, API_BASE_URL } from '../../constants';

export interface AuthContextValue {
    currentUser: User | null;
    users: User[];
    handleLogin: (username: string, password: string) => Promise<{ success: boolean; message: string }>;
    handleLogout: () => void;
    handleChangePassword: (oldPassword: string, newPassword: string) => Promise<{ success: boolean; message: string }>;
    handleForceChangePassword: (newPassword: string) => Promise<{ success: boolean; message: string }>;
    checkPermission: (permission: Permission) => boolean;
    handleResetPassword: (userId: string) => Promise<{ success: boolean, message: string, tempPassword?: string }>;
    handleAddUser: (userData: Omit<User, 'id' | 'passwordLastChanged' | 'permissions' | 'password'>) => Promise<{ success: boolean, message: string }>;
    handleEditUser: (userId: string, updates: Partial<Omit<User, 'password'>>) => Promise<{ success: boolean, message: string }>;
    handleDeleteUser: (userId: string) => Promise<{ success: boolean, message: string }>;
    sessionTimeoutMinutes: number;
    setSessionTimeoutMinutes: React.Dispatch<React.SetStateAction<number>>;
    promptTimeoutMinutes: number;
    setPromptTimeoutMinutes: React.Dispatch<React.SetStateAction<number>>;
    allRoles: string[];
    rolePermissions: Record<string, Permission[]>;
    handleAddNewRole: (roleName: string) => { success: boolean, message: string };
    handleDeleteRole: (roleName: string) => { success: boolean, message: string };
    handleUpdateRolePermissions: (roleName: string, permissions: Permission[]) => { success: boolean, message: string };
    // FIX: Updated handleUpdateUserPermissions interface to be asynchronous (returning Promise).
    handleUpdateUserPermissions: (userId: string, permissions: Permission[]) => Promise<{ success: boolean, message: string }>;
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
    const [dbSubRoles, setDbSubRoles] = useState<any[]>([]);
    const [dbRoles, setDbRoles] = useState<any[]>([]);

    // Funkcja pomocnicza do dekodowania base64 z obsługą UTF-8
    const base64UrlDecode = (str: string): string => {
        // Zamień base64url na base64
        str = str.replace(/-/g, '+').replace(/_/g, '/');
        // Dodaj padding jeśli potrzebny
        while (str.length % 4) {
            str += '=';
        }
        // Dekoduj base64 i zamień na UTF-8
        try {
            // Używamy decodeURIComponent i escape dla poprawnej obsługi UTF-8
            return decodeURIComponent(escape(atob(str)));
        } catch (e) {
            console.error('Błąd dekodowania base64:', e);
            return atob(str); // Fallback na zwykły atob
        }
    };

    // FIX: Moved refreshRolesFromAPI function out of the useEffect and into the AuthProvider scope to resolve 'Cannot find name' errors.
    const refreshRolesFromAPI = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/roles`);
            if (response.ok) {
                const apiRoles = await response.json();
                setDbRoles(apiRoles);
                console.log('✅ Role pobrane z bazy:', apiRoles);
            } else {
                console.log('ℹ️ Błąd pobierania ról z API:', response.status);
            }
        } catch (error) {
            console.log('⚠️ Nie mogę pobrać ról z bazy:', error);
        }
    };

    // Przywróć JWT token z localStorage przy starcie
    useEffect(() => {
        const token = localStorage.getItem('jwt_token');
        if (token) {
            // Sprawdzić czy token jest ważny - na podstawie `exp` claim
            try {
                const parts = token.split('.');
                if (parts.length === 3) {
                    const decodedString = base64UrlDecode(parts[1]);
                    const decoded = JSON.parse(decodedString);
                    if (decoded.exp && decoded.exp * 1000 > Date.now()) {
                        // Token jest ważny, zautomatyzuj logowanie
                        setCurrentUser({
                            id: decoded.id,
                            username: decoded.username,
                            role: decoded.role as UserRole,
                            subRole: decoded.subRole || 'AGRO',
                            pin: decoded.pin || '',
                            passwordLastChanged: new Date().toISOString(),
                            permissions: [],
                            isTemporaryPassword: false
                        });
                        console.log('✅ Użytkownik przywrócony z tokenu:', decoded.username);
                    } else {
                        localStorage.removeItem('jwt_token');
                    }
                }
            } catch (e) {
                console.log('⚠️ Błąd odczytu tokenu:', e);
                localStorage.removeItem('jwt_token');
            }
        }
    }, []);

    // Pobierz użytkowników z API (bazy danych)
    useEffect(() => {
        const fetchUsersFromAPI = async () => {
            try {
                const token = localStorage.getItem('jwt_token');
                const headers: HeadersInit = { 'Content-Type': 'application/json' };
                if (token) {
                    headers['Authorization'] = `Bearer ${token}`;
                }

                const response = await fetch(`${API_BASE_URL}/users`, { headers });
                if (response.ok) {
                    const apiUsers = await response.json();
                    if (apiUsers && apiUsers.length > 0) {
                        // Mapuj użytkowników z API - BEZ hasła!
                        const mappedUsers = apiUsers.map((user: any) => ({
                            id: user.id,
                            username: user.username,
                            role: (user.role || 'user') as UserRole,
                            subRole: user.sub_role || user.subRole || 'AGRO',
                            pin: user.pin,
                            email: user.email,
                            isActive: user.is_active !== undefined ? user.is_active : (user.isActive !== undefined ? user.isActive : 1),
                            passwordLastChanged: user.password_last_changed || user.passwordLastChanged || new Date().toISOString(),
                            permissions: user.permissions || [],
                            isTemporaryPassword: user.is_temporary_password || false
                        }));
                        setUsers(mappedUsers);
                        console.log('✅ Użytkownicy załadowani z API (baza danych):', mappedUsers.length);
                    } else {
                        console.log('ℹ️ API zwróciło pustą listę');
                        setUsers([]);
                    }
                } else {
                    console.log('ℹ️ Błąd API:', response.status);
                    setUsers([]);
                }
            } catch (error) {
                console.log('❌ Nie mogę się połączyć z API:', error);
                setUsers([]);
            }
        };

        // Pobierz użytkowników przy starcie
        fetchUsersFromAPI();
        
        // Wywołaj odświeżanie ról
        refreshRolesFromAPI();

        // Pobierz oddziały (sub_roles)
        const refreshSubRolesFromAPI = async () => {
            try {
                const resp = await fetch(`${API_BASE_URL}/sub-roles`);
                if (resp.ok) {
                    const list = await resp.json();
                    setDbSubRoles(list);
                    // map to ids
                    const ids = list.map((r: any) => r.id);
                    setAllSubRoles(ids);
                    console.log('✅ Oddziały pobrane z bazy:', ids);
                }
            } catch (err) {
                console.warn('⚠️ Nie udało się pobrać sub_roles z API', err);
            }
        };

        // Initial fetch
        refreshSubRolesFromAPI();

        // Polling: odświeżaj role i oddziały co 10 sekund, aby przechwycić zmiany w bazie dokonane z zewnątrz
        const interval = setInterval(() => {
            try { refreshRolesFromAPI(); } catch (e) { /* ignore */ }
            try { refreshSubRolesFromAPI(); } catch (e) { /* ignore */ }
        }, 10000);

        return () => clearInterval(interval);
    }, []);

    const allRoles = useMemo(() => {
        // Jeśli mamy role z bazy, użyj ich, w przeciwnym razie fallback na PREDEFINED_ROLES
        if (dbRoles && dbRoles.length > 0) {
            return dbRoles.map((r: any) => r.name).sort((a,b) => a.localeCompare(b));
        }
        return Array.from(new Set([...PREDEFINED_ROLES, ...Object.keys(rolePermissions)]))
            .sort((a,b) => a.localeCompare(b));
    }, [dbRoles, rolePermissions]);

    // Nowe logowanie - używa JWT
    const handleLogin = async (username: string, password: string): Promise<{ success: boolean; message: string; user?: User }> => {
        try {
            const response = await fetch(`${API_BASE_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            if (response.ok) {
                const result = await response.json();
                
                // Zapisz JWT token
                localStorage.setItem('jwt_token', result.token);
                
                // Ustaw bieżącego użytkownika
                const user = result.user as User;
                
                // Pobierz uprawnienia indywidualne + z roli
                try {
                    console.log(`🔐 Pobieranie uprawnień dla user.id=${user.id}`);
                    const permResponse = await fetch(`${API_BASE_URL}/permissions/${user.id}`);
                    console.log(`🔐 Odpowiedź uprawnień: status=${permResponse.status}`);
                    if (permResponse.ok) {
                        const permData = await permResponse.json();
                        console.log(`🔐 Uprawnienia z API:`, permData.permissions);
                        user.permissions = permData.permissions as Permission[];
                    } else {
                        console.warn(`🔐 Błąd pobierania uprawnień, kod: ${permResponse.status}`);
                        user.permissions = [];
                    }
                } catch (err) {
                    console.warn('Błąd pobierania uprawnień:', err);
                    user.permissions = [];
                }
                
                console.log(`🔐 Finalny user z uprawnieniami:`, user);
                
                setCurrentUser(user);
                
                // Odśwież listę użytkowników z API po zalogowaniu
                await refreshUsersFromAPI();
                
                console.log(`✅ Zalogowano jako ${username}`);
                return { success: true, message: 'Zalogowano pomyślnie', user };
            } else {
                const error = await response.json();
                return { success: false, message: error.error || 'Błąd logowania' };
            }
        } catch (error) {
            console.log('❌ Błąd logowania:', error);
            return { success: false, message: 'Błąd serwera' };
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('jwt_token');
        setCurrentUser(null);
    };

    // Zmiana hasła
    const handleChangePassword = async (oldPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> => {
        try {
            const token = localStorage.getItem('jwt_token');
            if (!token) {
                return { success: false, message: 'Nie jesteś zalogowany' };
            }

            const response = await fetch(`${API_BASE_URL}/change-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ oldPassword, newPassword })
            });

            if (response.ok) {
                console.log('✅ Hasło zmienione');
                return { success: true, message: 'Hasło zostało zmienione' };
            } else {
                const error = await response.json();
                return { success: false, message: error.error || 'Błąd zmiany hasła' };
            }
        } catch (error) {
            console.log('❌ Błąd zmiany hasła:', error);
            return { success: false, message: 'Błąd serwera' };
        }
    };

    // Wymuszenie zmiany hasła dla hasła tymczasowego (bez weryfikacji starego hasła)
    const handleForceChangePassword = async (newPassword: string): Promise<{ success: boolean; message: string }> => {
        try {
            const token = localStorage.getItem('jwt_token');
            console.log(`🔐 handleForceChangePassword: token=${token ? 'YES' : 'NO'}, newPassword="${newPassword}"`);
            
            if (!token) {
                console.log('❌ handleForceChangePassword: Nie masz JWT token');
                return { success: false, message: 'Nie jesteś zalogowany' };
            }

            console.log(`🔐 handleForceChangePassword: Wysyłam POST do /force-change-password`);
            const response = await fetch(`${API_BASE_URL}/force-change-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ newPassword })
            });

            const data = await response.json();
            console.log(`🔐 handleForceChangePassword response: ok=${response.ok}, data=`, data);

            if (response.ok) {
                console.log('✅ Hasło tymczasowe zmienione');
                // Odśwież currentUser aby usunąć flagę isTemporaryPassword
                if (currentUser) {
                    setCurrentUser({ ...currentUser, isTemporaryPassword: false });
                }
                return { success: true, message: 'Hasło zostało zmienione' };
            } else {
                return { success: false, message: data.error || 'Błąd zmiany hasła' };
            }
        } catch (error) {
            console.log('❌ Błąd zmiany hasła tymczasowego:', error);
            return { success: false, message: 'Błąd serwera' };
        }
    };

    const checkPermission = useCallback((permission: Permission): boolean => {
        if (!currentUser) return false;
        
        if (currentUser.role === 'admin' || currentUser.role === 'boss') {
            return true;
        }

        return currentUser.permissions?.includes(permission) || false;
    }, [currentUser]);
    
    // Reset hasła - wymaga tokenu JWT
    const handleResetPassword = async (userId: string): Promise<{ success: boolean, message: string, tempPassword?: string }> => {
        try {
            const token = localStorage.getItem('jwt_token');
            if (!token) {
                return { success: false, message: 'Nie jesteś zalogowany' };
            }

            // Generuj tymczasowe hasło
            const tempPassword = Math.random().toString(36).slice(-8);

            const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    password: tempPassword,
                    isTemporaryPassword: true,
                    passwordLastChanged: new Date().toISOString()
                })
            });

            if (response.ok) {
                console.log('✅ Hasło zresetowano');
                return { success: true, message: 'Hasło zresetowane', tempPassword };
            } else {
                return { success: false, message: 'Błąd resetowania hasła' };
            }
        } catch (error) {
            console.log('❌ Błąd resetowania hasła:', error);
            return { success: false, message: 'Błąd serwera' };
        }
    };
    
    // Funkcja do odświeżenia użytkowników z API
    const refreshUsersFromAPI = async () => {
        try {
            const token = localStorage.getItem('jwt_token');
            const headers: HeadersInit = { 'Content-Type': 'application/json' };
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const response = await fetch(`${API_BASE_URL}/users`, { headers });
            if (response.ok) {
                const apiUsers = await response.json();
                if (apiUsers && apiUsers.length > 0) {
                    const mappedUsers = apiUsers.map((user: any) => ({
                        id: user.id,
                        username: user.username,
                        role: (user.role || 'user') as UserRole,
                        subRole: user.sub_role || user.subRole || 'AGRO',
                        pin: user.pin,
                        email: user.email,
                        isActive: user.is_active !== undefined ? user.is_active : 1,
                        passwordLastChanged: user.password_last_changed || new Date().toISOString(),
                        permissions: user.permissions || [],
                        isTemporaryPassword: user.is_temporary_password || false
                    }));
                    setUsers(mappedUsers);
                    console.log('🔄 Użytkownicy odświeżeni z API:', mappedUsers.length);
                }
            }
        } catch (error) {
            console.log('⚠️ Błąd odświeżania użytkowników z API:', error);
        }
    };
    
    const handleAddUser = async (userData: Omit<User, 'id' | 'passwordLastChanged' | 'permissions' | 'password'>) => {
        try {
            const token = localStorage.getItem('jwt_token');
            if (!token) {
                return { success: false, message: 'Nie jesteś zalogowany' };
            }

            // Generuj tymczasowe hasło
            const tempPassword = Math.random().toString(36).slice(-8);

            const response = await fetch(`${API_BASE_URL}/users`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    username: userData.username,
                    password: tempPassword,
                    role: userData.role,
                    subRole: userData.subRole || 'AGRO',
                    pin: userData.pin
                })
            });
            
            if (response.ok) {
                const result = await response.json();
                console.log('✅ Użytkownik dodany do bazy danych:', result);
                await refreshUsersFromAPI();
                return { success: true, message: 'Użytkownik dodany do bazy danych.' };
            } else {
                return { success: false, message: 'Błąd dodawania użytkownika' };
            }
        } catch (error) {
            console.log('❌ Błąd API:', error);
            return { success: false, message: 'Błąd serwera' };
        }
    };

    const handleEditUser = async (userId: string, updates: Partial<Omit<User, 'password'>>) => {
        try {
            const token = localStorage.getItem('jwt_token');
            if (!token) {
                return { success: false, message: 'Nie jesteś zalogowany' };
            }

            const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(updates)
            });
            
            if (response.ok) {
                console.log('✅ Użytkownik zaktualizowany w API');
                await refreshUsersFromAPI();
                return { success: true, message: 'Dane użytkownika zaktualizowane.' };
            } else {
                return { success: false, message: 'Błąd aktualizacji użytkownika' };
            }
        } catch (error) {
            console.log('❌ Błąd API:', error);
            return { success: false, message: 'Błąd serwera' };
        }
    };

    const handleDeleteUser = async (userId: string) => {
        try {
            const token = localStorage.getItem('jwt_token');
            if (!token) {
                return { success: false, message: 'Nie jesteś zalogowany' };
            }

            const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.ok) {
                console.log('✅ Użytkownik usunięty z bazy danych');
                await refreshUsersFromAPI();
                return { success: true, message: 'Użytkownik usunięty z bazy danych.' };
            } else {
                return { success: false, message: 'Błąd usuwania użytkownika' };
            }
        } catch (error) {
            console.log('❌ Błąd API:', error);
            return { success: false, message: 'Błąd serwera' };
        }
    };

    const handleAddNewRole = (roleName: string) => {
        const normalizedRoleName = roleName.trim();
        if (rolePermissions[normalizedRoleName]) {
            return { success: false, message: `Rola '${normalizedRoleName}' już istnieje.` };
        }
        // Optymistyczne dodanie w UI
        setRolePermissions(prev => ({
            ...prev,
            [normalizedRoleName]: []
        }));

        // Przygotuj id dla bazy (bez spacji, małe litery)
        const roleId = normalizedRoleName.toLowerCase().replace(/\s+/g, '_');

        // Wyślij żądanie do API i poczekaj na odpowiedź. Jeśli się nie uda - cofnij zmianę.
        (async () => {
            try {
                const resp = await fetch(`${API_BASE_URL}/roles`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: roleId, label: roleName })
                });
                if (!resp.ok) {
                    // Cofnij optymistyczne dodanie
                    setRolePermissions(prev => {
                        const copy = { ...prev } as any;
                        delete copy[normalizedRoleName];
                        return copy;
                    });
                    console.error('Błąd zapisu roli na serwerze', await resp.text());
                } else {
                    // Odśwież listę ról z bazy
                    try { await refreshRolesFromAPI(); } catch (e) { /* ignore */ }
                }
            } catch (err) {
                setRolePermissions(prev => {
                    const copy = { ...prev } as any;
                    delete copy[normalizedRoleName];
                    return copy;
                });
                console.error('Błąd sieci przy zapisie roli:', err);
            }
        })();

        return { success: true, message: `Rola '${normalizedRoleName}' została dodana.` };
    };

    const handleDeleteRole = (roleName: string) => {
        if (PREDEFINED_ROLES.includes(roleName.toLowerCase())) {
            return { success: false, message: `Nie można usunąć systemowej roli '${roleName}'.` };
        }

        // Degradacja użytkowników w UI
        setUsers(prev => prev.map(u => u.role === roleName ? { ...u, role: 'user' } : u));

        // Usuń lokalnie mapowanie uprawnień
        setRolePermissions(prev => {
            const newPermissions = { ...prev };
            delete newPermissions[roleName];
            return newPermissions;
        });

        // Wyślij żądanie do API aby usunąć rolę z bazy
        (async () => {
            try {
                const roleId = roleName.toLowerCase().replace(/\s+/g, '_');
                const token = localStorage.getItem('jwt_token');
                const headers: any = { 'Content-Type': 'application/json' };
                if (token) headers['Authorization'] = `Bearer ${token}`;
                const resp = await fetch(`${API_BASE_URL}/roles/${encodeURIComponent(roleId)}`, { method: 'DELETE', headers });
                if (!resp.ok) {
                    console.error('Błąd usuwania roli na serwerze', await resp.text());
                } else {
                    try { await refreshRolesFromAPI(); } catch (e) { /* ignore */ }
                }
            } catch (err) {
                console.error('Błąd sieci przy usuwaniu roli:', err);
            }
        })();

        return { success: true, message: `Rola '${roleName}' została usunięta, użytkownicy przeniesieni do 'user'.` };
    };

    const handleUpdateRolePermissions = (roleName: string, permissions: Permission[]) => {
        setRolePermissions(prev => ({
            ...prev,
            [roleName]: permissions
        }));
        return { success: true, message: `Uprawnienia dla roli '${roleName}' zaktualizowane.` };
    };

    const handleUpdateUserPermissions = async (userId: string, newPermissions: Permission[]) => {
        console.log(`🔐 handleUpdateUserPermissions wywoływany: userId=${userId} (type: ${typeof userId}), permissions=${newPermissions.length}`);
        console.log(`🔐 currentUser.id=${currentUser?.id} (type: ${typeof currentUser?.id})`);
        const token = localStorage.getItem('jwt_token');
        console.log(`🔐 Token z localStorage: ${token ? 'OK' : 'BRAK'}`);
        
        try {
            // 1. Wyślij uprawnienia do API
            console.log(`📤 Wysyłam POST do ${API_BASE_URL}/user-permissions`);
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

            console.log(`📥 Odpowiedź: ${response.status} ${response.statusText}`);
            if (!response.ok) {
                console.error('Błąd zapisywania uprawnień:', response.statusText);
                return { success: false, message: 'Błąd zapisywania uprawnień na serwerze' };
            }

            // 2. Pobierz aktualne uprawnienia z API (tylko indywidualne, bez roli)
            console.log(`📤 Pobieram uprawnienia z ${API_BASE_URL}/user-permissions/${userId}`);
            const permResponse = await fetch(`${API_BASE_URL}/user-permissions/${userId}`, {
                cache: 'no-cache',
                headers: {
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache'
                }
            });
            if (permResponse.ok) {
                const permData = await permResponse.json();
                const updatedPermissions = permData.permissions as Permission[];
                console.log(`📥 Pobrane uprawnienia dla userId=${userId}:`, updatedPermissions);

                // 3. Aktualizuj state lokalnie - TYLKO dla edytowanego użytkownika (JEDEN RAZ)
                setUsers(prevUsers => 
                    prevUsers.map(user => 
                        String(user.id) === String(userId) 
                            ? { ...user, permissions: updatedPermissions } 
                            : user
                    )
                );
                
                // Aktualizuj currentUser TYLKO jeśli to ten sam użytkownik
                if (String(currentUser?.id) === String(userId)) {
                    console.log(`🔄 Aktualizuję uprawnienia dla zalogowanego użytkownika`);
                    setCurrentUser(prev => prev ? { ...prev, permissions: updatedPermissions } : null);
                }

                console.log(`✅ Uprawnienia dla użytkownika ${userId} zostały zaktualizowane lokalnie`);
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

        // Optymistyczne dodanie lokalne
        setAllSubRoles(prev => [...prev, normalized]);

        // Wyślij do API i odśwież z bazy
        (async () => {
            try {
                const resp = await fetch(`${API_BASE_URL}/sub-roles`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: normalized, name })
                });
                if (!resp.ok) {
                    // cofnięcie
                    setAllSubRoles(prev => prev.filter(r => r !== normalized));
                    console.error('Błąd zapisu oddziału na serwerze', await resp.text());
                } else {
                    try {
                        const rr = await fetch(`${API_BASE_URL}/sub-roles`);
                        if (rr.ok) {
                            const list = await rr.json();
                            setDbSubRoles(list);
                            setAllSubRoles(list.map((r: any) => r.id));
                        }
                    } catch (e) { /* ignore */ }
                }
            } catch (err) {
                setAllSubRoles(prev => prev.filter(r => r !== normalized));
                console.error('Błąd sieci przy zapisie oddziału:', err);
            }
        })();

        return { success: true, message: `Dodano oddział ${normalized}.` };
    };

    const handleDeleteSubRole = (name: string) => {
        if (['AGRO', 'OSIP'].includes(name)) return { success: false, message: 'Nie można usunąć oddziałów podstawowych.' };

        // Degradacja użytkowników lokalnie
        setUsers(prev => prev.map(u => u.subRole === name ? {...u, subRole: 'AGRO'} : u));

        // Optymistyczne usunięcie lokalne
        setAllSubRoles(prev => prev.filter(r => r !== name));

        // Wyślij żądanie do API
        (async () => {
            try {
                const token = localStorage.getItem('jwt_token');
                const headers: any = { 'Content-Type': 'application/json' };
                if (token) headers['Authorization'] = `Bearer ${token}`;
                const resp = await fetch(`${API_BASE_URL}/sub-roles/${encodeURIComponent(name)}`, { method: 'DELETE', headers });
                if (!resp.ok) {
                    console.error('Błąd usuwania oddziału na serwerze', await resp.text());
                } else {
                    try {
                        const rr = await fetch(`${API_BASE_URL}/sub-roles`);
                        if (rr.ok) {
                            const list = await rr.json();
                            setDbSubRoles(list);
                            setAllSubRoles(list.map((r: any) => r.id));
                        }
                    } catch (e) { /* ignore */ }
                }
            } catch (err) {
                console.error('Błąd sieci przy usuwaniu oddziału:', err);
            }
        })();

        return { success: true, message: 'Oddział usunięty.' };
    };
    
    const getRoleLabel = useCallback((roleName: string): string => {
        // Najpierw spróbuj znaleźć w rolach z bazy
        if (dbRoles && dbRoles.length > 0) {
            const dbRole = dbRoles.find((r: any) => r.name === roleName);
            if (dbRole) {
                return dbRole.label;
            }
        }
        
        // Fallback na tabelę switch
        switch (roleName) {
            case 'admin': return 'Administrator';
            case 'planista': return 'Planista';
            case 'magazynier': return 'Magazynier';
            case 'kierownik_magazynu': return 'Kierownik Magazynu';
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
    }, [dbRoles]);

    const value: AuthContextValue = {
        currentUser,
        users,
        handleLogin,
        handleLogout,
        handleChangePassword,
        handleForceChangePassword,
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
