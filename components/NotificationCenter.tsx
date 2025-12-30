import React from 'react';
import { useUIContext } from './contexts/UIContext';
import BellIcon from './icons/BellIcon';
import XCircleIcon from './icons/XCircleIcon';
import Button from './Button';
import { formatDate } from '../src/utils';
import { AppNotification, View } from '../types';
import CheckCircleIcon from './icons/CheckCircleIcon';
import TrashIcon from './icons/TrashIcon';

const NotificationCenter: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    const { 
        centerNotifications,
        readNotifications,
        markAllAsRead,
        clearReadNotifications,
        markNotificationAsRead,
        modalHandlers,
        handleSetView
    } = useUIContext();
    
    if (!isOpen) return null;

    const handleItemClick = (notification: AppNotification) => {
        const { relatedItem, type } = notification;

        if (type === 'new_order') {
             if ('targetBatchSizeKg' in (relatedItem as any)) { // ProductionRun
                handleSetView(View.ProductionPlanningAgro);
            } else if ('targetQuantity' in (relatedItem as any)) { // PsdTask
                handleSetView(View.ProductionPlanning2);
            } else if ('recipient' in (relatedItem as any)) { // DispatchOrder
                handleSetView(View.Logistics);
            } else if ('targetComposition' in (relatedItem as any)) { // MixingTask
                handleSetView(View.MIXING_PLANNER);
            }
        } else if (relatedItem) {
            if ('palletData' in relatedItem) {
                modalHandlers.openPalletDetailModal(relatedItem);
            } else {
                modalHandlers.openFinishedGoodDetailModal(relatedItem);
            }
        }

        markNotificationAsRead(notification.id);
        onClose();
    };
    
    const unreadNotifications = centerNotifications;
    const hasUnread = unreadNotifications.length > 0;
    const hasRead = readNotifications.length > 0;
    const hasNotifications = hasUnread || hasRead;

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity no-print" 
            onClick={onClose}
        >
            <div 
                className="fixed top-0 right-0 h-full w-full max-w-sm bg-white dark:bg-secondary-800 shadow-xl flex flex-col transform transition-transform duration-300 animate-slideIn"
                onClick={e => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="notification-panel-title"
            >
                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b dark:border-secondary-700 flex-shrink-0">
                    <h2 id="notification-panel-title" className="text-lg font-semibold text-primary-700 dark:text-primary-300 flex items-center gap-2">
                        <BellIcon className="h-6 w-6" />
                        Centrum Powiadomień
                    </h2>
                     <Button onClick={onClose} variant="secondary" className="p-1.5"><XCircleIcon className="h-5 w-5"/></Button>
                </div>
                
                 <div className="flex-shrink-0 p-2 border-b dark:border-secondary-700 flex gap-2">
                    {hasUnread && (
                        <Button onClick={markAllAsRead} variant="secondary" className="text-xs flex-1">
                            Oznacz wszystkie jako przeczytane
                        </Button>
                    )}
                    {hasRead && (
                         <Button onClick={clearReadNotifications} variant="secondary" className="text-xs flex-1" leftIcon={<TrashIcon className="h-4 w-4"/>}>
                            Usuń przeczytane
                        </Button>
                    )}
                </div>


                {/* Content */}
                <div className="flex-grow overflow-y-auto">
                    {!hasNotifications ? (
                        <div className="p-6 text-center text-gray-500 dark:text-gray-400">
                            <p>Brak powiadomień.</p>
                        </div>
                    ) : (
                        <div>
                            {hasUnread && (
                                <section className="p-4 border-b dark:border-secondary-700">
                                    <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                                        Nieprzeczytane
                                    </h3>
                                    <ul className="divide-y dark:divide-secondary-700 -mx-4">
                                        {unreadNotifications.map(notif => (
                                            <li key={notif.id} className="relative">
                                                <button 
                                                    onClick={() => handleItemClick(notif)}
                                                    className="w-full text-left p-4 pr-10 hover:bg-gray-100 dark:hover:bg-secondary-700 transition-colors"
                                                >
                                                    <p className={`font-semibold ${notif.isUrgent ? 'text-red-600 dark:text-red-400' : 'text-gray-800 dark:text-gray-200'}`}>{notif.title}</p>
                                                    <p className="text-sm text-gray-600 dark:text-gray-400">{notif.body}</p>
                                                    <p className="text-xs font-mono text-gray-500 dark:text-gray-400 mt-1">{formatDate(notif.timestamp, true)}</p>
                                                </button>
                                                <div className="absolute top-1/2 right-3 -translate-y-1/2">
                                                    <button onClick={(e) => { e.stopPropagation(); markNotificationAsRead(notif.id); }} title="Oznacz jako przeczytane" className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-secondary-600">
                                                        <CheckCircleIcon className="h-5 w-5 text-gray-400 hover:text-green-500" />
                                                    </button>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </section>
                            )}

                            {hasRead && (
                                <section className="p-4">
                                    <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                                        Przeczytane
                                    </h3>
                                    <ul className="divide-y dark:divide-secondary-700 -mx-4">
                                        {readNotifications.map(notif => (
                                            <li key={notif.id} className="opacity-70">
                                                <button 
                                                    onClick={() => handleItemClick(notif)}
                                                    className="w-full text-left p-4 hover:bg-gray-100 dark:hover:bg-secondary-700 transition-colors"
                                                >
                                                    <p className="font-semibold text-gray-800 dark:text-gray-200">{notif.title}</p>
                                                    <p className="text-sm text-gray-600 dark:text-gray-400">{notif.body}</p>
                                                    <p className="text-xs font-mono text-gray-500 dark:text-gray-400 mt-1">{formatDate(notif.timestamp, true)}</p>
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                </section>
                            )}
                        </div>
                    )}
                </div>
                 <footer className="px-6 py-3 bg-gray-50 dark:bg-secondary-900/50 border-t dark:border-secondary-700 flex justify-end">
                    <Button onClick={onClose} variant="primary">Zamknij</Button>
                </footer>
            </div>
        </div>
    );
};

export default NotificationCenter;