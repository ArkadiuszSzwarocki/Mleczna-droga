
import React, { useState } from 'react';
import { useUIContext } from './contexts/UIContext';
import Input from './Input';
import Button from './Button';
import QrCodeIcon from './icons/QrCodeIcon';
import PrintLabelIcon from './icons/PrintLabelIcon';
import UserIcon from './icons/UserIcon';
import PadlockIcon from './icons/PadlockIcon';
import EyeIcon from './icons/EyeIcon';
import EyeSlashIcon from './icons/EyeSlashIcon';
import Alert from './Alert';

const GenerateLoginQrPage: React.FC = () => {
    const { modalHandlers } = useUIContext();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const handlePrintPreview = (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!username.trim() || !password.trim()) return;

        // Format danych zgodny z oczekiwaniami NetworkPrintModal dla typu 'login_qr'
        const qrData = JSON.stringify({ username, password });
        
        modalHandlers.openNetworkPrintModal({
            type: 'login_qr',
            data: { 
                username, 
                password, 
                qrData 
            },
            context: 'reprint'
        });
    };

    return (
        <div className="p-4 md:p-6 bg-slate-50 dark:bg-secondary-900/50 h-full flex flex-col items-center justify-center">
            <div className="w-full max-w-md bg-white dark:bg-secondary-800 rounded-xl shadow-xl overflow-hidden border border-slate-200 dark:border-secondary-700">
                <div className="p-6 bg-slate-100 dark:bg-secondary-900/50 border-b dark:border-secondary-700 flex items-center justify-center flex-col">
                    <div className="p-3 bg-white dark:bg-secondary-800 rounded-full shadow-sm mb-3">
                        <QrCodeIcon className="h-10 w-10 text-primary-600 dark:text-primary-400" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">Generator Kart Logowania</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center mt-1">
                        Wprowadź dane użytkownika, aby wygenerować i wydrukować etykietę z kodem QR do szybkiego logowania.
                    </p>
                </div>

                <form onSubmit={handlePrintPreview} className="p-6 space-y-6">
                    <Alert 
                        type="info" 
                        message="Bezpieczeństwo" 
                        details="Kod QR będzie zawierał hasło w formie tekstu. Traktuj wydrukowaną etykietę jak poufne hasło." 
                    />

                    <div className="space-y-4">
                        <Input
                            label="Login / Nazwa użytkownika"
                            id="qr-username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            icon={<UserIcon className="h-5 w-5 text-gray-400" />}
                            placeholder="np. jan.kowalski"
                            required
                        />

                        <Input
                            label="Hasło"
                            id="qr-password"
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            icon={<PadlockIcon className="h-5 w-5 text-gray-400" />}
                            rightIcon={
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="focus:outline-none"
                                >
                                    {showPassword ? 
                                        <EyeSlashIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" /> : 
                                        <EyeIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                                    }
                                </button>
                            }
                            placeholder="Wprowadź hasło"
                            required
                        />
                    </div>

                    <Button 
                        type="submit" 
                        disabled={!username.trim() || !password.trim()} 
                        className="w-full justify-center py-3 text-lg"
                        leftIcon={<PrintLabelIcon className="h-6 w-6" />}
                    >
                        Generuj i Drukuj
                    </Button>
                </form>
            </div>
        </div>
    );
};

export default GenerateLoginQrPage;
