
import React, { useState } from 'react';
import { useAuth } from './contexts/AuthContext';
import Input from './Input';
import Button from './Button';
import Alert from './Alert';
import PadlockIcon from './icons/PadlockIcon';
import UserIcon from './icons/UserIcon';
import EyeIcon from './icons/EyeIcon';
import EyeSlashIcon from './icons/EyeSlashIcon';
import QrCodeIcon from './icons/QrCodeIcon';
import { User } from '../types';
import MLogoIcon from './icons/MLogoIcon';
import AnimatedBackground from './AnimatedBackground';

interface LoginPageProps {
  onLoginSuccess: (user: User) => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [errors, setErrors] = useState<{ username?: string, password?: string, form?: string }>({});
    const [showPassword, setShowPassword] = useState(false);
    const { users } = useAuth();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setErrors({}); // Clear previous errors
        let validationErrors: { username?: string, password?: string, form?: string } = {};

        if (!username.trim()) {
            validationErrors.username = 'Nazwa użytkownika jest wymagana.';
        }
    
        if (!password.trim()) {
            validationErrors.password = 'Hasło jest wymagane.';
        }
    
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }

        const foundUser = (users || []).find(
            (user) => user.username.toLowerCase() === username.toLowerCase() && user.password === password
        );

        if (foundUser) {
            const { password, ...userToLogin } = foundUser;
            onLoginSuccess(userToLogin as User);
        } else {
            setErrors({ form: 'Nieprawidłowa nazwa użytkownika lub hasło.' });
        }
    };
    
    const handleQrLogin = () => {
        alert("Logowanie kodem QR jest w trakcie implementacji.");
    };

    const handleQuickLogin = (role: string) => {
        const foundUser = (users || []).find(user => user.role === role);
        if (foundUser) {
            // SPRAWDZENIE: Jeśli użytkownik ma hasło tymczasowe, blokujemy szybkie logowanie
            if (foundUser.isTemporaryPassword) {
                setErrors({ form: `Konto użytkownika ${foundUser.username} wymaga ręcznego zalogowania przy użyciu hasła tymczasowego.` });
                setUsername(foundUser.username); // Podpowiadamy login
                return;
            }

            const { password, ...userToLogin } = foundUser;
            onLoginSuccess(userToLogin as User);
        } else {
            setErrors({ form: `Użytkownik z rolą "${role}" nie został znaleziony.` });
        }
    };

    return (
        <>
            <AnimatedBackground />
            <div className="min-h-screen bg-secondary-900/80 backdrop-blur-sm flex flex-col justify-center items-center p-4 animate-fadeIn">
                <div className="w-full max-w-md bg-secondary-800 rounded-2xl shadow-xl p-8 space-y-6">
                    
                    <div className="mx-auto h-16 w-16">
                        <MLogoIcon />
                    </div>
                    
                    <div className="text-center">
                        <h2 className="text-3xl font-bold text-white">Logowanie do Systemu</h2>
                        <p className="mt-2 text-sm text-slate-400">Wprowadź swoje dane, aby uzyskać dostęp.</p>
                    </div>
                    
                    {errors.form && <Alert type="error" message={errors.form} />}

                    <form className="space-y-4" onSubmit={handleSubmit} noValidate>
                        <Input
                            label="Nazwa użytkownika"
                            id="username"
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                            autoFocus
                            autoComplete="username"
                            icon={<UserIcon className="h-5 w-5 text-slate-400" />}
                            error={errors.username}
                        />
                        <Input
                            label="Hasło"
                            id="password"
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            autoComplete="current-password"
                            icon={<PadlockIcon className="h-5 w-5 text-slate-400" />}
                            rightIcon={showPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                            onRightIconClick={() => setShowPassword(!showPassword)}
                            error={errors.password}
                        />
                        <Button type="submit" className="w-full justify-center !py-3 !text-base">
                            Zaloguj się
                        </Button>
                    </form>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center" aria-hidden="true">
                            <div className="w-full border-t border-secondary-600" />
                        </div>
                        <div className="relative flex justify-center">
                            <span className="bg-secondary-800 px-2 text-sm text-slate-400">
                                Lub
                            </span>
                        </div>
                    </div>
                    
                    <Button variant="secondary" onClick={handleQrLogin} className="w-full justify-center !py-3 !text-base">
                        <QrCodeIcon className="h-5 w-5 mr-2" />
                        Zaloguj kodem QR
                    </Button>

                    <div>
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center" aria-hidden="true">
                                <div className="w-full border-t border-secondary-600" />
                            </div>
                            <div className="relative flex justify-center">
                                <span className="bg-secondary-800 px-2 text-xs text-slate-500">
                                    Szybkie logowanie (deweloperskie)
                                </span>
                            </div>
                        </div>
                        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
                            <Button variant="secondary" onClick={() => handleQuickLogin('admin')} className="text-xs">Admin</Button>
                            <Button variant="secondary" onClick={() => handleQuickLogin('planista')} className="text-xs">Planista</Button>
                            <Button variant="secondary" onClick={() => handleQuickLogin('magazynier')} className="text-xs">Magazynier</Button>
                            <Button variant="secondary" onClick={() => handleQuickLogin('kierownik magazynu')} className="text-xs">Kierownik</Button>
                            <Button variant="secondary" onClick={() => handleQuickLogin('lab')} className="text-xs">Laborant</Button>
                            <Button variant="secondary" onClick={() => handleQuickLogin('operator_psd')} className="text-xs">Operator PSD</Button>
                            <Button variant="secondary" onClick={() => handleQuickLogin('operator_agro')} className="text-xs">Operator AGRO</Button>
                            <Button variant="secondary" onClick={() => handleQuickLogin('operator_procesu')} className="text-xs">Operator Procesu</Button>
                            <Button variant="secondary" onClick={() => handleQuickLogin('user')} className="text-xs">User</Button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default LoginPage;
