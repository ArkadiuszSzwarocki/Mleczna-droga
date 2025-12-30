// components/ToastContainer.tsx
import React, { useState, useEffect } from 'react';
import { useUIContext } from './contexts/UIContext';
import XCircleIcon from './icons/XCircleIcon';
import CheckCircleIcon from './icons/CheckCircleIcon';
import InformationCircleIcon from './icons/InformationCircleIcon';
import ExclamationTriangleIcon from './icons/ExclamationTriangleIcon';

export interface Toast {
    id: number;
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
}

const ToastComponent: React.FC<{ toast: Toast, onDismiss: () => void }> = ({ toast, onDismiss }) => {
    const [isExiting, setIsExiting] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsExiting(true);
            setTimeout(onDismiss, 300); // Allow fade-out animation to complete
        }, 5000);
        return () => clearTimeout(timer);
    }, [onDismiss]);

    const handleDismiss = () => {
        setIsExiting(true);
        setTimeout(onDismiss, 300);
    };
    
    // FIX: Added 'warning' type to toast configuration to be consistent with Alert component.
    const config = {
        success: { icon: <CheckCircleIcon className="h-6 w-6" />, color: 'green' },
        error: { icon: <XCircleIcon className="h-6 w-6" />, color: 'red' },
        info: { icon: <InformationCircleIcon className="h-6 w-6" />, color: 'blue' },
        warning: { icon: <ExclamationTriangleIcon className="h-6 w-6" />, color: 'yellow' },
    };

    const typeConfig = config[toast.type] || config.info; // FIX: Fallback to 'info' if type is undefined
    const baseClasses = 'w-full p-4 rounded-lg shadow-lg flex items-start gap-3 transition-all duration-300 pointer-events-auto';
    const animationClass = isExiting ? 'animate-fadeOut' : 'animate-slideIn';
    const colorClasses = `bg-${typeConfig.color}-100 dark:bg-${typeConfig.color}-900/70 border-l-4 border-${typeConfig.color}-500 text-${typeConfig.color}-800 dark:text-${typeConfig.color}-200`;

    return (
        <div className={`${baseClasses} ${colorClasses} ${animationClass}`} role="alert">
            <div className={`flex-shrink-0 text-${typeConfig.color}-500`}>{typeConfig.icon}</div>
            <div className="flex-grow text-sm font-medium">{toast.message}</div>
            <button onClick={handleDismiss} className={`-mr-1 -mt-1 p-1 rounded-full hover:bg-${typeConfig.color}-200 dark:hover:bg-black/20`}>
                <XCircleIcon className="h-5 w-5" />
            </button>
        </div>
    );
};


const ToastContainer: React.FC = () => {
    const { toasts, removeToast } = useUIContext();

    if (!toasts || toasts.length === 0) {
        return null;
    }
    
    return (
        <div className="fixed top-20 right-4 z-[1000] w-full max-w-sm space-y-3 pointer-events-none">
            {toasts.map(toast => (
                <ToastComponent key={toast.id} toast={toast} onDismiss={() => removeToast(toast.id)} />
            ))}
        </div>
    );
};

export default ToastContainer;
