
import React, { useState, useMemo } from 'react';
import { useAuth } from './contexts/AuthContext';
import { useUIContext } from './contexts/UIContext';
import { User, Permission } from '../types';
import Button from './Button';
import Input from './Input';
import Alert from './Alert';
import UserCircleIcon from './icons/UserCircleIcon';
import ShieldCheckIcon from './icons/ShieldCheckIcon';
import PadlockIcon from './icons/PadlockIcon';
import EyeIcon from './icons/EyeIcon';
import EyeSlashIcon from './icons/EyeSlashIcon';
import CheckCircleIcon from './icons/CheckCircleIcon';
import CogIcon from './icons/CogIcon';
import MoonIcon from './icons/MoonIcon';
import SunIcon from './icons/SunIcon';
import ComputerDesktopIcon from './icons/ComputerDesktopIcon';
import { formatDate } from '../src/utils';

const SectionHeader: React.FC<{ title: string; icon: React.ReactNode }> = ({ title, icon }) => (
    <div className="flex items-center gap-2 mb-4 pb-2 border-b dark:border-secondary-700">
        <div className="text-primary-600 dark:text-primary-400">{icon}</div>
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">{title}</h3>
    </div>
);

const ChangePasswordForm: React.FC<{ user: User; onUpdate: (data: Partial<User>) => void }> = ({ user, onUpdate }) => {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);
        setLoading(true);

        // Validacja po stronie klienta
        if (newPassword.length < 6) {
            setMessage({ type: 'error', text: 'Nowe hasło musi mieć min. 6 znaków.' });
            setLoading(false);
            return;
        }
        if (newPassword !== confirmPassword) {
            setMessage({ type: 'error', text: 'Hasła nie są identyczne.' });
            setLoading(false);
            return;
        }

        try {
            // Wysłanie do backendu
            const token = localStorage.getItem('jwt_token');
            if (!token) {
                setMessage({ type: 'error', text: 'Nie jesteś zalogowany' });
                setLoading(false);
                return;
            }

            console.log(`🔐 ChangePasswordForm: Wysyłam /change-password`);
            const response = await fetch('/api/change-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    oldPassword: currentPassword,
                    newPassword: newPassword
                })
            });

            const data = await response.json();
            console.log(`🔐 ChangePasswordForm response:`, data);

            if (response.ok) {
                setMessage({ type: 'success', text: 'Hasło zostało zmienione pomyślnie.' });
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
                // Odśwież user data
                onUpdate({ passwordLastChanged: new Date().toISOString() });
            } else {
                setMessage({ type: 'error', text: data.error || 'Błąd przy zmianie hasła' });
            }
        } catch (error) {
            console.error('❌ Błąd zmiany hasła:', error);
            setMessage({ type: 'error', text: 'Błąd połączenia z serwerem' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {message && <Alert type={message.type} message={message.text} />}
            <Input
                label="Obecne hasło"
                type={showPassword ? 'text' : 'password'}
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                required
            />
            <Input
                label="Nowe hasło"
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                required
            />
            <Input
                label="Potwierdź nowe hasło"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                rightIcon={
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-gray-400 hover:text-gray-600">
                        {showPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                    </button>
                }
                required
            />
            <div className="flex justify-end">
                <Button type="submit" disabled={!currentPassword || !newPassword || loading}>
                    {loading ? 'Zmiana...' : 'Zmień Hasło'}
                </Button>
            </div>
        </form>
    );
};

const ChangePinForm: React.FC<{ user: User; onUpdate: (data: Partial<User>) => void }> = ({ user, onUpdate }) => {
    const [currentPin, setCurrentPin] = useState('');
    const [newPin, setNewPin] = useState('');
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);

        if (currentPin !== user.pin) {
            setMessage({ type: 'error', text: 'Obecny PIN jest nieprawidłowy.' });
            return;
        }
        if (!/^\d{4,6}$/.test(newPin)) {
            setMessage({ type: 'error', text: 'Nowy PIN musi składać się z 4-6 cyfr.' });
            return;
        }

        onUpdate({ pin: newPin });
        setMessage({ type: 'success', text: 'Kod PIN został zmieniony.' });
        setCurrentPin('');
        setNewPin('');
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {message && <Alert type={message.type} message={message.text} />}
            <Input
                label="Obecny PIN"
                type="password"
                value={currentPin}
                onChange={e => setCurrentPin(e.target.value)}
                maxLength={6}
                required
            />
            <Input
                label="Nowy PIN (4-6 cyfr)"
                type="password"
                value={newPin}
                onChange={e => setNewPin(e.target.value)}
                maxLength={6}
                required
            />
            <div className="flex justify-end">
                <Button type="submit" variant="secondary" disabled={!currentPin || !newPin}>Zmień PIN</Button>
            </div>
        </form>
    );
};

