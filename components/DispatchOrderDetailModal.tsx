
import React from 'react';
import { DispatchOrder } from '../types';
import Button from './Button';
import XCircleIcon from './icons/XCircleIcon';
import { formatDate, getDispatchOrderStatusLabel } from '../src/utils';
import TruckIcon from './icons/TruckIcon';
import MixerIcon from './icons/MixerIcon';

interface DispatchOrderDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    order: any;
}

const DispatchOrderDetailModal: React.FC<DispatchOrderDetailModalProps> = ({ isOpen, onClose, order }) => {
    if (!isOpen) return null;

    const getStatusBadge = (status: any) => {
        const label = getDispatchOrderStatusLabel(status);
        let colorClass = 'bg-gray-100 text-gray-800 dark:bg-secondary-700 dark:text-gray-300';
        switch (status) {
            case 'planned': colorClass = 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200'; break;
            case 'in_fulfillment': colorClass = 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-200'; break;
            case 'completed': colorClass = 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200'; break;
            case 'cancelled': colorClass = 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200'; break;
        }
        return <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${colorClass}`}>{label}</span>;
    };

    return (
        <div
            className="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center p-4 z-[120] transition-opacity"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="dispatch-order-detail-title"
        >
            <div
                className="bg-white dark:bg-secondary-800 rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[90vh] flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex justify-between items-start pb-3 border-b dark:border-secondary-600 mb-4">
                    <div className="flex items-center gap-3">
                        <TruckIcon className="h-7 w-7 text-primary-600 dark:text-primary-400" />
                        <div>
                            <h2 id="dispatch-order-detail-title" className="text-xl font-semibold text-primary-700 dark:text-primary-300">Szczegóły Zlecenia Wydania</h2>
                            <p className="text-sm font-mono text-gray-500 dark:text-gray-400">{order.id}</p>
                        </div>
                    </div>
                    <Button onClick={onClose} variant="secondary" className="p-1.5 -mr-1.5"><XCircleIcon className="h-6 w-6" /></Button>
                </div>

                <div className="overflow-y-auto pr-2 flex-grow space-y-4 scrollbar-hide">
                    <section className="p-3 bg-slate-50 dark:bg-secondary-900 rounded-md border dark:border-secondary-700">
                        <h3 className="font-semibold text-md text-gray-800 dark:text-gray-200 mb-2">Informacje Ogólne</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-sm">
                            <p className="text-gray-600 dark:text-gray-400"><strong>Odbiorca:</strong></p><p className="text-gray-800 dark:text-gray-200">{order.recipient}</p>
                            <p className="text-gray-600 dark:text-gray-400"><strong>Utworzone przez:</strong></p><p className="text-gray-800 dark:text-gray-200">{order.createdBy}</p>
                            <p className="text-gray-600 dark:text-gray-400"><strong>Data utworzenia:</strong></p><p className="text-gray-800 dark:text-gray-200">{formatDate(order.createdAt, true)}</p>
                            <p className="text-gray-600 dark:text-gray-400"><strong>Status:</strong></p><div>{getStatusBadge(order.status)}</div>
                        </div>
                    </section>
                    
                    <section>
                        <h3 className="font-semibold text-md text-gray-800 dark:text-gray-200 mb-2">Pozycje Zlecenia</h3>
                        <div className="space-y-3">
                            {(order.items || []).map((item: any) => (
                                <div key={item.id} className="p-3 border dark:border-secondary-700 rounded-md bg-white dark:bg-secondary-800">
                                    <div className="flex justify-between items-start">
                                        <p className="font-semibold text-primary-600 dark:text-primary-300 flex items-center gap-2">
                                            {item.itemType === 'mixing' && <MixerIcon className="h-5 w-5 text-purple-500" title="Zlecenie Miksowania"/>}
                                            {item.productName}
                                        </p>
                                        {item.linkedMixingTaskId && (
                                            <span className="text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded font-mono">
                                                Mix: {item.linkedMixingTaskId}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                        Wymagane: {item.requestedWeightKg} kg | Spełniono: {item.fulfilledWeightKg.toFixed(2)} kg
                                    </p>
                                    <div className="mt-2 pt-2 border-t dark:border-secondary-600">
                                        <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400">Załadowane Palety ({(item.fulfilledPallets || []).length}):</h4>
                                        {(item.fulfilledPallets || []).length > 0 ? (
                                            <ul className="list-disc list-inside pl-2 text-xs mt-1 space-y-1">
                                                {(item.fulfilledPallets || []).map((p: any) => (
                                                    <li key={p.palletId}>
                                                        <span className="font-mono text-gray-800 dark:text-gray-200">{p.displayId}</span> 
                                                        <span className="text-gray-500 dark:text-gray-400 font-sans"> ({(p.weight || 0).toFixed(2)} kg)</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <p className="text-xs italic text-gray-500 dark:text-gray-400 mt-1">
                                                Brak załadowanych palet.
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>
                
                <div className="pt-4 border-t dark:border-secondary-700 mt-auto flex justify-end">
                    <Button onClick={onClose} variant="primary">Zamknij</Button>
                </div>
            </div>
        </div>
    );
};

export default DispatchOrderDetailModal;
    