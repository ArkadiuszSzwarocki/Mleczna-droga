import React from 'react';
import { View } from '../types';
import { useAppContext } from './contexts/AppContext';
import Button from './Button';
import ExclamationTriangleIcon from './icons/ExclamationTriangleIcon';

interface PasswordExpiryNotificationProps {
    daysLeft: number;
    onDismiss: () => void;
}

const PasswordExpiryNotification: React.FC<PasswordExpiryNotificationProps> = ({ daysLeft, onDismiss }) => {
    const { handleSetView } = useAppContext();
    
    const message = daysLeft <= 1 
        ? `Twoje hasło wygasa ${daysLeft === 1 ? 'jutro' : 'dzisiaj'}!` 
        : `Twoje hasło wygasa za ${daysLeft} dni.`;
        
    return (
        <div className="fixed top-14 left-0 right-0 z-[1000] p-3 bg-yellow-400 border-b-2 border-yellow-500 shadow-lg animate-fadeIn no-print">
            <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
                <div className="flex items-center">
                    <ExclamationTriangleIcon className="h-6 w-6 text-yellow-900 mr-3" />
                    <div className="flex-grow">
                        <p className="font-bold text-yellow-900">{message}</p>
                        <p className="text-sm text-yellow-800">Zalecamy zmianę hasła, aby uniknąć utraty dostępu.</p>
                    </div>
                </div>
                <div className="flex-shrink-0 flex items-center gap-2">
                    <Button onClick={() => handleSetView(View.MyAccount)} variant="secondary" className="text-xs bg-white/80 hover:bg-white text-yellow-900">Zmień Hasło</Button>
                    <button onClick={onDismiss} className="text-yellow-900 hover:bg-yellow-500/30 rounded-full p-1" title="Zamknij powiadomienie">
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PasswordExpiryNotification;