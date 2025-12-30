import React from 'react';
// FIX: Corrected import path for WarehouseContext to be relative.
import { useWarehouseContext } from './contexts/WarehouseContext';
import BellIcon from './icons/BellIcon';

const ExpiryNotificationBell: React.FC<{ onClick: () => void }> = ({ onClick }) => {
    const { expiringPalletsDetails } = useWarehouseContext();
    const notificationCount = expiringPalletsDetails ? expiringPalletsDetails.length : 0;

    return (
        <button
            onClick={onClick}
            className="relative p-2 text-gray-400 hover:text-white hover:bg-primary-700 dark:hover:bg-secondary-700 rounded-full focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-primary-800 dark:focus:ring-offset-secondary-800"
            aria-label={`Powiadomienia (${notificationCount})`}
        >
            <BellIcon className="h-6 w-6" />
            {notificationCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white text-xs font-bold ring-2 ring-white dark:ring-secondary-800">
                    {notificationCount}
                </span>
            )}
        </button>
    );
};

export default ExpiryNotificationBell;