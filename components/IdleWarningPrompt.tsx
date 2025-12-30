import React, { useState, useEffect } from 'react';
import Button from './Button';
import PadlockIcon from './icons/PadlockIcon';

interface IdleWarningPromptProps {
  isOpen: boolean;
  onExtend: () => void;
  onLock: () => void; // Callback for when time runs out
  initialTime: number; // in seconds
}

const IdleWarningPrompt: React.FC<IdleWarningPromptProps> = ({ isOpen, onExtend, onLock, initialTime }) => {
    const [remainingTime, setRemainingTime] = useState(initialTime);

    useEffect(() => {
        if (!isOpen) {
            setRemainingTime(initialTime);
            return;
        }

        if (remainingTime <= 0) {
            onLock();
            return;
        }

        const timerId = setInterval(() => {
            setRemainingTime(prev => prev - 1);
        }, 1000);

        return () => clearInterval(timerId);
    }, [isOpen, remainingTime, onLock, initialTime]);

    if (!isOpen) return null;

    const minutes = Math.floor(remainingTime / 60);
    const seconds = remainingTime % 60;

    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center p-4 z-[500]">
            <div className="bg-white dark:bg-secondary-800 p-6 rounded-lg shadow-xl max-w-sm w-full text-center">
                <PadlockIcon className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">Brak aktywności</h2>
                <p className="my-2 text-gray-600 dark:text-gray-400">
                    Ze względów bezpieczeństwa, aplikacja zostanie zablokowana za:
                </p>
                <div className="text-4xl font-mono font-bold text-primary-600 dark:text-primary-400 my-4">
                    {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
                </div>
                <div className="flex flex-col gap-3">
                    <Button onClick={onExtend} className="w-full">Kontynuuj pracę</Button>
                </div>
            </div>
        </div>
    );
};

export default IdleWarningPrompt;
