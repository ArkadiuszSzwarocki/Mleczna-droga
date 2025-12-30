
import React from 'react';
import Button from './Button';

const SessionExpiryPrompt: React.FC<any> = ({ isOpen, onClose, onExtendSession, onLogout, remainingTime }) => {
    if (!isOpen) return null;

    const minutes = Math.floor(remainingTime / 60);
    const seconds = remainingTime % 60;
    
    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center p-4 z-[500]">
            <div className="bg-white dark:bg-secondary-800 p-6 rounded-lg shadow-xl max-w-sm w-full text-center">
                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">Sesja wkrótce wygaśnie</h2>
                <p className="my-2 text-gray-600 dark:text-gray-400">
                    Twoja sesja zostanie automatycznie zakończona z powodu braku aktywności.
                </p>
                <div className="text-4xl font-mono font-bold text-primary-600 dark:text-primary-400 my-4">
                    {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
                </div>
                <div className="flex flex-col gap-3">
                    <Button onClick={onExtendSession} className="w-full">Przedłuż sesję</Button>
                    <Button onClick={onLogout} variant="secondary" className="w-full">Wyloguj</Button>
                </div>
            </div>
        </div>
    );
};

export default SessionExpiryPrompt;
