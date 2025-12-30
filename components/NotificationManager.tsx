
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useUIContext } from './contexts/UIContext';
import BellIcon from './icons/BellIcon';
import XCircleIcon from './icons/XCircleIcon';
import { View, FinishedGoodItem, AppNotification, ProductionRun, PsdTask, DispatchOrder, MixingTask } from '../types';
import Button from './Button';
import XMarkIcon from './icons/XMarkIcon';

const NotificationManager: React.FC = () => {
    const { 
        popupNotifications, 
        markNotificationAsRead,
        dismissPopup,
        isSoundEnabled, 
        playNotificationSound, 
        modalHandlers,
        handleSetView,
    } = useUIContext();

    const [visibleNotifications, setVisibleNotifications] = useState<AppNotification[]>([]);
    const soundIntervalRef = useRef<number | null>(null);

    const handleHideNotification = useCallback((id: string) => {
        setVisibleNotifications(prev => 
            prev.map(n => n.id === id ? { ...n, animation: 'animate-fadeOut' } as any : n)
        );
        setTimeout(() => {
            setVisibleNotifications(prev => prev.filter(n => n.id !== id));
            dismissPopup(id);
        }, 500);
    }, [dismissPopup]);

    const handleClearAll = useCallback(() => {
        const idsToClear = visibleNotifications.map(n => n.id);
        
        // Uruchom animację wygaszania dla wszystkich
        setVisibleNotifications(prev => 
            prev.map(n => ({ ...n, animation: 'animate-fadeOut' } as any))
        );

        // Po animacji usuń z widoku i zsynchronizuj z kontekstem
        setTimeout(() => {
            setVisibleNotifications([]);
            idsToClear.forEach(id => dismissPopup(id));
        }, 300);
    }, [visibleNotifications, dismissPopup]);
    
    const handleNotificationClick = (notification: AppNotification) => {
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
                modalHandlers.openFinishedGoodDetailModal(relatedItem as FinishedGoodItem);
            }
        }

        handleHideNotification(notification.id);
        markNotificationAsRead(notification.id);
    };

    useEffect(() => {
        const currentVisibleIds = new Set(visibleNotifications.map(n => n.id));
        const newNotifications = popupNotifications.filter(n => !currentVisibleIds.has(n.id));

        if (newNotifications.length > 0) {
            if (isSoundEnabled) {
                playNotificationSound().catch((e: any) => console.warn(
                    "Initial notification sound playback failed. User might need to interact with the page first.", e
                ));
            }
            
            newNotifications.forEach((notificationData, index) => {
                setTimeout(() => {
                    setVisibleNotifications(prev => {
                        if (prev.some(p => p.id === notificationData.id)) return prev;
                        return [...prev, { ...notificationData, animation: 'animate-slideIn' } as any];
                    });
                }, index * 300);
            });
        }
    }, [popupNotifications, isSoundEnabled, playNotificationSound, visibleNotifications]);

    useEffect(() => {
        if (soundIntervalRef.current) {
            clearInterval(soundIntervalRef.current);
            soundIntervalRef.current = null;
        }

        if (visibleNotifications.length > 0 && isSoundEnabled) {
            soundIntervalRef.current = window.setInterval(() => {
                playNotificationSound().catch((e: any) => console.warn("Repeating notification sound failed.", e));
            }, 60 * 1000);
        }

        return () => {
            if (soundIntervalRef.current) {
                clearInterval(soundIntervalRef.current);
            }
        };
    }, [visibleNotifications.length, isSoundEnabled, playNotificationSound]);

    if (visibleNotifications.length === 0) {
        return null;
    }

    return (
        <div className="fixed top-16 right-4 w-full max-w-sm z-[999] pointer-events-none space-y-3">
            {visibleNotifications.length > 3 && (
                <div className="flex justify-end animate-fadeIn pointer-events-auto">
                    <button 
                        onClick={handleClearAll}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800/90 hover:bg-black text-white text-xs font-bold rounded-full shadow-lg transition-all transform hover:scale-105 border border-gray-600"
                    >
                        <XMarkIcon className="h-3.5 w-3.5" />
                        ZAMKNIJ WSZYSTKIE
                    </button>
                </div>
            )}
            
            {visibleNotifications.map(notification => (
                <div 
                    key={notification.id}
                    className={`bg-white shadow-2xl rounded-lg pointer-events-auto ring-1 ring-black ring-opacity-5 overflow-hidden cursor-pointer ${(notification as any).animation}`}
                    role="alert"
                    aria-live="assertive"
                    onClick={() => handleNotificationClick(notification)}
                >
                    <div className="p-4">
                        <div className="flex items-start">
                            <div className="flex-shrink-0 pt-0.5">
                                <BellIcon className="h-6 w-6 text-primary-500" />
                            </div>
                            <div className="ml-3 w-0 flex-1">
                                <p className="text-base font-bold text-gray-900">{notification.title}</p>
                                <p className="mt-1 text-sm text-gray-600">{notification.body}</p>
                            </div>
                            <div className="ml-4 flex-shrink-0 flex">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleHideNotification(notification.id);
                                    }}
                                    className="bg-white rounded-md inline-flex text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                                >
                                    <span className="sr-only">Zamknij</span>
                                    <XCircleIcon className="h-5 w-5" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default NotificationManager;
