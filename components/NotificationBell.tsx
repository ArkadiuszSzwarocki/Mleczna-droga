import React from 'react';
import BellIcon from './icons/BellIcon';

const NotificationBell: React.FC<{ onClick: () => void; count: number }> = ({ onClick, count }) => {
    return (
        <button
            onClick={onClick}
            className="relative p-2 text-gray-500 dark:text-gray-400 hover:text-white hover:bg-secondary-700/50 dark:hover:bg-secondary-700 rounded-full focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-secondary-800"
            aria-label={`Powiadomienia (${count})`}
        >
            <BellIcon className="h-6 w-6" />
            {count > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white text-xs font-bold ring-2 ring-white dark:ring-secondary-800">
                    {count > 99 ? '99+' : count}
                </span>
            )}
        </button>
    );
};

export default NotificationBell;