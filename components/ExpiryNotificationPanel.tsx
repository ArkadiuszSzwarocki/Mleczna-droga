import React from 'react';
// FIX: Corrected import path for WarehouseContext to be relative.
import { useWarehouseContext } from './contexts/WarehouseContext';
import { useUIContext } from './contexts/UIContext';
// FIX: Correct import path for types.ts to be relative
import { RawMaterialLogEntry } from '../types';
import BellIcon from './icons/BellIcon';
import XCircleIcon from './icons/XCircleIcon';
import Button from './Button';
import { formatDate } from '../src/utils';

interface ExpiryNotificationPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

const ExpiryNotificationPanel: React.FC<ExpiryNotificationPanelProps> = ({ isOpen, onClose }) => {
    const { expiringPalletsDetails } = useWarehouseContext();
    const { modalHandlers } = useUIContext();
    
    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity no-print" 
            onClick={onClose}
        >
            <div 
                className="fixed top-0 right-0 h-full w-full max-w-sm bg-white dark:bg-secondary-800 shadow-xl flex flex-col transform transition-transform duration-300"
                onClick={e => e.stopPropagation()}
                style={{ transform: isOpen ? 'translateX(0)' : 'translateX(100%)' }}
                role="dialog"
                aria-modal="true"
                aria-labelledby="notification-panel-title"
            >
                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b dark:border-secondary-700 flex-shrink-0">
                    <h2 id="notification-panel-title" className="text-lg font-semibold text-primary-700 dark:text-primary-300 flex items-center gap-2">
                        <BellIcon className="h-6 w-6" />
                        Powiadomienia o Terminach
                    </h2>
                    <Button onClick={onClose} variant="secondary" className="p-1.5"><XCircleIcon className="h-5 w-5"/></Button>
                </div>

                {/* Content */}
                <div className="flex-grow overflow-y-auto">
                    {expiringPalletsDetails && expiringPalletsDetails.length > 0 ? (
                        <ul className="divide-y dark:divide-secondary-700">
                            {expiringPalletsDetails.map(({ pallet, daysLeft, status, isRaw }: { pallet: any, daysLeft: number, status: string, isRaw: boolean }) => {
                                const productName = isRaw ? pallet.palletData.nazwa : pallet.productName;
                                const palletId = isRaw ? pallet.palletData.nrPalety : (pallet.finishedGoodPalletId || pallet.id);
                                const expiryDate = isRaw ? pallet.palletData.dataPrzydatnosci : pallet.expiryDate;
                                
                                if (!pallet) return null;
                                
                                const handleClick = () => {
                                    if (isRaw) {
                                        modalHandlers.openPalletDetailModal(pallet);
                                    } else {
                                        modalHandlers.openFinishedGoodDetailModal(pallet);
                                    }
                                    onClose();
                                };
                                
                                return (
                                <li key={pallet.id}>
                                    <button 
                                        onClick={handleClick}
                                        className="w-full text-left p-4 hover:bg-gray-100 dark:hover:bg-secondary-700 transition-colors"
                                    >
                                        <p className="font-semibold text-gray-800 dark:text-gray-200">{productName}</p>
                                        <p className="text-xs font-mono text-gray-500 dark:text-gray-400">{palletId}</p>
                                        <div className="flex justify-between items-center mt-1 text-sm">
                                            <span className="text-gray-600 dark:text-gray-300">
                                                Ważność: {formatDate(expiryDate)}
                                            </span>
                                            <span className={`px-2 py-0.5 text-xs rounded-full font-bold ${
                                                status === 'critical' || status === 'expired' ? 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200'
                                            }`}>
                                                {daysLeft < 0 ? 'Przeterminowana' : `Zostało ${daysLeft} dni`}
                                            </span>
                                        </div>
                                    </button>
                                </li>
                                );
                            })}
                        </ul>
                    ) : (
                        <div className="p-6 text-center text-gray-500 dark:text-gray-400">
                            <p>Brak powiadomień.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ExpiryNotificationPanel;