const MyAccountPage: React.FC = () => {
    const { currentUser, handleEditUser, getRoleLabel } = useAuth();
    const { theme, setTheme } = useUIContext();

    if (!currentUser) return null;

    const handleUpdateUser = (updates: Partial<User>) => {
        handleEditUser(currentUser.id, updates);
    };

    return (
        <div className="p-4 md:p-6 bg-slate-50 dark:bg-secondary-900 min-h-full">
            <header className="mb-6">
                <h2 className="text-3xl font-bold text-primary-700 dark:text-primary-300 flex items-center gap-3">
                    <UserCircleIcon className="h-10 w-10" />
                    Moje Konto
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mt-1">Zarządzaj swoimi danymi, bezpieczeństwem i preferencjami.</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Profile Info & Preferences */}
                <div className="space-y-6">
                    {/* Profile Card */}
                    <div className="bg-white dark:bg-secondary-800 rounded-xl shadow-md p-6 border border-slate-200 dark:border-secondary-700">
                        <div className="flex flex-col items-center text-center">
                            <div className="h-24 w-24 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center mb-4 text-primary-600 dark:text-primary-400">
                                <span className="text-4xl font-bold">{currentUser.username.charAt(0).toUpperCase()}</span>
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">{currentUser.username}</h3>
                            <span className="px-3 py-1 mt-2 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 text-sm font-medium">
                                {getRoleLabel(currentUser.role)}
                            </span>
                            <div className="mt-6 w-full text-left space-y-3">
                                <div className="flex justify-between text-sm border-b dark:border-secondary-700 pb-2">
                                    <span className="text-gray-500 dark:text-gray-400">ID Użytkownika:</span>
                                    <span className="font-mono text-gray-700 dark:text-gray-300">{currentUser.id}</span>
                                </div>
                                <div className="flex justify-between text-sm border-b dark:border-secondary-700 pb-2">
                                    <span className="text-gray-500 dark:text-gray-400">Ostatnia zmiana hasła:</span>
                                    <span className="text-gray-700 dark:text-gray-300">{formatDate(currentUser.passwordLastChanged)}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Preferences */}
                    <div className="bg-white dark:bg-secondary-800 rounded-xl shadow-md p-6 border border-slate-200 dark:border-secondary-700">
                        <SectionHeader title="Preferencje" icon={<CogIcon className="h-6 w-6"/>} />
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Motyw aplikacji:</p>
                        <div className="grid grid-cols-3 gap-2">
                            <button 
                                onClick={() => setTheme('light')} 
                                className={`p-2 rounded-lg border flex flex-col items-center justify-center gap-1 transition-all ${theme === 'light' ? 'bg-primary-50 border-primary-500 text-primary-700' : 'border-gray-200 dark:border-secondary-600 hover:bg-gray-50 dark:hover:bg-secondary-700'}`}
                            >
                                <SunIcon className="h-5 w-5"/> <span className="text-xs">Jasny</span>
                            </button>
                            <button 
                                onClick={() => setTheme('dark')} 
                                className={`p-2 rounded-lg border flex flex-col items-center justify-center gap-1 transition-all ${theme === 'dark' ? 'bg-primary-900/20 border-primary-500 text-primary-400' : 'border-gray-200 dark:border-secondary-600 hover:bg-gray-50 dark:hover:bg-secondary-700'}`}
                            >
                                <MoonIcon className="h-5 w-5"/> <span className="text-xs">Ciemny</span>
                            </button>
                            <button 
                                onClick={() => setTheme('system')} 
                                className={`p-2 rounded-lg border flex flex-col items-center justify-center gap-1 transition-all ${theme === 'system' ? 'bg-slate-100 border-slate-500 text-slate-700 dark:bg-secondary-700 dark:text-slate-300' : 'border-gray-200 dark:border-secondary-600 hover:bg-gray-50 dark:hover:bg-secondary-700'}`}
                            >
                                <ComputerDesktopIcon className="h-5 w-5"/> <span className="text-xs">System</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Middle Column: Security */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white dark:bg-secondary-800 rounded-xl shadow-md p-6 border border-slate-200 dark:border-secondary-700">
                        <SectionHeader title="Bezpieczeństwo" icon={<ShieldCheckIcon className="h-6 w-6"/>} />
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div>
                                <h4 className="text-md font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                                    <PadlockIcon className="h-4 w-4"/> Zmień Hasło
                                </h4>
                                <ChangePasswordForm user={currentUser} onUpdate={handleUpdateUser} />
                            </div>
                            <div className="pt-6 md:pt-0 md:border-l dark:border-secondary-700 md:pl-8">
                                <h4 className="text-md font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                                    <ShieldCheckIcon className="h-4 w-4"/> Zmień Kod PIN
                                </h4>
                                <p className="text-xs text-gray-500 mb-4">Kod PIN jest używany do szybkiego zatwierdzania operacji krytycznych na produkcji i magazynie.</p>
                                <ChangePinForm user={currentUser} onUpdate={handleUpdateUser} />
                            </div>
                        </div>
                    </div>

                    {/* Permissions List */}
                    <div className="bg-white dark:bg-secondary-800 rounded-xl shadow-md p-6 border border-slate-200 dark:border-secondary-700">
                        <SectionHeader title="Twoje Uprawnienia" icon={<CheckCircleIcon className="h-6 w-6"/>} />
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {currentUser.permissions && currentUser.permissions.length > 0 ? (
                                currentUser.permissions.map((perm) => (
                                    <div key={perm} className="flex items-center gap-2 p-2 rounded bg-green-50 dark:bg-green-900/20 text-sm text-green-800 dark:text-green-300 border border-green-100 dark:border-green-800/50">
                                        <CheckCircleIcon className="h-4 w-4 flex-shrink-0" />
                                        <span>{perm.replace(/_/g, ' ')}</span>
                                    </div>
                                ))
                            ) : (
                                <p className="text-gray-500 dark:text-gray-400 text-sm italic">Brak specjalnych uprawnień.</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MyAccountPage;
